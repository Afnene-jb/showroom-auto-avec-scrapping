import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeadBar } from './componenets/head-bar/head-bar';
@Component({
  selector: 'app-root',
  imports: [HeadBar, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'showroom-auto';
  constructor(){
    this.title = 'My showroom';
  }
}
