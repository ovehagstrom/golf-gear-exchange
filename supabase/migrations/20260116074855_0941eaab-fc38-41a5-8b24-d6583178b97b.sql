-- Create function to increment completed deals count
CREATE OR REPLACE FUNCTION public.increment_completed_deals(seller_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET completed_deals = COALESCE(completed_deals, 0) + 1
  WHERE id = seller_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_completed_deals(uuid) TO service_role;