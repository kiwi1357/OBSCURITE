// src/app/shared/components/product-card/product-card.component.ts
import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable, map, of } from 'rxjs';

import { LanguageService } from '../../../core/services/language.service';
import { WishlistService } from '../../../core/services/wishlist.service'; // << IMPORT
import { AuthService } from '../../../core/services/auth.service'; // << IMPORT

import { Product } from '../../../core/models/product.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent implements OnInit {
  private languageService = inject(LanguageService);
  private wishlistService = inject(WishlistService); // << INJECT
  private authService = inject(AuthService); // << INJECT
  private router = inject(Router); // << INJECT ROUTER

  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() product!: Product;

  lang$: Observable<string> = this.languageService.activeLang$;
  isWishlisted$!: Observable<boolean>;

  ngOnInit(): void {
    if (!this.product) {
      this.isWishlisted$ = of(false);
      return;
    }
    this.isWishlisted$ = this.wishlistService.wishlistedIds$.pipe(
      map(ids => ids.has(this.product._id))
    );
  }

  toggleWishlist(event: Event): void {
    event.preventDefault(); // Stop the card's link from navigating
    event.stopPropagation(); // Stop any other parent click events

    if (!this.authService.getCurrentUserValue()) {
      this.router.navigate(['/', this.languageService.activeLang$.value, 'login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const isCurrentlyWishlisted = this.wishlistService.isProductWishlisted(this.product._id);
    const operation = isCurrentlyWishlisted
      ? this.wishlistService.removeFromWishlist(this.product._id)
      : this.wishlistService.addToWishlist(this.product._id);

    operation.subscribe({
      // Optional: Add visual feedback here if needed
      error: err => console.error("Failed to update wishlist from product card", err)
    });
  }
}
