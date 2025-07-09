// src/app/core/models/cart.model.ts
import { Translation } from './translation.model';

export interface CartItem {
  productId: string;
  variantId: string;
  sku: string;
  name: Translation[];
  variantColorName: Translation[];
  size: string;
  price: number; // Unit price at time of adding
  quantity: number;
  mainImage: string | null;
  productSlug: string;
  // Optional: direct categoryId of the product, if needed for promo validation on frontend before backend call
  // categoryId?: string; 
}

// This interface should match the response from your backend's promo validation endpoint
export interface ValidatedPromoCode {
  _id: string; // The ID of the PromoCode document itself
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // The raw value (e.g., 10 for 10% or 10 for 10 EUR)
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  // Add any other fields from the backend validation response that are useful on the frontend
}

export interface AppliedPromoDetails {
  source: ValidatedPromoCode; // The original validated promo code details
  calculatedDiscount: number; // The actual discount amount calculated for the current cart
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  appliedPromo: AppliedPromoDetails | null;
  discountAmount: number;
  shippingCost: number;      // << NEW
  shippingMethod: string;    // << NEW (e.g., "Standard", "Free")
  total: number;             // subtotal - discountAmount + shippingCost
}
