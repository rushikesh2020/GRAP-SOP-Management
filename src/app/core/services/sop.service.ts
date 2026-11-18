import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { User } from '../../models/user.model';
import { MOCK_SOPS } from '../../mock-data/sops.data';
import { Sop, SopActivity, SopSaveInput, SopSaveMode, SopStatus } from '../../models/sop.model';

import { canEditSop, canStartModification } from '../utils/sop-permissions';

import { SOP_CATEGORIES } from '../../mock-data/categories.data';

import { ReviewDecision } from '../../models/sop.model';
import { canReviewSop } from '../utils/sop-permissions';

@Injectable({
  providedIn: 'root',
})
export class SopService {
  // Bump the version when the mock data changes, so browsers load the new seed.
  private readonly storageKey = 'grap-sops-v3';

  private readonly sopSubject = new BehaviorSubject<Sop[]>(this.loadSops());

  readonly sops$ = this.sopSubject.asObservable();

  getSopById(id: string): Observable<Sop | undefined> {
    return this.sops$.pipe(map((sops) => sops.find((sop) => sop.id === id)));
  }

  getMySops(user: User): Observable<Sop[]> {
    return this.sops$.pipe(map((sops) => sops.filter((sop) => sop.uploadedBy.id === user.id)));
  }

  getForReview(user: User): Observable<Sop[]> {
    return this.sops$.pipe(
      map((sops) =>
        user.role !== 'Reviewer'
          ? []
          : sops.filter(
              (sop) =>
                sop.uploadedBy.id !== user.id &&
                (sop.status === 'Submitted' || sop.status === 'Resubmitted'),
            ),
      ),
    );
  }

  private loadSops(): Sop[] {
    try {
      const stored = localStorage.getItem(this.storageKey);

      if (stored) {
        const parsed: Sop[] = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Unable to restore SOP data', error);
    }

    return structuredClone(MOCK_SOPS);
  }

  private persistSops(sops: Sop[]): boolean {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(sops));

      this.sopSubject.next(sops);

      return true;
    } catch (error) {
      console.error('Unable to save SOP data', error);
      return false;
    }
  }

  startModification(id: string, user: User): boolean {
    const currentSops = this.sopSubject.getValue();

    const sop = currentSops.find((item) => item.id === id);

    if (!sop || !canStartModification(sop, user)) {
      return false;
    }

    const timestamp = new Date().toISOString();

    const updatedSop: Sop = {
      ...sop,

      status: 'Modification In Progress',

      updatedAt: timestamp,

      activity: [
        ...sop.activity,
        {
          action: 'Modification started',
          performedBy: user,
          timestamp,
          previousStatus: sop.status,
          newStatus: 'Modification In Progress',
          version: sop.version,
        },
      ],
    };

    const updatedSops = currentSops.map((item) => (item.id === id ? updatedSop : item));

    return this.persistSops(updatedSops);
  }

  private generateSopId(): string {
    const ids = this.sopSubject.getValue().map((sop) => Number(sop.id.replace('SOP-', '')) || 0);

    const nextId = Math.max(0, ...ids) + 1;

    return `SOP-${String(nextId).padStart(3, '0')}`;
  }

  saveSop(input: SopSaveInput, user: User, mode: SopSaveMode, id?: string): Sop | null {
    if (user.role === 'Unassigned') {
      return null;
    }

    const validInput =
      input.name.trim() &&
      input.document.name &&
      /\.(pdf|docx?)$/i.test(input.document.name) &&
      SOP_CATEGORIES[input.category]?.includes(input.subCategory);

    if (!validInput) {
      return null;
    }

    const currentSops = this.sopSubject.getValue();

    const timestamp = new Date().toISOString();

    // CASE 1: Create new SOP
    if (!id) {
      if (!input.document.storageKey) {
        return null;
      }

      const status: SopStatus = mode === 'draft' ? 'Draft' : 'Submitted';

      const activity: SopActivity[] = [
        {
          action: 'Created',
          performedBy: user,
          timestamp,
          previousStatus: null,
          newStatus: 'Draft',
          version: 1,
          remarks: input.comments,
        },
      ];

      if (mode === 'submit') {
        activity.push({
          action: 'Submitted',
          performedBy: user,
          timestamp,
          previousStatus: 'Draft',
          newStatus: 'Submitted',
          version: 1,
        });
      }

      const newSop: Sop = {
        ...input,
        name: input.name.trim(),
        id: this.generateSopId(),
        version: 1,
        status,
        uploadedBy: user,
        createdAt: timestamp,
        updatedAt: timestamp,
        activity,
      };

      const success = this.persistSops([newSop, ...currentSops]);

      return success ? newSop : null;
    }

    // CASE 2: Update existing SOP

    const existingSop = currentSops.find((sop) => sop.id === id);

    if (!existingSop || !canEditSop(existingSop, user)) {
      return null;
    }

    const isModification = existingSop.status === 'Modification In Progress';

    const isFileReplaced = input.document.storageKey !== existingSop.document.storageKey;

    const version = isFileReplaced ? existingSop.version + 1 : existingSop.version;

    let status: SopStatus;
    let action: string;

    if (mode === 'draft') {
      status = isModification ? 'Modification In Progress' : 'Draft';

      action = isModification ? 'Modification saved' : 'Draft saved';
    } else {
      status = isModification ? 'Resubmitted' : 'Submitted';

      action = status;
    }

    const event: SopActivity = {
      action,
      performedBy: user,
      timestamp,
      previousStatus: existingSop.status,
      newStatus: status,
      previousVersion: existingSop.version,
      version,
      remarks: input.comments,
    };

    const updatedSop: Sop = {
      ...existingSop,
      ...input,
      name: input.name.trim(),
      version,
      status,
      updatedAt: timestamp,
      activity: [...existingSop.activity, event],
    };

    const success = this.persistSops(currentSops.map((sop) => (sop.id === id ? updatedSop : sop)));

    return success ? updatedSop : null;
  }

  reviewSop(id: string, user: User, decision: ReviewDecision, remarks: string): Sop | null {
    const currentSops = this.sopSubject.getValue();

    const sop = currentSops.find((item) => item.id === id);

    // Check role, ownership and current status.
    if (!sop || !canReviewSop(sop, user)) {
      return null;
    }

    const cleanRemarks = remarks.trim();

    // Remarks are mandatory except for approval.
    if (decision !== 'Approved' && !cleanRemarks) {
      return null;
    }

    const timestamp = new Date().toISOString();

    const updatedSop: Sop = {
      ...sop,

      status: decision,

      reviewerRemarks: cleanRemarks || undefined,

      updatedAt: timestamp,

      activity: [
        ...sop.activity,
        {
          action: decision === 'Requested Modification' ? 'Modification requested' : decision,

          performedBy: user,

          timestamp,

          previousStatus: sop.status,

          newStatus: decision,

          version: sop.version,

          remarks: cleanRemarks,
        },
      ],
    };

    const updatedSops = currentSops.map((item) => (item.id === id ? updatedSop : item));

    const success = this.persistSops(updatedSops);

    return success ? updatedSop : null;
  }
}
