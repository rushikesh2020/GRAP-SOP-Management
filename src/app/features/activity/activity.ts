import { Component, ElementRef, ViewChild, inject } from '@angular/core';

import { AsyncPipe, DatePipe } from '@angular/common';

import { BehaviorSubject, combineLatest, map, of, switchMap } from 'rxjs';

import { SopService } from '../../core/services/sop.service';
import { AuthService } from '../../core/services/auth.service';

import { STATUS_CLASSES } from '../../models/sop.constants';
import { canViewSop } from '../../core/utils/sop-permissions';

@Component({
  selector: 'app-activity',
  imports: [AsyncPipe, DatePipe],
  templateUrl: './activity.html',
  styleUrl: './activity.css',
})
export class ActivityComponent {
  private readonly sopService = inject(SopService);
  private readonly authService = inject(AuthService);

  readonly statusClasses = STATUS_CLASSES;

  @ViewChild('drawer', { static: true })
  private drawer!: ElementRef<HTMLDialogElement>;

  private readonly selectedIdSubject = new BehaviorSubject<string | null>(null);

  readonly vm$ = this.selectedIdSubject.pipe(
    switchMap((id) => {
      if (!id) {
        return of(null);
      }

      return combineLatest({
        sop: this.sopService.getSopById(id),
        user: this.authService.currentUser$,
      }).pipe(
        map(({ sop, user }) => {
          if (!sop || !user || !canViewSop(sop, user)) {
            return null;
          }

          // Sort the actual history newest first.
          const events = [...sop.activity]
            .reverse()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          return {
            sop,
            events,
          };
        }),
      );
    }),
  );

  open(sopId: string): void {
    this.selectedIdSubject.next(sopId);

    const dialog = this.drawer.nativeElement;

    if (!dialog.open) {
      dialog.showModal();
    }
  }

  close(): void {
    this.drawer.nativeElement.close();
  }

  onClosed(): void {
    if (!this.drawer.nativeElement.open) {
      this.selectedIdSubject.next(null);
    }
  }

  getActivityIcon(action: string): string {
    const icons: Record<string, string> = {
      Created: 'bi-file-earmark-plus',

      'Draft saved': 'bi-floppy',

      Submitted: 'bi-send',

      'Modification requested': 'bi-chat-left-text',

      'Modification started': 'bi-pencil-square',

      'Modification saved': 'bi-floppy',

      Resubmitted: 'bi-arrow-repeat',

      Approved: 'bi-check-circle',

      Rejected: 'bi-x-circle',
    };

    return icons[action] ?? 'bi-clock-history';
  }
}
