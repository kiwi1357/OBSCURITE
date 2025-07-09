// src/app/core/models/lookbook.model.ts
import { Translation } from './translation.model';
import { Product } from './product.model'; // Product for lookbook's products array

export interface Lookbook {
  _id: string;
  title: Translation[];
  slug: string;
  bannerImage: string;
  description: Translation[];
  products?: Product[]; // Uses the updated Product type for cards/carousels
  isActive?: boolean;
  priority?: number;
}
