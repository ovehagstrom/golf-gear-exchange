import { CheckCircle, Circle, CreditCard, Package, Truck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  current: boolean;
  error?: boolean;
}

interface TransactionTimelineProps {
  status: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  disputedAt?: string | null;
}

export function TransactionTimeline({ 
  status, 
  shippedAt, 
  deliveredAt, 
  completedAt,
  disputedAt 
}: TransactionTimelineProps) {
  const isDisputed = status === 'disputed';
  const isRefunded = status === 'refunded';
  const isCancelled = status === 'cancelled';

  const steps: TimelineStep[] = [
    {
      key: 'accepted',
      label: 'Bud accepterat',
      icon: <CheckCircle className="h-5 w-5" />,
      completed: true,
      current: status === 'pending_payment',
    },
    {
      key: 'paid',
      label: 'Betald (escrow)',
      icon: <CreditCard className="h-5 w-5" />,
      completed: ['paid', 'shipped', 'delivered', 'completed'].includes(status),
      current: status === 'paid',
    },
    {
      key: 'shipped',
      label: 'Skickad',
      icon: <Truck className="h-5 w-5" />,
      completed: ['shipped', 'delivered', 'completed'].includes(status) && !!shippedAt,
      current: status === 'shipped',
    },
    {
      key: 'completed',
      label: 'Slutförd',
      icon: <Package className="h-5 w-5" />,
      completed: status === 'completed' && !!completedAt,
      current: false,
    },
  ];

  if (isDisputed || isRefunded || isCancelled) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <div>
          <p className="font-medium text-destructive">
            {isDisputed && 'Tvist pågår'}
            {isRefunded && 'Återbetald'}
            {isCancelled && 'Avbruten'}
          </p>
          <p className="text-sm text-muted-foreground">
            {isDisputed && 'Ärendet hanteras av admin'}
            {isRefunded && 'Pengarna har återbetalats till köparen'}
            {isCancelled && 'Transaktionen avbröts'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-border" />
      
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center gap-3 relative">
            <div
              className={cn(
                "relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors",
                step.completed 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : step.current 
                    ? "bg-background border-primary text-primary animate-pulse"
                    : "bg-background border-muted-foreground/30 text-muted-foreground/50"
              )}
            >
              {step.completed ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                step.completed 
                  ? "text-foreground" 
                  : step.current 
                    ? "text-primary"
                    : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
