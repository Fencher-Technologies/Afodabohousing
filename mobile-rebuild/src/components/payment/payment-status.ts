import { colors } from '../../theme';
import type { PaymentRow } from '../../types/database';

export function getPaymentStatusMeta(status: PaymentRow['status']) {
  switch (status) {
    case 'confirmed':
      return {
        backgroundColor: colors.primarySoft,
        label: 'Confirmed',
        textColor: colors.success,
      };
    case 'rejected':
      return {
        backgroundColor: colors.accentSoft,
        label: 'Rejected',
        textColor: colors.error,
      };
    case 'uploaded':
      return {
        backgroundColor: colors.gold,
        label: 'Proof Uploaded',
        textColor: colors.textPrimary,
      };
    case 'pending':
    default:
      return {
        backgroundColor: colors.surfaceMuted,
        label: 'Pending',
        textColor: colors.textPrimary,
      };
  }
}
