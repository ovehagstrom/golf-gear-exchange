import { Layout } from '@/components/layout/Layout';

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
            <h2 className="text-xl font-semibold mb-4">1. Inledning</h2>
            <p className="text-muted-foreground">
              GolfMarket värnar om din integritet. Denna policy beskriver vilka personuppgifter 
              vi samlar in, hur vi använder dem och dina rättigheter enligt GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Vilka uppgifter vi samlar in</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Kontouppgifter:</strong> Namn, e-postadress, telefonnummer</li>
              <li><strong>Profilinformation:</strong> Stad, profilbild</li>
              <li><strong>Transaktionsdata:</strong> Köp- och säljhistorik, betalningsinformation</li>
              <li><strong>Kommunikation:</strong> Meddelanden mellan användare</li>
              <li><strong>Teknisk data:</strong> IP-adress, enhetstyp, webbläsare</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Hur vi använder dina uppgifter</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>För att tillhandahålla och förbättra Tjänsten</li>
              <li>För att genomföra transaktioner och betalningar</li>
              <li>För att kommunicera med dig om din användning</li>
              <li>För att säkerställa plattformens säkerhet</li>
              <li>För att uppfylla juridiska krav</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Delning av uppgifter</h2>
            <p className="text-muted-foreground">
              Vi delar dina uppgifter med:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Stripe:</strong> För betalningshantering</li>
              <li><strong>Andra användare:</strong> Vid transaktioner (begränsad info)</li>
              <li><strong>Myndigheter:</strong> Om lagen kräver det</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Lagring och säkerhet</h2>
            <p className="text-muted-foreground">
              Vi lagrar dina uppgifter så länge du har ett aktivt konto eller så länge det 
              krävs för att uppfylla våra juridiska skyldigheter. All data lagras säkert 
              med kryptering.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Dina rättigheter</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Rätt att få tillgång till dina uppgifter</li>
              <li>Rätt till rättelse av felaktiga uppgifter</li>
              <li>Rätt till radering ("rätten att bli glömd")</li>
              <li>Rätt att invända mot behandling</li>
              <li>Rätt till dataportabilitet</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Kontakt</h2>
            <p className="text-muted-foreground">
              För frågor om dataskydd, kontakta oss på privacy@golfmarket.se.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
