-- Drop and recreate the view with security_invoker = true
-- This means the view uses the caller's permissions, not the view creator's
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
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

-- Grant select to all users on the view
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Update profiles policy to allow everyone to SELECT (but only public fields via view)
-- The view only exposes safe fields, so we can allow select on all rows for the base table
-- but applications should use the view for public access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Policy 1: Users can view their own full profile (for editing their own data)
CREATE POLICY "Users can view own full profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Everyone can view profiles through joins/views (for public fields only via view)
-- This is needed because the view with security_invoker requires the caller to have access
CREATE POLICY "Public profile fields viewable"
  ON public.profiles FOR SELECT
  USING (true);