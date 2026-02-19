import { Layout } from '@/components/layout/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MessageCircle } from 'lucide-react';

export default function FAQ() {
  const faqs = [
    {
      q: 'Är GolfMarket gratis att använda?',
      a: 'Ja! Det är gratis att skapa konto, bläddra bland annonser och lägga bud. Vi tar en liten plattformsavgift först när en affär genomförs framgångsrikt.',
    },
    {
      q: 'Hur stor är plattformsavgiften?',
      a: 'Plattformsavgiften visas tydligt innan du genomför en betalning. Den dras automatiskt från köpesumman.',
    },
    {
      q: 'Vad händer om varan inte stämmer med annonsen?',
      a: 'Du kan öppna en tvist inom 5 dagar efter att säljaren markerat varan som skickad. Pengarna hålls kvar tills ärendet är löst av vårt team.',
    },
    {
      q: 'Hur lång tid tar det att få sina pengar som säljare?',
      a: 'Pengarna frigörs när köparen bekräftat leverans, eller automatiskt 5 dagar efter att du markerat varan som skickad. Utbetalningen till ditt bankkonto sker sedan via Stripe Connect, vanligtvis inom 1–2 bankdagar.',
    },
    {
      q: 'Kan jag sälja utrustning som privatperson?',
      a: 'Absolut! GolfMarket är öppen för alla – privatpersoner, pro shops och återförsäljare. Du väljer själv din typ när du skapar profil.',
    },
    {
      q: 'Vad händer om säljaren inte skickar varan?',
      a: 'Säljaren har 7 dagar på sig att skicka varan efter genomförd betalning. Om de inte gör det avbryts affären automatiskt och du får pengarna tillbaka.',
    },
    {
      q: 'Hur fungerar budsystemet?',
      a: 'Du lägger ett bud med ett belopp och eventuellt ett meddelande. Säljaren kan acceptera budet, avvisa det, eller lämna ett motbud. Om säljaren accepterar kan du gå vidare till betalning.',
    },
    {
      q: 'Kan jag köpa utan att lägga bud?',
      a: 'För tillfället sker alla affärer via budsystemet. Det ger möjlighet till dialog och förhandling mellan köpare och säljare.',
    },
    {
      q: 'Hur rapporterar jag en misstänkt annons eller användare?',
      a: 'Varje annons och användarprofil har en rapporteringsknapp. Klicka på den, välj anledning och lämna en beskrivning. Vårt team granskar rapporten och vidtar åtgärder vid behov.',
    },
    {
      q: 'Varför måste jag koppla Stripe Connect för att sälja?',
      a: 'Stripe Connect gör det möjligt för oss att betala ut pengar direkt till ditt bankkonto på ett säkert sätt. Det är ett engångssteg som tar några minuter och behöver bara göras en gång.',
    },
  ];

  return (
    <Layout>
      <div className="container py-12 max-w-3xl mx-auto">
        <div className="mb-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3">Vanliga frågor</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Svar på de frågor vi får oftast. Hittar du inte ditt svar?{' '}
            <a href="/contact" className="text-primary underline">Kontakta oss</a>.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="text-left font-medium text-sm py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Layout>
  );
}
