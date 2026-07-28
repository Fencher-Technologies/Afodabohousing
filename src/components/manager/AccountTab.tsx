import { Button } from '@/components/ui/button';
import AvatarUpload from '@/components/AvatarUpload';

interface Props {
  user: { id: string; email?: string } | null;
  profile: { photo_url: string | null; full_name: string | null; email: string; phone: string } | null;
  onUpdatePhoto: (url: string) => void;
  onChangePassword: () => void;
}

export function AccountTab({ user, profile, onUpdatePhoto, onChangePassword }: Props) {
  return (
    <div className="max-w-lg">
      <h2 className="font-display font-bold text-xl mb-6">Profile</h2>
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <AvatarUpload
          userId={user?.id || ''}
          photoUrl={profile?.photo_url || null}
          fullName={profile?.full_name || ''}
          email={profile?.email || user?.email || ''}
          size="xl"
          onUpdate={onUpdatePhoto}
        />
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <p className="text-sm font-semibold text-foreground">{profile?.full_name || '—'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <p className="text-sm font-semibold text-foreground">{profile?.email || user?.email || '—'}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={onChangePassword}>
          Change Password
        </Button>
      </div>
    </div>
  );
}
