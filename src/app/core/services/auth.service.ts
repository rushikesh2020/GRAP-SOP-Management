import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

import { User } from '../../models/user.model';
import { MOCK_USERS } from '../../mock-data/users.data';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly storageKey = 'grap-user-id';

  private readonly userSubject = new BehaviorSubject<User | null>(this.restoreSession());

  readonly currentUser$ = this.userSubject.asObservable();

  readonly isAuthenticated$ = this.currentUser$.pipe(map((user) => user !== null));

  readonly isReviewer$ = this.currentUser$.pipe(map((user) => user?.role === 'Reviewer'));

  signIn(userId: string): User | null {
    const user = MOCK_USERS.find((u) => u.id === userId);

    if (!user) {
      return null;
    }

    sessionStorage.setItem(this.storageKey, user.id);

    this.userSubject.next(user);

    return user;
  }

  signOut(): void {
    sessionStorage.removeItem(this.storageKey);
    this.userSubject.next(null);
  }

  private restoreSession(): User | null {
    const userId = sessionStorage.getItem(this.storageKey);

    return MOCK_USERS.find((u) => u.id === userId) ?? null;
  }
}
