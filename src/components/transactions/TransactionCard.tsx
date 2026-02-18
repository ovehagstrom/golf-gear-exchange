import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Clock,
} from 'lucide-react';

type TransactionWithDetails = Tables<'transactions'> & {
  listings?: Tables<'listings'> | null;
  buyer_profile?: PublicProfile | null;
  seller_profile?: PublicProfile | null;
  // Extra columns added in migration
  must_ship_before?: string | null;
  shipping_carrier?: string | null;
  auto_cancel_reason?: string | null;
};

interface TransactionCardProps {
  transaction: TransactionWithDetails;
  userRole: 'buyer' | 'seller';
  onUpdate: () => void;
}

const CARRIERS = [
  { value: 'postnord', label: 'PostNord' },
  { value: 'dhl', label: 'DHL' },
  { value: 'schenker', label: 'DB Schenker' },
  { value: 'other', label: 'Annat fraktbolag' },
];

const DISPUTE_REASONS = [
  { value: 'item_not_received', label: 'Varan har inte anlänt' },
  { value: 'item_not_as_described', label: 'Varan stämmer inte med beskrivningen' },
  { value: 'item_damaged', label: 'Varan är skadad' },
  { value: 'seller_unresponsive', label: 'Säljaren svarar inte' },
  { value: 'other', label: 'Annat problem' },
];

