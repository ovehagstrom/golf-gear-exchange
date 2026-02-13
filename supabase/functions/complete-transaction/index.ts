import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[COMPLETE-TRANSACTION] ${step}`, details ? JSON.stringify(details) : '');
};

const getStripe = () => new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

// Helper: Create transfer to seller's connected account
async function createSellerTransfer(
  supabaseAdmin: ReturnType<typeof createClient>,
  transaction: Record<string, unknown>,
  description: string,
  idempotencyKey: string
): Promise<string | null> {
  if (!transaction.stripe_payment_intent_id || (transaction.seller_payout as number) <= 0) {
    return null;
  }

  const { data: sellerProfile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_connect_account_id, stripe_connect_onboarding_complete')
    .eq('id', transaction.seller_id as string)
    .single();

  if (!sellerProfile?.stripe_connect_account_id || !sellerProfile.stripe_connect_onboarding_complete) {
    logStep("Seller has no verified Connect account, skipping transfer", { sellerId: transaction.seller_id });
    return null;
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(transaction.stripe_payment_intent_id as string);
  const chargeId = paymentIntent.latest_charge as string;

  const transfer = await stripe.transfers.create({
    amount: transaction.seller_payout as number,
    currency: 'sek',
    destination: sellerProfile.stripe_connect_account_id,
    source_transaction: chargeId,
    description,
  }, {
    idempotencyKey,
  });

  logStep("Transfer created", { transferId: transfer.id, amount: transaction.seller_payout });
  return transfer.id;
}

// Helper: Reverse an existing transfer before refunding
async function reverseTransferBeforeRefund(
  transaction: Record<string, unknown>
): Promise<void> {
  const transferId = transaction.stripe_transfer_id as string;
  if (!transferId) return;

  const stripe = getStripe();

  // Check the transfer's current state
  const transfer = await stripe.transfers.retrieve(transferId);
  const reversibleAmount = transfer.amount - (transfer.amount_reversed || 0);

  if (reversibleAmount <= 0) {
    logStep("Transfer already fully reversed", { transferId });
    return;
  }

  // Create reversal with idempotency key
  const reversal = await stripe.transfers.createReversal(transferId, {
    amount: reversibleAmount,
    description: `Återkrav för order ${transaction.id}`,
  }, {
    idempotencyKey: `reversal_${transaction.id}`,
  });

  logStep("Transfer reversed", { reversalId: reversal.id, amount: reversibleAmount });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const { transaction_id, action, tracking_number, reason } = body;
    
    if (!transaction_id || !action) {
      throw new Error("transaction_id and action are required");
    }

    // Fetch transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      throw new Error("Transaction not found");
    }

    logStep("Transaction found", { status: transaction.status, action });

    // Handle different actions
    switch (action) {
      case 'mark_shipped': {
        if (transaction.seller_id !== user.id) {
          throw new Error("Only the seller can mark as shipped");
        }
        if (transaction.status !== 'paid') {
          throw new Error("Can only mark as shipped when status is paid");
        }
        
        const autoReleaseAt = new Date();
        autoReleaseAt.setDate(autoReleaseAt.getDate() + 5);
        
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'shipped',
            shipped_at: new Date().toISOString(),
            tracking_number: tracking_number || null,
            auto_release_at: autoReleaseAt.toISOString(),
          })
          .eq('id', transaction_id);

        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: transaction.buyer_id,
            title: 'Varan har skickats!',
            message: `Säljaren har skickat din vara${tracking_number ? `. Spårningsnummer: ${tracking_number}` : ''}. Bekräfta mottagandet inom 5 dagar.`,
            type: 'info',
            related_transaction_id: transaction_id,
          });

        logStep("Marked as shipped", { auto_release_at: autoReleaseAt.toISOString() });
        break;
      }

      case 'confirm_delivery': {
        if (transaction.buyer_id !== user.id) {
          throw new Error("Only the buyer can confirm delivery");
        }
        if (!['shipped', 'paid'].includes(transaction.status)) {
          throw new Error("Invalid transaction status for delivery confirmation");
        }

        // Prevent duplicate transfer
        if (transaction.stripe_transfer_id) {
          logStep("Transfer already exists, skipping", { transferId: transaction.stripe_transfer_id });
        }

        const transferId = transaction.stripe_transfer_id ||
          await createSellerTransfer(
            supabaseAdmin,
            transaction,
            `Utbetalning för order ${transaction.id}`,
            `transfer_${transaction.id}`
          );

        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'completed',
            delivered_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            auto_release_at: null,
            stripe_transfer_id: transferId,
          })
          .eq('id', transaction_id);

        await supabaseAdmin
          .from('listings')
          .update({ status: 'sold' })
          .eq('id', transaction.listing_id);

        await supabaseAdmin.rpc('increment_completed_deals', { seller_id: transaction.seller_id });

        // Update DAC7 seller annual stats
        await supabaseAdmin.rpc('update_seller_annual_stats', {
          p_seller_id: transaction.seller_id,
          p_amount: transaction.amount,
        });

        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: transaction.seller_id,
            title: 'Affären är slutförd!',
            message: transferId 
              ? 'Köparen har bekräftat mottagandet. Pengarna har överförts till ditt konto!'
              : 'Köparen har bekräftat mottagandet. Anslut ditt bankkonto för att få utbetalningen.',
            type: 'success',
            related_transaction_id: transaction_id,
          });

        logStep("Transaction completed, delivery confirmed", { transferId });
        break;
      }

      case 'report_problem': {
        if (transaction.buyer_id !== user.id) {
          throw new Error("Only the buyer can report a problem");
        }

        const dispute_reason = reason || 'Problem reported by buyer';

        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'disputed',
            disputed_at: new Date().toISOString(),
            dispute_reason,
          })
          .eq('id', transaction_id);

        logStep("Dispute opened", { reason: dispute_reason });
        break;
      }

      case 'admin_release': {
        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (!roleData) {
          throw new Error("Admin access required");
        }

        // Prevent duplicate transfer
        if (transaction.stripe_transfer_id) {
          logStep("Transfer already exists for admin_release, skipping", { transferId: transaction.stripe_transfer_id });
        }

        const adminTransferId = transaction.stripe_transfer_id ||
          await createSellerTransfer(
            supabaseAdmin,
            transaction,
            `Admin-utbetalning för order ${transaction.id}`,
            `transfer_admin_${transaction.id}`
          );

        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            stripe_transfer_id: adminTransferId,
          })
          .eq('id', transaction_id);

        await supabaseAdmin
          .from('listings')
          .update({ status: 'sold' })
          .eq('id', transaction.listing_id);

        // Update DAC7 seller annual stats
        await supabaseAdmin.rpc('update_seller_annual_stats', {
          p_seller_id: transaction.seller_id,
          p_amount: transaction.amount,
        });

        logStep("Admin released funds", { transferId: adminTransferId });
        break;
      }

      case 'admin_refund': {
        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (!roleData) {
          throw new Error("Admin access required");
        }

        // Prevent duplicate refund
        if (transaction.status === 'refunded') {
          throw new Error("Transaction is already refunded");
        }

        const stripe = getStripe();

        // If a transfer was already made, reverse it first
        if (transaction.stripe_transfer_id) {
          logStep("Transfer exists, reversing before refund", { transferId: transaction.stripe_transfer_id });
          
          try {
            await reverseTransferBeforeRefund(transaction);
            logStep("Transfer reversed successfully");
          } catch (reversalError) {
            const msg = reversalError instanceof Error ? reversalError.message : String(reversalError);
            logStep("CRITICAL: Transfer reversal failed", { error: msg, transferId: transaction.stripe_transfer_id });
            throw new Error(`Kan inte återbetala: misslyckades att återkräva medel från säljarens konto. Fel: ${msg}`);
          }
        }

        // Now refund the customer
        if (transaction.stripe_payment_intent_id) {
          await stripe.refunds.create({
            payment_intent: transaction.stripe_payment_intent_id,
          }, {
            idempotencyKey: `refund_${transaction.id}`,
          });
          logStep("Stripe refund created");
        }

        await supabaseAdmin
          .from('transactions')
          .update({ status: 'refunded' })
          .eq('id', transaction_id);

        // Reactivate listing
        await supabaseAdmin
          .from('listings')
          .update({ status: 'active' })
          .eq('id', transaction.listing_id);

        logStep("Admin refunded transaction (with reverse transfer if applicable)");
        break;
      }

      default:
        throw new Error("Invalid action");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
