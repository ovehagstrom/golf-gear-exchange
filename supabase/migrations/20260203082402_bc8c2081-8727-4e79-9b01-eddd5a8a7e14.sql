-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Public profile fields viewable" ON public.profiles;

-- Keep only the policy that allows users to see their own full profile
-- The profiles_public view doesn't need RLS since it's a view with security_invoker
-- and only exposes non-sensitive fields

-- For public access to profile data, we need to use a different approach:
-- Create a security definer function that returns only public profile fields
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  city text,
  seller_type text,
  avatar_url text,
  is_verified boolean,
  completed_deals integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.city,
    p.seller_type,
    p.avatar_url,
    p.is_verified,
    p.completed_deals,
    p.created_at
  FROM public.profiles p
  WHERE p.id = profile_id
$$;

-- Grant execute to all users
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;

-- Update profiles_public view to use this function pattern
-- First drop the existing view
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate with security_definer approach (no RLS bypass needed)
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

-- Grant access
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- The view bypasses RLS by default when owned by a superuser
-- This is acceptable because the view only exposes non-sensitive columns