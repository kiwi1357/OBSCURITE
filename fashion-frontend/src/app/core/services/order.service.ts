// src/app/core/services/order.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Order } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/orders`;

  /**
   * Fetches the order history for the currently authenticated user.
   * Requires auth interceptor to add token.
   * @returns Observable<Order[]>
   */
  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/my-orders`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Fetches a single order by its custom ID for the authenticated user.
   * Requires auth interceptor.
   * @param orderId The custom order ID (e.g., "ORD-12345").
   * @returns Observable<Order>
   */
  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Looks up an order for a guest user using the order ID and email.
   * This is a public endpoint.
   * @param orderId The custom order ID.
   * @param email The email address used for the order.
   * @returns Observable<Order>
   */
  lookupOrder(orderId: string, email: string): Observable<Order> {
    const params = new HttpParams()
      .set('orderId', orderId)
      .set('email', email);
    return this.http.get<Order>(`${this.apiUrl}/lookup`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('OrderService Error:', error);
    const errorMessage = error.error?.message || error.message || 'An unknown error occurred with the order service.';
    return throwError(() => new Error(errorMessage));
  }
}
