// src/app/shared/components/product-carousel/product-carousel.component.ts
import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../core/models/product.model';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-carousel',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './product-carousel.component.html',
  styleUrls: ['./product-carousel.component.scss'], // Note the new file name
})
export class ProductCarouselComponent implements AfterViewInit, OnDestroy {
  @Input() products: Product[] = [];
  @ViewChild('carousel') carousel!: ElementRef<HTMLDivElement>;

  private cdr = inject(ChangeDetectorRef);

  showPrevButton = false;
  showNextButton = true;
  private scrollCheckInterval: any;

  ngAfterViewInit(): void {
    // We need a slight delay for the browser to render everything correctly
    setTimeout(() => this.checkScroll(), 100);

    // Also check on window resize
    window.addEventListener('resize', this.checkScroll);
  }

  // Clean up the event listener
  ngOnDestroy(): void {
    window.removeEventListener('resize', this.checkScroll);
  }

  // The main function to check if arrows should be visible
  checkScroll = () => {
    const el = this.carousel.nativeElement;
    // The '+ 2' is a small buffer for sub-pixel rendering issues
    this.showPrevButton = el.scrollLeft > 2;
    this.showNextButton = el.scrollWidth - el.clientWidth - el.scrollLeft > 2;
    this.cdr.detectChanges(); // Manually trigger change detection
  }

  scrollBy(direction: 'prev' | 'next'): void {
    const el = this.carousel.nativeElement;
    // Scroll by 80% of the visible width for a pleasant multi-item scroll
    const scrollAmount = el.clientWidth * 0.8 * (direction === 'next' ? 1 : -1);
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }

  trackById(index: number, product: Product): string {
    return product._id;
  }
}
