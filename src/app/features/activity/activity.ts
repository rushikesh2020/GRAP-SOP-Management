import { Component, ElementRef, ViewChild, inject } from '@angular/core';

import { AsyncPipe, DatePipe } from '@angular/common';

import { BehaviorSubject, combineLatest, map, of, switchMap } from 'rxjs';

import { SopService } from '../../core/services/sop.service';
import { AuthService } from '../../core/services/auth.service';

import { STATUS_CLASSES } from '../../models/sop.constants';
import { SopActivity, SopStatus } from '../../models/sop.model';
import { canViewSop } from '../../core/utils/sop-permissions';
import { StageTone, stageTone } from '../../core/utils/sop-summary';

// All events that happened on one version of the file, newest first.
interface VersionBand {
  version: number;
  newFile: boolean;
  events: SopActivity[];
}

function times(count: number): string {
  if (count === 1) {
    return 'once';
  }

  return count === 2 ? 'twice' : `${count} times`;
}

// The SOP's routing slip: every action, grouped by file version.
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

          // Newest first; reverse first so same-time events keep their real order.
          const events = [...sop.activity]
            .reverse()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          return {
            sop,
            eventCount: events.length,
            bands: this.toBands(events),
            story: this.toStory(sop.activity),
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

  tone(status: SopStatus): StageTone {
    return stageTone(status);
  }

  private toBands(events: SopActivity[]): VersionBand[] {
    const bands: VersionBand[] = [];

    for (const event of events) {
      let band = bands[bands.length - 1];

      if (!band || band.version !== event.version) {
        band = { version: event.version, newFile: false, events: [] };
        bands.push(band);
      }

      band.events.push(event);

      if (event.previousVersion !== undefined && event.previousVersion !== event.version) {
        band.newFile = true;
      }
    }

    return bands;
  }

  // One line that tells the SOP's journey, e.g. "Submitted 3 times. Returned for changes twice."
  private toStory(activity: SopActivity[]): string {
    const submits = activity.filter(
      (event) => event.action === 'Submitted' || event.action === 'Resubmitted',
    ).length;

    const returns = activity.filter((event) => event.action === 'Modification requested').length;

    if (!submits) {
      return 'Not submitted for review yet.';
    }

    const story = `Submitted ${times(submits)}.`;

    return returns ? `${story} Returned for changes ${times(returns)}.` : story;
  }
}
