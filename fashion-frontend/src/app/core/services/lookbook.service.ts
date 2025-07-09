// src/app/core/services/lookbook.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LanguageService } from './language.service';
import { Lookbook } from '../models/lookbook.model';
import { environment } from '../../../environments/environment'; // Assuming path

@Injectable({
  providedIn: 'root'
})
export class LookbookService {
  private http = inject(HttpClient);
  private languageService = inject(LanguageService);
  private apiUrl = environment.apiUrl; // If your public routes are also under /api

  private get lang(): string {
    return this.languageService.activeLang$.value;
  }

  getActiveLookbooks(): Observable<Lookbook[]> {
    const params = new HttpParams({ fromObject: { lang: this.lang } });
    return this.http.get<Lookbook[]>(`${this.apiUrl}/lookbooks`, { params });
  }

  getLookbookBySlug(slug: string): Observable<Lookbook> {
    const params = new HttpParams({ fromObject: { lang: this.lang } });
    return this.http.get<Lookbook>(`${this.apiUrl}/lookbooks/${slug}`, { params });
  }
}
