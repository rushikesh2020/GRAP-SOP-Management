import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  imports: [AsyncPipe],
  selector: 'app-access-denied',
  styleUrl: './access-denied.css',
  templateUrl: './access-denied.html',
})
export class AccessDenied {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser$ = this.authService.currentUser$;

  signOut(): void {
    this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
