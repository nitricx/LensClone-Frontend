import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TensorBufferPoolService {
  private pools = new Map<number, Float32Array[]>();

  /**
   * Acquires a Float32Array of exact `requiredSize`. Reuses cached buffers when available.
   */
  getBuffer(requiredSize: number): Float32Array {
    const pool = this.pools.get(requiredSize);
    if (pool && pool.length > 0) {
      return pool.pop()!;
    }

    // Try finding a larger pooled buffer to return a zero-copy subarray view
    for (const [capacity, buffers] of this.pools.entries()) {
      if (capacity >= requiredSize && buffers.length > 0) {
        const parentBuffer = buffers.pop()!;
        return parentBuffer.subarray(0, requiredSize) as Float32Array;
      }
    }

    return new Float32Array(requiredSize);
  }

  /**
   * Returns a Float32Array buffer back to the pool for reuse.
   */
  releaseBuffer(buffer: Float32Array): void {
    const size = buffer.length;
    let pool = this.pools.get(size);
    if (!pool) {
      pool = [];
      this.pools.set(size, pool);
    }
    if (pool.length < 32) {
      pool.push(buffer);
    }
  }

  /**
   * Clears all pooled buffers.
   */
  clear(): void {
    this.pools.clear();
  }
}
