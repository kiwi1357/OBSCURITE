// src/app/app.config.ts
import { ApplicationConfig, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { LanguageService } from './core/services/language.service'; // Import
import { lastValueFrom } from 'rxjs'; // Import

// Factory function for APP_INITIALIZER
export function initializeLanguageFactory(languageService: LanguageService): () => Promise<any> {
  return () => lastValueFrom(languageService.supportedLanguages$).then(() => {
    languageService.initializeLanguageFromStorageOrBrowser();
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    LanguageService, // Ensure LanguageService is provided
    {
      provide: APP_INITIALIZER,
      useFactory: initializeLanguageFactory,
      deps: [LanguageService], // Dependencies for the factory
      multi: true
    }
  ]
};
