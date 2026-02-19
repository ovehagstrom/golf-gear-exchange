import { Layout } from '@/components/layout/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle, MessageSquare, ShoppingBag, User, CreditCard } from 'lucide-react';

export default function Help() {
  const topics = [
    {
      icon: User,
      title: 'Konto & Profil',
      items: [
        { q: 'Hur skapar jag ett konto?', a: 'Klicka på "Registrera" i menyn och fyll i dina uppgifter. Du får ett bekräftelsemail – klicka på länken för att aktivera kontot.' },
        { q: 'Hur ändrar jag mina uppgifter?', a: 'Gå till "Min profil" via användarmenyn. Där kan du uppdatera namn, telefon, stad och profilbild.' },
        { q: 'Hur återställer jag mitt lösenord?', a: 'Klicka på "Logga in" och sedan "Glömt lösenord". Ange din e-postadress så skickar vi en återställningslänk.' },
      ],
    },
    {
      icon: ShoppingBag,
      title: 'Köpa & Sälja',
      items: [
        { q: 'Hur lägger jag ett bud?', a: 'Öppna en annons och klicka på "Lägg bud". Ange ditt budbelopp och ett valfritt meddelande till säljaren. Säljaren kan acceptera, avvisa eller motbuda.' },
        { q: 'Hur skapar jag en annons?', a: 'Klicka på "Sälj" i menyn. Fyll i alla detaljer om utrustningen – ju mer info desto bättre! Du kan ladda upp upp till 5 bilder.' },
        { q: 'Kan jag redigera en annons efter publicering?', a: 'Ja, gå till "Mina annonser" och klicka på "Redigera" på den annons du vill ändra.' },
        { q: 'Hur avslutar jag en annons?', a: 'Gå till "Mina annonser" och välj "Markera såld" eller "Pausa" beroende på situation.' },
      ],
    },
    {
      icon: CreditCard,
      title: 'Betalning',
      items: [
        { q: 'Hur fungerar betalningen?', a: 'Vi använder Stripe Escrow – pengarna betalas in av köparen och hålls säkert tills köparen bekräftat att varan mottagits. Först då frigörs pengarna till säljaren.' },
        { q: 'Vilka betalningsmetoder accepteras?', a: 'Vi accepterar alla vanliga betalkort (Visa, Mastercard) via Stripe. Fler metoder kan tillkomma.' },
        { q: 'Hur tar GolfMarket betalt?', a: 'Vi tar en liten plattformsavgift vid genomförd affär. Denna dras automatiskt från köpesumman.' },
        { q: 'Hur får jag mina pengar som säljare?', a: 'Du behöver koppla ditt bankkonto via Stripe Connect i din profil. När affären är klar förs pengarna direkt till ditt konto.' },
      ],
    },
    {
      icon: MessageSquare,
      title: 'Meddelanden',
      items: [
        { q: 'Hur kontaktar jag en säljare?', a: 'Öppna annonsen och klicka på "Skicka meddelande" eller lägg ett bud. Chatten är tillgänglig via "Meddelanden" i menyn.' },
        { q: 'Är mina meddelanden privata?', a: 'Ja, meddelanden är privata mellan köpare och säljare. Endast ni två kan se konversationen.' },
      ],
    },
  ];

  return (
    <Layout>
      <div className="container py-12 max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3">Hjälpcenter</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Hitta svar på de vanligaste frågorna om GolfMarket. Hittar du inte vad du letar efter?{' '}
            <a href="/contact" className="text-primary underline">Kontakta oss</a>.
          </p>
        </div>

        <div className="space-y-8">
          {topics.map((topic) => (
            <Card key={topic.title}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <topic.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">{topic.title}</h2>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  {topic.items.map((item, i) => (
                    <AccordionItem key={i} value={`${topic.title}-${i}`}>
                      <AccordionTrigger className="text-left text-sm font-medium">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
