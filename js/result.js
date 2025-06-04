// プレイヤー情報とスコアを取得
const players = JSON.parse(sessionStorage.getItem("playerNames")) || [];
const scores = JSON.parse(sessionStorage.getItem("scores")) || [];

// 合計スコアで降順にソート
scores.sort((a, b) => b.total - a.total);

// 表示
const rankingList = document.getElementById("ranking-list");
scores.forEach((player, index) => {
  const li = document.createElement("li");
  li.textContent = `${index + 1}位: ${player.name}（合計: ${player.total}点 / 各ターン: ${player.turns.join(", ")}）`;
  rankingList.appendChild(li);
});

// もう一度プレイ
document.getElementById("restart-button").addEventListener("click", () => {
  sessionStorage.clear();
  window.location.href = "setup.html";
});