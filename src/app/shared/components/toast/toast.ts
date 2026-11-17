import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';

import { NotificationService } from '../../../core/services/notification.service';

import { NotificationType } from '../../../models/notification.model';

@Component({
  selector: 'app-toast',
  imports: [AsyncPipe],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class ToastComponent {
  private readonly notificationService = inject(NotificationService);

  readonly notifications$ = this.notificationService.notifications$;

  readonly polite$ = this.notificationService.polite$;

  readonly assertive$ = this.notificationService.assertive$;

  readonly icons: Record<NotificationType, string> = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
  };

  dismiss(id: number): void {
    this.notificationService.dismiss(id);
  }

  pause(id: number, reason: 'hover' | 'focus'): void {
    this.notificationService.pause(id, reason);
  }

  resume(id: number, reason: 'hover' | 'focus'): void {
    this.notificationService.resume(id, reason);
  }

  onFocusOut(id: number, event: FocusEvent): void {
    const container = event.currentTarget as HTMLElement;

    if (!container.contains(event.relatedTarget as Node | null)) {
      this.resume(id, 'focus');
    }
  }
}
