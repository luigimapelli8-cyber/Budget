import { formatAmountInput } from '@/lib/format';

// Controlled text input that displays a live "1 000 000"-style grouped value while
// storing/emitting a plain numeric string (dot as decimal separator) via onValueChange.
export function AmountInput({
  value,
  onValueChange,
  className,
  placeholder,
  autoFocus,
}: {
  value: string;
  onValueChange: (raw: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoFocus={autoFocus}
      value={formatAmountInput(value)}
      onChange={(e) => {
        const raw = e.target.value.replace(/\s/g, '').replace(',', '.');
        onValueChange(raw.replace(/[^0-9.-]/g, ''));
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}
