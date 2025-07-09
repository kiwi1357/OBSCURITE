// src/app/features/product/product-detail/product-detail.component.ts
import { Component, OnInit, inject, HostListener, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { CartService } from '../../../core/services/cart.service';
import { LanguageService } from '../../../core/services/language.service';
import { WishlistService } from '../../../core/services/wishlist.service'; // << IMPORT
import { AuthService } from '../../../core/services/auth.service'; // << IMPORT

import { ProductDetail, ProductVariant, Size } from '../../../core/models/product.model';
import { NotFoundComponent } from '../../../core/components/not-found/not-found.component';
import { BreadcrumbComponent, Breadcrumb } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterLink, NotFoundComponent, BreadcrumbComponent, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  public languageService = inject(LanguageService);
  private categoryService = inject(CategoryService);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService); // << INJECT
  private authService = inject(AuthService); // << INJECT
  private cdr = inject(ChangeDetectorRef);

  product?: ProductDetail;
  selectedVariant?: ProductVariant;
  selectedSize?: Size;
  isLoading = true;
  quantity: number = 1;
  breadcrumbs: Breadcrumb[] = [];

  isLoggedIn$: Observable<boolean>;
  isInWishlist$!: Observable<boolean>;

  // --- Sticky Column Properties ---
  @ViewChild('detailsColumn') detailsColumn!: ElementRef;
  @ViewChild('galleryColumn') galleryColumn!: ElementRef;
  isDetailsSticky: boolean = false;
  private detailsColumnInitialTop: number = 0;
  private detailsColumnWidth: string = 'auto';

  get currentLang(): string {
    return this.languageService.activeLang$.value;
  }

  constructor() {
    this.isLoggedIn$ = this.authService.isAuthenticated$;
  }

  ngOnInit(): void {
    const mainSub = this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (!slug) {
        this.router.navigate(['/', this.currentLang, 'not-found']);
        return;
      }
      this.loadProduct(slug);
    });
    this.subs.add(mainSub);
  }

  private loadProduct(slug: string): void {
    this.isLoading = true;
    // First ensure categories are loaded for breadcrumbs, then fetch the product
    this.subs.add(
      this.categoryService.getCategoryTree().subscribe(() => {
        this.subs.add(
          this.productService.getProductBySlug(slug).subscribe({
            next: (data) => {
              this.product = data;
              if (this.product) {
                this.initializeProductState();
              } else {
                this.isLoading = false;
              }
              this.cdr.detectChanges(); // Ensure view is updated before position calculations
              this.calculateDetailsColumnInitialPosition();
            },
            error: () => {
              this.isLoading = false;
              this.router.navigate(['/', this.currentLang, 'not-found']);
            }
          })
        );
      })
    );
  }

  private initializeProductState(): void {
    if (!this.product) return;

    this.buildBreadcrumbs();

    // Determine the variant to select
    const variantIdFromQuery = this.route.snapshot.queryParams['variant'];
    const activeVariants = this.product.variants.filter(v => v.isActive);
    let variantToSelect = activeVariants.find(v => v._id === variantIdFromQuery);
    if (!variantToSelect) {
      variantToSelect = activeVariants.length > 0 ? activeVariants[0] : undefined;
    }
    this.selectedVariant = variantToSelect;

    // Set up wishlist state
    this.isInWishlist$ = this.wishlistService.isProductInWishlist$(this.product._id);
    this.isLoading = false;
  }

  private buildBreadcrumbs(): void {
    if (!this.product) return;
    const newCrumbs: Breadcrumb[] = [];
    if (this.product.category?.slug) {
      const categoryPath = this.categoryService.getBreadcrumbs(this.product.category.slug);
      categoryPath.forEach(catNode => {
        newCrumbs.push({
          name: catNode.name,
          link: ['/', this.currentLang, 'category', catNode.slug]
        });
      });
    }
    newCrumbs.push({ name: this.product.name, link: [] }); // Current page, no link
    this.breadcrumbs = newCrumbs;
  }

  ngAfterViewInit(): void {
    this.calculateDetailsColumnInitialPosition();
    // A second check after a short delay can help with images loading in
    setTimeout(() => this.calculateDetailsColumnInitialPosition(), 500);
  }

  private calculateDetailsColumnInitialPosition(): void {
    if (this.detailsColumn?.nativeElement) {
      this.detailsColumnInitialTop = this.detailsColumn.nativeElement.offsetTop;
      this.detailsColumnWidth = `${this.detailsColumn.nativeElement.offsetWidth}px`;
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (!this.detailsColumn?.nativeElement || !this.galleryColumn?.nativeElement) return;
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;
    const galleryHeight = this.galleryColumn.nativeElement.offsetHeight;
    const detailsHeight = this.detailsColumn.nativeElement.offsetHeight;
    const headerOffset = 80; // Approximate height of the sticky header

    if (scrollPosition + headerOffset > this.detailsColumnInitialTop) {
      // Check if the bottom of the details column has not passed the bottom of the gallery
      if (scrollPosition + headerOffset + detailsHeight < this.detailsColumnInitialTop + galleryHeight) {
        this.isDetailsSticky = true;
      } else {
        this.isDetailsSticky = false;
      }
    } else {
      this.isDetailsSticky = false;
    }
  }

  selectVariant(variantId: string): void {
    if (!this.product) return;
    const newSelectedVariant = this.product.variants.find(v => v._id === variantId);
    if (newSelectedVariant?.isActive) {
      this.selectedVariant = newSelectedVariant;
      this.selectedSize = undefined; // Reset size selection on variant change
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
    if (size.stock > 0) {
      this.selectedSize = size;
    }
  }

  setMainImage(imageSrc: string): void {
    if (!this.selectedVariant) return;
    const index = this.selectedVariant.images.indexOf(imageSrc);
    if (index > 0) { // Only reorder if it's not already the main image
      const newImages = [...this.selectedVariant.images];
      newImages.splice(index, 1);
      newImages.unshift(imageSrc);
      this.selectedVariant.images = newImages;
    }
  }

  toggleAccordion(section: string): void {
    this.accordionOpen[section] = !this.accordionOpen[section];
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  incrementQuantity(): void {
    this.quantity++;
  }

  addToCart(): void {
    if (!this.product || !this.selectedVariant || !this.selectedSize) {
      alert('Please select a size to continue.');
      return;
    }
    if (this.quantity > this.selectedSize.stock) {
      alert(`Only ${this.selectedSize.stock} items are available. Please reduce the quantity.`);
      this.quantity = this.selectedSize.stock;
      return;
    }
    this.cartService.addItem(this.product, this.selectedVariant, this.selectedSize, this.quantity);
    alert(`${this.quantity} item(s) added to your cart.`);
  }

  toggleWishlist(): void {
    if (!this.product) return;

    if (!this.authService.getCurrentUserValue()) {
      alert('Please log in to add items to your wishlist.');
      this.router.navigate(['/', this.currentLang, 'login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const currentWishlistState = (this.isInWishlist$ as any).source.value;
    const operation = currentWishlistState
      ? this.wishlistService.removeFromWishlist(this.product._id)
      : this.wishlistService.addToWishlist(this.product._id);

    this.subs.add(operation.subscribe());
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    window.removeEventListener('resize', this.calculateDetailsColumnInitialPosition);
  }
}
