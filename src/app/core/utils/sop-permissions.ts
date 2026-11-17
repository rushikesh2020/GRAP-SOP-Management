import { Sop } from '../../models/sop.model';
import { User } from '../../models/user.model';

export function isOwner(sop: Sop, user: User): boolean {
  return sop.uploadedBy.id === user.id;
}

export function canEditSop(sop: Sop, user: User): boolean {
  return (
    user.role !== 'Unassigned' &&
    isOwner(sop, user) &&
    (sop.status === 'Draft' || sop.status === 'Modification In Progress')
  );
}

export function canStartModification(sop: Sop, user: User): boolean {
  return (
    user.role !== 'Unassigned' && isOwner(sop, user) && sop.status === 'Requested Modification'
  );
}

export function canReviewSop(sop: Sop, user: User): boolean {
  return (
    user.role === 'Reviewer' &&
    !isOwner(sop, user) &&
    (sop.status === 'Submitted' || sop.status === 'Resubmitted')
  );
}

export function canViewSop(sop: Sop, user: User): boolean {
  return user.role !== 'Unassigned' && (isOwner(sop, user) || canReviewSop(sop, user));
}
