import { Wrench, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';

type MaintenanceReq = { id: string; title: string; description?: string; status: string; priority?: string; created_at: string; property_title?: string; tenant_name?: string; };

interface Props {
  requests: MaintenanceReq[];
  loading: boolean;
  onStart: (id: string) => void;
  onResolve: (id: string) => void;
  sendingAction: string;
}

const statusBadge = (s: string) => ({
  open: 'status-pending', in_progress: 'status-uploaded', completed: 'status-confirmed', resolved: 'status-confirmed',
}[s] ?? 'status-pending');

export function MaintenanceTab({ requests, loading, onStart, onResolve, sendingAction }: Props) {
  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Maintenance Requests</h2>
          <p className="text-sm text-muted-foreground">
            {requests.filter(r => r.status === 'open' || r.status === 'in_progress').length} open · {requests.filter(r => r.status === 'resolved' || r.status === 'completed').length} resolved
          </p>
        </div>
      </div>
      {requests.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border rounded-2xl">
          <Wrench className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-xl font-display font-bold text-foreground">No maintenance requests</p>
          <p className="text-sm mt-2 text-muted-foreground">Tenants haven't submitted any requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const days = differenceInDays(new Date(r.created_at), new Date());
            return (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${r.priority === 'high' ? 'bg-destructive' : r.priority === 'medium' ? 'bg-gold' : 'bg-success'}`} />
                      <p className="font-semibold text-foreground">{r.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span>{r.property_title || 'Unknown property'}</span>
                      {r.tenant_name && <span>· {r.tenant_name}</span>}
                      <span>· {r.created_at ? format(new Date(r.created_at), 'MMM dd, yyyy') : ''}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusBadge(r.status === 'completed' ? 'confirmed' : r.status)}`}>
                      {r.status === 'completed' ? 'Resolved' : r.status === 'in_progress' ? 'In progress' : r.status}
                    </span>
                    <div className="flex gap-1.5">
                      {r.status === 'open' && (
                        <Button size="sm" className="gradient-primary text-primary-foreground h-7 text-xs gap-1"
                          disabled={sendingAction === `start-${r.id}`} onClick={() => onStart(r.id)}>
                          <Clock className="h-3 w-3" /> Start
                        </Button>
                      )}
                      {(r.status === 'open' || r.status === 'in_progress') && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                          disabled={sendingAction === `done-${r.id}`} onClick={() => onResolve(r.id)}>
                          <CheckCircle className="h-3 w-3" /> Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
