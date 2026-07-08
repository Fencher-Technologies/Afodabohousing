import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
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

function formatDuration(millis: number) {
  const totalSeconds = Math.floor(millis / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AudioPlayer({ uri, outgoing }: { uri: string; outgoing: boolean }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
    }).catch(() => {});

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  async function loadAndPlay() {
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
          return;
        }
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate,
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) {
      return;
    }

    setPosition(status.positionMillis);
    if (status.durationMillis) {
      setDuration(status.durationMillis);
    }
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
    }
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={[styles.audioPlayer, outgoing ? styles.audioOutgoing : styles.audioIncoming]}>
      <Pressable onPress={loadAndPlay} style={styles.playButton}>
        <Ionicons
          color={colors.primary}
          name={isPlaying ? 'pause-circle' : 'play-circle'}
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
        {isPlaying
          ? formatDuration(position)
          : duration > 0
            ? formatDuration(duration)
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
