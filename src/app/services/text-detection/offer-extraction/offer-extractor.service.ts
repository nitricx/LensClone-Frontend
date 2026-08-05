import { Injectable } from '@angular/core';
import { BoundingBox, Detection, ProductOffer } from '../types';
import { PipelineStage, PipelineState } from '../../pipeline/pipeline-state';
import {
  isDetectionPrice,
  isDetectionQuantity,
  isDetectionProduct,
} from '../detection-helpers';

@Injectable({
  providedIn: 'root',
})
export class OfferExtractorService implements PipelineStage {
  readonly name = 'offerExtractor';

  execute(state: PipelineState): void {
    state.detections.forEach((d) => (d.offerId = undefined));

    const unassignedDetections = [...state.detections];

    if (unassignedDetections.length === 0) {
      state.offers = [];
      return;
    }

    // Step 1: Group detections into 2D spatial containers (cards/clusters)
    const clusters = this.clusterIntoContainers(unassignedDetections);

    // Step 2: For each spatial cluster, perform Price-Anchored & Spatial Upward Binding
    const offers: ProductOffer[] = [];
    for (const cluster of clusters) {
      const clusterOffers = this.extractOffersFromCluster(cluster);
      offers.push(...clusterOffers);
    }

    state.offers = offers;
  }

  private clusterIntoContainers(detections: Detection[]): Detection[][] {
    if (detections.length === 0) return [];

    const avgHeight =
      detections.reduce((sum, d) => sum + d.boundingBox.height, 0) / detections.length;

    // Disjoint set / Connected components clustering
    const parent = detections.map((_, i) => i);
    const find = (i: number): number => {
      if (parent[i] === i) return i;
      return (parent[i] = find(parent[i]));
    };

    const union = (i: number, j: number) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent[rootI] = rootJ;
    };

    const horizThreshold = Math.max(80, avgHeight * 3.5);
    const vertThreshold = Math.max(100, avgHeight * 4.5);

    for (let i = 0; i < detections.length; i++) {
      for (let j = i + 1; j < detections.length; j++) {
        const boxA = detections[i].boundingBox;
        const boxB = detections[j].boundingBox;

        const dx = Math.max(0, Math.max(boxA.x - (boxB.x + boxB.width), boxB.x - (boxA.x + boxA.width)));
        const dy = Math.max(0, Math.max(boxA.y - (boxB.y + boxB.height), boxB.y - (boxA.y + boxA.height)));

        if (dx < horizThreshold && dy < vertThreshold) {
          union(i, j);
        }
      }
    }

    const clustersMap = new Map<number, Detection[]>();
    for (let i = 0; i < detections.length; i++) {
      const root = find(i);
      if (!clustersMap.has(root)) {
        clustersMap.set(root, []);
      }
      clustersMap.get(root)!.push(detections[i]);
    }

