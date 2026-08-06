import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { SettingsService } from '../settings/settings.service';
import { GpsCoordinates, ProductOffer } from '../text-detection/types';

export enum PriceRating {
  NewSubmission = 0,
  BelowAverage = 1,
  Average = 2,
  AboveAverage = 3,
}

export interface PriceComparisonResponse {
  productName: string;
  currentPrice: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  sampleCount: number;
  rating: PriceRating;
  radiusKm: number;
  timeWindowDays: number;
  tolerancePercent: number;
}

export interface PriceSubmissionResponse {
  success: boolean;
  message: string;
  submissionId: string;
}

@Injectable({
  providedIn: 'root',
})
export class PriceApiService {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(SettingsService);

  comparePrice(productName: string, price: number, coords?: GpsCoordinates): Observable<PriceComparisonResponse | null> {
    if (!productName || !price || !coords) {
      return of(null);
    }

    const url = `${this.settings.backendApiUrl()}/compare`;
    const payload = {
      productName,
      price,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timeWindowDays: this.settings.timeWindowDays(),
      radiusKm: this.settings.radiusKm(),
      tolerancePercent: this.settings.tolerancePercent(),
    };

    return this.http.post<PriceComparisonResponse>(url, payload).pipe(
      catchError(() => of(null))
    );
  }

  submitPrice(offer: ProductOffer, coords?: GpsCoordinates): Observable<PriceSubmissionResponse | null> {
    if (!offer.product || !offer.price || !coords) {
      return of(null);
    }

    const parsedPrice = Number.parseFloat(offer.price.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return of(null);
    }

    const url = `${this.settings.backendApiUrl()}/submit`;
    const payload = {
      productName: offer.product,
      quantityOrUnit: offer.quantity ? `${offer.quantity.quantity} ${offer.quantity.unit}` : undefined,
      price: parsedPrice,
      currency: 'USD',
      latitude: coords.latitude,
      longitude: coords.longitude,
      deviceId: this.getOrCreateDeviceId(),
    };

    return this.http.post<PriceSubmissionResponse>(url, payload).pipe(
      catchError(() => of(null))
    );
  }

  private getOrCreateDeviceId(): string {
    let id = localStorage.getItem('lensclone_device_id');
    if (!id) {
      id = `dev_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      localStorage.setItem('lensclone_device_id', id);
    }
    return id;
  }
}
