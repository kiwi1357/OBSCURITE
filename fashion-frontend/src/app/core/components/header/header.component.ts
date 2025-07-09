// src/app/core/components/header/header.component.ts
import { Component, EventEmitter, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription, Observable, filter } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service'; // << IMPORT
import { User } from '../../models/user.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() menuToggle = new EventEmitter<void>();
  @Output() cartToggle = new EventEmitter<void>();

  private router = inject(Router);
  public authService = inject(AuthService);
  private languageService = inject(LanguageService);
  public cartService = inject(CartService);
  public wishlistService = inject(WishlistService); // << INJECT

  desktopSearchTerm: string = '';
  mobileSearchTerm: string = '';
  isMobileSearchActive: boolean = false;

  currentLang: string = 'en';
  isLoggedIn = false;
  currentUser: User | null = null;

  itemCount$: Observable<number>;
  wishlistCount$: Observable<number>; // << WISHLIST COUNT

  private langSub!: Subscription;
  private userSub!: Subscription;
  private routerSub!: Subscription;

  constructor() {
    this.itemCount$ = this.cartService.itemCount$;
    this.wishlistCount$ = this.wishlistService.wishlistCount$; // << ASSIGN
  }

  ngOnInit(): void {
    this.langSub = this.languageService.activeLang$.subscribe(lang => {
      this.currentLang = lang;
    });

    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
    });

    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isMobileSearchActive = false;
    });
  }

  onMenuClick(): void { this.menuToggle.emit(); }
  onCartClick(): void { this.cartToggle.emit(); }

  onDesktopSearch(): void {
    if (this.desktopSearchTerm.trim()) {
      this.router.navigate(['/', this.currentLang, 'search'], { queryParams: { q: this.desktopSearchTerm } });
    }
  }

  toggleMobileSearch(): void { this.isMobileSearchActive = !this.isMobileSearchActive; }

  onMobileSearch(): void {
    if (this.mobileSearchTerm.trim()) {
      this.router.navigate(['/', this.currentLang, 'search'], { queryParams: { q: this.mobileSearchTerm } });
      this.mobileSearchTerm = '';
      this.isMobileSearchActive = false;
    }
  }

  logout(): void { this.authService.logout(); }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }
}
