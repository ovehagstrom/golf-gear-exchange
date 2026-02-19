import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, CreditCard, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Safety() {
  const safeguards = [
    {
      icon: CreditCard,
      title: 'Stripe Escrow',
      description: 'Köparens pengar betalas in och hålls i escrow hos oss via Stripe. Pengarna frigörs INTE till säljaren förrän köparen bekräftat att varan mottagits och är som beskriven.',
    },
    {
      icon: Lock,
      title: 'Krypterad betalning',
      description: 'Alla betalningar sker via Stripe – en av världens ledande betalningslösningar. Dina kortuppgifter lagras aldrig hos oss, allt hanteras säkert av Stripe.',
    },
    {
      icon: Clock,
      title: '5 dagars köparskydd',
      description: 'Efter att säljaren markerat varan som skickad har köparen 5 dagar på sig att bekräfta leverans. Om inget svar ges frigörs pengarna automatiskt – men köparen kan alltid öppna en tvist.',
    },
    {
      icon: Shield,
      title: 'Tvisthantering',
      description: 'Om varan inte stämmer överens med annonsen kan köparen öppna en tvist. Vårt team granskar ärendet och kan hålla inne betalningen tills frågan är löst.',
    },
  ];

  const tips = [
    'Läs alltid annonsen noggrant – kontrollera skick, specifikationer och bilder.',
    'Kommunicera via GolfMarkets meddelandefunktion – undvik att ta konversationen till externa kanaler.',
    'Betala alltid via GolfMarkets betalningssystem för att ha köparskydd.',
    'Be om fler bilder om du är osäker på skicket.',
    'Säljare med fler genomförda affärer och bra betyg är generellt mer pålitliga.',
    'Rapportera misstänkta annonser eller användare direkt via rapportfunktionen.',
  ];

  const redFlags = [
    'Säljaren ber dig betala utanför GolfMarket (Swish, banköverföring etc.)',
    'Priset är orealistiskt lågt jämfört med marknadspriset',
    'Säljaren är otydlig om skick eller vägrar skicka fler bilder',
    'Snabbt tryck att köpa utan tid för eftertanke',
    'Säljaren vill kommunicera utanför plattformen',
  ];

  return (
    <Layout>
      <div className="container py-12 max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3">Trygg handel</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            GolfMarket är byggt för att göra handel med begagnad golfutrustning så trygg som möjligt. Här förklarar vi hur vi skyddar dig.
          </p>
        </div>

        {/* Safeguards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {safeguards.map((item) => (
            <Card key={item.title}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tips */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Tips för trygg handel</h2>
            </div>
            <ul className="space-y-3">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Red flags */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold">Varningssignaler</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Var extra vaksam om du märker något av följande:</p>
            <ul className="space-y-3">
              {redFlags.map((flag, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
