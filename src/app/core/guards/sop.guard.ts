import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { combineLatest, map, take } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { SopService } from '../services/sop.service';

import { canEditSop, canReviewSop, canViewSop } from '../utils/sop-permissions';

export const sopGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const sopService = inject(SopService);
  const router = inject(Router);

  const id = route.paramMap.get('id') ?? '';

  return combineLatest({
    user: authService.currentUser$,
    sop: sopService.getSopById(id),
  }).pipe(
    take(1),

    map(({ user, sop }) => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }

      if (user.role === 'Unassigned') {
        return router.createUrlTree(['/access-denied']);
      }

      if (!sop) {
        return router.createUrlTree(['/dashboard']);
      }

      const mode = route.data['mode'];

      const allowed =
        mode === 'edit'
          ? canEditSop(sop, user)
          : mode === 'review'
            ? canReviewSop(sop, user)
            : canViewSop(sop, user);

      return allowed ? true : router.createUrlTree(['/dashboard']);
    }),
  );
};
