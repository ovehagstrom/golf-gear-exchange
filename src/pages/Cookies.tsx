import { Layout } from '@/components/layout/Layout';

export default function Cookies() {
  return (
    <Layout>
      <div className="container py-12 max-w-4xl">
        <h1 className="text-3xl font-display font-bold mb-8">Cookiepolicy</h1>
        
        <div className="prose prose-lg max-w-none space-y-8">
          <p className="text-muted-foreground">
            Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">Vad är cookies?</h2>
            <p className="text-muted-foreground">
              Cookies är små textfiler som lagras på din enhet när du besöker en webbplats. 
              De hjälper oss att förbättra din upplevelse och förstå hur Tjänsten används.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Vilka cookies vi använder</h2>
            
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Nödvändiga cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Krävs för att Tjänsten ska fungera. Inkluderar inloggning och sessionshantering.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Funktionella cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Sparar dina preferenser som språk och visningsinställningar.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Analytiska cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Hjälper oss förstå hur användare navigerar på webbplatsen för att 
                  förbättra användarupplevelsen.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Tredjepartscookies</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Stripe:</strong> För säker betalningshantering</li>
              <li><strong>Supabase:</strong> För autentisering och sessioner</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Hantera cookies</h2>
            <p className="text-muted-foreground">
              Du kan hantera cookies i din webbläsares inställningar. Observera att 
              blockering av nödvändiga cookies kan påverka Tjänstens funktionalitet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Kontakt</h2>
            <p className="text-muted-foreground">
              Frågor om vår cookieanvändning? Kontakta privacy@golfmarket.se.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
