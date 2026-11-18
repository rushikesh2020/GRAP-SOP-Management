import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Sop } from '../../../models/sop.model';
import { ActionItem } from '../../../core/utils/sop-summary';

@Component({
  selector: 'app-needs-action',
  imports: [RouterLink],
  templateUrl: './needs-action.html',
  styleUrl: './needs-action.css',
})
export class NeedsActionComponent {
  @Input({ required: true }) items!: ActionItem[];

  // "Make changes" changes the SOP status, so the dashboard handles it.
  @Output() makeChanges = new EventEmitter<Sop>();
}
