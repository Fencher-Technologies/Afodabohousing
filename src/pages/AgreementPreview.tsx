import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Eye, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AgreementRenderer from '@/components/AgreementRenderer';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface LeaseData {
  id: number;
  property: { title: string; address: string };
  tenant: { full_name: string; phone: string };
  manager: { full_name: string; phone: string };
  rent_amount: number;
  deposit_amount: number;
  payment_period: string;
  start_date: string;
  end_date: string;
}

interface TemplateData {
  standard_clauses: Record<string, string>;
}

export default function AgreementPreview() {
  const { leaseId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [lease, setLease] = useState<LeaseData | null>(null);
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    loadData();
  }, [user, authLoading, leaseId]);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token}` };
      const [leaseRes, tmplRes] = await Promise.all([
        fetch(`${API_BASE}/tenancies/${leaseId}`, { headers }),
        fetch(`${API_BASE}/agreements/template`, { headers }),
      ]);
      if (!leaseRes.ok) throw new Error('Failed to load tenancy');
      if (!tmplRes.ok) throw new Error('Failed to load template');
      setLease(await leaseRes.json());
      setTemplate(await tmplRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/agreements/${leaseId}/build`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to generate agreement');
      }
      toast({ title: 'Agreement created successfully' });
      navigate(`/dashboard/manager/agreements/summary/${leaseId}`, { replace: true });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Preview Agreement</h1>
              <p className="text-sm text-muted-foreground">{lease?.property.title}</p>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span className="text-sm font-medium">Agreement Preview</span>
          </div>
          <AgreementRenderer leaseData={lease} template={template} />
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={generating}>
            <FileText className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Agreement'}
          </Button>
        </div>
      </div>
    </div>
  );
}
