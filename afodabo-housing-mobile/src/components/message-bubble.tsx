import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MessageRow } from '../types/supabase';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatDateTimeLabel } from '../utils/format';

interface DisplayMessage extends MessageRow {
  receiver_name?: string;
  sender_name?: string;
}

interface MessageBubbleProps {
  message: DisplayMessage;
  userId: string;
}

function formatDuration(seconds: number) {
  const totalSeconds = Math.floor(seconds);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AudioPlayer({ uri, outgoing }: { uri: string; outgoing: boolean }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const prevDidJustFinish = useRef(false);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (status.didJustFinish && !prevDidJustFinish.current) {
      prevDidJustFinish.current = true;
    }
    if (!status.didJustFinish) {
      prevDidJustFinish.current = false;
    }
  }, [status.didJustFinish]);

  function handlePress() {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  return (
    <View style={[styles.audioPlayer, outgoing ? styles.audioOutgoing : styles.audioIncoming]}>
      <Pressable onPress={handlePress} style={styles.playButton}>
        <Ionicons
          color={colors.primary}
          name={status.playing ? 'pause-circle' : 'play-circle'}
          size={28}
        />
      </Pressable>
      <View style={styles.waveformContainer}>
        <View style={styles.waveformTrack}>
          <View
            style={[
              styles.waveformFill,
              { width: `${Math.min(progress * 100, 100)}%` },
            ]}
          />
        </View>
      </View>
      <Text style={[styles.audioTime, outgoing ? styles.audioTimeOutgoing : styles.audioTimeIncoming]}>
        {status.playing
          ? formatDuration(status.currentTime)
          : status.duration > 0
            ? formatDuration(status.duration)
            : ''}
      </Text>
    </View>
  );
}

export function MessageBubble({ message, userId }: MessageBubbleProps) {
  const outgoing = message.sender_id === userId;
  const hasVoiceNote = Boolean(message.voice_note_url);
  const hasText = Boolean(message.content);

  return (
    <View style={[styles.card, outgoing ? styles.outgoing : styles.incoming]}>
      <Text style={styles.title}>
        {outgoing ? 'You' : message.sender_name || 'House Manager'}
      </Text>

      {hasVoiceNote ? (
        <AudioPlayer uri={message.voice_note_url!} outgoing={outgoing} />
      ) : null}

      {hasText ? (
        <Text style={styles.body}>{message.content}</Text>
      ) : null}

      {!hasText && !hasVoiceNote ? (
        <Text style={[styles.body, styles.emptyBody]}>
          (empty message)
        </Text>
      ) : null}

      <Text style={styles.time}>{formatDateTimeLabel(message.created_at)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  audioIncoming: {
    borderColor: colors.primary,
  },
  audioOutgoing: {
    borderColor: colors.primary,
  },
  audioPlayer: {
    alignItems: 'center',
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  audioTime: {
    fontFamily: typography.body,
    fontSize: 12,
    minWidth: 35,
    textAlign: 'right',
  },
  audioTimeIncoming: {
    color: colors.textMuted,
  },
  audioTimeOutgoing: {
    color: colors.textMuted,
  },
  body: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.md,
  },
  emptyBody: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  incoming: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
  },
  outgoing: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  waveformContainer: {
    flex: 1,
  },
  waveformFill: {
    backgroundColor: colors.primary,
    borderRadius: 3,
    height: '100%',
  },
  waveformTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
  },
});
