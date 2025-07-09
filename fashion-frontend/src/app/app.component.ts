// src/app/app.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './core/components/header/header.component';
import { FooterComponent } from './core/components/footer/footer.component';
import { SideNavComponent } from './core/components/side-nav/side-nav.component'; // Will use the updated one
import { CartSidebarComponent } from './core/components/cart-sidebar/cart-sidebar.component';
import { CategoryService } from './core/services/category.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    SideNavComponent, // This will be the updated component
    CartSidebarComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private categoryService = inject(CategoryService);

  isSideNavOpen = false;
  isCartSidebarOpen = false;

  ngOnInit(): void {
    this.categoryService.getCategoryTree().subscribe();
  }

  onMenuToggle(): void {
    this.isSideNavOpen = !this.isSideNavOpen;
    // console.log('AppComponent: isSideNavOpen set to', this.isSideNavOpen); 
    if (this.isSideNavOpen) this.isCartSidebarOpen = false;
  }

  onSideNavClose(): void {
    this.isSideNavOpen = false;
  }

  onCartToggle(): void {
    this.isCartSidebarOpen = !this.isCartSidebarOpen;
    if (this.isCartSidebarOpen) this.isSideNavOpen = false;
  }

  onCartSidebarClose(): void {
    this.isCartSidebarOpen = false;
  }
}
