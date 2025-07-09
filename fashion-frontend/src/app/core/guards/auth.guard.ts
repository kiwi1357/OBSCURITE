import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Adjust path
import { map, take } from 'rxjs/operators';
import { LanguageService } from '../services/language.service';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const languageService = inject(LanguageService);

  return authService.isAuthenticated$.pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      } else {
        const currentLang = languageService.activeLang$.value || 'en';
        // Store the attempted URL for redirection after login
        router.navigate(['/', currentLang, 'login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
    })
  );
};
