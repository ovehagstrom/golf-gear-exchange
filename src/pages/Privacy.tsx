import { Layout } from '@/components/layout/Layout';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <Layout>
      <div className="container py-12 max-w-4xl">
        <h1 className="text-3xl font-display font-bold mb-8">Integritetspolicy</h1>
        
        <div className="prose prose-lg max-w-none space-y-8">
          <p className="text-muted-foreground">
            Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">1. Personuppgiftsansvarig</h2>
            <p className="text-muted-foreground">
              GolfMarket ("vi", "oss", "vår") är personuppgiftsansvarig för behandlingen av dina 
              personuppgifter. Det innebär att vi ansvarar för att dina uppgifter hanteras på ett 
              lagligt, korrekt och säkert sätt.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Kontakt:</strong> privacy@golfmarket.se
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Vilka uppgifter vi samlar in</h2>
            <p className="text-muted-foreground mb-4">
              Vi samlar endast in uppgifter som behövs för att tillhandahålla tjänsten:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Kontouppgifter:</strong> E-postadress, namn och lösenord (krypterat)</li>
              <li><strong>Profilinformation:</strong> Stad, telefonnummer (frivilligt), profilbild (frivilligt)</li>
              <li><strong>Annonsdata:</strong> Information du anger i dina annonser (bilder, beskrivningar, pris)</li>
              <li><strong>Kommunikation:</strong> Meddelanden mellan köpare och säljare</li>
              <li><strong>Transaktionshistorik:</strong> Köp- och säljhistorik, betalningsstatus</li>
              <li><strong>Teknisk data:</strong> IP-adress, enhetstyp och webbläsare (för säkerhet och felsökning)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Rättslig grund för behandling</h2>
            <p className="text-muted-foreground mb-4">
              Vi behandlar dina personuppgifter baserat på följande rättsliga grunder enligt GDPR:
            </p>
            
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Avtal (Artikel 6.1.b)</h3>
                <p className="text-sm text-muted-foreground">
                  Vi behandlar uppgifter som är nödvändiga för att fullgöra vårt avtal med dig – 
                  till exempel för att skapa ditt konto, publicera dina annonser och genomföra köp/försäljningar.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Rättslig förpliktelse (Artikel 6.1.c)</h3>
                <p className="text-sm text-muted-foreground">
                  Vissa uppgifter behandlas för att uppfylla lagkrav, exempelvis bokföringslagen 
                  som kräver att transaktionsdata sparas i 7 år.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Berättigat intresse (Artikel 6.1.f)</h3>
                <p className="text-sm text-muted-foreground">
                  Vi behandlar viss data för att förhindra bedrägerier, säkerställa plattformens 
                  säkerhet och förbättra tjänsten. Vi gör alltid en avvägning för att säkerställa 
                  att dina intressen inte väger tyngre.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Betalningar och Stripe</h2>
            <p className="text-muted-foreground">
              All betalningshantering sköts av vår betaltjänstleverantör <strong>Stripe</strong>. 
              Det innebär att:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
              <li><strong>Vi lagrar aldrig dina kortuppgifter</strong> – dessa hanteras helt av Stripe</li>
              <li>Stripe är en PCI DSS-certifierad betaltjänst med högsta säkerhetsnivå</li>
              <li>Vi får endast information om betalningens status (godkänd/nekad) och transaktionsreferenser</li>
              <li>Stripes integritetspolicy finns på <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">stripe.com/privacy</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Delning av uppgifter</h2>
            <p className="text-muted-foreground mb-4">
              Vi säljer aldrig dina personuppgifter. Vi delar uppgifter endast när det är nödvändigt:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Med andra användare:</strong> Köpare och säljare ser varandras namn och stad vid transaktioner</li>
              <li><strong>Med Stripe:</strong> För säker betalningshantering</li>
              <li><strong>Med myndigheter:</strong> Om vi är skyldiga enligt lag (t.ex. vid brottsutredning)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Lagringstid</h2>
            <p className="text-muted-foreground mb-4">
              Vi sparar dina uppgifter så länge det behövs för respektive ändamål:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-muted-foreground border rounded-lg">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Uppgiftstyp</th>
                    <th className="text-left p-3 font-medium">Lagringstid</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3">Kontoinformation</td>
                    <td className="p-3">Så länge kontot är aktivt + 1 år efter radering</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Annonser</td>
                    <td className="p-3">Så länge annonsen är aktiv + 1 år efter att den avslutats</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Transaktionsdata</td>
                    <td className="p-3">7 år (enligt bokföringslagen)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3">Meddelanden</td>
                    <td className="p-3">Så länge kontot är aktivt</td>
                  </tr>
                  <tr>
                    <td className="p-3">Teknisk loggdata</td>
                    <td className="p-3">90 dagar</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Cookies och analys</h2>
            <p className="text-muted-foreground">
              Vi använder cookies för att tjänsten ska fungera korrekt. Läs mer i vår{' '}
              <Link to="/cookies" className="text-primary hover:underline">cookiepolicy</Link>. 
              Vi använder för närvarande inte tredjepartsverktyg för analys eller spårning i marknadsföringssyfte.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Dina rättigheter enligt GDPR</h2>
            <p className="text-muted-foreground mb-4">
              Du har följande rättigheter gällande dina personuppgifter:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Tillgång:</strong> Du kan begära en kopia av alla uppgifter vi har om dig</li>
              <li><strong>Rättelse:</strong> Du kan be oss korrigera felaktiga uppgifter</li>
              <li><strong>Radering:</strong> Du kan begära att vi raderar dina uppgifter ("rätten att bli glömd")</li>
              <li><strong>Begränsning:</strong> Du kan be oss begränsa behandlingen under vissa omständigheter</li>
              <li><strong>Dataportabilitet:</strong> Du kan begära att få dina uppgifter i ett maskinläsbart format</li>
              <li><strong>Invändning:</strong> Du kan invända mot behandling baserad på berättigat intresse</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              För att utöva dina rättigheter, kontakta oss på <strong>privacy@golfmarket.se</strong>. 
              Vi svarar inom 30 dagar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Klagomål</h2>
            <p className="text-muted-foreground">
              Om du anser att vi hanterar dina personuppgifter felaktigt har du rätt att lämna 
              klagomål till <strong>Integritetsskyddsmyndigheten (IMY)</strong> på{' '}
              <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                www.imy.se
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Ändringar i policyn</h2>
            <p className="text-muted-foreground">
              Vi kan komma att uppdatera denna policy. Vid väsentliga ändringar informerar vi dig 
              via e-post eller i tjänsten. Datumet "Senast uppdaterad" visar när policyn senast ändrades.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Kontakt</h2>
            <p className="text-muted-foreground">
              Har du frågor om hur vi hanterar dina personuppgifter?
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>E-post:</strong> privacy@golfmarket.se
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
