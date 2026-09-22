import { forwardRef, useMemo } from 'react';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { COUNTRIES, DEFAULT_COUNTRY, joinPhone, splitPhone } from '@/utils/countries';
import { cn } from '@/lib/utils';

type PhoneInputProps = {
  /** Full number, e.g. "+256752738927". */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

/**
 * Phone field with a country picker, so nobody has to type "+256" by hand.
 * Emits the full international number, which is what the backend stores.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, onChange, id, name, placeholder = '752 738 927', disabled, required, className },
  ref,
) {
  const { country, national } = useMemo(() => splitPhone(value), [value]);

  return (
    <div className={cn('flex gap-2', className)}>
      <Select
        value={country.code}
        disabled={disabled}
        onValueChange={(code) => {
          const next = COUNTRIES.find((c) => c.code === code) || DEFAULT_COUNTRY;
          onChange(joinPhone(next, national));
        }}
      >
        <SelectTrigger className="w-[120px] shrink-0" aria-label="Country code">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span aria-hidden>{country.flag}</span>
              <span>+{country.dial}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-2">
                <span aria-hidden>{c.flag}</span>
                <span>{c.name}</span>
                <span className="text-muted-foreground">+{c.dial}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        ref={ref}
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        value={national}
        onChange={(e) => onChange(joinPhone(country, e.target.value))}
        className="flex-1"
      />
    </div>
  );
});
