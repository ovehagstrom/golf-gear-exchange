import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CATEGORIES, SHAFT_FLEX, CONDITIONS, POPULAR_BRANDS, SWEDISH_CITIES } from '@/lib/constants';
import { Filter, X, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface FilterState {
  category: string;
  brand: string;
  shaftFlex: string;
  minPrice: number;
  maxPrice: number;
  condition: string;
  city: string;
  search: string;
}

interface ListingFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function ListingFilters({ filters, onFiltersChange }: ListingFiltersProps) {
  const [priceRange, setPriceRange] = useState([filters.minPrice, filters.maxPrice]);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Local state for price inputs to allow typing without losing focus
  const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice.toString());
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice.toString());
  
  // Debounce the local price values
  const debouncedMinPrice = useDebounce(localMinPrice, 400);
  const debouncedMaxPrice = useDebounce(localMaxPrice, 400);

  // Update filters when debounced values change
  useEffect(() => {
    const minVal = Number(debouncedMinPrice) || 0;
    const maxVal = Number(debouncedMaxPrice) || 100000;
    
    if (minVal !== filters.minPrice || maxVal !== filters.maxPrice) {
      setPriceRange([minVal, maxVal]);
      onFiltersChange({ 
        ...filters, 
        minPrice: minVal, 
        maxPrice: maxVal 
      });
    }
  }, [debouncedMinPrice, debouncedMaxPrice]);

  // Sync local state when filters change externally (e.g., clear filters)
  useEffect(() => {
    setLocalMinPrice(filters.minPrice.toString());
    setLocalMaxPrice(filters.maxPrice.toString());
    setPriceRange([filters.minPrice, filters.maxPrice]);
  }, [filters.minPrice, filters.maxPrice]);

  const updateFilter = (key: keyof FilterState, value: string | number) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      category: '',
      brand: '',
      shaftFlex: '',
      minPrice: 0,
      maxPrice: 100000,
      condition: '',
      city: '',
      search: '',
    });
    setLocalMinPrice('0');
    setLocalMaxPrice('100000');
    setPriceRange([0, 100000]);
  };

  const activeFilterCount = [
    filters.category,
    filters.brand,
    filters.shaftFlex,
    filters.condition,
    filters.city,
    filters.minPrice > 0 ? 'price' : '',
    filters.maxPrice < 100000 ? 'price' : '',
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Category */}
      <div className="space-y-2">
        <Label>Kategori</Label>
        <Select value={filters.category || "all"} onValueChange={(v) => updateFilter('category', v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Alla kategorier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla kategorier</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brand */}
      <div className="space-y-2">
        <Label>Märke</Label>
        <Select value={filters.brand || "all"} onValueChange={(v) => updateFilter('brand', v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Alla märken" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla märken</SelectItem>
            {POPULAR_BRANDS.map((brand) => (
              <SelectItem key={brand} value={brand}>{brand}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Shaft Flex */}
      <div className="space-y-2">
        <Label>Shaft Flex</Label>
        <Select value={filters.shaftFlex || "all"} onValueChange={(v) => updateFilter('shaftFlex', v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Alla flex" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla flex</SelectItem>
            {SHAFT_FLEX.map((flex) => (
              <SelectItem key={flex.value} value={flex.value}>{flex.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Condition */}
      <div className="space-y-2">
        <Label>Skick</Label>
        <Select value={filters.condition || "all"} onValueChange={(v) => updateFilter('condition', v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Alla skick" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla skick</SelectItem>
            {CONDITIONS.map((cond) => (
              <SelectItem key={cond.value} value={cond.value.toString()}>
                <span className="flex items-center gap-2">
                  <span className={`condition-dot condition-${cond.value}`} />
                  {cond.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-4">
        <Label>Pris (kr)</Label>
        <Slider
          value={priceRange}
          onValueChange={(values) => {
            setPriceRange(values);
            setLocalMinPrice(values[0].toString());
            setLocalMaxPrice(values[1].toString());
          }}
          onValueCommit={(values) => {
            onFiltersChange({ 
              ...filters, 
              minPrice: values[0], 
              maxPrice: values[1] 
            });
          }}
          max={100000}
          step={500}
          className="w-full"
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={localMinPrice}
            onChange={(e) => setLocalMinPrice(e.target.value)}
            className="w-full"
            placeholder="Min"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            value={localMaxPrice}
            onChange={(e) => setLocalMaxPrice(e.target.value)}
            className="w-full"
            placeholder="Max"
          />
        </div>
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label>Ort</Label>
        <Select value={filters.city || "all"} onValueChange={(v) => updateFilter('city', v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Hela Sverige" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hela Sverige</SelectItem>
            {SWEDISH_CITIES.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Rensa filter ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Sök på märke, modell eller titel..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <FilterContent />
      </div>

      {/* Mobile Filter Button & Sheet */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {activeFilterCount > 0 && (
                <Badge className="ml-2" variant="secondary">{activeFilterCount}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}