import { Layout } from '@/components/layout/Layout';

export default function Terms() {
  return (
    <Layout>
      <div className="container py-12 max-w-4xl">
        <h1 className="text-3xl font-display font-bold mb-8">Användarvillkor</h1>
        
        <div className="prose prose-lg max-w-none space-y-8">
          <p className="text-muted-foreground">
            Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">1. Allmänna villkor</h2>
            <p className="text-muted-foreground">
              Genom att använda GolfMarket ("Tjänsten") accepterar du dessa användarvillkor. 
              Tjänsten tillhandahålls av GolfMarket och är en marknadsplats för köp och försäljning 
              av begagnad golfutrustning mellan privatpersoner och företag.
            </p>
            <p className="text-muted-foreground mt-2 font-semibold">
              GolfMarket är inte part i köpeavtalet mellan köpare och säljare. 
              GolfMarket agerar uteslutande som förmedlare och teknisk plattform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Registrering och konto</h2>
            <p className="text-muted-foreground">
              För att använda Tjänsten måste du skapa ett konto med korrekta uppgifter. 
              Du är ansvarig för att hålla dina inloggningsuppgifter säkra och för all 
              aktivitet som sker via ditt konto.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Annonsering</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Annonser måste vara korrekta och sanningsenliga</li>
              <li>Förbjudet innehåll inkluderar: piratkopior, stulna varor, vapen</li>
              <li>GolfMarket förbehåller sig rätten att ta bort annonser som bryter mot villkoren</li>
              <li>Du ansvarar för att dina annonser följer gällande lagar</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Betalning och escrow</h2>
            <p className="text-muted-foreground">
              Betalningar hanteras via Stripe. Pengarna hålls i escrow (deponering) tills köparen 
              bekräftar mottagande av varan eller tills automatisk frigörning sker efter 5 dagar 
              från att säljaren markerat varan som skickad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Plattformsavgift</h2>
            <p className="text-muted-foreground">
              GolfMarket tar en plattformsavgift på genomförda transaktioner. Aktuell avgift 
              visas innan betalning genomförs. Plattformsavgiften är icke-återbetalningsbar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Säljarens ansvar</h2>
            <p className="text-muted-foreground mb-2">
              Som säljare på GolfMarket accepterar du följande ekonomiska ansvar:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Chargebacks:</strong> Säljaren är fullt ekonomiskt ansvarig för chargebacks (kortreklamationer) som uppstår till följd av transaktioner. Detta inkluderar det omtvistade beloppet samt eventuella disputavgifter som debiteras av Stripe.</li>
              <li><strong>Refunds efter utbetalning:</strong> Om en återbetalning beviljas efter att medel redan överförts till säljarens konto, är säljaren skyldig att återbetala beloppet. GolfMarket har rätt att automatiskt debitera säljarens anslutna konto (connected account) via transferåterkrav.</li>
              <li><strong>Stripe dispute fees:</strong> Eventuella avgifter som Stripe tar ut vid tvister (för närvarande €15 per dispute) bärs av säljaren.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Plattformens rättigheter vid risk</h2>
            <p className="text-muted-foreground mb-2">
              GolfMarket förbehåller sig rätten att:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Debitera säljarens anslutna konto (connected account) för att täcka chargebacks, tvister och återbetalningar</li>
              <li>Hålla inne utbetalningar vid misstanke om bedrägeri, tvist eller regelbrott</li>
              <li>Skapa ekonomiska reserver (holdbacks) på säljarens konto vid förhöjd risk</li>
              <li>Stänga av eller begränsa säljarens konto vid upprepade tvister eller regelbrott</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Tvister</h2>
            <p className="text-muted-foreground">
              Vid tvist mellan köpare och säljare kan en part öppna en tvist inom 5 dagar 
              från leverans. GolfMarket kommer att granska fallet baserat på tillgänglig 
              dokumentation och fatta beslut om återbetalning eller frigörning av medel. 
              Genom att använda Tjänsten accepterar båda parter detta förfarande som en del av 
              tjänsteavtalet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Ansvarsbegränsning</h2>
            <p className="text-muted-foreground">
              GolfMarket är en marknadsplats och förmedlare – inte part i transaktioner mellan köpare 
              och säljare. Vi garanterar inte kvaliteten på varor eller uppfyllande av avtal 
              mellan användare. Plattformens maximala ansvar är begränsat till den plattformsavgift 
              som betalats för den aktuella transaktionen. Denna begränsning gäller inte vid 
              uppsåt eller grov vårdslöshet från GolfMarkets sida.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Rapporteringsskyldighet (DAC7)</h2>
            <p className="text-muted-foreground">
              I enlighet med EU:s DAC7-direktiv är GolfMarket skyldigt att rapportera säljares 
              intäkter till Skatteverket. Detta gäller säljare som genomför fler än 30 transaktioner 
              eller har intäkter överstigande 2 000 EUR under ett kalenderår. Genom att använda 
              Tjänsten som säljare samtycker du till att nödvändig information (namn, adress, 
              identifikationsnummer och transaktionsuppgifter) samlas in och rapporteras enligt 
              gällande lagstiftning.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Ändringar</h2>
            <p className="text-muted-foreground">
              Vi förbehåller oss rätten att ändra dessa villkor. Väsentliga ändringar 
              meddelas via e-post eller i Tjänsten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">12. Kontakt</h2>
            <p className="text-muted-foreground">
              Vid frågor om dessa villkor, kontakta oss via support@golfmarket.se.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
