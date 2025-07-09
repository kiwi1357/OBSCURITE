// src/paypal.d.ts
export { }; // Make this a module to allow global declaration

declare global {
  interface Window {
    paypal?: any; // Or define more specific types if you want to be thorough
  }
}
