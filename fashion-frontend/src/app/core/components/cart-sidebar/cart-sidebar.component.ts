// src/app/core/components/cart-sidebar/cart-sidebar.component.ts
import { Component, EventEmitter, Output, inject, OnInit, Input, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, NgZone, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription, firstValueFrom } from 'rxjs';
import { map, distinctUntilChanged, take } from 'rxjs/operators';

import { CartService } from '../../services/cart.service';
import { Cart, CartItem } from '../../models/cart.model';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { UserAddress } from '../../models/address.model'; // For address structure

@Component({
  selector: 'app-cart-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, FormsModule],
  templateUrl: './cart-sidebar.component.html',
  styleUrls: ['./cart-sidebar.component.scss']
})
export class CartSidebarComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Output() closeCart = new EventEmitter<void>();
  @Input() isOpen: boolean = false;

  public cartService = inject(CartService);
  private languageService = inject(LanguageService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private apiUrl = environment.apiUrl;

  cart$: Observable<Cart>;
  currentLang: string = 'en';
  quantityOptions: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

  @ViewChild('paypalButtonsContainerSidebar') paypalButtonsContainerSidebar!: ElementRef;
  public currentCartForPaypal: Cart | null = null;
  private payPalButtonsRendered = false;
  isProcessingPayment: boolean = false;
  private cartSub!: Subscription;
  private langSub!: Subscription;

  constructor() {
    this.cart$ = this.cartService.cart$;
  }

  ngOnInit(): void {
    this.currentLang = this.languageService.activeLang$.value;
    this.langSub = this.languageService.activeLang$.subscribe(lang => this.currentLang = lang);

    this.cartSub = this.cart$.pipe(
      map(cart => ({ // Map to an object that PayPal rendering depends on
        itemCount: cart.items.length,
        total: cart.total, // Total might influence re-render if promotions change it
        cartObj: cart       // Keep the full cart for detailed operations
      })),
      distinctUntilChanged((prev, curr) =>
        prev.itemCount === curr.itemCount &&
        prev.total === curr.total
      )
    ).subscribe(({ cartObj }) => {
      this.currentCartForPaypal = cartObj;
      // Conditional rendering moved to ngOnChanges and ngAfterViewInit for isOpen
      if (this.isOpen && this.paypalButtonsContainerSidebar?.nativeElement) {
        this.updatePayPalButtonVisibility();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        // Ensure cart data is current before rendering
        this.cartService.cart$.pipe(take(1)).subscribe(cart => {
          this.currentCartForPaypal = cart;
          this.updatePayPalButtonVisibility();
        });
      } else {
        this.clearPayPalButtons(); // Clear buttons when sidebar closes
      }
    }
  }

  ngAfterViewInit(): void {
    if (this.isOpen) {
      this.updatePayPalButtonVisibility();
    }
  }

  private updatePayPalButtonVisibility(): void {
    if (this.isOpen && this.currentCartForPaypal && this.currentCartForPaypal.items.length > 0) {
      this.renderPayPalButtons();
    } else if (this.payPalButtonsRendered) {
      this.clearPayPalButtons();
    }
  }


  ngOnDestroy(): void {
    if (this.cartSub) this.cartSub.unsubscribe();
    if (this.langSub) this.langSub.unsubscribe();
    this.clearPayPalButtons();
  }

  onClose(): void {
    this.closeCart.emit();
  }

  getCartItemId(item: CartItem): string {
    return this.cartService.getCartItemId(item);
  }

  updateQuantity(item: CartItem, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newQuantity = parseInt(selectElement.value, 10);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      this.cartService.updateItemQuantity(this.getCartItemId(item), newQuantity);
    } else if (newQuantity <= 0) {
      this.cartService.removeItem(this.getCartItemId(item));
    }
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(this.getCartItemId(item));
  }

  navigateToCheckout(): void {
    this.router.navigate(['/', this.currentLang, 'checkout']);
    this.onClose();
  }

  navigateToFullCart(): void {
    this.router.navigate(['/', this.currentLang, 'cart']);
    this.onClose();
  }

  clearPayPalButtons(): void {
    if (this.paypalButtonsContainerSidebar && this.paypalButtonsContainerSidebar.nativeElement) {
      this.paypalButtonsContainerSidebar.nativeElement.innerHTML = '';
    }
    this.payPalButtonsRendered = false;
  }

  renderPayPalButtons(): void {
    if (!this.isOpen || !this.currentCartForPaypal || this.currentCartForPaypal.items.length === 0) {
      this.clearPayPalButtons(); return;
    }
    if (typeof window === 'undefined' || !window.paypal || !window.paypal.Buttons) {
      console.error('[CartSidebar] PayPal SDK not loaded!'); return;
    }
    if (!this.paypalButtonsContainerSidebar || !this.paypalButtonsContainerSidebar.nativeElement) {
      return;
    }

    this.clearPayPalButtons();
    const cartSnapshotForPayPal = JSON.parse(JSON.stringify(this.currentCartForPaypal));

    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', tagline: false, height: 40 },
      createOrder: async () => {
        return this.ngZone.run(async () => {
          if (!cartSnapshotForPayPal || cartSnapshotForPayPal.items.length === 0) {
            alert('Your cart is empty.'); this.isProcessingPayment = false; this.cdr.detectChanges();
            throw new Error('Cart is empty for PayPal createOrder from sidebar');
          }
          this.isProcessingPayment = true; this.cdr.detectChanges();
          try {
            const response = await firstValueFrom(
              this.http.post<{ orderID: string }>(`${this.apiUrl}/paypal/create-order`, { cart: cartSnapshotForPayPal })
            );
            return response.orderID;
          } catch (error: any) {
            const errorMsg = error.error?.message || error.message || 'Could not initiate PayPal payment.';
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
              console.error("Critical: No address could be determined from PayPal for sidebar checkout.");
              alert("Could not retrieve shipping address from PayPal. Please try checking out through the full checkout page where you can enter an address manually if needed.");
              this.isProcessingPayment = false; this.cdr.detectChanges();
              throw new Error("PayPal address retrieval failed in sidebar.");
            }
            const finalShippingAddress = shippingAddressFromPayPal || billingAddressFromPayPal!;
            const finalBillingAddress = billingAddressFromPayPal || shippingAddressFromPayPal!;

            // This structure MUST match what the backend's /paypal/capture-order endpoint expects
            const cartForOrderPayload = {
              ...cartSnapshotForPayPal,
              shippingInfo: { // Add shipping info from cart
                method: cartSnapshotForPayPal.shippingMethod,
                cost: cartSnapshotForPayPal.shippingCost
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
            this.onClose();
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
          console.error('[PayPal SDK] onError (Sidebar):', err);
          alert('An error occurred with PayPal. Please try again or use the main checkout page.');
          this.isProcessingPayment = false; this.cdr.detectChanges();
        });
      },
      onCancel: () => {
        this.ngZone.run(() => {
          this.isProcessingPayment = false; this.cdr.detectChanges();
        });
      }
    }).render(this.paypalButtonsContainerSidebar.nativeElement)
      .then(() => { this.payPalButtonsRendered = true; })
      .catch((err: any) => {
        this.payPalButtonsRendered = false;
        console.error("[CartSidebar] Failed to render PayPal Buttons:", err);
        if (this.paypalButtonsContainerSidebar?.nativeElement) {
          this.paypalButtonsContainerSidebar.nativeElement.innerHTML = '<p style="color: red; font-size: 0.8em; text-align:center;">PayPal unavailable.</p>';
        }
      });
  }
}
