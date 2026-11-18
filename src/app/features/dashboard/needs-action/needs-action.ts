import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Sop } from '../../../models/sop.model';
import { ActionItem } from '../../../core/utils/sop-summary';

// The user's work queue: SOPs waiting on them, oldest first, split by kind of work.
@Component({
  selector: 'app-needs-action',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './needs-action.html',
  styleUrl: './needs-action.css',
})
export class NeedsActionComponent {
  @Input({ required: true }) items!: ActionItem[];

  // "Make changes" changes the SOP status, so the dashboard handles it.
  @Output() makeChanges = new EventEmitter<Sop>();

  get toReview(): ActionItem[] {
    return this.items.filter((item) => item.kind === 'review');
  }

  get toRework(): ActionItem[] {
    return this.items.filter((item) => item.kind !== 'review');
  }
}
