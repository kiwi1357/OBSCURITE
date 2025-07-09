// src/app/pages/order-lookup/order-lookup.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Order } from '../../core/models/order.model';
import { OrderService } from '../../core/services/order.service';
import { OrderDetailDisplayComponent } from '../../shared/components/order-detail-display/order-detail-display.component';

@Component({
  selector: 'app-order-lookup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OrderDetailDisplayComponent],
  templateUrl: './order-lookup.component.html',
  styleUrls: ['./order-lookup.component.scss']
})
export class OrderLookupComponent {
  private fb = inject(FormBuilder);
  private orderService = inject(OrderService);

  lookupForm: FormGroup;
  order$: Observable<Order | null> | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  lookupAttempted = false;

  constructor() {
    this.lookupForm = this.fb.group({
      orderId: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onLookup(): void {
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.lookupAttempted = true;
    this.order$ = null; // Reset previous result

    const { orderId, email } = this.lookupForm.value;

    this.order$ = this.orderService.lookupOrder(orderId, email).pipe(
      catchError(err => {
        this.errorMessage = err.message;
        return of(null);
      })
    );
    this.order$.subscribe(() => this.isLoading = false);
  }
}
