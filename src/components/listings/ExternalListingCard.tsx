import { MapPin, Clock, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExternalListing {
  id: string;
  source: string;
  source_id: string;
  title: string;
  price: number | null;
  city: string | null;
  source_url: string;
  image_urls: string[] | null;
  description: string | null;
  published_at: string | null;
  specs_json: Record<string, string> | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

interface ExternalListingCardProps {
  listing: ExternalListing;
}

const SOURCE_LABELS: Record<string, string> = {
  blocket: 'Blocket',
  tradera: 'Tradera',
  facebook: 'Facebook Marketplace',
};

export function ExternalListingCard({ listing }: ExternalListingCardProps) {
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

  const sourceLabel = SOURCE_LABELS[listing.source] || listing.source;
  const specs = listing.specs_json || {};

  return (
    <a
      href={listing.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <article className="golf-card-premium overflow-hidden relative">
        {/* External source badge */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-accent/90 text-accent-foreground text-xs font-medium py-1 px-3 flex items-center gap-1.5">
          <ExternalLink className="h-3 w-3" />
          Extern annons – Källa: {sourceLabel}
        </div>

        {/* Image */}
        <div className="aspect-[4/3] relative overflow-hidden bg-muted pt-6">
          {listing.image_urls && listing.image_urls.length > 0 ? (
            <img
              src={listing.image_urls[0]}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-4xl">⛳</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Brand & Title */}
          <div>
            {specs.brand && (
              <p className="text-xs font-medium text-primary uppercase tracking-wide">
                {specs.brand}
              </p>
            )}
            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {listing.title}
            </h3>
          </div>

          {/* Extracted specs */}
          <div className="flex flex-wrap gap-1.5">
            {specs.model && (
              <Badge variant="outline" className="text-xs font-normal">
                {specs.model}
              </Badge>
            )}
            {specs.flex && (
              <Badge variant="outline" className="text-xs font-normal">
                {specs.flex}
              </Badge>
            )}
            {specs.loft && (
              <Badge variant="outline" className="text-xs font-normal">
                {specs.loft}°
              </Badge>
            )}
            {specs.hand && (
              <Badge variant="outline" className="text-xs font-normal">
                {specs.hand === 'vänster' ? '🫲 Vänster' : '🫱 Höger'}
              </Badge>
            )}
          </div>

          {/* Price & Location */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-lg font-bold text-foreground">
              {listing.price ? formatPrice(listing.price) : 'Pris saknas'}
            </span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {listing.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {listing.city}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(listing.published_at || listing.created_at)}
              </span>
            </div>
          </div>
        </div>
      </article>
    </a>
  );
}

export type { ExternalListing };
