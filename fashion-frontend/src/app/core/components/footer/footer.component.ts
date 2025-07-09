import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; // << IMPORT RouterLink

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [RouterLink], // << ADD RouterLink
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.scss'
})
export class FooterComponent {
    currentYear = new Date().getFullYear();
}
