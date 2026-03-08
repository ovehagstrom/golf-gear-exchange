import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES } from '@/lib/constants';
import { ExternalListing } from '@/components/listings/ExternalListingCard';
import {
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  Store,
} from 'lucide-react';

const SOURCE_LABELS: Record<string, string> = {
  blocket: 'Blocket',
  tradera: 'Tradera',
  facebook: 'Facebook Marketplace',
  golfbidder: 'Golfbidder',
  scandigolf: 'ScandiGolf',
  golfbutik: 'Golfbutik',
  dormy: 'Dormy',
};

export default function ExternalListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState<ExternalListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (id) fetchListing();
  }, [id]);

  const fetchListing = async () => {
    const { data, error } = await supabase
      .from('external_listings')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (!error && data) {
      setListing(data as ExternalListing);
    }
    setLoading(false);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(price);

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
      if (count >= 1) return `${count} ${interval.label} sedan`;
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

  const specs = listing.specs_json || {};
  const images = listing.image_urls || [];
  const category = CATEGORIES.find((c) => c.value === listing.category);
  const sourceLabel = SOURCE_LABELS[listing.source] || listing.source;

  return (
    <Layout>
      <div className="container py-6">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link
            to="/listings"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Tillbaka till annonser
          </Link>
        </nav>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Image Gallery */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />

                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((i) =>
                            i > 0 ? i - 1 : images.length - 1
                          )
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((i) =>
                            i < images.length - 1 ? i + 1 : 0
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImageIndex(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              i === currentImageIndex
                                ? 'bg-primary'
                                : 'bg-background/60'
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
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === currentImageIndex
                        ? 'border-primary'
                        : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Title & Basic Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                {category && <Badge variant="secondary">{category.label}</Badge>}
                <Badge variant="outline" className="text-xs">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {sourceLabel}
                </Badge>
              </div>
              {specs.brand && (
                <p className="text-xs font-medium text-primary uppercase tracking-wide">
                  {specs.brand}
                </p>
              )}
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                {listing.title}
              </h1>
            </div>

            {/* Description */}
            {listing.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Beskrivning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {listing.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Specifications */}
            {Object.keys(specs).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Specifikationer</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4">
                    {specs.brand && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Märke</dt>
                        <dd className="font-medium">{specs.brand}</dd>
                      </div>
                    )}
                    {specs.model && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Modell</dt>
                        <dd className="font-medium">{specs.model}</dd>
                      </div>
                    )}
                    {specs.loft && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Loft</dt>
                        <dd className="font-medium">{specs.loft}°</dd>
                      </div>
                    )}
                    {specs.flex && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Flex</dt>
                        <dd className="font-medium">{specs.flex}</dd>
                      </div>
                    )}
                    {specs.shaft_model && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Shaft</dt>
                        <dd className="font-medium">{specs.shaft_model}</dd>
                      </div>
                    )}
                    {specs.hand && (
                      <div>
                        <dt className="text-sm text-muted-foreground">Hand</dt>
                        <dd className="font-medium">{specs.hand}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-6">
                {/* Price */}
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {listing.price ? formatPrice(listing.price) : 'Pris saknas'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {listing.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {listing.city}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {timeAgo(listing.published_at || listing.created_at)}
                    </span>
                  </div>
                </div>

                {/* CTA — link to original */}
                <Button className="w-full" size="lg" asChild>
                  <a
                    href={listing.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visa på {sourceLabel}
                  </a>
                </Button>

                {/* Source info */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                      <Store className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Extern annons</p>
                      <p className="text-sm text-muted-foreground">
                        Källa: {sourceLabel}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Denna annons hämtas automatiskt från {sourceLabel}. Klicka på
                    knappen ovan för att se originalannonsen och kontakta säljaren.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
