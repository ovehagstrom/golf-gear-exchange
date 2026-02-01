import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreVertical, Flag, Ban, Loader2 } from 'lucide-react';
import { ReportModal } from './ReportModal';
import { useBlockUser } from '@/hooks/useBlockUser';

interface UserActionsMenuProps {
  userId: string;
  userName?: string;
}

export function UserActionsMenu({ userId, userName }: UserActionsMenuProps) {
  const { blockUser, loading } = useBlockUser();
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleBlock = async () => {
    await blockUser(userId);
    setShowBlockDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowReportModal(true)}>
            <Flag className="h-4 w-4 mr-2" />
            Rapportera användare
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowBlockDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Ban className="h-4 w-4 mr-2" />
            Blockera användare
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Blockera användare?</AlertDialogTitle>
            <AlertDialogDescription>
              Du kommer inte längre se annonser från {userName || 'denna användare'} 
              och de kommer inte kunna kontakta dig. Du kan avblockera användaren senare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Blockera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          type="user"
          targetId={userId}
          targetName={userName}
          trigger={<span />}
        />
      )}
    </>
  );
}
