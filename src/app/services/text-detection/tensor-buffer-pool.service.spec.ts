import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TensorBufferPoolService } from './tensor-buffer-pool.service';

describe('TensorBufferPoolService', () => {
  let service: TensorBufferPoolService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TensorBufferPoolService],
    });
    service = TestBed.inject(TensorBufferPoolService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should allocate new Float32Array if pool is empty', () => {
    const buf = service.getBuffer(100);
    expect(buf).toBeInstanceOf(Float32Array);
    expect(buf.length).toBe(100);
  });

  it('should reuse pooled Float32Array when released and re-requested', () => {
    const buf1 = service.getBuffer(100);
    buf1[0] = 42;
    service.releaseBuffer(buf1);

    const buf2 = service.getBuffer(100);
    expect(buf2).toBe(buf1);
    expect(buf2[0]).toBe(42);
  });

  it('should carve out a subarray from a larger pooled buffer', () => {
    const largeBuf = new Float32Array(500);
    service.releaseBuffer(largeBuf);

    const smallBuf = service.getBuffer(200);
    expect(smallBuf.length).toBe(200);
    expect(smallBuf.buffer).toBe(largeBuf.buffer);
  });

  it('should clear pools when clear() is called', () => {
    const buf = service.getBuffer(100);
    service.releaseBuffer(buf);
    service.clear();

    const newBuf = service.getBuffer(100);
    expect(newBuf).not.toBe(buf);
  });
});
