import { format, parseISO } from 'date-fns';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './button';
import { DatePickerField } from './date-picker-field';
import { InputField } from './input-field';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

interface RenewTenancyModalProps {
  currentEndDate: string;
  currentRent?: number;
  onClose: () => void;
  onRenew: (values: { monthlyRent: number | undefined; newEndDate: string; notes?: string }) => Promise<void>;
  tenantName?: string;
}

export function RenewTenancyModal({
  currentEndDate,
  currentRent,
  onClose,
  onRenew,
  tenantName,
}: RenewTenancyModalProps) {
  const [newEndDate, setNewEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState(
    currentRent != null ? String(currentRent) : '',
  );
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(newEndDate);

  const handleRenew = async () => {
    if (!canSubmit) {
      setError('Select a new end date that is later than the current period.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const parsedRent = monthlyRent.trim() ? Number(monthlyRent) : undefined;
      await onRenew({
        monthlyRent: parsedRent != null && !Number.isNaN(parsedRent) ? parsedRent : undefined,
        newEndDate,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (renewError) {
      setError(renewError instanceof Error ? renewError.message : 'Renewal failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Renew tenancy</Text>
          <Text style={styles.subtitle}>
            {tenantName ? `${tenantName} · ` : ''}Current period ends{' '}
            {currentEndDate ? format(parseISO(currentEndDate), 'MMM d, yyyy') : '—'}.
          </Text>

          <DatePickerField
            label="New end date"
            minDate={currentEndDate}
            onChange={setNewEndDate}
            placeholder="Must be after the current end date"
            value={newEndDate}
          />

          <InputField
            keyboardType="numeric"
            label="Monthly rent (optional)"
            onChangeText={setMonthlyRent}
            placeholder="Leave blank to keep current rent"
            value={monthlyRent}
          />

          <InputField
            label="Notes (optional)"
            multiline
            onChangeText={setNotes}
            placeholder="Any renewal notes"
            value={notes}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button disabled={busy} onPress={onClose} variant="outline">
              Cancel
            </Button>
            <Button disabled={busy || !canSubmit} onPress={handleRenew}>
              {busy ? 'Renewing...' : 'Renew tenancy'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  error: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 13,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    ...shadows.card,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
});
