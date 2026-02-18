
-- 1. Add new columns to transactions table
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS must_ship_before timestamp with time zone,
  ADD COLUMN IF NOT EXISTS shipping_carrier text,
  ADD COLUMN IF NOT EXISTS auto_cancel_reason text;

-- 2. Create disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id),
  opened_by uuid NOT NULL,
  opened_by_role text NOT NULL CHECK (opened_by_role IN ('buyer', 'seller')),
  reason text NOT NULL CHECK (reason IN ('item_not_received', 'item_not_as_described', 'item_damaged', 'seller_unresponsive', 'other')),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'refunded', 'released')),
  admin_notes text,
  resolution_type text,
  evidence_package jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- RLS policies for disputes
CREATE POLICY "Buyers and sellers can view own disputes"
  ON public.disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = disputes.transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

CREATE POLICY "Buyers can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (
    auth.uid() = opened_by AND
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = disputes.transaction_id AND t.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all disputes"
  ON public.disputes FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update disputes"
  ON public.disputes FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at for disputes
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add shipping_v2_enabled feature flag to platform_config
INSERT INTO public.platform_config (config_key, config_value, description)
VALUES ('shipping_v2_enabled', 'false', 'Feature flag: Enable automated shipping integration (Postnord/DHL). When false, only manual tracking is used.')
ON CONFLICT (config_key) DO NOTHING;

-- 4. Add unique constraint on config_key if not exists (for ON CONFLICT to work)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'platform_config_config_key_key'
  ) THEN
    ALTER TABLE public.platform_config ADD CONSTRAINT platform_config_config_key_key UNIQUE (config_key);
  END IF;
END $$;
