import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { NotFoundComponent } from './core/components/not-found/not-found.component';
import { ProductDetailComponent } from './features/product/product-detail/product-detail.component';
import { ProductListComponent } from './features/product/product-list/product-list.component';
import { CollectionsComponent } from './pages/collections/collections.component';
import { LanguageWrapperComponent } from './core/components/language-wrapper/language-wrapper.component';
import { OrderLookupComponent } from './pages/order-lookup/order-lookup.component';

// Cart and Checkout
import { CartPageComponent } from './features/cart/cart-page/cart-page.component';
import { OrderSuccessComponent } from './features/checkout/order-success/order-success.component';
import { OrderFailedComponent } from './features/checkout/order-failed/order-failed.component';

// Auth & User Account
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ProfileComponent } from './features/auth/profile/profile.component';
import { authGuard } from './core/guards/auth.guard';
import { AddressBookComponent } from './features/user/pages/address-book/address-book.component';
import { OrderDetailComponent } from './features/user/pages/order-detail/order-detail.component';
import { OrderHistoryComponent } from './features/user/pages/order-history/order-history.component';
import { WishlistPageComponent } from './features/user/pages/wishlist-page/wishlist-page.component'; // << IMPORT WISHLIST PAGE

export const routes: Routes = [
  {
    path: ':lang',
    component: LanguageWrapperComponent,
    children: [
      // --- Core Public Routes ---
      { path: '', component: HomeComponent, pathMatch: 'full' },
      { path: 'collections', component: CollectionsComponent, pathMatch: 'full' },
      { path: 'category/:slug', component: ProductListComponent },
      { path: 'search', component: ProductListComponent, data: { isSearchPage: true } },
      { path: 'product/:slug', component: ProductDetailComponent },
      { path: 'order-lookup', component: OrderLookupComponent },

      // --- Auth & Cart ---
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'cart', component: CartPageComponent },
      { path: 'order-success/:orderId', component: OrderSuccessComponent },
      { path: 'order-success', component: OrderSuccessComponent },
      { path: 'order-failed', component: OrderFailedComponent },

      // --- User Account Routes (Protected) ---
      {
        path: 'account',
        canActivate: [authGuard],
        children: [
          { path: '', redirectTo: 'profile', pathMatch: 'full' },
          { path: 'profile', component: ProfileComponent },
          { path: 'addresses', component: AddressBookComponent },
          { path: 'orders', component: OrderHistoryComponent },
          { path: 'orders/:id', component: OrderDetailComponent },
          { path: 'wishlist', component: WishlistPageComponent }, // << ADD WISHLIST ROUTE
        ]
      },
      // --- Standalone User Routes (also protected) ---
      {
        path: 'user/wishlist', // A more direct, top-level route
        component: WishlistPageComponent,
        canActivate: [authGuard]
      },
    ]
  },
  { path: '', redirectTo: '/en', pathMatch: 'full' },
  { path: '**', component: NotFoundComponent }
];
