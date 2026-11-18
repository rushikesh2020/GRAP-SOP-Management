import { Routes } from '@angular/router';

import { LoginComponent } from './features/login/login';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { sopGuard } from './core/guards/sop.guard';

// Login is the landing page, so it stays in the main bundle.
// Every other page is lazy-loaded: its code downloads the first time it is opened.
const loadDashboard = () =>
  import('./features/dashboard/dashboard').then((m) => m.DashboardComponent);

const loadSopForm = () => import('./features/sop-form/sop-form').then((m) => m.SopFormComponent);

const loadSopDetail = () =>
  import('./features/sop-detail/sop-detail').then((m) => m.SopDetailComponent);

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
    loadComponent: loadDashboard,
    canActivate: [authGuard, roleGuard],
  },

  {
    path: 'access-denied',
    loadComponent: () =>
      import('./features/access-denied/access-denied').then((m) => m.AccessDenied),
    canActivate: [authGuard],
  },

  {
    path: 'sop/add',
    loadComponent: loadSopForm,
    canActivate: [authGuard, roleGuard],
  },
  {
    path: 'sop/:id/edit',
    loadComponent: loadSopForm,
    canActivate: [authGuard, roleGuard, sopGuard],
    data: { mode: 'edit' },
  },
  {
    path: 'sop/:id/view',
    loadComponent: loadSopDetail,
    canActivate: [authGuard, roleGuard, sopGuard],
    data: { mode: 'view' },
  },
  {
    path: 'sop/:id/review',
    loadComponent: loadSopDetail,
    canActivate: [authGuard, roleGuard, sopGuard],
    data: { mode: 'review' },
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];
