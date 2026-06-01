import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Mic, Square, Loader2, Trash2 } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (url: string) => void;
  onClear: () => void;
  audioUrl?: string | null;
}

export default function VoiceRecorder({ onRecordingComplete, onClear, audioUrl }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timer.current);
        setDuration(0);

        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        if (blob.size < 100) return;

        setUploading(true);
        const fileName = `voice-notes/${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;
        const { error } = await supabase.storage.from('voice-notes').upload(fileName, blob, {
          contentType: 'audio/webm',
        });
        setUploading(false);

        if (error) { console.error('Voice upload failed:', error); return; }
        const { data: { publicUrl } } = supabase.storage.from('voice-notes').getPublicUrl(fileName);
        onRecordingComplete(publicUrl);
      };

      recorder.start(250);
      setRecording(true);
      let sec = 0;
      timer.current = setInterval(() => { sec++; setDuration(sec); }, 1000);
    } catch {
      // Permission denied or unsupported
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2">
      {audioUrl && !recording ? (
        <div className="flex items-center gap-2">
          <audio src={audioUrl} controls className="h-8 w-40" />
          <button type="button" onClick={onClear} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : recording ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span className="animate-pulse w-2 h-2 rounded-full bg-destructive" />
          <span>{formatTime(duration)}</span>
          <Button type="button" size="sm" variant="ghost" onClick={stopRecording} className="h-7 text-xs gap-1">
            <Square className="h-3 w-3" /> Stop
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={startRecording} disabled={uploading} className="h-8 gap-1.5 text-xs">
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mic className="h-3 w-3" />}
          {uploading ? 'Uploading...' : 'Voice Note'}
        </Button>
      )}
    </div>
  );
}
