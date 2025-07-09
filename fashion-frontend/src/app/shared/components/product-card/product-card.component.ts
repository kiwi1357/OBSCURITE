// src/app/shared/components/product-card/product-card.component.ts
import { Component, Input, inject, OnInit } from '@angular/core'; // << Add OnInit
import { Product } from '../../../core/models/product.model';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { Observable, of } from 'rxjs'; // << Add of
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { WishlistService } from '../../../core/services/wishlist.service'; // << IMPORT
import { AuthService } from '../../../core/services/auth.service'; // << IMPORT

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'] // << FIX styleUrl to styleUrls
})
export class ProductCardComponent implements OnInit { // << IMPLEMENT OnInit
  private languageService = inject(LanguageService);
  private wishlistService = inject(WishlistService); // << INJECT
  private authService = inject(AuthService); // << INJECT

  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() product!: Product;

  lang$: Observable<string> = this.languageService.activeLang$;
  isInWishlist$: Observable<boolean> = of(false); // << Initialize with default
  isLoggedIn$: Observable<boolean>;

  constructor() {
    this.isLoggedIn$ = this.authService.isAuthenticated$;
  }

  ngOnInit(): void {
    if (this.product) {
      this.isInWishlist$ = this.wishlistService.isProductInWishlist$(this.product._id);
    }
  }

  toggleWishlist(event: Event): void {
    event.preventDefault(); // Prevent navigation when clicking the button
    event.stopPropagation(); // Stop event from bubbling up to the card's link

    if (!this.authService.getCurrentUserValue()) {
      // Or redirect to login
      alert('Please log in to use the wishlist feature.');
      return;
    }

    const currentWishlistState = (this.isInWishlist$ as any).source.value; // Quick way to get current value

    if (currentWishlistState) {
      this.wishlistService.removeFromWishlist(this.product._id).subscribe();
    } else {
      this.wishlistService.addToWishlist(this.product._id).subscribe();
    }
  }
}
