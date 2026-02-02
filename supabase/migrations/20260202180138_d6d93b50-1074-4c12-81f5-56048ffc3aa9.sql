-- Create a public view of profiles that excludes sensitive fields (email, phone)
-- This view is accessible to everyone but hides PII
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  full_name,
  city,
  seller_type,
  avatar_url,
  is_verified,
  completed_deals,
  created_at
FROM public.profiles;

-- Grant access to the view for all users
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Update RLS policy: Only allow users to see their own full profile (with email/phone)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Enable leaked password protection (requires setting in Supabase dashboard, noting here for reference)
-- This is configured via Supabase Auth settings, not SQL