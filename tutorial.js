// === Interactive Tutorial System ===

let isTutorialMode = false;
let currentTutorialStep = 1;

// Hook renderAll to re-apply targets after UI updates
const originalRenderAll = window.renderAll;
window.renderAll = function() {
  if (typeof originalRenderAll === 'function') {
    originalRenderAll();
  }
  if (isTutorialMode) {
    applyTutorialStepLogic();
  }
};

function initTutorialMode() {
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('game-container').classList.remove('hidden');
  
  if (typeof startNewGame === 'function') {
    startNewGame('beginner');
  }

  isTutorialMode = true;
  currentTutorialStep = 1;

  // 強制覆寫牌局
  setupScriptedScenario();
  
  // 啟動遮罩與對話框
  const mask = document.getElementById('tutorial-mask');
  const dialog = document.getElementById('tutorial-dialog-container');
  if (mask) mask.classList.remove('hidden');
  if (dialog) dialog.classList.remove('hidden');
  
  // 重新渲染畫面以套用被覆寫的資料
  window.renderAll();
}

function setupScriptedScenario() {
  // 玩家手牌：1 張地煞卡（編號46 蕭讓）、1 張天罡卡（編號03 吳用）
  const xiaoRang = earthCards.find(c => c.id === 'EF_046');
  const wuYong = heavenCards.find(c => c.id === 'HF_003');
  
  // 玩家出牌區：1 張具備「統御」的地煞卡（例如 EF_037 朱武）
  const zhuWu = earthCards.find(c => c.id === 'EF_037');
  const activeZhuWu = { ...zhuWu, isExhausted: false };

  gameState.human.hand = [ { ...xiaoRang }, { ...wuYong } ];
  gameState.human.playedArea = [ activeZhuWu ];
  
  // 中央展示列：只顯示 1 張地煞卡、1 張天罡卡
  const someEarth = earthCards.find(c => c.id === 'EF_001');
  const someHeaven = heavenCards.find(c => c.id === 'HF_001');
  gameState.center.earth = [ { ...someEarth } ];
  gameState.center.heaven = [ { ...someHeaven } ];
  
  // 戰役卡區：只顯示 1 張小型戰役卡（條件需為 統御x1, 後勤x1）
  const minorCampaign = minorCampaignCards.find(c => c.targets && c.targets.includes('統御') && c.targets.includes('後勤'));
  gameState.center.minorCampaigns = [ 
    minorCampaign || {
      id: 'TUTORIAL_CAMPAIGN',
      type: '小型戰役',
      name: '糧草爭奪戰',
      targets: ['統御', '後勤'],
      effect: '無',
      score: 1,
      image: './assets/images/小型戰役牌背.png'
    } 
  ];
  gameState.center.majorCampaigns = []; // 清空重大戰役

  // 隱藏對手的東西，讓他看起來乾淨一點
  gameState.cpu.handCount = 0;
  gameState.cpu.playedArea = [];
  gameState.cpu.score = 0;
  gameState.human.score = 0;
}

function setDialog(text, btnText = null, btnAction = null) {
  const textEl = document.getElementById('tutorial-dialog-text');
  const actionBtn = document.getElementById('btn-tutorial-action');
  
  if (textEl) textEl.innerHTML = text;
  
  if (btnText && actionBtn) {
    actionBtn.textContent = btnText;
    actionBtn.classList.remove('hidden');
    actionBtn.onclick = () => {
      actionBtn.classList.add('hidden');
      if (btnAction) btnAction();
    };
  } else if (actionBtn) {
    actionBtn.classList.add('hidden');
  }
}

function clearTargets() {
  document.querySelectorAll('.tutorial-target').forEach(el => {
    el.classList.remove('tutorial-target');
  });
}

