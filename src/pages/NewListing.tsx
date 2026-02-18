import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES, SHAFT_FLEX, CONDITIONS, POPULAR_BRANDS, SWEDISH_CITIES } from '@/lib/constants';
import { Loader2, Upload, X, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function NewListing() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [stripeOnboarded, setStripeOnboarded] = useState<boolean | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    brand: '',
    model: '',
    year: '',
    shaftModel: '',
    shaftFlex: '',
    shaftLength: '',
    loft: '',
    bounce: '',
    lieAngle: '',
    grip: '',
    condition: '',
    price: '',
    city: '',
    description: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      // Check Stripe onboarding status
      supabase
        .from('profiles')
        .select('stripe_connect_account_id, stripe_connect_onboarding_complete')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setStripeOnboarded(
            !!(data?.stripe_connect_account_id && data?.stripe_connect_onboarding_complete)
          );
        });
    }
  }, [user, authLoading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          variant: 'destructive',
          title: 'Uppladdning misslyckades',
          description: 'Kunde inte ladda upp bilden.',
        });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      newImages.push(publicUrl);
    }

    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const isSpecVerified = formData.shaftModel && formData.shaftFlex && formData.shaftLength && formData.grip && formData.loft && images.length >= 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Inte inloggad',
        description: 'Du måste vara inloggad för att skapa en annons.',
      });
      return;
    }

    if (images.length < 3) {
      toast({
        variant: 'destructive',
        title: 'För få bilder',
        description: 'Lägg till minst 3 bilder för din annons.',
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('listings')
      .insert({
        user_id: user.id,
        title: formData.title || `${formData.brand} ${formData.model}`,
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
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating listing:', error);
      toast({
        variant: 'destructive',
        title: 'Kunde inte skapa annons',
        description: error.message,
      });
    } else {
      toast({
        title: 'Annons skapad!',
        description: 'Din annons är nu publicerad.',
      });
      navigate(`/listings/${data.id}`);
    }

    setLoading(false);
  };

  if (authLoading || stripeOnboarded === null) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!stripeOnboarded) {
    return (
      <Layout>
        <div className="container max-w-3xl py-8">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Slutför utbetalningsuppgifter för att kunna sälja</AlertTitle>
            <AlertDescription>
              Du måste ansluta ditt bankkonto via Stripe innan du kan publicera annonser. 
              Detta krävs för att du ska kunna ta emot betalningar när du säljer.
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/profile')}>
            Gå till profil och anslut bankkonto
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-3xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">Skapa annons</h1>
          <p className="text-muted-foreground mt-2">
            Fyll i informationen nedan för att skapa din annons
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bilder</CardTitle>
              <CardDescription>
                Lägg till minst 3 bilder. Bra bilder ökar chansen att sälja.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((url, index) => (
                  <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={url} alt={`Bild ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Lägg till</span>
                    </>
                  )}
                </label>
              </div>
              
              {images.length < 3 && (
                <p className="text-sm text-destructive mt-2">
                  Minst {3 - images.length} bilder till krävs
                </p>
              )}
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grunduppgifter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori *</Label>
                  <Select value={formData.category || undefined} onValueChange={(v) => handleSelectChange('category', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">Märke *</Label>
                  <Select value={formData.brand || undefined} onValueChange={(v) => handleSelectChange('brand', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj märke" />
                    </SelectTrigger>
                    <SelectContent>
                      {POPULAR_BRANDS.map((brand) => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="model">Modell *</Label>
                  <Input
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    placeholder="t.ex. Stealth 2 Plus"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Årsmodell</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    value={formData.year}
                    onChange={handleChange}
                    placeholder="t.ex. 2023"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shaft Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Detaljerade specifikationer
                {isSpecVerified && (
                  <span className="golf-badge-spec text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    Komplett
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Detaljerade specs ökar förtroendet och underlättar för köpare att hitta rätt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shaftModel">Shaft-modell</Label>
                  <Input
                    id="shaftModel"
                    name="shaftModel"
                    value={formData.shaftModel}
                    onChange={handleChange}
                    placeholder="t.ex. Fujikura Ventus Blue"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shaftFlex">Flex</Label>
                  <Select value={formData.shaftFlex || undefined} onValueChange={(v) => handleSelectChange('shaftFlex', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj flex" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHAFT_FLEX.map((flex) => (
                        <SelectItem key={flex.value} value={flex.value}>{flex.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shaftLength">Längd</Label>
                  <Input
                    id="shaftLength"
                    name="shaftLength"
                    value={formData.shaftLength}
                    onChange={handleChange}
                    placeholder='t.ex. 45.5"'
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loft">Loft</Label>
                  <Input
                    id="loft"
                    name="loft"
                    value={formData.loft}
                    onChange={handleChange}
                    placeholder="t.ex. 10.5°"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bounce">Bounce</Label>
                  <Input
                    id="bounce"
                    name="bounce"
                    value={formData.bounce}
                    onChange={handleChange}
                    placeholder="t.ex. 12°"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lieAngle">Lie</Label>
                  <Input
                    id="lieAngle"
                    name="lieAngle"
                    value={formData.lieAngle}
                    onChange={handleChange}
                    placeholder="t.ex. 2° upright"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="grip">Grepp</Label>
                  <Input
                    id="grip"
                    name="grip"
                    value={formData.grip}
                    onChange={handleChange}
                    placeholder="t.ex. Golf Pride MCC"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Condition & Price */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Skick & Pris</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="condition">Skick *</Label>
                <Select value={formData.condition || undefined} onValueChange={(v) => handleSelectChange('condition', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj skick" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((cond) => (
                      <SelectItem key={cond.value} value={cond.value.toString()}>
                        <div className="flex items-center gap-2">
                          <span className={`condition-dot condition-${cond.value}`} />
                          <span>{cond.label}</span>
                          <span className="text-muted-foreground">- {cond.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Pris (kr) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="t.ex. 3500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Ort *</Label>
                  <Select value={formData.city || undefined} onValueChange={(v) => handleSelectChange('city', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj ort" />
                    </SelectTrigger>
                    <SelectContent>
                      {SWEDISH_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Övrig information</CardTitle>
              <CardDescription>
                Beskriv eventuella detaljer som köpare bör veta om
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="T.ex. nytt grepp, skador, anledning till försäljning..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={loading || images.length < 3}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publicera annons
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}