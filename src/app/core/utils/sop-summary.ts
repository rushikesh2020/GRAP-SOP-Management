import { Sop, SopStatus } from '../../models/sop.model';
import { User } from '../../models/user.model';

import {
  canEditSop,
  canReviewSop,
  canStartModification,
  canViewSop,
  isOwner,
} from './sop-permissions';

const DAY_MS = 24 * 60 * 60 * 1000;

// Activity actions that record a reviewer's decision.
const REVIEW_ACTIONS = ['Approved', 'Rejected', 'Modification requested'];

export type StageTone = 'draft' | 'review' | 'approved' | 'changes' | 'rejected';

// Which pipeline stage each status belongs to.
const STAGE_OF: Record<SopStatus, StageTone> = {
  Draft: 'draft',
  Submitted: 'review',
  Resubmitted: 'review',
  'Requested Modification': 'changes',
  'Modification In Progress': 'changes',
  Approved: 'approved',
  Rejected: 'rejected',
};

// Order of the coloured bar segments, following the flow.
const BAR_ORDER: StageTone[] = ['draft', 'review', 'approved', 'changes', 'rejected'];

const BAR_LABELS: Record<StageTone, string> = {
  draft: 'draft',
  review: 'in review',
  approved: 'approved',
  changes: 'with changes requested',
  rejected: 'rejected',
};

export interface PipelineSummary {
  counts: Record<StageTone, number>;
  total: number;
  segments: { tone: StageTone; count: number }[];
  reviewCaption: string;
  approvalRate: number | null;
  firstPassApprovals: number;
  // Text version of the bar for screen readers.
  label: string;
}

export interface ActionSummary {
  count: number;
  headline: string;
  details: string;
  drafts: string;
}

export interface ReviewQueue {
  count: number;
  oldestId: string | null;
  oldestWaiting: string;
  approvedByMe: number;
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function daysSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY_MS));
}

// Pipeline for the SOPs the user owns.
export function buildPipeline(mySops: Sop[], now = Date.now()): PipelineSummary {
  const counts: Record<StageTone, number> = {
    draft: 0,
    review: 0,
    approved: 0,
    changes: 0,
    rejected: 0,
  };

  mySops.forEach((sop) => counts[STAGE_OF[sop.status]]++);

  const inReview = mySops.filter((sop) => STAGE_OF[sop.status] === 'review');

  const avgDays = inReview.length
    ? Math.round(
        inReview.reduce((sum, sop) => sum + daysSince(sop.updatedAt, now), 0) / inReview.length,
      )
    : 0;

  const reviewCaption = inReview.length
    ? `Avg. ${plural(avgDays, 'day', 'days')} waiting`
    : 'Nothing waiting';

  const decided = counts.approved + counts.rejected;

  // Approved without ever being sent back for changes.
  const firstPassApprovals = mySops.filter(
    (sop) =>
      sop.status === 'Approved' &&
      !sop.activity.some((event) => event.action === 'Modification requested'),
  ).length;

  const segments = BAR_ORDER.filter((tone) => counts[tone] > 0).map((tone) => ({
    tone,
    count: counts[tone],
  }));

  const label = segments.length
    ? segments.map((segment) => `${segment.count} ${BAR_LABELS[segment.tone]}`).join(', ')
    : 'No SOPs yet';

  return {
    counts,
    total: mySops.length,
    segments,
    reviewCaption,
    approvalRate: decided ? Math.round((counts.approved / decided) * 100) : null,
    firstPassApprovals,
    label,
  };
}

// The "N SOPs need your action" line under the greeting.
export function buildActionSummary(sops: Sop[], user: User): ActionSummary {
  const mySops = sops.filter((sop) => isOwner(sop, user));

  const toReview = sops.filter((sop) => canReviewSop(sop, user)).length;
  const changes = mySops.filter((sop) => STAGE_OF[sop.status] === 'changes').length;
  const drafts = mySops.filter((sop) => sop.status === 'Draft').length;

  const count = toReview + changes;

  const parts: string[] = [];

  if (toReview) {
    parts.push(`${toReview} waiting for your review`);
  }

  if (changes) {
    parts.push(`${changes} with changes requested`);
  }

  return {
    count,
    headline: count === 1 ? '1 SOP needs your action' : `${count} SOPs need your action`,
    details: parts.join(' and '),
    drafts: drafts
      ? `${plural(drafts, 'draft', 'drafts')} ${drafts === 1 ? 'is' : 'are'} ready to finish.`
      : '',
  };
}

