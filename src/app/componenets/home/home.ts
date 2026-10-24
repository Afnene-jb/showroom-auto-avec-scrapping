import { Component, inject } from '@angular/core';
import { SearchBar } from '../search-bar/search-bar';
import { NewCars } from '../new-cars/new-cars';
import { AutoService } from '../../services/auto-service';

@Component({
  selector: 'app-home',
  imports: [SearchBar, NewCars],
  templateUrl: './home.html',
})
export class Home {
  autoList = inject(AutoService).autoList;
  searchText = '';
}
