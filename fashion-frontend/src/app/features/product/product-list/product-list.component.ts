// src/app/features/product/product-list/product-list.component.ts
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, ParamMap, Params } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, combineLatest, of } from 'rxjs';
import { switchMap, map, tap } from 'rxjs/operators'; // Ensure map and tap are imported from operators for older RxJS versions, or directly from 'rxjs' for newer

import { ProductService } from '../../../core/services/product.service';
import { CategoryNode, CategoryService } from '../../../core/services/category.service';
import { LookbookService } from '../../../core/services/lookbook.service';
import { LanguageService } from '../../../core/services/language.service';

import { Product, SearchResult, SearchResultFacetCategory } from '../../../core/models/product.model';
import { Lookbook } from '../../../core/models/lookbook.model';
import { Translation } from '../../../core/models/translation.model';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { FilterSidebarComponent } from '../filter-sidebar/filter-sidebar.component';
import { BreadcrumbComponent, Breadcrumb } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent, FilterSidebarComponent, BreadcrumbComponent, TranslatePipe],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private lookbookService = inject(LookbookService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public languageService = inject(LanguageService);
  private routeSub!: Subscription;

  products: Product[] = [];
  facets!: SearchResult['facets'];
  isLoading = true;
  totalProducts = 0;
  isFilterSidebarOpen = false;

  pageTitle: Translation[] | string = [{ lang: 'en', value: 'Products' }];
  breadcrumbs: Breadcrumb[] = [];
  currentLang = 'en';
  searchTerm: string | null = null;
  currentCategory?: CategoryNode;
  currentLookbook?: Lookbook;

  sortOptions = [
    { value: 'priority,desc', label: 'Recommended' },
    { value: 'createdAt,desc', label: 'New Arrivals' },
    { value: 'price,asc', label: 'Price: Low to High' },
    { value: 'price,desc', label: 'Price: High to Low' }
  ];
  selectedSort = this.sortOptions[0].value;
  activeFilters: { brands: { [key: string]: boolean }, categories: { [key: string]: boolean }, colors: { [key: string]: boolean }, sizes: { [key: string]: boolean } } =
    { brands: {}, categories: {}, colors: {}, sizes: {} };
  viewMode: 'grid' | 'list' = 'grid';

  ngOnInit(): void {
    this.currentLang = this.languageService.activeLang$.value;
    const savedView = localStorage.getItem('productListViewMode');
    if (savedView === 'grid' || savedView === 'list') this.viewMode = savedView as 'grid' | 'list';
    const savedSort = localStorage.getItem('productListSortOrder');
    if (savedSort) this.selectedSort = savedSort;

    this.routeSub = combineLatest([
      this.route.paramMap,
      this.route.queryParams,
      this.languageService.activeLang$
    ]).pipe(
      switchMap(([pathParams, queryParams, lang]) => {
        this.currentLang = lang;
        return this.categoryService.getCategoryTree().pipe(
          map(() => ({ pathParams, queryParams, lang })) // Pass lang through
        );
      })
    ).subscribe(({ pathParams, queryParams, lang }) => {
      this.handleRouteChange(pathParams, queryParams);
    });
  }

  private handleRouteChange(pathParams: ParamMap, queryParams: Params): void {
    this.isLoading = true;
    this.resetContextForNewRoute();

    this.searchTerm = queryParams['q'] || null;
    const lookbookSlug = queryParams['lookbook'] || queryParams['collection'] || null;
    const categorySlug = pathParams.get('slug');

    this.loadFiltersFromQueryParams(queryParams);

    const defaultTitle: Translation[] = [{ lang: 'en', value: 'All Products' }, { lang: 'de', value: 'Alle Produkte' }]; // Example default

    if (lookbookSlug) {
      this.lookbookService.getLookbookBySlug(lookbookSlug).subscribe(lookbook => {
        this.currentLookbook = lookbook;
        this.pageTitle = lookbook.title;
        this.breadcrumbs = [
          { name: [{ lang: this.currentLang, value: 'Collections' }], link: ['/', this.currentLang, 'collections'] },
          { name: lookbook.title, link: ['/', this.currentLang, 'search'], queryParams: { lookbook: lookbook.slug } }
        ];
        this.runSearch();
      });
    } else if (categorySlug) {
      this.currentCategory = this.categoryService.findCategoryBySlug(categorySlug);
      if (this.currentCategory) {
        this.pageTitle = this.currentCategory.name;
        this.breadcrumbs = this.categoryService.getBreadcrumbs(categorySlug).map(c => ({
          name: c.name,
          link: ['/', this.currentLang, 'category', c.slug]
        }));
      } else {
        this.router.navigate(['/', this.currentLang, 'not-found']);
        return;
      }
      this.runSearch();
    } else if (this.searchTerm) {
      this.pageTitle = `Results for "${this.searchTerm}"`;
      this.breadcrumbs = [{ name: [{ lang: this.currentLang, value: 'Search' }], link: ['/', this.currentLang, 'search'], queryParams: { q: this.searchTerm } }];
      this.runSearch();
    } else {
      this.pageTitle = defaultTitle;
      this.breadcrumbs = [{ name: defaultTitle, link: ['/', this.currentLang, 'search'] }];
      this.runSearch();
    }
  }

  private loadFiltersFromQueryParams(queryParams: Params): void {
    this.activeFilters = { brands: {}, categories: {}, colors: {}, sizes: {} }; // Reset first
    if (queryParams['brand']) {
      queryParams['brand'].split(',').forEach((id: string) => this.activeFilters.brands[id] = true);
    }
    if (queryParams['category']) { // Assuming category filter IDs are passed
      queryParams['category'].split(',').forEach((id: string) => this.activeFilters.categories[id] = true);
    }
    if (queryParams['colors']) {
      queryParams['colors'].split(',').forEach((name: string) => this.activeFilters.colors[name.toLowerCase()] = true);
    }
    if (queryParams['sizes']) {
      queryParams['sizes'].split(',').forEach((name: string) => this.activeFilters.sizes[name.toUpperCase()] = true);
    }
    if (queryParams['sort']) {
      this.selectedSort = queryParams['sort'];
    }
  }

  private resetContextForNewRoute(): void {
    this.currentCategory = undefined;
    this.currentLookbook = undefined;
    // this.activeFilters are reloaded from query params or reset in loadFiltersFromQueryParams
    // this.searchTerm is handled by route change logic
  }

  private runSearch(): void {
    this.isLoading = true;
    const queryParamsForApi = this.buildQueryParamsForApi();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.buildQueryParamsForBrowser(),
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    this.productService.searchProducts(queryParamsForApi).subscribe({
      next: (result) => {
        this.products = result.data;
        this.totalProducts = result.pagination.totalItems;
        this.facets = result.facets;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load products', err);
      }
    });
  }

  private buildQueryParamsForApi(): any {
    const params: any = { lang: this.currentLang };
    const [sortBy, sortOrderValue] = this.selectedSort.split(',');
    params.sortBy = sortBy;
    params.sortOrder = sortOrderValue;

    if (this.searchTerm) params.q = this.searchTerm;
    if (this.currentLookbook) params.lookbook = this.currentLookbook.slug;

    // If active category filters exist (from sidebar), use them.
    // Otherwise, if on a category page (currentCategory is set), use that.
    const categoryFilters = Object.keys(this.activeFilters.categories).filter(k => this.activeFilters.categories[k]);
    if (categoryFilters.length > 0) {
      params.category = categoryFilters.join(',');
    } else if (this.currentCategory) {
      const categoryIds = this.categoryService.getCategoryWithDescendants(this.currentCategory.slug);
      if (categoryIds.length > 0) params.category = categoryIds.join(',');
    }

    const brands = Object.keys(this.activeFilters.brands).filter(k => this.activeFilters.brands[k]);
    if (brands.length > 0) params.brand = brands.join(',');

    const colors = Object.keys(this.activeFilters.colors).filter(k => this.activeFilters.colors[k]);
    if (colors.length > 0) params.colors = colors.join(',');

    const sizes = Object.keys(this.activeFilters.sizes).filter(k => this.activeFilters.sizes[k]);
    if (sizes.length > 0) params.sizes = sizes.join(',');

    return params;
  }

  private buildQueryParamsForBrowser(): any {
    const queryParams: any = {};
    if (this.selectedSort !== this.sortOptions[0].value) {
      queryParams.sort = this.selectedSort;
    }

    const brands = Object.keys(this.activeFilters.brands).filter(k => this.activeFilters.brands[k]);
    if (brands.length > 0) queryParams.brand = brands.join(',');

    const categories = Object.keys(this.activeFilters.categories).filter(k => this.activeFilters.categories[k]);
    if (categories.length > 0) queryParams.category = categories.join(',');

    const colors = Object.keys(this.activeFilters.colors).filter(k => this.activeFilters.colors[k]);
    if (colors.length > 0) queryParams.colors = colors.join(',');

    const sizes = Object.keys(this.activeFilters.sizes).filter(k => this.activeFilters.sizes[k]);
    if (sizes.length > 0) queryParams.sizes = sizes.join(',');

    if (this.route.snapshot.data['isSearchPage'] && this.searchTerm) {
      queryParams.q = this.searchTerm;
    }
    // Only add lookbook to query params if it's a filter, not if it's the base page context from URL
    if (this.currentLookbook && (queryParams['q'] || this.route.snapshot.data['isSearchPage'])) {
      queryParams.lookbook = this.currentLookbook.slug;
    }

    return queryParams;
  }

  onSortChange(): void {
    localStorage.setItem('productListSortOrder', this.selectedSort);
    this.runSearch();
  }

  onFilterChange(newFilters: any): void {
    // newFilters comes from filter-sidebar and contains the complete activeFilters object
    this.activeFilters = newFilters;
    this.runSearch();
  }

  toggleViewMode(mode: 'grid' | 'list') {
    if (this.viewMode !== mode) {
      this.viewMode = mode;
      localStorage.setItem('productListViewMode', mode);
    }
  }

  toggleFilterSidebar(): void {
    this.isFilterSidebarOpen = !this.isFilterSidebarOpen;
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }
}
