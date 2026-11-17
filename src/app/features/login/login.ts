import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';
import { MOCK_USERS } from '../../mock-data/users.data';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  readonly users = MOCK_USERS;

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
