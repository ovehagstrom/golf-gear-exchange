import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES, CONDITIONS, SHAFT_FLEX, SELLER_TYPES } from '@/lib/constants';
import { PlaceBidModal } from '@/components/bids/PlaceBidModal';
import { ListingBids } from '@/components/bids/ListingBids';
import { ReportModal } from '@/components/moderation/ReportModal';
import { UserActionsMenu } from '@/components/moderation/UserActionsMenu';
import { PublicProfile } from '@/lib/types';
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  Gavel,
  Flag
} from 'lucide-react';

type ListingWithProfile = Tables<'listings'> & {
  profiles: PublicProfile | null;
  external_seller_id?: string | null;
};

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [listing, setListing] = useState<ListingWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactLoading, setContactLoading] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*, profiles:profiles_public!listings_user_id_fkey(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching listing:', error);
    } else {
      setListing(data);
    }
    setLoading(false);
  };

  const handleContact = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!listing || user.id === listing.user_id) {
      return;
    }

    setContactLoading(true);

    // Check if conversation exists
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('buyer_id', user.id)
      .single();

    if (existingConv) {
      navigate(`/messages/${existingConv.id}`);
    } else {
      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.user_id,
        })
        .select()
        .single();

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Kunde inte starta konversation',
          description: error.message,
        });
      } else {
        navigate(`/messages/${newConv.id}`);
      }
    }

    setContactLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    const intervals = [
      { label: 'år', seconds: 31536000 },
      { label: 'månader', seconds: 2592000 },
      { label: 'veckor', seconds: 604800 },
      { label: 'dagar', seconds: 86400 },
      { label: 'timmar', seconds: 3600 },
      { label: 'minuter', seconds: 60 },
    ];

    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        return `${count} ${interval.label} sedan`;
      }
    }
    return 'Just nu';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!listing) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-4xl mb-4">⛳</p>
          <h1 className="text-2xl font-bold mb-2">Annons hittades inte</h1>
          <p className="text-muted-foreground mb-6">
            Annonsen kan ha tagits bort eller så finns den inte längre.
          </p>
          <Button asChild>
            <Link to="/listings">Tillbaka till annonser</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const category = CATEGORIES.find(c => c.value === listing.category);
  const condition = CONDITIONS.find(c => c.value === listing.condition);
  const shaftFlex = SHAFT_FLEX.find(f => f.value === listing.shaft_flex);
  const sellerType = SELLER_TYPES.find(t => t.value === listing.profiles?.seller_type);

  return (
    <Layout>
      <div className="container py-6">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link to="/listings" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Tillbaka till annonser
          </Link>
        </nav>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Image Gallery */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
              {listing.images && listing.images.length > 0 ? (
                <>
                  <img
                    src={listing.images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {listing.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((i) => (i > 0 ? i - 1 : listing.images!.length - 1))}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((i) => (i < listing.images!.length - 1 ? i + 1 : 0))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {listing.images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImageIndex(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              i === currentImageIndex ? 'bg-primary' : 'bg-background/60'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">⛳</span>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {listing.is_spec_verified && (
                  <Badge className="golf-badge-spec">
                    <CheckCircle2 className="h-3 w-3" />
                    Golf-spec verifierad
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {listing.images && listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {listing.images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === currentImageIndex ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Title & Basic Info */}
            <div>
              <Badge variant="secondary" className="mb-3">{category?.label}</Badge>
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                {listing.brand} {listing.model}
              </h1>
              {listing.year && (
                <p className="text-lg text-muted-foreground">{listing.year}</p>
              )}
            </div>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Specifikationer</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Märke</dt>
                    <dd className="font-medium">{listing.brand}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Modell</dt>
                    <dd className="font-medium">{listing.model}</dd>
                  </div>
                  {listing.year && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Årsmodell</dt>
                      <dd className="font-medium">{listing.year}</dd>
                    </div>
                  )}
                  {listing.shaft_model && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Shaft</dt>
                      <dd className="font-medium">{listing.shaft_model}</dd>
                    </div>
                  )}
                  {shaftFlex && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Flex</dt>
                      <dd className="font-medium">{shaftFlex.label}</dd>
                    </div>
                  )}
                  {listing.shaft_length && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Längd</dt>
                      <dd className="font-medium">{listing.shaft_length}</dd>
                    </div>
                  )}
                  {listing.lie_angle && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Lie</dt>
                      <dd className="font-medium">{listing.lie_angle}</dd>
                    </div>
                  )}
                  {listing.grip && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Grepp</dt>
                      <dd className="font-medium">{listing.grip}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-muted-foreground">Skick</dt>
                    <dd className="font-medium flex items-center gap-2">
                      <span className={`condition-dot condition-${listing.condition}`} />
                      {condition?.label}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-6">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {formatPrice(listing.price)}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {listing.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {timeAgo(listing.created_at)}
                    </span>
                  </div>
                </div>

                {user?.id !== listing.user_id && (
                  <div className="space-y-3">
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => {
                        if (!user) {
                          navigate('/auth');
                          return;
                        }
                        setShowBidModal(true);
                      }}
                    >
                      <Gavel className="h-4 w-4 mr-2" />
                      Lägg bud
                    </Button>
                    <Button 
                      className="w-full" 
                      size="lg"
                      variant="outline"
                      onClick={handleContact}
                      disabled={contactLoading}
                    >
                      {contactLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      Kontakta säljare
                    </Button>
                  </div>
                )}

                {/* Seller Info */}
                <div className="border-t pt-6">
                  {listing.external_seller_id ? (
                    // External seller - show platform-verified label
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          GM
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">Verifierad privatperson</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Säljs via GolfMarket
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Regular seller
                    <>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {listing.profiles?.full_name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{listing.profiles?.full_name || 'Säljare'}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {sellerType && <span>{sellerType.label}</span>}
                            {listing.profiles?.is_verified && (
                              <Badge variant="outline" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Verifierad
                              </Badge>
                            )}
                          </div>
                        </div>
                        {user && user.id !== listing.user_id && (
                          <UserActionsMenu 
                            userId={listing.user_id} 
                            userName={listing.profiles?.full_name || undefined}
                          />
                        )}
                      </div>

                      {listing.profiles && (
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                          <span>{listing.profiles.completed_deals || 0} genomförda affärer</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Report listing */}
                {user && user.id !== listing.user_id && (
                  <div className="border-t pt-4">
                    <ReportModal
                      type="listing"
                      targetId={listing.id}
                      targetName={`${listing.brand} ${listing.model}`}
                      trigger={
                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                          <Flag className="h-4 w-4 mr-2" />
                          Rapportera annons
                        </Button>
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bids section - visible to seller */}
            {user?.id === listing.user_id && (
              <ListingBids listingId={listing.id} isSeller={true} />
            )}
          </div>
        </div>
      </div>

      {/* Bid Modal */}
      {user && listing && (
        <PlaceBidModal
          isOpen={showBidModal}
          onClose={() => setShowBidModal(false)}
          listingId={listing.id}
          listingTitle={`${listing.brand} ${listing.model}`}
          askingPrice={listing.price}
          userId={user.id}
        />
      )}
    </Layout>
  );
}