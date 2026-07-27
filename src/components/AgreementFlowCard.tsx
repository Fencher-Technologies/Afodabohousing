import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { FileSignature, FileText, Plus, Eye, History, Download, XCircle, CheckCircle, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';
import { apiGet, apiPost } from '@/services/api';

interface AgreementFlowCardProps {
  leaseId: string;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
  awaiting_tenant_consent: { label: 'Awaiting Tenant Consent', className: 'bg-accent/10 text-accent border-accent/20' },
  awaiting_manager_consent: { label: 'Awaiting Manager Consent', className: 'bg-accent/10 text-accent border-accent/20' },
  executed: { label: 'Executed', className: 'bg-success/10 text-success border-success/20' },
  superseded: { label: 'Superseded', className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function AgreementFlowCard({ leaseId }: AgreementFlowCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<{ loading: boolean; data: any; error: boolean }>({ loading: true, data: null, error: false });
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useState(() => {
    if (!leaseId) return;
    apiGet(`/agreements/${leaseId}`).then(d => setState({ loading: false, data: d, error: false })).catch(() => setState(s => ({ ...s, loading: false, error: true })));
  });

  if (state.loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground">Loading agreement…</span>
        </div>
      </div>
    );
  }

  const consentDoc = state.data?.current_document ?? null;
  const consentContent = state.data?.content ?? null;
  const hasContent = !!consentContent;
  const hasDoc = !!consentDoc;
  const statusInfo = consentDoc?.status ? STATUS_LABEL[consentDoc.status] ?? { label: consentDoc.status, className: 'bg-muted text-muted-foreground border-border' } : null;
  const myConsent = state.data?.manager ?? null;
  const otherConsent = state.data?.tenant ?? null;
  const hasConsented = myConsent?.consent_status === 'approved';
  const otherHasConsented = otherConsent?.consent_status === 'approved';

  const handleSign = async () => {
    if (!agreed) { toast({ title: 'Review Required', description: 'Please read and agree to the terms before signing.', variant: 'destructive' }); return; }
    setShowConfirm(true);
  };

  const confirmSign = async () => {
    setShowConfirm(false);
    setSigning(true);
    try {
      await apiPost(`/agreements/${leaseId}/consent`, { signed_name: user?.email ?? 'Tenant' });
      toast({ title: 'Signed', description: 'Your signature has been recorded.' });
      const d = await apiGet(`/agreements/${leaseId}`);
      setState(s => ({ ...s, data: d }));
    } catch { toast({ title: 'Error', description: 'Could not record your signature.', variant: 'destructive' }); }
    setSigning(false);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiPost(`/agreements/${leaseId}/cancel`, {});
      toast({ title: 'Cancelled', description: 'Agreement has been cancelled.' });
      const d = await apiGet(`/agreements/${leaseId}`);
      setState(s => ({ ...s, data: d }));
    } catch { toast({ title: 'Error', description: 'Could not cancel agreement.', variant: 'destructive' }); }
    setCancelling(false);
  };

  // No agreement yet
  if (!hasDoc || !hasContent) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">Tenancy Agreement</span>
        </div>
        <div className="text-center py-6">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">{hasDoc && !hasContent ? 'Incomplete Agreement' : 'No Agreement Yet'}</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs mx-auto">
            {hasDoc && !hasContent
              ? 'This agreement was created but the content is missing. Cancel it and create a new one.'
              : 'Create a digital agreement for this tenancy using the in-app builder.'}
          </p>
          <Button size="sm" onClick={() => navigate(`/dashboard/manager/agreements/create/${leaseId}`)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {hasDoc && !hasContent ? 'Cancel & Create New' : 'Create Agreement'}
          </Button>
        </div>
      </div>
    );
  }

  const agreementNumber = consentDoc?.agreement_number ?? consentContent?.agreement_number ?? null;
  const genVersion = consentDoc?.version ?? consentContent?.version ?? 1;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FileSignature className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">Tenancy Agreement</span>
        </div>
        {statusInfo && <Badge className={`text-xs ${statusInfo.className}`}>{statusInfo.label}</Badge>}
      </div>

      {(agreementNumber || genVersion) && (
        <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
          {agreementNumber && <span className="font-semibold">No. {agreementNumber}</span>}
          <span className="font-semibold">Version {genVersion}</span>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/tenant/agreement/${leaseId}`)} className="gap-1.5 text-xs">
          <Eye className="h-3.5 w-3.5" /> View Agreement
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/tenant/agreement/${leaseId}/history`)} className="gap-1.5 text-xs">
          <History className="h-3.5 w-3.5" /> History
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/manager/agreements/create/${leaseId}?mode=edit`)} className="gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button variant="outline" size="sm"
          onClick={() => window.open(`${API_BASE}/agreements/${leaseId}/pdf`, '_blank')}
          className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" /> PDF
        </Button>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Manager</p>
          {hasConsented ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase">{myConsent?.signed_name || 'Manager'}</p>
                {myConsent?.signed_at && <p className="text-[10px] text-muted-foreground">Signed {new Date(myConsent.signed_at).toLocaleString()}</p>}
                <p className="text-[10px] text-muted-foreground">Consent v{myConsent?.consent_version ?? '—'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground italic">Awaiting your signature</p>
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={agreed} onCheckedChange={v => setAgreed(v as boolean)} />
                <span className="text-xs text-muted-foreground">I have read and agree to the terms of this tenancy agreement</span>
              </label>
              <Button size="sm" onClick={handleSign} disabled={!agreed || signing} className="gap-1.5">
                {signing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />}
                Agree & Sign
              </Button>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Tenant</p>
          {otherHasConsented ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase">{otherConsent?.signed_name || 'Tenant'}</p>
                {otherConsent?.signed_at && <p className="text-[10px] text-muted-foreground">Signed {new Date(otherConsent.signed_at).toLocaleString()}</p>}
                <p className="text-[10px] text-muted-foreground">Consent v{otherConsent?.consent_version ?? '—'}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Awaiting signature</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
        <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling} className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
          {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
          Cancel
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Signature</AlertDialogTitle>
            <AlertDialogDescription>
              Your name will be recorded as:<br />
              <strong className="uppercase">{user?.email ?? 'Unknown'}</strong><br /><br />
              This constitutes your electronic signature and is legally binding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSign} disabled={signing}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
