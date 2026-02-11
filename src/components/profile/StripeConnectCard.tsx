import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, CheckCircle, AlertCircle, Banknote } from 'lucide-react';

interface ConnectStatus {
  hasAccount: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
}

export function StripeConnectCard() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
  }, []);

  // Check on return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connect') === 'complete') {
      checkStatus();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-connect-status');
      if (error) throw error;
      setStatus(data);
    } catch (error) {
      console.error('Failed to check Connect status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboarding = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Kunde inte starta onboarding',
        description: error instanceof Error ? error.message : 'Försök igen',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDashboard = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-login-link');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Kunde inte öppna dashboard',
        description: error instanceof Error ? error.message : 'Försök igen',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isFullySetup = status?.onboardingComplete && status?.payoutsEnabled;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Utbetalningar</CardTitle>
          </div>
          {isFullySetup ? (
            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Aktivt
            </Badge>
          ) : status?.hasAccount ? (
            <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30">
              <AlertCircle className="h-3 w-3 mr-1" />
              Ej klart
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          {isFullySetup
            ? 'Ditt bankkonto är kopplat. Utbetalningar sker automatiskt.'
            : 'Anslut ditt bankkonto för att ta emot utbetalningar från försäljningar.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!status?.hasAccount && (
          <Button onClick={handleOnboarding} disabled={actionLoading} className="w-full">
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Banknote className="h-4 w-4 mr-2" />
            )}
            Anslut bankkonto
          </Button>
        )}

        {status?.hasAccount && !isFullySetup && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Din registrering är inte färdig. Slutför verifieringen för att kunna ta emot utbetalningar.
              </p>
            </div>
            <Button onClick={handleOnboarding} disabled={actionLoading} className="w-full">
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Slutför verifiering
            </Button>
          </div>
        )}

        {isFullySetup && (
          <Button variant="outline" onClick={handleDashboard} disabled={actionLoading} className="w-full">
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Öppna utbetalnings-dashboard
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={checkStatus} className="w-full text-muted-foreground">
          Uppdatera status
        </Button>
      </CardContent>
    </Card>
  );
}
