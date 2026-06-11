import * as DocumentPicker from 'expo-document-picker';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../common/Button';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { PaymentRow } from '../../types/database';
import { useUploadPaymentProof } from '../../hooks/tenant/useUploadPaymentProof';

interface PaymentProofUploadActionProps {
  payment: PaymentRow | null;
  userId: string;
}

export function PaymentProofUploadAction({ payment, userId }: PaymentProofUploadActionProps) {
  const uploadMutation = useUploadPaymentProof();
  const canUpload = Boolean(payment);

  const handleUpload = async () => {
    if (!payment) {
      return;
    }

    const pickerResult = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['image/*', 'application/pdf'],
    });

    if (pickerResult.canceled) {
      return;
    }

    const asset = pickerResult.assets[0];

    await uploadMutation.mutateAsync({
      asset: {
        mimeType: asset.mimeType,
        name: asset.name,
        uri: asset.uri,
      },
      paymentId: payment.id,
      userId,
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Payment Proof</Text>
      <Text style={styles.body}>
        Upload an image or PDF proof for the latest payment record. Payment review is handled by
        your house manager later.
      </Text>
      {uploadMutation.isError ? (
        <Text style={styles.error}>
          {uploadMutation.error instanceof Error
            ? uploadMutation.error.message
            : 'Could not upload proof.'}
        </Text>
      ) : null}
      <Button
        disabled={!canUpload}
        loading={uploadMutation.isPending}
        onPress={() => void handleUpload()}
      >
        Upload Proof
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  error: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
  },
});
