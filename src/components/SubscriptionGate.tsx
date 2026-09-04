import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SubscriptionGateProps {
  open: boolean;
  onClose: () => void;
  onRenew: () => void;
  actionLabel: string;
}

export default function SubscriptionGate({ open, onClose, onRenew, actionLabel }: SubscriptionGateProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-sm text-center">
        <AlertDialogHeader>
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
            <Crown className="h-8 w-8 text-gold" />
          </div>
          <AlertDialogTitle className="text-lg">Subscription Required</AlertDialogTitle>
          <AlertDialogDescription>
            Your subscription has expired. Renew to continue {actionLabel}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-col gap-2">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onRenew}
            className="bg-gold hover:bg-gold/90 text-gold-foreground gap-2">
            <Crown className="h-4 w-4" /> Renew Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
