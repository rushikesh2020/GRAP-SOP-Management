import { Component, ElementRef, HostListener, Input, ViewChild, inject } from '@angular/core';
import { FormControl } from '@angular/forms';

interface CalendarDay {
  iso: string; // yyyy-MM-dd, the same format the filter form uses
  day: number;
  inMonth: boolean;
  isToday: boolean;
  label: string; // full date for screen readers
}

interface Preset {
  label: string;
  range: () => [string, string];
}

// Local calendar date as yyyy-MM-dd.
function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function fromIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return date;
}

const SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const FULL = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const LONG = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' });
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

// One field for a date range: quick ranges plus a single month calendar.
// Writes to the dashboard's existing fromDate / toDate controls.
@Component({
  selector: 'app-date-range',
  templateUrl: './date-range.html',
  styleUrl: './date-range.css',
})
export class DateRangeComponent {
  @Input({ required: true }) fromControl!: FormControl<string>;
  @Input({ required: true }) toControl!: FormControl<string>;
  @Input() labelId = '';

  private readonly host = inject(ElementRef<HTMLElement>);

  @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>;

  readonly weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  readonly presets: Preset[] = [
    { label: 'Last 7 days', range: () => [toIso(daysAgo(6)), toIso(new Date())] },
    { label: 'Last 30 days', range: () => [toIso(daysAgo(29)), toIso(new Date())] },
    {
      label: 'This month',
      range: () => {
        const today = new Date();
        return [toIso(new Date(today.getFullYear(), today.getMonth(), 1)), toIso(today)];
      },
    },
    {
      label: 'Last 3 months',
      range: () => {
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        return [toIso(start), toIso(new Date())];
      },
    },
  ];

  open = false;

  // First day of the month shown in the calendar.
  viewMonth = new Date();

  // A start picked in the calendar while waiting for the end.
  pendingStart: string | null = null;

  get from(): string {
    return this.fromControl.value;
  }

  get to(): string {
    return this.toControl.value;
  }

  get hasValue(): boolean {
    return !!this.from || !!this.to;
  }

  get summary(): string {
    const { from, to } = this;

    if (from && to) {
      const start = fromIso(from);
      const end = fromIso(to);
      const startText = start.getFullYear() === end.getFullYear() ? SHORT.format(start) : FULL.format(start);

      return `${startText} – ${FULL.format(end)}`;
    }

    if (from) {
      return `From ${FULL.format(fromIso(from))}`;
    }

    return to ? `Until ${FULL.format(fromIso(to))}` : 'Any date';
  }

  get monthTitle(): string {
    return MONTH.format(this.viewMonth);
  }

  // Six rows of seven days, Monday first, padded with the neighbouring months.
  get days(): CalendarDay[] {
    const year = this.viewMonth.getFullYear();
    const month = this.viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const today = toIso(new Date());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(year, month, 1 - offset + index);
      const iso = toIso(date);

      return {
        iso,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
        isToday: iso === today,
        label: LONG.format(date),
      };
    });
  }

  toggle(): void {
    this.open ? this.close(false) : this.openPanel();
  }

  previousMonth(): void {
    this.viewMonth = new Date(this.viewMonth.getFullYear(), this.viewMonth.getMonth() - 1, 1);
  }

  nextMonth(): void {
    this.viewMonth = new Date(this.viewMonth.getFullYear(), this.viewMonth.getMonth() + 1, 1);
  }

  applyPreset(preset: Preset): void {
    const [from, to] = preset.range();
    this.setRange(from, to);
    this.close(true);
  }

  // First click picks the start, second click picks the end (in either order).
  pickDay(iso: string): void {
    if (!this.pendingStart) {
      this.pendingStart = iso;
      return;
    }

    const [from, to] = [this.pendingStart, iso].sort();
    this.setRange(from, to);
    this.close(true);
  }

  clear(): void {
    this.setRange('', '');
    this.close(false);
  }

  isStart(iso: string): boolean {
    return iso === (this.pendingStart ?? this.from);
  }

  isEnd(iso: string): boolean {
    return !this.pendingStart && iso === this.to;
  }

  inRange(iso: string): boolean {
    return !this.pendingStart && !!this.from && !!this.to && iso > this.from && iso < this.to;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close(true);
    }
  }

  private openPanel(): void {
    const anchor = this.to || this.from;
    const date = anchor ? fromIso(anchor) : new Date();

    this.viewMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    this.pendingStart = null;
    this.open = true;
  }

  private close(returnFocus: boolean): void {
    this.open = false;
    this.pendingStart = null;

    if (returnFocus) {
      this.trigger?.nativeElement.focus();
    }
  }

  private setRange(from: string, to: string): void {
    this.fromControl.setValue(from);
    this.toControl.setValue(to);
  }
}
