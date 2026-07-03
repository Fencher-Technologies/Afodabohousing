import { differenceInDays } from 'date-fns';
import { colors } from '../theme/tokens';

export interface TenancyHealth {
  daysRemaining: number;
  totalDays: number;
  daysElapsed: number;
  progressPercent: number;
  status: 'healthy' | 'warning' | 'attention' | 'overdue' | 'expired';
  color: string;
  label: string;
}

export function getTenancyHealth(rentStartDate: string, rentEndDate: string): TenancyHealth {
  const start = new Date(rentStartDate);
  const end = new Date(rentEndDate);
  const today = new Date();

  const totalDays = differenceInDays(end, start);
  const daysRemaining = differenceInDays(end, today);
  const daysElapsed = Math.max(0, Math.min(totalDays, differenceInDays(today, start)));
  const progressPercent = totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0;

  if (daysRemaining > 30) {
    return {
      daysRemaining,
      totalDays,
      daysElapsed,
      progressPercent,
      status: 'healthy',
      color: colors.primary,
      label: 'Healthy',
    };
  }

  if (daysRemaining >= 15) {
    return {
      daysRemaining,
      totalDays,
      daysElapsed,
      progressPercent,
      status: 'warning',
      color: colors.gold,
      label: 'Approaching',
    };
  }

  if (daysRemaining >= 7) {
    return {
      daysRemaining,
      totalDays,
      daysElapsed,
      progressPercent,
      status: 'attention',
      color: colors.accent,
      label: 'Warning',
    };
  }

  if (daysRemaining >= 1) {
    return {
      daysRemaining,
      totalDays,
      daysElapsed,
      progressPercent,
      status: 'overdue',
      color: colors.error,
      label: 'Critical',
    };
  }

  return {
    daysRemaining,
    totalDays,
    daysElapsed,
    progressPercent,
    status: 'expired',
    color: colors.textMuted,
    label: 'Expired',
  };
}
