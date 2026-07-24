import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, X, Loader2 } from 'lucide-react';

function hashColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [14, 182, 200, 340, 48, 260, 30];
  const hue = hues[Math.abs(hash) % hues.length];
  return `hsl(${hue}, 50%, ${40 + Math.abs(hash >> 4) % 20}%)`;
}

function initials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }
  return email.charAt(0).toUpperCase();
}

interface AvatarUploadProps {
  userId: string;
  photoUrl: string | null;
  fullName: string;
  email: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onUpdate?: (url: string | null) => void;
  readOnly?: boolean;
}

const SIZE_MAP = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export default function AvatarUpload({
  userId, photoUrl, fullName, email, size = 'md', onUpdate, readOnly,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const bgColor = hashColor(userId || email);
  const init = initials(fullName, email);
  const dimClass = SIZE_MAP[size];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setError('Only JPG, PNG, and WebP files are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File must be smaller than 2MB');
      return;
    }

    setUploading(true);
    try {
      const path = `avatars/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadErr } = await supabase.storage.from('avatars').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: dbErr } = await supabase.from('profiles').update({ photo_url: publicUrl }).eq('user_id', userId);
      if (dbErr) throw dbErr;

      if (photoUrl) {
        const oldPath = photoUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      onUpdate?.(publicUrl);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  const handleRemove = async () => {
    if (!photoUrl) return;
    setError(null);
    setUploading(true);
    try {
      const oldPath = photoUrl.split('/avatars/')[1];
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }
      const { error: dbErr } = await supabase.from('profiles').update({ photo_url: null }).eq('user_id', userId);
      if (dbErr) throw dbErr;
      onUpdate?.(null);
    } catch (err: any) {
      setError(err.message || 'Remove failed');
    }
    setUploading(false);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar className={`${dimClass} ring-2 ring-border`}>
          <AvatarImage src={photoUrl || undefined} alt={fullName || email} />
          <AvatarFallback style={{ backgroundColor: bgColor, color: '#fff' }}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : init}
          </AvatarFallback>
        </Avatar>
        {!readOnly && !uploading && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
          >
            <Camera className="h-3 w-3" />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      {!readOnly && photoUrl && !uploading && (
        <button
          type="button"
          onClick={handleRemove}
          className="flex items-center gap-1 text-xs text-destructive hover:underline"
        >
          <X className="h-3 w-3" /> Remove photo
        </button>
      )}
      {uploading && <p className="text-xs text-muted-foreground animate-pulse">Uploading...</p>}
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
