/**
 * DatePickerField (web): click-to-open calendar popup, mirroring the mobile
 * app's DatePickerField. Values are local-timezone YYYY-MM-DD strings.
 */
import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function parseISO(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toISO(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

interface DatePickerFieldProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
  /** Disallow dates after today (e.g. payment dates). */
  disableFuture?: boolean;
  /** Dates before this ISO date are disabled. */
  min?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function DatePickerField({
  value, onChange, placeholder = 'Select date', className, disableFuture, min, disabled, required, id,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const minDate = min ? parseISO(min) : undefined;
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-required={required}
          className={cn(
            'mt-1 h-11 w-full justify-start gap-2 px-3 text-left font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">{selected ? format(selected, 'd MMM yyyy') : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? minDate}
          onSelect={(d) => { if (d) { onChange(toISO(d)); setOpen(false); } }}
          disabled={(d) => (disableFuture && d > today) || (!!minDate && d < minDate)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePickerField;
