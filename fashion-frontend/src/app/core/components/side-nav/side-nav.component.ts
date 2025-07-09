// src/app/core/components/side-nav/side-nav.component.ts
import { Component, EventEmitter, Input, OnInit, Output, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, take } from 'rxjs';
import { CategoryNode, CategoryService } from '../../services/category.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Translation } from '../../models/translation.model';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './side-nav.component.html',
  styleUrls: ['./side-nav.component.scss']
})
export class SideNavComponent implements OnInit, OnChanges {
  private categoryService = inject(CategoryService);
  public languageService = inject(LanguageService);

  @Input() isOpen: boolean = false;
  @Output() closeNav = new EventEmitter<void>();

  public allRootCategories: CategoryNode[] = [];
  navStack: CategoryNode[] = [];
  currentDisplayLevelCategories: CategoryNode[] = [];
  currentParentForDisplay: CategoryNode | null = null;

  get currentPanelTitle(): Translation[] | string {
    if (this.navStack.length === 0) {
      return 'Menu';
    }
    return this.navStack[this.navStack.length - 1].name;
  }

  ngOnInit(): void {
    this.categoryService.getCategoryTree().pipe(take(1)).subscribe(rootCategories => {
      this.allRootCategories = rootCategories || [];
      if (this.isOpen && this.navStack.length === 0) {
        this.currentDisplayLevelCategories = [...this.allRootCategories];
        this.currentParentForDisplay = null;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      // console.log('SideNavComponent: isOpen changed to', this.isOpen); 
      if (this.isOpen) {
        if (this.navStack.length === 0 && this.allRootCategories.length > 0) {
          this.currentDisplayLevelCategories = [...this.allRootCategories];
          this.currentParentForDisplay = null;
        }
        // If it was already open and in a sub-menu, ngOnChanges might not be the place to reset,
        // resetToRoot is called on close() and can be called on explicit open if needed by parent.
        // The main purpose here is to load initial data if opening for the first time *after* root cats are loaded.
      }
    }
  }

  selectCategory(category: CategoryNode): void {
    if (category.children && category.children.length > 0) {
      this.navStack.push(category);
      this.currentParentForDisplay = category;
      this.currentDisplayLevelCategories = [...category.children];
    } else {
      this.close();
    }
  }

  goBack(): void {
    if (this.navStack.length > 0) {
      this.navStack.pop();
      if (this.navStack.length > 0) {
        this.currentParentForDisplay = this.navStack[this.navStack.length - 1];
        this.currentDisplayLevelCategories = [...this.currentParentForDisplay.children];
      } else {
        this.resetToRoot();
      }
    }
  }

  private resetToRoot(): void {
    this.navStack = [];
    this.currentDisplayLevelCategories = [...this.allRootCategories];
    this.currentParentForDisplay = null;
  }

  close(): void {
    // console.log('SideNavComponent: close() called');
    this.closeNav.emit();
    // It's important to reset the state when the nav is explicitly closed
    // so it opens fresh next time.
    this.resetToRoot();
  }

  get lang(): string {
    return this.languageService.activeLang$.value;
  }
}
