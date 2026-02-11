-- Add Stripe Connect account ID to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete BOOLEAN DEFAULT false;

-- Update the profiles_public view to NOT include connect details (keep them private)
-- No changes needed to the view since these are private fields