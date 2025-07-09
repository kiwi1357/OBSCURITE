// src/app/features/user/components/address-form/address-form.component.ts
import { Component, OnInit, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { UserAddress } from '../../../../core/models/address.model';

@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './address-form.component.html',
  styleUrls: ['./address-form.component.scss']
})
export class AddressFormComponent implements OnInit, OnChanges {
  @Input() addressData: UserAddress | null = null; // For editing an existing address
  @Input() formTitle: string = 'Add New Address';
  @Input() submitButtonText: string = 'Save Address';
  @Input() isLoading: boolean = false;

  @Output() formSubmit = new EventEmitter<UserAddress>();
  @Output() cancel = new EventEmitter<void>();

  addressForm!: FormGroup;
  private fb = inject(FormBuilder);

  // Example countries - in a real app, this might come from a service or config
  countries: { code: string, name: string }[] = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'DE', name: 'Germany' },
    { code: 'GB', name: 'United Kingdom' },
    // Add more countries as needed
  ];

  constructor() {
    this.initForm();
  }

  ngOnInit(): void {
    // Form initialized in constructor, data patched in ngOnChanges
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['addressData'] && this.addressData) {
      this.patchForm(this.addressData);
    } else if (changes['addressData'] && !this.addressData) {
      this.addressForm.reset(); // Reset form if addressData becomes null (e.g., switching from edit to add)
      this.initFormDefaults(); // Re-apply any defaults
    }
  }

  private initForm(): void {
    this.addressForm = this.fb.group({
      _id: [null], // Hidden field for editing
      addressName: ['', Validators.maxLength(50)],
      fullName: ['', [Validators.required, Validators.maxLength(100)]],
      addressLine1: ['', [Validators.required, Validators.maxLength(100)]],
      addressLine2: ['', Validators.maxLength(100)],
      city: ['', [Validators.required, Validators.maxLength(50)]],
      state: ['', [Validators.required, Validators.maxLength(50)]], // State/Province
      zipCode: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9\\s-]{3,10}$')]], // Basic pattern
      country: ['', Validators.required],
      phoneNumber: ['', [Validators.pattern('^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$')]], // Basic phone pattern
      isDefaultShipping: [false],
      isDefaultBilling: [false]
    });
    this.initFormDefaults();
  }

  private initFormDefaults(): void {
    // Set default country or other fields if needed
    // this.addressForm.patchValue({ country: 'US' }); 
  }

  private patchForm(address: UserAddress): void {
    this.addressForm.patchValue({
      _id: address._id,
      addressName: address.addressName,
      fullName: address.fullName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      phoneNumber: address.phoneNumber,
      isDefaultShipping: address.isDefaultShipping || false,
      isDefaultBilling: address.isDefaultBilling || false
    });
  }

  onSubmit(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched(); // Show validation errors
      return;
    }
    // Ensure boolean values are correctly passed
    const formData = {
      ...this.addressForm.value,
      isDefaultShipping: !!this.addressForm.value.isDefaultShipping,
      isDefaultBilling: !!this.addressForm.value.isDefaultBilling
    };
    this.formSubmit.emit(formData as UserAddress);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  // --- Getters for easy access to form controls in the template ---
  fc(controlName: string): AbstractControl | null {
    return this.addressForm.get(controlName);
  }
}
