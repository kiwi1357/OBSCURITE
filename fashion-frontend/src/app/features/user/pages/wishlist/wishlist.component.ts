// src/app/features/user/pages/wishlist/wishlist.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { Product } from '../../../../core/models/product.model';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { Breadcrumb, BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { Translation } from '../../../../core/models/translation.model';
import { LanguageService } from '../../../../core/services/language.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, BreadcrumbComponent, RouterLink],
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.scss']
})
export class WishlistComponent implements OnInit {
  private wishlistService = inject(WishlistService);
  public languageService = inject(LanguageService);

  wishlist$!: Observable<Product[]>;
  isLoading = true;
  breadcrumbs: Breadcrumb[] = [];
  currentLang = 'en';

  ngOnInit(): void {
    this.currentLang = this.languageService.activeLang$.value;
    this.languageService.activeLang$.subscribe(lang => {
      this.currentLang = lang;
      this.buildBreadcrumbs();
    });

    this.wishlist$ = this.wishlistService.getWishlistProducts();
    this.wishlist$.subscribe(() => this.isLoading = false);

    this.buildBreadcrumbs();
  }

  buildBreadcrumbs(): void {
    const accountCrumb: Translation[] = [{ lang: this.currentLang, value: 'My Account' }];
    const wishlistCrumb: Translation[] = [{ lang: this.currentLang, value: 'My Wishlist' }];
    this.breadcrumbs = [
      { name: accountCrumb, link: ['/', this.currentLang, 'account', 'profile'] },
      { name: wishlistCrumb, link: [] }
    ];
  }
}
