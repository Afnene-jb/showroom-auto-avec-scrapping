import { Component } from '@angular/core';

@Component({
  selector: 'app-head-bar', /* il sert à representer le nom d'une balise qui sera utiliser pour intégrer ce composant dans d'uatre composant*/
  imports: [], /*on met les packages qu'on importe et meme les autres composants*/
  templateUrl: './head-bar.html',
  styleUrl: './head-bar.css',
})
/*le @ est appele le décorateur*/
export class HeadBar {}
/*le fichier typescript on l'appelle la classe de composant*/