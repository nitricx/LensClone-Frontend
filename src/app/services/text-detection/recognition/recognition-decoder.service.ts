import { Injectable } from '@angular/core';
import * as yaml from 'js-yaml';
import * as ort from 'onnxruntime-web';

@Injectable({
  providedIn: 'root',
})
export class RecognitionDecoderService {
  /**
   * Index 0 is reserved for the CTC blank token.
   */
  private dictionary: string[] = [''];

  async initialize(): Promise<void> {
    const response = await fetch('/models/inference.yml');

    if (!response.ok) {
      throw new Error('Unable to load recognition dictionary.');
    }

    const text = await response.text();

    const config = yaml.load(text) as any;

    const chars: string[] = config.PostProcess.character_dict;

    this.dictionary = ['', ...chars];
  }

  decode(output: ort.Tensor): string {
    const data = output.data as Float32Array;

    const [, steps, classes] = output.dims as number[];

    const indices: number[] = [];

    for (let t = 0; t < steps; t++) {
      let bestClass = 0;
      let bestScore = -Infinity;

      const offset = t * classes;

      for (let c = 0; c < classes; c++) {
        const score = data[offset + c];

        if (score > bestScore) {
          bestScore = score;
          bestClass = c;
        }
      }

      indices.push(bestClass);
    }

    return this.decodeCTC(indices);
  }

  private decodeCTC(indices: number[]): string {
    let result = '';

    let previous = -1;

    for (const index of indices) {
      if (index === 0) {
        previous = index;
        continue;
      }

      if (index === previous) {
        continue;
      }

      result += this.dictionary[index] ?? '';

      previous = index;
    }

    return result;
  }
}