function applyTutorialStepLogic() {
  clearTargets();
  
  if (currentTutorialStep === 1) {
    setDialog('歡迎來到《水滸傳》！我們為你準備了特定的牌局，請點擊「開始演練」。', '開始演練', () => {
      currentTutorialStep = 2;
      window.renderAll();
    });
  }
  else if (currentTutorialStep === 2) {
    setDialog('你有 2 點抽牌點。請點擊中央展示列的地煞卡（耗 1 點）將其延攬至手牌。');
    const earthCardEl = document.querySelector('#center-earth .card');
    if (earthCardEl) {
      earthCardEl.classList.add('tutorial-target');
      earthCardEl.addEventListener('click', () => {
        // Delay to allow original game logic to process
        setTimeout(() => {
          currentTutorialStep = 3;
          window.renderAll();
        }, 200);
      }, {once: true});
    } else {
      // 找不到卡片，可能已經被拿走
      currentTutorialStep = 3;
      setTimeout(() => applyTutorialStepLogic(), 100);
    }
  }
  else if (currentTutorialStep === 3) {
    setDialog('現在，請點擊手牌中的地煞卡【蕭讓】（具備 🛡️步軍 / 🍞後勤）。打出地煞卡可立即獲得軍力與發動效果！');
    const handCards = document.querySelectorAll('#player-hand .card');
    let found = false;
    handCards.forEach(cardEl => {
      if (cardEl.dataset.id === 'EF_046') {
        cardEl.classList.add('tutorial-target');
        found = true;
        cardEl.addEventListener('click', () => {
          setTimeout(() => {
            currentTutorialStep = 4;
            window.renderAll();
          }, 200);
        }, {once: true});
      }
    });
    
    if (!found && gameState.human.playedArea.some(c => c.id === 'EF_046')) {
        currentTutorialStep = 4;
        applyTutorialStepLogic();
    }
  }
  else if (currentTutorialStep === 4) {
    setDialog('天罡卡能力強大，但需要支付【代價】。請點擊手牌中的天罡卡【吳用】（需 👑統御 作為代價）。');
    const handCards = document.querySelectorAll('#player-hand .card');
    let found = false;
    handCards.forEach(cardEl => {
      if (cardEl.dataset.id === 'HF_003') {
        cardEl.classList.add('tutorial-target');
        found = true;
        cardEl.addEventListener('click', () => {
          setTimeout(() => {
            currentTutorialStep = 4.5;
            window.renderAll();
          }, 200);
        }, {once: true});
      }
    });
    
    if (!found && gameState.selectionMode && gameState.selectionMode.type === 'exhaustCost') {
        currentTutorialStep = 4.5;
        applyTutorialStepLogic();
    } else if (!found && gameState.human.playedArea.some(c => c.id === 'HF_003')) {
        currentTutorialStep = 5;
        applyTutorialStepLogic();
    }
  }
  else if (currentTutorialStep === 4.5) {
    setDialog('請點擊你出牌區中具備 👑統御 符號的兵將，將其「力竭 (橫置)」以完成出牌。');
    const playedCards = document.querySelectorAll('#player-played .card');
    playedCards.forEach(cardEl => {
      const cardData = gameState.human.playedArea[parseInt(cardEl.dataset.index)];
      if (cardData && !cardData.isExhausted && cardData.symbols && cardData.symbols.includes('統御')) {
        cardEl.classList.add('tutorial-target');
        cardEl.addEventListener('click', () => {
          setTimeout(() => {
            currentTutorialStep = 5;
            window.renderAll();
          }, 400);
        }, {once: true});
      }
    });
    
    if (gameState.human.playedArea.some(c => c.id === 'HF_003')) {
        currentTutorialStep = 5;
        applyTutorialStepLogic();
    }
  }
  else if (currentTutorialStep === 5) {
    setDialog('你目前的活躍軍力滿足了戰役需求！請點擊上方的【小型戰役卡】。');
    const campaignEl = document.querySelector('#center-minor .card');
    if (campaignEl) {
      campaignEl.classList.add('tutorial-target');
      campaignEl.addEventListener('click', () => {
        setTimeout(() => {
          currentTutorialStep = 6;
          window.renderAll();
        }, 800);
      }, {once: true});
    } else {
        currentTutorialStep = 6;
        applyTutorialStepLogic();
    }
  }
  else if (currentTutorialStep === 6) {
    setDialog('恭喜完成基礎演練！正式遊戲中，先集滿 12 張兵將即觸發結算。請點擊「結束教學」。', '結束教學', exitTutorialMode);
  }
}

function exitTutorialMode() {
  isTutorialMode = false;
  const mask = document.getElementById('tutorial-mask');
  const dialog = document.getElementById('tutorial-dialog-container');
  if (mask) mask.classList.add('hidden');
  if (dialog) dialog.classList.add('hidden');
  clearTargets();
  
  document.getElementById('game-container').classList.add('hidden');
  document.getElementById('start-menu').classList.remove('hidden');
}

// Bind events
document.addEventListener('DOMContentLoaded', () => {
  const btnTutorial = document.getElementById('btn-tutorial');
  if (btnTutorial) {
    btnTutorial.replaceWith(btnTutorial.cloneNode(true));
    document.getElementById('btn-tutorial').addEventListener('click', initTutorialMode);
  }
  
  const btnAbort = document.getElementById('btn-tutorial-abort');
  if (btnAbort) {
    btnAbort.addEventListener('click', exitTutorialMode);
  }
});
