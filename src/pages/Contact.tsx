import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, MapPin, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Contact() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: 'Fyll i alla obligatoriska fält', variant: 'destructive' });
      return;
    }
    setSending(true);

    const mailtoLink = `mailto:info@golfmarket.store?subject=${encodeURIComponent(form.subject || 'Kontakt via GolfMarket')}&body=${encodeURIComponent(`Från: ${form.name} (${form.email})\n\n${form.message}`)}`;
    window.location.href = mailtoLink;

    setTimeout(() => {
      setSending(false);
      toast({ title: 'E-postklient öppnad', description: 'Skicka meddelandet via din e-postklient.' });
      setForm({ name: '', email: '', subject: '', message: '' });
    }, 1000);
  };

  return (
    <Layout>
      <div className="container py-12 max-w-4xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-display font-bold text-foreground">Kontakta oss</h1>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Har du frågor, feedback eller behöver hjälp? Hör av dig så återkommer vi så snart vi kan.
          </p>
        </div>

        <div className="grid md:grid-cols-[1fr_280px] gap-8">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Skicka meddelande</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Namn *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ditt namn"
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-post *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="din@email.se"
                      maxLength={255}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Ämne</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Vad gäller det?"
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Meddelande *</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Beskriv ditt ärende..."
                    rows={5}
                    maxLength={2000}
                    required
                  />
                </div>
                <Button type="submit" disabled={sending} className="w-full sm:w-auto">
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Öppnar...' : 'Skicka meddelande'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">E-post</p>
                    <a href="mailto:info@golfmarket.store" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      info@golfmarket.store
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Plats</p>
                    <p className="text-sm text-muted-foreground">Sverige</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-1">Svarstid</p>
                <p className="text-sm text-muted-foreground">
                  Vi svarar normalt inom 24 timmar på vardagar.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
