import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { BackNavigationService } from './core/services/back-navigation.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Start tracking navigations before the first page loads, so Back links know where to go.
    provideAppInitializer(() => {
      inject(BackNavigationService);
    }),
  ],
};
