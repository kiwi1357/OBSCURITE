import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LanguageService } from '../../services/language.service';
import { Subscription, filter, distinctUntilChanged, map } from 'rxjs'; // Added distinctUntilChanged, map

@Component({
  selector: 'app-language-wrapper',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class LanguageWrapperComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private languageService = inject(LanguageService);
  private routerSubscription?: Subscription;

  ngOnInit(): void {
    // Option 1: Using ActivatedRoute of the wrapper itself (if it's the direct parent of :lang routes)
    // This is simpler if the wrapper is always at the level of the ':lang' parameter.
    /*
    this.routerSubscription = this.route.paramMap.pipe(
      map(params => params.get('lang')),
      filter(lang => !!lang), // Ensure lang is not null or undefined
      distinctUntilChanged()   // Only emit if the language actually changes
    ).subscribe(lang => {
      if (lang) { // Redundant due to filter but good practice
        this.languageService.setLanguage(lang);
      }
    });
    */

    // Option 2: Using Router Events (more robust if ':lang' can be deeper)
    // The original logic was good, let's refine it slightly.
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => {
        let currentRoute = this.route;
        // Traverse down to the route segment that contains the 'lang' parameter.
        // This logic assumes that the 'lang' parameter will be on one of the activated routes
        // that are children of (or is) the route where LanguageWrapperComponent is placed.
        while (currentRoute.firstChild) {
          currentRoute = currentRoute.firstChild;
          if (currentRoute.snapshot.paramMap.has('lang')) {
            break; // Found the route with 'lang'
          }
        }
        // If 'lang' is on the LanguageWrapperComponent's own route:
        if (!currentRoute.snapshot.paramMap.has('lang') && this.route.snapshot.paramMap.has('lang')) {
          currentRoute = this.route;
        }
        return currentRoute.snapshot.paramMap.get('lang');
      }),
      filter(lang => !!lang), // Ensure lang is not null or undefined
      distinctUntilChanged()   // Only emit if the language actually changes
    ).subscribe(lang => {
      if (lang) {
        console.log('[LangWrapper] Router event detected lang:', lang); // DEBUG
        this.languageService.setLanguage(lang);
      }
    });

    // Initial language set from current route snapshot (for direct load on a lang page)
    // This helps if the component loads after the initial NavigationEnd event.
    let initialLangRoute = this.route;
    while (initialLangRoute.firstChild) {
      initialLangRoute = initialLangRoute.firstChild;
      if (initialLangRoute.snapshot.paramMap.has('lang')) break;
    }
    if (!initialLangRoute.snapshot.paramMap.has('lang') && this.route.snapshot.paramMap.has('lang')) {
      initialLangRoute = this.route;
    }
    const initialLang = initialLangRoute.snapshot.paramMap.get('lang');
    console.log('[LangWrapper] Initial route snapshot lang:', initialLang); // DEBUG
    if (initialLang && initialLang !== this.languageService.activeLang$.value) {
      this.languageService.setLanguage(initialLang);
    }
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }
}
