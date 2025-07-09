// src/app/core/services/language.service.ts
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment'; // For apiUrl

// Interface for the language object expected from the backend
export interface SupportedLanguage {
  code: string;
  name: string;
  isDefault?: boolean; // Optional, as not all languages will be default
  isActive?: boolean; // Optional, if backend provides this
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Holds the list of language codes fetched from backend
  private supportedLanguageCodes: string[] = ['en']; // Fallback/initial default
  private defaultLanguageCode: string = 'en'; // Fallback/initial default

  // Observable for supported languages, fetched once and cached
  public supportedLanguages$: Observable<SupportedLanguage[]>;

  // activeLang$ remains a BehaviorSubject, initialized with a sensible default
  activeLang$ = new BehaviorSubject<string>(this.defaultLanguageCode);

  constructor() {
    this.supportedLanguages$ = this.fetchSupportedLanguages().pipe(
      tap(languages => {
        if (languages && languages.length > 0) {
          this.supportedLanguageCodes = languages.map(lang => lang.code);
          const defaultLangFromAPI = languages.find(lang => lang.isDefault);
          this.defaultLanguageCode = defaultLangFromAPI ? defaultLangFromAPI.code
            : (languages.find(lang => lang.isActive !== false)?.code || this.supportedLanguageCodes[0] || 'en');

          // Initial activeLang$ value will be set by initializeLanguageFromStorageOrBrowser
          // or directly by LanguageWrapperComponent based on URL after this init.
          // So, we ensure activeLang$ is at least a valid default if nothing else overrides it.
          if (!this.supportedLanguageCodes.includes(this.activeLang$.value)) {
            this.activeLang$.next(this.defaultLanguageCode);
          }
        } else {
          this.supportedLanguageCodes = ['en', 'de'];
          this.defaultLanguageCode = 'en';
          this.activeLang$.next(this.defaultLanguageCode); // Ensure activeLang is set
          console.warn('LanguageService: Could not fetch supported languages, using fallback.');
        }
        console.log('LanguageService: Supported languages determined:', this.supportedLanguageCodes);
        console.log('LanguageService: Default language code:', this.defaultLanguageCode);
      }),
      shareReplay(1)
    );
    // No immediate .subscribe() here if APP_INITIALIZER handles the first call.
  }

  private fetchSupportedLanguages(): Observable<SupportedLanguage[]> {
    return this.http.get<SupportedLanguage[]>(`${this.apiUrl}/public/languages`).pipe(
      catchError(error => {
        console.error('LanguageService: Failed to fetch supported languages from backend', error);
        return of([{ code: 'en', name: 'English', isDefault: true, isActive: true }]); // Fallback on error
      })
    );
  }

  setLanguage(lang: string): void {
    if (this.supportedLanguageCodes.includes(lang) && lang !== this.activeLang$.value) {
      this.activeLang$.next(lang);
      localStorage.setItem('preferredLang', lang); // Optionally store user preference
      console.log(`LanguageService: Language set to: ${lang}`);
    } else if (!this.supportedLanguageCodes.includes(lang)) {
      console.warn(`LanguageService: Attempted to set unsupported language: ${lang}. Supported:`, this.supportedLanguageCodes);
      // Optionally fall back to default if an unsupported lang is passed and it's not already the default
      if (this.activeLang$.value !== this.defaultLanguageCode) {
        // this.activeLang$.next(this.defaultLanguageCode);
        // console.log(`LanguageService: Reverted to default language: ${this.defaultLanguageCode}`);
      }
    }
  }

  // Call this method early in app initialization (e.g., in AppComponent or a resolver)
  // to ensure supported languages are loaded before other language-dependent operations.
  // The constructor already subscribes, so this might be redundant unless you need to ensure
  // completion before proceeding.
  /*
  public load(): Promise<void> {
    return new Promise((resolve) => {
      this.supportedLanguages$.pipe(take(1)).subscribe({
        complete: () => resolve(),
        error: () => resolve() // Resolve even on error to not block app load
      });
    });
  }
  */

  // Method to retrieve previously selected language from localStorage
  // Call this in constructor *after* supportedLanguages$ is initialized
  // Or in app initializer.
  public initializeLanguageFromStorageOrBrowser(): void {
    const storedLang = localStorage.getItem('preferredLang');
    if (storedLang && this.supportedLanguageCodes.includes(storedLang)) {
      if (this.activeLang$.value !== storedLang) {
        this.activeLang$.next(storedLang);
        console.log(`LanguageService: Initialized language from localStorage: ${storedLang}`);
        return;
      }
    } else {
      // Fallback to browser language if supported, then to API default
      const browserLang = navigator.language.split('-')[0].toLowerCase();
      if (this.supportedLanguageCodes.includes(browserLang)) {
        if (this.activeLang$.value !== browserLang) {
          this.activeLang$.next(browserLang);
          console.log(`LanguageService: Initialized language from browser: ${browserLang}`);
          return;
        }
      }
    }
    // If neither stored nor browser lang is set/supported, it would have already been set
    // to defaultLanguageCode in the supportedLanguages$ subscription's tap operator.
  }
}
