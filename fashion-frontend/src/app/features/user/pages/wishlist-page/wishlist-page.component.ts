// src/app/features/user/pages/wishlist-page/wishlist-page.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { WishlistService } from '../../../../core/services/wishlist.service';
import { LanguageService } from '../../../../core/services/language.service';
import { Product } from '../../../../core/models/product.model';
import { Translation } from '../../../../core/models/translation.model';

import { Breadcrumb, BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-wishlist-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BreadcrumbComponent,
    ProductCardComponent
  ],
  templateUrl: './wishlist-page.component.html',
  styleUrls: ['./wishlist-page.component.scss']
})
export class WishlistPageComponent implements OnInit {
  public wishlistService = inject(WishlistService);
  public languageService = inject(LanguageService);

  wishlistItems$!: Observable<Product[]>;
  isLoading = true;
  error: string | null = null;

  breadcrumbs: Breadcrumb[] = [];
  currentLang = 'en';

  ngOnInit(): void {
    this.currentLang = this.languageService.activeLang$.value;
    this.languageService.activeLang$.subscribe(lang => {
      this.currentLang = lang;
      this.buildBreadcrumbs();
    });

    this.buildBreadcrumbs();
    this.loadWishlist();
  }

  private loadWishlist(): void {
    this.isLoading = true;
    this.error = null;
    this.wishlistItems$ = this.wishlistService.loadWishlistItems().pipe(
      catchError(err => {
        this.error = "We couldn't load your wishlist. Please try again later.";
        console.error(err);
        return of([]);
      })
    );
    // Let async pipe handle loading state for simplicity, but we can also do this:
    this.wishlistItems$.subscribe(() => this.isLoading = false);
  }

  buildBreadcrumbs(): void {
    const accountCrumbName: Translation[] = [{ lang: this.currentLang, value: 'My Account' }];
    const wishlistCrumbName: Translation[] = [{ lang: this.currentLang, value: 'My Wishlist' }];
    this.breadcrumbs = [
      { name: accountCrumbName, link: ['/', this.currentLang, 'account', 'profile'] },
      { name: wishlistCrumbName, link: [] }
    ];
  }
}
