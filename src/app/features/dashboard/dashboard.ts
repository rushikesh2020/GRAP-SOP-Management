import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, formatDate } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
} from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { SopService } from '../../core/services/sop.service';

import { Sop } from '../../models/sop.model';
import { User } from '../../models/user.model';

import { SOP_STATUSES, STATUS_CLASSES } from '../../models/sop.constants';

import { SOP_CATEGORIES } from '../../mock-data/categories.data';

import {
  isOwner,
  canEditSop,
  canStartModification,
  canReviewSop,
} from '../../core/utils/sop-permissions';

import { AppHeaderComponent } from '../../shared/components/app-header/app-header';

import { ActivityComponent } from '../activity/activity';

type DashboardTab = 'mine' | 'review';

@Component({
  selector: 'app-dashboard',
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    AppHeaderComponent,
    ActivityComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly sopService = inject(SopService);
  private readonly router = inject(Router);

  readonly statuses = SOP_STATUSES;
  readonly categories = Object.keys(SOP_CATEGORIES);
  readonly statusClasses = STATUS_CLASSES;

  readonly canEdit = canEditSop;
  readonly canMakeChanges = canStartModification;
  readonly canReview = canReviewSop;

  // selectedActivity: Sop | null = null;
  actionError = '';

  successMessage = '';

  constructor() {
    this.successMessage = sessionStorage.getItem('grap-success') ?? '';

    sessionStorage.removeItem('grap-success');
  }

  // 1. Active tab
  private readonly tabSubject = new BehaviorSubject<DashboardTab>('mine');

  readonly activeTab$ = this.tabSubject.asObservable();

  // 2. Search control
  readonly searchControl = new FormControl('', {
    nonNullable: true,
  });

  readonly search$ = this.searchControl.valueChanges.pipe(
    debounceTime(200),
    distinctUntilChanged(),
    startWith(this.searchControl.value),
  );

  // 3. Filter form
  readonly filterForm = new FormGroup({
    category: new FormControl('', { nonNullable: true }),
    subCategory: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    fromDate: new FormControl('', { nonNullable: true }),
    toDate: new FormControl('', { nonNullable: true }),
  });

  readonly filters$ = this.filterForm.valueChanges.pipe(
    map(() => this.filterForm.getRawValue()),
    startWith(this.filterForm.getRawValue()),
  );

  // 4. Combined dashboard view model
  readonly vm$ = combineLatest({
    user: this.authService.currentUser$,
    sops: this.sopService.sops$,
    activeTab: this.activeTab$,
    search: this.search$,
    filters: this.filters$,
  }).pipe(
    map(({ user, sops, activeTab, search, filters }) => {
      if (!user || user.role === 'Unassigned') {
        return null;
      }

      const isReviewer = user.role === 'Reviewer';

      // Maker must never access the review tab.
      const tab = isReviewer ? activeTab : 'mine';

      const mySops = sops.filter((sop) => isOwner(sop, user));

      const reviewSops = sops.filter((sop) => canReviewSop(sop, user));

      const tabSops = tab === 'mine' ? mySops : reviewSops;

      const query = search.trim().toLowerCase();

      const invalidDateRange =
        !!filters.fromDate && !!filters.toDate && filters.fromDate > filters.toDate;

      // Apply all filters together.
      const rows = invalidDateRange
        ? []
        : tabSops.filter((sop) => {
            const matchesSearch =
              !query ||
              sop.name.toLowerCase().includes(query) ||
              sop.id.toLowerCase().includes(query);

            const matchesCategory = !filters.category || sop.category === filters.category;

            const matchesSubCategory =
              !filters.subCategory || sop.subCategory === filters.subCategory;

            const matchesStatus = !filters.status || sop.status === filters.status;

            // Convert to bank-local date for inclusive comparisons.
            const updatedDate = formatDate(sop.updatedAt, 'yyyy-MM-dd', 'en-US', '+0530');

            const matchesFromDate = !filters.fromDate || updatedDate >= filters.fromDate;

            const matchesToDate = !filters.toDate || updatedDate <= filters.toDate;

            return (
              matchesSearch &&
              matchesCategory &&
              matchesSubCategory &&
              matchesStatus &&
              matchesFromDate &&
              matchesToDate
            );
          });

      // Latest updated SOP first.
      rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      const subCategories = filters.category
        ? (SOP_CATEGORIES[filters.category] ?? [])
        : [...new Set(Object.values(SOP_CATEGORIES).flat())];

      const approvedByMe = sops.filter(
        (sop) =>
          sop.status === 'Approved' &&
          sop.activity.some(
            (event) => event.action === 'Approved' && event.performedBy.id === user.id,
          ),
      );

      return {
        user,
        isReviewer,
        tab,
        rows,
        subCategories,
        invalidDateRange,

        totalCount: tabSops.length,
        myCount: mySops.length,
        reviewCount: reviewSops.length,

        draftCount: mySops.filter((sop) => sop.status === 'Draft').length,

        submittedCount: mySops.filter((sop) => ['Submitted', 'Resubmitted'].includes(sop.status))
          .length,

        approvedCount: mySops.filter((sop) => sop.status === 'Approved').length,

        needsChangesCount: mySops.filter((sop) =>
          ['Requested Modification', 'Modification In Progress'].includes(sop.status),
        ).length,
        approvedByMeCount: approvedByMe.length,
      };
    }),

    shareReplay({
      bufferSize: 1,
      refCount: true,
    }),
  );

  selectTab(tab: DashboardTab): void {
    this.actionError = '';
    this.tabSubject.next(tab);
  }

  clearSubCategory(): void {
    this.filterForm.controls.subCategory.setValue('');
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.searchControl.reset();
  }

  makeChanges(sop: Sop, user: User): void {
    this.actionError = '';

    const success = this.sopService.startModification(sop.id, user);

    if (success) {
      this.router.navigate(['/sop', sop.id, 'edit']);
    } else {
      this.actionError = 'Unable to modify this SOP. Please try again.';
    }
  }

  // openActivity(sop: Sop, dialog: HTMLDialogElement): void {
  //   this.selectedActivity = sop;
  //   dialog.showModal();
  // }
}
