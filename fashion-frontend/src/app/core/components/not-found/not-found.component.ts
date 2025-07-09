// src/app/core/components/not-found/not-found.component.ts
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent {
  private router = inject(Router);
  private languageService = inject(LanguageService);

  searchTerm = '';

  onSearch(): void {
    if (this.searchTerm.trim()) {
      const currentLang = this.languageService.activeLang$.value;
      this.router.navigate(['/', currentLang, 'search'], { queryParams: { q: this.searchTerm } });
    }
  }
}
