// 採点ロジック ---------------
const promptData = sessionStorage.getItem("promptFeatures");
const recordedData = sessionStorage.getItem("recordedFeatures");

const promptFeatures = JSON.parse(promptData);
const recordedFeatures = JSON.parse(recordedData);

// MFCCが2次元配列の場合に平均化
function averageMFCC(mfcc) {
  const numFrames = mfcc.length;
  const numCoeffs = mfcc[0].length;
  const avg = new Array(numCoeffs).fill(0);

  for (let frame of mfcc) {
    for (let i = 0; i < numCoeffs; i++) {
      avg[i] += frame[i];
    }
  }

  return avg.map(v => v / numFrames);
}

const originalMFCC = averageMFCC(promptFeatures.mfccs);
const recordedMFCC = averageMFCC(recordedFeatures.mfccs);
const originalPitch = promptFeatures.pitches;
const recordedPitch = recordedFeatures.pitches;

function calculateScore(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let totalDiff = 0;
  for (let i = 0; i < a.length; i++) {
    totalDiff += Math.abs(a[i] - b[i]);
  }
  return Math.max(0, 100 - totalDiff);
}

const mfccScore = calculateScore(originalMFCC, recordedMFCC);
const pitchScore = calculateScore(originalPitch, recordedPitch);
const finalScore = Math.round((mfccScore + pitchScore) / 2);
document.getElementById("score-value").textContent = finalScore;

// デバッグ表示 ---------------
document.getElementById("pitch-original").textContent = JSON.stringify(originalPitch, null, 2);
document.getElementById("pitch-recorded").textContent = JSON.stringify(recordedPitch, null, 2);
document.getElementById("mfcc-original").textContent = JSON.stringify(promptFeatures.mfccs, null, 2);
document.getElementById("mfcc-recorded").textContent = JSON.stringify(recordedFeatures.mfccs, null, 2);
// デバッグ表示（長さと中身）
document.getElementById("pitch-original").textContent =
  `長さ: ${originalPitch.length}\n` +
  JSON.stringify(originalPitch, null, 2);

document.getElementById("pitch-recorded").textContent =
  `長さ: ${recordedPitch.length}\n` +
  JSON.stringify(recordedPitch, null, 2);

document.getElementById("mfcc-original").textContent =
  `長さ: ${promptFeatures.mfccs.length}（フレーム数） × ${promptFeatures.mfccs[0]?.length || 0}（次元数）\n` +
  JSON.stringify(promptFeatures.mfccs, null, 2);

document.getElementById("mfcc-recorded").textContent =
  `長さ: ${recordedFeatures.mfccs.length}（フレーム数） × ${recordedFeatures.mfccs[0]?.length || 0}（次元数）\n` +
  JSON.stringify(recordedFeatures.mfccs, null, 2);


// グラフ描画ロジック ---------------
const pitchCtx = document.getElementById("pitch-chart").getContext("2d");
const mfccCtx = document.getElementById("mfcc-chart").getContext("2d");

new Chart(pitchCtx, {
  type: "line",
  data: {
    labels: originalPitch.map((_, i) => i),
    datasets: [
      { label: "お題ピッチ", data: originalPitch, borderColor: "blue", fill: false, pointRadius: 0 },
      { label: "再現ピッチ", data: recordedPitch, borderColor: "red", fill: false, pointRadius: 0 }
    ]
      },
  options: {
    animation: {
      duration: 1000,
      easing: 'easeOutQuart',
      delay(ctx) {
        return ctx.dataIndex * 5; // ← 各点に5msずつ遅延をかける
      }
    },
    elements: {
      line: {
        tension: 0.25 // ← 線を滑らかに（スプライン曲線）
      },
      point: {
        radius: 0 // ← ポイント非表示
      }
    }
  }
});

// グラフ切り替え処理
document.getElementById("show-pitch").addEventListener("click", () => {
  document.getElementById("pitch-chart").style.display = "block";
  document.getElementById("mfcc-chart").style.display = "none";
});
document.getElementById("show-mfcc").addEventListener("click", () => {
  document.getElementById("pitch-chart").style.display = "none";
  document.getElementById("mfcc-chart").style.display = "block";
  drawMFCCChart();
});

let mfccChart = null;
let mfccDrawn = false;

function drawMFCCChart() {
  if (mfccDrawn) return;
  mfccDrawn = true;

  const ctx = document.getElementById("mfcc-chart").getContext("2d");
  mfccChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: originalMFCC.map((_, i) => i),
      datasets: [
        {
          label: "お題MFCC",
          data: originalMFCC,
          borderColor: "blue",
          fill: false
        },
        {
          label: "再現MFCC",
          data: recordedMFCC,
          borderColor: "red",
          fill: false
        }
      ]
    },
    options: {
      animation: {
        duration: 1000,
        easing: 'easeOutQuart',
        delay(ctx) {
          return ctx.dataIndex * 5;
        }
      },
      elements: {
        line: { tension: 0.25 },
        point: { radius: 0 }
      }
    }
  });
}


// 次へボタンの処理 --------------
// score.js に追加
document.getElementById("next-button").addEventListener("click", () => {
  // スコア保存
  const scores = JSON.parse(sessionStorage.getItem("scores")) || [];

  // ターンとプレイヤーの状態更新
  const playerNames = JSON.parse(sessionStorage.getItem("playerNames") || "[]");
  let currentIndex = parseInt(sessionStorage.getItem("currentPlayerIndex") || "0", 10);
  let currentTurn = parseInt(sessionStorage.getItem("currentTurn") || "1", 10);
  const turnCount = parseInt(sessionStorage.getItem("turnCount") || "1", 10);

  const playerName = playerNames[currentIndex];

  // スコアをプレイヤーごとに記録
  let playerScore = scores.find(s => s.name === playerName);
  if (!playerScore) {
    playerScore = { name: playerName, total: 0, turns: [] };
    scores.push(playerScore);
  }
  playerScore.total += finalScore;
  playerScore.turns.push(finalScore);

  sessionStorage.setItem("scores", JSON.stringify(scores));

  // 次のプレイヤーに進めるかチェック
  if (currentIndex + 1 < playerNames.length) {
    sessionStorage.setItem("currentPlayerIndex", currentIndex + 1);
  } else {
    // 全員終わった → 次のターン or 終了
    if (currentTurn < turnCount) {
      sessionStorage.setItem("currentTurn", currentTurn + 1);
      sessionStorage.setItem("currentPlayerIndex", 0);
      sessionStorage.removeItem("shuffledPlayers");
    } else {
      // 全ターン終了（必要に応じて結果画面などへ）
      window.location.href = "result.html"; // or 終了画面へ
      return;
    }
  }

  // 次のプレイヤーのプレイ画面へ
  window.location.href = "play.html";
});