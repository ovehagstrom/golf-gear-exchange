
-- Create external_listings table for aggregated listings from external sources
CREATE TABLE public.external_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'blocket',
  source_id text NOT NULL,
  title text NOT NULL,
  price integer,
  city text,
  source_url text NOT NULL,
  image_urls text[] DEFAULT ARRAY[]::text[],
  description text,
  published_at timestamp with time zone,
  specs_json jsonb DEFAULT '{}'::jsonb,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(source, source_id)
);

-- Enable RLS
ALTER TABLE public.external_listings ENABLE ROW LEVEL SECURITY;

-- Everyone can view active external listings
CREATE POLICY "Anyone can view active external listings"
ON public.external_listings
FOR SELECT
USING (is_active = true);

-- Admins can manage external listings
CREATE POLICY "Admins can insert external listings"
ON public.external_listings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update external listings"
ON public.external_listings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete external listings"
ON public.external_listings
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Index for fast duplicate checking
CREATE INDEX idx_external_listings_source_id ON public.external_listings(source, source_id);
-- Index for filtering
CREATE INDEX idx_external_listings_category ON public.external_listings(category);
CREATE INDEX idx_external_listings_source ON public.external_listings(source);
CREATE INDEX idx_external_listings_is_active ON public.external_listings(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_external_listings_updated_at
BEFORE UPDATE ON public.external_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
