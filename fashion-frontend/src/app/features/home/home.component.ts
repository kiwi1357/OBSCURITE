// src/app/features/home/home.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { LookbookService } from '../../core/services/lookbook.service';
import { Lookbook } from '../../core/models/lookbook.model';
import { HeroComponent } from './hero/hero.component'; // Corrected path
import { LookbookComponent } from '../../shared/components/lookbook/lookbook.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent, LookbookComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private lookbookService = inject(LookbookService);

  isLoading = true;
  trendingLookbook?: Lookbook;
  // newArrivalsLookbook?: Lookbook;

  ngOnInit(): void {
    forkJoin({
      trending: this.lookbookService.getLookbookBySlug('trending-now'),
      // new: this.lookbookService.getLookbookBySlug('new-arrivals') 
    }).subscribe({
      next: (responses) => {
        this.trendingLookbook = responses.trending;
        // this.newArrivalsLookbook = responses.new;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Failed to load homepage lookbooks", err);
        this.isLoading = false;
      }
    });
  }
}
