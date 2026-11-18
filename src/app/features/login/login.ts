import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { SopService } from '../../core/services/sop.service';
import { MOCK_USERS } from '../../mock-data/users.data';
import { NotificationService } from '../../core/services/notification.service';
import { Role, User } from '../../models/user.model';
import { buildActionSummary, initials } from '../../core/utils/sop-summary';

interface Persona {
  user: User;
  initials: string;
  roleLabel: string;
  waiting: number; // SOPs waiting on this account, from the demo data
}

const ROLE_LABELS: Record<Role, string> = {
  Maker: 'Maker',
  Reviewer: 'Reviewer',
  Unassigned: 'No role assigned',
};

@Component({
  selector: 'app-login',
  imports: [AsyncPipe, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly sopService = inject(SopService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  // Demo accounts, each with how many SOPs are waiting on it.
  readonly personas$ = this.sopService.sops$.pipe(
    map((sops) =>
      MOCK_USERS.map(
        (user): Persona => ({
          user,
          initials: initials(user.name),
          roleLabel: ROLE_LABELS[user.role],
          waiting: user.role === 'Unassigned' ? 0 : buildActionSummary(sops, user).count,
        }),
      ),
    ),
  );

  errorMessage = '';

  readonly loginForm = new FormGroup({
    userId: new FormControl('EMP001', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  async signIn(): Promise<void> {
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    try {
      const user = this.authService.signIn(this.loginForm.controls.userId.value);

      if (!user) {
        this.notificationService.error('Unable to sign in. Please try again.');

        return;
      }

      this.notificationService.clear();

      const destination = user.role === 'Unassigned' ? '/access-denied' : '/dashboard';

      const navigated = await this.router.navigate([destination]);

      if (!navigated) {
        this.notificationService.error('Signed in, but unable to open the requested page.');
        return;
      }

      this.notificationService.success(`Signed in successfully as ${user.name}.`);
    } catch {
      this.notificationService.error('Unable to complete sign-in. Please try again.');
    }
  }
}
