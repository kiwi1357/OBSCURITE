// src/app/core/models/product.model.ts
import { Translation } from './translation.model';

export interface Size {
  size: string;
  stock: number;
  sku: string;
}

export interface ProductColor { // Renamed for clarity from the variant's perspective
  name: Translation[];
  hexCode: string;
  baseColor: string; // ObjectId of a BaseColor document
}

export interface ProductVariant {
  _id: string;
  color: ProductColor; // Use the new ProductColor interface
  price: number;
  priceOriginal?: number;
  images: string[]; // Assumed to be always an array, even if empty.
  sizes: Size[];
  isActive: boolean;
}

export interface ProductCategoryInfo { // For populated category
  _id: string;
  name: Translation[];
  slug: string;
}

export interface ProductBrandInfo { // For populated brand
  _id: string;
  name: string; // Brand name typically not translatable per current model
}


export interface ProductDetail {
  _id: string;
  name: Translation[];
  description: Translation[];
  slug: string;
  category?: ProductCategoryInfo | null; // Category can be populated or null
  brand?: ProductBrandInfo | null; // Brand can be populated or null
  variants: ProductVariant[];
  tags?: string[];
  priority?: number;
  isActive?: boolean;
}

export interface ProductCardVariantColor {
  name: Translation[];
  hexCode: string;
}

export interface ProductCardVariant {
  _id: string;
  price: number;
  priceOriginal?: number;
  mainImage: string | null;
  color: ProductCardVariantColor;
}

export interface Product { // For lists/cards
  _id: string;
  slug: string;
  name: Translation[];
  variants: ProductCardVariant[];
}

export interface SearchResultFacetCategory {
  _id: string;
  name: Translation[];
  slug: string;
  count: number;
}

export interface SearchResult {
  data: Product[];
  facets: {
    brands: { _id: string, name: string, count: number }[];
    categories: SearchResultFacetCategory[];
    colors: { _id: string, name: string, count: number, hexCode: string }[];
    sizes: { name: string, count: number }[];
    priceRange: { min: number, max: number };
  };
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize?: number; // Optional
  };
}