export function TransactionCard({ transaction, userRole, onUpdate }: TransactionCardProps) {
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeReasonType, setDisputeReasonType] = useState('item_not_received');
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

  const daysUntil = (date: string | null) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleAction = async (action: string, extraData?: Record<string, string>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-transaction', {
        body: { transaction_id: transaction.id, action, ...extraData },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

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

  const handleMarkShipped = () => {
    if (!trackingNumber || trackingNumber.trim().length < 8) {
      toast({ variant: 'destructive', title: 'Spårningsnummer krävs', description: 'Ange minst 8 tecken.' });
      return;
    }
    if (!shippingCarrier) {
      toast({ variant: 'destructive', title: 'Välj fraktbärare' });
      return;
    }
    handleAction('mark_shipped', { tracking_number: trackingNumber.trim(), shipping_carrier: shippingCarrier });
  };

  const handleDispute = () => {
    if (!disputeReason.trim()) {
      toast({ variant: 'destructive', title: 'Beskriv problemet' });
      return;
    }
    handleAction('report_problem', { 
      reason: disputeReasonType,
      dispute_reason: disputeReasonType,
      dispute_description: disputeReason,
    });
  };

  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'pending_payment': return <CreditCard className="h-5 w-5" />;
      case 'paid': return <Package className="h-5 w-5" />;
      case 'shipped': return <Truck className="h-5 w-5" />;
      case 'completed': return <CheckCircle className="h-5 w-5" />;
      case 'disputed': return <AlertTriangle className="h-5 w-5" />;
      case 'cancelled': return <AlertTriangle className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const mustShipDays = daysUntil(transaction.must_ship_before || null);
  const carrierLabel = CARRIERS.find(c => c.value === transaction.shipping_carrier)?.label;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Status bar */}
        <div className={`px-4 py-2 ${statusInfo.color} text-white flex items-center gap-2`}>
          {getStatusIcon()}
          <span className="font-medium">{statusInfo.label}</span>
          {transaction.status === 'cancelled' && transaction.auto_cancel_reason === 'seller_timeout' && (
            <span className="ml-auto text-xs opacity-90">Avbruten – säljaren skickade inte i tid</span>
          )}
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

            {/* Must ship deadline (seller) */}
            {userRole === 'seller' && transaction.status === 'paid' && transaction.must_ship_before && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                (mustShipDays ?? 99) <= 2 ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                <Clock className="h-3 w-3" />
                {mustShipDays !== null && mustShipDays > 0
                  ? `Skicka inom ${mustShipDays} dag${mustShipDays !== 1 ? 'ar' : ''} – annars återbetalas köparen automatiskt`
                  : 'Deadline för utskick har passerat – återbetalning sker snart'}
              </div>
            )}

            {transaction.auto_release_at && transaction.status === 'shipped' && (
              <p className="text-xs text-muted-foreground mt-2">
                ⏰ Auto-slutförs: {formatDate(transaction.auto_release_at)}
              </p>
            )}
            {transaction.tracking_number && transaction.status === 'shipped' && (
              <div className="text-xs mt-2 space-y-0.5">
                <p>📦 Spårningsnummer: <span className="font-mono font-medium">{transaction.tracking_number}</span></p>
                {carrierLabel && <p>🚚 Fraktbärare: {carrierLabel}</p>}
              </div>
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

            {/* Seller: Mark shipped – tracking required */}
            {userRole === 'seller' && transaction.status === 'paid' && (
              <div className="space-y-2 p-3 border rounded-lg bg-muted/40">
                <p className="text-sm font-medium">Markera som skickad</p>
                <Select value={shippingCarrier} onValueChange={setShippingCarrier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj fraktbärare *" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Spårningsnummer * (minst 8 tecken)"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className={trackingNumber.length > 0 && trackingNumber.length < 8 ? 'border-destructive' : ''}
                />
                {trackingNumber.length > 0 && trackingNumber.length < 8 && (
                  <p className="text-xs text-destructive">Minst 8 tecken krävs</p>
                )}
                <Button 
                  onClick={handleMarkShipped}
                  disabled={loading || !shippingCarrier || trackingNumber.trim().length < 8}
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
                  Markera som skickad
                </Button>
                <p className="text-xs text-muted-foreground">
                  Spårningsnumret sparas som bevis vid eventuell tvist.
                </p>
              </div>
            )}

            {/* Buyer: Confirm delivery or report problem */}
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
                  <div className="space-y-2 p-3 border border-destructive/30 rounded-lg bg-destructive/5">
                    <p className="text-sm font-medium text-destructive">Rapportera problem</p>
                    <Select value={disputeReasonType} onValueChange={setDisputeReasonType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj anledning" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISPUTE_REASONS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Beskriv problemet i detalj..."
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      En tvist öppnas och pengarna låses tills admin löser ärendet. Auto-utbetalning pausas.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleDispute}
                        disabled={loading || !disputeReason.trim()}
                      >
                        Öppna tvist
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
              <><ChevronUp className="h-4 w-4 mr-2" />Dölj detaljer</>
            ) : (
              <><ChevronDown className="h-4 w-4 mr-2" />Visa detaljer</>
            )}
          </Button>

          {showDetails && (
            <div className="mt-3 pt-3 border-t text-sm space-y-1">
              <p><span className="text-muted-foreground">Skapad:</span> {formatDate(transaction.created_at)}</p>
              {transaction.must_ship_before && transaction.status === 'paid' && (
                <p><span className="text-muted-foreground">Skickas senast:</span> {formatDate(transaction.must_ship_before)}</p>
              )}
              {transaction.shipped_at && (
                <p><span className="text-muted-foreground">Skickad:</span> {formatDate(transaction.shipped_at)}</p>
              )}
              {transaction.tracking_number && (
                <p><span className="text-muted-foreground">Spårning:</span> <span className="font-mono">{transaction.tracking_number}</span></p>
              )}
              {transaction.shipping_carrier && (
                <p><span className="text-muted-foreground">Fraktbärare:</span> {carrierLabel}</p>
              )}
              {transaction.completed_at && (
                <p><span className="text-muted-foreground">Slutförd:</span> {formatDate(transaction.completed_at)}</p>
              )}
              {transaction.dispute_reason && (
                <p className="text-destructive"><span className="text-muted-foreground">Tvist:</span> {transaction.dispute_reason}</p>
              )}
              {transaction.auto_cancel_reason && (
                <p className="text-destructive"><span className="text-muted-foreground">Avbröts:</span> {transaction.auto_cancel_reason === 'seller_timeout' ? 'Säljaren skickade inte i tid' : transaction.auto_cancel_reason}</p>
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