// Reviewer-only card: what is waiting and what they have approved.
export function buildReviewQueue(sops: Sop[], user: User, now = Date.now()): ReviewQueue {
  // Oldest first, so "Review oldest" opens the SOP that has waited longest.
  const queue = sops
    .filter((sop) => canReviewSop(sop, user))
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  const oldest = queue[0];

  const approvedByMe = sops.filter(
    (sop) =>
      sop.status === 'Approved' &&
      sop.activity.some((event) => event.action === 'Approved' && event.performedBy.id === user.id),
  ).length;

  return {
    count: queue.length,
    oldestId: oldest?.id ?? null,
    oldestWaiting: oldest ? plural(daysSince(oldest.updatedAt, now), 'day', 'days') : '—',
    approvedByMe,
  };
}

// Most recently touched SOP the user can keep editing (Draft or Modification In Progress).
export function latestEditable(sops: Sop[], user: User): Sop | null {
  const editable = sops
    .filter((sop) => canEditSop(sop, user))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return editable[0] ?? null;
}

// ---------- "Needs your action" panel ----------

export type ActionKind = 'review' | 'make-changes' | 'continue' | 'edit';

// The one main action for an SOP. Same label everywhere it appears.
export interface RowAction {
  kind: ActionKind;
  label: string;
  icon: string; // Bootstrap icon for the table's icon button
  link: string[] | null; // null: "Make changes" changes the status first, so it is a button
  needsYou: boolean; // filled button when someone is waiting on this user
}

export function rowAction(sop: Sop, user: User): RowAction | null {
  if (canReviewSop(sop, user)) {
    return {
      kind: 'review',
      label: 'Review',
      icon: 'bi-clipboard-check',
      link: ['/sop', sop.id, 'review'],
      needsYou: true,
    };
  }

  if (canStartModification(sop, user)) {
    return {
      kind: 'make-changes',
      label: 'Make changes',
      icon: 'bi-pencil-square',
      link: null,
      needsYou: true,
    };
  }

  if (canEditSop(sop, user)) {
    const continuing = sop.status === 'Modification In Progress';

    return {
      kind: continuing ? 'continue' : 'edit',
      label: continuing ? 'Continue editing' : 'Edit',
      icon: 'bi-pencil',
      link: ['/sop', sop.id, 'edit'],
      needsYou: continuing,
    };
  }

  return null;
}

export interface ActionItem {
  sop: Sop;
  kind: ActionKind;
  action: RowAction;
  waitingDays: number;
  // The message the user should read first: reviewer remarks, or the creator's comments.
  note: { author: string; text: string } | null;
}

function lastReviewer(sop: Sop): User | null {
  const event = [...sop.activity].reverse().find((item) => REVIEW_ACTIONS.includes(item.action));

  return event?.performedBy ?? null;
}

// SOPs waiting on this user, the one that has waited longest first.
export function buildActionItems(sops: Sop[], user: User, now = Date.now()): ActionItem[] {
  const items: ActionItem[] = [];

  for (const sop of sops) {
    const waitingDays = daysSince(sop.updatedAt, now);

    if (canReviewSop(sop, user)) {
      items.push({
        sop,
        kind: 'review',
        action: rowAction(sop, user)!,
        waitingDays,
        note: sop.comments ? { author: sop.uploadedBy.name, text: sop.comments } : null,
      });
      continue;
    }

    const isChange =
      sop.status === 'Requested Modification' || sop.status === 'Modification In Progress';

    if (isOwner(sop, user) && isChange) {
      const reviewer = lastReviewer(sop);

      items.push({
        sop,
        kind: sop.status === 'Requested Modification' ? 'make-changes' : 'continue',
        action: rowAction(sop, user)!,
        waitingDays,
        note:
          sop.reviewerRemarks && reviewer
            ? { author: reviewer.name, text: sop.reviewerRemarks }
            : null,
      });
    }
  }

  return items.sort((a, b) => b.waitingDays - a.waitingDays);
}

