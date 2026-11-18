import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe, DatePipe, formatDate } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  shareReplay,
  startWith,
} from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { SopService } from '../../core/services/sop.service';
import { NotificationService } from '../../core/services/notification.service';

import { Sop } from '../../models/sop.model';
import { User } from '../../models/user.model';

import { SOP_STATUSES, STATUS_CLASSES } from '../../models/sop.constants';

import { SOP_CATEGORIES } from '../../mock-data/categories.data';

import { isOwner, canReviewSop } from '../../core/utils/sop-permissions';

import {
  buildActionItems,
  buildActionSummary,
  buildPipeline,
  buildRecentActivity,
  buildReviewQueue,
  buildRouteMap,
  latestEditable,
  needsAction,
  rowAction,
  waitingDays,
} from '../../core/utils/sop-summary';

import { AppHeaderComponent } from '../../shared/components/app-header/app-header';

import { ActivityComponent } from '../activity/activity';
import { RouteMapComponent } from './route-map/route-map';
import { NeedsActionComponent } from './needs-action/needs-action';
import { RecentActivityComponent } from './recent-activity/recent-activity';
import { DateRangeComponent } from './date-range/date-range';

type DashboardTab = 'mine' | 'review';

const PAGE_SIZE = 10;

function greetingForNow(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  return hour < 17 ? 'Good afternoon' : 'Good evening';
}

@Component({
  selector: 'app-dashboard',
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    AppHeaderComponent,
    ActivityComponent,
    RouteMapComponent,
    NeedsActionComponent,
    RecentActivityComponent,
    DateRangeComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly sopService = inject(SopService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);

  readonly statuses = SOP_STATUSES;
  readonly categories = Object.keys(SOP_CATEGORIES);
  readonly statusClasses = STATUS_CLASSES;

  readonly needsAction = needsAction;
  readonly rowAction = rowAction;
  readonly waitingDays = waitingDays;

  readonly greeting = greetingForNow();

  // selectedActivity: Sop | null = null;

  // 1. Active tab (starts from ?tab=review when coming back from a review)
  private readonly tabSubject = new BehaviorSubject<DashboardTab>(
    this.route.snapshot.queryParamMap.get('tab') === 'review' ? 'review' : 'mine',
  );

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

  // 4. Table page (1-based). Any change to search or filters starts again at page 1.
  private readonly pageSubject = new BehaviorSubject<number>(1);

  constructor() {
    merge(this.searchControl.valueChanges, this.filterForm.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.pageSubject.next(1));
  }

  // 5. Combined dashboard view model
  readonly vm$ = combineLatest({
    user: this.authService.currentUser$,
    sops: this.sopService.sops$,
    activeTab: this.activeTab$,
    search: this.search$,
    filters: this.filters$,
    page: this.pageSubject,
  }).pipe(
    map(({ user, sops, activeTab, search, filters, page }) => {
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

      // Current page of rows; the page never goes past the last one.
      const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
      const currentPage = Math.min(page, pageCount);
      const firstIndex = (currentPage - 1) * PAGE_SIZE;
      const pageRows = rows.slice(firstIndex, firstIndex + PAGE_SIZE);

      const subCategories = filters.category
        ? (SOP_CATEGORIES[filters.category] ?? [])
        : [...new Set(Object.values(SOP_CATEGORIES).flat())];

      return {
        user,
        firstName: user.name.split(' ')[0],
        isReviewer,
        tab,
        rows,
        pageRows,
        pager: {
          page: currentPage,
          pageCount,
          pages: Array.from({ length: pageCount }, (_, index) => index + 1),
          from: rows.length ? firstIndex + 1 : 0,
          to: firstIndex + pageRows.length,
        },
        subCategories,
        invalidDateRange,

        totalCount: tabSops.length,
        myCount: mySops.length,
        reviewCount: reviewSops.length,

        // Hero band: greeting line, routing map and its stats
        actions: buildActionSummary(sops, user),
        route: buildRouteMap(sops, user),
        pipeline: buildPipeline(mySops),
        queue: isReviewer ? buildReviewQueue(sops, user) : null,
        continueSop: latestEditable(sops, user),
        actionItems: buildActionItems(sops, user),
        recentActivity: buildRecentActivity(sops, user),
      };
    }),

    shareReplay({
      bufferSize: 1,
      refCount: true,
    }),
  );

  selectTab(tab: DashboardTab): void {
    this.tabSubject.next(tab);
    this.pageSubject.next(1);

    // Keep the tab in the URL, so refresh and "Back" links return to the same tab.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'review' ? 'review' : null },
      replaceUrl: true,
    });
  }

  clearSubCategory(): void {
    this.filterForm.controls.subCategory.setValue('');
  }

  goToPage(page: number): void {
    this.pageSubject.next(page);
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.searchControl.reset();
  }

  makeChanges(sop: Sop, user: User): void {
    const success = this.sopService.startModification(sop.id, user);

    if (success) {
      this.notificationService.info(`${sop.id} is now in Modification In Progress.`);
      this.router.navigate(['/sop', sop.id, 'edit']);
    } else {
      this.notificationService.error('Unable to modify this SOP. Please try again.');
    }
  }

  // openActivity(sop: Sop, dialog: HTMLDialogElement): void {
  //   this.selectedActivity = sop;
  //   dialog.showModal();
  // }
}
