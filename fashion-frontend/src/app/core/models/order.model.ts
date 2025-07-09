// src/app/core/models/order.model.ts
import { UserAddress } from './address.model';

export interface OrderItem {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  variantInfo: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

export interface AppliedPromoCode {
  code: string;
  calculatedDiscountAmount: number;
}

export interface Order {
  customOrderId: string;
  orderDate: Date;
  customerDetails: {
    email: string;
    shippingAddress: UserAddress;
    billingAddress: UserAddress;
  };
  items: OrderItem[];
  subTotal: number;
  shippingInfo: {
    method: string;
    cost: number;
  };
  appliedPromoCode?: AppliedPromoCode;
  discountAmount: number;
  grandTotal: number;
  status: 'Pending Payment' | 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded' | 'Failed';
  userId?: string;
}
