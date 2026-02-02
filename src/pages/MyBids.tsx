import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gavel, Package, ArrowRight, CreditCard, Shield, CheckCircle, Clock, Truck } from 'lucide-react';
import { getStatusInfo } from '@/lib/transactionStatus';

type BidWithListing = Tables<'bids'> & {
  listings: Tables<'listings'> | null;
};

type BidWithTransaction = BidWithListing & {
  transaction?: Tables<'transactions'> | null;
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Väntar', variant: 'secondary' },
  accepted: { label: 'Accepterat', variant: 'default' },
  rejected: { label: 'Avslaget', variant: 'destructive' },
  countered: { label: 'Motbud', variant: 'outline' },
  cancelled: { label: 'Avbrutet', variant: 'destructive' },
};

// Public profile for bidder display
type BidderProfile = {
  full_name: string | null;
  avatar_url: string | null;
};

export default function MyBids() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [sentBids, setSentBids] = useState<BidWithTransaction[]>([]);
  const [receivedBids, setReceivedBids] = useState<(BidWithListing & { profiles?: BidderProfile | null })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBids = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Fetch bids I've sent with their listings
    const { data: sent } = await supabase
      .from('bids')
      .select('*, listings(*)')
      .eq('bidder_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch ALL transactions for this user as buyer in a single query
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('buyer_id', user.id);

    // Create a map of bid_id -> transaction for fast lookup
    const transactionMap = new Map<string, Tables<'transactions'>>();
    if (transactions) {
      for (const tx of transactions) {
        transactionMap.set(tx.bid_id, tx);
      }
    }

    // Combine bids with their transactions
    const sentWithTransactions: BidWithTransaction[] = (sent || []).map(bid => ({
      ...bid,
      transaction: transactionMap.get(bid.id) || null,
    }));

    // Fetch bids on my listings
    const { data: myListings } = await supabase
      .from('listings')
      .select('id')
      .eq('user_id', user.id);

    if (myListings && myListings.length > 0) {
      const listingIds = myListings.map(l => l.id);
      // Use profiles_public view to get bidder info without exposing email/phone
      const { data: received } = await supabase
        .from('bids')
        .select('*, listings(*)')
        .in('listing_id', listingIds)
        .order('created_at', { ascending: false });
      
      // Fetch public profiles for bidders
      if (received && received.length > 0) {
        const bidderIds = [...new Set(received.map(b => b.bidder_id))];
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('id, full_name, avatar_url')
          .in('id', bidderIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []);
        const receivedWithProfiles = received.map(bid => ({
          ...bid,
          profiles: profileMap.get(bid.bidder_id) || null,
        }));
        setReceivedBids(receivedWithProfiles);
      } else {
        setReceivedBids([]);
      }

      setReceivedBids((received as any) || []);
    }

    setSentBids(sentWithTransactions);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      toast({
        title: 'Betalning avbruten',
        description: 'Du kan betala senare från dina bud.',
      });
    }
    // If returning from payment success, refetch to get updated status
    if (searchParams.get('success') === 'true') {
      toast({
        title: 'Betalning genomförd!',
        description: 'Pengarna är säkrade. Väntar på att säljaren skickar varan.',
      });
      // Small delay to allow database to update
      const timer = setTimeout(() => {
        fetchBids();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, toast, fetchBids]);

  useEffect(() => {
    if (user) {
      fetchBids();
    }
  }, [user, fetchBids]);

  // Real-time subscription for transaction updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('my-bids-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `buyer_id=eq.${user.id}`,
        },
        () => {
          // Refetch when transaction changes
          fetchBids();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBids]);

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

  const renderTransactionStatus = (bid: BidWithTransaction) => {
    const transaction = bid.transaction;
    
    // No transaction yet - show payment button
    if (!transaction || transaction.status === 'pending_payment') {
      return (
        <div className="mt-4 p-4 rounded-lg bg-background border border-primary/30">
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium">Grattis! Ditt bud har accepterats</p>
              <p className="text-sm text-muted-foreground">
                Slutför köpet genom att betala. Pengarna hålls tryggt tills du bekräftar mottagandet.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate(`/checkout/${bid.id}`)}
            className="w-full"
            size="lg"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Betala och slutför affären
          </Button>
        </div>
      );
    }

    // Transaction exists and is paid or beyond
    const statusInfo = getStatusInfo(transaction.status);
    
    if (transaction.status === 'paid') {
      return (
        <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Pengarna är säkrade</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {statusInfo.description}
              </p>
            </div>
          </div>
          <Button 
            variant="outline"
            onClick={() => navigate('/my-transactions')}
            className="w-full mt-3"
            size="sm"
          >
            Visa affärsdetaljer
          </Button>
        </div>
      );
    }

    if (transaction.status === 'shipped') {
      return (
        <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-3">
            <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-purple-800 dark:text-purple-200">Varan är skickad!</p>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                {statusInfo.description}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/my-transactions')}
            className="w-full mt-3"
            size="sm"
          >
            Bekräfta mottagande
          </Button>
        </div>
      );
    }

    if (transaction.status === 'completed' || transaction.status === 'delivered') {
      return (
        <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">Affären är slutförd</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {statusInfo.description}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Default fallback for other statuses
    return (
      <div className="mt-4 p-4 rounded-lg bg-muted border">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="font-medium">{statusInfo.label}</p>
            <p className="text-sm text-muted-foreground">
              {statusInfo.description}
            </p>
          </div>
        </div>
        <Button 
          variant="outline"
          onClick={() => navigate('/my-transactions')}
          className="w-full mt-3"
          size="sm"
        >
          Visa affärsdetaljer
        </Button>
      </div>
    );
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
                const isAccepted = bid.status === 'accepted';
                return (
                  <Card key={bid.id} className={isAccepted ? 'border-primary/50 bg-primary/5' : ''}>
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
                      
                      {/* Transaction status for accepted bids */}
                      {isAccepted && renderTransactionStatus(bid)}
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