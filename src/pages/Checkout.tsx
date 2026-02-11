import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Loader2, 
  CreditCard, 
  Package, 
  CheckCircle2,
  ArrowLeft,
  Lock,
  Truck,
  Clock
} from 'lucide-react';

type BidWithListing = Tables<'bids'> & {
  listings: (Tables<'listings'> & { profiles: Tables<'profiles'> | null }) | null;
};

export default function Checkout() {
  const { bidId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [bid, setBid] = useState<BidWithListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [platformFeePercent, setPlatformFeePercent] = useState(5);

  useEffect(() => {
    if (bidId && user) {
      fetchBidDetails();
      fetchConfig();
    } else if (!user) {
      setLoading(false);
    }
  }, [bidId, user]);

  const fetchBidDetails = async () => {
    const { data, error } = await supabase
      .from('bids')
      .select('*, listings(*, profiles(*))')
      .eq('id', bidId)
      .eq('status', 'accepted')
      .single();

    if (error) {
      console.error('Error fetching bid:', error);
      toast({
        variant: 'destructive',
        title: 'Kunde inte hämta buddetaljer',
        description: 'Budet kanske inte längre är tillgängligt.',
      });
    } else if (data && data.bidder_id !== user?.id) {
      toast({
        variant: 'destructive',
        title: 'Åtkomst nekad',
        description: 'Du kan bara betala för dina egna accepterade bud.',
      });
      navigate('/my-bids');
      return;
    } else {
      setBid(data);
    }
    setLoading(false);
  };

  const fetchConfig = async () => {
    const { data } = await supabase
      .from('platform_config')
      .select('config_key, config_value')
      .eq('config_key', 'platform_fee_percent')
      .single();
    
    if (data) {
      setPlatformFeePercent(Number(data.config_value));
    }
  };

  const handlePayment = async () => {
    if (!bid) return;
    
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-escrow-checkout', {
        body: { bid_id: bid.id },
      });

      if (error) throw error;
      
      if (data?.url) {
        // Try opening in new tab first
        const newWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
        if (newWindow) {
          toast({
            title: 'Betalning påbörjad',
            description: 'En ny flik har öppnats för att slutföra betalningen.',
          });
        } else {
          // Popup blocked – try top-level navigation (works in iframes)
          if (window.top) {
            window.top.location.href = data.url;
          } else {
            window.location.href = data.url;
          }
        }
      }
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Kunde inte starta betalning', 
        description: error instanceof Error ? error.message : 'Försök igen' 
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!user) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p>Du måste vara inloggad för att genomföra betalning.</p>
          <Button asChild className="mt-4">
            <Link to="/auth">Logga in</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!bid || !bid.listings) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-4xl mb-4">❌</p>
          <h1 className="text-2xl font-bold mb-2">Bud hittades inte</h1>
          <p className="text-muted-foreground mb-6">
            Budet kan ha upphört eller betalningen redan genomförts.
          </p>
          <Button asChild>
            <Link to="/my-bids">Tillbaka till mina bud</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const listing = bid.listings;
  const platformFee = Math.round((bid.amount * platformFeePercent) / 100);
  const totalAmount = bid.amount + platformFee;

  return (
    <Layout>
      <div className="container max-w-3xl py-8">
        {/* Back navigation */}
        <Link 
          to="/my-bids" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tillbaka till mina bud
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Slutför köpet</h1>
          <p className="text-muted-foreground">
            Ditt bud på {formatPrice(bid.amount)} har accepterats!
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr_320px] gap-6">
          {/* Left: Product & Payment details */}
          <div className="space-y-6">
            {/* Product card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Produktinformation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {listing.images?.[0] && (
                    <img 
                      src={listing.images[0]} 
                      alt={listing.title}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {listing.brand} {listing.model}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {listing.year && `${listing.year} • `}{listing.city}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Säljare: {listing.profiles?.full_name || 'Säljare'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Betalningsdetaljer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Avtalat pris</span>
                  <span className="font-medium">{formatPrice(bid.amount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Serviceavgift ({platformFeePercent}%)</span>
                  <span>{formatPrice(platformFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Totalt att betala</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Escrow info */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Trygg betalning med escrow</h3>
                    <p className="text-sm text-muted-foreground">
                      Dina pengar hålls tryggt av plattformen tills du har mottagit och godkänt varan. 
                      Säljaren får inte pengarna förrän du bekräftar att allt är som det ska.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Payment CTA */}
          <div className="space-y-4">
            <Card className="sticky top-24">
              <CardContent className="pt-6 space-y-4">
                <Button 
                  onClick={handlePayment} 
                  disabled={paymentLoading}
                  className="w-full"
                  size="lg"
                >
                  {paymentLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-5 w-5 mr-2" />
                  )}
                  Betala {formatPrice(totalAmount)}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Säker betalning via Stripe
                </div>

                <Separator />

                {/* How it works */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Så fungerar det</p>
                  <div className="space-y-2">
                    <div className="flex gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Du betalar - pengarna hålls av plattformen</span>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <Package className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Säljaren skickar varan</span>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <Truck className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Du bekräftar mottagande</span>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Pengarna släpps till säljaren</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Om du inte bekräftar inom 5 dagar efter leverans sker automatisk utbetalning
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
