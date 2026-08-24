import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Check, X } from 'lucide-react';

interface SignupFormData {
  email: string;
  password: string;
  role: 'tenant' | 'house_manager';
}

const API = import.meta.env.VITE_API_URL || '';

export default function EmailSignup() {
  const [form, setForm] = useState<SignupFormData>({
    email: '',
    password: '',
    role: 'tenant',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setForm({ email: '', password: '', role: 'tenant' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.role) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Signup failed');
      toast({ title: 'Account created', description: 'You can now sign in', variant: 'default' });
      navigate('/');
    } catch (e: any) {
      setError(e.detail || 'Signup failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-md mx-auto bg-card border border-border rounded-xl p-8 shadow-sm">
        <h2 className="font-display text-xl font-bold text-primary mb-6">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@email.com"
              required
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger />
              <SelectContent>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="house_manager">House Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
