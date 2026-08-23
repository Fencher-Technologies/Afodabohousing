import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Plus, X, Check, Loader2, Save } from 'lucide-react';
import { apiGet, apiPost } from '@/services/api';

interface StandardClause {
  key: string;
  title: string;
  content: string;
  enabled: boolean;
}

interface CustomClause {
  title: string;
  content: string;
}

export default function ManagerCreateAgreement() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = searchParams.get('mode') === 'edit';
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [standardClauses, setStandardClauses] = useState<StandardClause[]>([]);
  const [customClauses, setCustomClauses] = useState<CustomClause[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    loadTemplate();
  }, [user, authLoading]);

  const loadTemplate = async () => {
    try {
      const [template, existingContent] = await Promise.all([
        apiGet('/agreements/template').catch(() => null),
        isEdit ? apiGet(`/agreements/${leaseId}/content`).catch(() => null) : Promise.resolve(null),
      ]);

      if (isEdit && existingContent?.standard_clauses) {
        setStandardClauses(existingContent.standard_clauses.map((c: any) => ({ key: c.key, title: c.title, content: c.content, enabled: c.enabled })));
        setCustomClauses(existingContent.custom_clauses || []);
      } else if (template?.standard_clauses) {
        setStandardClauses(template.standard_clauses.map((c: any) => ({ key: c.key, title: c.title, content: c.content, enabled: c.optional ? c.enabled_by_default : true })));
      }
      setInitialized(true);
    } catch { toast({ title: 'Error', description: 'Failed to load agreement template', variant: 'destructive' }); }
    setLoading(false);
  };

  const toggleClause = useCallback((key: string) => {
    setStandardClauses(prev => prev.map(c => c.key === key ? { ...c, enabled: !c.enabled } : c));
  }, []);

  const updateClauseContent = useCallback((key: string, content: string) => {
    setStandardClauses(prev => prev.map(c => c.key === key ? { ...c, content } : c));
  }, []);

  const addCustomClause = () => {
    setCustomClauses(prev => [...prev, { title: '', content: '' }]);
  };

  const updateCustomClause = (index: number, field: 'title' | 'content', value: string) => {
    setCustomClauses(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const removeCustomClause = (index: number) => {
    setCustomClauses(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!leaseId) return;
    setSaving(true);
    try {
      await apiPost(`/agreements/${leaseId}/${isEdit ? 'edit' : 'build'}`, {
        standard_clauses: standardClauses.map(c => ({ key: c.key, title: c.title, content: c.content, enabled: c.enabled })),
        custom_clauses: customClauses.filter(c => c.title.trim() && c.content.trim()),
      });
      toast({ title: isEdit ? 'Agreement updated' : 'Agreement created' });
      navigate(`/dashboard/manager/tenancies/${leaseId}`);
    } catch (e: any) { toast({ title: 'Error', description: e.message || 'Failed to save agreement', variant: 'destructive' }); }
    setSaving(false);
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
            <h1 className="font-bold text-xl">{isEdit ? 'Edit Agreement' : 'Create Agreement'}</h1>
            <p className="text-sm text-muted-foreground">Configure clauses for this tenancy agreement</p>
          </div>
        </div>

        {/* Standard Clauses */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Standard Clauses
          </h2>
          {standardClauses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No standard clauses available.</p>
          ) : (
            <div className="space-y-4">
              {standardClauses.map(clause => (
                <div key={clause.key} className={`rounded-xl border p-4 ${clause.enabled ? 'border-border bg-card' : 'border-dashed border-muted-foreground/30 bg-muted/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={clause.enabled} onCheckedChange={() => toggleClause(clause.key)} />
                      <span className={`font-semibold text-sm ${clause.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>{clause.title}</span>
                    </div>
                    {clause.enabled && <Badge variant="outline" className="text-[10px] bg-success/5 text-success border-success/20">Included</Badge>}
                  </div>
                  {clause.enabled && (
                    <Textarea value={clause.content} onChange={e => updateClauseContent(clause.key, e.target.value)}
                      className="text-xs mt-2 min-h-[60px]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom Clauses */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Custom Clauses
            </h2>
            <Button variant="outline" size="sm" onClick={addCustomClause} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Clause
            </Button>
          </div>
          {customClauses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No custom clauses. Add one to include specific terms.</p>
          ) : (
            <div className="space-y-4">
              {customClauses.map((clause, i) => (
                <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Clause {i + 1}</span>
                    <button onClick={() => removeCustomClause(i)} className="text-destructive hover:text-destructive/80">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Input value={clause.title} onChange={e => updateCustomClause(i, 'title', e.target.value)} placeholder="Clause title" className="text-sm" />
                  <Textarea value={clause.content} onChange={e => updateCustomClause(i, 'content', e.target.value)} placeholder="Clause content" className="text-xs min-h-[80px]" />
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving || !initialized} className="w-full h-12 rounded-xl font-bold text-base gap-2 bg-gold hover:bg-gold/90 text-gold-foreground">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {saving ? 'Saving…' : 'Save Agreement'}
        </Button>
      </div>
    </div>
  );
}
