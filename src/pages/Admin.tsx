import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getStatusInfo } from '@/lib/transactionStatus';
import { 
  Loader2, 
  Shield, 
  AlertTriangle, 
  DollarSign, 
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Webhook,
  Clock,
} from 'lucide-react';

type TransactionWithDetails = Tables<'transactions'> & {
  listings?: Tables<'listings'> | null;
  buyer_profile?: Tables<'profiles'> | null;
  seller_profile?: Tables<'profiles'> | null;
};

type WebhookEvent = {
  id: string;
  stripe_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  error_message: string | null;
  transaction_id: string | null;
  created_at: string;
};

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [disputes, setDisputes] = useState<TransactionWithDetails[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkAdminRole();
    }
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (data) {
      setIsAdmin(true);
      fetchAllData();
    } else {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    // Fetch all transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, listings(*)')
      .order('created_at', { ascending: false });

    // Fetch config
    const { data: configData } = await supabase
      .from('platform_config')
      .select('*');

    // Fetch webhook events (admin only)
    const { data: webhookData } = await supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Enrich transactions
    const enriched = await Promise.all(
      (txData || []).map(async (tx) => {
        const [{ data: buyerProfile }, { data: sellerProfile }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', tx.buyer_id).single(),
          supabase.from('profiles').select('*').eq('id', tx.seller_id).single(),
        ]);
        return { ...tx, buyer_profile: buyerProfile, seller_profile: sellerProfile };
      })
    );

    setTransactions(enriched);
    setDisputes(enriched.filter(t => t.status === 'disputed'));
    setWebhookEvents((webhookData || []) as WebhookEvent[]);
    
    const configMap: Record<string, string> = {};
    configData?.forEach(c => {
      configMap[c.config_key] = c.config_value;
    });
    setConfig(configMap);
    
    setLoading(false);
  };

  const handleAdminAction = async (transactionId: string, action: 'admin_release' | 'admin_refund') => {
    setActionLoading(transactionId);
    try {
      const { error } = await supabase.functions.invoke('complete-transaction', {
        body: { transaction_id: transactionId, action },
      });

      if (error) throw error;

      toast({ 
        title: action === 'admin_release' ? 'Pengar släppta!' : 'Återbetalning genomförd!',
      });
      fetchAllData();
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Försök igen',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfigUpdate = async (key: string, value: string) => {
    const { error } = await supabase
      .from('platform_config')
      .update({ config_value: value })
      .eq('config_key', key);

    if (error) {
      toast({ variant: 'destructive', title: 'Kunde inte uppdatera' });
    } else {
      toast({ title: 'Inställning sparad!' });
      setConfig(prev => ({ ...prev, [key]: value }));
    }
  };

  const formatPrice = (priceInOre: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(priceInOre / 100);
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
          <p>Du måste vara inloggad.</p>
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

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Åtkomst nekad</h1>
          <p className="text-muted-foreground">Du har inte admin-behörighet.</p>
        </div>
      </Layout>
    );
  }

  const totalVolume = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFees = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.platform_fee, 0);

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Admin</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Totala transaktioner</p>
              <p className="text-3xl font-bold">{transactions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Aktiva tvister</p>
              <p className="text-3xl font-bold text-destructive">{disputes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total volym</p>
              <p className="text-3xl font-bold">{formatPrice(totalVolume)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Intjänade avgifter</p>
              <p className="text-3xl font-bold text-primary">{formatPrice(totalFees)}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="disputes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Tvister ({disputes.length})
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Alla transaktioner
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhook-logg
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Inställningar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="disputes" className="space-y-4">
            {disputes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">Inga aktiva tvister! 🎉</p>
                </CardContent>
              </Card>
            ) : (
              disputes.map((tx) => (
                <Card key={tx.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="destructive">TVIST</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(tx.disputed_at || tx.created_at)}
                          </span>
                        </div>
                        <p className="font-medium">
                          {tx.listings?.brand} {tx.listings?.model}
                        </p>
                        <p className="text-lg font-bold">{formatPrice(tx.amount)}</p>
                        <div className="text-sm text-muted-foreground mt-2">
                          <p>Köpare: {tx.buyer_profile?.full_name || tx.buyer_profile?.email}</p>
                          <p>Säljare: {tx.seller_profile?.full_name || tx.seller_profile?.email}</p>
                        </div>
                        {tx.dispute_reason && (
                          <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                            <p className="text-sm font-medium text-destructive">Anledning:</p>
                            <p className="text-sm">{tx.dispute_reason}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAdminAction(tx.id, 'admin_release')}
                          disabled={actionLoading === tx.id}
                        >
                          {actionLoading === tx.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Släpp pengar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAdminAction(tx.id, 'admin_refund')}
                          disabled={actionLoading === tx.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Återbetala
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={fetchAllData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Uppdatera
              </Button>
            </div>
            {transactions.map((tx) => {
              const statusInfo = getStatusInfo(tx.status);
              return (
                <Card key={tx.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(tx.created_at)}
                          </span>
                        </div>
                        <p className="font-medium">
                          {tx.listings?.brand} {tx.listings?.model}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {tx.buyer_profile?.full_name} → {tx.seller_profile?.full_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatPrice(tx.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Avgift: {formatPrice(tx.platform_fee)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Senaste 100 webhook-events från Stripe</p>
              <Button variant="outline" size="sm" onClick={fetchAllData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Uppdatera
              </Button>
            </div>
            {webhookEvents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Inga webhook-events ännu</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {webhookEvents.map((event) => (
                  <Card key={event.id} className={!event.processed && event.error_message ? 'border-destructive' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {event.processed ? (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : event.error_message ? (
                              <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            )}
                            <Badge variant={
                              event.event_type.includes('completed') ? 'default' :
                              event.event_type.includes('failed') ? 'destructive' :
                              event.event_type.includes('refund') ? 'secondary' :
                              event.event_type.includes('dispute') ? 'destructive' : 'outline'
                            }>
                              {event.event_type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {event.stripe_event_id}
                          </p>
                          {event.error_message && (
                            <p className="text-sm text-destructive mt-1">{event.error_message}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                          {formatDate(event.created_at)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Plattformsinställningar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fee_percent">Procentuell avgift (%)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="fee_percent"
                        type="number"
                        value={config.platform_fee_percent || '5'}
                        onChange={(e) => setConfig(prev => ({ ...prev, platform_fee_percent: e.target.value }))}
                      />
                      <Button onClick={() => handleConfigUpdate('platform_fee_percent', config.platform_fee_percent)}>
                        Spara
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Procent av belopp som plattformen tar</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fee_fixed">Fast avgift (öre)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="fee_fixed"
                        type="number"
                        value={config.platform_fee_fixed || '0'}
                        onChange={(e) => setConfig(prev => ({ ...prev, platform_fee_fixed: e.target.value }))}
                      />
                      <Button onClick={() => handleConfigUpdate('platform_fee_fixed', config.platform_fee_fixed)}>
                        Spara
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Fast avgift utöver procent (100 öre = 1 kr)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auto_release">Auto-release (dagar)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="auto_release"
                        type="number"
                        value={config.auto_release_days || '5'}
                        onChange={(e) => setConfig(prev => ({ ...prev, auto_release_days: e.target.value }))}
                      />
                      <Button onClick={() => handleConfigUpdate('auto_release_days', config.auto_release_days)}>
                        Spara
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Dagar innan automatisk payout efter skickad</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
