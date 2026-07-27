import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
}

export default function SearchInput({ value, onChange, placeholder = 'Search…', debounce = 300 }: SearchInputProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => { if (local !== value) onChange(local); }, debounce);
    return () => clearTimeout(timer);
  }, [local, debounce]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input value={local} onChange={e => setLocal(e.target.value)} placeholder={placeholder}
        className="pl-10 rounded-xl h-11" />
    </div>
  );
}
