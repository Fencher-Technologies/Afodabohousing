import { useNavigate } from 'react-router-dom';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PlanLimitInfo } from '@/utils/planLimit';

/**
 * Shown when a manager hits their plan's property limit: explains the limit
 * and offers the upgrade, instead of a bare error toast.
 */
export function PlanLimitDialog({
  info,
  onClose,
}: {
  info: PlanLimitInfo | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  return (
    <AlertDialog open={!!info} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {info?.needsSubscription ? 'Subscription required' : 'Property limit reached'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {info?.message}
            {info?.needsSubscription
              ? ' Choose a plan to start listing.'
              : ' Upgrade to list more properties. Any days left on your current plan are carried over.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onClose(); navigate('/subscription'); }}>
            {info?.needsSubscription ? 'Choose a plan' : 'Upgrade subscription'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
