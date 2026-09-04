import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AgreementRenderer from '@/components/AgreementRenderer';
import { ArrowLeft, FileText, Download, CheckCircle, Clock, ThumbsUp, ThumbsDown, FileUp, History } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AgreementView() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agreementState, setAgreementState] = useState<any>(null);
  const [agreementContent, setAgreementContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [consenting, setConsenting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (leaseId) fetchAgreement();
  }, [user, authLoading, leaseId]);

  const fetchAgreement = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const [stateRes, contentRes] = await Promise.all([
        fetch(`${API_BASE}/agreements/${leaseId}`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch(`${API_BASE}/agreements/${leaseId}/content`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);
      if (stateRes.ok) setAgreementState(await stateRes.json());
      if (contentRes.ok) setAgreementContent(await contentRes.json());
    } catch { }
    setLoading(false);
  };

  const handleConsent = async (agree: boolean) => {
    if (!leaseId) return;
    setConsenting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const body = agree ? { signed_name: user?.email?.split('@')[0] || 'Tenant' } : {};
      const res = await fetch(`${API_BASE}/agreements/${leaseId}/consent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast({ title: agree ? 'Agreement accepted' : 'Response recorded' });
        fetchAgreement();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.detail || 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    }
    setConsenting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const doc = agreementState?.current_document;
  const tenantConsented = agreementState?.tenant?.consented;
  const managerConsented = agreementState?.manager?.consented;
  const fullySigned = tenantConsented && managerConsented;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Tenancy Agreement</h1>
            <p className="text-sm text-muted-foreground">Review and sign your tenancy agreement</p>
          </div>
        </div>

        {!doc ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <FileUp className="h-20 w-20 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold">No agreement uploaded yet</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Your manager hasn't uploaded a tenancy agreement document yet. You'll be able to review and sign it here once available.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="font-bold text-lg">Current Agreement</h2>
                  {doc.status && (
                    <Badge variant="outline" className={`text-xs capitalize ${
                      doc.status === 'executed' ? 'border-success/30 text-success bg-success/5' :
                      doc.status === 'draft' ? 'border-muted-foreground/30 text-muted-foreground bg-muted/50' :
                      'border-accent/30 text-accent bg-muted/60'
                    }`}>{doc.status.replace(/_/g, ' ')}</Badge>
                  )}
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-base">{doc.file_name || 'Agreement document'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {doc.created_at ? format(new Date(doc.created_at), 'MMMM dd, yyyy') : ''}
                      {doc.agreement_number && ` · #${doc.agreement_number}`}
                      {doc.version && ` · v${doc.version}`}
                    </p>
                  </div>
                  {doc.agreement_url && (
                    <a href={doc.agreement_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                      <Download className="h-4 w-4" /> View
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-accent">Signature Status</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    managerConsented ? 'bg-muted' : 'bg-muted'
                  }`}>
                    {managerConsented
                      ? <CheckCircle className="h-5 w-5 text-success" />
                      : <Clock className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Manager</p>
                    <p className={`text-sm font-semibold ${managerConsented ? 'text-success' : 'text-muted-foreground italic'}`}>
                      {managerConsented
                        ? `Signed ${agreementState.manager.consented_at ? format(new Date(agreementState.manager.consented_at), 'MMM dd, yyyy') : ''}`
                        : 'Not yet signed'}
                    </p>
                  </div>
                </div>
                <hr className="border-border ml-12" />
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    tenantConsented ? 'bg-muted' : 'bg-muted'
                  }`}>
                    {tenantConsented
                      ? <CheckCircle className="h-5 w-5 text-success" />
                      : <Clock className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">You (Tenant)</p>
                    <p className={`text-sm font-semibold ${tenantConsented ? 'text-success' : 'text-muted-foreground italic'}`}>
                      {tenantConsented
                        ? `Signed ${agreementState.tenant.consented_at ? format(new Date(agreementState.tenant.consented_at), 'MMM dd, yyyy') : ''}`
                        : 'Not yet signed'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {agreementContent && (
              <div>
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Agreement Details
                </h3>
                <AgreementRenderer content={agreementContent} />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/tenant/agreement/${leaseId}/history`)}
                className="flex-1 gap-2 rounded-xl">
                <History className="h-4 w-4" /> Version History
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => window.open(`${API_BASE}/agreements/${leaseId}/pdf`, '_blank')}
                className="flex-1 gap-2 rounded-xl">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </div>

            {fullySigned ? (
              <div className="bg-muted border border-success/20 rounded-xl p-6 text-center">
                <CheckCircle className="h-10 w-10 text-success mx-auto mb-2" />
                <h3 className="font-bold text-lg text-success">Agreement Fully Signed</h3>
                <p className="text-sm text-muted-foreground mt-1">Both parties have consented to this agreement.</p>
              </div>
            ) : !tenantConsented ? (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-sm mb-3">Your Response</h3>
                <p className="text-sm text-muted-foreground mb-4">Review the agreement document above, then indicate your response.</p>
                <div className="flex gap-3">
                  <Button onClick={() => handleConsent(true)} disabled={consenting}
                    className="flex-1 h-12 gap-2 rounded-xl font-semibold bg-success hover:bg-success/90 text-success-foreground">
                    <ThumbsUp className="h-5 w-5" /> {consenting ? 'Processing…' : 'I Agree'}
                  </Button>
                  <Button onClick={() => handleConsent(false)} disabled={consenting}
                    variant="outline" className="flex-1 h-12 gap-2 rounded-xl font-semibold border-destructive text-destructive hover:bg-muted">
                    <ThumbsDown className="h-5 w-5" /> Disagree
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted border border-accent/20 rounded-xl p-6 text-center">
                <Clock className="h-10 w-10 text-accent mx-auto mb-2" />
                <h3 className="font-bold text-lg text-accent">Awaiting Manager</h3>
                <p className="text-sm text-muted-foreground mt-1">You've signed. Waiting for the manager to sign.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
