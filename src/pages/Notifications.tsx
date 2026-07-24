import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Bell, CheckCheck, DollarSign, Home, Wrench, FileText, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchNotifications();
  }, [user, authLoading]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  };

  const handleMarkRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({ title: 'All marked as read' });
  };

  const typeIcon = (type?: string) => {
    switch (type) {
      case 'payment': return { icon: DollarSign, bg: 'bg-success/10 text-success' };
      case 'lease': return { icon: FileText, bg: 'bg-primary/10 text-primary' };
      case 'maintenance': return { icon: Wrench, bg: 'bg-accent/10 text-accent' };
      case 'property': return { icon: Home, bg: 'bg-primary/10 text-primary' };
      default: return { icon: Bell, bg: 'bg-muted text-muted-foreground' };
    }
  };

  const unread = notifications.filter(n => !n.read).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-xl">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                {unread > 0 ? `${unread} unread` : 'All caught up'}
              </p>
            </div>
          </div>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2 rounded-lg">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Bell className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No notifications</h3>
            <p className="text-sm text-muted-foreground mt-1">You're all up to date.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm divide-y divide-border">
            {notifications.map(n => {
              const ti = typeIcon(n.type);
              const Icon = ti.icon;
              return (
                <div key={n.id} className={`flex items-start gap-4 p-4 ${n.read ? '' : 'bg-primary/[0.02]'}`}
                  onClick={() => !n.read && handleMarkRead(n.id)}>
                  <div className={`h-10 w-10 rounded-xl ${ti.bg} bg-opacity-10 flex items-center justify-center shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.read ? 'text-foreground' : 'font-bold text-foreground'}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                    </p>
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
