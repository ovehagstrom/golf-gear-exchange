import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORIES, SHAFT_FLEX, CONDITIONS, POPULAR_BRANDS, SWEDISH_CITIES } from '@/lib/constants';
import { Loader2, Upload, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function SubmitListing() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    sellerName: '',
    sellerEmail: '',
    sellerPhone: '',
    sellerCity: '',
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
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    setImageFiles((prev) => [...prev, ...newFiles]);

    for (const file of newFiles) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (imageFiles.length < 3) return;

    setLoading(true);

    const fd = new FormData();
    fd.append('sellerName', formData.sellerName);
    fd.append('sellerEmail', formData.sellerEmail);
    fd.append('sellerPhone', formData.sellerPhone);
    fd.append('sellerCity', formData.sellerCity);
    fd.append('title', formData.title || `${formData.brand} ${formData.model}`);
    fd.append('category', formData.category);
    fd.append('brand', formData.brand);
    fd.append('model', formData.model);
    if (formData.year) fd.append('year', formData.year);
    if (formData.shaftModel) fd.append('shaftModel', formData.shaftModel);
    if (formData.shaftFlex) fd.append('shaftFlex', formData.shaftFlex);
    if (formData.shaftLength) fd.append('shaftLength', formData.shaftLength);
    if (formData.loft) fd.append('loft', formData.loft);
    if (formData.bounce) fd.append('bounce', formData.bounce);
    if (formData.lieAngle) fd.append('lieAngle', formData.lieAngle);
    if (formData.grip) fd.append('grip', formData.grip);
    fd.append('condition', formData.condition);
    fd.append('price', formData.price);
    if (formData.description) fd.append('description', formData.description);

    for (const file of imageFiles) {
      fd.append('images', file);
    }

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/submit-external-listing`,
        {
          method: 'POST',
          body: fd,
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setSubmitted(true);
      } else {
        alert(result.error || 'Något gick fel. Försök igen.');
      }
    } catch (err) {
      console.error(err);
      alert('Något gick fel. Försök igen.');
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Tack!</h2>
            <p className="text-muted-foreground">
              Din annons har skickats in och kommer att publiceras på GolfMarket.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-8 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Lägg upp din annons på GolfMarket</h1>
          <p className="text-muted-foreground mt-2">
            Fyll i formuläret nedan så publiceras din annons automatiskt
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seller Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dina uppgifter</CardTitle>
              <CardDescription>Kontaktuppgifter så vi kan nå dig</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sellerName">Namn *</Label>
                  <Input
                    id="sellerName"
                    name="sellerName"
                    value={formData.sellerName}
                    onChange={handleChange}
                    placeholder="Ditt namn"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellerCity">Ort *</Label>
                  <Select value={formData.sellerCity || undefined} onValueChange={(v) => handleSelectChange('sellerCity', v)}>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sellerEmail">E-post</Label>
                  <Input
                    id="sellerEmail"
                    name="sellerEmail"
                    type="email"
                    value={formData.sellerEmail}
                    onChange={handleChange}
                    placeholder="din@email.se"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellerPhone">Telefon</Label>
                  <Input
                    id="sellerPhone"
                    name="sellerPhone"
                    value={formData.sellerPhone}
                    onChange={handleChange}
                    placeholder="07X-XXX XX XX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bilder</CardTitle>
              <CardDescription>Lägg till minst 3 bilder. Bra bilder ökar chansen att sälja.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {imagePreviews.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
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
                  />
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground">Lägg till</span>
                </label>
              </div>
              {imageFiles.length < 3 && (
                <p className="text-sm text-destructive mt-2">
                  Minst {3 - imageFiles.length} bilder till krävs
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
                  <Label>Kategori *</Label>
                  <Select value={formData.category || undefined} onValueChange={(v) => handleSelectChange('category', v)}>
                    <SelectTrigger><SelectValue placeholder="Välj kategori" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Märke *</Label>
                  <Select value={formData.brand || undefined} onValueChange={(v) => handleSelectChange('brand', v)}>
                    <SelectTrigger><SelectValue placeholder="Välj märke" /></SelectTrigger>
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
                  <Input id="model" name="model" value={formData.model} onChange={handleChange} placeholder="t.ex. Stealth 2 Plus" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Årsmodell</Label>
                  <Input id="year" name="year" type="number" value={formData.year} onChange={handleChange} placeholder="t.ex. 2023" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detaljerade specifikationer</CardTitle>
              <CardDescription>Fyll i så mycket du kan – det hjälper köpare att hitta rätt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shaftModel">Shaft-modell</Label>
                  <Input id="shaftModel" name="shaftModel" value={formData.shaftModel} onChange={handleChange} placeholder="t.ex. Fujikura Ventus Blue" />
                </div>
                <div className="space-y-2">
                  <Label>Flex</Label>
                  <Select value={formData.shaftFlex || undefined} onValueChange={(v) => handleSelectChange('shaftFlex', v)}>
                    <SelectTrigger><SelectValue placeholder="Välj flex" /></SelectTrigger>
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
                  <Input id="shaftLength" name="shaftLength" value={formData.shaftLength} onChange={handleChange} placeholder='t.ex. 45.5"' />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loft">Loft</Label>
                  <Input id="loft" name="loft" value={formData.loft} onChange={handleChange} placeholder="t.ex. 10.5°" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bounce">Bounce</Label>
                  <Input id="bounce" name="bounce" value={formData.bounce} onChange={handleChange} placeholder="t.ex. 12°" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lieAngle">Lie</Label>
                  <Input id="lieAngle" name="lieAngle" value={formData.lieAngle} onChange={handleChange} placeholder="t.ex. 2° upright" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grip">Grepp</Label>
                <Input id="grip" name="grip" value={formData.grip} onChange={handleChange} placeholder="t.ex. Golf Pride MCC" />
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
                <Label>Skick *</Label>
                <Select value={formData.condition || undefined} onValueChange={(v) => handleSelectChange('condition', v)}>
                  <SelectTrigger><SelectValue placeholder="Välj skick" /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((cond) => (
                      <SelectItem key={cond.value} value={cond.value.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{cond.label}</span>
                          <span className="text-muted-foreground">- {cond.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Pris (kr) *</Label>
                <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange} placeholder="t.ex. 3500" required />
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Övrig information</CardTitle>
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

          <Button type="submit" className="w-full" disabled={loading || imageFiles.length < 3}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Skicka in annons
          </Button>
        </form>
      </div>
    </div>
  );
}
