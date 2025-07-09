// src/app/shared/components/lookbook/lookbook.component.ts
import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { ProductCarouselComponent } from '../product-carousel/product-carousel.component';
import { Lookbook } from '../../../core/models/lookbook.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-lookbook',
  standalone: true,
  imports: [CommonModule, ProductCarouselComponent, TranslatePipe],
  templateUrl: './lookbook.component.html',
  styleUrls: ['./lookbook.component.scss']
})
export class LookbookComponent {
  @Input() lookbook!: Lookbook;
  private router = inject(Router);
  private languageService = inject(LanguageService);

  get currentLang(): string {
    return this.languageService.activeLang$.value;
  }

  exploreCollection(): void {
    if (this.lookbook) {
      this.router.navigate(['/', this.currentLang, 'search'], { queryParams: { lookbook: this.lookbook.slug } });
    }
  }
}
