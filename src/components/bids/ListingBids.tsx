import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { BidCard } from './BidCard';
import { Loader2, Gavel } from 'lucide-react';

type BidWithProfile = Tables<'bids'> & {
  profiles?: Tables<'profiles'> | null;
};

interface ListingBidsProps {
  listingId: string;
  isSeller: boolean;
}

export function ListingBids({ listingId, isSeller }: ListingBidsProps) {
  const { user } = useAuth();
  const [bids, setBids] = useState<BidWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBids();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`bids-${listingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          fetchBids();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId]);

  const fetchBids = async () => {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch profiles for each bidder
      const bidderIds = [...new Set(data.map(b => b.bidder_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', bidderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const bidsWithProfiles = data.map(bid => ({
        ...bid,
        profiles: profileMap.get(bid.bidder_id) || null,
      }));
      
      setBids(bidsWithProfiles);
    }
    setLoading(false);
  };

  const pendingBids = bids.filter(b => b.status === 'pending');
  const otherBids = bids.filter(b => b.status !== 'pending');

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (bids.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gavel className="h-5 w-5" />
            Bud
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Inga bud ännu
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gavel className="h-5 w-5" />
          Bud
          {pendingBids.length > 0 && (
            <Badge variant="secondary">{pendingBids.length} väntande</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingBids.map((bid) => (
          <BidCard key={bid.id} bid={bid} isSeller={isSeller} currentUserId={user?.id} onUpdate={fetchBids} />
        ))}
        {otherBids.length > 0 && pendingBids.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-3">Tidigare bud</p>
          </div>
        )}
        {otherBids.map((bid) => (
          <BidCard key={bid.id} bid={bid} isSeller={isSeller} currentUserId={user?.id} onUpdate={fetchBids} />
        ))}
      </CardContent>
    </Card>
  );
}
