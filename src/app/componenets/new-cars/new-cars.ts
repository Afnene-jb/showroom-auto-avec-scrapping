import { Component, Input, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, debounceTime, distinctUntilChanged, of, startWith, switchMap } from 'rxjs';

interface ScrapedCar {
  type: string; // Neuf ou Occasion
  name: string;
  price: string;
  info: string;
  image: string;
  link: string;
}

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

  // à chaque recherche : null pendant le chargement, puis la liste (vide en cas d'erreur)
  cars$ = this.query$.pipe(
    debounceTime(400),
    distinctUntilChanged(),
    switchMap((q) =>
      this.http.get<ScrapedCar[]>('http://localhost:3000', { params: { q } }).pipe(
        catchError(() => of([] as ScrapedCar[])),
        startWith(null),
      ),
    ),
  );
}
