import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { User } from '../../../models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
})
export class AppHeaderComponent {
  @Input({ required: true }) user!: User;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  async signOut(): Promise<void> {
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
