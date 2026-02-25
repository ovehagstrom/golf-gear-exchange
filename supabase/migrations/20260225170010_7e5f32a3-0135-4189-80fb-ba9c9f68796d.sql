
-- Create external_sellers table for admin-managed sellers without accounts
CREATE TABLE public.external_sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  city text NOT NULL,
  converted_user_id uuid REFERENCES auth.users(id) DEFAULT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_sellers ENABLE ROW LEVEL SECURITY;

-- Only admins can CRUD
CREATE POLICY "Admins can view external sellers"
  ON public.external_sellers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create external sellers"
  ON public.external_sellers FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update external sellers"
  ON public.external_sellers FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete external sellers"
  ON public.external_sellers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add external_seller_id to listings
ALTER TABLE public.listings
  ADD COLUMN external_seller_id uuid REFERENCES public.external_sellers(id) DEFAULT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_external_sellers_updated_at
  BEFORE UPDATE ON public.external_sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
