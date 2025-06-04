// play.js

// sessionStorageからデータを取得
const playerNames = JSON.parse(sessionStorage.getItem("playerNames") || "[]");
const currentIndex = parseInt(sessionStorage.getItem("currentPlayerIndex") || "0", 10);
const currentTurn = parseInt(sessionStorage.getItem("currentTurn") || "1", 10);
const turnCount = parseInt(sessionStorage.getItem("turnCount") || "1", 10);

// エラーチェック
if (!playerNames || !turnCount) {
  alert("プレイヤー情報またはターン数が見つかりません。");
  window.location.href = "/setup.html";
}


// ターン情報表示
document.querySelector(".turn-info").textContent = `${currentTurn} / ${turnCount} ターン`;

// プレイヤー順をランダムにシャッフル
function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

let shuffledPlayers = JSON.parse(sessionStorage.getItem("shuffledPlayers"));

if (!shuffledPlayers) {
  shuffledPlayers = shuffleArray(playerNames);
  sessionStorage.setItem("shuffledPlayers", JSON.stringify(shuffledPlayers));
}

// プレイヤー名表示領域
const playerList = document.getElementById("player-list");
playerList.innerHTML = "";

// CSSクラスで2行4列になるように表示
shuffledPlayers.forEach((name, index) => {
  const div = document.createElement("div");
  div.className = "player-name";
  div.textContent = name;
  if (index === currentIndex) div.classList.add("current"); // 最初のプレイヤーにハイライト
  playerList.appendChild(div);
});

// お題再生ボタン関連 -----------
let audioList = [];
let unusedAudioList = [];
let currentAudio = null;
let currentQuestionAudio = null;
let remainingRepeats = 0;
let playbackAudio = null;

const playbackButton = document.getElementById("playback-button"); // HTMLに追加予定
playbackButton.style.display = "none"; // 初期非表示

const scoreButton = document.getElementById("score-button");
scoreButton.style.display = "none";

const playButton = document.getElementById("play-sound");
const remainingText = document.getElementById("remaining-count");

// JSONから音源リストを取得
fetch("audio/audioList.json")
  .then(res => res.json())
  .then(data => {
    audioList = data;
    unusedAudioList = [...audioList];
    updateRemainingCount();
  })
  .catch(err => {
    console.error("音源リストの読み込みに失敗:", err);
  });

function updateRemainingCount() {
  if (currentQuestionAudio) {
    remainingText.textContent = `あと ${remainingRepeats} 回再生可能`;
  } else {
    remainingText.textContent = `あと 3 回再生可能`;
  }
}

// お題再生処理
playButton.addEventListener("click", () => {
  playButton.disabled = true;

  // まだ繰り返し再生が残っているなら、同じ音源を使う
  if (remainingRepeats > 0 && currentQuestionAudio) {
    playAudio(currentQuestionAudio);
    remainingRepeats--;

    updateRemainingCount();
    return;
  }

  // すべての音源を使い切った場合
  if (unusedAudioList.length === 0) {
    alert("すべてのお題を出題し終わりました！");
    playButton.disabled = false;
    return;
  }

  // 新しいお題をランダムに選ぶ
  const randomIndex = Math.floor(Math.random() * unusedAudioList.length);
  currentQuestionAudio = unusedAudioList.splice(randomIndex, 1)[0]; // 同時に削除
  remainingRepeats = 2; // 計3回再生（初回＋2回）

  updateRemainingCount();
  playAudio(currentQuestionAudio);
});

// 音声再生関数
function playAudio(src) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  currentAudio = new Audio(src);
  currentPromptAudio = currentAudio;

  currentAudio.play()
    .then(() => {
      console.log("再生中:", src);
      startProgress(currentAudio.duration * 1000);
    })
    .catch(err => {
      console.error("音声の再生に失敗:", err);
      playButton.disabled = false; // エラー時も解除
    });

  currentAudio.addEventListener("ended", () => {
    // 3回音源を聞いた場合
    if (remainingRepeats == 0) {
      playButton.disabled = true;
    } else {
      playButton.disabled = false;
    }
  });
}

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let currentPromptAudio = null; // お題音声のAudioインスタンス

const recordButton = document.getElementById("record-button");
const countdown = document.getElementById("countdown");

let micStream = null;

recordButton.addEventListener("click", async () => {
  if (isRecording) return;

  recordButton.disabled = true;

  // 録音の事前準備（getUserMedia を先に取得）
  try {
    if (!micStream) {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  } catch (err) {
    console.error("マイクの取得に失敗しました：", err);
    alert("マイクの使用を許可してください。");
    recordButton.disabled = false;
    countdown.textContent = "";
    return;
  }

  countdown.textContent = "3";

  // カウントダウン
  for (let i = 2; i >= 0; i--) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    countdown.textContent = i > 0 ? String(i) : "";
  }

  countdown.textContent = "";
  startRecording(micStream);
});

