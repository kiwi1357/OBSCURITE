// src/app/features/user/pages/order-history/order-history.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { OrderService } from '../../../../core/services/order.service';
import { Order } from '../../../../core/models/order.model';
import { LanguageService } from '../../../../core/services/language.service';
import { Breadcrumb, BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { Translation } from '../../../../core/models/translation.model';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe, BreadcrumbComponent],
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss']
})
export class OrderHistoryComponent implements OnInit {
  private orderService = inject(OrderService);
  public languageService = inject(LanguageService);

  orders$!: Observable<Order[]>;
  isLoading = true;
  ordersError: string | null = null;
  breadcrumbs: Breadcrumb[] = [];
  currentLang = 'en';

  ngOnInit(): void {
    this.currentLang = this.languageService.activeLang$.value;
    this.languageService.activeLang$.subscribe(lang => {
      this.currentLang = lang;
      this.buildBreadcrumbs();
    });

    this.loadOrders();
    this.buildBreadcrumbs();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.orders$ = this.orderService.getMyOrders().pipe(
      catchError(err => {
        this.ordersError = "Could not load order history.";
        console.error(err);
        return of([]);
      })
    );
    this.orders$.subscribe(() => this.isLoading = false);
  }

  buildBreadcrumbs(): void {
    const accountCrumb: Translation[] = [{ lang: this.currentLang, value: 'My Account' }];
    const historyCrumb: Translation[] = [{ lang: this.currentLang, value: 'Order History' }];
    this.breadcrumbs = [
      { name: accountCrumb, link: ['/', this.currentLang, 'account', 'profile'] },
      { name: historyCrumb, link: [] }
    ];
  }
}
