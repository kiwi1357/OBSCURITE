// src/app/features/cart/cart-page/cart-page.component.ts
import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription, firstValueFrom } from 'rxjs';
import { filter, take, distinctUntilChanged, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { CartService } from '../../../core/services/cart.service';
import { Cart, CartItem, AppliedPromoDetails } from '../../../core/models/cart.model';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { environment } from '../../../../environments/environment';
import { UserAddress } from '../../../core/models/address.model';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe],
  templateUrl: './cart-page.component.html',
  styleUrls: ['./cart-page.component.scss']
})
export class CartPageComponent implements OnInit, OnDestroy, AfterViewInit {
  public cartService = inject(CartService);
  private languageService = inject(LanguageService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private apiUrl = environment.apiUrl;

  cart$: Observable<Cart>;
  appliedPromo$: Observable<AppliedPromoDetails | null>;

  currentLang: string = 'en';
  private langSub!: Subscription;
  private cartSub!: Subscription;

  promoCode: string = '';
  promoError: string | null = null;
  isApplyingPromo: boolean = false;
  isProcessingPayment: boolean = false;

  quantityOptions: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

  @ViewChild('paypalButtonsContainer') paypalButtonsContainer!: ElementRef;
  public currentCartForPaypal: Cart | null = null;
  private payPalButtonsRendered = false;

  constructor() {
    this.cart$ = this.cartService.cart$;
    this.appliedPromo$ = this.cartService.appliedPromo$;
  }

  ngOnInit(): void {
    this.currentLang = this.languageService.activeLang$.value;
    this.langSub = this.languageService.activeLang$.subscribe(lang => this.currentLang = lang);

    this.cartSub = this.cart$.pipe(
      map(cart => ({ itemCount: cart.items.length, total: cart.total, cartObj: cart })),
      distinctUntilChanged((prev, curr) => prev.itemCount === curr.itemCount && prev.total === curr.total)
    ).subscribe(({ cartObj }) => {
      this.currentCartForPaypal = cartObj;
      if (this.paypalButtonsContainer?.nativeElement) {
        if (cartObj.items.length > 0) {
          this.renderPayPalButtons();
        } else if (this.payPalButtonsRendered) {
          this.clearPayPalButtons();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.currentCartForPaypal && this.currentCartForPaypal.items.length > 0) {
      this.renderPayPalButtons();
    }
  }

  clearPayPalButtons(): void {
    if (this.paypalButtonsContainer && this.paypalButtonsContainer.nativeElement) {
      this.paypalButtonsContainer.nativeElement.innerHTML = '';
    }
    this.payPalButtonsRendered = false;
  }

  renderPayPalButtons(): void {
    if (!this.currentCartForPaypal || this.currentCartForPaypal.items.length === 0) {
      this.clearPayPalButtons(); return;
    }
    if (typeof window === 'undefined' || !window.paypal || !window.paypal.Buttons) {
      console.error('[CartPage] PayPal SDK not loaded!'); return;
    }
    if (!this.paypalButtonsContainer || !this.paypalButtonsContainer.nativeElement) {
      console.error('[CartPage] PayPal button container not found!'); return;
    }

    this.clearPayPalButtons();
    const cartForPayPalInstance = JSON.parse(JSON.stringify(this.currentCartForPaypal));

    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', tagline: false },
      createOrder: async () => {
        return this.ngZone.run(async () => {
          this.isProcessingPayment = true; this.cdr.detectChanges();
          try {
            const response = await firstValueFrom(
              this.http.post<{ orderID: string }>(`${this.apiUrl}/paypal/create-order`, { cart: cartForPayPalInstance })
            );
            return response.orderID;
          } catch (error: any) {
            const errorMsg = error.error?.message || 'Could not initiate PayPal payment.';
            alert(errorMsg); this.isProcessingPayment = false; this.cdr.detectChanges();
            throw error;
          }
        });
      },
      onApprove: async (data: any, actions: any) => {
        return this.ngZone.run(async () => {
          this.isProcessingPayment = true; this.cdr.detectChanges();
          try {
            const paypalOrderDetails = await actions.order.get();

            let shippingAddressFromPayPal: UserAddress | null = null;
            let billingAddressFromPayPal: UserAddress | null = null;
            let payerEmail = "guest-checkout@example.com";

            if (paypalOrderDetails.payer) {
              payerEmail = paypalOrderDetails.payer.email_address || payerEmail;
              if (paypalOrderDetails.payer.address) {
                const pa = paypalOrderDetails.payer.address;
                billingAddressFromPayPal = {
                  fullName: `${paypalOrderDetails.payer.name?.given_name || ''} ${paypalOrderDetails.payer.name?.surname || ''}`.trim() || 'PayPal User',
                  addressLine1: pa.address_line_1 || '', addressLine2: pa.address_line_2 || '',
                  city: pa.admin_area_2 || '', state: pa.admin_area_1 || '',
                  zipCode: pa.postal_code || '', country: pa.country_code || '',
                };
              }
            }

            if (paypalOrderDetails.purchase_units && paypalOrderDetails.purchase_units[0] && paypalOrderDetails.purchase_units[0].shipping) {
              const ps = paypalOrderDetails.purchase_units[0].shipping;
              const psAddr = ps.address;
              shippingAddressFromPayPal = {
                fullName: ps.name?.full_name || billingAddressFromPayPal?.fullName || 'PayPal User',
                addressLine1: psAddr?.address_line_1 || '', addressLine2: psAddr?.address_line_2 || '',
                city: psAddr?.admin_area_2 || '', state: psAddr?.admin_area_1 || '',
                zipCode: psAddr?.postal_code || '', country: psAddr?.country_code || '',
              };
            }

            if (!shippingAddressFromPayPal && !billingAddressFromPayPal) {
              throw new Error("Could not retrieve a valid shipping or billing address from PayPal.");
            }

            const finalShippingAddress = shippingAddressFromPayPal || billingAddressFromPayPal!;
            const finalBillingAddress = billingAddressFromPayPal || shippingAddressFromPayPal!;

            const cartForOrderPayload = {
              ...cartForPayPalInstance,
              shippingInfo: {
                method: cartForPayPalInstance.shippingMethod,
                cost: cartForPayPalInstance.shippingCost
              },
              customerDetails: {
                email: payerEmail,
                shippingAddress: finalShippingAddress,
                billingAddress: finalBillingAddress,
              },
            };

            const response = await firstValueFrom(
              this.http.post<{ message: string, internalOrderId: string }>(`${this.apiUrl}/paypal/capture-order`, {
                orderIDFromPayPal: data.orderID,
                cartForOrder: cartForOrderPayload
              })
            );
            this.cartService.clearCart();
            this.router.navigate(['/', this.currentLang, 'order-success', response.internalOrderId]);
          } catch (error: any) {
            const errorMsg = error.error?.message || error.message || 'Payment capture failed.';
            alert(errorMsg);
            this.router.navigate(['/', this.currentLang, 'order-failed'], { queryParams: { paypalOrderId: data.orderID, error: 'capture_failed' } });
          } finally {
            this.isProcessingPayment = false; this.cdr.detectChanges();
          }
        });
      },
      onError: (err: any) => {
        this.ngZone.run(() => {
          console.error('[PayPal SDK] onError:', err);
          alert('An error occurred with PayPal. Please try again.');
          this.isProcessingPayment = false; this.cdr.detectChanges();
        });
      },
      onCancel: () => {
        this.ngZone.run(() => {
          this.isProcessingPayment = false; this.cdr.detectChanges();
        });
      }
    }).render(this.paypalButtonsContainer.nativeElement)
      .then(() => { this.payPalButtonsRendered = true; })
      .catch((err: any) => {
        this.payPalButtonsRendered = false;
        console.error("[CartPage] Failed to render PayPal Buttons:", err);
        if (this.paypalButtonsContainer?.nativeElement) {
          this.paypalButtonsContainer.nativeElement.innerHTML = '<p style="color: red; font-size: 0.8em;">PayPal unavailable.</p>';
        }
      });
  }

  getCartItemId(item: CartItem): string { return this.cartService.getCartItemId(item); }

  updateQuantity(item: CartItem, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newQuantity = parseInt(selectElement.value, 10);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      this.cartService.updateItemQuantity(this.getCartItemId(item), newQuantity);
    } else if (newQuantity <= 0) {
      this.cartService.removeItem(this.getCartItemId(item));
    }
  }

  removeItem(item: CartItem): void { this.cartService.removeItem(this.getCartItemId(item)); }

  applyPromoCode(): void {
    if (this.promoCode.trim()) {
      this.isApplyingPromo = true; this.promoError = null;
      this.cartService.applyPromoCode(this.promoCode.trim()).subscribe({
        next: () => { this.promoCode = ''; this.isApplyingPromo = false; },
        error: (err) => { this.promoError = err.message; this.isApplyingPromo = false; }
      });
    } else { this.promoError = 'Please enter a promo code.'; }
  }

  removePromo(): void { this.cartService.removePromoCode(); this.promoError = null; this.promoCode = ''; }

  navigateToProduct(item: CartItem): void {
    this.router.navigate(['/', this.currentLang, 'product', item.productSlug], { queryParams: { variant: item.variantId } });
  }

  continueShopping(): void { this.router.navigate(['/', this.currentLang]); }

  ngOnDestroy(): void {
    if (this.langSub) this.langSub.unsubscribe();
    if (this.cartSub) this.cartSub.unsubscribe();
    this.clearPayPalButtons();
  }
}
