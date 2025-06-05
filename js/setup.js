sessionStorage.setItem("currentTurn", "1");
sessionStorage.setItem("currentPlayerIndex", "0");
sessionStorage.removeItem("shuffledPlayers");

// プレイヤー名の取得
const nameInputs = document.querySelectorAll(".player-input");
const startGameBtn = document.getElementById("start-game");

// ターン数選択
let selectedTurn = null;
const turnButtons = document.querySelectorAll(".turn-button");

turnButtons.forEach(button => {
  button.addEventListener("click", () => {
    turnButtons.forEach(btn => btn.classList.remove("selected"));
    button.classList.add("selected");
    selectedTurn = parseInt(button.dataset.turn);
  });
});

startGameBtn.addEventListener("click", () => {
  const playerNames = Array.from(nameInputs)
    .map(input => input.value.trim())
    .filter(name => name !== "");

  if (playerNames.length < 2) {
    alert("最低2人のプレイヤー名を入力してください！");
    return;
  }

  if (!selectedTurn) {
    alert("ターン数を選んでください！");
    return;
  }

  sessionStorage.setItem("playerNames", JSON.stringify(playerNames));
  sessionStorage.setItem("turnCount", selectedTurn);

  window.location.href = "./play.html";
});