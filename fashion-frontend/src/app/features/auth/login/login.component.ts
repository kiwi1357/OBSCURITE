import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private languageService = inject(LanguageService);

  loginForm!: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;
  currentLang = 'en';
  private returnUrl: string | null = null;

  ngOnInit(): void {
    this.currentLang = this.languageService.activeLang$.value;
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    // Get returnUrl from query parameters
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || `/${this.currentLang}/account/profile`;

    // If already logged in, redirect away from login page
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        this.router.navigateByUrl(this.returnUrl || `/${this.currentLang}/account/profile`);
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please enter a valid email and password.';
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigateByUrl(this.returnUrl || `/${this.currentLang}/account/profile`);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Login failed. Please check your credentials.';
        console.error('Login error:', err);
      }
    });
  }
}
