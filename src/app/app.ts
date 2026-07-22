import { Component } from '@angular/core';
import { CameraComponent } from './camera/camera.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CameraComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
