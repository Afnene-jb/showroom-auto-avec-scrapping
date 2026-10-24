import { Routes } from '@angular/router';
import { Home } from './componenets/home/home';
import { AutoDetail } from './componenets/auto-detail/auto-detail';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'auto/:id', component: AutoDetail },
];
