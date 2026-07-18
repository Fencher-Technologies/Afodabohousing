import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Heart, MapPin, Home, DollarSign, Search, Star } from 'lucide-react';
import { addBookmark, removeBookmark } from '@/services/bookmarks';

export default function TenantBrowse() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [properties, setProperties] = useState<any[]>([]);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'bookmarked'>('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    const { data: props } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: false });
    setProperties(props || []);

    const { data: bm } = await supabase
      .from('bookmarks')
      .select('property_id')
      .eq('user_id', user?.id);
    if (bm) setBookmarked(new Set(bm.map(b => b.property_id)));

    setLoading(false);
  };

  const toggleBookmark = async (propertyId: string) => {
    try {
      if (bookmarked.has(propertyId)) {
        await removeBookmark(propertyId);
        setBookmarked(prev => { const n = new Set(prev); n.delete(propertyId); return n; });
        toast({ title: 'Removed from favorites' });
      } else {
        await addBookmark(propertyId);
        setBookmarked(prev => new Set(prev).add(propertyId));
        toast({ title: 'Added to favorites' });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not update favorite', variant: 'destructive' });
    }
  };

  const filtered = properties.filter(p => {
    if (filter === 'bookmarked' && !bookmarked.has(p.id)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.title || '').toLowerCase().includes(s) ||
      (p.state || '').toLowerCase().includes(s) ||
      (p.area || '').toLowerCase().includes(s);
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/tenant')} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Browse Properties</h1>
            <p className="text-sm text-muted-foreground">
              {filter === 'bookmarked' ? `${bookmarked.size} favorites` : `${filtered.length} available`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by title, district, area..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg h-10" />
          </div>
          <div className="flex gap-2">
            {(['all', 'available', 'bookmarked'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${
                  filter === f ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}>
                {f === 'all' ? 'All' : f === 'available' ? 'Available' : `Favorites (${bookmarked.size})`}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Home className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold">
              {filter === 'bookmarked' ? 'No favorites yet' : 'No properties found'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'bookmarked' ? 'Tap the heart icon on any property to save it here.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-40 bg-muted">
                  {p.images && p.images.length > 0 ? (
                    <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      <Home className="h-12 w-12" />
                    </div>
                  )}
                  <button onClick={() => toggleBookmark(p.id)}
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors">
                    <Heart className={`h-4 w-4 ${bookmarked.has(p.id) ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-foreground truncate">{p.title}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {p.state}{p.area ? `, ${p.area}` : ''}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="font-bold text-primary">UGX {(p.rent_amount || 0).toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/{p.rent_period || 'mo'}</span></p>
                    <p className="text-xs text-muted-foreground">{p.bedrooms} bed · {p.bathrooms} bath</p>
                  </div>
                  {p.amenities && p.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {p.amenities.slice(0, 3).map((a: string) => (
                        <span key={a} className="text-xs bg-primary/5 text-primary px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                      {p.amenities.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{p.amenities.length - 3}</span>
                      )}
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="w-full mt-3 rounded-lg h-9"
                    onClick={() => navigate(`/properties/${p.id}`)}>
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
