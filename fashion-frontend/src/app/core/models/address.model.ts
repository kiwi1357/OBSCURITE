// src/app/core/models/address.model.ts
export interface UserAddress {
  _id?: string; // Provided by backend, optional for new address forms
  addressName?: string; // e.g., "Home", "Work"
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string; // Or province/region
  zipCode: string; // Or postal code
  country: string; // Consider using ISO codes if you have a country dropdown
  phoneNumber?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

// Interface for the response from GET /api/user/addresses
export interface UserAddressData {
  addresses: UserAddress[];
  defaultShippingAddressId: string | null;
  defaultBillingAddressId: string | null;
}
