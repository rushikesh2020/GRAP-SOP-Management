import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, map, shareReplay } from 'rxjs';

import { AuthService } from './auth.service';
import { SopService } from './sop.service';

import { NotificationItem, buildNotifications } from '../utils/sop-summary';

export interface InboxItem extends NotificationItem {
  unread: boolean;
}

// Notifications shown under the header bell. Built from SOP activity;
// only "what has been read" is stored, per user, in localStorage.
@Injectable({
  providedIn: 'root',
})
export class InboxService {
  private readonly authService = inject(AuthService);
  private readonly sopService = inject(SopService);

  // Emits whenever read state changes, so items$ recomputes.
  private readonly readChanged = new BehaviorSubject<void>(undefined);

  readonly items$ = combineLatest({
    user: this.authService.currentUser$,
    sops: this.sopService.sops$,
    changed: this.readChanged,
  }).pipe(
    map(({ user, sops }) => {
      if (!user) {
        return [] as InboxItem[];
      }

      const read = this.loadRead(user.id);

      return buildNotifications(sops, user).map((item) => ({
        ...item,
        unread: !read.has(item.id),
      }));
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly unreadCount$ = this.items$.pipe(map((items) => items.filter((i) => i.unread).length));

  markRead(userId: string, ids: string[]): void {
    const read = this.loadRead(userId);

    ids.forEach((id) => read.add(id));

    try {
      localStorage.setItem(this.storageKey(userId), JSON.stringify([...read]));
    } catch {
      // Read state is a convenience; the notification list still works without it.
    }

    this.readChanged.next();
  }

  private loadRead(userId: string): Set<string> {
    try {
      const stored = localStorage.getItem(this.storageKey(userId));

      return new Set(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      return new Set();
    }
  }

  private storageKey(userId: string): string {
    return `grap-read-notifications-${userId}`;
  }
}
