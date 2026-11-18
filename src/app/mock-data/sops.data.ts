import { Sop, SopActivity, SopStatus } from '../models/sop.model';
import { User } from '../models/user.model';
import { MOCK_USERS } from './users.data';

function findUser(id: string): User {
  const user = MOCK_USERS.find((u) => u.id === id);

  if (!user) {
    throw new Error(`Unknown mock user: ${id}`);
  }

  return user;
}

const anu = findUser('EMP001');
const rahul = findUser('EMP004');
const priya = findUser('EMP002');
const kavita = findUser('EMP005');

interface MockSopInfo {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  owner: User;
  comments: string;
}

// One step in an SOP's history, in the same shape SopService writes.
interface MockStep {
  action: string;
  by: User;
  at: string;
  status: SopStatus;
  version?: number; // only when the file was replaced
  remarks?: string;
}

// Reviewer decisions copy their remarks onto the SOP (see SopService.reviewSop).
const REVIEW_ACTIONS = ['Approved', 'Rejected', 'Modification requested'];

function createMockSop(info: MockSopInfo, steps: MockStep[]): Sop {
  let version = 1;
  let reviewerRemarks: string | undefined;

  const activity = steps.map((step, index) => {
    const previousVersion = version;
    version = step.version ?? version;

    const event: SopActivity = {
      action: step.action,
      performedBy: step.by,
      timestamp: step.at,
      previousStatus: index === 0 ? null : steps[index - 1].status,
      newStatus: step.status,
      version,
    };

    if (version !== previousVersion) {
      event.previousVersion = previousVersion;
    }

    if (step.remarks) {
      event.remarks = step.remarks;
    }

    if (REVIEW_ACTIONS.includes(step.action)) {
      reviewerRemarks = step.remarks;
    }

    return event;
  });

  const lastStep = steps[steps.length - 1];

  return {
    id: info.id,
    name: info.name,
    category: info.category,
    subCategory: info.subCategory,
    version,
    status: lastStep.status,
    uploadedBy: info.owner,
    createdAt: steps[0].at,
    updatedAt: lastStep.at,
    comments: info.comments,
    reviewerRemarks,
    // Mock SOPs have no uploaded file; DocumentService serves public/sample-sop.pdf instead.
    document: {
      name: `${info.id}.pdf`,
      mimeType: 'application/pdf',
    },
    activity,
  };
}

