// src/app/shared/components/order-detail-display/order-detail-display.component.ts
import { Component, Input, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Order } from '../../../core/models/order.model';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-order-detail-display',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe, TranslatePipe],
  templateUrl: './order-detail-display.component.html',
  styleUrls: ['./order-detail-display.component.scss']
})
export class OrderDetailDisplayComponent {
  @Input() order!: Order;
  public languageService = inject(LanguageService);
}
