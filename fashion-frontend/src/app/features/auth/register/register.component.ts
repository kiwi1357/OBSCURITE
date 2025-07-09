import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';

// Custom validator for password matching
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss' // Use the same SCSS as login for consistency
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private languageService = inject(LanguageService);

  registerForm!: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;
  currentLang = 'en';

  ngOnInit(): void {
    this.currentLang = this.languageService.activeLang$.value;
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      phoneNumber: [''] // Optional
    }, { validators: passwordMatchValidator });

    // If already logged in, redirect
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        this.router.navigate(['/', this.currentLang, 'account', 'profile']);
      }
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.errorMessage = 'Please correct the errors in the form.';
      // Mark all fields as touched to display errors
      this.registerForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;

    const { confirmPassword, ...registrationData } = this.registerForm.value;


    this.authService.register(registrationData).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/', this.currentLang, 'account', 'profile']); // Or a welcome page
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Registration failed. Please try again.';
        console.error('Registration error:', err);
      }
    });
  }
}
