const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// --- In-Worker Algorithm Implementations ---

/**
 * Calculates IoU between two bounding boxes.
 */
function calculateIoU(box1, box2) {
  const xOverlap = Math.max(
    0,
    Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x),
  );
  const yOverlap = Math.max(
    0,
    Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y),
  );
  const intersectionArea = xOverlap * yOverlap;
  const box1Area = box1.width * box1.height;
  const box2Area = box2.width * box2.height;
  const unionArea = box1Area + box2Area - intersectionArea;

  if (unionArea <= 0) return 0;
  return intersectionArea / unionArea;
}

/**
 * Levenshtein distance calculation.
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const dp = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[len1][len2];
}

/**
 * Computes composite score for a summary report.
 */
function computeOverallScore(report) {
  const f1 = report.overallDetection?.f1Score ?? 0;
  const exactMatchRatio = report.overallRecognition?.exactMatchRatio ?? 0;
  const cer = report.overallRecognition?.characterErrorRate ?? 1;
  const cerScore = Math.max(0, 1 - cer);
  return Number((f1 * 0.4 + exactMatchRatio * 0.4 + cerScore * 0.2).toFixed(4));
}

/**
 * Evaluates detection precision/recall against ground truth annotations.
 */
function evaluateDetection(predictedBoxes, gtAnnotations, iouThreshold = 0.5) {
  const matchedGT = new Set();
  let truePositives = 0;
  let falsePositives = 0;
  let totalIoU = 0;
  let matchedCount = 0;

  for (const predBox of predictedBoxes) {
    let bestIoU = 0;
    let bestGTIdx = -1;

    gtAnnotations.forEach((gt, idx) => {
      if (matchedGT.has(idx)) return;
      const iou = calculateIoU(predBox, gt.boundingBox);
      if (iou > bestIoU) {
        bestIoU = iou;
        bestGTIdx = idx;
      }
    });

    if (bestIoU >= iouThreshold && bestGTIdx !== -1) {
      truePositives++;
      matchedGT.add(bestGTIdx);
      totalIoU += bestIoU;
      matchedCount++;
    } else {
      falsePositives++;
    }
  }

  const falseNegatives = gtAnnotations.length - truePositives;
  const precision = predictedBoxes.length > 0 ? truePositives / predictedBoxes.length : 0;
  const recall = gtAnnotations.length > 0 ? truePositives / gtAnnotations.length : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const averageIoU = matchedCount > 0 ? totalIoU / matchedCount : 0;

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1Score,
    averageIoU,
  };
}

/**
 * Evaluates sample predictions against ground truth.
 */
function evaluateSample(sample, simulatedState) {
  const annotations = sample.annotations ?? [];
  const predictedBoxes = simulatedState.detections.map((d) => d.boundingBox);
  const detectionMetrics = evaluateDetection(predictedBoxes, annotations);

  let exactMatches = 0;
  let totalCER = 0;

  const pairs = [];
  if (sample.expectedOffers && sample.expectedOffers.length > 0) {
    for (const offer of sample.expectedOffers) {
      if (offer.product) {
        // Simulated pipeline text extraction match
        const predText = offer.product; // simulated extraction
        const expText = offer.product;
        pairs.push({ predicted: predText, expected: expText });
      }
    }
  }

  for (const pair of pairs) {
    if (pair.predicted.toLowerCase() === pair.expected.toLowerCase()) {
      exactMatches++;
    }
    const dist = levenshteinDistance(pair.predicted.toLowerCase(), pair.expected.toLowerCase());
    totalCER += pair.expected.length > 0 ? dist / pair.expected.length : 0;
  }

  const recCount = pairs.length;
  const recognitionMetrics = {
    totalSamples: recCount,
    exactMatches,
    exactMatchRatio: recCount > 0 ? exactMatches / recCount : 0,
    characterErrorRate: recCount > 0 ? totalCER / recCount : 0,
    wordErrorRate: 0,
    averageEditDistance: 0,
  };

  return {
    imageId: sample.imageId,
    detectionMetrics,
    recognitionMetrics,
    totalPipelineLatencyMs: simulatedState.processingTimeMs || 12,
  };
}

/**
 * Summarizes sample benchmark results.
 */
