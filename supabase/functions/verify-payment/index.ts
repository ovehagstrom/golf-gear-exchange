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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Get session_id from request
    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("session_id is required");
    }
    logStep("Received session_id", { session_id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Retrieved Stripe session", { 
      status: session.status, 
      paymentStatus: session.payment_status,
      metadata: session.metadata 
    });

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      logStep("Payment not completed", { status: session.payment_status });
      return new Response(JSON.stringify({ 
        verified: false, 
        status: session.payment_status,
        message: "Betalningen är inte slutförd ännu"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find the transaction by checkout session id
    const { data: transaction, error: txFetchError } = await supabaseAdmin
      .from('transactions')
      .select('*, listings(title)')
      .eq('stripe_checkout_session_id', session_id)
      .single();

    if (txFetchError || !transaction) {
      logStep("Transaction not found", { error: txFetchError });
      throw new Error("Transaktion hittades inte");
    }

    // Verify the user is the buyer
    if (transaction.buyer_id !== user.id) {
      throw new Error("Du har inte behörighet att verifiera denna betalning");
    }

    // If already paid, just return success
    if (transaction.status !== 'pending_payment') {
      logStep("Transaction already processed", { status: transaction.status });
      return new Response(JSON.stringify({ 
        verified: true, 
        status: transaction.status,
        message: "Betalningen är redan behandlad"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Update transaction to paid
    const { error: txUpdateError } = await supabaseAdmin
      .from('transactions')
      .update({
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq('id', transaction.id);

    if (txUpdateError) {
      logStep("Failed to update transaction", txUpdateError);
      throw new Error("Kunde inte uppdatera transaktionen");
    }

    logStep("Transaction marked as paid", { transactionId: transaction.id });

    // Update listing status to reserved
    if (session.metadata?.listing_id) {
      await supabaseAdmin
        .from('listings')
        .update({ status: 'reserved' })
        .eq('id', session.metadata.listing_id);
      logStep("Listing marked as reserved");
    }

    // Create notifications
    // Notify seller
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: transaction.seller_id,
        title: '💰 Betalning mottagen!',
        message: `Varan "${transaction.listings?.title || 'Produkt'}" är betald. Skicka produkten och ange spårningsnummer.`,
        type: 'payment_received',
        related_transaction_id: transaction.id,
      });

    // Notify buyer
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: transaction.buyer_id,
        title: '✅ Betalning genomförd!',
        message: `Din betalning för "${transaction.listings?.title || 'Produkt'}" har bekräftats. Pengarna är säkrade tills du bekräftar leveransen.`,
        type: 'payment_confirmed',
        related_transaction_id: transaction.id,
      });

    logStep("Notifications created");

    return new Response(JSON.stringify({ 
      verified: true, 
      status: 'paid',
      message: "Betalningen har verifierats och registrerats"
    }), {
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
