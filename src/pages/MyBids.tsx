import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Gavel, Package, ArrowRight } from 'lucide-react';

type BidWithListing = Tables<'bids'> & {
  listings: Tables<'listings'> | null;
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Väntar', variant: 'secondary' },
  accepted: { label: 'Accepterat', variant: 'default' },
  rejected: { label: 'Avslaget', variant: 'destructive' },
  countered: { label: 'Motbud', variant: 'outline' },
  cancelled: { label: 'Avbrutet', variant: 'destructive' },
};

export default function MyBids() {
  const { user } = useAuth();
  const [sentBids, setSentBids] = useState<BidWithListing[]>([]);
  const [receivedBids, setReceivedBids] = useState<(BidWithListing & { profiles?: Tables<'profiles'> | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBids();
    }
  }, [user]);

  const fetchBids = async () => {
    if (!user) return;

    // Fetch bids I've sent
    const { data: sent } = await supabase
      .from('bids')
      .select('*, listings(*)')
      .eq('bidder_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch bids on my listings
    const { data: myListings } = await supabase
      .from('listings')
      .select('id')
      .eq('user_id', user.id);

    if (myListings && myListings.length > 0) {
      const listingIds = myListings.map(l => l.id);
      const { data: received } = await supabase
        .from('bids')
        .select('*, listings(*), profiles:bidder_id(full_name, avatar_url)')
        .in('listing_id', listingIds)
        .order('created_at', { ascending: false });

      setReceivedBids((received as any) || []);
    }

    setSentBids(sent || []);
    setLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p>Du måste vara inloggad för att se dina bud.</p>
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

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-8">
          <Gavel className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Mina bud</h1>
        </div>

        <Tabs defaultValue="sent" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Skickade bud ({sentBids.length})
            </TabsTrigger>
            <TabsTrigger value="received" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Mottagna bud ({receivedBids.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="space-y-4">
            {sentBids.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-4xl mb-4">🏌️</p>
                  <p className="text-muted-foreground">Du har inga aktiva bud.</p>
                  <Button asChild className="mt-4">
                    <Link to="/listings">Bläddra annonser</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              sentBids.map((bid) => {
                const status = statusLabels[bid.status] || statusLabels.pending;
                return (
                  <Card key={bid.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {bid.listings?.images?.[0] && (
                          <img 
                            src={bid.listings.images[0]} 
                            alt="" 
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <Link 
                            to={`/listings/${bid.listing_id}`}
                            className="font-medium hover:text-primary truncate block"
                          >
                            {bid.listings?.brand} {bid.listings?.model}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            Ditt bud: <span className="font-bold text-foreground">{formatPrice(bid.amount)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(bid.created_at)}</p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      {bid.message && (
                        <p className="mt-2 text-sm text-muted-foreground italic">"{bid.message}"</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="received" className="space-y-4">
            {receivedBids.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-4xl mb-4">📭</p>
                  <p className="text-muted-foreground">Du har inga mottagna bud.</p>
                </CardContent>
              </Card>
            ) : (
              receivedBids.map((bid) => {
                const status = statusLabels[bid.status] || statusLabels.pending;
                return (
                  <Card key={bid.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {bid.listings?.images?.[0] && (
                          <img 
                            src={bid.listings.images[0]} 
                            alt="" 
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <Link 
                            to={`/listings/${bid.listing_id}`}
                            className="font-medium hover:text-primary truncate block"
                          >
                            {bid.listings?.brand} {bid.listings?.model}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            Bud från {(bid as any).profiles?.full_name || 'Användare'}: 
                            <span className="font-bold text-foreground ml-1">{formatPrice(bid.amount)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(bid.created_at)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/listings/${bid.listing_id}`}>Hantera</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
