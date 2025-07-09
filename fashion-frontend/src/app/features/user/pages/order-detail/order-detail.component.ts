// src/app/features/user/pages/order-detail/order-detail.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Order } from '../../../../core/models/order.model';
import { OrderService } from '../../../../core/services/order.service';
import { LanguageService } from '../../../../core/services/language.service';
import { Breadcrumb, BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { OrderDetailDisplayComponent } from '../../../../shared/components/order-detail-display/order-detail-display.component';
import { Translation } from '../../../../core/models/translation.model';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, BreadcrumbComponent, OrderDetailDisplayComponent],
  template: `
    <div class="container">
      <app-breadcrumb [crumbs]="breadcrumbs" [lang]="currentLang"></app-breadcrumb>
      @if(order$ | async; as order) {
        <app-order-detail-display [order]="order"></app-order-detail-display>
      } @else if(isLoading) {
        <p>Loading order details...</p>
      } @else if(errorMessage) {
        <div class="error-state">
            <h2>Order Not Found</h2>
            <p>{{ errorMessage }}</p>
            <a [routerLink]="['/', currentLang, 'account', 'profile']">Back to My Account</a>
        </div>
      }
    </div>
  `
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  public languageService = inject(LanguageService);

  order$!: Observable<Order | null>;
  isLoading = true;
  errorMessage: string | null = null;
  breadcrumbs: Breadcrumb[] = [];
  currentLang = 'en';

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    this.currentLang = this.languageService.activeLang$.value;

    if (!orderId) {
      this.isLoading = false;
      this.errorMessage = "No order ID was provided.";
      return;
    }

    this.order$ = this.orderService.getOrderById(orderId).pipe(
      catchError(err => {
        this.errorMessage = err.message;
        return of(null);
      })
    );
    this.order$.subscribe(() => this.isLoading = false);

    this.buildBreadcrumbs(orderId);
  }

  buildBreadcrumbs(orderId: string): void {
    const accountCrumb: Translation[] = [{ lang: this.currentLang, value: 'My Account' }];
    const orderCrumb: Translation[] = [{ lang: this.currentLang, value: `Order #${orderId}` }];
    this.breadcrumbs = [
      { name: accountCrumb, link: ['/', this.currentLang, 'account', 'profile'] },
      { name: orderCrumb, link: [] }
    ];
  }
}
