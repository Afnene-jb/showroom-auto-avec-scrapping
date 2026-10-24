import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auto } from '../../interfaces/auto';
import { AutoService } from '../../services/auto-service';

@Component({
  selector: 'app-auto-detail',
  imports: [RouterLink],
  templateUrl: './auto-detail.html',
  styleUrl: './auto-detail.css',
})
export class AutoDetail {
  auto?: Auto;

  constructor(route: ActivatedRoute, autoService: AutoService) {
    // l'id vient de l adresse /auto/5
    this.auto = autoService.getAuto(Number(route.snapshot.paramMap.get('id')));
  }
}
