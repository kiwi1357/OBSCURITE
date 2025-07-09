// src/app/core/services/wishlist.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/wishlist`;

  // Use a Set for efficient add/delete/has checks of product IDs
  private wishlistIdsSet = new BehaviorSubject<Set<string>>(new Set());
  public wishlistIds$ = this.wishlistIdsSet.asObservable();

  constructor() { }

  /**
   * Loads the initial set of wishlist product IDs for the logged-in user.
   * This should be called on login.
   */
  loadWishlistIds(): void {
    this.http.get<string[]>(`${this.apiUrl}/ids`).pipe(
      catchError(() => of([])) // On error, return an empty array
    ).subscribe(ids => {
      this.wishlistIdsSet.next(new Set(ids));
    });
  }

  /**
   * Clears the wishlist state. This should be called on logout.
   */
  clearWishlist(): void {
    this.wishlistIdsSet.next(new Set());
  }

  /**
   * Adds a product to the wishlist.
   * @param productId The ID of the product to add.
   */
  addToWishlist(productId: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { productId }).pipe(
      tap(() => {
        const currentSet = this.wishlistIdsSet.getValue();
        currentSet.add(productId);
        this.wishlistIdsSet.next(new Set(currentSet)); // Emit a new Set to trigger subscribers
      })
    );
  }

  /**
   * Removes a product from the wishlist.
   * @param productId The ID of the product to remove.
   */
  removeFromWishlist(productId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${productId}`).pipe(
      tap(() => {
        const currentSet = this.wishlistIdsSet.getValue();
        currentSet.delete(productId);
        this.wishlistIdsSet.next(new Set(currentSet));
      })
    );
  }

  /**
   * A reactive check to see if a product is in the wishlist.
   * @param productId The ID of the product to check.
   * @returns An observable that emits true if the product is in the wishlist, false otherwise.
   */
  isProductInWishlist$(productId: string): Observable<boolean> {
    return this.wishlistIds$.pipe(
      map(idSet => idSet.has(productId))
    );
  }

  /**
   * Fetches the full wishlist with populated product details.
   * @returns An observable emitting an array of Product objects.
   */
  getWishlistProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl).pipe(
      catchError(() => of([])) // Return empty array on error
    );
  }
}
