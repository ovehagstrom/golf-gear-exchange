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

const getStripe = () => new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

// Check if a transaction has an open dispute (prevents auto-release)
async function hasOpenDispute(supabaseAdmin: ReturnType<typeof createClient>, transactionId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('disputes')
    .select('id')
    .eq('transaction_id', transactionId)
    .in('status', ['open', 'under_review'])
    .maybeSingle();
  return !!data;
}

// Auto-release: transfer funds to seller after buyer confirmation timeout
async function processAutoRelease(supabaseAdmin: ReturnType<typeof createClient>, transaction: Record<string, unknown>): Promise<void> {
  // Skip if there's an open dispute
  const disputeOpen = await hasOpenDispute(supabaseAdmin, transaction.id as string);
  if (disputeOpen) {
    logStep("Skipping auto-release: open dispute exists", { id: transaction.id });
    // Extend auto_release_at by 7 days to keep checking without spamming
    const newAutoRelease = new Date();
    newAutoRelease.setDate(newAutoRelease.getDate() + 7);
    await supabaseAdmin
      .from('transactions')
      .update({ auto_release_at: newAutoRelease.toISOString() })
      .eq('id', transaction.id as string);
    return;
  }

  let transferId: string | null = null;

  if (transaction.stripe_payment_intent_id && (transaction.seller_payout as number) > 0) {
    const { data: sellerProfile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_connect_account_id, stripe_connect_onboarding_complete')
      .eq('id', transaction.seller_id as string)
      .single();

    if (sellerProfile?.stripe_connect_account_id && sellerProfile.stripe_connect_onboarding_complete) {
      try {
        const stripe = getStripe();
        const paymentIntent = await stripe.paymentIntents.retrieve(transaction.stripe_payment_intent_id as string);
        const chargeId = paymentIntent.latest_charge as string;

        if (transaction.stripe_transfer_id) {
          logStep("Transfer already exists, skipping", { transferId: transaction.stripe_transfer_id });
          transferId = transaction.stripe_transfer_id as string;
        } else {
          const transfer = await stripe.transfers.create({
            amount: transaction.seller_payout as number,
            currency: 'sek',
            destination: sellerProfile.stripe_connect_account_id,
            source_transaction: chargeId,
            description: `Auto-utbetalning för order ${transaction.id}`,
          }, {
            idempotencyKey: `auto_transfer_${transaction.id}`,
          });
          transferId = transfer.id;
          logStep("Auto-release transfer created", { transferId });
        }
      } catch (stripeError) {
        logStep("Failed to create transfer", { error: String(stripeError) });
      }
    }
  }

  await supabaseAdmin
    .from('transactions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      auto_release_at: null,
      stripe_transfer_id: transferId,
    })
    .eq('id', transaction.id as string);

  await supabaseAdmin.from('listings').update({ status: 'sold' }).eq('id', transaction.listing_id as string);
  await supabaseAdmin.rpc('increment_completed_deals', { seller_id: transaction.seller_id as string });
  await supabaseAdmin.rpc('update_seller_annual_stats', {
    p_seller_id: transaction.seller_id as string,
    p_amount: transaction.amount as number,
  });

  await supabaseAdmin.from('notifications').insert([
    {
      user_id: transaction.seller_id as string,
      title: 'Affären har slutförts automatiskt',
      message: 'Köparen bekräftade inte mottagandet inom 5 dagar. Affären har nu markerats som slutförd och pengarna är på väg till dig.',
      type: 'success',
      related_transaction_id: transaction.id as string,
    },
    {
      user_id: transaction.buyer_id as string,
      title: 'Affären har slutförts automatiskt',
      message: 'Du bekräftade inte mottagandet inom 5 dagar. Affären har nu markerats som slutförd.',
      type: 'info',
      related_transaction_id: transaction.id as string,
    },
  ]);

  logStep("Transaction auto-released", { id: transaction.id });
}

