import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Shield, Search, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function Index() {
  const { user } = useAuth();

  const features = [
    {
      icon: Search,
      title: 'Golf-specifik sökning',
      description: 'Hitta exakt rätt klubba med filter för shaft, flex, längd och lie.',
    },
    {
      icon: Shield,
      title: 'Trygg handel',
      description: 'Verifierade säljare och strukturerade annonser med tydliga specs.',
    },
    {
      icon: MessageSquare,
      title: 'Direkt kontakt',
      description: 'Chatta med säljare direkt i appen för snabbare affärer.',
    },
    {
      icon: CheckCircle2,
      title: 'Kvalitetsfokus',
      description: 'Ingen loppiskänsla - endast seriös golfutrustning.',
    },
  ];

  const categories = [
    { name: 'Drivers', value: 'driver', emoji: '🏌️' },
    { name: 'Järnset', value: 'iron_set', emoji: '⛳' },
    { name: 'Wedges', value: 'wedge', emoji: '🎯' },
    { name: 'Putters', value: 'putter', emoji: '🕳️' },
    { name: 'Shafts', value: 'shaft', emoji: '📏' },
    { name: 'Bags', value: 'bag', emoji: '🎒' },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative gradient-hero">
        <div className="container py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground tracking-tight">
              Marknadsplatsen för{' '}
              <span className="text-primary">golfutrustning</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Köp och sälj begagnad golfutrustning tryggt. Strukturerade annonser, 
              golf-specifik sökning och direkt kontakt mellan golfare.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild>
                <Link to="/listings">
                  Bläddra annonser
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              {user ? (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/listings/new">Skapa annons</Link>
                </Button>
              ) : (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth?mode=signup">Kom igång gratis</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Decorative element */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Categories Section */}
      <section className="container py-16">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-10">
          Populära kategorier
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.value}
              to={`/listings?category=${cat.value}`}
              className="golf-card-premium p-6 text-center group"
            >
              <span className="text-4xl mb-3 block">{cat.emoji}</span>
              <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
              Varför GolfMarket?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Vi har byggt en marknadsplats som förstår golfarens behov.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20">
        <div className="golf-card-premium p-8 md:p-12 text-center gradient-golf">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-4">
            Redo att sälja?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Skapa en annons på under 5 minuter. Gratis att använda.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to={user ? '/listings/new' : '/auth?mode=signup'}>
              {user ? 'Skapa annons' : 'Registrera dig gratis'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}