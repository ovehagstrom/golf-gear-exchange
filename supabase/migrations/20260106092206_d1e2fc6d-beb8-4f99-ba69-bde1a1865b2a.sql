-- Create bids table for the trading/bidding system
CREATE TABLE public.bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'cancelled')),
  parent_bid_id UUID REFERENCES public.bids(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Bidders can view their own bids
CREATE POLICY "Users can view their own bids"
ON public.bids
FOR SELECT
USING (auth.uid() = bidder_id);

-- Sellers can view bids on their listings
CREATE POLICY "Sellers can view bids on their listings"
ON public.bids
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = bids.listing_id AND l.user_id = auth.uid()
  )
);

-- Bidders can create bids (not on their own listings)
CREATE POLICY "Users can create bids on others listings"
ON public.bids
FOR INSERT
WITH CHECK (
  auth.uid() = bidder_id AND
  NOT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_id AND l.user_id = auth.uid()
  )
);

-- Sellers can update bids on their listings (to accept/reject/counter)
CREATE POLICY "Sellers can update bids on their listings"
ON public.bids
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = bids.listing_id AND l.user_id = auth.uid()
  )
);

-- Bidders can update their own pending bids (to cancel)
CREATE POLICY "Bidders can update their own bids"
ON public.bids
FOR UPDATE
USING (auth.uid() = bidder_id AND status = 'pending');

-- Create trigger for updated_at
CREATE TRIGGER update_bids_updated_at
BEFORE UPDATE ON public.bids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for bids
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;