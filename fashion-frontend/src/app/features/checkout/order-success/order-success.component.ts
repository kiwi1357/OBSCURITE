// src/app/features/checkout/order-success/order-success.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-success.component.html',
  styleUrls: ['./order-success.component.scss']
})
export class OrderSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private languageService = inject(LanguageService);

  orderId: string | null = null;
  currentLang: string = 'en';

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('orderId');
    this.currentLang = this.languageService.activeLang$.value;
    this.languageService.activeLang$.subscribe(lang => this.currentLang = lang);
  }

  continueShopping(): void {
    this.router.navigate(['/', this.currentLang]);
  }

  viewOrderDetails(): void {
    // You might not have a dedicated "order details" page for guests yet.
    // If logged in, could go to account/orders/:orderId
    // For now, this can be a placeholder or link to order lookup if you build one.
    if (this.orderId) {
      // Example: if you have an order lookup page
      // this.router.navigate(['/', this.currentLang, 'order-lookup'], { queryParams: { orderId: this.orderId }});
      alert(`Functionality to view order details for ${this.orderId} is not yet implemented.`);
    }
  }
}
