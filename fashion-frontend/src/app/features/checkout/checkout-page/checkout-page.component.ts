// src/app/features/checkout/checkout-page/checkout-page.component.ts
import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subscription, of, switchMap } from 'rxjs';

import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { AddressService } from '../../../core/services/address.service';
import { LanguageService } from '../../../core/services/language.service';
import { Cart } from '../../../core/models/cart.model';
import { UserAddress, UserAddressData } from '../../../core/models/address.model';

import { OrderSummaryComponent } from '../../../shared/components/order-summary/order-summary.component';
import { AddressFormComponent } from '../../user/components/address-form/address-form.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

type CheckoutStep = 'shipping' | 'payment';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    OrderSummaryComponent,
    AddressFormComponent,
    TranslatePipe
  ],
  templateUrl: './checkout-page.component.html',
  styleUrls: ['./checkout-page.component.scss']
})
export class CheckoutPageComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private addressService = inject(AddressService);
  public languageService = inject(LanguageService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  cart$: Observable<Cart>;
  userAddressData$: Observable<UserAddressData | null> = of(null);
  isLoggedIn = false;
  currentStep: CheckoutStep = 'shipping';

  checkoutForm!: FormGroup;
  showNewAddressForm = false;
  selectedShippingAddressId: string | null = null;
  private subs = new Subscription();

  isLoading = true; // For initial data loading
  isSubmitting = false; // For form submission
  errorMessage: string | null = null;

  constructor() {
    this.cart$ = this.cartService.cart$;
  }

  ngOnInit(): void {
    // Redirect if cart is empty
    this.subs.add(
      this.cartService.itemCount$.subscribe(count => {
        if (count === 0) {
          this.router.navigate(['/', this.languageService.activeLang$.value, 'cart']);
        }
      })
    );

    this.initCheckoutForm();

    this.subs.add(
      this.authService.isAuthenticated$.pipe(
        switchMap(isAuth => {
          this.isLoggedIn = isAuth;
          if (isAuth) {
            return this.addressService.getAddresses();
          }
          return of(null); // Guest user
        })
      ).subscribe(addressData => {
        if (this.isLoggedIn && addressData) {
          this.userAddressData$ = of(addressData);
          if (addressData.defaultShippingAddressId) {
            this.preselectAddress(addressData.defaultShippingAddressId);
          } else if (addressData.addresses.length > 0) {
            this.preselectAddress(addressData.addresses[0]._id!);
          } else {
            this.showNewAddressForm = true; // No addresses saved, show form
          }
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    );
  }

  private initCheckoutForm(): void {
    // For guests, we build a form to capture details.
    // For logged-in users, this form will be populated by selected address.
    this.checkoutForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      shippingAddress: this.fb.group({
        fullName: ['', Validators.required],
        addressLine1: ['', Validators.required],
        addressLine2: [''],
        city: ['', Validators.required],
        state: ['', Validators.required],
        zipCode: ['', Validators.required],
        country: ['DE', Validators.required], // Default to Germany
        phoneNumber: ['']
      }),
      billingSameAsShipping: [true],
      billingAddress: this.fb.group({
        fullName: [''],
        addressLine1: [''],
        addressLine2: [''],
        city: [''],
        state: [''],
        zipCode: [''],
        country: ['DE'],
        phoneNumber: ['']
      })
    });

    // Sync billing address if checkbox is ticked
    this.subs.add(
      this.checkoutForm.get('billingSameAsShipping')?.valueChanges.subscribe(isSame => {
        this.toggleBillingAddressValidation(isSame);
      })
    );
  }

  private toggleBillingAddressValidation(isSame: boolean): void {
    const billingAddressGroup = this.checkoutForm.get('billingAddress') as FormGroup;
    if (isSame) {
      Object.keys(billingAddressGroup.controls).forEach(key => {
        billingAddressGroup.get(key)?.clearValidators();
        billingAddressGroup.get(key)?.updateValueAndValidity();
      });
    } else {
      billingAddressGroup.get('fullName')?.setValidators([Validators.required]);
      billingAddressGroup.get('addressLine1')?.setValidators([Validators.required]);
      billingAddressGroup.get('city')?.setValidators([Validators.required]);
      billingAddressGroup.get('state')?.setValidators([Validators.required]);
      billingAddressGroup.get('zipCode')?.setValidators([Validators.required]);
      billingAddressGroup.get('country')?.setValidators([Validators.required]);
      Object.keys(billingAddressGroup.controls).forEach(key => {
        billingAddressGroup.get(key)?.updateValueAndValidity();
      });
    }
  }

  preselectAddress(addressId: string): void {
    this.selectedShippingAddressId = addressId;
    this.userAddressData$.subscribe(data => {
      const address = data?.addresses.find(a => a._id === addressId);
      if (address) {
        this.checkoutForm.get('shippingAddress')?.patchValue(address);
        // Also pre-fill email from auth user if available
        const currentUser = this.authService.getCurrentUserValue();
        if (currentUser) {
          this.checkoutForm.get('email')?.patchValue(currentUser.email);
        }
      }
    });
  }

  handleAddressFormSubmit(address: UserAddress): void {
    // This is for logged-in user adding a new address from checkout
    this.isSubmitting = true;
    this.addressService.addAddress(address).subscribe({
      next: (newAddress) => {
        this.userAddressData$ = this.addressService.getAddresses(); // Refresh addresses
        this.preselectAddress(newAddress._id!);
        this.showNewAddressForm = false;
        this.isSubmitting = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Failed to save new address.';
        this.isSubmitting = false;
      }
    });
  }

  // Called when the main "Continue to Payment" button is clicked
  proceedToPayment(): void {
    this.errorMessage = null;
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.isSubmitting = true;
    // In a real scenario, we would now save this state and move to the payment step.
    console.log('Form Submitted!', this.checkoutForm.value);

    // For now, let's just log and move to the next "step"
    setTimeout(() => {
      this.currentStep = 'payment';
      this.isSubmitting = false;
      window.scrollTo(0, 0); // Scroll to top
    }, 1000); // Simulate network request
  }

  // Helper to get form controls for the template
  fc(group: string, controlName: string) {
    return (this.checkoutForm.get(group) as FormGroup)?.controls[controlName];
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
