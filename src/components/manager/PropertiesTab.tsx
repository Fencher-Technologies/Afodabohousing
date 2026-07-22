import { Home, Plus, Eye, Pencil, Trash2, TrendingUp, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Property = { id: string; title: string; status: string; rent_amount: number; monthly_rent?: number; property_type: string; state?: string | null; city?: string | null; area?: string | null; };

const statusBadge = (s: string) => ({
  pending: 'status-pending', uploaded: 'status-uploaded', confirmed: 'status-confirmed',
  rejected: 'status-rejected', active: 'status-confirmed', occupied: 'status-uploaded',
  available: 'status-confirmed', inactive: 'status-pending',
}[s] ?? 'status-pending');

interface Props {
  properties: Property[];
  loading: boolean;
  onAddProperty: () => void;
  onEditProperty: (p: Property) => void;
  onDeleteProperty: (p: Property) => void;
  onToggleStatus: (p: Property) => void;
  onViewProperty: (id: string) => void;
  onBoostProperty: (id: string) => void;
  sendingAction: string;
}

export function PropertiesTab({ properties, loading, onAddProperty, onEditProperty, onDeleteProperty, onToggleStatus, onViewProperty, onBoostProperty, sendingAction }: Props) {
  const available = properties.filter(p => p.status === 'available').length;
  const occupied = properties.filter(p => p.status === 'occupied').length;

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">My Properties</h2>
          <p className="text-sm text-muted-foreground">{properties.length} listings · {available} available · {occupied} occupied</p>
        </div>
        <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5 text-xs h-8" onClick={onAddProperty}>
          <Plus className="h-3.5 w-3.5" /> Add Property
        </Button>
      </div>
      {properties.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border rounded-2xl">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-xl font-display font-bold text-foreground">No properties listed yet</p>
          <p className="text-sm mt-2 text-muted-foreground">Click "Add Property" to publish your first listing</p>
          <Button className="mt-4 gradient-primary text-primary-foreground" onClick={onAddProperty}>
            <Plus className="h-4 w-4 mr-2" /> Add Property
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Property</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Rent / Period</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors last:border-0">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Home className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate max-w-[200px]">{p.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.property_type.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{p.state || p.city}{p.area ? ` · ${p.area}` : ''}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-foreground">UGX {(p.rent_amount || 0).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ml-1 capitalize">/{p.rent_period?.slice(0, 2)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex gap-1.5 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onViewProperty(p.id)}>
                          <Eye className="h-3 w-3" />View
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onEditProperty(p)}>
                          <Pencil className="h-3 w-3" />Edit
                        </Button>
                        <Button size="sm" variant={p.status !== 'inactive' ? 'secondary' : 'default'}
                          className={`h-7 text-xs ${p.status === 'inactive' ? 'gradient-primary text-primary-foreground' : ''}`}
                          disabled={!!sendingAction} onClick={() => onToggleStatus(p)}>
                          {sendingAction === p.id ? '...' : p.status !== 'inactive' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onBoostProperty(p.id)}>
                          <TrendingUp className="h-3 w-3" />Boost
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => onDeleteProperty(p)}>
                          <Trash2 className="h-3 w-3" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
