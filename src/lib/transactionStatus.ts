export const TRANSACTION_STATUS = {
  pending_payment: {
    label: 'Väntar på betalning',
    description: 'Köparen behöver genomföra betalningen',
    buyerAction: 'Betala nu',
    sellerInfo: 'Väntar på köparens betalning',
    color: 'bg-yellow-500',
  },
  paid: {
    label: 'Betald (escrow)',
    description: 'Pengarna är säkrade. Säljaren kan nu skicka varan.',
    buyerAction: null,
    sellerInfo: 'Varan är betald! Skicka produkten nu.',
    color: 'bg-blue-500',
  },
  shipped: {
    label: 'Skickad',
    description: 'Varan är på väg till köparen',
    buyerAction: 'Bekräfta mottagande',
    sellerInfo: 'Väntar på köparens bekräftelse',
    color: 'bg-purple-500',
  },
  delivered: {
    label: 'Levererad',
    description: 'Varan har levererats',
    buyerAction: null,
    sellerInfo: 'Varan är levererad',
    color: 'bg-green-500',
  },
  completed: {
    label: 'Slutförd',
    description: 'Affären är klar. Pengarna har släppts till säljaren.',
    buyerAction: null,
    sellerInfo: 'Pengarna har betalats ut!',
    color: 'bg-green-600',
  },
  disputed: {
    label: 'Tvist',
    description: 'Ett problem har rapporterats. Admin hanterar ärendet.',
    buyerAction: null,
    sellerInfo: 'Ärendet utreds av admin',
    color: 'bg-red-500',
  },
  refunded: {
    label: 'Återbetald',
    description: 'Betalningen har återbetalats till köparen',
    buyerAction: null,
    sellerInfo: 'Betalningen har återbetalats',
    color: 'bg-gray-500',
  },
  cancelled: {
    label: 'Avbruten',
    description: 'Transaktionen har avbrutits',
    buyerAction: null,
    sellerInfo: 'Transaktionen avbröts',
    color: 'bg-gray-500',
  },
} as const;

export type TransactionStatus = keyof typeof TRANSACTION_STATUS;

export function getStatusInfo(status: string) {
  return TRANSACTION_STATUS[status as TransactionStatus] || TRANSACTION_STATUS.pending_payment;
}
