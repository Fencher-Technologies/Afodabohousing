import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AgreementHistory() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<any[]>([]);
  const [activeVersion, setActiveVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (leaseId) fetchHistory();
  }, [user, authLoading, leaseId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${API_BASE}/agreements/${leaseId}/versions`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
        setActiveVersion(data.active_version || null);
      }
    } catch { }
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Version History</h1>
            <p className="text-sm text-muted-foreground">All versions of this agreement</p>
          </div>
        </div>

        {versions.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <FileText className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No versions yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Agreement versions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((v: any) => {
              const isActive = v.version === activeVersion;
              const fullySigned = v.tenant_signed && v.manager_signed;
              const statusColors: Record<string, string> = {
                draft: 'bg-muted text-muted-foreground border-border',
                awaiting_tenant_consent: 'bg-muted text-accent border-accent/20',
                awaiting_manager_consent: 'bg-muted text-accent border-accent/20',
                executed: 'bg-muted text-success border-success/20',
                superseded: 'bg-muted text-primary border-border',
                cancelled: 'bg-muted text-destructive border-destructive/20',
              };
              return (
                <div key={v.id} className={`bg-card border-2 rounded-xl p-5 ${
                  isActive ? 'border-primary' : 'border-border'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-base">
                          {v.agreement_number ? `#${v.agreement_number}` : `Version ${v.version}`}
                        </p>
                        {isActive && <Badge className="bg-muted text-primary border-border text-[10px]">Current</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {v.created_at ? format(new Date(v.created_at), 'MMM dd, yyyy HH:mm') : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs capitalize ${statusColors[v.status] || ''}`}>
                      {v.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      {v.manager_signed
                        ? <CheckCircle className="h-3.5 w-3.5 text-success" />
                        : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="text-muted-foreground">Manager {v.manager_signed ? `(${v.manager_signed_name})` : '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {v.tenant_signed
                        ? <CheckCircle className="h-3.5 w-3.5 text-success" />
                        : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="text-muted-foreground">Tenant {v.tenant_signed ? `(${v.tenant_signed_name})` : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
