import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { Router } from '@angular/router';
import { Auto } from '../../interfaces/auto';
@Component({
  selector: 'app-search-bar',
  imports: [FaIconComponent],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
})
export class SearchBar implements OnInit {
  faMagnifyingGlass = faMagnifyingGlass;
  @Input() autos:Auto[]=[]
  @Output() onSearch=new EventEmitter<string>()
  selectedAutos: Auto[]=[]
  constructor(private router: Router){}
  ngOnInit(){
    this.selectedAutos=this.autos /*affiche toutes les voitures au démarrage*/
  }
  selectAutos(selectedBrand: string){
    this.onSearch.emit(selectedBrand) /*envoie aussi la recherche aux voitures scrapées*/
    if (selectedBrand ){
      this.selectedAutos=this.autos.filter(x=>x.brand.toLowerCase().startsWith(selectedBrand.toLowerCase()))/*filter est une fonction fléchée*/
    }
    else
      this.selectedAutos=this.autos
    
  }
  selectCar(auto: Auto){
    this.router.navigate(['/auto', auto.id]) /*ouvre la page de détail*/
  }
}
