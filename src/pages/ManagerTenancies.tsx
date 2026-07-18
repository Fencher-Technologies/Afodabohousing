import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Search, ChevronRight, Home, User, CalendarDays, DollarSign, Phone } from 'lucide-react';
import { format } from 'date-fns';

export default function ManagerTenancies() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchLeases();
  }, [user, authLoading]);

  const fetchLeases = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('leases')
      .select('*, properties(*), tenants(*)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setLeases(data || []);
    }
    setLoading(false);
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-success/10 text-success border-success/20',
      pending: 'bg-accent/10 text-accent border-accent/20',
      expired: 'bg-destructive/10 text-destructive border-destructive/20',
      terminated: 'bg-muted text-muted-foreground border-border',
      inactive: 'bg-muted text-muted-foreground border-border',
    };
    return colors[status] || 'bg-muted text-muted-foreground border-border';
  };

  const filtered = leases.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    const t = l.tenants;
    return (t?.first_name || '').toLowerCase().includes(s) ||
      (t?.last_name || '').toLowerCase().includes(s) ||
      (t?.phone || '').toLowerCase().includes(s) ||
      (l.properties?.title || '').toLowerCase().includes(s);
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">Tenancies</h1>
            <p className="text-sm text-muted-foreground">{leases.length} total lease{leases.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => navigate('/dashboard/manager/tenancies/new')} className="gap-2 rounded-lg">
            <Plus className="h-4 w-4" /> New Tenancy
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tenants or properties..." value={search}
                onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg h-10" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold">No tenancies yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Create your first tenancy to get started.</p>
              <Button onClick={() => navigate('/dashboard/manager/tenancies/new')} className="mt-4 gap-2 rounded-lg">
                <Plus className="h-4 w-4" /> Create Tenancy
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(lease => {
                const t = lease.tenants || {};
                const p = lease.properties || {};
                return (
                  <button key={lease.id} onClick={() => navigate(`/dashboard/manager/tenancies/${lease.id}`)}
                    className="w-full flex items-start gap-4 p-4 text-left hover:bg-muted/30 transition-colors">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">{t.first_name || ''} {t.last_name || ''}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor(lease.status)}`}>
                          {lease.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Home className="h-3 w-3" /> {p.title || 'Unknown property'}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {lease.start_date ? format(new Date(lease.start_date), 'MMM dd') : '—'} - {lease.end_date ? format(new Date(lease.end_date), 'MMM dd, yyyy') : '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> UGX {(lease.monthly_rent || 0).toLocaleString()}/mo
                        </span>
                        {t.phone && (
                          <a href={`https://wa.me/${t.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-primary hover:underline">
                            <Phone className="h-3 w-3" /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-3" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
