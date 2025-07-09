// src/app/core/services/cart.service.ts
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Cart, CartItem, ValidatedPromoCode, AppliedPromoDetails } from '../models/cart.model'; // Ensure Cart model is updated
import { ProductDetail, ProductVariant, Size } from '../models/product.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const generateCartItemId = (productId: string, variantId: string, sku: string): string => {
  return `${productId}-${variantId}-${sku}`;
};

// --- Shipping Constants ---
const STANDARD_SHIPPING_COST = 5.00; // Example standard shipping cost
const FREE_SHIPPING_THRESHOLD = 50.00;

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Initial cart state should include shippingCost and potentially shippingMethod
  private initialCartState: Cart = {
    items: [],
    itemCount: 0,
    subtotal: 0,
    appliedPromo: null,
    discountAmount: 0,
    shippingCost: STANDARD_SHIPPING_COST, // Default to standard shipping
    shippingMethod: "Standard Shipping",  // Default method
    total: STANDARD_SHIPPING_COST       // Initial total includes default shipping
  };

  private cartSubject = new BehaviorSubject<Cart>(this.loadInitialCart());
  public cart$: Observable<Cart> = this.cartSubject.asObservable();

  public itemCount$: Observable<number> = this.cart$.pipe(map(cart => cart.itemCount));
  public subtotal$: Observable<number> = this.cart$.pipe(map(cart => cart.subtotal));
  public discountAmount$: Observable<number> = this.cart$.pipe(map(cart => cart.discountAmount));
  public shippingCost$: Observable<number> = this.cart$.pipe(map(cart => cart.shippingCost)); // New observable
  public total$: Observable<number> = this.cart$.pipe(map(cart => cart.total));
  public appliedPromo$: Observable<AppliedPromoDetails | null> = this.cart$.pipe(map(cart => cart.appliedPromo));


  constructor() { }

  private loadInitialCart(): Cart {
    if (typeof localStorage !== 'undefined') {
      const storedCart = localStorage.getItem('shoppingCart');
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart) as Partial<Cart>;
          const items = parsedCart.items && Array.isArray(parsedCart.items) ? parsedCart.items : [];
          const appliedPromo = parsedCart.appliedPromo || null;
          // Recalculate everything, including shipping, based on stored items and promo
          return this.recalculateCartState(items, appliedPromo);
        } catch (e) {
          console.error("Error parsing cart from localStorage", e);
          localStorage.removeItem('shoppingCart');
        }
      }
    }
    // If nothing in storage, return initial state with default shipping
    return this.recalculateCartState([], null); // Recalculate to set initial shipping correctly
  }

  private saveCartState(): void {
    const currentCart = this.cartSubject.value;
    // Recalculate to ensure all derived values are correct before saving
    const cartToSave = this.recalculateCartState(currentCart.items, currentCart.appliedPromo);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('shoppingCart', JSON.stringify(cartToSave));
    }
    this.cartSubject.next(cartToSave);
  }

  private recalculateCartState(items: CartItem[], currentAppliedPromo: AppliedPromoDetails | null): Cart {
    let itemCount = 0;
    let subtotal = 0;
    items.forEach(item => {
      itemCount += item.quantity;
      subtotal += item.price * item.quantity;
    });
    subtotal = parseFloat(subtotal.toFixed(2));

    let discountAmount = 0;
    let finalAppliedPromoForState: AppliedPromoDetails | null = null;

    if (currentAppliedPromo && currentAppliedPromo.source) {
      const promoSource = currentAppliedPromo.source;
      const subtotalForPromoCheck = subtotal; // Promo usually applies to subtotal before shipping

      if (subtotalForPromoCheck >= (promoSource.minPurchaseAmount || 0)) {
        let calculatedDiscountForCurrentCart = 0;
        if (promoSource.discountType === 'percentage') {
          calculatedDiscountForCurrentCart = (subtotalForPromoCheck * promoSource.discountValue) / 100;
          if (promoSource.maxDiscountAmount && calculatedDiscountForCurrentCart > promoSource.maxDiscountAmount) {
            calculatedDiscountForCurrentCart = promoSource.maxDiscountAmount;
          }
        } else if (promoSource.discountType === 'fixed') {
          calculatedDiscountForCurrentCart = promoSource.discountValue;
        }
        discountAmount = Math.min(calculatedDiscountForCurrentCart, subtotalForPromoCheck);
        finalAppliedPromoForState = {
          source: promoSource,
          calculatedDiscount: parseFloat(discountAmount.toFixed(2))
        };
      } else {
        finalAppliedPromoForState = null;
      }
    }

    discountAmount = finalAppliedPromoForState ? finalAppliedPromoForState.calculatedDiscount : 0;
    discountAmount = parseFloat(discountAmount.toFixed(2));

    // --- SHIPPING CALCULATION ---
    const subtotalAfterDiscount = subtotal - discountAmount;
    let shippingCost = STANDARD_SHIPPING_COST;
    let shippingMethod = "Standard Shipping";

    if (subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD) {
      shippingCost = 0.00;
      shippingMethod = "Free Shipping";
    }
    shippingCost = parseFloat(shippingCost.toFixed(2));
    // --- END SHIPPING CALCULATION ---

    const total = parseFloat((subtotalAfterDiscount + shippingCost).toFixed(2));

    return {
      items,
      itemCount,
      subtotal,
      appliedPromo: finalAppliedPromoForState,
      discountAmount,
      shippingCost, // << ADDED
      shippingMethod, // << ADDED
      total
    };
  }

  // addItem, updateItemQuantity, removeItem, clearCart:
  // These methods will call this.saveCartState() at the end, which in turn calls
  // recalculateCartState(), so shipping will be automatically updated.

  addItem(product: ProductDetail, selectedVariant: ProductVariant, selectedSize: Size, quantity: number): void {
    const currentItems = [...this.cartSubject.value.items];
    const cartItemId = generateCartItemId(product._id, selectedVariant._id, selectedSize.sku);
    const existingItemIndex = currentItems.findIndex(item => generateCartItemId(item.productId, item.variantId, item.sku) === cartItemId);

    if (existingItemIndex > -1) {
      currentItems[existingItemIndex].quantity += quantity;
    } else {
      const newItem: CartItem = {
        productId: product._id, variantId: selectedVariant._id, sku: selectedSize.sku,
        name: product.name, variantColorName: selectedVariant.color.name, size: selectedSize.size,
        price: selectedVariant.price, quantity: quantity, mainImage: selectedVariant.images[0] || null,
        productSlug: product.slug,
      };
      currentItems.push(newItem);
    }
    this.cartSubject.value.items = currentItems;
    this.saveCartState();
  }

  updateItemQuantity(cartItemIdToUpdate: string, newQuantity: number): void {
    if (newQuantity <= 0) { this.removeItem(cartItemIdToUpdate); return; }
    const currentItems = [...this.cartSubject.value.items];
    const itemIndex = currentItems.findIndex(item => generateCartItemId(item.productId, item.variantId, item.sku) === cartItemIdToUpdate);
    if (itemIndex > -1) {
      currentItems[itemIndex].quantity = newQuantity;
      this.cartSubject.value.items = currentItems;
      this.saveCartState();
    }
  }

  removeItem(cartItemIdToRemove: string): void {
    const currentItems = this.cartSubject.value.items.filter(
      item => generateCartItemId(item.productId, item.variantId, item.sku) !== cartItemIdToRemove
    );
    this.cartSubject.value.items = currentItems;
    this.saveCartState();
  }

  applyPromoCode(code: string): Observable<AppliedPromoDetails> {
    const currentCartValue = this.getCurrentCartValue();
    const validationCartItems = currentCartValue.items.map(item => ({
      productId: item.productId, price: item.price, quantity: item.quantity
    }));

    return this.http.post<ValidatedPromoCode>(`${this.apiUrl}/public/promocode/validate`, {
      code: code.toUpperCase(), cartItems: validationCartItems,
    }).pipe(
      map(validatedPromoSource => {
        let calculatedDiscount = 0;
        // IMPORTANT: Promo discount applies to subtotal BEFORE shipping consideration
        const subtotalForPromo = currentCartValue.subtotal;

        if (subtotalForPromo >= (validatedPromoSource.minPurchaseAmount || 0)) {
          if (validatedPromoSource.discountType === 'percentage') {
            calculatedDiscount = (subtotalForPromo * validatedPromoSource.discountValue) / 100;
            if (validatedPromoSource.maxDiscountAmount && calculatedDiscount > validatedPromoSource.maxDiscountAmount) {
              calculatedDiscount = validatedPromoSource.maxDiscountAmount;
            }
          } else if (validatedPromoSource.discountType === 'fixed') {
            calculatedDiscount = validatedPromoSource.discountValue;
          }
          calculatedDiscount = Math.min(calculatedDiscount, subtotalForPromo);
        }

        const appliedPromo: AppliedPromoDetails = {
          source: validatedPromoSource,
          calculatedDiscount: parseFloat(calculatedDiscount.toFixed(2))
        };
        this.cartSubject.value.appliedPromo = appliedPromo;
        this.saveCartState();
        return appliedPromo;
      }),
      catchError(err => {
        this.removePromoCode();
        return throwError(() => new Error(err.error?.message || 'Invalid promo code or error applying it.'));
      })
    );
  }

  removePromoCode(): void {
    this.cartSubject.value.appliedPromo = null;
    this.saveCartState();
  }

  clearCart(): void {
    this.cartSubject.value.items = [];
    this.cartSubject.value.appliedPromo = null;
    this.saveCartState(); // This will recalculate and save the empty state with default shipping
  }

  public getCurrentCartValue(): Cart {
    return this.cartSubject.value;
  }

  getCartItemId(item: CartItem): string {
    return generateCartItemId(item.productId, item.variantId, item.sku);
  }
}
