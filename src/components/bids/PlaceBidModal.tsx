import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gavel } from 'lucide-react';

interface PlaceBidModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  askingPrice: number;
  userId: string;
}

export function PlaceBidModal({ 
  isOpen, 
  onClose, 
  listingId, 
  listingTitle, 
  askingPrice,
  userId 
}: PlaceBidModalProps) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const bidAmount = Number(amount);
    if (!bidAmount || bidAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Ogiltigt bud',
        description: 'Ange ett giltigt belopp',
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('bids')
      .insert({
        listing_id: listingId,
        bidder_id: userId,
        amount: bidAmount,
        message: message || null,
        status: 'pending',
      });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Kunde inte lägga bud',
        description: error.message,
      });
    } else {
      toast({
        title: 'Bud skickat!',
        description: `Ditt bud på ${formatPrice(bidAmount)} har skickats till säljaren.`,
      });
      setAmount('');
      setMessage('');
      onClose();
    }

    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Lägg bud
          </DialogTitle>
          <DialogDescription>
            {listingTitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Utropspris</p>
            <p className="text-lg font-bold">{formatPrice(askingPrice)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Ditt bud (kr) *</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ange belopp"
              min="1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Meddelande (valfritt)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="T.ex. 'Kan hämta idag' eller 'Intresserad av snabb affär'"
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Budet är inte bindande förrän säljaren accepterar.
          </p>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Avbryt
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Skicka bud'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
