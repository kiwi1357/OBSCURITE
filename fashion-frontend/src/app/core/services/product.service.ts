// src/app/core/services/product.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'; // Assuming this path is correct
import { SearchResult, ProductDetail } from '../models/product.model';
import { LanguageService } from './language.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private languageService = inject(LanguageService);
  private apiUrl = environment.apiUrl; // If your public routes are also under /api

  private get lang(): string {
    return this.languageService.activeLang$.value;
  }

  searchProducts(filters: any): Observable<SearchResult> {
    const params = new HttpParams({ fromObject: { ...filters, lang: this.lang } });
    // Assuming search is /api/search
    return this.http.get<SearchResult>(`${this.apiUrl}/search`, { params });
  }

  getProductBySlug(slug: string): Observable<ProductDetail> {
    const params = new HttpParams({ fromObject: { lang: this.lang } });
    // Assuming public product route is /api/public/products/:slug
    return this.http.get<ProductDetail>(`${this.apiUrl}/public/products/${slug}`, { params });
  }
}
