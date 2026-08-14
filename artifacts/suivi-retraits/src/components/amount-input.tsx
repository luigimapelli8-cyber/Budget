import { useRef, useState } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      enterKeyHint="done"
      autoFocus={autoFocus}
      value={isFocused ? value : formatAmountInput(value)}
      onFocus={() => {
        setIsFocused(true);
        if (value === '0') {
          requestAnimationFrame(() => inputRef.current?.select());
        }
      }}
      onBlur={() => setIsFocused(false)}
      onPointerUp={() => {
        if (value === '0') {
          inputRef.current?.select();
        }
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/\s/g, '').replace(',', '.');
        const cleaned = raw.replace(/[^0-9.-]/g, '');
        const [integerPart = '', decimalPart] = cleaned.split('.');
        const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || (decimalPart ? '0' : '');
        onValueChange(`${normalizedInteger}${decimalPart === undefined ? '' : `.${decimalPart}`}`);
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}
