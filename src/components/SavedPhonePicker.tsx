import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Check } from 'lucide-react';

interface SavedPhone {
  id: string;
  phone: string;
  usage_count: number;
}

interface SavedPhonePickerProps {
  token: string;
  value: string;
  onChange: (val: string) => void;
  onSave: (phone: string) => void;
  profilePhone?: string;
}

export default function SavedPhonePicker({ token, value, onChange, onSave, profilePhone }: SavedPhonePickerProps) {
  const [saved, setSaved] = useState<SavedPhone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { listSavedPhones } = await import('@/services/saved-phones');
      const list = await listSavedPhones(token);
      const hasProfile = profilePhone && !list.some(s => s.phone === profilePhone);
      setSaved(hasProfile ? [...list, { id: 'profile', phone: profilePhone!, usage_count: 999 }] : list);
      setLoading(false);
    })();
  }, [token]);

  if (loading || saved.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Saved numbers</p>
      <div className="flex flex-wrap gap-2">
        {saved.map(s => (
          <Button
            key={s.id}
            type="button"
            variant={value === s.phone ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              onChange(s.phone);
              onSave(s.phone);
            }}
          >
            <Phone className="h-3 w-3" />
            {s.phone}
            {value === s.phone && <Check className="h-3 w-3" />}
          </Button>
        ))}
      </div>
    </div>
  );
}
