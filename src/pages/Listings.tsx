import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ListingCard } from '@/components/listings/ListingCard';
import { ExternalListingCard, ExternalListing } from '@/components/listings/ExternalListingCard';
import { ListingFilters, FilterState } from '@/components/listings/ListingFilters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';

type ListingWithProfile = Tables<'listings'> & {
  profiles: Tables<'profiles'> | null;
};

type CombinedListing = 
  | { type: 'internal'; data: ListingWithProfile }
  | { type: 'external'; data: ExternalListing };

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [internalListings, setInternalListings] = useState<ListingWithProfile[]>([]);
  const [externalListings, setExternalListings] = useState<ExternalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [sourceFilter, setSourceFilter] = useState(searchParams.get('source') || 'all');

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

  // Sync filters when URL params change
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
    setSourceFilter(searchParams.get('source') || 'all');
  }, [searchParams.toString()]);

  useEffect(() => {
    fetchListings();
  }, [filters, sortBy, sourceFilter]);

  const fetchListings = async () => {
    setLoading(true);

    const promises: Promise<void>[] = [];

    // Fetch internal listings
    if (sourceFilter === 'all' || sourceFilter === 'golfmarket') {
      const fetchInternal = async () => {
        let query = supabase
          .from('listings')
          .select('*, profiles(*)')
          .eq('status', 'active');

        if (filters.category) query = query.eq('category', filters.category);
        if (filters.brand) query = query.ilike('brand', `%${filters.brand}%`);
        if (filters.shaftFlex) query = query.eq('shaft_flex', filters.shaftFlex);
        if (filters.condition) query = query.eq('condition', Number(filters.condition));
        if (filters.city) query = query.ilike('city', `%${filters.city}%`);
        if (filters.minPrice > 0) query = query.gte('price', filters.minPrice);
        if (filters.maxPrice < 100000) query = query.lte('price', filters.maxPrice);
        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%`);
        }

        switch (sortBy) {
          case 'price_asc': query = query.order('price', { ascending: true }); break;
          case 'price_desc': query = query.order('price', { ascending: false }); break;
          default: query = query.order('created_at', { ascending: false });
        }

        const { data } = await query;
        setInternalListings(data || []);
      };
      promises.push(fetchInternal());
    } else {
      setInternalListings([]);
    }

    // Fetch external listings
    if (sourceFilter === 'all' || sourceFilter !== 'golfmarket') {
      const fetchExternal = async () => {
        let query = supabase
          .from('external_listings')
          .select('*')
          .eq('is_active', true);

        if (filters.category) query = query.eq('category', filters.category);
        if (filters.city) query = query.ilike('city', `%${filters.city}%`);
        if (filters.minPrice > 0) query = query.gte('price', filters.minPrice);
        if (filters.maxPrice < 100000) query = query.lte('price', filters.maxPrice);
        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        switch (sortBy) {
          case 'price_asc': query = query.order('price', { ascending: true }); break;
          case 'price_desc': query = query.order('price', { ascending: false }); break;
          default: query = query.order('created_at', { ascending: false });
        }

        const { data } = await query;
        setExternalListings((data as ExternalListing[]) || []);
      };
      promises.push(fetchExternal());
    } else {
      setExternalListings([]);
    }

    await Promise.all(promises);
    setLoading(false);
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.brand) params.set('brand', newFilters.brand);
    if (newFilters.shaftFlex) params.set('flex', newFilters.shaftFlex);
    if (newFilters.condition) params.set('condition', newFilters.condition);
    if (newFilters.city) params.set('city', newFilters.city);
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.minPrice > 0) params.set('minPrice', newFilters.minPrice.toString());
    if (newFilters.maxPrice < 100000) params.set('maxPrice', newFilters.maxPrice.toString());
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    
    setSearchParams(params);
  };

  const handleSourceChange = (value: string) => {
    setSourceFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('source');
    } else {
      params.set('source', value);
    }
    setSearchParams(params);
  };

  // Combine and interleave listings
  const combinedListings: CombinedListing[] = [
    ...internalListings.map(l => ({ type: 'internal' as const, data: l })),
    ...externalListings.map(l => ({ type: 'external' as const, data: l })),
  ];

  // Sort combined by date if needed
  if (sortBy === 'newest') {
    combinedListings.sort((a, b) => {
      const dateA = new Date(a.type === 'internal' ? a.data.created_at! : a.data.created_at).getTime();
      const dateB = new Date(b.type === 'internal' ? b.data.created_at! : b.data.created_at).getTime();
      return dateB - dateA;
    });
  } else if (sortBy === 'price_asc') {
    combinedListings.sort((a, b) => {
      const priceA = a.type === 'internal' ? a.data.price : (a.data.price || 0);
      const priceB = b.type === 'internal' ? b.data.price : (b.data.price || 0);
      return priceA - priceB;
    });
  } else if (sortBy === 'price_desc') {
    combinedListings.sort((a, b) => {
      const priceA = a.type === 'internal' ? a.data.price : (a.data.price || 0);
      const priceB = b.type === 'internal' ? b.data.price : (b.data.price || 0);
      return priceB - priceA;
    });
  }

  const totalCount = combinedListings.length;

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Alla annonser</h1>
          <p className="text-muted-foreground mt-2">
            Hitta rätt golfutrustning bland {totalCount} annonser från alla källor
          </p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Filters Sidebar */}
          <aside className="space-y-6">
            <ListingFilters filters={filters} onFiltersChange={handleFiltersChange} />
            
            {/* Source filter */}
            <div className="hidden lg:block space-y-2">
              <label className="text-sm font-medium">Källa</label>
              <Select value={sourceFilter} onValueChange={handleSourceChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla källor</SelectItem>
                  <SelectItem value="golfmarket">GolfMarket</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </aside>

          {/* Listings Grid */}
          <div>
            {/* Sort & Results */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {totalCount} annonser
                </p>
                {/* Mobile source tabs */}
                <div className="lg:hidden">
                  <Tabs value={sourceFilter} onValueChange={handleSourceChange}>
                    <TabsList className="h-8">
                      <TabsTrigger value="all" className="text-xs px-2 h-7">Alla</TabsTrigger>
                      <TabsTrigger value="golfmarket" className="text-xs px-2 h-7">GolfMarket</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
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
            ) : totalCount === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-4">⛳</p>
                <h3 className="text-lg font-semibold mb-2">Inga annonser hittades</h3>
                <p className="text-muted-foreground">
                  Försök med andra filterinställningar
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {combinedListings.map((item) => 
                  item.type === 'internal' ? (
                    <ListingCard key={`int-${item.data.id}`} listing={item.data} />
                  ) : (
                    <ExternalListingCard key={`ext-${item.data.id}`} listing={item.data} />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
