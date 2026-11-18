import { Injectable, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

export interface BackTarget {
  url: string;
  label: string;
}

export type DashboardTab = 'mine' | 'review';

// Remembers the page the user just left, so "Back" can return there
// (with the right dashboard tab) instead of always going to the dashboard.
@Injectable({
  providedIn: 'root',
})
export class BackNavigationService {
  private readonly router = inject(Router);

  private lastUrl: string | null = null;

  constructor() {
    // At NavigationStart, router.url is still the page being left.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => (this.lastUrl = this.router.url));
  }

  // Call when a page is created. The fallback is used after a refresh or a direct link.
  backTarget(fallbackTab: DashboardTab): BackTarget {
    const url = this.lastUrl;

    if (url?.startsWith('/dashboard')) {
      const tab = this.router.parseUrl(url).queryParams['tab'] === 'review' ? 'review' : 'mine';

      return { url, label: this.dashboardLabel(tab) };
    }

    if (url && /^\/sop\/[^/]+\/(view|review)/.test(url)) {
      return { url, label: 'Back to SOP details' };
    }

    return {
      url: fallbackTab === 'review' ? '/dashboard?tab=review' : '/dashboard',
      label: this.dashboardLabel(fallbackTab),
    };
  }

  private dashboardLabel(tab: DashboardTab): string {
    return tab === 'review' ? 'Back to For My Review' : 'Back to My SOPs';
  }
}
