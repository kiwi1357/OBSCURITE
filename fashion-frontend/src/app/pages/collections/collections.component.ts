// src/app/pages/collections/collections.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { LookbookService } from '../../core/services/lookbook.service';
import { LanguageService } from '../../core/services/language.service';
import { Lookbook } from '../../core/models/lookbook.model';
import { TranslatePipe } from '../../core/pipes/translate.pipe';


@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './collections.component.html',
  styleUrls: ['./collections.component.scss']
})
export class CollectionsComponent implements OnInit {
  private lookbookService = inject(LookbookService);
  private languageService = inject(LanguageService);

  lookbooks$!: Observable<Lookbook[]>;

  get lang(): string {
    return this.languageService.activeLang$.value;
  }

  ngOnInit(): void {
    this.lookbooks$ = this.lookbookService.getActiveLookbooks();
  }
}
