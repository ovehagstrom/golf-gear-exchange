import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[VERIFY-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { session_id } = await req.json();
    
    if (!session_id) {
      throw new Error("session_id is required");
    }

    logStep("Verifying payment", { session_id });

    // Get the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    logStep("Session retrieved", { 
      status: session.status, 
      payment_status: session.payment_status,
      payment_intent: session.payment_intent 
    });

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ success: false, message: "Payment not completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Update transaction to paid
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .update({
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq('stripe_checkout_session_id', session_id)
      .select()
      .single();

    if (txError) {
      logStep("Failed to update transaction", txError);
      throw txError;
    }

    logStep("Transaction updated to paid", { transaction_id: transaction.id });

    // Update listing status to reserved
    if (transaction.listing_id) {
      await supabaseAdmin
        .from('listings')
        .update({ status: 'reserved' })
        .eq('id', transaction.listing_id);
      
      logStep("Listing marked as reserved");
    }

    return new Response(
      JSON.stringify({ success: true, transaction }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    logStep("ERROR", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
