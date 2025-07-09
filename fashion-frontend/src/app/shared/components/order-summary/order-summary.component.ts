// src/app/shared/components/order-summary/order-summary.component.ts
import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Cart } from '../../../core/models/cart.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.scss']
})
export class OrderSummaryComponent {
  @Input() cart!: Cart;
  languageService = inject(LanguageService);
  showItems = false;
}
