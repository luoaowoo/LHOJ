import type { ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  content?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open, title, content, confirmLabel = '确认', cancelLabel = '取消', destructive = true, loading = false, onConfirm, onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={() => { if (!loading) onClose(); }} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      {content ? (
        <DialogContent>
          <DialogContentText>{content}</DialogContentText>
        </DialogContent>
      ) : null}
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
        <Button color={destructive ? 'error' : 'primary'} variant="contained" onClick={onConfirm} disabled={loading}>
          {loading ? '处理中…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
