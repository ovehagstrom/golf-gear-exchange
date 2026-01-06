import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SELLER_TYPES, SWEDISH_CITIES } from '@/lib/constants';
import { Loader2, Shield, Star } from 'lucide-react';

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    city: '',
    sellerType: 'private',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchProfile();
      fetchRating();
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
      setFormData({
        fullName: data.full_name || '',
        phone: data.phone || '',
        city: data.city || '',
        sellerType: data.seller_type || 'private',
      });
    }
    setLoading(false);
  };

  const fetchRating = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewed_id', user.id);

    if (!error && data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      setAvgRating(Math.round(avg * 10) / 10);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.fullName,
        phone: formData.phone,
        city: formData.city,
        seller_type: formData.sellerType,
      })
      .eq('id', user.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Kunde inte spara',
        description: error.message,
      });
    } else {
      toast({
        title: 'Profil uppdaterad',
        description: 'Dina ändringar har sparats.',
      });
      fetchProfile();
    }

    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-2xl py-8">
        <h1 className="text-3xl font-display font-bold mb-8">Min profil</h1>

        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {formData.fullName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{formData.fullName || 'Din profil'}</h2>
                <p className="text-muted-foreground">{user?.email}</p>
                
                <div className="flex items-center gap-3 mt-2">
                  {profile?.is_verified && (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Verifierad
                    </Badge>
                  )}
                  {avgRating && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      {avgRating}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {profile?.completed_deals || 0} genomförda affärer
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Profilinformation</CardTitle>
            <CardDescription>
              Uppdatera din information för att göra det lättare för köpare och säljare att kontakta dig
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Namn</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Ditt namn"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="070-123 45 67"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ort</Label>
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

              <div className="space-y-2">
                <Label htmlFor="sellerType">Säljartyp</Label>
                <Select value={formData.sellerType} onValueChange={(v) => handleSelectChange('sellerType', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SELLER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Spara ändringar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}