import { Layout } from '@/components/layout/Layout';
import { Shield, AlertTriangle, CreditCard, Scale } from 'lucide-react';

export default function Disclaimer() {
  return (
    <Layout>
      <div className="container py-12 max-w-4xl">
        <h1 className="text-3xl font-display font-bold mb-8">Ansvarsfriskrivning</h1>
        
        <div className="prose prose-lg max-w-none space-y-8">
          <p className="text-muted-foreground">
            Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
          </p>

          <div className="grid md:grid-cols-2 gap-6 not-prose">
            <div className="p-6 border rounded-lg">
              <Shield className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Marknadsplatsroll</h3>
              <p className="text-sm text-muted-foreground">
                GolfMarket agerar som förmedlare och är inte part i transaktioner mellan köpare och säljare.
              </p>
            </div>
            
            <div className="p-6 border rounded-lg">
              <CreditCard className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Escrow-tjänst</h3>
              <p className="text-sm text-muted-foreground">
                Betalningar hanteras via Stripe och hålls i escrow tills leverans bekräftas.
              </p>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-4">Marknadsplatsens roll</h2>
            <p className="text-muted-foreground">
              GolfMarket tillhandahåller en plattform där användare kan köpa och sälja 
              golfutrustning. Vi är inte ägare av varorna och gör inga garantier om:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>Varornas kvalitet, skick eller äkthet</li>
              <li>Säljarens eller köparens tillförlitlighet</li>
              <li>Att transaktioner kommer att slutföras</li>
              <li>Leveranstider eller fraktvillkor</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Escrow och betalningshantering</h2>
            <p className="text-muted-foreground">
              Betalningar hanteras via Stripe, en certifierad betalningsförmedlare. 
              Pengarna hålls i escrow och frigörs till säljaren efter att:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>Köparen bekräftat mottagande, eller</li>
              <li>5 dagar passerat sedan säljaren markerat varan som skickad</li>
            </ul>
            <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <strong>Viktigt:</strong> Escrow-tjänsten skyddar inte mot all form av bedrägeri. 
                Granska alltid säljarprofiler och varubilder noggrant innan köp.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Tvister och återbetalningar</h2>
            <p className="text-muted-foreground">
              Vid tvist kommer GolfMarket att granska ärendet och fatta beslut baserat på 
              tillgänglig information. Vårt beslut är slutgiltigt inom ramen för plattformen. 
              Detta påverkar inte dina lagstadgade rättigheter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Begränsning av ansvar</h2>
            <div className="p-4 bg-muted rounded-lg flex items-start gap-3">
              <Scale className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                GolfMarkets ansvar är begränsat till den plattformsavgift som betalats för 
                den aktuella transaktionen. Vi ansvarar inte för indirekta skador, 
                förlorad vinst eller följdskador.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Konsumentköplagen</h2>
            <p className="text-muted-foreground">
              Vid köp mellan privatperson och företag kan konsumentköplagen gälla. 
              Vid köp mellan privatpersoner gäller köplagen. GolfMarket tar inte ställning 
              i juridiska tvister utöver sin roll som marknadsplats.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Kontakt</h2>
            <p className="text-muted-foreground">
              Vid frågor, kontakta legal@golfmarket.se.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
