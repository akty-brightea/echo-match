// audio.js
export async function decodeAudioBlob(blob, audioContext) {
  const arrayBuffer = await blob.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

export async function fetchAudioBuffer(url, audioContext) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

export async function extractMFCC(buffer, context) {
  return new Promise((resolve) => {
    const source = context.createBufferSource();
    source.buffer = buffer;

    const mfccFrames = [];
    const analyzer = Meyda.createMeydaAnalyzer({
      audioContext: context,
      source: source,
      bufferSize: 512,
      featureExtractors: ['mfcc'],
      callback: (features) => {
        if (features && features.mfcc) {
          mfccFrames.push(features.mfcc);
        }
      }
    });

    analyzer.start();
    source.start();
    source.onended = () => {
      analyzer.stop();
      resolve(mfccFrames);
    };
  });
}

export function extractPitch(buffer, context) {
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  const yin = new YINDetector(sampleRate);
  const pitch = yin.getPitch(data);
  return pitch;
}

// YINアルゴリズムによる基本周波数検出
class YINDetector {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.threshold = 0.1;
    this.minFreq = 80;
    this.maxFreq = 1000;
  }

  getPitch(signal) {
    const yinBuffer = new Float32Array(Math.floor(signal.length / 2));
    let tau, delta;
    for (tau = 1; tau < yinBuffer.length; tau++) {
      yinBuffer[tau] = 0;
      for (let i = 0; i < yinBuffer.length; i++) {
        delta = signal[i] - signal[i + tau];
        yinBuffer[tau] += delta * delta;
      }
    }

    yinBuffer[0] = 1;
    let runningSum = 0;
    for (tau = 1; tau < yinBuffer.length; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    for (tau = 2; tau < yinBuffer.length; tau++) {
      if (yinBuffer[tau] < this.threshold) {
        while (tau + 1 < yinBuffer.length && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        return this.sampleRate / tau;
      }
    }

    return null; // pitch not found
  }
}