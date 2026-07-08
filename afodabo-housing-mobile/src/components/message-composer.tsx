import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/auth-context';
import { uploadVoiceNote } from '../services/uploads';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { Button } from './button';
import { InputField } from './input-field';

interface MessageComposerProps {
  disabled?: boolean;
  helperText?: string;
  loading?: boolean;
  onSend: (params: { text?: string; voiceNoteUrl?: string }) => Promise<void>;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MessageComposer({
  disabled = false,
  helperText,
  loading = false,
  onSend,
}: MessageComposerProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  async function handleStartRecording() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch {
      setIsRecording(false);
    }
  }

  async function handleStopRecording() {
    if (!recordingRef.current) {
      return;
    }

    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const recording = recordingRef.current;
      recordingRef.current = null;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri || !user?.id) {
        return;
      }

      setIsUploading(true);
      const url = await uploadVoiceNote(user.id, {
        uri,
        name: `voice-note-${Date.now()}.m4a`,
        mimeType: 'audio/mp4',
      });
      setVoiceNoteUrl(url);
    } catch {
      setVoiceNoteUrl(null);
    } finally {
      setIsUploading(false);
      setElapsed(0);
    }
  }

  function handleClearVoiceNote() {
    setVoiceNoteUrl(null);
  }

  async function handleSend() {
    const text = message.trim();

    if (!text && !voiceNoteUrl) {
      return;
    }

    await onSend({ text: text || undefined, voiceNoteUrl: voiceNoteUrl ?? undefined });
    setMessage('');
    setVoiceNoteUrl(null);
  }

  const canSend = !disabled && !loading && !isRecording && !isUploading && (message.trim() || voiceNoteUrl);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Send a Message</Text>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

      <View style={styles.inputRow}>
        <View style={styles.inputField}>
          <InputField
            label="Message"
          multiline
          onChangeText={setMessage}
          placeholder="Write your message..."
          value={message}
          />
        </View>
        <Pressable
          disabled={isUploading}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
          style={[styles.micButton, isRecording ? styles.micActive : null]}
        >
          <Ionicons
            color={isRecording ? colors.error : colors.primary}
            name={isRecording ? 'stop-circle' : isUploading ? 'cloud-upload-outline' : 'mic-outline'}
            size={24}
          />
        </Pressable>
      </View>

      {isRecording || isUploading ? (
        <View style={styles.recordingStatus}>
          <View style={[styles.recordingDot, isRecording ? styles.recordingDotActive : null]} />
          <Text style={styles.recordingText}>
            {isRecording ? `Recording ${formatTime(elapsed)}` : 'Uploading voice note...'}
          </Text>
        </View>
      ) : null}

      {voiceNoteUrl && !isUploading ? (
        <View style={styles.voiceNotePill}>
          <Ionicons color={colors.primary} name="musical-note" size={18} />
          <Text style={styles.voiceNotePillText}>Voice note recorded</Text>
          <Pressable
            onPress={handleClearVoiceNote}
            style={styles.clearVoiceNote}
          >
            <Ionicons color={colors.textMuted} name="close-circle" size={18} />
          </Pressable>
        </View>
      ) : null}

      <Button
        disabled={!canSend}
        onPress={handleSend}
      >
        {loading ? 'Sending...' : 'Send Message'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  clearVoiceNote: {
    padding: 2,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  inputField: {
    flex: 1,
  },
  inputRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  micActive: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error,
  },
  micButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  recordingDot: {
    backgroundColor: colors.textMuted,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  recordingDotActive: {
    backgroundColor: colors.error,
  },
  recordingStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  recordingText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  voiceNotePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  voiceNotePillText: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
});
