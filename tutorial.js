// === Tutorial System ===
const tutorialSteps = [
  {
    targetId: ['player-area', 'center-area'],
    content: "<h3>Step 1：開局與介面介紹</h3><p>歡迎來到《星墜梁山》！雙方開局各有 7 張起始手牌（5 張地煞與 2 張天罡），並有各自的出牌區。率先集結 12 名兵將的一方將觸發遊戲結束。</p>"
  },
  {
    targetId: null,
    content: "<h3>Step 2：七大軍力符號</h3><p>遊戲核心為 7 種軍力符號：👑統御、⛵水軍、🛡️步軍、🐎騎軍、👁️斥侯、🍞後勤、⚔️戰役。這些符號是您調兵遣將與爭奪戰功的基礎。</p><img src='./遊戲教學圖片/軍力符號.png'>"
  },
  {
    targetId: 'center-area',
    content: "<h3>Step 3：軍略行動一｜延攬豪傑 (抽牌)</h3><p>每回合您有 2 點抽牌點。拿取一張地煞卡消耗 1 點，天罡卡消耗 2 點。拿取後卡牌進入手牌，且展示列需待回合結束才會補充。</p><img src='./遊戲教學圖片/軍略行動-延攬豪傑：獲取卡片.png'>"
  },
  {
    targetId: 'player-area',
    content: "<h3>Step 4：軍略行動二｜派遣地煞與卡牌效果</h3><img src='./遊戲教學圖片/軍略行動-派遣兵將（打出一張卡片）.png'><p>打出地煞卡可獲得 1 枚軍力，並帶有強大的一次性效果。效果分為兩個階段：</p><br><p><b>【觸發條件】</b>：發動效果前必須滿足的條件。常見有：「棄掉一張具備特定軍力的手牌」、「力竭出牌區一位特定軍力的兵將」、或是「出牌區已具備特定軍力」。</p><img src='./遊戲教學圖片/卡牌效果-觸發條件.png'><br><p><b>【立即效果】</b>：滿足條件後立即發動。常見包含：獲得額外抽牌點、復甦已力竭的兵將、立即從手牌再打出一張卡片、或將此卡上下倒置以改變軍力符號。</p><img src='./遊戲教學圖片/卡牌效果-立即效果.png'>"
  },
  {
    targetId: ['player-played', 'player-hand'],
    content: "<h3>Step 5：軍略行動二｜派遣天罡與力竭代價</h3><p>打出天罡卡需支付嚴格的<b>【代價】</b>。您必須將出牌區符合指定軍力且狀態為「活躍（直立）」的兵將轉為「力竭（橫置 90 度）」。成功後可獲得 2 枚軍力，以及遊戲結束時的專屬計分條件。</p><img src='./遊戲教學圖片/兵將狀態：活躍或力竭.png'>"
  },
  {
    targetId: null,
    content: "<h3>Step 6：特殊卡片機制 (軍師與阮氏兄弟)</h3><div style='display:flex; gap:10px; margin-bottom:10px;'><img src='./assets/images/cards/EF_037_朱武.png' style='width:45%; margin:0;'><img src='./assets/images/cards/EF_027_阮小二.png' style='width:45%; margin:0;'></div><p>軍師群具備「雙重符號」，計分時可擇一最優計算；而阮氏三兄弟則具備「符號轉化」的常駐光環，能將全場水軍視為特定符號！</p><img src='./遊戲教學圖片/特殊卡片說明.png'>"
  },
  {
    targetId: ['center-major', 'center-minor'],
    content: "<h3>Step 7：自由行動｜參與戰役</h3><p>回合開始或結束前，若出牌區的「活躍軍力」滿足戰役卡需求，即可將對應兵將力竭以獲取戰功。若是小型戰役，還會附帶額外的【立即效果】獎勵。</p><img src='./遊戲教學圖片/自由行動：參與戰役.png'>"
  },
  {
    targetId: null,
    content: "<h3>Step 8：遊戲落幕與最終計分</h3><p>當任一方出牌區達 12 張兵將時觸發最後一輪。結算時全體兵將復甦，加總天罡功績與戰役戰功分數。同分比對兵將數量（少者勝），再同分則由後手勝出。</p><img src='./遊戲教學圖片/遊戲結束天罡卡計分方式.png'>"
  }
];

let currentTutorialStep = 0;

function startTutorial() {
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('game-container').classList.remove('hidden');
  
  // 開始一場初階遊戲作為教學盤面
  if (typeof startNewGame === 'function') {
    startNewGame('beginner');
  }
  
  document.getElementById('tutorial-overlay').classList.remove('hidden');
  currentTutorialStep = 0;
  renderTutorialStep();
}

function clearTutorialHighlights() {
  document.querySelectorAll('.tutorial-highlight').forEach(el => {
    el.classList.remove('tutorial-highlight');
  });
}

function renderTutorialStep() {
  clearTutorialHighlights();
  const step = tutorialSteps[currentTutorialStep];
  
  if (step.targetId) {
    const ids = Array.isArray(step.targetId) ? step.targetId : [step.targetId];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('tutorial-highlight');
    });
  }
  
  document.getElementById('tutorial-content').innerHTML = step.content;
  
  document.getElementById('btn-tutorial-prev').disabled = currentTutorialStep === 0;
  
  const nextBtn = document.getElementById('btn-tutorial-next');
  if (currentTutorialStep === tutorialSteps.length - 1) {
    nextBtn.textContent = '完成教學';
    nextBtn.onclick = endTutorial;
  } else {
    nextBtn.textContent = '下一頁';
    nextBtn.onclick = () => {
      currentTutorialStep++;
      renderTutorialStep();
    };
  }
}

function endTutorial() {
  document.getElementById('tutorial-overlay').classList.add('hidden');
  clearTutorialHighlights();
}

document.addEventListener('DOMContentLoaded', () => {
  const btnTutorial = document.getElementById('btn-tutorial');
  if (btnTutorial) {
    btnTutorial.addEventListener('click', startTutorial);
  }
  
  const btnPrev = document.getElementById('btn-tutorial-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentTutorialStep > 0) {
        currentTutorialStep--;
        renderTutorialStep();
      }
    });
  }
  
  const btnClose = document.getElementById('btn-tutorial-close');
  if (btnClose) {
    btnClose.addEventListener('click', endTutorial);
  }
});
