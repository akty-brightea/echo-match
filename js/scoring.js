// scoring.js
export function calculateMFCCSimilarity(mfcc1, mfcc2) {
  const len = Math.min(mfcc1.length, mfcc2.length);
  let total = 0;
  for (let i = 0; i < len; i++) {
    total += euclideanDistance(mfcc1[i], mfcc2[i]);
  }
  const avg = total / len;
  return Math.max(0, 100 - avg * 10); // 小さい差なら高得点
}

export function calculatePitchScore(pitch1, pitch2) {
  if (!pitch1 || !pitch2) return 0;
  const diff = Math.abs(pitch1 - pitch2);
  const normalized = Math.min(diff / 100, 1);
  return Math.max(0, 100 - normalized * 100);
}

export function calculateFinalScore(mfccScore, pitchScore) {
  return Math.round((mfccScore * 0.7 + pitchScore * 0.3));
}

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}