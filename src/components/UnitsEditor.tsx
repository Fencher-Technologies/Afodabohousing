import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Plus, Trash2 } from 'lucide-react';

/**
 * UnitsEditor — a property's additional rental units.
 *
 * A property is its units: one or many, each with its own specs and price, and
 * the listing shows the range across them. The rent and deposit on the property
 * form become the first unit; this manages any others.
 *
 * Mirrors MobileAppAfodabo_v2/src/components/UnitsEditor.tsx so both clients
 * present the same model. The parent owns the list; this only renders and edits
 * it, so it works both before a property exists (create) and after (edit).
 */

export interface DraftUnit {
  id?: string;
  unit_number: string;
  floor_level?: string | null;
  bedrooms: number;
  bathrooms: number;
  /** rental_units carries these too; they were being defaulted to 1. */
  sitting_rooms?: number;
  kitchens?: number;
  rent_amount: number;
  security_deposit?: number | null;
  status: string;
  description?: string | null;
}

const STATUSES = [
  { label: 'Available', value: 'available' },
  { label: 'Occupied', value: 'occupied' },
  { label: 'Under maintenance', value: 'maintenance' },
];

const EMPTY: DraftUnit = {
  unit_number: '',
  floor_level: '',
  bedrooms: 1,
  bathrooms: 1,
  sitting_rooms: 1,
  kitchens: 1,
  rent_amount: 0,
  security_deposit: 0,
  status: 'available',
  description: '',
};

function money(amount: number | null | undefined, currency: string) {
  return `${currency} ${Number(amount ?? 0).toLocaleString()}`;
}

export function UnitsEditor({
  units,
  currency,
  onChange,
  onDelete,
}: {
  units: DraftUnit[];
  currency: string;
  onChange: (next: DraftUnit[]) => void;
  /** Called when a saved unit is removed so the parent can delete it server-side. */
  onDelete?: (unit: DraftUnit) => void;
}) {
  const { toast } = useToast();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftUnit>(EMPTY);

  const startAdd = () => { setDraft({ ...EMPTY }); setEditingIndex(-1); };
  const startEdit = (i: number) => { setDraft({ ...units[i] }); setEditingIndex(i); };
  const cancel = () => { setEditingIndex(null); setDraft(EMPTY); };

  const save = () => {
    const name = draft.unit_number.trim();
    if (!name) {
      toast({ title: 'Unit name required', description: 'Give the unit a name or number, e.g. “A1”.', variant: 'destructive' });
      return;
    }
    if (!draft.rent_amount || draft.rent_amount <= 0) {
      toast({ title: 'Rent required', description: 'Enter the monthly rent for this unit.', variant: 'destructive' });
      return;
    }
    const duplicate = units.some(
      (u, i) => i !== editingIndex && u.unit_number.trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      toast({ title: 'Duplicate unit', description: `You already have a unit called “${name}”.`, variant: 'destructive' });
      return;
    }

    const next = { ...draft, unit_number: name };
    if (editingIndex === -1) onChange([...units, next]);
    else if (editingIndex !== null) {
      const copy = [...units];
      copy[editingIndex] = next;
      onChange(copy);
    }
    cancel();
  };

  const remove = (i: number) => {
    const unit = units[i];
    if (!confirm(`Remove “${unit.unit_number}”?`)) return;
    onChange(units.filter((_, idx) => idx !== i));
    if (unit.id && onDelete) onDelete(unit);
  };

  const rents = units.map(u => Number(u.rent_amount)).filter(n => n > 0);
  const min = rents.length ? Math.min(...rents) : null;
  const max = rents.length ? Math.max(...rents) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Units</h3>
        {units.length > 0 && (
          <span className="text-sm font-semibold text-primary">
            {min === max ? money(min, currency) : `${money(min, currency)} – ${money(max, currency)}`}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Every property has at least one unit. Add one for the whole property, or
        one per space if you let it separately at different rents — the listing
        shows the range across them.
      </p>

      {units.map((unit, i) => (
        <div key={unit.id ?? `${unit.unit_number}-${i}`} className="bg-card border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{unit.unit_number}</p>
            <div className="flex items-center gap-2">
              <Badge variant={unit.status === 'available' ? 'secondary' : 'outline'}>{unit.status}</Badge>
              <button type="button" onClick={() => startEdit(i)} aria-label={`Edit ${unit.unit_number}`} className="p-1 hover:text-primary">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => remove(i)} aria-label={`Remove ${unit.unit_number}`} className="p-1 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="font-bold text-primary">{money(unit.rent_amount, currency)}</p>
          {!!unit.security_deposit && (
            <p className="text-xs text-muted-foreground">Deposit {money(unit.security_deposit, currency)}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {unit.bedrooms} bed · {unit.bathrooms} bath{unit.floor_level ? ` · ${unit.floor_level}` : ''}
          </p>
        </div>
      ))}

      {editingIndex !== null ? (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="font-semibold text-sm">{editingIndex === -1 ? 'Add unit' : 'Edit unit'}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Unit name or number</Label>
              <Input value={draft.unit_number} placeholder="e.g. A1" className="mt-1"
                onChange={e => setDraft({ ...draft, unit_number: e.target.value })} />
            </div>
            <div>
              <Label>Monthly rent ({currency})</Label>
              <Input type="number" min={0} value={draft.rent_amount || ''} className="mt-1"
                onChange={e => setDraft({ ...draft, rent_amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Deposit ({currency})</Label>
              <Input type="number" min={0} value={draft.security_deposit || ''} className="mt-1"
                onChange={e => setDraft({ ...draft, security_deposit: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Floor or block (optional)</Label>
              <Input value={draft.floor_level ?? ''} placeholder="e.g. Ground floor" className="mt-1"
                onChange={e => setDraft({ ...draft, floor_level: e.target.value })} />
            </div>
            <div>
              <Label>Bedrooms</Label>
              <Input type="number" min={0} value={draft.bedrooms} className="mt-1"
                onChange={e => setDraft({ ...draft, bedrooms: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Bathrooms</Label>
              <Input type="number" min={0} value={draft.bathrooms} className="mt-1"
                onChange={e => setDraft({ ...draft, bathrooms: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Sitting rooms</Label>
              <Input type="number" min={0} value={draft.sitting_rooms ?? 1} className="mt-1"
                onChange={e => setDraft({ ...draft, sitting_rooms: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Kitchens</Label>
              <Input type="number" min={0} value={draft.kitchens ?? 1} className="mt-1"
                onChange={e => setDraft({ ...draft, kitchens: Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={v => setDraft({ ...draft, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={cancel} className="flex-1">Cancel</Button>
            <Button type="button" onClick={save} className="flex-1">
              {editingIndex === -1 ? 'Add unit' : 'Save unit'}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={startAdd} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Add a unit
        </Button>
      )}
    </div>
  );
}
