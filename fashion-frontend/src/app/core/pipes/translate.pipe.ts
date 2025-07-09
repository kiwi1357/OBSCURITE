// src/app/core/pipes/translate.pipe.ts
import { Pipe, PipeTransform, inject, OnDestroy } from '@angular/core';
import { LanguageService } from '../services/language.service';
import { Translation } from '../models/translation.model';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Important for reacting to LanguageService changes
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private languageService = inject(LanguageService);
  private langSub: Subscription;
  private currentLang: string = 'en'; // Initialize with default

  constructor() {
    this.currentLang = this.languageService.activeLang$.value; // Get initial value
    this.langSub = this.languageService.activeLang$.subscribe(lang => {
      this.currentLang = lang;
    });
  }

  transform(
    value: Translation[] | string | undefined | null,
    specificLang?: string,
    fallbackLang: string = 'en',
    returnKeyIfNotFound: boolean = false
  ): string {
    if (typeof value === 'string') {
      return value;
    }

    if (!value || !Array.isArray(value) || value.length === 0) {
      return returnKeyIfNotFound ? 'TRANSLATION_KEY_NOT_FOUND' : '';
    }

    const targetLang = specificLang || this.currentLang;

    const translation = value.find(t => t.lang === targetLang);
    if (translation && typeof translation.value === 'string' && translation.value.trim() !== '') {
      return translation.value;
    }

    const fallbackTranslation = value.find(t => t.lang === fallbackLang);
    if (fallbackTranslation && typeof fallbackTranslation.value === 'string' && fallbackTranslation.value.trim() !== '') {
      return fallbackTranslation.value;
    }

    const firstAvailable = value.find(t => typeof t.value === 'string' && t.value.trim() !== '');
    if (firstAvailable) {
      return firstAvailable.value;
    }

    return returnKeyIfNotFound ? `[${targetLang}:${value[0]?.lang}]_NO_VALUE_OR_EMPTY` : '';
  }

  ngOnDestroy(): void {
    if (this.langSub) {
      this.langSub.unsubscribe();
    }
  }
}
