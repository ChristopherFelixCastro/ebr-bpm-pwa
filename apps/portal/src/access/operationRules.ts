import type { CoreUser } from '@ebr-bpm/core-client'
import type { Assignment, OperationalCase, Schedule } from '../api/operation'

export const canOperate = (user: CoreUser | null) => user?.status === 'APPROVED' && ['ADMIN', 'UNIVERSAL', 'COORDINATOR'].includes(user.roleCode)
export const canDecide = (user: CoreUser | null, item: OperationalCase) => canOperate(user) && item.status === 'PENDING_REVIEW' && (item.origin === 'HEALTH_ALERT' || item.origin === 'COMPLAINT') && item.source.decision === 'PENDING'
export const canEditSource = (user: CoreUser | null, item: OperationalCase, activeAssignment?: Assignment) => canOperate(user) && (item.origin === 'INSTITUTIONAL_PROGRAM' ? item.status === 'PENDING_ASSIGNMENT' && !activeAssignment : (item.origin === 'HEALTH_ALERT' || item.origin === 'COMPLAINT') && item.status === 'PENDING_REVIEW' && item.source.decision === 'PENDING')
export const canAssign = (user: CoreUser | null, item: OperationalCase, activeAssignment?: Assignment) => canOperate(user) && item.status === 'PENDING_ASSIGNMENT' && !activeAssignment
export const canReassign = (user: CoreUser | null, item: OperationalCase, activeAssignment?: Assignment) => canOperate(user) && item.status === 'ASSIGNED' && Boolean(activeAssignment?.isActive) && !activeAssignment?.hasEditableInspection
export const canSchedule = (user: CoreUser | null, item: OperationalCase, activeAssignment?: Assignment, activeSchedule?: Schedule) => canOperate(user) && item.status === 'ASSIGNED' && Boolean(activeAssignment) && !activeSchedule
export const canChangeSchedule = (user: CoreUser | null, item: OperationalCase, activeSchedule?: Schedule) => canOperate(user) && item.status === 'ASSIGNED' && activeSchedule?.status === 'SCHEDULED'
