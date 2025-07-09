// src/app/core/services/address.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserAddress, UserAddressData } from '../models/address.model';

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/user/addresses`; // Base URL for user addresses

  // Optional: BehaviorSubject to hold user's addresses if you want a reactive store
  // private userAddressesSubject = new BehaviorSubject<UserAddressData | null>(null);
  // public userAddresses$ = this.userAddressesSubject.asObservable();

  constructor() { }

  getAddresses(): Observable<UserAddressData> {
    return this.http.get<UserAddressData>(this.apiUrl).pipe(
      // tap(data => this.userAddressesSubject.next(data)), // Update BehaviorSubject if using it
      catchError(this.handleError)
    );
  }

  getAddressById(addressId: string): Observable<UserAddress> {
    return this.http.get<UserAddress>(`${this.apiUrl}/${addressId}`).pipe(
      catchError(this.handleError)
    );
  }

  addAddress(address: Omit<UserAddress, '_id'>): Observable<UserAddress> {
    return this.http.post<UserAddress>(this.apiUrl, address).pipe(
      // tap(() => this.refreshAddresses()), // Refresh local store if using one
      catchError(this.handleError)
    );
  }

  updateAddress(addressId: string, address: Partial<UserAddress>): Observable<UserAddress> {
    return this.http.put<UserAddress>(`${this.apiUrl}/${addressId}`, address).pipe(
      // tap(() => this.refreshAddresses()),
      catchError(this.handleError)
    );
  }

  deleteAddress(addressId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${addressId}`).pipe(
      // tap(() => this.refreshAddresses()),
      catchError(this.handleError)
    );
  }

  setDefaultAddress(addressId: string, type: 'shipping' | 'billing'): Observable<UserAddressData> {
    return this.http.put<UserAddressData>(`${this.apiUrl}/set-default/${addressId}`, { type }).pipe(
      // tap(data => this.userAddressesSubject.next(data)), // Update local store
      catchError(this.handleError)
    );
  }

  // Helper to refresh addresses if using a local BehaviorSubject store
  // refreshAddresses(): void {
  //   this.getAddresses().subscribe(); 
  // }

  private handleError(error: any): Observable<never> {
    console.error('AddressService Error:', error);
    let errorMessage = 'An unknown error occurred with address management!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client-side error: ${error.error.message}`;
    } else if (error.status) {
      errorMessage = error.error?.message || `Server error (Code: ${error.status})`;
      if (error.error?.errors) { // Mongoose validation errors
        const validationErrors = Object.values(error.error.errors).map((e: any) => e.message).join(', ');
        errorMessage = `${error.error.message}: ${validationErrors}`;
      }
    }
    return throwError(() => new Error(errorMessage));
  }
}