// ---------- Recent activity feed ----------

const ACTIVITY_VERBS: Record<string, string> = {
  Created: 'created',
  'Draft saved': 'saved a draft of',
  Submitted: 'submitted',
  'Modification requested': 'requested changes on',
  'Modification started': 'started changes on',
  'Modification saved': 'saved changes to',
  Resubmitted: 'resubmitted',
  Approved: 'approved',
  Rejected: 'rejected',
};

export interface FeedItem {
  sopId: string;
  sopName: string;
  actor: string; // "You" for the signed-in user
  actorId: string;
  initials: string;
  verb: string;
  timestamp: string;
  remarks: string;
}

export interface FeedGroup {
  title: string;
  items: FeedItem[];
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Latest events on SOPs the user may open, split into "This week" and "Earlier".
export function buildRecentActivity(
  sops: Sop[],
  user: User,
  limit = 20,
  now = Date.now(),
): FeedGroup[] {
  const items: FeedItem[] = sops
    .filter((sop) => canViewSop(sop, user))
    .flatMap((sop) =>
      sop.activity.map((event) => ({
        sopId: sop.id,
        sopName: sop.name,
        actor: event.performedBy.id === user.id ? 'You' : event.performedBy.name,
        actorId: event.performedBy.id,
        initials: initials(event.performedBy.name),
        verb: ACTIVITY_VERBS[event.action] ?? event.action.toLowerCase(),
        timestamp: event.timestamp,
        // Only reviewer decisions carry remarks worth quoting in a feed.
        remarks: REVIEW_ACTIONS.includes(event.action) ? (event.remarks ?? '') : '',
      })),
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  const thisWeek = items.filter((item) => daysSince(item.timestamp, now) < 7);
  const earlier = items.filter((item) => daysSince(item.timestamp, now) >= 7);

  return [
    { title: 'This week', items: thisWeek },
    { title: 'Earlier', items: earlier },
  ].filter((group) => group.items.length > 0);
}

// ---------- Routing map (dashboard hero) ----------

export interface RouteToken {
  id: string;
  name: string;
  link: string[];
  waitingDays: number | null; // only where someone is waiting
  needsYou: boolean;
  label: string; // full description for screen readers
}

export interface RouteStation {
  tone: StageTone;
  total: number;
  tokens: RouteToken[];
  more: number; // tokens not shown
}

export interface RouteMap {
  mine: Record<StageTone, RouteStation>;
  forYou: RouteStation | null; // reviewers only
}

const TOKENS_PER_STATION = 4;

// Stations where someone is waiting show the oldest first, with days waited.
const WAITING_TONES: StageTone[] = ['review', 'changes'];

function toStation(tone: StageTone, tokens: RouteToken[], updated: Map<string, number>): RouteStation {
  const waiting = WAITING_TONES.includes(tone);

  const sorted = [...tokens].sort((a, b) => {
    const diff = (updated.get(a.id) ?? 0) - (updated.get(b.id) ?? 0);
    return waiting ? diff : -diff;
  });

  return {
    tone,
    total: sorted.length,
    tokens: sorted.slice(0, TOKENS_PER_STATION),
    more: Math.max(0, sorted.length - TOKENS_PER_STATION),
  };
}

function toToken(sop: Sop, link: string[], needsYou: boolean, waiting: boolean, now: number): RouteToken {
  const waitingDays = waiting ? daysSince(sop.updatedAt, now) : null;

  let label = `${sop.id}, ${sop.name}`;

  if (waitingDays !== null) {
    label += `, waiting ${plural(waitingDays, 'day', 'days')}`;
  }

  if (needsYou) {
    label += ', needs your action';
  }

  return { id: sop.id, name: sop.name, link, waitingDays, needsYou, label };
}

// Places every SOP at the station it is waiting at.
export function buildRouteMap(sops: Sop[], user: User, now = Date.now()): RouteMap {
  const updated = new Map(sops.map((sop) => [sop.id, new Date(sop.updatedAt).getTime()]));

  const byTone: Record<StageTone, RouteToken[]> = {
    draft: [],
    review: [],
    approved: [],
    changes: [],
    rejected: [],
  };

  for (const sop of sops.filter((item) => isOwner(item, user))) {
    const tone = STAGE_OF[sop.status];
    const link = ['/sop', sop.id, canEditSop(sop, user) ? 'edit' : 'view'];

    byTone[tone].push(toToken(sop, link, tone === 'changes', WAITING_TONES.includes(tone), now));
  }

  const mine = Object.fromEntries(
    (Object.keys(byTone) as StageTone[]).map((tone) => [tone, toStation(tone, byTone[tone], updated)]),
  ) as Record<StageTone, RouteStation>;

  const forYou =
    user.role === 'Reviewer'
      ? toStation(
          'review',
          sops
            .filter((sop) => canReviewSop(sop, user))
            .map((sop) => toToken(sop, ['/sop', sop.id, 'review'], true, true, now)),
          updated,
        )
      : null;

  return { mine, forYou };
}

// ---------- Shared by the table ----------

// True when the SOP is waiting on this user: to review it, or to rework it.
export function needsAction(sop: Sop, user: User): boolean {
  return canReviewSop(sop, user) || (isOwner(sop, user) && STAGE_OF[sop.status] === 'changes');
}

// Days in the current status, only for statuses where someone is waiting.
export function waitingDays(sop: Sop, now = Date.now()): number | null {
  return WAITING_TONES.includes(STAGE_OF[sop.status]) ? daysSince(sop.updatedAt, now) : null;
}

// ---------- Header notifications ----------

export type NotificationKind = 'review-requested' | 'changes-requested' | 'approved' | 'rejected';

export interface NotificationItem {
  id: string; // stable per event, used to remember what was read
  kind: NotificationKind;
  sopId: string;
  sopName: string;
  actor: string;
  verb: string; // "requested changes on"
  suffix: string; // " for your review"
  remarks: string;
  timestamp: string;
  link: string[];
}

const DECISION_KINDS: Record<string, NotificationKind> = {
  'Modification requested': 'changes-requested',
  Approved: 'approved',
  Rejected: 'rejected',
};

const DECISION_VERBS: Record<NotificationKind, string> = {
  'review-requested': 'sent',
  'changes-requested': 'requested changes on',
  approved: 'approved',
  rejected: 'rejected',
};

// What other people did that this user should hear about, newest first.
export function buildNotifications(sops: Sop[], user: User, limit = 20): NotificationItem[] {
  const items: NotificationItem[] = [];

  for (const sop of sops) {
    if (isOwner(sop, user)) {
      // Reviewer decisions on my SOPs.
      for (const event of sop.activity) {
        const kind = DECISION_KINDS[event.action];

        if (!kind || event.performedBy.id === user.id) {
          continue;
        }

        items.push({
          id: `${sop.id}|${event.timestamp}`,
          kind,
          sopId: sop.id,
          sopName: sop.name,
          actor: event.performedBy.name,
          verb: DECISION_VERBS[kind],
          suffix: '',
          remarks: event.remarks ?? '',
          timestamp: event.timestamp,
          link: rowAction(sop, user)?.link ?? ['/sop', sop.id, 'view'],
        });
      }
    } else if (canReviewSop(sop, user)) {
      // SOPs that arrived in my review queue.
      const event = [...sop.activity]
        .reverse()
        .find((item) => item.action === 'Submitted' || item.action === 'Resubmitted');

      if (event) {
        items.push({
          id: `${sop.id}|${event.timestamp}`,
          kind: 'review-requested',
          sopId: sop.id,
          sopName: sop.name,
          actor: event.performedBy.name,
          verb: event.action === 'Resubmitted' ? 'resubmitted' : 'sent',
          suffix: ' for your review',
          remarks: '',
          timestamp: event.timestamp,
          link: ['/sop', sop.id, 'review'],
        });
      }
    }
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
