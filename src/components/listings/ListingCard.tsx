import { Link } from 'react-router-dom';
import { MapPin, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES, CONDITIONS, SHAFT_FLEX } from '@/lib/constants';
import { Tables } from '@/integrations/supabase/types';

interface ListingCardProps {
  listing: Tables<'listings'> & {
    profiles?: Tables<'profiles'> | null;
  };
}

export function ListingCard({ listing }: ListingCardProps) {
  const category = CATEGORIES.find(c => c.value === listing.category);
  const condition = CONDITIONS.find(c => c.value === listing.condition);
  const shaftFlex = SHAFT_FLEX.find(f => f.value === listing.shaft_flex);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = () => {
    switch (listing.status) {
      case 'reserved':
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Reserverad</Badge>;
      case 'sold':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Såld</Badge>;
      default:
        return null;
    }
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

  return (
    <Link to={`/listings/${listing.id}`} className="block group">
      <article className="golf-card-premium overflow-hidden">
        {/* Image */}
        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
          {listing.images && listing.images.length > 0 ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-4xl">⛳</span>
            </div>
          )}
          
          {/* Status badge */}
          <div className="absolute top-3 left-3 flex gap-2">
            {getStatusBadge()}
          </div>

          {/* Category badge */}
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
              {category?.label}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Brand & Model */}
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-wide">
              {listing.brand}
            </p>
            <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {listing.model}
            </h3>
            {listing.year && (
              <p className="text-sm text-muted-foreground">{listing.year}</p>
            )}
          </div>

          {/* Specs */}
          <div className="flex flex-wrap gap-1.5">
            {shaftFlex && (
              <Badge variant="outline" className="text-xs font-normal">
                {shaftFlex.label}
              </Badge>
            )}
            {listing.shaft_length && (
              <Badge variant="outline" className="text-xs font-normal">
                {listing.shaft_length}
              </Badge>
            )}
            {condition && (
              <Badge variant="outline" className="text-xs font-normal">
                <span className={`condition-dot condition-${listing.condition} mr-1.5`} />
                {condition.label}
              </Badge>
            )}
          </div>

          {/* Price & Location */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-lg font-bold text-foreground">
              {formatPrice(listing.price)}
            </span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {listing.city}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(listing.created_at)}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}