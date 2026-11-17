import { SopStatus } from './sop.model';

export const SOP_STATUSES: SopStatus[] = [
  'Draft',
  'Submitted',
  'Requested Modification',
  'Modification In Progress',
  'Resubmitted',
  'Approved',
  'Rejected',
];

export const STATUS_CLASSES: Record<SopStatus, string> = {
  Draft: 'status-draft',
  Submitted: 'status-submitted',
  'Requested Modification': 'status-requested',
  'Modification In Progress': 'status-modifying',
  Resubmitted: 'status-resubmitted',
  Approved: 'status-approved',
  Rejected: 'status-rejected',
};