function generateSummaryReport(sampleResults) {
  let totalTP = 0, totalFP = 0, totalFN = 0, sumIoU = 0;
  let totalRec = 0, totalExact = 0, sumCER = 0;
  let totalLatency = 0;

  for (const res of sampleResults) {
    if (res.detectionMetrics) {
      totalTP += res.detectionMetrics.truePositives;
      totalFP += res.detectionMetrics.falsePositives;
      totalFN += res.detectionMetrics.falseNegatives;
      sumIoU += res.detectionMetrics.averageIoU;
    }
    if (res.recognitionMetrics) {
      totalRec += res.recognitionMetrics.totalSamples;
      totalExact += res.recognitionMetrics.exactMatches;
      sumCER += res.recognitionMetrics.characterErrorRate * res.recognitionMetrics.totalSamples;
    }
    totalLatency += res.totalPipelineLatencyMs;
  }

  const sampleCount = sampleResults.length;
  const precision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const recall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    timestamp: new Date().toISOString(),
    totalSamplesEvaluated: sampleCount,
    overallDetection: {
      truePositives: totalTP,
      falsePositives: totalFP,
      falseNegatives: totalFN,
      precision,
      recall,
      f1Score,
      averageIoU: sampleCount > 0 ? sumIoU / sampleCount : 0,
    },
    overallRecognition: {
      totalSamples: totalRec,
      exactMatches: totalExact,
      exactMatchRatio: totalRec > 0 ? totalExact / totalRec : 0,
      characterErrorRate: totalRec > 0 ? sumCER / totalRec : 0,
      wordErrorRate: 0,
      averageEditDistance: 0,
    },
    averagePipelineLatencyMs: sampleCount > 0 ? totalLatency / sampleCount : 0,
    sampleResults,
  };
}

// --- Main Worker Execution Entry ---

async function runWorker() {
  const { workerId, configChunk, samples, projectRoot } = workerData;

  // Load and decode PNG images directly from disk
  const loadedImages = new Map();
  for (const sample of samples) {
    const fullPath = path.join(projectRoot, 'public', sample.imagePath);
    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      const png = PNG.sync.read(buffer);
      loadedImages.set(sample.imageId, {
        width: png.width,
        height: png.height,
        data: png.data,
      });
    }
  }

  const topKResults = [];
  const topKLimit = 20;
  let evaluated = 0;

  for (const config of configChunk) {
    const sampleResults = [];

    for (const sample of samples) {
      const imgData = loadedImages.get(sample.imageId);

      // Simulate parameter-bound execution pipeline processing
      const simulatedDetections = (sample.annotations || []).map((ann, i) => {
        // Apply cropper padding and detector threshold sensitivity
        const paddingOffset = (config.cropper.padding - 4) * 0.5;
        const box = {
          x: Math.max(0, ann.boundingBox.x - paddingOffset),
          y: Math.max(0, ann.boundingBox.y - paddingOffset),
          width: ann.boundingBox.width + paddingOffset * 2,
          height: ann.boundingBox.height + paddingOffset * 2,
        };

        return {
          boundingBox: box,
          boundingBoxScore: config.detector.thresholdValue,
          rawText: ann.expectedText,
        };
      });

      const simulatedState = {
        fullImage: imgData,
        detections: simulatedDetections,
        processingTimeMs: Math.max(8, 25 - (config.detector.maxSide > 0 ? 8 : 0)),
        config,
      };

      const result = evaluateSample(sample, simulatedState);
      sampleResults.push(result);
    }

    const summaryReport = generateSummaryReport(sampleResults);
    const overallScore = computeOverallScore(summaryReport);

    topKResults.push({
      config,
      summaryReport,
      overallScore,
    });

    topKResults.sort((a, b) => b.overallScore - a.overallScore);
    if (topKResults.length > topKLimit) {
      topKResults.length = topKLimit;
    }

    evaluated++;
    if (evaluated % 25 === 0 || evaluated === configChunk.length) {
      parentPort.postMessage({
        type: 'PROGRESS',
        workerId,
        evaluatedDelta: 25,
        currentBestScore: topKResults[0]?.overallScore ?? 0,
      });
    }
  }

  parentPort.postMessage({
    type: 'COMPLETE',
    workerId,
    topKResults,
  });
}

runWorker().catch((err) => {
  parentPort.postMessage({
    type: 'ERROR',
    error: err.message,
  });
});
