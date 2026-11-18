import { Component, ElementRef, HostListener, Input, ViewChild, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { InboxItem, InboxService } from '../../../core/services/inbox.service';
import { NotificationKind } from '../../../core/utils/sop-summary';

@Component({
  selector: 'app-notification-bell',
  imports: [AsyncPipe, DatePipe, RouterLink],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBellComponent {
  @Input({ required: true }) userId!: string;

  private readonly inbox = inject(InboxService);
  private readonly host = inject(ElementRef<HTMLElement>);

  @ViewChild('bellButton') private bellButton?: ElementRef<HTMLButtonElement>;

  readonly items$ = this.inbox.items$;
  readonly unreadCount$ = this.inbox.unreadCount$;

  open = false;

  readonly icons: Record<NotificationKind, string> = {
    'review-requested': 'bi-clipboard-check',
    'changes-requested': 'bi-arrow-return-left',
    approved: 'bi-check-lg',
    rejected: 'bi-x-lg',
  };

  toggle(): void {
    this.open = !this.open;
  }

  openItem(item: InboxItem): void {
    this.inbox.markRead(this.userId, [item.id]);
    this.open = false;
  }

  markAllRead(items: InboxItem[]): void {
    this.inbox.markRead(
      this.userId,
      items.map((item) => item.id),
    );
  }

  // Close when clicking anywhere outside the bell and its panel.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.open = false;
      this.bellButton?.nativeElement.focus();
    }
  }
}
