import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HelpIcon from '@mui/icons-material/Help';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'info' | 'success' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  loading = false,
  onConfirm,
  onClose,
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
      case 'warning':
        return <WarningAmberIcon sx={{ color: '#D97706', fontSize: 28 }} />;
      case 'success':
        return <CheckCircleIcon sx={{ color: '#166534', fontSize: 28 }} />;
      default:
        return <HelpIcon sx={{ color: '#1E3A8A', fontSize: 28 }} />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: '12px', p: 1 },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: '50%',
            bgcolor: variant === 'danger' || variant === 'warning' ? '#FEF3C7' : '#EFF6FF',
            display: 'flex',
          }}
        >
          {getIcon()}
        </Box>
        <Typography variant="h6" component="span" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ py: 1 }}>
        <DialogContentText sx={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onConfirm}
          disabled={loading}
          sx={{
            bgcolor: variant === 'danger' ? '#DC2626' : '#1E3A8A',
            '&:hover': {
              bgcolor: variant === 'danger' ? '#B91C1C' : '#1E40AF',
            },
          }}
        >
          {loading ? 'Procesando...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
