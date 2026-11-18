import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';

import { BackNavigationService } from './core/services/back-navigation.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Smooth cross-fade between pages where the browser supports View Transitions.
    provideRouter(
      routes,
      withViewTransitions({
        // No motion on first load; only when the user moves between pages.
        skipInitialTransition: true,
        // The browser skips a transition when the tab is hidden; that is expected, not an error.
        onViewTransitionCreated: ({ transition }) => {
          transition.ready.catch(() => {});
        },
      }),
    ),
    // Start tracking navigations before the first page loads, so Back links know where to go.
    provideAppInitializer(() => {
      inject(BackNavigationService);
    }),
  ],
};
