import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStatusInfo } from '@/lib/transactionStatus';
import { PublicProfile } from '@/lib/types';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  AlertTriangle, 
  CreditCard,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type TransactionWithDetails = Tables<'transactions'> & {
  listings?: Tables<'listings'> | null;
  buyer_profile?: PublicProfile | null;
  seller_profile?: PublicProfile | null;
};

interface TransactionCardProps {
  transaction: TransactionWithDetails;
  userRole: 'buyer' | 'seller';
  onUpdate: () => void;
}

export function TransactionCard({ transaction, userRole, onUpdate }: TransactionCardProps) {
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const { toast } = useToast();

  const statusInfo = getStatusInfo(transaction.status);

  const formatPrice = (priceInOre: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(priceInOre / 100);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAction = async (action: string, extraData?: Record<string, string>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-transaction', {
        body: { transaction_id: transaction.id, action, ...extraData },
      });

      if (error) throw error;

      toast({ title: 'Åtgärd genomförd!' });
      onUpdate();
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Något gick fel', 
        description: error instanceof Error ? error.message : 'Försök igen' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-escrow-checkout', {
        body: { bid_id: transaction.bid_id },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Kunde inte starta betalning', 
        description: error instanceof Error ? error.message : 'Försök igen' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'pending_payment':
        return <CreditCard className="h-5 w-5" />;
      case 'paid':
        return <Package className="h-5 w-5" />;
      case 'shipped':
        return <Truck className="h-5 w-5" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      case 'disputed':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Status bar */}
        <div className={`px-4 py-2 ${statusInfo.color} text-white flex items-center gap-2`}>
          {getStatusIcon()}
          <span className="font-medium">{statusInfo.label}</span>
        </div>

        <div className="p-4">
          {/* Product info */}
          <div className="flex gap-4">
            {transaction.listings?.images?.[0] && (
              <img 
                src={transaction.listings.images[0]} 
                alt="" 
                className="w-20 h-20 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <Link 
                to={`/listings/${transaction.listing_id}`}
                className="font-medium hover:text-primary block truncate"
              >
                {transaction.listings?.brand} {transaction.listings?.model}
              </Link>
              <p className="text-2xl font-bold mt-1">{formatPrice(transaction.amount)}</p>
              <p className="text-sm text-muted-foreground">
                {userRole === 'buyer' ? 'Säljare: ' : 'Köpare: '}
                {userRole === 'buyer' 
                  ? transaction.seller_profile?.full_name 
                  : transaction.buyer_profile?.full_name || 'Användare'}
              </p>
            </div>
          </div>

          {/* Status description */}
          <div className={`mt-4 p-3 rounded-lg ${
            transaction.status === 'paid' ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800' :
            transaction.status === 'shipped' ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800' :
            transaction.status === 'completed' ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' :
            'bg-muted'
          }`}>
            <p className={`text-sm font-medium ${
              transaction.status === 'paid' ? 'text-blue-800 dark:text-blue-200' :
              transaction.status === 'shipped' ? 'text-purple-800 dark:text-purple-200' :
              transaction.status === 'completed' ? 'text-green-800 dark:text-green-200' :
              ''
            }`}>
              {userRole === 'buyer' ? statusInfo.description : statusInfo.sellerInfo}
            </p>
            {transaction.auto_release_at && transaction.status === 'shipped' && (
              <p className="text-xs text-muted-foreground mt-2">
                ⏰ Auto-slutförs: {formatDate(transaction.auto_release_at)}
              </p>
            )}
            {transaction.tracking_number && transaction.status === 'shipped' && (
              <p className="text-xs mt-2">
                📦 Spårningsnummer: <span className="font-mono">{transaction.tracking_number}</span>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 space-y-3">
            {/* Buyer: Pay */}
            {userRole === 'buyer' && transaction.status === 'pending_payment' && (
              <Button onClick={handlePayment} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Betala och slutför affären
              </Button>
            )}

            {/* Seller: Mark shipped */}
            {userRole === 'seller' && transaction.status === 'paid' && (
              <div className="space-y-2">
                <Input
                  placeholder="Spårningsnummer (valfritt)"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
                <Button 
                  onClick={() => handleAction('mark_shipped', { tracking_number: trackingNumber })} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
                  Markera som skickad
                </Button>
              </div>
            )}

            {/* Buyer: Confirm delivery */}
            {userRole === 'buyer' && transaction.status === 'shipped' && (
              <div className="space-y-2">
                <Button 
                  onClick={() => handleAction('confirm_delivery')} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Jag har mottagit varan
                </Button>
                
                {!showDisputeForm ? (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDisputeForm(true)}
                    className="w-full"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Problem med leveransen
                  </Button>
                ) : (
                  <div className="space-y-2 p-3 border rounded-lg">
                    <Textarea
                      placeholder="Beskriv problemet..."
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleAction('report_problem', { reason: disputeReason })} 
                        disabled={loading || !disputeReason}
                      >
                        Rapportera problem
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowDisputeForm(false)}
                      >
                        Avbryt
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expandable details */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDetails(!showDetails)}
            className="w-full mt-3"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Dölj detaljer
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Visa detaljer
              </>
            )}
          </Button>

          {showDetails && (
            <div className="mt-3 pt-3 border-t text-sm space-y-1">
              <p><span className="text-muted-foreground">Skapad:</span> {formatDate(transaction.created_at)}</p>
              {transaction.shipped_at && (
                <p><span className="text-muted-foreground">Skickad:</span> {formatDate(transaction.shipped_at)}</p>
              )}
              {transaction.tracking_number && (
                <p><span className="text-muted-foreground">Spårning:</span> {transaction.tracking_number}</p>
              )}
              {transaction.completed_at && (
                <p><span className="text-muted-foreground">Slutförd:</span> {formatDate(transaction.completed_at)}</p>
              )}
              {transaction.dispute_reason && (
                <p className="text-destructive"><span className="text-muted-foreground">Tvist:</span> {transaction.dispute_reason}</p>
              )}
              <p className="pt-2">
                <span className="text-muted-foreground">Plattformsavgift:</span> {formatPrice(transaction.platform_fee)}
              </p>
              {userRole === 'seller' && (
                <p>
                  <span className="text-muted-foreground">Du får:</span> {formatPrice(transaction.seller_payout)}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
