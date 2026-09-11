import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPost, apiDelete } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export function usePropertyBookmarks(propertyIds: string[]) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  const idsKey = propertyIds.join('|');

  useEffect(() => {
    setBookmarks(new Set());
    if (!user || !idsKey) return undefined;
    let cancelled = false;
    apiGet<any[]>('/bookmarks')
      .then(data => {
        if (cancelled) return;
        const filtered = (data || []).map((r: any) => r.property_id).filter((id: string) => propertyIds.includes(id));
        setBookmarks(new Set(filtered));
      })
      .catch(() => {
        if (!cancelled) toast({ title: 'Error', description: 'Could not load bookmarks.', variant: 'destructive' });
      });
    return () => { cancelled = true; };
  }, [user, idsKey, toast]);

  const toggle = useCallback(async (propertyId: string, next: boolean) => {
    if (!user) return;
    setBookmarks(prev => {
      const n = new Set(prev);
      if (next) n.add(propertyId);
      else n.delete(propertyId);
      return n;
    });
    try {
      if (next) await apiPost(`/bookmarks/${propertyId}`);
      else await apiDelete(`/bookmarks/${propertyId}`);
    } catch {
      setBookmarks(prev => {
        const n = new Set(prev);
        if (next) n.delete(propertyId);
        else n.add(propertyId);
        return n;
      });
      toast({ title: 'Error', description: next ? 'Could not save bookmark.' : 'Could not remove bookmark.', variant: 'destructive' });
    }
  }, [user, toast]);

  return { bookmarks, toggle };
}
