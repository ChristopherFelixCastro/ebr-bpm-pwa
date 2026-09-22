import React from 'react';
import { Chip } from '@mui/material';

interface StatusChipProps {
  status: string;
  size?: 'small' | 'medium';
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  let label = status;
  let bg = '#F1F5F9';
  let color = '#64748B';
  let border = 'transparent';

  switch (status) {
    // Core BPM Request Statuses
    case 'DRAFT':
    case 'BORRADOR':
      label = 'Borrador';
      bg = '#F1F5F9';
      color = '#64748B';
      border = '#E2E8F0';
      break;

    case 'PENDING_ASSIGNMENT':
    case 'PENDIENTE_DE_ASIGNACION':
      label = 'Pendiente de asignación';
      bg = '#FEF3C7';
      color = '#D97706';
      border = '#FDE68A';
      break;

    case 'ASIGNADA':
      label = 'Asignada';
      bg = '#E0E7FF';
      color = '#4338CA';
      border = '#C7D2FE';
      break;

    case 'EN_PROGRESO':
      label = 'En progreso';
      bg = '#E0F2FE';
      color = '#0284C7';
      border = '#BAE6FD';
      break;

    case 'EN_REVISION':
      label = 'En revisión';
      bg = '#F3E8FF';
      color = '#7E22CE';
      border = '#E9D5FF';
      break;

    case 'APPROVED':
    case 'APROBADA':
    case 'APROBADO':
      label = 'Aprobado';
      bg = '#DCFCE7';
      color = '#15803D';
      border = '#BBF7D0';
      break;

    case 'ACTIVE':
      label = 'Activo';
      bg = '#DCFCE7';
      color = '#15803D';
      border = '#BBF7D0';
      break;

    case 'DEVUELTA':
      label = 'Devuelta';
      bg = '#FEE2E2';
      color = '#B91C1C';
      border = '#FECACA';
      break;

    case 'CERRADA':
      label = 'Cerrada';
      bg = '#E2E8F0';
      color = '#334155';
      border = '#CBD5E1';
      break;

    // User Statuses
    case 'PENDING_VALIDATION':
    case 'PENDIENTE_VALIDACION':
      label = 'Pendiente de validación';
      bg = '#FEF3C7';
      color = '#D97706';
      border = '#FDE68A';
      break;

    case 'REJECTED':
    case 'RECHAZADO':
      label = 'Rechazado';
      bg = '#FEE2E2';
      color = '#B91C1C';
      border = '#FECACA';
      break;

    case 'INACTIVE':
    case 'INACTIVO':
      label = 'Inactivo';
      bg = '#F1F5F9';
      color = '#94A3B8';
      border = '#E2E8F0';
      break;

    default:
      label = status;
      break;
  }

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        backgroundColor: bg,
        color: color,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.85rem',
        border: `1px solid ${border}`,
        borderRadius: '6px',
      }}
    />
  );
};
