import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES, LISTING_STATUS } from '@/lib/constants';
import { Loader2, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function MyListings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [listings, setListings] = useState<Tables<'listings'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchListings();
    }
  }, [user, authLoading, navigate]);

  const fetchListings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching listings:', error);
    } else {
      setListings(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (listingId: string, status: string) => {
    const { error } = await supabase
      .from('listings')
      .update({ status })
      .eq('id', listingId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Kunde inte uppdatera',
        description: error.message,
      });
    } else {
      toast({
        title: 'Status uppdaterad',
      });
      fetchListings();
    }
  };

  const deleteListing = async (listingId: string) => {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Kunde inte ta bort',
        description: error.message,
      });
    } else {
      toast({
        title: 'Annons borttagen',
      });
      fetchListings();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const filteredListings = listings.filter((l) => {
    if (activeTab === 'active') return l.status === 'active' || l.status === 'reserved';
    if (activeTab === 'sold') return l.status === 'sold';
    if (activeTab === 'paused') return l.status === 'paused';
    return true;
  });

  if (authLoading || loading) {
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold">Mina annonser</h1>
          <Button asChild>
            <Link to="/listings/new">
              <Plus className="h-4 w-4 mr-2" />
              Skapa annons
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              Aktiva ({listings.filter(l => l.status === 'active' || l.status === 'reserved').length})
            </TabsTrigger>
            <TabsTrigger value="sold">
              Sålda ({listings.filter(l => l.status === 'sold').length})
            </TabsTrigger>
            <TabsTrigger value="paused">
              Pausade ({listings.filter(l => l.status === 'paused').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredListings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-4xl mb-4">⛳</p>
                  <h2 className="text-lg font-semibold mb-2">Inga annonser här</h2>
                  <p className="text-muted-foreground mb-6">
                    {activeTab === 'active' && 'Du har inga aktiva annonser just nu.'}
                    {activeTab === 'sold' && 'Du har inga sålda annonser än.'}
                    {activeTab === 'paused' && 'Du har inga pausade annonser.'}
                  </p>
                  {activeTab === 'active' && (
                    <Button asChild>
                      <Link to="/listings/new">Skapa din första annons</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredListings.map((listing) => {
                  const category = CATEGORIES.find(c => c.value === listing.category);
                  const status = LISTING_STATUS.find(s => s.value === listing.status);

                  return (
                    <Card key={listing.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Image */}
                          <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {listing.images && listing.images.length > 0 ? (
                              <img
                                src={listing.images[0]}
                                alt={listing.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-2xl">⛳</span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <Link 
                                  to={`/listings/${listing.id}`}
                                  className="font-semibold hover:text-primary transition-colors"
                                >
                                  {listing.brand} {listing.model}
                                </Link>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {category?.label}
                                  </Badge>
                                  <Badge 
                                    variant={listing.status === 'active' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {status?.label}
                                  </Badge>
                                </div>
                              </div>
                              <p className="font-bold text-lg">{formatPrice(listing.price)}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-4">
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/listings/${listing.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-1" />
                                  Redigera
                                </Link>
                              </Button>

                              {listing.status === 'active' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => updateStatus(listing.id, 'reserved')}
                                  >
                                    Reservera
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => updateStatus(listing.id, 'sold')}
                                  >
                                    Markera såld
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => updateStatus(listing.id, 'paused')}
                                  >
                                    <EyeOff className="h-4 w-4 mr-1" />
                                    Pausa
                                  </Button>
                                </>
                              )}

                              {listing.status === 'reserved' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => updateStatus(listing.id, 'active')}
                                  >
                                    Avreservera
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => updateStatus(listing.id, 'sold')}
                                  >
                                    Markera såld
                                  </Button>
                                </>
                              )}

                              {listing.status === 'paused' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => updateStatus(listing.id, 'active')}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Aktivera
                                </Button>
                              )}

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive ml-auto">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Ta bort annons?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Detta kan inte ångras. Annonsen kommer att tas bort permanent.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteListing(listing.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Ta bort
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}