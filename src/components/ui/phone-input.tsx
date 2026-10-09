import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { COUNTRIES, DEFAULT_COUNTRY, joinPhone, splitPhone, type Country } from '@/utils/countries';
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
 *
 * The chosen country is held in state rather than re-derived from the value on
 * every render. Deriving it broke the field for anyone outside Uganda, in two
 * ways the business reported as "the drop down does not work":
 *
 *   * An empty number has no country in it. Picking a country before typing
 *     emitted "", which read back as the default, so the selection snapped
 *     straight back to Uganda and a foreign number was then saved as +256.
 *   * 49 of the 242 countries share a dial code with another (+1 alone covers
 *     25). Reading the country back out of the digits always returned the
 *     first match, so choosing Canada showed United States, and choosing
 *     Kazakhstan showed Russia.
 *
 * The list is searchable because scrolling 242 entries to reach Zimbabwe is
 * its own kind of broken.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, onChange, id, name, placeholder = '752 738 927', disabled, required, className },
  ref,
) {
  const parsed = useMemo(() => splitPhone(value), [value]);
  const [country, setCountry] = useState<Country>(parsed.country);
  const [open, setOpen] = useState(false);

  // Follow the value only when it changes from OUTSIDE, such as a form
  // loading a saved number. Syncing on every render would undo the user's
  // pick: an empty field parses as the default, so choosing Kenya before
  // typing would be reset to Uganda on the very next render.
  const lastValue = useRef(value);
  useEffect(() => {
    if (value === lastValue.current) return;
    lastValue.current = value;
    // A cleared field keeps whatever country was chosen.
    if (!value) return;
    // A value that merely agrees with the current dial code is left alone, so
    // an explicit pick of Canada is not overwritten by the United States
    // simply because both are +1.
    if (parsed.country.dial !== country.dial) setCountry(parsed.country);
  }, [value, parsed.country, country.dial]);

  const national = parsed.national;

  const pickCountry = (next: Country) => {
    setCountry(next);
    setOpen(false);
    // Only re-emit once there are digits; an empty field stays empty rather
    // than becoming a bare dial code the backend would reject.
    if (national) onChange(joinPhone(next, national));
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`Country code: ${country.name} +${country.dial}`}
            disabled={disabled}
            className="w-[128px] shrink-0 justify-between px-3 font-normal"
          >
            <span className="flex items-center gap-1.5 truncate">
              <span aria-hidden>{country.flag}</span>
              <span>+{country.dial}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[290px] p-0" align="start">
          <Command
            filter={(itemValue, search) =>
              itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder="Search country or code..." />
            <CommandList className="max-h-72">
              <CommandEmpty>No country matches.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((c) => (
                  <CommandItem
                    // Searching matches the name, the code and the dial code,
                    // so "Kenya", "KE" and "254" all find the same row.
                    key={c.code}
                    value={`${c.name} ${c.code} ${c.dial}`}
                    onSelect={() => pickCountry(c)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        c.code === country.code ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span aria-hidden className="mr-2">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="ml-2 text-muted-foreground">+{c.dial}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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

export { DEFAULT_COUNTRY };