    return Array.from(clustersMap.values());
  }

  private extractOffersFromCluster(cluster: Detection[]): ProductOffer[] {
    const offers: ProductOffer[] = [];
    const assigned = new Set<Detection>();

    // 1. Identify prices, products, and quantities in cluster
    const prices = cluster.filter((d) => isDetectionPrice(d));

    // Sort prices vertically top to bottom
    prices.sort((a, b) => a.boundingBox.y - b.boundingBox.y);

    let offerCounter = 1;

    for (const priceDet of prices) {
      if (assigned.has(priceDet)) continue;

      const offerDetections: Detection[] = [priceDet];
      assigned.add(priceDet);

      const priceBox = priceDet.boundingBox;
      const priceCenterX = priceBox.x + priceBox.width / 2;

      // Search for candidate product detections in cluster that are NOT yet assigned
      const candidateProducts = cluster.filter(
        (d) => !assigned.has(d) && !isDetectionPrice(d) && isDetectionProduct(d),
      );

      // Find nearest product candidate directly above (or on the same line as) the price anchor
      let bestProduct: Detection | undefined;
      let minDistance = Number.POSITIVE_INFINITY;

      for (const prodDet of candidateProducts) {
        const prodBox = prodDet.boundingBox;
        const prodCenterX = prodBox.x + prodBox.width / 2;

        const isSameLine = Math.abs(priceBox.y - prodBox.y) <= Math.max(priceBox.height, prodBox.height) * 1.5;
        const horizDist = Math.abs(prodCenterX - priceCenterX);
        const maxHorizMargin = isSameLine
          ? Math.max(priceBox.width * 8.0, prodBox.width * 8.0, prodBox.height * 12.0)
          : Math.max(priceBox.width, prodBox.width, prodBox.height * 4.5);

        if (horizDist > maxHorizMargin) continue;
        const dy = priceBox.y - (prodBox.y + prodBox.height);

        if (isSameLine || (dy >= 0 && dy <= prodBox.height * 5.0)) {
          const score = isSameLine ? horizDist : dy + horizDist * 0.5;
          if (score < minDistance) {
            minDistance = score;
            bestProduct = prodDet;
          }
        }
      }

      if (bestProduct) {
        offerDetections.push(bestProduct);
        assigned.add(bestProduct);
      }

      // Search for candidate quantity detections in cluster
      const candidateQuantities = cluster.filter(
        (d) => !assigned.has(d) && !isDetectionPrice(d) && (d === bestProduct ? false : isDetectionQuantity(d)),
      );

      let bestQuantity: Detection | undefined;
      let minQtyDist = Number.POSITIVE_INFINITY;

      for (const qtyDet of candidateQuantities) {
        const qtyBox = qtyDet.boundingBox;
        const qtyCenterX = qtyBox.x + qtyBox.width / 2;

        const isSameLine = Math.abs(priceBox.y - qtyBox.y) <= Math.max(priceBox.height, qtyBox.height) * 1.5;
        const horizDist = Math.abs(qtyCenterX - priceCenterX);
        const maxHorizMargin = isSameLine
          ? Math.max(priceBox.width * 8.0, qtyBox.width * 8.0, qtyBox.height * 12.0)
          : Math.max(priceBox.width, qtyBox.width, qtyBox.height * 4.0);

        if (horizDist > maxHorizMargin) continue;

        const dy = Math.abs(priceBox.y - qtyBox.y);
        if (dy <= qtyBox.height * 3.5) {
          if (dy < minQtyDist) {
            minQtyDist = dy;
            bestQuantity = qtyDet;
          }
        }
      }

      if (bestQuantity) {
        offerDetections.push(bestQuantity);
        assigned.add(bestQuantity);
      }

      // Compute bounding box covering all detections in offer
      const minX = Math.min(...offerDetections.map((d) => d.boundingBox.x));
      const minY = Math.min(...offerDetections.map((d) => d.boundingBox.y));
      const maxX = Math.max(...offerDetections.map((d) => d.boundingBox.x + d.boundingBox.width));
      const maxY = Math.max(...offerDetections.map((d) => d.boundingBox.y + d.boundingBox.height));

      const offerId = `offer_${Date.now()}_${offerCounter++}`;
      for (const d of offerDetections) {
        d.offerId = offerId;
      }

      const productText = bestProduct?.canonicalText || bestProduct?.rawText;
      const priceText = priceDet.price || priceDet.rawText;
      const quantityVal = bestQuantity?.quantity || bestProduct?.quantity || priceDet.quantity;

      const avgConfidence =
        offerDetections.reduce((sum, d) => sum + (d.boundingBoxScore || 0.8), 0) / offerDetections.length;

      offers.push({
        id: offerId,
        product: productText,
        quantity: quantityVal,
        price: priceText,
        confidence: Number(avgConfidence.toFixed(2)),
        boundingBox: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        },
        detections: offerDetections,
      });
    }

    return offers;
  }
}
