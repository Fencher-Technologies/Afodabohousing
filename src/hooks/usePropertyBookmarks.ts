import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Batched bookmark state for a list page: ONE query for the whole page
// instead of one query per card.
export function usePropertyBookmarks(propertyIds: string[]) {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  const idsKey = propertyIds.join('|');

  useEffect(() => {
    setBookmarks(new Set());
    if (!user || !idsKey) return undefined;
    let cancelled = false;
    supabase
      .from('property_bookmarks')
      .select('property_id')
      .eq('user_id', user.id)
      .in('property_id', propertyIds)
      .then(({ data }) => {
        if (!cancelled) setBookmarks(new Set((data || []).map(r => r.property_id)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, idsKey]);

  const toggle = useCallback(async (propertyId: string, next: boolean) => {
    if (!user) return;
    if (next) {
      await supabase.from('property_bookmarks').insert({ user_id: user.id, property_id: propertyId });
    } else {
      await supabase.from('property_bookmarks').delete().eq('user_id', user.id).eq('property_id', propertyId);
    }
    setBookmarks(prev => {
      const nextSet = new Set(prev);
      if (next) nextSet.add(propertyId);
      else nextSet.delete(propertyId);
      return nextSet;
    });
  }, [user]);

  return { bookmarks, toggle };
}