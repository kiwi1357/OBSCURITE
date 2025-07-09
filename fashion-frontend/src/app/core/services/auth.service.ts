// src/app/core/services/auth.service.ts
import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../models/user.model';
import { LanguageService } from './language.service';
import { WishlistService } from './wishlist.service'; // << IMPORT

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private languageService = inject(LanguageService);
  private wishlistService = inject(WishlistService); // << INJECT
  private ngZone = inject(NgZone);

  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));

  constructor() {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.loadInitialUser();
        });
      }, 0);
    });
  }

  public getApiUrl(): string {
    return this.apiUrl;
  }

  private loadInitialUser(): void {
    const token = this.getToken();
    if (token) {
      this.fetchUserProfile().subscribe({
        next: (user) => {
          this.currentUserSubject.next(user);
          this.wishlistService.loadWishlistIds(); // << LOAD WISHLIST ON SUCCESS
        },
        error: (err) => {
          console.error('AuthService: Error fetching user profile on load:', err.message || err);
          this.logout(); // This will clear the wishlist
        }
      });
    }
  }

  private fetchUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`);
  }

  login(credentials: { email: string, password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('authToken', response.token);
        this.currentUserSubject.next(response.user);
        this.wishlistService.loadWishlistIds(); // << LOAD WISHLIST ON LOGIN
      }),
      catchError(this.handleError)
    );
  }

  register(userInfo: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, userInfo).pipe(
      tap(response => {
        localStorage.setItem('authToken', response.token);
        this.currentUserSubject.next(response.user);
        this.wishlistService.loadWishlistIds(); // << LOAD WISHLIST ON REGISTER
      }),
      catchError(this.handleError)
    );
  }

  logout(): void {
    localStorage.removeItem('authToken');
    this.currentUserSubject.next(null);
    this.wishlistService.clearWishlist(); // << CLEAR WISHLIST ON LOGOUT
    const currentLang = this.languageService.activeLang$.value || 'en';
    this.router.navigate(['/', currentLang, 'login']);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  private handleError(error: any): Observable<never> {
    console.error('AuthService Error:', error);
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}
