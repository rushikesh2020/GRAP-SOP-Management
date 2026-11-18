import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';

import { DatePipe } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';

import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { SopService } from '../../core/services/sop.service';
import { DocumentService } from '../../core/services/document.service';
import { NotificationService } from '../../core/services/notification.service';
import { BackNavigationService } from '../../core/services/back-navigation.service';

import { User } from '../../models/user.model';

import { Sop, ReviewDecision } from '../../models/sop.model';

import { STATUS_CLASSES } from '../../models/sop.constants';

import { canReviewSop, canViewSop } from '../../core/utils/sop-permissions';

import { AppHeaderComponent } from '../../shared/components/app-header/app-header';

import { DocumentPreviewComponent } from '../../shared/components/document-preview/document-preview';
import { ActivityComponent } from '../activity/activity';

@Component({
  selector: 'app-sop-detail',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    AppHeaderComponent,
    DocumentPreviewComponent,
    ActivityComponent,
  ],
  templateUrl: './sop-detail.html',
  styleUrl: './sop-detail.css',
})
export class SopDetailComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly sopService = inject(SopService);
  private readonly documentService = inject(DocumentService);
  private readonly notificationService = inject(NotificationService);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly statusClasses = STATUS_CLASSES;

  readonly mode: 'view' | 'review' =
    this.route.snapshot.data['mode'] === 'review' ? 'review' : 'view';

  // Where "Back" goes: the page the user came from, else the matching dashboard tab.
  readonly backTarget = inject(BackNavigationService).backTarget(
    this.mode === 'review' ? 'review' : 'mine',
  );

  user: User | null = null;
  sop: Sop | null = null;

  previewBlob: Blob | null = null;

  loading = true;
  saving = false;

  loadError = '';
  documentError = '';

  pendingDecision: ReviewDecision | null = null;

  readonly remarksControl = new FormControl('', {
    nonNullable: true,
  });

  // Check if the user can perform reviewer actions.
  get canReview(): boolean {
    return this.mode === 'review' && !!this.user && !!this.sop && canReviewSop(this.sop, this.user);
  }

  get confirmationTitle(): string {
    switch (this.pendingDecision) {
      case 'Approved':
        return 'Approve and publish SOP?';

      case 'Rejected':
        return 'Reject this SOP?';

      case 'Requested Modification':
        return 'Request modification?';

      default:
        return 'Confirm decision';
    }
  }

  get confirmationMessage(): string {
    switch (this.pendingDecision) {
      case 'Approved':
        return 'This SOP will be approved and marked as published to the GRAP knowledge base.';

      case 'Rejected':
        return 'This SOP will be rejected and will no longer be available for review.';

      case 'Requested Modification':
        return 'This SOP will be returned to the creator along with your remarks.';

      default:
        return '';
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      this.user = await firstValueFrom(this.authService.currentUser$);

      if (!this.user) {
        await this.router.navigate(['/login']);
        return;
      }

      const id = this.route.snapshot.paramMap.get('id');

      if (!id) {
        this.loadError = 'SOP ID is missing.';
        return;
      }

      const sop = await firstValueFrom(this.sopService.getSopById(id));

      if (!sop) {
        this.loadError = 'The requested SOP was not found.';
        return;
      }

      const allowed =
        this.mode === 'review' ? canReviewSop(sop, this.user) : canViewSop(sop, this.user);

      if (!allowed) {
        this.loadError = 'You do not have permission to access this SOP.';
        return;
      }

      this.sop = sop;

      // Retrieve the actual uploaded document.
      try {
        this.previewBlob = await this.documentService.getDocument(sop.document);

        if (!this.previewBlob) {
          this.documentError = 'The SOP document is unavailable.';
        }
      } catch {
        this.documentError = 'Unable to retrieve the SOP document.';
      }
    } catch {
      this.loadError = 'Unable to load the SOP details.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  requestDecision(decision: ReviewDecision, dialog: HTMLDialogElement): void {
    if (!this.canReview || this.saving) {
      return;
    }

    // Do not approve a document that could not be retrieved.
    if (decision === 'Approved' && !this.previewBlob) {
      this.notificationService.error('The document must be available before approval.');
      return;
    }

    // Dynamically configure remarks validation.
    if (decision === 'Approved') {
      this.remarksControl.clearValidators();
    } else {
      this.remarksControl.setValidators([Validators.required, Validators.pattern(/\S/)]);
    }

    this.remarksControl.updateValueAndValidity();

    this.remarksControl.markAsTouched();

    if (this.remarksControl.invalid) {
      return;
    }

    this.pendingDecision = decision;

    dialog.showModal();
  }

  async confirmDecision(dialog: HTMLDialogElement): Promise<void> {
    const decision = this.pendingDecision;

    if (!decision || !this.sop || !this.user || !this.canReview || this.saving) {
      return;
    }

    if (this.remarksControl.invalid) {
      return;
    }

    this.saving = true;

    dialog.close();
    this.pendingDecision = null;

    try {
      const updatedSop = this.sopService.reviewSop(
        this.sop.id,
        this.user,
        decision,
        this.remarksControl.value,
      );

      if (!updatedSop) {
        this.notificationService.error(
          'Unable to save the review decision. The SOP may have already been updated.',
        );

        return;
      }

      // Update the current screen if navigation fails.
      this.sop = updatedSop;

      let message = '';

      switch (decision) {
        case 'Approved':
          message = 'SOP approved and published successfully.';
          break;

        case 'Rejected':
          message = 'SOP rejected successfully.';
          break;

        case 'Requested Modification':
          message =
            'Modification requested successfully. The SOP has been returned to its creator.';
          break;
      }

      this.notificationService.success(message);

      try {
        const navigated = await this.router.navigate(['/dashboard'], {
          queryParams: { tab: 'review' },
        });

        // The decision is saved, so this is a warning, not an error.
        if (!navigated) {
          this.notificationService.warning('Decision saved. Please return to the dashboard.');
        }
      } catch {
        this.notificationService.warning('Decision saved. Please return to the dashboard.');
      }
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  cancelDecision(dialog: HTMLDialogElement): void {
    this.pendingDecision = null;
    dialog.close();
  }

  back(): void {
    if (this.saving) {
      return;
    }

    this.router.navigateByUrl(this.backTarget.url);
  }
}
