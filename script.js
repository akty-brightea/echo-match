const startBtn = document.getElementById('startBtn');
const pitchDisplay = document.getElementById('pitchValue');
const mfccDisplay = document.getElementById('mfccValue');
const canvas = document.getElementById('waveform');
const ctx = canvas.getContext('2d');
const audioPlayback = document.getElementById('audioPlayback');

let audioContext, micStream, meydaAnalyzer;
let analyser, dataArray, mediaRecorder, recordedChunks = [];
let bufferSize = 2048;

function drawWaveform() {
  if (!analyser) return;
  requestAnimationFrame(drawWaveform);
  analyser.getByteTimeDomainData(dataArray);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  const sliceWidth = canvas.width / dataArray.length;
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * canvas.height) / 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    x += sliceWidth;
  }

  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.strokeStyle = '#0077cc';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// 自作YINアルゴリズム（簡略）
function detectPitch_YIN(buffer, sampleRate) {
  const threshold = 0.1;
  const tauMax = buffer.length / 2;
  let minDiff = Infinity;
  let bestTau = -1;

  for (let tau = 2; tau < tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < tauMax; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }

    if (sum < minDiff) {
      minDiff = sum;
      bestTau = tau;
    }
  }

  if (bestTau === -1) return null;
  const pitch = sampleRate / bestTau;
  return pitch;
}

async function startAudio() {
  // AudioContextを初期化・resume（iOS対策）
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  await audioContext.resume();

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  micStream = audioContext.createMediaStreamSource(stream);

  // 波形描画
  analyser = audioContext.createAnalyser();
  analyser.fftSize = bufferSize;
  dataArray = new Uint8Array(analyser.fftSize);
  micStream.connect(analyser);
  drawWaveform();

  // MFCC
  meydaAnalyzer = Meyda.createMeydaAnalyzer({
    audioContext,
    source: micStream,
    bufferSize,
    featureExtractors: ['mfcc'],
    callback: (features) => {
      const mfcc = features.mfcc.map(n => n.toFixed(1)).join(', ');
      mfccDisplay.textContent = `MFCC: ${mfcc}`;
    }
  });
  meydaAnalyzer.start();

  // ピッチ解析（ScriptProcessor）
  const scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
  micStream.connect(scriptNode);
  scriptNode.connect(audioContext.destination);

  scriptNode.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const pitch = detectPitch_YIN(input, audioContext.sampleRate);
    if (pitch && pitch > 50 && pitch < 1000) {
      pitchDisplay.textContent = `PITCH: ${pitch.toFixed(2)} Hz`;
    } else {
      pitchDisplay.textContent = `PITCH: --`;
    }
  };

  // 録音設定（MediaRecorder with MIME fallback）
  recordedChunks = [];
  let mimeType = '';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    mimeType = 'audio/webm;codecs=opus';
  } else if (MediaRecorder.isTypeSupported('audio/webm')) {
    mimeType = 'audio/webm';
  } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
    mimeType = 'audio/mp4';
  }

  try {
    mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    console.log("MediaRecorder initialized with type:", mimeType || 'default');
  } catch (e) {
    alert('MediaRecorder初期化失敗。対応形式が見つかりません。\n\n' + e.message);
    console.error(e);
    return;
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
    const url = URL.createObjectURL(blob);
    audioPlayback.src = url;
    audioPlayback.controls = true;
  };

  // 録音開始・停止トグル機能
  if (startBtn.dataset.state !== 'recording') {
    mediaRecorder.start();
    startBtn.textContent = '録音停止';
    startBtn.dataset.state = 'recording';
  } else {
    mediaRecorder.stop();
    startBtn.textContent = '録音開始';
    startBtn.dataset.state = '';
  }
}

// 録音ボタンに機能を割り当て
startBtn.addEventListener('click', async () => {
  try {
    await startAudio();
  } catch (err) {
    alert("録音開始に失敗しました: " + err.message);
    console.error(err);
  }
});