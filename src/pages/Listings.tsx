import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ListingCard } from '@/components/listings/ListingCard';
import { ListingFilters, FilterState } from '@/components/listings/ListingFilters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';

type ListingWithProfile = Tables<'listings'> & {
  profiles: Tables<'profiles'> | null;
};

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<ListingWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  const [filters, setFilters] = useState<FilterState>({
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    shaftFlex: searchParams.get('flex') || '',
    minPrice: Number(searchParams.get('minPrice')) || 0,
    maxPrice: Number(searchParams.get('maxPrice')) || 100000,
    condition: searchParams.get('condition') || '',
    city: searchParams.get('city') || '',
    search: searchParams.get('search') || '',
  });

  // Sync filters when URL params change (e.g. clicking category links in header)
  useEffect(() => {
    setFilters({
      category: searchParams.get('category') || '',
      brand: searchParams.get('brand') || '',
      shaftFlex: searchParams.get('flex') || '',
      minPrice: Number(searchParams.get('minPrice')) || 0,
      maxPrice: Number(searchParams.get('maxPrice')) || 100000,
      condition: searchParams.get('condition') || '',
      city: searchParams.get('city') || '',
      search: searchParams.get('search') || '',
    });
  }, [searchParams.toString()]);

  useEffect(() => {
    fetchListings();
  }, [filters, sortBy]);

  const fetchListings = async () => {
    setLoading(true);
    
    let query = supabase
      .from('listings')
      .select('*, profiles(*)')
      .eq('status', 'active');

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.brand) {
      query = query.ilike('brand', `%${filters.brand}%`);
    }
    if (filters.shaftFlex) {
      query = query.eq('shaft_flex', filters.shaftFlex);
    }
    if (filters.condition) {
      query = query.eq('condition', Number(filters.condition));
    }
    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }
    if (filters.minPrice > 0) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters.maxPrice < 100000) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%`);
    }

    // Apply sorting
    switch (sortBy) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching listings:', error);
    } else {
      setListings(data || []);
    }
    
    setLoading(false);
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.brand) params.set('brand', newFilters.brand);
    if (newFilters.shaftFlex) params.set('flex', newFilters.shaftFlex);
    if (newFilters.condition) params.set('condition', newFilters.condition);
    if (newFilters.city) params.set('city', newFilters.city);
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.minPrice > 0) params.set('minPrice', newFilters.minPrice.toString());
    if (newFilters.maxPrice < 100000) params.set('maxPrice', newFilters.maxPrice.toString());
    
    setSearchParams(params);
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Alla annonser</h1>
          <p className="text-muted-foreground mt-2">
            Hitta rätt golfutrustning bland våra {listings.length} aktiva annonser
          </p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Filters Sidebar */}
          <aside className="space-y-6">
            <ListingFilters filters={filters} onFiltersChange={handleFiltersChange} />
          </aside>

          {/* Listings Grid */}
          <div>
            {/* Sort & Results */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                {listings.length} annonser
              </p>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sortera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Senaste först</SelectItem>
                  <SelectItem value="price_asc">Pris: Lågt till högt</SelectItem>
                  <SelectItem value="price_desc">Pris: Högt till lågt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-4">⛳</p>
                <h3 className="text-lg font-semibold mb-2">Inga annonser hittades</h3>
                <p className="text-muted-foreground">
                  Försök med andra filterinställningar
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}