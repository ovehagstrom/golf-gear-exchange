import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES, SHAFT_FLEX, CONDITIONS, POPULAR_BRANDS, SWEDISH_CITIES } from '@/lib/constants';
import { Loader2, Plus, Upload, X, Eye, EyeOff, UserPlus, CheckCircle2, Package, Ban } from 'lucide-react';

type ExternalListing = {
  id: string;
  brand: string;
  model: string;
  price: number;
  city: string;
  status: string | null;
  created_at: string | null;
  images: string[] | null;
  external_seller_id: string | null;
  category: string;
  external_seller?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    city: string;
  } | null;
};

export function ExternalSellerListings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<ExternalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showContact, setShowContact] = useState<string | null>(null);

  const [sellerData, setSellerData] = useState({
    name: '', email: '', phone: '', city: '',
  });

  const [formData, setFormData] = useState({
    category: '', brand: '', model: '', year: '',
    shaftModel: '', shaftFlex: '', shaftLength: '',
    loft: '', bounce: '', lieAngle: '', grip: '',
    condition: '', price: '', city: '', description: '',
  });

  useEffect(() => { fetchListings(); }, []);

  const fetchListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('id, brand, model, price, city, status, created_at, images, external_seller_id, category')
      .not('external_seller_id', 'is', null)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      // Fetch external seller details for each
      const sellerIds = [...new Set(data.map(l => l.external_seller_id).filter(Boolean))];
      const { data: sellers } = await supabase
        .from('external_sellers')
        .select('id, name, email, phone, city')
        .in('id', sellerIds as string[]);

      const sellerMap = new Map(sellers?.map(s => [s.id, s]));
      const enriched = data.map(l => ({
        ...l,
        external_seller: l.external_seller_id ? sellerMap.get(l.external_seller_id) || null : null,
      }));
      setListings(enriched);
    } else {
      setListings([]);
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    const newImages: string[] = [];
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `admin-external/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const { error } = await supabase.storage.from('listing-images').upload(fileName, file);
      if (error) { continue; }
      const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(fileName);
      newImages.push(publicUrl);
    }
    setImages(prev => [...prev, ...newImages]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!sellerData.name || !sellerData.city) {
      toast({ variant: 'destructive', title: 'Fyll i säljarens namn och stad' });
      return;
    }
    if (!formData.category || !formData.brand || !formData.model || !formData.condition || !formData.price || !formData.city) {
      toast({ variant: 'destructive', title: 'Fyll i alla obligatoriska fält' });
      return;
    }

    setCreating(true);

    // 1. Create external seller
    const { data: seller, error: sellerError } = await supabase
      .from('external_sellers')
      .insert({
        name: sellerData.name,
        email: sellerData.email || null,
        phone: sellerData.phone || null,
        city: sellerData.city,
        created_by: user.id,
      })
      .select()
      .single();

    if (sellerError || !seller) {
      toast({ variant: 'destructive', title: 'Kunde inte skapa säljare', description: sellerError?.message });
      setCreating(false);
      return;
    }

    // 2. Create listing linked to external seller
    const { error: listingError } = await supabase
      .from('listings')
      .insert({
        user_id: user.id,
        external_seller_id: seller.id,
        title: `${formData.brand} ${formData.model}`,
        category: formData.category,
        brand: formData.brand,
        model: formData.model,
        year: formData.year ? Number(formData.year) : null,
        shaft_model: formData.shaftModel || null,
        shaft_flex: formData.shaftFlex || null,
        shaft_length: formData.shaftLength || null,
        loft: formData.loft || null,
        bounce: formData.bounce || null,
        lie_angle: formData.lieAngle || null,
        grip: formData.grip || null,
        description: formData.description || null,
        condition: Number(formData.condition),
        price: Number(formData.price),
        city: formData.city,
        images,
      });

    if (listingError) {
      toast({ variant: 'destructive', title: 'Kunde inte skapa annons', description: listingError.message });
    } else {
      toast({ title: 'Annons skapad för extern säljare!' });
      setDialogOpen(false);
      resetForm();
      fetchListings();
    }
    setCreating(false);
  };

  const resetForm = () => {
    setSellerData({ name: '', email: '', phone: '', city: '' });
    setFormData({ category: '', brand: '', model: '', year: '', shaftModel: '', shaftFlex: '', shaftLength: '', loft: '', bounce: '', lieAngle: '', grip: '', condition: '', price: '', city: '', description: '' });
    setImages([]);
  };

  const updateListingStatus = async (listingId: string, status: string) => {
    setActionLoading(listingId);
    const { error } = await supabase
      .from('listings')
      .update({ status })
      .eq('id', listingId);

    if (error) {
      toast({ variant: 'destructive', title: 'Kunde inte uppdatera status' });
    } else {
      toast({ title: `Annons markerad som ${status === 'sold' ? 'såld' : status === 'reserved' ? 'reserverad' : 'avbruten'}` });
      fetchListings();
    }
    setActionLoading(null);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(price);

  const statusLabel = (status: string | null) => {
    switch (status) {
      case 'sold': return <Badge className="bg-muted text-muted-foreground">Såld</Badge>;
      case 'reserved': return <Badge className="bg-warning/10 text-warning border-warning/20">Reserverad</Badge>;
      case 'cancelled': return <Badge variant="destructive">Avbruten</Badge>;
      default: return <Badge className="bg-primary/10 text-primary">Aktiv</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Annonser skapade åt externa privatpersoner</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Ny extern annons
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Skapa annons åt privatperson
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Seller info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Säljaruppgifter (internt)</CardTitle>
                  <CardDescription className="text-xs">Visas ej publikt</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Namn *</Label>
                      <Input value={sellerData.name} onChange={e => setSellerData(p => ({ ...p, name: e.target.value }))} placeholder="Fullständigt namn" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">E-post</Label>
                      <Input type="email" value={sellerData.email} onChange={e => setSellerData(p => ({ ...p, email: e.target.value }))} placeholder="email@exempel.se" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefon</Label>
                      <Input value={sellerData.phone} onChange={e => setSellerData(p => ({ ...p, phone: e.target.value }))} placeholder="07X-XXX XX XX" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stad *</Label>
                      <Select value={sellerData.city || undefined} onValueChange={v => setSellerData(p => ({ ...p, city: v }))}>
                        <SelectTrigger><SelectValue placeholder="Välj stad" /></SelectTrigger>
                        <SelectContent>
                          {SWEDISH_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Listing info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Annonsuppgifter</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Kategori *</Label>
                      <Select value={formData.category || undefined} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                        <SelectTrigger><SelectValue placeholder="Välj kategori" /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Märke *</Label>
                      <Select value={formData.brand || undefined} onValueChange={v => setFormData(p => ({ ...p, brand: v }))}>
                        <SelectTrigger><SelectValue placeholder="Välj märke" /></SelectTrigger>
                        <SelectContent>{POPULAR_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Modell *</Label>
                      <Input value={formData.model} onChange={e => setFormData(p => ({ ...p, model: e.target.value }))} placeholder="t.ex. Stealth 2 Plus" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Årsmodell</Label>
                      <Input type="number" value={formData.year} onChange={e => setFormData(p => ({ ...p, year: e.target.value }))} placeholder="2023" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Skick *</Label>
                      <Select value={formData.condition || undefined} onValueChange={v => setFormData(p => ({ ...p, condition: v }))}>
                        <SelectTrigger><SelectValue placeholder="Välj skick" /></SelectTrigger>
                        <SelectContent>{CONDITIONS.map(c => <SelectItem key={c.value} value={c.value.toString()}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pris (kr) *</Label>
                      <Input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} placeholder="3500" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stad *</Label>
                      <Select value={formData.city || undefined} onValueChange={v => setFormData(p => ({ ...p, city: v }))}>
                        <SelectTrigger><SelectValue placeholder="Välj stad" /></SelectTrigger>
                        <SelectContent>{SWEDISH_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Shaft-modell</Label>
                      <Input value={formData.shaftModel} onChange={e => setFormData(p => ({ ...p, shaftModel: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Flex</Label>
                      <Select value={formData.shaftFlex || undefined} onValueChange={v => setFormData(p => ({ ...p, shaftFlex: v }))}>
                        <SelectTrigger><SelectValue placeholder="Välj flex" /></SelectTrigger>
                        <SelectContent>{SHAFT_FLEX.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Loft</Label>
                      <Input value={formData.loft} onChange={e => setFormData(p => ({ ...p, loft: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Grepp</Label>
                      <Input value={formData.grip} onChange={e => setFormData(p => ({ ...p, grip: e.target.value }))} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Övrig information</Label>
                    <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} />
                  </div>
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Bilder</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {images.map((url, i) => (
                      <div key={url} className="relative w-20 h-20 rounded overflow-hidden bg-muted">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setImages(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary/50">
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSubmit} disabled={creating} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Publicera annons
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Inga externa annonser ännu</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map(listing => (
            <Card key={listing.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3 flex-1 min-w-0">
                    {listing.images && listing.images[0] && (
                      <img src={listing.images[0]} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {statusLabel(listing.status)}
                        <span className="text-xs text-muted-foreground">
                          {CATEGORIES.find(c => c.value === listing.category)?.label}
                        </span>
                      </div>
                      <p className="font-medium truncate">{listing.brand} {listing.model}</p>
                      <p className="text-sm font-bold">{formatPrice(listing.price)}</p>

                      {/* External seller contact toggle */}
                      {listing.external_seller && (
                        <div className="mt-2">
                          <button
                            onClick={() => setShowContact(showContact === listing.id ? null : listing.id)}
                            className="text-xs text-primary flex items-center gap-1 hover:underline"
                          >
                            {showContact === listing.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            {showContact === listing.id ? 'Dölj kontakt' : 'Visa säljarinfo'}
                          </button>
                          {showContact === listing.id && (
                            <div className="mt-1 p-2 bg-muted rounded text-xs space-y-0.5">
                              <p><strong>Namn:</strong> {listing.external_seller.name}</p>
                              {listing.external_seller.email && <p><strong>E-post:</strong> {listing.external_seller.email}</p>}
                              {listing.external_seller.phone && <p><strong>Telefon:</strong> {listing.external_seller.phone}</p>}
                              <p><strong>Stad:</strong> {listing.external_seller.city}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {listing.status === 'active' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateListingStatus(listing.id, 'reserved')} disabled={actionLoading === listing.id}>
                          <Package className="h-3 w-3 mr-1" />Reservera
                        </Button>
                        <Button size="sm" onClick={() => updateListingStatus(listing.id, 'sold')} disabled={actionLoading === listing.id}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Såld
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateListingStatus(listing.id, 'cancelled')} disabled={actionLoading === listing.id}>
                          <Ban className="h-3 w-3 mr-1" />Avbryt
                        </Button>
                      </>
                    )}
                    {listing.status === 'reserved' && (
                      <>
                        <Button size="sm" onClick={() => updateListingStatus(listing.id, 'sold')} disabled={actionLoading === listing.id}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Såld
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateListingStatus(listing.id, 'active')} disabled={actionLoading === listing.id}>
                          Aktivera igen
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
