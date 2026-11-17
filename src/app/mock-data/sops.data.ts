import { Sop, SopActivity } from '../models/sop.model';
import { User } from '../models/user.model';
import { MOCK_USERS } from './users.data';

const maker = MOCK_USERS[0];
const reviewer = MOCK_USERS[1];

function createMockSop(
  id: string,
  name: string,
  category: string,
  subCategory: string,
  owner: User,
  status: 'Draft' | 'Submitted',
): Sop {
  const createdAt = '2026-11-16T09:00:00+05:30';
  const submittedAt = '2026-11-16T11:00:00+05:30';

  const activity: SopActivity[] = [
    {
      action: 'Created',
      performedBy: owner,
      timestamp: createdAt,
      previousStatus: null,
      newStatus: 'Draft',
      version: 1,
    },
  ];

  if (status === 'Submitted') {
    activity.push({
      action: 'Submitted',
      performedBy: owner,
      timestamp: submittedAt,
      previousStatus: 'Draft',
      newStatus: 'Submitted',
      version: 1,
    });
  }

  return {
    id,
    name,
    category,
    subCategory,
    version: 1,
    status,
    uploadedBy: owner,
    createdAt,
    updatedAt: status === 'Submitted' ? submittedAt : createdAt,
    comments: '',
    document: {
      name: `${id}.pdf`,
      mimeType: 'application/pdf',
    },
    activity,
  };
}

export const MOCK_SOPS: Sop[] = [
  createMockSop('SOP-001', 'UPI Failed Transaction Refund', 'Payments', 'UPI', maker, 'Submitted'),
  createMockSop('SOP-002', 'ATM Cash Shortage', 'ATM', 'Cash Shortage', maker, 'Draft'),
  createMockSop(
    'SOP-003',
    'Credit Card Dispute Handling',
    'Cards',
    'Credit Card Dispute',
    reviewer,
    'Draft',
  ),
  createMockSop('SOP-004', 'NEFT Return Handling', 'Payments', 'NEFT/RTGS', reviewer, 'Submitted'),
];
