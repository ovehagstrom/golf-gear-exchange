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

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err) {
        logStep("Webhook signature verification failed", err);
        return new Response("Webhook signature verification failed", { status: 400 });
      }
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
      logStep("Warning: No webhook secret, parsing body directly");
    }

    logStep("Received event", { type: event.type });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.metadata?.type !== 'escrow_payment') {
          logStep("Not an escrow payment, skipping");
          break;
        }

        logStep("Processing escrow payment", { sessionId: session.id, bidId: session.metadata?.bid_id });

        // Update transaction to paid
        const { error: txError } = await supabaseAdmin
          .from('transactions')
          .update({
            status: 'paid',
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq('stripe_checkout_session_id', session.id);

        if (txError) {
          logStep("Failed to update transaction", txError);
          throw txError;
        }

        // Update listing status to reserved
        if (session.metadata?.listing_id) {
          await supabaseAdmin
            .from('listings')
            .update({ status: 'reserved' })
            .eq('id', session.metadata.listing_id);
        }

        logStep("Transaction marked as paid");
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment failed", { paymentIntentId: paymentIntent.id });
        
        // Update transaction status
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'cancelled' })
          .eq('stripe_payment_intent_id', paymentIntent.id);
        break;
      }
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
