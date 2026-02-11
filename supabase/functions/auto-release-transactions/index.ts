import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[AUTO-RELEASE] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify cron secret for security (optional but recommended)
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    
    // Allow both service role key and cron secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Check if it's a valid service role request
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseClient.auth.getUser(token);
        
        // Check if user is admin
        if (userData.user) {
          const adminClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );
          
          const { data: roleData } = await adminClient
            .from('user_roles')
            .select('role')
            .eq('user_id', userData.user.id)
            .eq('role', 'admin')
            .single();
          
          if (!roleData) {
            throw new Error("Unauthorized - admin access required");
          }
        }
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find all transactions where auto_release_at has passed and status is still 'shipped'
    const now = new Date().toISOString();
    
    const { data: expiredTransactions, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('status', 'shipped')
      .not('auto_release_at', 'is', null)
      .lte('auto_release_at', now);

    if (fetchError) {
      throw new Error(`Failed to fetch transactions: ${fetchError.message}`);
    }

    logStep("Found expired transactions", { count: expiredTransactions?.length || 0 });

    const results = [];

    for (const transaction of expiredTransactions || []) {
      try {
        // Transfer funds to seller's connected account
        let transferId: string | null = null;
        if (transaction.stripe_payment_intent_id && transaction.seller_payout > 0) {
          const { data: sellerProfile } = await supabaseAdmin
            .from('profiles')
            .select('stripe_connect_account_id, stripe_connect_onboarding_complete')
            .eq('id', transaction.seller_id)
            .single();

          if (sellerProfile?.stripe_connect_account_id && sellerProfile.stripe_connect_onboarding_complete) {
            try {
              const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
                apiVersion: "2025-08-27.basil",
              });

              const paymentIntent = await stripe.paymentIntents.retrieve(transaction.stripe_payment_intent_id);
              const chargeId = paymentIntent.latest_charge as string;

              const transfer = await stripe.transfers.create({
                amount: transaction.seller_payout,
                currency: 'sek',
                destination: sellerProfile.stripe_connect_account_id,
                source_transaction: chargeId,
                description: `Auto-utbetalning för order ${transaction.id}`,
              });

              transferId = transfer.id;
              logStep("Auto-release transfer created", { transferId });
            } catch (stripeError) {
              logStep("Failed to create transfer", { error: String(stripeError) });
            }
          }
        }

        // Update transaction to completed
        const { error: updateError } = await supabaseAdmin
          .from('transactions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            auto_release_at: null,
            stripe_transfer_id: transferId,
          })
          .eq('id', transaction.id);

        if (updateError) {
          throw new Error(`Failed to update transaction: ${updateError.message}`);
        }

        // Update listing to sold
        await supabaseAdmin
          .from('listings')
          .update({ status: 'sold' })
          .eq('id', transaction.listing_id);

        // Increment seller's completed deals
        await supabaseAdmin.rpc('increment_completed_deals', { 
          seller_id: transaction.seller_id 
        });

        // Create notification for both buyer and seller
        await supabaseAdmin
          .from('notifications')
          .insert([
            {
              user_id: transaction.seller_id,
              title: 'Affären har slutförts automatiskt',
              message: 'Köparen bekräftade inte mottagandet inom 5 dagar. Affären har nu markerats som slutförd och pengarna är på väg till dig.',
              type: 'success',
              related_transaction_id: transaction.id,
            },
            {
              user_id: transaction.buyer_id,
              title: 'Affären har slutförts automatiskt',
              message: 'Du bekräftade inte mottagandet inom 5 dagar. Affären har nu markerats som slutförd.',
              type: 'info',
              related_transaction_id: transaction.id,
            },
          ]);

        results.push({ id: transaction.id, status: 'completed' });
        logStep("Transaction auto-completed", { id: transaction.id });

      } catch (txError) {
        const errorMessage = txError instanceof Error ? txError.message : String(txError);
        logStep("Failed to process transaction", { id: transaction.id, error: errorMessage });
        results.push({ id: transaction.id, status: 'error', error: errorMessage });
      }
    }

    logStep("Function completed", { processed: results.length });

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
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
