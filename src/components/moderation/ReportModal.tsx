import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Flag, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ReportModalProps {
  type: 'user' | 'listing' | 'conversation';
  targetId: string;
  targetName?: string;
  trigger?: React.ReactNode;
}

const REPORT_REASONS = {
  user: [
    { value: 'fraud', label: 'Misstänkt bedrägeri' },
    { value: 'harassment', label: 'Trakasserier' },
    { value: 'fake_profile', label: 'Falskt konto' },
    { value: 'other', label: 'Annat' },
  ],
  listing: [
    { value: 'fake', label: 'Falsk annons' },
    { value: 'wrong_category', label: 'Fel kategori' },
    { value: 'prohibited', label: 'Förbjuden vara' },
    { value: 'misleading', label: 'Vilseledande information' },
    { value: 'other', label: 'Annat' },
  ],
  conversation: [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Trakasserier' },
    { value: 'scam', label: 'Bedrägeriförsök' },
    { value: 'other', label: 'Annat' },
  ],
};

export function ReportModal({ type, targetId, targetName, trigger }: ReportModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        report_type: type,
        reason,
        details: details || null,
        target_user_id: type === 'user' ? targetId : null,
        target_listing_id: type === 'listing' ? targetId : null,
        target_conversation_id: type === 'conversation' ? targetId : null,
      });

      if (error) throw error;

      toast({ title: 'Rapport skickad', description: 'Tack för din rapport. Vi granskar ärendet.' });
      setOpen(false);
      setReason('');
      setDetails('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Kunde inte skicka rapport' });
    } finally {
      setLoading(false);
    }
  };

  const reasons = REPORT_REASONS[type];
  const typeLabels = { user: 'användare', listing: 'annons', conversation: 'konversation' };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag className="h-4 w-4 mr-1" />
            Rapportera
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rapportera {typeLabels[type]}</DialogTitle>
        </DialogHeader>

        {targetName && (
          <p className="text-sm text-muted-foreground">
            Du rapporterar: <strong>{targetName}</strong>
          </p>
        )}

        <div className="space-y-4">
          <div>
            <Label className="mb-3 block">Anledning</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reasons.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="details">Ytterligare information (valfritt)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Beskriv problemet..."
              className="mt-1"
            />
          </div>

          <Button onClick={handleSubmit} disabled={!reason || loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Skicka rapport
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
