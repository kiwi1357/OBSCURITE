// src/app/features/user/pages/address-book/address-book.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // For "Add New Address" button if it's a link
import { Observable, BehaviorSubject, switchMap, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { AddressService } from '../../../../core/services/address.service';
import { UserAddress, UserAddressData } from '../../../../core/models/address.model';
import { AddressFormComponent } from '../../components/address-form/address-form.component'; // Reusable form
import { LanguageService } from '../../../../core/services/language.service';
import { BreadcrumbComponent, Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { Translation } from '../../../../core/models/translation.model';


@Component({
  selector: 'app-address-book',
  standalone: true,
  imports: [CommonModule, AddressFormComponent, BreadcrumbComponent],
  templateUrl: './address-book.component.html',
  styleUrls: ['./address-book.component.scss']
})
export class AddressBookComponent implements OnInit {
  private addressService = inject(AddressService);
  public languageService = inject(LanguageService); // Public if used in template for lang segment

  userAddressData$: Observable<UserAddressData | null> | undefined;

  // For managing add/edit form visibility and data
  showAddressForm = false;
  editingAddress: UserAddress | null = null;
  formError: string | null = null;
  isLoading = false; // For main list loading
  isSubmittingForm = false; // For form submission loading state

  breadcrumbs: Breadcrumb[] = [];
  currentLang: string = 'en';


  // Using a BehaviorSubject to easily refresh the list after add/edit/delete
  private refreshAddresses$ = new BehaviorSubject<void>(undefined);

  constructor() { }

  ngOnInit(): void {
    this.currentLang = this.languageService.activeLang$.value;
    this.languageService.activeLang$.subscribe(lang => {
      this.currentLang = lang;
      this.buildBreadcrumbs();
    });
    this.buildBreadcrumbs();


    this.userAddressData$ = this.refreshAddresses$.pipe(
      tap(() => this.isLoading = true),
      switchMap(() => this.addressService.getAddresses()),
      tap(() => this.isLoading = false),
      catchError(err => {
        this.formError = 'Could not load addresses. ' + err.message;
        this.isLoading = false;
        return of(null); // Return null or an empty UserAddressData structure on error
      })
    );
  }

  buildBreadcrumbs(): void {
    const accountCrumbName: Translation[] = [{ lang: this.currentLang, value: 'My Account' }];
    const addressBookCrumbName: Translation[] = [{ lang: this.currentLang, value: 'Address Book' }];
    this.breadcrumbs = [
      { name: accountCrumbName, link: ['/', this.currentLang, 'account', 'profile'] },
      { name: addressBookCrumbName, link: [] } // Current page
    ];
  }


  loadAddresses(): void {
    this.refreshAddresses$.next();
  }

  openAddAddressForm(): void {
    this.editingAddress = null;
    this.showAddressForm = true;
    this.formError = null;
  }

  openEditAddressForm(address: UserAddress): void {
    this.editingAddress = { ...address }; // Create a copy to avoid modifying the list directly
    this.showAddressForm = true;
    this.formError = null;
  }

  closeAddressForm(): void {
    this.showAddressForm = false;
    this.editingAddress = null;
    this.formError = null;
  }

  handleAddressFormSubmit(address: UserAddress): void {
    this.isSubmittingForm = true;
    this.formError = null;
    let operation: Observable<UserAddress>;

    if (this.editingAddress && this.editingAddress._id) {
      // Update existing address
      operation = this.addressService.updateAddress(this.editingAddress._id, address);
    } else {
      // Add new address (remove _id if it was accidentally included in form value for new)
      const { _id, ...newAddressData } = address;
      operation = this.addressService.addAddress(newAddressData as Omit<UserAddress, '_id'>);
    }

    operation.subscribe({
      next: () => {
        this.isSubmittingForm = false;
        this.closeAddressForm();
        this.loadAddresses(); // Refresh the address list
      },
      error: (err) => {
        this.isSubmittingForm = false;
        this.formError = err.message || 'Failed to save address.';
        // Keep form open to show error
      }
    });
  }

  deleteAddress(addressId: string | undefined): void {
    if (!addressId) return;
    if (confirm('Are you sure you want to delete this address?')) {
      this.isLoading = true; // Can use a specific loading for delete
      this.addressService.deleteAddress(addressId).subscribe({
        next: () => {
          this.loadAddresses(); // Refresh list
        },
        error: (err) => {
          this.formError = err.message || 'Failed to delete address.'; // Show error, perhaps as a toast
          this.isLoading = false;
        }
      });
    }
  }

  setDefault(addressId: string | undefined, type: 'shipping' | 'billing'): void {
    if (!addressId) return;
    this.isLoading = true;
    this.addressService.setDefaultAddress(addressId, type).subscribe({
      next: () => {
        this.loadAddresses(); // Refresh to show updated default status
      },
      error: (err) => {
        this.formError = err.message || `Failed to set default ${type} address.`;
        this.isLoading = false;
      }
    });
  }
}