// Auto-cancel: refund buyer if seller never shipped within must_ship_before deadline
async function processAutoCancel(supabaseAdmin: ReturnType<typeof createClient>, transaction: Record<string, unknown>): Promise<void> {
  logStep("Processing auto-cancel for seller timeout", { id: transaction.id });

  // Safety check: no transfer should exist yet for a 'paid' transaction
  if (transaction.stripe_transfer_id) {
    logStep("CRITICAL: Transfer already exists on paid transaction being auto-cancelled", { id: transaction.id });
    // Do not refund if transfer exists – require manual admin intervention
    throw new Error("Transfer unexpectedly exists on unshipped transaction – manual admin review required");
  }

  // Refund the buyer (idempotent)
  if (transaction.stripe_payment_intent_id) {
    try {
      const stripe = getStripe();
      await stripe.refunds.create({
        payment_intent: transaction.stripe_payment_intent_id as string,
      }, {
        idempotencyKey: `auto_cancel_refund_${transaction.id}`,
      });
      logStep("Auto-cancel refund created");
    } catch (stripeErr) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      // If already refunded, that's fine
      if (!msg.includes('already_refunded') && !msg.includes('charge_already_refunded')) {
        throw new Error(`Stripe refund failed during auto-cancel: ${msg}`);
      }
      logStep("Refund already existed (idempotent)", { msg });
    }
  }

  await supabaseAdmin
    .from('transactions')
    .update({
      status: 'cancelled',
      auto_cancel_reason: 'seller_timeout',
      auto_release_at: null,
      must_ship_before: null,
    })
    .eq('id', transaction.id as string);

  // Reactivate listing so others can bid
  await supabaseAdmin.from('listings').update({ status: 'active' }).eq('id', transaction.listing_id as string);

  await supabaseAdmin.from('notifications').insert([
    {
      user_id: transaction.seller_id as string,
      title: 'Affären avbröts – du skickade inte varan i tid',
      message: 'Du markerade inte varan som skickad inom 7 dagar. Köparen har återbetalats automatiskt och annonsen har aktiverats igen.',
      type: 'error',
      related_transaction_id: transaction.id as string,
    },
    {
      user_id: transaction.buyer_id as string,
      title: 'Affären avbröts – du återbetalas',
      message: 'Säljaren skickade inte varan inom 7 dagar. Du kommer att återfå din betalning inom 5–10 bankdagar.',
      type: 'info',
      related_transaction_id: transaction.id as string,
    },
  ]);

  logStep("Auto-cancel completed", { id: transaction.id });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseClient.auth.getUser(token);
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

    const now = new Date().toISOString();
    const results = [];

    // ── 1. Auto-release shipped transactions where buyer hasn't confirmed ──
    const { data: expiredShipped, error: fetchShippedError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('status', 'shipped')
      .not('auto_release_at', 'is', null)
      .lte('auto_release_at', now);

    if (fetchShippedError) {
      throw new Error(`Failed to fetch shipped transactions: ${fetchShippedError.message}`);
    }

    logStep("Found shipped transactions to auto-release", { count: expiredShipped?.length || 0 });

    for (const transaction of expiredShipped || []) {
      try {
        await processAutoRelease(supabaseAdmin, transaction);
        results.push({ id: transaction.id, type: 'auto_release', status: 'completed' });
      } catch (txError) {
        const errorMessage = txError instanceof Error ? txError.message : String(txError);
        logStep("Failed to auto-release transaction", { id: transaction.id, error: errorMessage });
        results.push({ id: transaction.id, type: 'auto_release', status: 'error', error: errorMessage });
      }
    }

    // ── 2. Auto-cancel paid transactions where seller never shipped ──
    const { data: expiredPaid, error: fetchPaidError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('status', 'paid')
      .not('must_ship_before', 'is', null)
      .lte('must_ship_before', now);

    if (fetchPaidError) {
      throw new Error(`Failed to fetch paid transactions: ${fetchPaidError.message}`);
    }

    logStep("Found paid transactions to auto-cancel (seller timeout)", { count: expiredPaid?.length || 0 });

    for (const transaction of expiredPaid || []) {
      try {
        await processAutoCancel(supabaseAdmin, transaction);
        results.push({ id: transaction.id, type: 'auto_cancel', status: 'cancelled' });
      } catch (txError) {
        const errorMessage = txError instanceof Error ? txError.message : String(txError);
        logStep("Failed to auto-cancel transaction", { id: transaction.id, error: errorMessage });
        results.push({ id: transaction.id, type: 'auto_cancel', status: 'error', error: errorMessage });
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
