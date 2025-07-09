// src/app/features/product/filter-sidebar/filter-sidebar.component.ts
import { Component, EventEmitter, Input, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { SearchResult, SearchResultFacetCategory } from '../../../core/models/product.model';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe], // TranslatePipe is used in template
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss'
})
export class FilterSidebarComponent implements OnChanges {
  @Input() facets!: SearchResult['facets'];
  @Input() activeFilters: {
    brands: { [key: string]: boolean },
    categories: { [key: string]: boolean },
    colors: { [key: string]: boolean },
    sizes: { [key: string]: boolean }
  } = { brands: {}, categories: {}, colors: {}, sizes: {} };
  @Output() filterChange = new EventEmitter<any>();

  public languageService = inject(LanguageService);

  // This internal state will be what ngModel binds to for categories
  // to avoid issues with [(ngModel)] and object keys directly if activeFilters comes from parent.
  // However, with the current setup where activeFilters keys are strings (IDs/names),
  // direct binding as in the HTML should work. This is more for complex scenarios.
  // For now, let's keep direct ngModel binding.

  ngOnChanges(changes: SimpleChanges): void {
    // If facets or activeFilters change from parent, might need to re-evaluate local state
    // For now, ngModel handles direct updates well for simple key-value.
    if (changes['activeFilters']) {
      // console.log('Active filters changed in sidebar:', this.activeFilters);
    }
  }

  onFilterChange(): void {
    this.filterChange.emit(this.activeFilters);
  }

  trackById(index: number, item: { _id: string, [key: string]: any }): string {
    return item._id;
  }
  trackByName(index: number, item: { name: string, [key: string]: any }): string {
    return item.name;
  }
}
