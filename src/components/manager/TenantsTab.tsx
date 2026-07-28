import { Users, UserPlus, Bell, Upload, KeyRound, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';

type Lease = { id: string; status: string; start_date: string; end_date: string; monthly_rent?: number; tenant_name?: string; tenant_phone?: string; tenant_user_id?: string; property_title?: string; };

const statusBadge = (s: string) => ({
  pending: 'status-pending', active: 'status-confirmed', expired: 'status-pending', inactive: 'status-pending',
  terminated: 'status-rejected',
}[s] ?? 'status-pending');

interface Props {
  leases: Lease[];
  loading: boolean;
  onAddTenant: () => void;
  onSendReminder: (lease: Lease) => void;
  onUploadAgreement: (lease: Lease) => void;
  onGenerateOTP: (lease: Lease) => void;
  onDeactivate: (lease: Lease) => void;
  sendingAction: string;
}

export function TenantsTab({ leases, loading, onAddTenant, onSendReminder, onUploadAgreement, onGenerateOTP, onDeactivate, sendingAction }: Props) {
  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Tenants</h2>
          <p className="text-sm text-muted-foreground">{leases.filter(t => t.status === 'active').length} active · {leases.filter(t => t.status !== 'active').length} historical</p>
        </div>
        <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5 text-xs h-8" onClick={onAddTenant}>
          <UserPlus className="h-3.5 w-3.5" /> Add Tenant
        </Button>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="text-left py-3 px-4 font-semibold">Tenant</th>
                <th className="text-left py-3 px-4 font-semibold">Property</th>
                <th className="text-left py-3 px-4 font-semibold">Rent</th>
                <th className="text-left py-3 px-4 font-semibold">Expires</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leases.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-display font-semibold text-foreground">No tenants linked yet</p>
                  <p className="text-xs mt-1">Click "Add Tenant" to register a new tenant</p>
                </td></tr>
              ) : leases.map(t => {
                const days = differenceInDays(new Date(t.end_date), new Date());
                return (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors border-b border-border/30">
                    <td className="py-3.5 px-4">
                      <div className="text-sm font-semibold text-foreground">{t.tenant_name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{t.tenant_phone || ''}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm text-foreground">{t.property_title || '-'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-foreground">UGX {(t.monthly_rent || 0).toLocaleString()}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-sm text-foreground">{format(new Date(t.end_date), 'MMM dd, yyyy')}</div>
                      <div className={`text-xs font-semibold ${days < 0 ? 'text-destructive' : days <= 7 ? 'text-destructive' : days <= 14 ? 'text-accent' : 'text-muted-foreground'}`}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(t.status)}`}>{t.status}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex gap-1.5">
                        {t.tenant_phone && (
                          <a href={`https://wa.me/${t.tenant_phone.replace(/[^0-9]/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors">
                            WhatsApp
                          </a>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={sendingAction === `remind-${t.id}`} onClick={() => onSendReminder(t)}>
                          <Bell className="h-3 w-3" />{sendingAction === `remind-${t.id}` ? '...' : 'Remind'}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onUploadAgreement(t)}>
                          <Upload className="h-3 w-3" /> Agreement
                        </Button>
                        {t.tenant_user_id && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            disabled={sendingAction === `otp-${t.id}`} onClick={() => onGenerateOTP(t)}>
                            <KeyRound className="h-3 w-3" />{sendingAction === `otp-${t.id}` ? '...' : 'OTP'}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                          disabled={sendingAction === `deact-${t.id}`} onClick={() => onDeactivate(t)}>
                          <Ban className="h-3 w-3" />{sendingAction === `deact-${t.id}` ? '...' : 'Deactivate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
