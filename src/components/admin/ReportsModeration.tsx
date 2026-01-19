import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Flag, 
  CheckCircle, 
  XCircle, 
  Loader2,
  User,
  ShoppingBag,
  MessageSquare,
  RefreshCw
} from 'lucide-react';

interface Report {
  id: string;
  reporter_id: string;
  report_type: 'user' | 'listing' | 'conversation';
  target_user_id: string | null;
  target_listing_id: string | null;
  target_conversation_id: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
}

export function ReportsModeration() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReports(data as Report[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const updateReport = async (id: string, status: 'resolved' | 'dismissed') => {
    setActionLoading(id);
    const { error } = await supabase
      .from('reports')
      .update({ 
        status, 
        admin_notes: adminNotes[id] || null 
      })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Kunde inte uppdatera rapport' });
    } else {
      toast({ title: status === 'resolved' ? 'Rapport löst' : 'Rapport avvisad' });
      fetchReports();
    }
    setActionLoading(null);
  };

  const getTypeIcon = (type: Report['report_type']) => {
    switch (type) {
      case 'user': return User;
      case 'listing': return ShoppingBag;
      case 'conversation': return MessageSquare;
    }
  };

  const getStatusBadge = (status: Report['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="outline">Väntar</Badge>;
      case 'reviewed': return <Badge className="bg-blue-500">Granskas</Badge>;
      case 'resolved': return <Badge className="bg-green-500">Löst</Badge>;
      case 'dismissed': return <Badge variant="secondary">Avvisad</Badge>;
    }
  };

  const pendingReports = reports.filter(r => r.status === 'pending');
  const resolvedReports = reports.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Rapporter ({pendingReports.length} väntande)
        </h2>
        <Button variant="outline" size="sm" onClick={fetchReports}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Uppdatera
        </Button>
      </div>

      {pendingReports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-muted-foreground">Inga väntande rapporter! 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingReports.map(report => {
            const Icon = getTypeIcon(report.report_type);
            return (
              <Card key={report.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(report.status)}
                        <Badge variant="outline">{report.report_type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString('sv-SE')}
                        </span>
                      </div>
                      <p className="font-medium capitalize">{report.reason.replace('_', ' ')}</p>
                      {report.details && (
                        <p className="text-sm text-muted-foreground mt-1">{report.details}</p>
                      )}
                      <div className="mt-4 space-y-2">
                        <Textarea
                          placeholder="Admin-anteckningar..."
                          value={adminNotes[report.id] || ''}
                          onChange={(e) => setAdminNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateReport(report.id, 'resolved')}
                            disabled={actionLoading === report.id}
                          >
                            {actionLoading === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Markera löst
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReport(report.id, 'dismissed')}
                            disabled={actionLoading === report.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Avvisa
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {resolvedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hanterade rapporter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resolvedReports.slice(0, 10).map(report => (
                <div key={report.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(report.status)}
                    <span className="text-sm capitalize">{report.reason.replace('_', ' ')}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString('sv-SE')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
