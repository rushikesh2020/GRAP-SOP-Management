import { Component, ElementRef, HostListener, Input, ViewChild, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { User } from '../../../models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { initials } from '../../../core/utils/sop-summary';

import { NotificationBellComponent } from '../notification-bell/notification-bell';

@Component({
  selector: 'app-header',
  imports: [RouterLink, NotificationBellComponent],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
})
export class AppHeaderComponent {
  @Input({ required: true }) user!: User;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  @ViewChild('userMenu') private userMenu?: ElementRef<HTMLElement>;
  @ViewChild('userButton') private userButton?: ElementRef<HTMLButtonElement>;

  menuOpen = false;

  get initials(): string {
    return initials(this.user.name);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  // Close the user menu on a click outside it.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen && !this.userMenu?.nativeElement.contains(event.target as Node)) {
      this.menuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuOpen) {
      this.menuOpen = false;
      this.userButton?.nativeElement.focus();
    }
  }

  async signOut(): Promise<void> {
    this.menuOpen = false;

    try {
      this.authService.signOut();

      this.notificationService.clear();

      const navigated = await this.router.navigate(['/login']);

      if (navigated) {
        this.notificationService.success('Signed out successfully.');
      } else {
        this.notificationService.warning('Signed out. Please return to the login page.');
      }
    } catch {
      this.notificationService.error('Unable to complete sign out. Please try again.');
    }
  }
}
