import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { TransactionCard } from '@/components/transactions/TransactionCard';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShoppingBag, Store, CheckCircle } from 'lucide-react';

type TransactionWithDetails = Tables<'transactions'> & {
  listings?: Tables<'listings'> | null;
  buyer_profile?: Tables<'profiles'> | null;
  seller_profile?: Tables<'profiles'> | null;
};

export default function MyTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [purchases, setPurchases] = useState<TransactionWithDetails[]>([]);
  const [sales, setSales] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      if (sessionId && searchParams.get('success') === 'true') {
        try {
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { session_id: sessionId },
          });
          
          if (error) throw error;
          
          if (data?.success) {
            toast({
              title: '🎉 Betalning genomförd!',
              description: 'Pengarna är nu säkrade. Säljaren har blivit notifierad.',
            });
            fetchTransactions();
          }
        } catch (error) {
          console.error('Failed to verify payment:', error);
        }
      }
    };
    
    verifyPayment();
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('my-transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `buyer_id=eq.${user.id}`,
          },
          () => fetchTransactions()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `seller_id=eq.${user.id}`,
          },
          () => fetchTransactions()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;

    // Fetch purchases (where I'm buyer)
    const { data: purchasesData } = await supabase
      .from('transactions')
      .select('*, listings(*)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch sales (where I'm seller)
    const { data: salesData } = await supabase
      .from('transactions')
      .select('*, listings(*)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    // Enrich with profiles
    const enrichedPurchases = await Promise.all(
      (purchasesData || []).map(async (tx) => {
        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', tx.seller_id)
          .single();
        return { ...tx, seller_profile: sellerProfile };
      })
    );

    const enrichedSales = await Promise.all(
      (salesData || []).map(async (tx) => {
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', tx.buyer_id)
          .single();
        return { ...tx, buyer_profile: buyerProfile };
      })
    );

    setPurchases(enrichedPurchases);
    setSales(enrichedSales);
    setLoading(false);
  };

  if (!user) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p>Du måste vara inloggad för att se dina transaktioner.</p>
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

  const activePurchases = purchases.filter(t => !['completed', 'cancelled', 'refunded'].includes(t.status));
  const activeSales = sales.filter(t => !['completed', 'cancelled', 'refunded'].includes(t.status));

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Mina affärer</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Här ser du alla pågående och avslutade transaktioner.
        </p>

        <Tabs defaultValue="purchases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Köp ({activePurchases.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Försäljningar ({activeSales.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-4">
            {purchases.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-4xl mb-4">🛒</p>
                  <p className="text-muted-foreground">Du har inga köp ännu.</p>
                  <Button asChild className="mt-4">
                    <Link to="/listings">Bläddra annonser</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {activePurchases.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="font-semibold text-lg">Pågående</h2>
                    {activePurchases.map((tx) => (
                      <TransactionCard
                        key={tx.id}
                        transaction={tx}
                        userRole="buyer"
                        onUpdate={fetchTransactions}
                      />
                    ))}
                  </div>
                )}

                {purchases.filter(t => ['completed', 'cancelled', 'refunded'].includes(t.status)).length > 0 && (
                  <div className="space-y-4 mt-8">
                    <h2 className="font-semibold text-lg text-muted-foreground">Avslutade</h2>
                    {purchases
                      .filter(t => ['completed', 'cancelled', 'refunded'].includes(t.status))
                      .map((tx) => (
                        <TransactionCard
                          key={tx.id}
                          transaction={tx}
                          userRole="buyer"
                          onUpdate={fetchTransactions}
                        />
                      ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            {sales.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-4xl mb-4">📦</p>
                  <p className="text-muted-foreground">Du har inga försäljningar ännu.</p>
                  <Button asChild className="mt-4">
                    <Link to="/new-listing">Skapa annons</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {activeSales.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="font-semibold text-lg">Pågående</h2>
                    {activeSales.map((tx) => (
                      <TransactionCard
                        key={tx.id}
                        transaction={tx}
                        userRole="seller"
                        onUpdate={fetchTransactions}
                      />
                    ))}
                  </div>
                )}

                {sales.filter(t => ['completed', 'cancelled', 'refunded'].includes(t.status)).length > 0 && (
                  <div className="space-y-4 mt-8">
                    <h2 className="font-semibold text-lg text-muted-foreground">Avslutade</h2>
                    {sales
                      .filter(t => ['completed', 'cancelled', 'refunded'].includes(t.status))
                      .map((tx) => (
                        <TransactionCard
                          key={tx.id}
                          transaction={tx}
                          userRole="seller"
                          onUpdate={fetchTransactions}
                        />
                      ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
