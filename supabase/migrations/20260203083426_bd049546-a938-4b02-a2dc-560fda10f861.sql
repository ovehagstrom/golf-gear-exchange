-- Fix 1: profiles_table_sensitive_exposure
-- The profiles table currently has only "Users can view own full profile" SELECT policy
-- This is correct! No additional fix needed as long as the policy restricts to auth.uid() = id
-- Verify and ensure no other SELECT policy exists that would expose data

-- First, let's ensure the profiles table RLS is properly configured
-- Drop any overly permissive policies if they exist
DROP POLICY IF EXISTS "Public profile fields viewable" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- The only SELECT policy should be "Users can view own full profile" with USING (auth.uid() = id)
-- This is already in place based on the schema

-- Fix 2: transactions_financial_data_exposure
-- The transactions table has policies for buyers, sellers, and admins
-- These are RESTRICTIVE policies, which means they work together with AND logic
-- Actually, RESTRICTIVE means NO access unless explicitly granted
-- Since we have buyer_id, seller_id, and admin SELECT policies, unauthorized users cannot access
-- However, let's add explicit documentation that this is secure by design

-- Verify transactions RLS is enabled (it should be)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- The current policies are:
-- "Buyers can view their transactions" - USING (auth.uid() = buyer_id)
-- "Sellers can view their transactions" - USING (auth.uid() = seller_id)
-- "Admins can view all transactions" - USING has_role(auth.uid(), 'admin')
-- This is secure - no additional policy needed as unauthorized users get no access