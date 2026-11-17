import { User } from './user.model';

export type SopStatus =
  | 'Draft'
  | 'Submitted'
  | 'Requested Modification'
  | 'Modification In Progress'
  | 'Resubmitted'
  | 'Approved'
  | 'Rejected';

export interface SopDocument {
  name: string;
  mimeType: string;
  storageKey?: string;
}

export interface SopActivity {
  action: string;
  performedBy: User;
  timestamp: string;
  previousStatus: SopStatus | null;
  newStatus: SopStatus;
  previousVersion?: number;
  version: number;
  remarks?: string;
}

export interface Sop {
  id: string;
  name: string;
  version: number;
  category: string;
  subCategory: string;
  status: SopStatus;
  uploadedBy: User;
  createdAt: string;
  updatedAt: string;
  comments: string;
  reviewerRemarks?: string;
  document: SopDocument;
  activity: SopActivity[];
}

export interface SopSaveInput {
  name: string;
  category: string;
  subCategory: string;
  comments: string;
  document: SopDocument;
}

export type SopSaveMode = 'draft' | 'submit';

export type ReviewDecision = 'Approved' | 'Rejected' | 'Requested Modification';
