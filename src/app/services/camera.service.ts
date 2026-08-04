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

    video.srcObject = stream;

    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise<void>((resolve) => {
        video.addEventListener('loadedmetadata', () => resolve(), {
          once: true,
        });
      });
    }

    await video.play();
  }

  stop(video?: HTMLVideoElement): void {
    if (video?.srcObject instanceof MediaStream) {
      video.srcObject.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
  }

  hasTorch(video?: HTMLVideoElement): boolean {
    if (!video || !video.srcObject) {
      return false;
    }
    const stream = video.srcObject as MediaStream;
    if (typeof stream.getVideoTracks !== 'function') {
      return false;
    }
    const track = stream.getVideoTracks()[0];
    if (!track || typeof track.getCapabilities !== 'function') {
      return false;
    }
    const capabilities = track.getCapabilities() as Record<string, unknown>;
    return Boolean(capabilities && capabilities['torch']);
  }

  async toggleTorch(video: HTMLVideoElement, enable: boolean): Promise<boolean> {
    if (!video || !video.srcObject) {
      return false;
    }
    const stream = video.srcObject as MediaStream;
    if (typeof stream.getVideoTracks !== 'function') {
      return false;
    }
    const track = stream.getVideoTracks()[0];
    if (!track) {
      return false;
    }
    try {
      await track.applyConstraints({
        advanced: [{ torch: enable } as unknown as MediaTrackConstraintSet],
      });
      return true;
    } catch {
      return false;
    }
  }

  pause(video: HTMLVideoElement): void {
    if (video && !video.paused) {
      video.pause();
    }
  }

  async resume(video: HTMLVideoElement): Promise<void> {
    if (video && video.paused) {
      await video.play();
    }
  }
}

