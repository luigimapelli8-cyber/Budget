import type { PaymentMethod } from '@workspace/api-client-react';

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
};

export const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// Transaction dates are stored as timestamps but only the calendar day matters here,
// so both the <input type="date"> value and the display use UTC to avoid off-by-one
// day shifts from the browser's local timezone.
export const dateToInputValue = (date: Date | string) => new Date(date).toISOString().slice(0, 10);

export const formatDateShort = (date: Date | string) =>
  new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });

// Groups the integer part of a raw number string by thousands with a plain space,
// e.g. "1000000" -> "1 000 000". Keeps a single decimal separator (comma or dot) intact.
const groupThousands = (integerPart: string) => integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const formatAmountInput = (raw: string) => {
  if (!raw) return '';
  const negative = raw.trim().startsWith('-');
  const cleaned = raw.replace(/[^\d.,]/g, '');
  const sepIndex = cleaned.search(/[.,]/);
  let integerPart = cleaned;
  let decimalPart = '';
  if (sepIndex !== -1) {
    integerPart = cleaned.slice(0, sepIndex);
    decimalPart = cleaned[sepIndex] + cleaned.slice(sepIndex + 1).replace(/[^\d]/g, '');
  }
  integerPart = integerPart.replace(/^0+(?=\d)/, '');
  return `${negative ? '-' : ''}${groupThousands(integerPart)}${decimalPart}`;
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  carte_debit: 'Carte de débit',
  cheque: 'Chèque',
  virement: 'Virement',
  cash: 'Cash / Liquide',
  cheque_vacances: 'Chèque vacances',
  carte_resto: 'Carte resto / Pass',
  autre: 'Autre',
};

export const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS) as [
  PaymentMethod,
  string,
][];

export function partnerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
