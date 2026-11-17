import { Injectable } from '@angular/core';

import { BehaviorSubject, Subscription, timer } from 'rxjs';

import { NotificationMessage, NotificationType } from '../../models/notification.model';

type PauseReason = 'hover' | 'focus';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private nextId = 0;

  private readonly notificationSubject = new BehaviorSubject<NotificationMessage[]>([]);

  readonly notifications$ = this.notificationSubject.asObservable();

  private readonly timers = new Map<number, Subscription>();

  private readonly paused = new Map<number, Set<PauseReason>>();

  // Separate announcements for screen readers.
  private readonly politeSubject = new BehaviorSubject<NotificationMessage | null>(null);

  private readonly assertiveSubject = new BehaviorSubject<NotificationMessage | null>(null);

  readonly polite$ = this.politeSubject.asObservable();
  readonly assertive$ = this.assertiveSubject.asObservable();

  success(message: string): void {
    this.show('success', 'Success', message, 5000);
  }

  error(message: string): void {
    this.show('error', 'Error', message, 0);
  }

  warning(message: string): void {
    this.show('warning', 'Warning', message, 0);
  }

  info(message: string): void {
    this.show('info', 'Information', message, 5000);
  }

  private show(type: NotificationType, title: string, message: string, duration: number): void {
    const notification: NotificationMessage = {
      id: ++this.nextId,
      type,
      title,
      message,
      duration,
    };

    this.notificationSubject.next([...this.notificationSubject.getValue(), notification]);

    if (type === 'error' || type === 'warning') {
      this.assertiveSubject.next(notification);
    } else {
      this.politeSubject.next(notification);
    }

    this.startTimer(notification);
  }

  private startTimer(notification: NotificationMessage): void {
    if (notification.duration <= 0) {
      return;
    }

    this.timers.get(notification.id)?.unsubscribe();

    const subscription = timer(notification.duration).subscribe(() => {
      this.dismiss(notification.id);
    });

    this.timers.set(notification.id, subscription);
  }

  pause(id: number, reason: PauseReason): void {
    const reasons = this.paused.get(id) ?? new Set();

    reasons.add(reason);

    this.paused.set(id, reasons);

    this.timers.get(id)?.unsubscribe();
    this.timers.delete(id);
  }

  resume(id: number, reason: PauseReason): void {
    const reasons = this.paused.get(id);

    reasons?.delete(reason);

    if (reasons?.size) {
      return;
    }

    this.paused.delete(id);

    const notification = this.notificationSubject.getValue().find((item) => item.id === id);

    if (notification) {
      this.startTimer(notification);
    }
  }

  dismiss(id: number): void {
    this.timers.get(id)?.unsubscribe();

    this.timers.delete(id);
    this.paused.delete(id);

    this.notificationSubject.next(
      this.notificationSubject.getValue().filter((item) => item.id !== id),
    );
  }

  clear(): void {
    this.timers.forEach((subscription) => subscription.unsubscribe());

    this.timers.clear();
    this.paused.clear();

    this.notificationSubject.next([]);
    this.politeSubject.next(null);
    this.assertiveSubject.next(null);
  }
}
