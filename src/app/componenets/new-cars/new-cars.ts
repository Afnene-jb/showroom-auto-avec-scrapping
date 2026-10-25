import { Component, Input, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, combineLatest, debounceTime, distinctUntilChanged, map, of } from 'rxjs';

interface CarItem {
  type: string; // Neuf ou Occasion
  name: string;
  price: string;
  info: string;
  image: string;
  link: string;
}

// "Mercedes-Benz" -> "mercedesbenz" : la recherche ignore majuscules, accents et tirets
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

@Component({
  selector: 'app-new-cars',
  imports: [AsyncPipe],
  templateUrl: './new-cars.html',
  styleUrl: './new-cars.css',
})
export class NewCars {
  private http = inject(HttpClient);
  query$ = new BehaviorSubject('');

  // le texte tapé dans la barre de recherche arrive ici
  @Input() set query(value: string) {
    this.query$.next(value.trim());
  }

  // fichier créé par « npm run snapshot » (dossier scraper), lu une seule fois
  private all$ = this.http.get<CarItem[]>('data/automobile-tn.json').pipe(catchError(() => of([] as CarItem[])));

  // null pendant le chargement, puis les voitures dont le nom contient tous les mots tapés
  cars$ = combineLatest([this.query$.pipe(debounceTime(300), distinctUntilChanged()), this.all$]).pipe(
    map(([q, all]) => {
      const words = q.split(/\s+/).map(norm).filter(Boolean);
      return all.filter((c) => words.every((w) => norm(c.name).includes(w)));
    }),
  );
}
