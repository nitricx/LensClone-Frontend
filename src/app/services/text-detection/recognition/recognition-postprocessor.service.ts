import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';

@Injectable({
  providedIn: 'root',
})
export class RecognitionPostprocessorService {
  decode(output: ort.Tensor, dictionary: string[], blankIndex = 0): string {
    const data = output.data as Float32Array;
    const [, sequenceLength, classCount] = output.dims;

    const indices: number[] = [];

    for (let t = 0; t < sequenceLength; t++) {
      let bestClass = 0;
      let bestScore = -Infinity;

      const offset = t * classCount;

      for (let c = 0; c < classCount; c++) {
        const score = data[offset + c];

        if (score > bestScore) {
          bestScore = score;
          bestClass = c;
        }
      }

      indices.push(bestClass);
    }

    let previous = -1;
    let text = '';

    for (const index of indices) {
      if (index === blankIndex) {
        previous = index;
        continue;
      }

      if (index === previous) {
        continue;
      }

      const character = dictionary[index - 1];

      if (character) {
        text += character;
      }

      previous = index;
    }

    return text;
  }
}
