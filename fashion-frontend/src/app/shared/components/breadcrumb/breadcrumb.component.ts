// src/app/shared/components/breadcrumb/breadcrumb.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Translation } from '../../../core/models/translation.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

export interface Breadcrumb {
  name: Translation[]; // Name is now Translation[]
  link: any[];
  queryParams?: { [key: string]: any };
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <nav aria-label="breadcrumb" class="breadcrumb-nav">
      <a [routerLink]="['/', lang]" class="breadcrumb-link">Home</a>
      
      @for (crumb of crumbs; track $index) {
        <span class.binds="separator" class="separator"> • </span>
        @if ($last) {
          <span class="active-crumb" aria-current="page">{{ crumb.name | translate:lang }}</span>
        } @else {
          <a [routerLink]="crumb.link" [queryParams]="crumb.queryParams" class="breadcrumb-link">{{ crumb.name | translate:lang }}</a>
        }
      }
    </nav>
  `,
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent {
  @Input() crumbs: Breadcrumb[] = [];
  @Input() lang: string = 'en'; // lang is passed to the pipe for specific context
}
