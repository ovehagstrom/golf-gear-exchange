import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    logStep("DEBUG: Webhook secret check", {
      exists: !!webhookSecret,
      length: webhookSecret?.length,
      prefix: webhookSecret?.substring(0, 6),
      sigHeader: sig?.substring(0, 20),
    });

    let event: Stripe.Event;

    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET is not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    if (!sig) {
      logStep("ERROR: No stripe-signature header");
      return new Response("No signature header", { status: 400 });
    }

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    logStep("Received verified event", { type: event.type, id: event.id });

    // Check for duplicate event processing
    const { data: existingEvent } = await supabaseAdmin
      .from('webhook_events')
      .select('id, processed')
      .eq('stripe_event_id', event.id)
      .single();

    if (existingEvent?.processed) {
      logStep("Event already processed, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Log the event
    const { data: webhookEvent, error: logError } = await supabaseAdmin
      .from('webhook_events')
      .upsert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event.data.object,
        processed: false,
      }, { onConflict: 'stripe_event_id' })
      .select()
      .single();

    if (logError) {
      logStep("Failed to log webhook event", logError);
    }

    // Helper function to create notification
    const createNotification = async (
      userId: string, 
      title: string, 
      message: string, 
      type: string,
      transactionId?: string
    ) => {
      const { error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          related_transaction_id: transactionId,
        });
      
      if (error) {
        logStep("Failed to create notification", error);
      }
    };

    const updateWebhookEvent = async (processed: boolean, errorMessage?: string, transactionId?: string) => {
      if (webhookEvent?.id) {
        await supabaseAdmin
          .from('webhook_events')
          .update({ 
            processed, 
            error_message: errorMessage,
            transaction_id: transactionId,
          })
          .eq('id', webhookEvent.id);
      }
    };

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          
          if (session.metadata?.type !== 'escrow_payment') {
            logStep("Not an escrow payment, skipping");
            await updateWebhookEvent(true);
            break;
          }

          logStep("Processing escrow payment", { 
            sessionId: session.id, 
            bidId: session.metadata?.bid_id,
            paymentStatus: session.payment_status 
          });

          if (session.payment_status !== 'paid') {
            logStep("Payment not completed yet", { status: session.payment_status });
            await updateWebhookEvent(false, "Payment not completed");
            break;
          }

          const { data: transaction, error: txError } = await supabaseAdmin
            .from('transactions')
            .update({
              status: 'paid',
              stripe_payment_intent_id: session.payment_intent as string,
            })
            .eq('stripe_checkout_session_id', session.id)
            .select('*, listings(title)')
            .single();

          if (txError) {
            logStep("Failed to update transaction", txError);
            await updateWebhookEvent(false, txError.message);
            throw txError;
          }

          logStep("Transaction marked as paid", { transactionId: transaction.id });

          if (session.metadata?.listing_id) {
            await supabaseAdmin
              .from('listings')
              .update({ status: 'reserved' })
              .eq('id', session.metadata.listing_id);
            logStep("Listing marked as reserved");
          }

          await createNotification(
            transaction.seller_id,
            '💰 Betalning mottagen!',
            `Varan "${transaction.listings?.title || 'Produkt'}" är betald. Skicka produkten och ange spårningsnummer.`,
            'payment_received',
            transaction.id
          );

          await createNotification(
            transaction.buyer_id,
            '✅ Betalning genomförd!',
            `Din betalning för "${transaction.listings?.title || 'Produkt'}" har bekräftats. Pengarna är säkrade tills du bekräftar leveransen.`,
            'payment_confirmed',
            transaction.id
          );

          await updateWebhookEvent(true, undefined, transaction.id);
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          logStep("Payment failed", { paymentIntentId: paymentIntent.id });
          
          const { data: transaction, error: txError } = await supabaseAdmin
            .from('transactions')
            .update({ status: 'cancelled' })
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .select('*, listings(title)')
            .single();

          if (txError) {
            logStep("Could not update transaction (might not exist)", txError);
            await updateWebhookEvent(false, txError.message);
            break;
          }

          await createNotification(
            transaction.buyer_id,
            '❌ Betalning misslyckades',
            `Din betalning för "${transaction.listings?.title || 'Produkt'}" kunde inte genomföras. Vänligen försök igen.`,
            'payment_failed',
            transaction.id
          );

          await updateWebhookEvent(true, undefined, transaction.id);
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          logStep("Charge refunded", { chargeId: charge.id, paymentIntent: charge.payment_intent });
          
          const { data: transaction, error: txError } = await supabaseAdmin
            .from('transactions')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent_id', charge.payment_intent as string)
            .select('*, listings(title)')
            .single();

          if (txError) {
            logStep("Could not update transaction for refund", txError);
            await updateWebhookEvent(false, txError.message);
            break;
          }

          await createNotification(
            transaction.buyer_id,
            '💸 Återbetalning genomförd',
            `Din betalning för "${transaction.listings?.title || 'Produkt'}" har återbetalats.`,
            'refunded',
            transaction.id
          );

          await createNotification(
            transaction.seller_id,
            '💸 Order återbetald',
            `Ordern för "${transaction.listings?.title || 'Produkt'}" har återbetalats till köparen.`,
            'refunded',
            transaction.id
          );

          await updateWebhookEvent(true, undefined, transaction.id);
          break;
        }

        case 'charge.dispute.created': {
          const dispute = event.data.object as Stripe.Dispute;
          logStep("Dispute created", { 
            disputeId: dispute.id, 
            chargeId: dispute.charge,
            amount: dispute.amount,
            reason: dispute.reason,
          });
          
          const charge = await stripe.charges.retrieve(dispute.charge as string);
          
          const { data: transaction, error: txError } = await supabaseAdmin
            .from('transactions')
            .update({ 
              status: 'disputed',
              disputed_at: new Date().toISOString(),
              dispute_reason: `Stripe chargeback: ${dispute.reason || 'unknown'}. Dispute ID: ${dispute.id}. Belopp: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}`,
            })
            .eq('stripe_payment_intent_id', charge.payment_intent as string)
            .select('*, listings(title)')
            .single();

          if (txError) {
            logStep("Could not update transaction for dispute", txError);
            await updateWebhookEvent(false, txError.message);
            break;
          }

          logStep("Chargeback details", {
            transactionId: transaction.id,
            disputeAmount: dispute.amount,
            disputeFee: (dispute as Record<string, unknown>).balance_transactions,
            sellerId: transaction.seller_id,
            transferId: transaction.stripe_transfer_id,
            regressClaim: transaction.stripe_transfer_id ? 'Transfer exists - potential regress against seller' : 'No transfer - platform absorbs loss',
          });

          // Notify admins with detailed chargeback info
          const { data: adminUsers } = await supabaseAdmin
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin');

          if (adminUsers) {
            for (const admin of adminUsers) {
              await createNotification(
                admin.user_id,
                '🚨 Chargeback mottagen',
                `Chargeback på ${dispute.amount / 100} ${dispute.currency.toUpperCase()} för "${transaction.listings?.title || 'Produkt'}". ` +
                `Orsak: ${dispute.reason}. ` +
                (transaction.stripe_transfer_id 
                  ? `Transfer ${transaction.stripe_transfer_id} finns – regressfordran mot säljaren.`
                  : `Ingen transfer gjord – plattformen absorberar förlusten.`),
                'dispute_created',
                transaction.id
              );
            }
          }

          await createNotification(
            transaction.buyer_id,
            '⚠️ Tvist registrerad',
            `En tvist har registrerats för "${transaction.listings?.title || 'Produkt'}". Vi undersöker ärendet.`,
            'dispute_created',
            transaction.id
          );

          await createNotification(
            transaction.seller_id,
            '⚠️ Chargeback registrerad',
            `En chargeback har registrerats för "${transaction.listings?.title || 'Produkt'}". Utbetalning pausad. ` +
            `Enligt användarvillkoren är du som säljare ekonomiskt ansvarig för chargebacks.`,
            'dispute_created',
            transaction.id
          );

          await updateWebhookEvent(true, undefined, transaction.id);
          break;
        }

        case 'charge.dispute.closed': {
          const dispute = event.data.object as Stripe.Dispute;
          logStep("Dispute closed", { 
            disputeId: dispute.id, 
            status: dispute.status,
            chargeId: dispute.charge,
          });

          const charge = await stripe.charges.retrieve(dispute.charge as string);

          const { data: transaction, error: txError } = await supabaseAdmin
            .from('transactions')
            .select('*, listings(title)')
            .eq('stripe_payment_intent_id', charge.payment_intent as string)
            .single();

          if (txError || !transaction) {
            logStep("Could not find transaction for closed dispute", txError);
            await updateWebhookEvent(false, txError?.message || "Transaction not found");
            break;
          }

          if (dispute.status === 'lost') {
            logStep("Dispute LOST - attempting regress against seller", {
              transactionId: transaction.id,
              sellerId: transaction.seller_id,
              transferId: transaction.stripe_transfer_id,
              disputeAmount: dispute.amount,
            });

            // If transfer exists, reverse it to reclaim funds from seller
            if (transaction.stripe_transfer_id) {
              try {
                const transfer = await stripe.transfers.retrieve(transaction.stripe_transfer_id);
                const reversibleAmount = transfer.amount - (transfer.amount_reversed || 0);

                if (reversibleAmount > 0) {
                  const reversal = await stripe.transfers.createReversal(transaction.stripe_transfer_id, {
                    amount: reversibleAmount,
                    description: `Regress: chargeback förlorad för order ${transaction.id}`,
                  }, {
                    idempotencyKey: `dispute_reversal_${dispute.id}`,
                  });

                  logStep("Regress reversal created", { 
                    reversalId: reversal.id, 
                    amount: reversibleAmount,
                  });
                }
              } catch (reversalError) {
                logStep("CRITICAL: Failed to reverse transfer for lost dispute", {
                  error: String(reversalError),
                  transferId: transaction.stripe_transfer_id,
                });
              }
            }

            await supabaseAdmin
              .from('transactions')
              .update({ status: 'refunded' })
              .eq('id', transaction.id);

            // Notify admins
            const { data: adminUsers } = await supabaseAdmin
              .from('user_roles')
              .select('user_id')
              .eq('role', 'admin');

            if (adminUsers) {
              for (const admin of adminUsers) {
                await createNotification(
                  admin.user_id,
                  '❌ Chargeback förlorad',
                  `Chargeback för "${transaction.listings?.title || 'Produkt'}" har förlorats. ` +
                  `Belopp: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}. ` +
                  (transaction.stripe_transfer_id 
                    ? `Regressfordran: försökt återkräva medel från säljarens konto.`
                    : `Ingen transfer att reversera.`),
                  'dispute_closed',
                  transaction.id
                );
              }
            }

            await createNotification(
              transaction.seller_id,
              '❌ Chargeback förlorad',
              `Chargebacken för "${transaction.listings?.title || 'Produkt'}" har avgjorts till köparens fördel. ` +
              `Enligt villkoren debiteras ditt konto.`,
              'dispute_closed',
              transaction.id
            );

          } else if (dispute.status === 'won') {
            logStep("Dispute WON", { transactionId: transaction.id });

            // Restore transaction status if it was disputed
            if (transaction.status === 'disputed') {
              const previousStatus = transaction.stripe_transfer_id ? 'completed' : 'paid';
              await supabaseAdmin
                .from('transactions')
                .update({ status: previousStatus })
                .eq('id', transaction.id);
            }

            const { data: adminUsers } = await supabaseAdmin
              .from('user_roles')
              .select('user_id')
              .eq('role', 'admin');

            if (adminUsers) {
              for (const admin of adminUsers) {
                await createNotification(
                  admin.user_id,
                  '✅ Chargeback vunnen',
                  `Chargebacken för "${transaction.listings?.title || 'Produkt'}" avgjordes till plattformens fördel.`,
                  'dispute_closed',
                  transaction.id
                );
              }
            }
          }

          await updateWebhookEvent(true, undefined, transaction.id);
          break;
        }

        default:
          logStep("Unhandled event type", { type: event.type });
          await updateWebhookEvent(true);
      }
    } catch (processingError) {
      logStep("Error processing event", processingError);
      await updateWebhookEvent(false, String(processingError));
      throw processingError;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
    });
  }
});
