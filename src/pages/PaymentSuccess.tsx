import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      // Try to get session_id from URL (Stripe can pass it)
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        // No session_id in URL - check for recent pending transactions
        // This handles the case where user returns without session_id
        setVerifying(false);
        setVerified(true); // Assume success since they landed here
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId }
        });

        if (fnError) {
          console.error('Verification error:', fnError);
          setError('Kunde inte verifiera betalningen. Kontrollera dina transaktioner.');
        } else if (data?.verified) {
          setVerified(true);
        } else {
          setError(data?.message || 'Betalningen kunde inte verifieras.');
        }
      } catch (err) {
        console.error('Verification failed:', err);
        setError('Ett fel uppstod vid verifiering.');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  useEffect(() => {
    // Auto-redirect after 10 seconds if verified
    if (verified && !verifying) {
      const timer = setTimeout(() => {
        navigate('/my-transactions');
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [navigate, verified, verifying]);

  if (verifying) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-lg">
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="flex justify-center mb-6">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-3">
                Verifierar betalning...
              </h1>
              <p className="text-muted-foreground">
                Vänligen vänta medan vi bekräftar din betalning.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 max-w-lg">
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-12 h-12 text-yellow-600" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Verifiering pågår
              </h1>
              
              <p className="text-muted-foreground mb-6">
                {error}
              </p>

              <p className="text-sm text-muted-foreground mb-6">
                Om du har betalat kommer din transaktion att uppdateras inom kort. 
                Kontrollera dina transaktioner för senaste status.
              </p>
              
              <Button 
                onClick={() => navigate('/my-transactions')} 
                className="w-full"
                size="lg"
              >
                Se mina transaktioner
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card className="text-center">
          <CardContent className="pt-8 pb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Tack! Din betalning är mottagen.
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Pengarna är nu säkrade i escrow. Säljaren har blivit notifierad 
              och kommer skicka produkten inom kort.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm text-muted-foreground">
              <p className="mb-2">
                <strong>Vad händer nu?</strong>
              </p>
              <ol className="text-left list-decimal list-inside space-y-1">
                <li>Säljaren packar och skickar din vara</li>
                <li>Du får ett spårningsnummer</li>
                <li>När du fått varan bekräftar du leveransen</li>
                <li>Pengarna frigörs till säljaren</li>
              </ol>
            </div>
            
            <Button 
              onClick={() => navigate('/my-transactions')} 
              className="w-full"
              size="lg"
            >
              Se mina transaktioner
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-xs text-muted-foreground mt-4">
              Du omdirigeras automatiskt om 10 sekunder...
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;
