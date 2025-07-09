// src/app/core/services/wishlist.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private http = inject(HttpClient);
  // NOTE: Cannot inject AuthService directly here as it creates a circular dependency
  // AuthService -> WishlistService -> AuthService
  // The dependency will be resolved by having AuthService call the public clear method.
  private apiUrl = `${environment.apiUrl}/wishlist`;

  // Holds the simple array of product IDs for quick checking (e.g., is this product wishlisted?)
  private wishlistedIdsSet = new BehaviorSubject<Set<string>>(new Set());
  public wishlistedIds$ = this.wishlistedIdsSet.asObservable();

  // Holds the full, populated product objects for display on the wishlist page
  private wishlistItemsSubject = new BehaviorSubject<Product[]>([]);
  public wishlistItems$ = this.wishlistItemsSubject.asObservable();

  // Observable for the count of items, derived from the ID set
  public wishlistCount$ = this.wishlistedIds$.pipe(map(idSet => idSet.size));

  constructor() {
    // We cannot inject AuthService here due to circular dependency.
    // Instead, we will initialize the wishlist via a call from AuthService
    // or another high-level component after login.
  }

  /**
   * Initializes the wishlist state. Called after a user logs in.
   */
  initializeWishlistState(): void {
    this.loadWishlistIds();
  }

  /**
   * Loads just the IDs of wishlisted items.
   * This is lightweight and intended for use across the site to show toggle states.
   */
  loadWishlistIds(): void {
    this.http.get<string[]>(`${this.apiUrl}/ids`).pipe(
      catchError(() => of([])) // On error, return an empty array
    ).subscribe(ids => {
      this.wishlistedIdsSet.next(new Set(ids));
    });
  }

  /**
   * Loads the full product details for the wishlist page.
   * This is a heavier call and should only be used by the wishlist page itself.
   */
  loadWishlistItems(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl).pipe(
      tap(items => this.wishlistItemsSubject.next(items)),
      catchError(err => {
        console.error("Failed to load full wishlist items", err);
        this.wishlistItemsSubject.next([]); // Clear items on error
        return of([]);
      })
    );
  }

  /**
   * Adds a product to the wishlist and updates the local state.
   * @param productId The ID of the product to add.
   */
  addToWishlist(productId: string): Observable<{ wishlist: string[] }> {
    return this.http.post<{ wishlist: string[] }>(this.apiUrl, { productId }).pipe(
      tap(response => {
        // Update the state with the new list of IDs from the server response
        this.wishlistedIdsSet.next(new Set(response.wishlist));
      }),
      catchError(err => {
        console.error('Failed to add to wishlist', err);
        throw err; // Re-throw the error for the component to handle
      })
    );
  }

  /**
   * Removes a product from the wishlist and updates the local state.
   * @param productId The ID of the product to remove.
   */
  removeFromWishlist(productId: string): Observable<{ wishlist: string[] }> {
    return this.http.delete<{ wishlist: string[] }>(`${this.apiUrl}/${productId}`).pipe(
      tap(response => {
        // Update the state with the new list of IDs
        this.wishlistedIdsSet.next(new Set(response.wishlist));
        // Also remove the item from the detailed list if it exists there
        const currentItems = this.wishlistItemsSubject.value;
        this.wishlistItemsSubject.next(currentItems.filter(item => item._id !== productId));
      }),
      catchError(err => {
        console.error('Failed to remove from wishlist', err);
        throw err;
      })
    );
  }

  /**
   * A utility method to check synchronously if a product is in the wishlist.
   * @param productId The ID of the product to check.
   * @returns boolean
   */
  isProductWishlisted(productId: string): boolean {
    return this.wishlistedIdsSet.value.has(productId);
  }

  /**
   * Clears all wishlist state. Called on user logout. Public to be called from AuthService.
   */
  public clearWishlistState(): void {
    this.wishlistedIdsSet.next(new Set());
    this.wishlistItemsSubject.next([]);
  }
}
