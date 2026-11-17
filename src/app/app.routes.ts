import { Routes } from '@angular/router';

import { LoginComponent } from './features/login/login';
import { DashboardComponent } from './features/dashboard/dashboard';
import { AccessDenied } from './features/access-denied/access-denied';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

import { SopFormComponent } from './features/sop-form/sop-form';
import { SopDetailComponent } from './features/sop-detail/sop-detail';
import { sopGuard } from './core/guards/sop.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  {
    path: 'login',
    component: LoginComponent,
  },

  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, roleGuard],
  },

  {
    path: 'access-denied',
    component: AccessDenied,
    canActivate: [authGuard],
  },

  {
    path: 'sop/add',
    component: SopFormComponent,
    canActivate: [authGuard, roleGuard],
  },
  {
    path: 'sop/:id/edit',
    component: SopFormComponent,
    canActivate: [authGuard, roleGuard, sopGuard],
    data: { mode: 'edit' },
  },
  {
    path: 'sop/:id/view',
    component: SopDetailComponent,
    canActivate: [authGuard, roleGuard, sopGuard],
    data: { mode: 'view' },
  },
  {
    path: 'sop/:id/review',
    component: SopDetailComponent,
    canActivate: [authGuard, roleGuard, sopGuard],
    data: { mode: 'review' },
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];
