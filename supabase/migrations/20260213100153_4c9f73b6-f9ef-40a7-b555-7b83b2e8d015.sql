
-- Create table for DAC7 annual seller reporting
CREATE TABLE public.seller_annual_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  year INTEGER NOT NULL,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_gross_revenue BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id, year)
);

-- Enable RLS
ALTER TABLE public.seller_annual_reports ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage reports
CREATE POLICY "Admins can view all seller reports"
  ON public.seller_annual_reports FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert seller reports"
  ON public.seller_annual_reports FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update seller reports"
  ON public.seller_annual_reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Sellers can view their own reports
CREATE POLICY "Sellers can view own reports"
  ON public.seller_annual_reports FOR SELECT
  USING (auth.uid() = seller_id);

-- Trigger for updated_at
CREATE TRIGGER update_seller_annual_reports_updated_at
  BEFORE UPDATE ON public.seller_annual_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update seller annual stats (called after transaction completion)
CREATE OR REPLACE FUNCTION public.update_seller_annual_stats(p_seller_id UUID, p_amount BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
BEGIN
  INSERT INTO public.seller_annual_reports (seller_id, year, total_transactions, total_gross_revenue)
  VALUES (p_seller_id, current_year, 1, p_amount)
  ON CONFLICT (seller_id, year)
  DO UPDATE SET
    total_transactions = seller_annual_reports.total_transactions + 1,
    total_gross_revenue = seller_annual_reports.total_gross_revenue + p_amount,
    updated_at = now();
END;
$$;