// 25 SOPs covering all 7 statuses, multi-round reviews, crowded stations and long names.
export const MOCK_SOPS: Sop[] = [
  // Submitted: in both reviewers' queues
  createMockSop(
    {
      id: 'SOP-001',
      name: 'UPI Failed Transaction Refund',
      category: 'Payments',
      subCategory: 'UPI',
      owner: anu,
      comments: 'Refund process for UPI debits that failed at the beneficiary bank.',
    },
    [
      {
        action: 'Created',
        by: anu,
        at: '2026-11-15T10:20:00+05:30',
        status: 'Draft',
        remarks: 'Refund process for UPI debits that failed at the beneficiary bank.',
      },
      { action: 'Submitted', by: anu, at: '2026-11-16T11:05:00+05:30', status: 'Submitted' },
    ],
  ),

  // Draft: Anu can edit
  createMockSop(
    {
      id: 'SOP-002',
      name: 'ATM Cash Shortage Claims',
      category: 'ATM',
      subCategory: 'Cash Shortage',
      owner: anu,
      comments: '',
    },
    [
      { action: 'Created', by: anu, at: '2026-11-16T15:40:00+05:30', status: 'Draft' },
      { action: 'Draft saved', by: anu, at: '2026-11-17T17:10:00+05:30', status: 'Draft' },
    ],
  ),

  // Draft owned by a reviewer
  createMockSop(
    {
      id: 'SOP-003',
      name: 'Credit Card Dispute Handling',
      category: 'Cards',
      subCategory: 'Credit Card Dispute',
      owner: priya,
      comments: '',
    },
    [{ action: 'Created', by: priya, at: '2026-11-16T12:00:00+05:30', status: 'Draft' }],
  ),

  // Submitted by Priya: only Kavita can review it
  createMockSop(
    {
      id: 'SOP-004',
      name: 'Legal Notice Response',
      category: 'Legal & Statutory',
      subCategory: 'Legal Notice',
      owner: priya,
      comments: 'How branches acknowledge, log and escalate legal notices from customers.',
    },
    [
      {
        action: 'Created',
        by: priya,
        at: '2026-11-12T09:30:00+05:30',
        status: 'Draft',
        remarks: 'How branches acknowledge, log and escalate legal notices from customers.',
      },
      { action: 'Submitted', by: priya, at: '2026-11-13T10:00:00+05:30', status: 'Submitted' },
    ],
  ),

  // Requested Modification: Anu sees "Make changes"
  createMockSop(
    {
      id: 'SOP-005',
      name: 'Credit Card Chargeback Process',
      category: 'Cards',
      subCategory: 'Chargeback',
      owner: anu,
      comments: 'End-to-end chargeback handling for disputed card transactions.',
    },
    [
      {
        action: 'Created',
        by: anu,
        at: '2026-11-08T11:00:00+05:30',
        status: 'Draft',
        remarks: 'End-to-end chargeback handling for disputed card transactions.',
      },
      { action: 'Submitted', by: anu, at: '2026-11-09T16:20:00+05:30', status: 'Submitted' },
      {
        action: 'Modification requested',
        by: priya,
        at: '2026-11-12T14:45:00+05:30',
        status: 'Requested Modification',
        remarks:
          'Please add the chargeback time limits for Visa, Mastercard and RuPay, and the customer communication template for each stage.',
      },
    ],
  ),

  // Approved after one round of changes (v1 → v2)
  createMockSop(
    {
      id: 'SOP-006',
      name: 'Home Loan Foreclosure',
      category: 'Loans',
      subCategory: 'Closure',
      owner: anu,
      comments: 'Added the charges table and NOC timelines.',
    },
    [
      { action: 'Created', by: anu, at: '2026-10-20T10:00:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: anu, at: '2026-10-21T12:30:00+05:30', status: 'Submitted' },
      {
        action: 'Modification requested',
        by: priya,
        at: '2026-10-23T15:10:00+05:30',
        status: 'Requested Modification',
        remarks: 'Add the foreclosure charges table and the NOC issuance timelines.',
      },
      {
        action: 'Modification started',
        by: anu,
        at: '2026-10-24T09:45:00+05:30',
        status: 'Modification In Progress',
      },
      {
        action: 'Resubmitted',
        by: anu,
        at: '2026-10-25T18:20:00+05:30',
        status: 'Resubmitted',
        version: 2,
        remarks: 'Added the charges table and NOC timelines.',
      },
      { action: 'Approved', by: priya, at: '2026-10-28T11:00:00+05:30', status: 'Approved' },
    ],
  ),

  // Rejected
  createMockSop(
    {
      id: 'SOP-007',
      name: 'Card Retained at ATM',
      category: 'ATM',
      subCategory: 'Card Retained',
      owner: anu,
      comments: '',
    },
    [
      { action: 'Created', by: anu, at: '2026-10-26T10:15:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: anu, at: '2026-10-27T13:00:00+05:30', status: 'Submitted' },
      {
        action: 'Rejected',
        by: kavita,
        at: '2026-10-30T16:30:00+05:30',
        status: 'Rejected',
        remarks:
          'This duplicates the existing card retention SOP. Please update that document instead of creating a new one.',
      },
    ],
  ),

  // Modification In Progress: Anu can edit, remarks show at the top of the form
  createMockSop(
    {
      id: 'SOP-008',
      name: 'IMPS Transaction Reversal',
      category: 'Payments',
      subCategory: 'IMPS',
      owner: anu,
      comments: 'Reversal steps for IMPS credits sent to the wrong beneficiary.',
    },
    [
      {
        action: 'Created',
        by: anu,
        at: '2026-11-04T10:00:00+05:30',
        status: 'Draft',
        remarks: 'Reversal steps for IMPS credits sent to the wrong beneficiary.',
      },
      { action: 'Submitted', by: anu, at: '2026-11-05T11:30:00+05:30', status: 'Submitted' },
      {
        action: 'Modification requested',
        by: kavita,
        at: '2026-11-10T15:00:00+05:30',
        status: 'Requested Modification',
        remarks:
          'Step 4 needs a maker-checker sign-off before the reversal is posted. Please also add the turnaround time for each step.',
      },
      {
        action: 'Modification started',
        by: anu,
        at: '2026-11-14T10:25:00+05:30',
        status: 'Modification In Progress',
      },
    ],
  ),

  // Resubmitted (v2): back in both reviewers' queues
  createMockSop(
    {
      id: 'SOP-009',
      name: 'NEFT/RTGS Return Handling',
      category: 'Payments',
      subCategory: 'NEFT/RTGS',
      owner: rahul,
      comments: 'Added return reason codes and remitter credit timelines.',
    },
    [
      { action: 'Created', by: rahul, at: '2026-11-02T09:00:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: rahul, at: '2026-11-03T12:00:00+05:30', status: 'Submitted' },
      {
        action: 'Modification requested',
        by: priya,
        at: '2026-11-06T17:30:00+05:30',
        status: 'Requested Modification',
        remarks: 'Include the return reason codes and the timeline for crediting the remitter.',
      },
      {
        action: 'Modification started',
        by: rahul,
        at: '2026-11-07T10:10:00+05:30',
        status: 'Modification In Progress',
      },
      {
        action: 'Resubmitted',
        by: rahul,
        at: '2026-11-11T16:45:00+05:30',
        status: 'Resubmitted',
        version: 2,
        remarks: 'Added return reason codes and remitter credit timelines.',
      },
    ],
  ),

  // Submitted by the second maker
  createMockSop(
    {
      id: 'SOP-010',
      name: 'EMI Bounce Charges',
      category: 'Loans',
      subCategory: 'EMI',
      owner: rahul,
      comments: 'Charges and customer communication when an EMI auto-debit fails.',
    },
    [
      {
        action: 'Created',
        by: rahul,
        at: '2026-11-13T14:00:00+05:30',
        status: 'Draft',
        remarks: 'Charges and customer communication when an EMI auto-debit fails.',
      },
      { action: 'Submitted', by: rahul, at: '2026-11-14T10:30:00+05:30', status: 'Submitted' },
    ],
  ),

  // Approved with remarks, owned by a reviewer
  createMockSop(
    {
      id: 'SOP-011',
      name: 'Statutory Notice Handling',
      category: 'Legal & Statutory',
      subCategory: 'Statutory Notice',
      owner: kavita,
      comments: '',
    },
    [
      { action: 'Created', by: kavita, at: '2026-10-29T11:00:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: kavita, at: '2026-10-30T09:40:00+05:30', status: 'Submitted' },
      {
        action: 'Approved',
        by: priya,
        at: '2026-11-05T12:15:00+05:30',
        status: 'Approved',
        remarks: 'Clear and complete. Approved for publishing.',
      },
    ],
  ),

  // ----- Extra scenarios -----

  // Approved (Anu): with SOP-006, 012-015 the Approved station overflows ("and 1 more")
  createMockSop(
    {
      id: 'SOP-012',
      name: 'Card Annual Fee Reversal',
      category: 'Cards',
      subCategory: 'Fees & Charges',
      owner: anu,
      comments: 'When and how branches can reverse the annual fee on request.',
    },
    [
      { action: 'Created', by: anu, at: '2026-09-22T10:00:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: anu, at: '2026-09-23T15:00:00+05:30', status: 'Submitted' },
      {
        action: 'Approved',
        by: kavita,
        at: '2026-09-25T12:10:00+05:30',
        status: 'Approved',
        remarks: 'Approved. Fee waiver limits match the current policy.',
      },
    ],
  ),

  createMockSop(
    {
      id: 'SOP-013',
      name: 'Loan Document Retrieval',
      category: 'Loans',
      subCategory: 'Documents',
      owner: anu,
      comments: 'Retrieving original property documents after loan closure.',
    },
    [
      { action: 'Created', by: anu, at: '2026-10-01T09:30:00+05:30', status: 'Draft' },
      { action: 'Draft saved', by: anu, at: '2026-10-02T17:45:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: anu, at: '2026-10-03T11:00:00+05:30', status: 'Submitted' },
      { action: 'Approved', by: priya, at: '2026-10-06T16:20:00+05:30', status: 'Approved' },
    ],
  ),

  // Long name, approved on its third version after two rounds of changes
  createMockSop(
    {
      id: 'SOP-014',
      name: 'ATM Cash Shortage Branch Reconciliation and Customer Credit Within Turnaround Time',
      category: 'ATM',
      subCategory: 'Cash Shortage',
      owner: anu,
      comments: 'Added the EJ log check and the 5-day customer credit rule.',
    },
    [
      { action: 'Created', by: anu, at: '2026-09-10T10:00:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: anu, at: '2026-09-11T12:00:00+05:30', status: 'Submitted' },
      {
        action: 'Modification requested',
        by: kavita,
        at: '2026-09-13T15:30:00+05:30',
        status: 'Requested Modification',
        remarks: 'Add the electronic journal (EJ) log check before crediting the customer.',
      },
      {
        action: 'Modification started',
        by: anu,
        at: '2026-09-14T09:15:00+05:30',
        status: 'Modification In Progress',
      },
      {
        action: 'Resubmitted',
        by: anu,
        at: '2026-09-15T18:00:00+05:30',
        status: 'Resubmitted',
        version: 2,
        remarks: 'Added the EJ log check.',
      },
      {
        action: 'Modification requested',
        by: priya,
        at: '2026-09-18T11:40:00+05:30',
        status: 'Requested Modification',
        remarks: 'Mention the RBI turnaround time of 5 working days for the customer credit.',
      },
      {
        action: 'Modification started',
        by: anu,
        at: '2026-09-19T10:00:00+05:30',
        status: 'Modification In Progress',
      },
      {
        action: 'Resubmitted',
        by: anu,
        at: '2026-09-20T16:30:00+05:30',
        status: 'Resubmitted',
        version: 3,
        remarks: 'Added the EJ log check and the 5-day customer credit rule.',
      },
      { action: 'Approved', by: priya, at: '2026-09-23T10:45:00+05:30', status: 'Approved' },
    ],
  ),

  createMockSop(
    {
      id: 'SOP-015',
      name: 'UPI Merchant Dispute Chargeback',
      category: 'Payments',
      subCategory: 'UPI',
      owner: anu,
      comments: 'Chargeback steps when a UPI merchant does not deliver.',
    },
    [
      { action: 'Created', by: anu, at: '2026-10-08T14:00:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: anu, at: '2026-10-09T10:20:00+05:30', status: 'Submitted' },
      { action: 'Approved', by: kavita, at: '2026-10-13T17:05:00+05:30', status: 'Approved' },
    ],
  ),

  // Fresh draft: only "Created"
  createMockSop(
    {
      id: 'SOP-016',
      name: 'RTGS Value Date Correction',
      category: 'Payments',
      subCategory: 'NEFT/RTGS',
      owner: anu,
      comments: '',
    },
    [{ action: 'Created', by: anu, at: '2026-11-18T09:40:00+05:30', status: 'Draft' }],
  ),

  // Waiting 12 days for review
  createMockSop(
    {
      id: 'SOP-017',
      name: 'Legal Notice Acknowledgement Template',
      category: 'Legal & Statutory',
      subCategory: 'Legal Notice',
      owner: anu,
      comments: 'Standard reply template for acknowledging legal notices.',
    },
    [
      {
        action: 'Created',
        by: anu,
        at: '2026-11-05T10:00:00+05:30',
        status: 'Draft',
        remarks: 'Standard reply template for acknowledging legal notices.',
      },
      { action: 'Submitted', by: anu, at: '2026-11-06T12:30:00+05:30', status: 'Submitted' },
    ],
  ),

  // Rejected after a resubmission (v2)
  createMockSop(
    {
      id: 'SOP-018',
      name: 'IMPS Failed Credit Investigation',
      category: 'Payments',
      subCategory: 'IMPS',
      owner: anu,
      comments: 'Updated the escalation contacts.',
    },
    [
      { action: 'Created', by: anu, at: '2026-10-14T10:30:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: anu, at: '2026-10-15T11:00:00+05:30', status: 'Submitted' },
      {
        action: 'Modification requested',
        by: priya,
        at: '2026-10-17T14:00:00+05:30',
        status: 'Requested Modification',
        remarks: 'The escalation contacts are out of date.',
      },
      {
        action: 'Modification started',
        by: anu,
        at: '2026-10-18T09:00:00+05:30',
        status: 'Modification In Progress',
      },
      {
        action: 'Resubmitted',
        by: anu,
        at: '2026-10-19T17:30:00+05:30',
        status: 'Resubmitted',
        version: 2,
        remarks: 'Updated the escalation contacts.',
      },
      {
        action: 'Rejected',
        by: priya,
        at: '2026-10-22T12:00:00+05:30',
        status: 'Rejected',
        remarks:
          'This is now covered by the NPCI dispute portal process. No separate SOP is needed.',
      },
    ],
  ),

  // Rahul: submitted yesterday
  createMockSop(
    {
      id: 'SOP-019',
      name: 'Loan Closure NOC Dispatch',
      category: 'Loans',
      subCategory: 'Closure',
      owner: rahul,
      comments: 'Dispatching the no-objection certificate after loan closure.',
    },
    [
      { action: 'Created', by: rahul, at: '2026-11-16T15:00:00+05:30', status: 'Draft' },
      {
        action: 'Submitted',
        by: rahul,
        at: '2026-11-17T10:15:00+05:30',
        status: 'Submitted',
      },
    ],
  ),

  // Rahul: resubmitted after two rounds (v3), file replaced during "Modification saved"
  createMockSop(
    {
      id: 'SOP-020',
      name: 'Chargeback Evidence Checklist',
      category: 'Cards',
      subCategory: 'Chargeback',
      owner: rahul,
      comments: 'Added the merchant evidence list and network deadlines.',
    },
    [
      { action: 'Created', by: rahul, at: '2026-10-20T10:00:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: rahul, at: '2026-10-21T12:00:00+05:30', status: 'Submitted' },
      {
        action: 'Modification requested',
        by: priya,
        at: '2026-10-24T16:00:00+05:30',
        status: 'Requested Modification',
        remarks: 'List the evidence the merchant must share for each dispute type.',
      },
      {
        action: 'Modification started',
        by: rahul,
        at: '2026-10-26T09:30:00+05:30',
        status: 'Modification In Progress',
      },
      {
        action: 'Resubmitted',
        by: rahul,
        at: '2026-10-28T18:00:00+05:30',
        status: 'Resubmitted',
        version: 2,
        remarks: 'Added the merchant evidence list.',
      },
      {
        action: 'Modification requested',
        by: kavita,
        at: '2026-11-02T11:20:00+05:30',
        status: 'Requested Modification',
        remarks: 'Add the Visa and RuPay response deadlines next to each evidence item.',
      },
      {
        action: 'Modification started',
        by: rahul,
        at: '2026-11-03T10:00:00+05:30',
        status: 'Modification In Progress',
      },
      {
        action: 'Modification saved',
        by: rahul,
        at: '2026-11-04T17:40:00+05:30',
        status: 'Modification In Progress',
        version: 3,
      },
      {
        action: 'Resubmitted',
        by: rahul,
        at: '2026-11-08T12:00:00+05:30',
        status: 'Resubmitted',
        remarks: 'Added the merchant evidence list and network deadlines.',
      },
    ],
  ),

  // Rahul: working on changes, saved once
  createMockSop(
    {
      id: 'SOP-021',
      name: 'Retained Card Return to Customer',
      category: 'ATM',
      subCategory: 'Card Retained',
      owner: rahul,
      comments: 'Identity checks before returning a card retained by the ATM.',
    },
    [
      { action: 'Created', by: rahul, at: '2026-11-01T11:00:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: rahul, at: '2026-11-02T15:30:00+05:30', status: 'Submitted' },
      {
        action: 'Modification requested',
        by: kavita,
        at: '2026-11-07T12:00:00+05:30',
        status: 'Requested Modification',
        remarks: 'Add the 7-day destruction rule for cards that are not collected.',
      },
      {
        action: 'Modification started',
        by: rahul,
        at: '2026-11-09T10:00:00+05:30',
        status: 'Modification In Progress',
      },
      {
        action: 'Modification saved',
        by: rahul,
        at: '2026-11-12T16:00:00+05:30',
        status: 'Modification In Progress',
      },
    ],
  ),

  // Rahul: approved with remarks
  createMockSop(
    {
      id: 'SOP-022',
      name: 'Statutory Notice Register Upkeep',
      category: 'Legal & Statutory',
      subCategory: 'Statutory Notice',
      owner: rahul,
      comments: '',
    },
    [
      { action: 'Created', by: rahul, at: '2026-10-05T09:00:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: rahul, at: '2026-10-06T10:00:00+05:30', status: 'Submitted' },
      {
        action: 'Approved',
        by: kavita,
        at: '2026-10-09T15:00:00+05:30',
        status: 'Approved',
        remarks: 'Good. Please keep the register format unchanged.',
      },
    ],
  ),

  // Priya (a reviewer) has her own SOP sent back by Kavita
  createMockSop(
    {
      id: 'SOP-023',
      name: 'Card Complaint Escalation Matrix',
      category: 'Cards',
      subCategory: 'Credit Card Dispute',
      owner: priya,
      comments: 'Who handles card complaints at each level, and by when.',
    },
    [
      { action: 'Created', by: priya, at: '2026-11-07T10:00:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: priya, at: '2026-11-08T11:30:00+05:30', status: 'Submitted' },
      {
        action: 'Modification requested',
        by: kavita,
        at: '2026-11-13T15:45:00+05:30',
        status: 'Requested Modification',
        remarks: 'Add the nodal officer level and the 30-day ombudsman timeline.',
      },
    ],
  ),

  // Kavita: rejected by Priya
  createMockSop(
    {
      id: 'SOP-024',
      name: 'EMI Moratorium Requests',
      category: 'Loans',
      subCategory: 'EMI',
      owner: kavita,
      comments: '',
    },
    [
      { action: 'Created', by: kavita, at: '2026-10-10T10:00:00+05:30', status: 'Draft' },
      { action: 'Submitted', by: kavita, at: '2026-10-11T12:00:00+05:30', status: 'Submitted' },
      {
        action: 'Rejected',
        by: priya,
        at: '2026-10-15T11:00:00+05:30',
        status: 'Rejected',
        remarks: 'The moratorium scheme has ended. This SOP is no longer needed.',
      },
    ],
  ),

  // Kavita: submitted, so Priya's queue reaches 7 ("and 3 more")
  createMockSop(
    {
      id: 'SOP-025',
      name: 'Cash Deposit Machine Disputes',
      category: 'ATM',
      subCategory: 'Cash Shortage',
      owner: kavita,
      comments: 'Disputes where cash was deposited but not credited.',
    },
    [
      {
        action: 'Created',
        by: kavita,
        at: '2026-11-14T09:30:00+05:30',
        status: 'Draft',
        remarks: 'Disputes where cash was deposited but not credited.',
      },
      {
        action: 'Submitted',
        by: kavita,
        at: '2026-11-15T14:00:00+05:30',
        status: 'Submitted',
      },
    ],
  ),
];
