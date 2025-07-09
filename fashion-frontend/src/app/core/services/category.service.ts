// src/app/core/services/category.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, tap } from 'rxjs';
import { Translation } from '../models/translation.model';

export interface CategoryNode {
  _id: string;
  name: Translation[];
  slug: string;
  parentCategory: string | null;
  children: CategoryNode[];
  image?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private flatCategories: CategoryNode[] = [];
  private categoryTree$?: Observable<CategoryNode[]>;

  getCategoryTree(): Observable<CategoryNode[]> {
    if (!this.categoryTree$) {
      this.categoryTree$ = this.http.get<CategoryNode[]>('/api/public/categories').pipe(
        tap(categories => {
          this.flatCategories = categories;
        }),
        map(categories => this.buildTree(categories)),
        shareReplay(1)
      );
    }
    return this.categoryTree$;
  }

  findCategoryBySlug(slug: string): CategoryNode | undefined {
    return this.flatCategories.find(c => c.slug === slug);
  }

  getBreadcrumbs(categorySlug: string): CategoryNode[] {
    const categoryMap = new Map(this.flatCategories.map(c => [c._id, c]));
    const crumbs: CategoryNode[] = [];
    let currentCategory = this.findCategoryBySlug(categorySlug);

    while (currentCategory) {
      crumbs.unshift(currentCategory);
      currentCategory = currentCategory.parentCategory ? categoryMap.get(currentCategory.parentCategory) : undefined;
    }
    return crumbs;
  }

  getCategoryWithDescendants(slug: string): string[] {
    const rootCategory = this.findCategoryBySlug(slug);
    if (!rootCategory) return [];

    const resultIds: string[] = [rootCategory._id];
    const queue: CategoryNode[] = [rootCategory];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = this.flatCategories.filter(c => c.parentCategory === current._id);
      for (const child of children) {
        resultIds.push(child._id);
        queue.push(child);
      }
    }
    return resultIds;
  }

  private buildTree(categories: CategoryNode[]): CategoryNode[] {
    const categoryMap: { [key: string]: CategoryNode } = {};
    const tree: CategoryNode[] = [];

    categories.forEach(category => {
      categoryMap[category._id] = { ...category, children: [] };
    });

    categories.forEach(category => {
      if (category.parentCategory) {
        const parent = categoryMap[category.parentCategory];
        if (parent) {
          if (!parent.children) { // Should not happen if initialized above, but good check
            parent.children = [];
          }
          parent.children.push(categoryMap[category._id]);
        }
      } else {
        tree.push(categoryMap[category._id]);
      }
    });
    return tree;
  }
}
