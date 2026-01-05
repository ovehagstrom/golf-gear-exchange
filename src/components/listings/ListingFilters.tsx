import { useState } from 'react';
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

export function ListingFilters({ filters, onFiltersChange }: ListingFiltersProps) {
  const [priceRange, setPriceRange] = useState([filters.minPrice, filters.maxPrice]);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Alla kategorier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alla kategorier</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brand */}
      <div className="space-y-2">
        <Label>Märke</Label>
        <Select value={filters.brand} onValueChange={(v) => updateFilter('brand', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Alla märken" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alla märken</SelectItem>
            {POPULAR_BRANDS.map((brand) => (
              <SelectItem key={brand} value={brand}>{brand}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Shaft Flex */}
      <div className="space-y-2">
        <Label>Shaft Flex</Label>
        <Select value={filters.shaftFlex} onValueChange={(v) => updateFilter('shaftFlex', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Alla flex" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alla flex</SelectItem>
            {SHAFT_FLEX.map((flex) => (
              <SelectItem key={flex.value} value={flex.value}>{flex.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Condition */}
      <div className="space-y-2">
        <Label>Skick</Label>
        <Select value={filters.condition} onValueChange={(v) => updateFilter('condition', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Alla skick" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alla skick</SelectItem>
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
          onValueChange={setPriceRange}
          onValueCommit={(values) => {
            updateFilter('minPrice', values[0]);
            updateFilter('maxPrice', values[1]);
          }}
          max={100000}
          step={500}
          className="w-full"
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={priceRange[0]}
            onChange={(e) => {
              const val = Number(e.target.value);
              setPriceRange([val, priceRange[1]]);
              updateFilter('minPrice', val);
            }}
            className="w-full"
            placeholder="Min"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            value={priceRange[1]}
            onChange={(e) => {
              const val = Number(e.target.value);
              setPriceRange([priceRange[0], val]);
              updateFilter('maxPrice', val);
            }}
            className="w-full"
            placeholder="Max"
          />
        </div>
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label>Ort</Label>
        <Select value={filters.city} onValueChange={(v) => updateFilter('city', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Hela Sverige" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Hela Sverige</SelectItem>
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