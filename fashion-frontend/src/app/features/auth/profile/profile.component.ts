// src/app/features/auth/profile/profile.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service'; // Import OrderService
import { User } from '../../../core/models/user.model';
import { Order } from '../../../core/models/order.model'; // Import Order model
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LanguageService } from '../../../core/services/language.service';
import { BreadcrumbComponent, Breadcrumb } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { Translation } from '../../../core/models/translation.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BreadcrumbComponent,
    DatePipe,
    CurrencyPipe
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private orderService = inject(OrderService); // Inject OrderService
  public languageService = inject(LanguageService);

  user$: Observable<User | null> = this.authService.currentUser$;
  orders$!: Observable<Order[]>;
  isLoadingOrders = true;
  ordersError: string | null = null;

  breadcrumbs: Breadcrumb[] = [];

  constructor() { }

  ngOnInit(): void {
    this.languageService.activeLang$.subscribe(lang => {
      const myAccountCrumbName: Translation[] = [{ lang: lang, value: 'My Account' }];
      this.breadcrumbs = [
        { name: myAccountCrumbName, link: [`/${lang}/account/profile`] }
      ];
    });

    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoadingOrders = true;
    this.ordersError = null;
    this.orders$ = this.orderService.getMyOrders().pipe(
      catchError(err => {
        this.ordersError = "Could not load order history. Please try again later.";
        console.error(err);
        return of([]); // Return an empty array on error to prevent breaking the async pipe
      })
    );
    // We don't need to manually set isLoading to false, as the async pipe will handle showing the content once the observable emits.
    // However, for a better UX, you could add a finalize operator.
    this.orders$.subscribe({
      complete: () => this.isLoadingOrders = false
    });
  }

  logout(): void {
    this.authService.logout();
  }

  signUpForNewsletter(): void {
    console.log('Sign up for newsletter clicked');
  }
}
