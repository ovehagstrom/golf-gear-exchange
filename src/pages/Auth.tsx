import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(6, 'Lösenordet måste vara minst 6 tecken'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Namn måste vara minst 2 tecken'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Lösenorden matchar inte',
  path: ['confirmPassword'],
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignup, setIsSignup] = useState(searchParams.get('mode') === 'signup');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isSignup) {
        const result = signupSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              variant: 'destructive',
              title: 'Kontot finns redan',
              description: 'Den här e-postadressen är redan registrerad. Försök logga in istället.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Registrering misslyckades',
              description: error.message,
            });
          }
        } else {
          toast({
            title: 'Konto skapat!',
            description: 'Du är nu inloggad.',
          });
          navigate('/');
        }
      } else {
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              variant: 'destructive',
              title: 'Inloggning misslyckades',
              description: 'Fel e-postadress eller lösenord.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Inloggning misslyckades',
              description: error.message,
            });
          }
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        variant: 'destructive',
        title: 'Ett fel uppstod',
        description: 'Försök igen senare.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka till startsidan
        </Link>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <span className="text-2xl font-bold text-primary-foreground">G</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-display">
              {isSignup ? 'Skapa konto' : 'Välkommen tillbaka'}
            </CardTitle>
            <CardDescription>
              {isSignup 
                ? 'Registrera dig för att köpa och sälja golfutrustning' 
                : 'Logga in på ditt GolfMarket-konto'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Namn</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Ditt namn"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-postadress</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="din@email.se"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Lösenord</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Bekräfta lösenord</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isSignup ? 'Skapa konto' : 'Logga in'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              {isSignup ? (
                <p className="text-muted-foreground">
                  Har du redan ett konto?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignup(false)}
                    className="text-primary hover:underline font-medium"
                  >
                    Logga in
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Har du inget konto?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignup(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    Registrera dig
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}