import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';

import { FeedGroup } from '../../../core/utils/sop-summary';

const AVATAR_TONES = 5;

@Component({
  selector: 'app-recent-activity',
  imports: [DatePipe],
  templateUrl: './recent-activity.html',
  styleUrl: './recent-activity.css',
})
export class RecentActivityComponent {
  @Input({ required: true }) groups!: FeedGroup[];

  // The dashboard owns the activity drawer.
  @Output() openActivity = new EventEmitter<string>();

  // Same person, same colour: derived from the employee ID.
  avatarTone(userId: string): string {
    const sum = [...userId].reduce((total, char) => total + char.charCodeAt(0), 0);

    return `tone-${sum % AVATAR_TONES}`;
  }
}
