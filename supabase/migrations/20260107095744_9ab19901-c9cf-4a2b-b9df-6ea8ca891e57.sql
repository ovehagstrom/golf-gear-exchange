-- Transaktioner-tabell för escrow-betalningar
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  
  -- Belopp
  amount INTEGER NOT NULL, -- Totalt belopp i öre (SEK)
  platform_fee INTEGER NOT NULL DEFAULT 0, -- Plattformsavgift i öre
  seller_payout INTEGER NOT NULL DEFAULT 0, -- Belopp till säljare efter avgift
  
  -- Stripe-data
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_transfer_id TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending_payment',
  -- pending_payment, paid, shipped, delivered, completed, disputed, refunded, cancelled
  
  -- Tracking
  tracking_number TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  disputed_at TIMESTAMP WITH TIME ZONE,
  dispute_reason TEXT,
  
  -- Auto-release efter X dagar
  auto_release_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plattformskonfiguration (admin-styrda avgifter)
CREATE TABLE public.platform_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sätt standardvärden för avgifter
INSERT INTO public.platform_config (config_key, config_value, description) VALUES
  ('platform_fee_percent', '5', 'Procentuell avgift som plattformen tar'),
  ('platform_fee_fixed', '0', 'Fast avgift i öre som plattformen tar'),
  ('auto_release_days', '5', 'Antal dagar innan automatisk payout');

-- Admin-roller tabell
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Security definer function för att kontrollera roller
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies för transactions

-- Köpare kan se sina transaktioner
CREATE POLICY "Buyers can view their transactions"
ON public.transactions
FOR SELECT
USING (auth.uid() = buyer_id);

-- Säljare kan se sina transaktioner
CREATE POLICY "Sellers can view their transactions"
ON public.transactions
FOR SELECT
USING (auth.uid() = seller_id);

-- Endast system (via edge function) kan skapa transaktioner
-- Köpare kan uppdatera för att markera leverans mottagen
CREATE POLICY "Buyers can confirm delivery"
ON public.transactions
FOR UPDATE
USING (auth.uid() = buyer_id AND status IN ('shipped', 'paid'))
WITH CHECK (status IN ('delivered', 'disputed'));

-- Säljare kan uppdatera för att markera skickad
CREATE POLICY "Sellers can mark as shipped"
ON public.transactions
FOR UPDATE
USING (auth.uid() = seller_id AND status = 'paid')
WITH CHECK (status = 'shipped');

-- Admins kan se och uppdatera alla transaktioner
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all transactions"
ON public.transactions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS för platform_config
CREATE POLICY "Everyone can read platform config"
ON public.platform_config
FOR SELECT
USING (true);

CREATE POLICY "Admins can update platform config"
ON public.platform_config
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS för user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger för updated_at
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_config_updated_at
BEFORE UPDATE ON public.platform_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime för transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;