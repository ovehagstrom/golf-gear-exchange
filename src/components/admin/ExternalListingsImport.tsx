import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Database, Clock, CheckCircle, XCircle, Play } from 'lucide-react';

interface ImportLog {
  id: string;
  source: string;
  imported_count: number;
  skipped_duplicates_count: number;
  executed_at: string;
  status: string;
  error_message: string | null;
}

export function ExternalListingsImport() {
  const { toast } = useToast();
  const [jsonInput, setJsonInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [triggeringCron, setTriggeringCron] = useState(false);
  const [stats, setStats] = useState<{ total: number; active: number } | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, []);

  const fetchStats = async () => {
    const [{ count: total }, { count: active }] = await Promise.all([
      supabase.from('external_listings').select('*', { count: 'exact', head: true }),
      supabase.from('external_listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);
    setStats({ total: total || 0, active: active || 0 });
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('external_import_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(20);
    setLogs((data as ImportLog[]) || []);
  };

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
      fetchLogs();
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

  const handleTriggerScheduled = async () => {
    setTriggeringCron(true);
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-import', {
        body: { time: 'manual' },
      });

      if (error) throw error;

      toast({
        title: 'Schemalagd import körd!',
        description: JSON.stringify(data.results),
      });
      fetchStats();
      fetchLogs();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Fel vid körning',
        description: error instanceof Error ? error.message : 'Försök igen',
      });
    } finally {
      setTriggeringCron(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      description: "Säljer min Titleist TSR3 driver i nyskick.",
      published_at: "2026-03-01T10:00:00Z",
      category: "driver"
    }
  ], null, 2);

  return (
    <div className="space-y-6">
      {/* Stats + Trigger */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Totalt externa</p>
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
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Schemalagd import</p>
            <p className="text-xs text-muted-foreground mb-3">Körs automatiskt kl 03:00 dagligen</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerScheduled}
              disabled={triggeringCron}
              className="w-full"
            >
              {triggeringCron ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Kör nu manuellt
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Importhistorik
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Inga importer ännu</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div className="flex items-center gap-3">
                    {log.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{log.source}</Badge>
                        <span className="text-muted-foreground">{formatDate(log.executed_at)}</span>
                      </div>
                      {log.error_message && (
                        <p className="text-destructive text-xs mt-1">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">{log.imported_count}</span> importerade
                    {log.skipped_duplicates_count > 0 && (
                      <>, <span>{log.skipped_duplicates_count}</span> hoppade</>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual JSON import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Manuell JSON-import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Klistra in en JSON-array med annonser. AI:n extraherar specs automatiskt.
          </p>
          
          <details className="text-sm">
            <summary className="cursor-pointer text-primary font-medium">Visa exempelformat</summary>
            <pre className="mt-2 p-3 bg-muted rounded-lg overflow-x-auto text-xs">{exampleJson}</pre>
          </details>

          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='[{"source":"blocket","source_id":"123","title":"...","source_url":"https://..."}]'
            className="min-h-[200px] font-mono text-sm"
          />

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
        </CardContent>
      </Card>
    </div>
  );
}
