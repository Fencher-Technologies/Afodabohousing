import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { isPropertyBoosted } from '@/services/property-boosts';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Plus, Building2, Search, MapPin, Sparkles,
  Home, CheckCircle2, XCircle
} from 'lucide-react';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type StatusFilter = 'all' | 'available' | 'occupied' | 'inactive';

const FILTERS: { id: StatusFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <Home className="h-3.5 w-3.5" /> },
  { id: 'available', label: 'Available', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { id: 'occupied', label: 'Occupied', icon: <XCircle className="h-3.5 w-3.5" /> },
  { id: 'inactive', label: 'Inactive', icon: <Building2 className="h-3.5 w-3.5" /> },
];

function formatUGX(amount: number) {
  const n = amount || 0;
  if (n >= 1000000) return `UGX ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `UGX ${(n / 1000).toFixed(0)}K`;
  return `UGX ${n.toLocaleString()}`;
}

const periodLabels: Record<string, string> = {
  monthly: '/mo',
  quarterly: '/qtr',
  annually: '/yr',
};

const statusColor: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  occupied: 'bg-amber-500/10 text-amber-600 border-amber-200',
  inactive: 'bg-muted text-muted-foreground border-border',
};

export default function ManagerProperties() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchProperties();
  }, [user]);

  const fetchProperties = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setProperties(data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = properties;
    if (statusFilter === 'available') {
      list = list.filter((p) => p.status === 'available');
    } else if (statusFilter === 'occupied') {
      list = list.filter((p) => p.status === 'occupied');
    } else if (statusFilter === 'inactive') {
      list = list.filter((p) => p.status === 'inactive');
    }
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.state || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.area || '').toLowerCase().includes(q)
    );
  }, [query, statusFilter, properties]);

  const boostedCount = properties.filter((p) => isPropertyBoosted(p)).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">Properties</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {properties.length} property{properties.length !== 1 ? 'ies' : 'y'}
              {boostedCount > 0 && ` · ${boostedCount} boosted`}
            </p>
          </div>
          <Button
            onClick={() => navigate('/dashboard/manager/properties/new')}
            className="gradient-primary text-primary-foreground gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            List New Property
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or district…"
            className="pl-9 h-10 bg-card border-border"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                statusFilter === f.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="h-14 w-14 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-foreground font-semibold text-lg">
              {query || statusFilter !== 'all' ? 'No matching properties' : 'No properties yet'}
            </p>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              {query || statusFilter !== 'all'
                ? 'Try a different search or filter.'
                : 'List your first property to get started.'}
            </p>
            {!query && statusFilter === 'all' && (
              <Button
                onClick={() => navigate('/dashboard/manager/properties/new')}
                className="gradient-primary text-primary-foreground gap-2"
              >
                <Plus className="h-4 w-4" />
                List New Property
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((property) => {
              const boosted = isPropertyBoosted(property);
              return (
                <div
                  key={property.id}
                  onClick={() => navigate(`/properties/${property.id}`)}
                  className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-semibold text-base text-foreground truncate group-hover:text-primary transition-colors">
                          {property.title}
                        </h3>
                        {boosted && (
                          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
                        <span className="truncate">
                          {[property.area, property.city, property.state]
                            .filter(Boolean)
                            .join(', ') || 'Uganda'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {formatUGX(property.rent_amount)}
                          <span className="text-muted-foreground font-normal text-xs ml-0.5">
                            {periodLabels[property.rent_period] || ''}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {property.bedrooms} bed · {property.bathrooms} bath
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'capitalize text-xs font-semibold border',
                          statusColor[property.status] || 'bg-muted text-muted-foreground'
                        )}
                      >
                        {property.status}
                      </Badge>
                      {boosted && (
                        <Badge className="bg-amber-400/15 text-amber-600 border-amber-300 text-xs font-semibold gap-1">
                          <Sparkles className="h-3 w-3" />
                          Boosted
                        </Badge>
                      )}
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
