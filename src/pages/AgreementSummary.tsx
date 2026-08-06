import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, FileText, ArrowLeft, Home, AlertCircle } from 'lucide-react';

interface AgreementData {
  id: number;
  agreement_number: string;
  lease_id: number;
}

export default function AgreementSummary() {
  const { leaseId } = useParams();
  const navigate = useNavigate();
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    fetchAgreement();
  }, [leaseId]);

  async function fetchAgreement() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/agreements/${leaseId}/content`);
      if (!res.ok) throw new Error('Failed to load agreement');
      const data = await res.json();
      setAgreement(data);
      setIsNew(!data.updated_at || data.created_at === data.updated_at);
    } catch {
      setAgreement(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-md mx-auto space-y-6">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-6 text-center space-y-8">
        <div className="pt-12">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold mb-2">
            {agreement ? (isNew ? 'Agreement Created!' : 'Agreement Updated!') : 'Processing...'}
          </h1>
          <p className="text-muted-foreground">
            {agreement
              ? `Agreement #${agreement.agreement_number} has been ${isNew ? 'created' : 'updated'} successfully.`
              : 'Your agreement is being processed.'}
          </p>
        </div>

        {agreement && (
          <div className="bg-muted rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Agreement Number</span>
              <span className="font-semibold">{agreement.agreement_number}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="text-green-600 font-medium">Draft</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button className="w-full" onClick={() => navigate(`/dashboard/manager/agreements/create/${leaseId}`)}>
            <FileText className="h-4 w-4 mr-2" />
            View / Edit Agreement
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate(`/dashboard/manager/tenancies/${leaseId}`)}>
            <Home className="h-4 w-4 mr-2" />
            Back to Tenancy
          </Button>
        </div>
      </div>
    </div>
  );
}
