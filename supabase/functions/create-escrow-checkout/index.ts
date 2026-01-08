import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-ESCROW-CHECKOUT] ${step}`, details ? JSON.stringify(details) : '');
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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get request body
    const { bid_id } = await req.json();
    if (!bid_id) {
      throw new Error("bid_id is required");
    }
    logStep("Received bid_id", { bid_id });

    // Fetch bid with listing details (use admin client to bypass RLS)
    const { data: bid, error: bidError } = await supabaseAdmin
      .from('bids')
      .select('*, listings(*)')
      .eq('id', bid_id)
      .eq('status', 'accepted')
      .single();

    if (bidError || !bid) {
      throw new Error("Bid not found or not accepted");
    }

    // Verify buyer is the one paying
    if (bid.bidder_id !== user.id) {
      throw new Error("Only the bidder can pay for this bid");
    }
    logStep("Bid verified", { amount: bid.amount, listing: bid.listings?.title });

    // Get platform config
    const { data: config } = await supabaseClient
      .from('platform_config')
      .select('config_key, config_value');

    const platformFeePercent = Number(config?.find(c => c.config_key === 'platform_fee_percent')?.config_value || 5);
    const platformFeeFixed = Number(config?.find(c => c.config_key === 'platform_fee_fixed')?.config_value || 0);
    const autoReleaseDays = Number(config?.find(c => c.config_key === 'auto_release_days')?.config_value || 5);

    // Calculate fees (amount in SEK öre)
    const amountInOre = bid.amount * 100; // Convert SEK to öre
    const platformFee = Math.round((amountInOre * platformFeePercent) / 100) + platformFeeFixed;
    const sellerPayout = amountInOre - platformFee;
    
    logStep("Calculated fees", { amountInOre, platformFee, sellerPayout, platformFeePercent });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Stripe customer check", { customerId });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'sek',
            product_data: {
              name: `${bid.listings?.brand} ${bid.listings?.model}`,
              description: `Köp via GolfMarknaden - Escrow-skyddad betalning`,
              images: bid.listings?.images?.[0] ? [bid.listings.images[0]] : [],
            },
            unit_amount: amountInOre, // Amount in öre
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        capture_method: 'automatic',
        metadata: {
          bid_id: bid_id,
          listing_id: bid.listing_id,
          buyer_id: user.id,
          seller_id: bid.listings?.user_id,
          platform_fee: platformFee.toString(),
          seller_payout: sellerPayout.toString(),
        },
      },
      metadata: {
        bid_id: bid_id,
        listing_id: bid.listing_id,
        type: 'escrow_payment',
      },
      success_url: `${req.headers.get("origin")}/my-transactions?success=true&bid=${bid_id}`,
      cancel_url: `${req.headers.get("origin")}/my-bids?cancelled=true`,
    });
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Create pending transaction record
    const autoReleaseAt = new Date();
    autoReleaseAt.setDate(autoReleaseAt.getDate() + autoReleaseDays);

    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        bid_id: bid_id,
        listing_id: bid.listing_id,
        buyer_id: user.id,
        seller_id: bid.listings?.user_id,
        amount: amountInOre,
        platform_fee: platformFee,
        seller_payout: sellerPayout,
        stripe_checkout_session_id: session.id,
        status: 'pending_payment',
        auto_release_at: autoReleaseAt.toISOString(),
      });

    if (txError) {
      logStep("Transaction insert error", txError);
      throw new Error("Failed to create transaction record");
    }

    logStep("Transaction created successfully");

    return new Response(JSON.stringify({ url: session.url }), {
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
