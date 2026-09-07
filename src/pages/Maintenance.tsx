import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Wrench } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || '';

type MaintenanceStatus = 'open' | 'scheduled' | 'completed' | 'cancelled';
type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';

interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id: string | null;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  scheduled_date: string | null;
  completed_date: string | null;
  /** Manager-only; the API returns null to tenants. */
  cost: number | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

/** Mirrors the backend's allowed transitions. */
const NEXT_STATUSES: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  open: ['scheduled', 'completed', 'cancelled'],
  scheduled: ['completed', 'cancelled', 'open'],
  completed: [],
  cancelled: [],
};

const PRIORITIES: { label: string; value: MaintenancePriority }[] = [
  { label: 'Low — can wait', value: 'low' },
  { label: 'Medium — needs attention', value: 'medium' },
  { label: 'High — affecting daily use', value: 'high' },
  { label: 'Urgent — unsafe or unusable', value: 'urgent' },
];

const STATUS_VARIANT: Record<MaintenanceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  scheduled: 'default',
  completed: 'secondary',
  cancelled: 'outline',
};

export default function Maintenance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading: authLoading } = useAuth();

  const isTenant = role === 'tenant';
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | MaintenanceStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Tenant submission
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/maintenance`, { headers: await authHeaders() });
      const data = res.ok ? await res.json() : { items: [] };
      setRequests(data?.items ?? []);
    } catch {
      setRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    fetchRequests();

    // A tenant raises requests against the home they rent, so the property is
    // taken from their active lease rather than chosen. Read through the API
    // rather than the Supabase client: the generated types are stale and do
    // not know the leases table.
    if (isTenant) {
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/leases?limit=20`, { headers: await authHeaders() });
          if (!res.ok) return;
          const data = await res.json();
          const active = (data?.items ?? []).find(
            (l: { status?: string; effective_status?: string }) =>
              l.effective_status === 'active' || l.status === 'active',
          );
          if (active) {
            setPropertyId(active.property_id);
            setTenantId(active.tenant_id ?? null);
          }
        } catch {
          // leaves propertyId null; the submit button stays disabled
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isTenant]);

  const visible = useMemo(
    () => (filter === 'all' ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter],
  );

  const moveTo = async (request: MaintenanceRequest, next: MaintenanceStatus) => {
    setBusyId(request.id);
    try {
      const res = await fetch(`${API_BASE}/maintenance/${request.id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({
          status: next,
          ...(next === 'completed'
            ? { completed_date: new Date().toISOString().slice(0, 10) }
            : {}),
        }),
      });
      if (res.ok) {
        toast({ title: 'Request updated', description: `Marked as ${next}.` });
        fetchRequests();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Could not update', description: err.detail || 'Please try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    }
    setBusyId(null);
  };

  const submitRequest = async () => {
    if (!title.trim() || !description.trim() || !propertyId) {
      toast({ title: 'Missing details', description: 'Add a title and description.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/maintenance`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          property_id: propertyId,
          tenant_id: tenantId,
          title: title.trim(),
          description: description.trim(),
          priority,
        }),
      });
      if (res.ok) {
        toast({ title: 'Request sent', description: 'Your property manager has been notified.' });
        setCreateOpen(false);
        setTitle('');
        setDescription('');
        setPriority('medium');
        fetchRequests();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Could not send', description: err.detail || 'Please try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const filters: { label: string; value: 'all' | MaintenanceStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Completed', value: 'completed' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {isTenant && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Report an issue
            </Button>
          )}
        </div>

        <div>
          <h1 className="font-bold text-xl">Maintenance</h1>
          <p className="text-sm text-muted-foreground">
            {isTenant
              ? 'Issues you have reported and how they are progressing.'
              : 'Requests raised by your tenants.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                filter === f.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <Wrench className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold">No maintenance requests</p>
            <p className="text-sm text-muted-foreground">
              {isTenant
                ? 'Report a problem with your home and your manager will see it here.'
                : 'Requests raised by your tenants will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{r.title}</p>
                  <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.description}</p>
                {r.photo_url && (
                  <img src={r.photo_url} alt="" className="w-full max-h-56 object-cover rounded-lg" />
                )}
                <p className="text-xs text-muted-foreground">
                  {r.priority} priority · raised {format(new Date(r.created_at), 'dd MMM yyyy')}
                  {r.scheduled_date ? ` · scheduled ${format(new Date(r.scheduled_date), 'dd MMM yyyy')}` : ''}
                  {r.completed_date ? ` · completed ${format(new Date(r.completed_date), 'dd MMM yyyy')}` : ''}
                </p>

                {/* Only ever present for a manager — the API redacts these for tenants. */}
                {r.cost != null && (
                  <p className="text-xs text-muted-foreground">Cost: {Number(r.cost).toLocaleString()}</p>
                )}
                {r.notes && <p className="text-sm bg-muted/30 rounded-lg p-3">{r.notes}</p>}

                {!isTenant && NEXT_STATUSES[r.status].length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {NEXT_STATUSES[r.status].map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === 'cancelled' ? 'ghost' : 'outline'}
                        disabled={busyId === r.id}
                        onClick={() => moveTo(r, s)}
                      >
                        {s === 'open' ? 'Reopen' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>
              Your manager will be notified and you will see the status here as it
              is scheduled and completed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="m-title">What is the problem?</Label>
              <Input
                id="m-title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Kitchen tap is leaking"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-desc">Describe it</Label>
              <Textarea
                id="m-desc" rows={4} value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Where it is, when it started, anything that helps"
              />
            </div>
            <div className="space-y-2">
              <Label>How urgent is it?</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as MaintenancePriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={submitRequest} disabled={submitting || !propertyId}>
              {submitting ? 'Sending…' : 'Send to manager'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
