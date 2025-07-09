// src/app/features/checkout/order-failed/order-failed.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-order-failed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-failed.component.html',
  styleUrls: ['./order-failed.component.scss'] // Can reuse or adapt success page styles
})
export class OrderFailedComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private languageService = inject(LanguageService);

  paypalOrderId: string | null = null;
  errorCode: string | null = null;
  currentLang: string = 'en';

  ngOnInit(): void {
    this.paypalOrderId = this.route.snapshot.queryParamMap.get('paypalOrderId');
    this.errorCode = this.route.snapshot.queryParamMap.get('error'); // e.g., 'capture_failed'
    this.currentLang = this.languageService.activeLang$.value;
    this.languageService.activeLang$.subscribe(lang => this.currentLang = lang);
  }

  tryAgain(): void {
    // Navigate back to the cart or checkout page
    this.router.navigate(['/', this.currentLang, 'cart']);
  }

  contactSupport(): void {
    // Example: mailto link or navigate to a contact page
    window.location.href = 'mailto:support@obscurite.com?subject=Order Failed: ' + (this.paypalOrderId || 'N/A');
  }
}
