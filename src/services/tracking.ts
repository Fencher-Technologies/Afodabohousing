import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) sessionId = crypto.randomUUID();
  return sessionId;
}

export async function trackPageView(path: string): Promise<void> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${API_BASE}/tracking/page-view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        path,
        referrer: document.referrer || null,
        session_id: getSessionId(),
      }),
    });
  } catch {}
}

export function usePageViewTracking() {
  const location = useLocation();
  useEffect(() => { trackPageView(location.pathname); }, [location.pathname]);
}
