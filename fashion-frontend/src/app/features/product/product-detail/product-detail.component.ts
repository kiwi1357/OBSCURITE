// src/app/features/product/product-detail/product-detail.component.ts
import { Component, OnInit, OnDestroy, inject, HostListener, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription, Observable, map, of } from 'rxjs';

import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { LanguageService } from '../../../core/services/language.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service'; // << IMPORT
import { AuthService } from '../../../core/services/auth.service'; // << IMPORT

import { ProductDetail, ProductVariant, Size } from '../../../core/models/product.model';
import { BreadcrumbComponent, Breadcrumb } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { NotFoundComponent } from '../../../core/components/not-found/not-found.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    RouterLink,
    NotFoundComponent,
    BreadcrumbComponent,
    FormsModule
  ],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  public languageService = inject(LanguageService);
  private categoryService = inject(CategoryService);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService); // << INJECT
  private authService = inject(AuthService); // << INJECT
  private cdr = inject(ChangeDetectorRef);

  private subs = new Subscription(); // << FIX: DECLARE SUBSCRIPTION

  product?: ProductDetail;
  selectedVariant?: ProductVariant;
  selectedSize?: Size;
  isLoading = true;
  quantity: number = 1;
  breadcrumbs: Breadcrumb[] = [];

  isWishlisted$!: Observable<boolean>; // << OBSERVABLE FOR WISHLIST STATE

  // << FIX: RE-ADD ACCORDION PROPERTY
  accordionOpen: { [key: string]: boolean } = {
    description: true,
    materials: false,
    care: false,
  };

  @ViewChild('detailsColumn') detailsColumn!: ElementRef;
  @ViewChild('galleryColumn') galleryColumn!: ElementRef;
  isDetailsSticky: boolean = false;
  detailsColumnInitialTop: number = 0;
  detailsColumnWidth: string = 'auto';

  get currentLang(): string {
    return this.languageService.activeLang$.value;
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.router.navigate(['/', this.currentLang, 'not-found']);
      return;
    }

    const mainSub = this.categoryService.getCategoryTree().subscribe(() => {
      this.productService.getProductBySlug(slug).subscribe({
        next: (data) => {
          this.product = data;
          if (this.product) {
            this.setupWishlistObserver(); // << SETUP WISHLIST LOGIC
            this.buildBreadcrumbs();
            this.initializeVariant();
          }
          this.isLoading = false;
          this.cdr.detectChanges();
          this.calculateDetailsColumnInitialPosition();
        },
        error: (err) => {
          console.error('Failed to load product details', err);
          this.isLoading = false;
          this.router.navigate(['/', this.currentLang, 'not-found']);
        }
      });
    });
    this.subs.add(mainSub);
  }

  private initializeVariant(): void {
    if (!this.product || !this.product.variants || this.product.variants.length === 0) {
      console.warn('Product has no variants.');
      return;
    }
    const variantIdFromQuery = this.route.snapshot.queryParams['variant'];
    let variantToSelect = this.product.variants.find(v => v._id === variantIdFromQuery && v.isActive);
    if (!variantToSelect) {
      variantToSelect = this.product.variants.find(v => v.isActive);
    }
    this.selectedVariant = variantToSelect || this.product.variants[0];
  }

  private setupWishlistObserver(): void {
    if (!this.product) {
      this.isWishlisted$ = of(false);
      return;
    }
    this.isWishlisted$ = this.wishlistService.wishlistedIds$.pipe(
      map(ids => ids.has(this.product!._id))
    );
  }

  buildBreadcrumbs(): void {
    if (!this.product) return;
    const newCrumbs: Breadcrumb[] = [];
    if (this.product.category?.slug) {
      const categoryPath = this.categoryService.getBreadcrumbs(this.product.category.slug);
      categoryPath.forEach(catNode => {
        newCrumbs.push({ name: catNode.name, link: ['/', this.currentLang, 'category', catNode.slug] });
      });
    }
    newCrumbs.push({ name: this.product.name, link: [] });
    this.breadcrumbs = newCrumbs;
  }

  ngAfterViewInit(): void {
    this.calculateDetailsColumnInitialPosition();
    setTimeout(() => this.calculateDetailsColumnInitialPosition(), 500);
  }

  calculateDetailsColumnInitialPosition(): void {
    if (this.detailsColumn?.nativeElement) {
      this.detailsColumnInitialTop = this.detailsColumn.nativeElement.offsetTop;
      this.detailsColumnWidth = `${this.detailsColumn.nativeElement.offsetWidth}px`;
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (!this.detailsColumn?.nativeElement || !this.galleryColumn?.nativeElement) return;
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const galleryHeight = this.galleryColumn.nativeElement.offsetHeight;
    const detailsHeight = this.detailsColumn.nativeElement.offsetHeight;
    const headerOffset = 80;
    if (scrollPosition + headerOffset > this.detailsColumnInitialTop) {
      this.isDetailsSticky = (scrollPosition + headerOffset + detailsHeight < this.detailsColumnInitialTop + galleryHeight);
    } else {
      this.isDetailsSticky = false;
    }
  }

  selectVariant(variantId: string): void {
    if (!this.product) return;
    const newSelectedVariant = this.product.variants.find(v => v._id === variantId);
    if (newSelectedVariant?.isActive) {
      this.selectedVariant = newSelectedVariant;
      this.selectedSize = undefined;
      this.quantity = 1;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { variant: this.selectedVariant._id },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  selectSize(size: Size): void {
    if (size.stock > 0) this.selectedSize = size;
  }

  setMainImage(imageSrc: string): void {
    if (this.selectedVariant?.images.includes(imageSrc)) {
      const newImages = [...this.selectedVariant.images];
      const index = newImages.indexOf(imageSrc);
      if (index > -1) {
        newImages.splice(index, 1);
        newImages.unshift(imageSrc);
        this.selectedVariant.images = newImages;
      }
    }
  }

  toggleAccordion(section: string): void {
    this.accordionOpen[section] = !this.accordionOpen[section];
  }

  decrementQuantity(): void { if (this.quantity > 1) this.quantity--; }
  incrementQuantity(): void { this.quantity++; }

  addToCart(): void {
    if (!this.product || !this.selectedVariant || !this.selectedSize) {
      alert('Please ensure product, color, and size are selected.');
      return;
    }
    if (this.quantity > this.selectedSize.stock) {
      alert(`Only ${this.selectedSize.stock} items available. Please reduce quantity.`);
      return;
    }
    this.cartService.addItem(this.product, this.selectedVariant, this.selectedSize, this.quantity);
    alert('Item added to cart!');
  }

  toggleWishlist(): void {
    if (!this.product) return;
    if (!this.authService.getCurrentUserValue()) {
      this.router.navigate(['/', this.currentLang, 'login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const productId = this.product._id;
    const isCurrentlyWishlisted = this.wishlistService.isProductWishlisted(productId);
    const operation = isCurrentlyWishlisted
      ? this.wishlistService.removeFromWishlist(productId)
      : this.wishlistService.addToWishlist(productId);

    this.subs.add(operation.subscribe({
      error: err => alert('There was an error updating your wishlist. Please try again.')
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe(); // << FIX: UNSUBSCRIBE
  }
}
