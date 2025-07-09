// src/app/features/home/hero/hero.component.ts
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent {
  private languageService = inject(LanguageService);

  get currentLang() {
    return this.languageService.activeLang$.value;
  }
  // Example for Shop Now link if it becomes dynamic:
  // In hero.component.html:
  // <a [routerLink]="['/', currentLang, 'search']" [queryParams]="{ collection: 'new-arrivals' }" class="cta-button">Shop Now</a>
  // The current hero.component.html has href="#", so this is just an example.
}
