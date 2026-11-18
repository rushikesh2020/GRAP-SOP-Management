import { Component, Input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  PipelineSummary,
  ReviewQueue,
  RouteMap,
  StageTone,
} from '../../../core/utils/sop-summary';

@Component({
  selector: 'app-route-map',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './route-map.html',
  styleUrl: './route-map.css',
})
export class RouteMapComponent {
  @Input({ required: true }) map!: RouteMap;
  @Input({ required: true }) pipeline!: PipelineSummary;
  @Input() queue: ReviewQueue | null = null;

  readonly stationNames: Record<StageTone, string> = {
    draft: 'Drafting',
    review: 'Submitted for review',
    approved: 'Approved',
    rejected: 'Rejected',
    changes: 'Returned for changes',
  };
}
