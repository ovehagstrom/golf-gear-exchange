import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Layout } from '@/components/layout/Layout';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 10 seconds
    const timer = setTimeout(() => {
      navigate('/my-transactions');
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

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