function startRecording(stream) {
  mediaRecorder = new MediaRecorder(stream);
  recordedChunks = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: "audio/ogg;codecs=opus" });

    // 古い ObjectURL を解放
    if (playbackAudio?.src) {
      URL.revokeObjectURL(playbackAudio.src);
    }

    const audioURL = URL.createObjectURL(blob);

    // ストリームのトラックを停止して、マイクを開放
    stream.getTracks().forEach(track => track.stop());
    micStream = null; // 再取得できるようリセット

    playbackAudio = new Audio(audioURL);

    setTimeout(() => {
      playbackButton.style.display = "inline-block";
      scoreButton.style.display = "inline-block";
      recordButton.textContent = "🔁 再録音";
      recordButton.disabled = false;
      isRecording = false;
    }, 1000);
  };

  mediaRecorder.start();
  isRecording = true;
  recordButton.textContent = "🔴 録音中...";

  const duration = !isNaN(currentPromptAudio?.duration) && currentPromptAudio.duration > 0
    ? currentPromptAudio.duration
    : 3.0;

  startProgress(duration * 1000);

  setTimeout(() => {
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  }, duration * 1000);
}

playbackButton.addEventListener("click", () => {
  if (playbackAudio) {
    playbackAudio.play();
    startProgress(playbackAudio.duration * 1000);
  }
});


// 採点用 -------------------
let audioContext;
let meydaAnalyzer;

async function analyzeAudioBlob(blob) {
  return new Promise(async (resolve) => {
    audioContext = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = audioContext.createAnalyser();
    const mfccs = [];
    const pitches = [];

    const bufferSize = 512;
    meydaAnalyzer = Meyda.createMeydaAnalyzer({
      audioContext: audioContext,
      source: source,
      bufferSize: bufferSize,
      featureExtractors: ['mfcc', 'pitch'],
      callback: features => {
        if (features.mfcc) mfccs.push(features.mfcc);
        if (features.pitch) pitches.push(features.pitch);
      }
    });

    meydaAnalyzer.start();
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    source.start();

    // 再生終了を待つ
    source.onended = () => {
      meydaAnalyzer.stop();
      resolve({ mfccs, pitches });
    };
  });
}


// 採点ボタン処理
scoreButton.addEventListener("click", async () => {
  if (!currentPromptAudio || !playbackAudio) {
    alert("再生音声または録音音声が見つかりません。");
    return;
  }

  scoreButton.disabled = true;
  scoreButton.textContent = "採点中...";

  try {
    const promptBuffer = await audioToBuffer(currentPromptAudio);
    const recordedBuffer = await audioToBuffer(playbackAudio);

    const promptFeatures = await analyzeAudio(promptBuffer);
    const recordedFeatures = await analyzeAudio(recordedBuffer);

    sessionStorage.setItem("promptFeatures", JSON.stringify(promptFeatures));
    sessionStorage.setItem("recordedFeatures", JSON.stringify(recordedFeatures));

    window.location.href = "score.html";

  } catch (err) {
    console.error("分析中にエラー:", err);
    alert("採点中に問題が発生しました。");
    scoreButton.disabled = false;
    scoreButton.textContent = "📊 採点";
  }
});

async function audioToBuffer(audio) {
  const response = await fetch(audio.src);
  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return await audioContext.decodeAudioData(arrayBuffer);
}

async function analyzeAudio(audioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const signal = audioBuffer.getChannelData(0);
  const frameSize = 512;
  const hopSize = 256;
  const mfccs = [];
  const pitches = [];

  for (let i = 0; i + frameSize < signal.length; i += hopSize) {
    const frame = signal.slice(i, i + frameSize);
    const mfcc = Meyda.extract('mfcc', frame);
    if (mfcc) mfccs.push(mfcc);

    const pitch = estimatePitchFromZeroCrossing(frame, sampleRate);
    pitches.push(pitch);
  }

  return { mfccs, pitches };
}

// ピッチ推定（ゼロクロス法の簡易版）
function estimatePitchFromZeroCrossing(frame, sampleRate) {
  let crossings = 0;
  for (let i = 1; i < frame.length; i++) {
    if ((frame[i - 1] > 0 && frame[i] < 0) || (frame[i - 1] < 0 && frame[i] > 0)) {
      crossings++;
    }
  }
  const durationInSeconds = frame.length / sampleRate;
  const zeroCrossingRate = crossings / durationInSeconds / 2; // 上下で1周期
  return zeroCrossingRate;
}

function startProgress(duration) {
  const indicator = document.getElementById("progress-indicator");
  if (!indicator) return;

  const track = indicator.parentElement;
  const trackWidth = track.offsetWidth;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const left = progress * (trackWidth - 16); // 16 = インジケーター幅
    indicator.style.left = `${left}px`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // 1秒後に一瞬で左に戻す
      setTimeout(() => {
        // トランジションを一時無効にして即座に戻す
        indicator.style.transition = "none";
        indicator.style.left = "0px";

        // 次回アニメーションのために遅延で transition を戻す
        requestAnimationFrame(() => {
          indicator.style.transition = "";
        });
      }, 1000);
    }
  }

  // 初期化
  indicator.style.transition = "none";
  indicator.style.left = "0px";
  requestAnimationFrame(() => {
    indicator.style.transition = ""; // アニメーション有効化
    requestAnimationFrame(animate);
  });
}