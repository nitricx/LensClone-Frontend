import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CameraService {
  async start(video: HTMLVideoElement): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
      },
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();

    console.log(settings.width, settings.height);
    video.srcObject = stream;

    await video.play();
  }
}
