import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Database, Trash2 } from 'lucide-react';

export function ExternalListingsImport() {
  const { toast } = useToast();
  const [jsonInput, setJsonInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<{ total: number; active: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchStats = async () => {
    setLoadingStats(true);
    const { count: total } = await supabase
      .from('external_listings')
      .select('*', { count: 'exact', head: true });
    const { count: active } = await supabase
      .from('external_listings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    setStats({ total: total || 0, active: active || 0 });
    setLoadingStats(false);
  };

  useState(() => {
    fetchStats();
  });

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast({ variant: 'destructive', title: 'Klistra in JSON-data' });
      return;
    }

    let listings;
    try {
      const parsed = JSON.parse(jsonInput);
      listings = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      toast({ variant: 'destructive', title: 'Ogiltig JSON', description: 'Kontrollera formatet' });
      return;
    }

    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-external-listings', {
        body: { listings },
      });

      if (error) throw error;

      toast({
        title: 'Import klar!',
        description: `${data.imported} importerade, ${data.errors} fel av ${data.total} totalt`,
      });
      setJsonInput('');
      fetchStats();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Importfel',
        description: error instanceof Error ? error.message : 'Försök igen',
      });
    } finally {
      setImporting(false);
    }
  };

  const exampleJson = JSON.stringify([
    {
      source: "blocket",
      source_id: "blocket-12345",
      title: "Titleist TSR3 Driver 9° med Tensei White 65g Stiff",
      price: 3500,
      city: "Stockholm",
      source_url: "https://www.blocket.se/annons/12345",
      image_urls: ["https://example.com/img1.jpg"],
      description: "Säljer min Titleist TSR3 driver i nyskick. Knappt använd.",
      published_at: "2026-03-01T10:00:00Z",
      category: "driver"
    }
  ], null, 2);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Totalt externa annonser</p>
                <p className="text-2xl font-bold">{stats?.total ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Aktiva</p>
                <p className="text-2xl font-bold text-primary">{stats?.active ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importera externa annonser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Klistra in en JSON-array med annonser. Varje annons måste ha <code>source_id</code>, <code>title</code> och <code>source_url</code>. 
            AI:n analyserar automatiskt titel och beskrivning för att extrahera specs (märke, modell, loft, flex, etc).
          </p>
          
          <details className="text-sm">
            <summary className="cursor-pointer text-primary font-medium">Visa exempelformat</summary>
            <pre className="mt-2 p-3 bg-muted rounded-lg overflow-x-auto text-xs">
              {exampleJson}
            </pre>
          </details>

          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='[{"source":"blocket","source_id":"123","title":"...","source_url":"https://..."}]'
            className="min-h-[200px] font-mono text-sm"
          />

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importing || !jsonInput.trim()}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importerar & analyserar...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importera
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">blocket</Badge>
            <Badge variant="outline">tradera</Badge>
            <Badge variant="outline">facebook</Badge>
            <span className="text-xs text-muted-foreground self-center">Stödda källor</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
