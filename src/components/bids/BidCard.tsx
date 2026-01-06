import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, X, ArrowRightLeft, Loader2 } from 'lucide-react';

type BidWithProfile = Tables<'bids'> & {
  profiles?: Tables<'profiles'> | null;
};

interface BidCardProps {
  bid: BidWithProfile;
  isSeller: boolean;
  onUpdate: () => void;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Väntar', variant: 'secondary' },
  accepted: { label: 'Accepterat', variant: 'default' },
  rejected: { label: 'Avslaget', variant: 'destructive' },
  countered: { label: 'Motbud', variant: 'outline' },
  cancelled: { label: 'Avbrutet', variant: 'destructive' },
};

export function BidCard({ bid, isSeller, onUpdate }: BidCardProps) {
  const [showCounter, setShowCounter] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  const handleAccept = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('bids')
      .update({ status: 'accepted' })
      .eq('id', bid.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Kunde inte acceptera', description: error.message });
    } else {
      toast({ title: 'Bud accepterat!', description: 'Köparen har fått besked.' });
      onUpdate();
    }
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('bids')
      .update({ status: 'rejected' })
      .eq('id', bid.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Kunde inte avslå', description: error.message });
    } else {
      toast({ title: 'Bud avslaget' });
      onUpdate();
    }
    setLoading(false);
  };

  const handleCounter = async () => {
    const amount = Number(counterAmount);
    if (!amount || amount <= 0) {
      toast({ variant: 'destructive', title: 'Ogiltigt belopp' });
      return;
    }

    setLoading(true);
    
    // Update current bid to countered
    await supabase
      .from('bids')
      .update({ status: 'countered' })
      .eq('id', bid.id);

    // Create counter-bid (seller creates bid back to buyer)
    const { error } = await supabase
      .from('bids')
      .insert({
        listing_id: bid.listing_id,
        bidder_id: bid.bidder_id, // Keep original bidder as the "thread owner"
        amount: amount,
        message: counterMessage || `Motbud från säljaren: ${formatPrice(amount)}`,
        status: 'pending',
        parent_bid_id: bid.id,
      });

    if (error) {
      toast({ variant: 'destructive', title: 'Kunde inte skicka motbud', description: error.message });
    } else {
      toast({ title: 'Motbud skickat!', description: `Motbud på ${formatPrice(amount)} har skickats.` });
      setShowCounter(false);
      setCounterAmount('');
      setCounterMessage('');
      onUpdate();
    }
    setLoading(false);
  };

  const status = statusLabels[bid.status] || statusLabels.pending;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {bid.profiles?.full_name?.charAt(0) || 'B'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{bid.profiles?.full_name || 'Användare'}</p>
              <p className="text-sm text-muted-foreground">{formatDate(bid.created_at)}</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xl font-bold">{formatPrice(bid.amount)}</p>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>

        {bid.message && (
          <p className="mt-3 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            "{bid.message}"
          </p>
        )}

        {/* Seller actions */}
        {isSeller && bid.status === 'pending' && (
          <div className="mt-4 space-y-3">
            {showCounter ? (
              <div className="space-y-3 p-3 border rounded-lg">
                <Input
                  type="number"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  placeholder="Motbudsbelopp (kr)"
                />
                <Textarea
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  placeholder="Meddelande (valfritt)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCounter} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Skicka motbud'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCounter(false)}>
                    Avbryt
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAccept} disabled={loading} className="flex-1">
                  <Check className="h-4 w-4 mr-1" />
                  Acceptera
                </Button>
                <Button size="sm" variant="outline" onClick={handleReject} disabled={loading} className="flex-1">
                  <X className="h-4 w-4 mr-1" />
                  Avslå
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowCounter(true)} disabled={loading}>
                  <ArrowRightLeft className="h-4 w-4 mr-1" />
                  Motbud
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Buyer actions for counter-bids */}
        {!isSeller && bid.status === 'pending' && bid.parent_bid_id && (
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={handleAccept} disabled={loading} className="flex-1">
              <Check className="h-4 w-4 mr-1" />
              Acceptera motbud
            </Button>
            <Button size="sm" variant="outline" onClick={handleReject} disabled={loading} className="flex-1">
              <X className="h-4 w-4 mr-1" />
              Avslå
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
