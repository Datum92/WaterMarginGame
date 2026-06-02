/**
 * 水滸卡牌戰記 - 第一階段遊戲核心邏輯
 */

// 遊戲全域狀態
const gameState = {
  difficulty: 'beginner', // 'beginner' | 'intermediate' | 'advanced'
  gameStarted: false,
  currentTurn: 'human',      // 'human' | 'cpu'
  playerActionState: 'idle', // 'idle' | 'recruit' | 'deploy' | 'finished'
  turnFreeActionTaken: false,// 是否執行過自由行動 (戰役)
  drawPointsRemaining: 2,    // 剩餘抽牌點 (延攬行動)
  selectionMode: null,       // 目前互動選取狀態 (例如：'exhaust' | 'revive' 等)
  decks: {
    heaven: [],
    earth: [],
    majorCampaign: [],
    minorCampaign: []
  },
  centerDisplay: {
    heaven: [],        // 5張
    earth: [],         // 5張
    majorCampaign: [], // 2張
    minorCampaign: []  // 4張
  },
  human: {
    hand: [],          // 手牌 (無上限)
    playedArea: [],    // 出牌區，格式為 { card, state: 'active'|'exhausted'|'inverted' }
    wonCampaigns: [],  // 玩家奪取的戰役卡
    campaignDiscounts: [], // 戰役軍力減免，格式如 [['步軍', '水軍']]
    score: 0
  },
  cpu: {
    hand: [],          // CPU 手牌 (隱藏)
    playedArea: [],    // CPU 出牌區
    wonCampaigns: [],  // CPU 奪取的戰役卡
    campaignDiscounts: [], // CPU 戰役軍力減免
    score: 0
  }
};

// 洗牌函式 (Fisher-Yates)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 初始化與洗牌所有牌組
function initializeDecks() {
  gameState.decks.heaven = shuffleArray(heavenCards);
  gameState.decks.earth = shuffleArray(earthCards);
  
  // 區分重大戰役與小型戰役
  const major = campaignCards.filter(c => c.type === '重大戰役');
  const minor = campaignCards.filter(c => c.type === '小型戰役');
  
  gameState.decks.majorCampaign = shuffleArray(major);
  gameState.decks.minorCampaign = shuffleArray(minor);
}

// 開始新遊戲
function startNewGame(difficulty) {
  gameState.difficulty = difficulty;
  gameState.gameStarted = true;
  gameState.isGameOver = false;
  gameState.currentTurn = 'human';
  gameState.playerActionState = 'idle';
  gameState.turnFreeActionTaken = false;
  gameState.drawPointsRemaining = 2;
  gameState.selectionMode = null;
  gameState.human.campaignDiscounts = [];
  gameState.cpu.campaignDiscounts = [];
  
  const viewScoreBtn = document.getElementById('btn-view-score');
  if (viewScoreBtn) viewScoreBtn.classList.add('hidden');
  
  // 1. 初始化並洗牌
  initializeDecks();
  
  // 2. 清空玩家與 CPU 狀態
  gameState.human.hand = [];
  gameState.human.playedArea = [];
  gameState.human.wonCampaigns = [];
  gameState.human.score = 0;
  
  gameState.cpu.hand = [];
  gameState.cpu.playedArea = [];
  gameState.cpu.wonCampaigns = [];
  gameState.cpu.score = 0;
  
  // 3. 發牌給玩家與 CPU
  // 初始手牌：5張地煞卡，2張天罡卡 (共 7 張)
  for (let i = 0; i < 5; i++) {
    if (gameState.decks.earth.length > 0) {
      gameState.human.hand.push(gameState.decks.earth.pop());
      gameState.cpu.hand.push(gameState.decks.earth.pop());
    }
  }
  for (let i = 0; i < 2; i++) {
    if (gameState.decks.heaven.length > 0) {
      gameState.human.hand.push(gameState.decks.heaven.pop());
      gameState.cpu.hand.push(gameState.decks.heaven.pop());
    }
  }
  
  // 4. 初始化中央展示列
  gameState.centerDisplay.heaven = [];
  gameState.centerDisplay.earth = [];
  gameState.centerDisplay.majorCampaign = [];
  gameState.centerDisplay.minorCampaign = [];
  
  for (let i = 0; i < 5; i++) {
    if (gameState.decks.heaven.length > 0) gameState.centerDisplay.heaven.push(gameState.decks.heaven.pop());
    if (gameState.decks.earth.length > 0) gameState.centerDisplay.earth.push(gameState.decks.earth.pop());
  }
  for (let i = 0; i < 2; i++) {
    if (gameState.decks.majorCampaign.length > 0) gameState.centerDisplay.majorCampaign.push(gameState.decks.majorCampaign.pop());
  }
  for (let i = 0; i < 4; i++) {
    if (gameState.decks.minorCampaign.length > 0) gameState.centerDisplay.minorCampaign.push(gameState.decks.minorCampaign.pop());
  }
  
  // 5. 渲染 UI
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('game-container').classList.remove('hidden');
  
  // 更新難易度徽章文字
  const diffBadge = document.getElementById('current-diff-badge');
  if (difficulty === 'beginner') {
    diffBadge.textContent = '初階';
    diffBadge.style.borderColor = '#2ecc71';
    diffBadge.style.color = '#2ecc71';
  } else if (difficulty === 'intermediate') {
    diffBadge.textContent = '中階';
    diffBadge.style.borderColor = '#f39c12';
    diffBadge.style.color = '#f39c12';
  } else {
    diffBadge.textContent = '高階';
    diffBadge.style.borderColor = '#e74c3c';
    diffBadge.style.color = '#e74c3c';
  }
  
  renderAll();
}

// 建立卡牌 DOM 元素
function createCardDOM(card, options = {}) {
  const { 
    isFaceUp = true, 
    onClick = null, 
    isPlayed = false,
    playedState = 'active',
    isCPU = false
  } = options;
  
  const wrapper = document.createElement('div');
  wrapper.className = 'card-wrapper';
  if (isCPU) wrapper.classList.add('cpu-card-wrapper');
  
  const img = document.createElement('img');
  img.className = 'card-img';
  
  if (isFaceUp) {
    img.src = getCardImagePath(card);
    img.alt = card.name || card.id;
  } else {
    img.src = getCardBackPath(card.type);
    img.alt = '卡牌背面';
  }
  
  // 設定出牌區的狀態 class
  if (isPlayed) {
    img.classList.add(`state-${playedState}`);
    
    // 加入狀態提示 Badge
    const badge = document.createElement('span');
    badge.className = 'card-state-badge';
    const stateNames = { 'active': '活躍', 'exhausted': '力竭', 'inverted': '倒置' };
    badge.textContent = stateNames[playedState] || '活躍';
    wrapper.appendChild(badge);
    
    // 加入軍師切換按鈕 (如果是軍師且在玩家出牌區且活躍)
    const isCounselor = ["朱武", "蕭讓", "裴宣", "蔣敬"].includes(card.name) || (card.specialEffect && card.specialEffect.includes("梁山軍師群"));
    if (isCounselor && playedState === 'active' && !isCPU) {
      if (card.symbols && card.symbols.length >= 2) {
        const s1 = card.symbols[0];
        const s2 = card.symbols[1];
        const item = options.playedItem;
        const current = (item && item.currentCounselorSymbol) ? item.currentCounselorSymbol : s1;
        
        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'counselor-toggle';
        toggleWrapper.innerHTML = `
          <span class="c-opt" data-sym="${s1}" style="cursor:pointer; padding: 2px 4px; border-radius: 4px; color: ${current === s1 ? '#fff' : '#888'}; background: ${current === s1 ? 'rgba(255,255,255,0.3)' : 'transparent'}; font-weight: ${current === s1 ? 'bold' : 'normal'};">${s1}</span>
          <span style="color:#666;">|</span>
          <span class="c-opt" data-sym="${s2}" style="cursor:pointer; padding: 2px 4px; border-radius: 4px; color: ${current === s2 ? '#fff' : '#888'}; background: ${current === s2 ? 'rgba(255,255,255,0.3)' : 'transparent'}; font-weight: ${current === s2 ? 'bold' : 'normal'};">${s2}</span>
        `;
        wrapper.appendChild(toggleWrapper);
        
        if (item) {
          setTimeout(() => {
            const opts = toggleWrapper.querySelectorAll('.c-opt');
            opts.forEach(opt => {
              opt.addEventListener('click', (e) => {
                e.stopPropagation();
                item.currentCounselorSymbol = opt.getAttribute('data-sym');
                if (typeof renderAll === 'function') renderAll();
              });
            });
          }, 0);
        }
      }
    }
    
    // 加入水軍切換按鈕 (如果包含水軍且有可切換的選項)
    const waterOptions = options.waterOptions || ['水軍'];
    const isWaterActive = playedState === 'active' && card.symbols && card.symbols.includes('水軍');
    const isWaterInverted = playedState === 'inverted' && card.invertedSymbols && card.invertedSymbols.includes('水軍');
    if ((isWaterActive || isWaterInverted) && !isCPU && waterOptions.length > 1) {
      const item = options.playedItem;
      const current = (item && item.waterTransformation && waterOptions.includes(item.waterTransformation)) ? item.waterTransformation : '水軍';
      
      const toggleWrapper = document.createElement('div');
      toggleWrapper.className = 'water-toggle';
      
      let htmlContent = '';
      waterOptions.forEach((opt, idx) => {
        const isCurrent = current === opt;
        htmlContent += `<span class="w-opt" data-sym="${opt}" style="cursor:pointer; padding: 2px 4px; border-radius: 4px; color: ${isCurrent ? '#fff' : '#888'}; background: ${isCurrent ? 'rgba(52, 152, 219, 0.4)' : 'transparent'}; font-weight: ${isCurrent ? 'bold' : 'normal'};">${opt}</span>`;
        if (idx < waterOptions.length - 1) htmlContent += `<span style="color:#666;">|</span>`;
      });
      
      // If there's already a toggle (unlikely for counselors, but just in case), offset this one higher
      const topOffset = isCounselor ? '-50px' : '-25px';
      
      toggleWrapper.innerHTML = htmlContent;
      toggleWrapper.style.cssText = `position: absolute; top: ${topOffset}; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); border-radius: 12px; padding: 2px 6px; display: flex; gap: 4px; z-index: 10; font-size: 0.75rem; white-space: nowrap; border: 1px solid rgba(52, 152, 219, 0.5);`;
      
      wrapper.appendChild(toggleWrapper);
      
      if (item) {
        setTimeout(() => {
          const opts = toggleWrapper.querySelectorAll('.w-opt');
          opts.forEach(opt => {
            opt.addEventListener('click', (e) => {
              e.stopPropagation();
              item.waterTransformation = opt.getAttribute('data-sym');
              if (typeof renderAll === 'function') renderAll();
            });
          });
        }, 0);
      }
    }
  } else {
    img.classList.add('state-active');
  }
  
  wrapper.appendChild(img);
  
  // 點擊事件
  if (onClick) {
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(card, wrapper, img);
    });
  }
  
  // 雙擊開啟卡牌規則大圖檢視
  if (isFaceUp) {
    wrapper.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      showCardDetail(card);
    });
  }
  
  return wrapper;
}

// 渲染所有區域
function renderAll() {
  renderDecksCount();
  renderCenterDisplay();
  renderPlayerHand();
  renderPlayerPlayed();
  updatePlayerSymbolCounts();
  renderCPUHand();
  renderCPUPlayed();
  
  // 渲染互動選擇橫幅與減免面板
  renderInteractionBanner();
  
  // 渲染已獲取的戰役卡區
  renderWonCampaigns();
  
  // 更新分數與統計
  document.getElementById('player-score').textContent = gameState.human.score;
  document.getElementById('cpu-score').textContent = gameState.cpu.score;
  const playedCount = gameState.human.playedArea.length;
  const playedCountEl = document.getElementById('player-played-count');
  if (playedCountEl) {
    playedCountEl.textContent = playedCount;
    // Color: green < 9, amber 9-11, red 12+
    const badge = playedCountEl.closest('.hand-count-badge');
    if (badge) {
      if (playedCount >= 12) {
        badge.style.color = '#e74c3c';
        badge.style.borderColor = 'rgba(231,76,60,0.4)';
      } else if (playedCount >= 9) {
        badge.style.color = '#f39c12';
        badge.style.borderColor = 'rgba(243,156,18,0.4)';
      } else {
        badge.style.color = '';
        badge.style.borderColor = '';
      }
    }
  }
  document.getElementById('cpu-hand-count').textContent = gameState.cpu.hand.length;

  // 更新回合與行動狀態顯示
  const turnBadge = document.getElementById('current-turn-badge');
  const actionBadge = document.getElementById('action-status-badge');
  const drawPointsBadge = document.getElementById('draw-points-badge');
  const drawPointsVal = document.getElementById('draw-points-val');
  const endTurnBtns = document.querySelectorAll('.btn-end-turn');
  const center = document.getElementById('center-area');
  
  // 1. 回合指示標籤
  if (gameState.currentTurn === 'human') {
    turnBadge.textContent = '玩家回合';
    turnBadge.className = 'turn-badge human-turn';
  } else {
    turnBadge.textContent = 'CPU 回合';
    turnBadge.className = 'turn-badge cpu-turn';
  }
  
  // 2. 軍略行動狀態
  if (gameState.playerActionState === 'idle') {
    actionBadge.textContent = '軍略行動：未執行';
    actionBadge.style.color = 'var(--color-gold)';
  } else if (gameState.playerActionState === 'recruit') {
    actionBadge.textContent = '軍略行動：延攬豪傑中';
    actionBadge.style.color = 'var(--theme-heaven)';
  } else if (gameState.playerActionState === 'deploy') {
    actionBadge.textContent = '軍略行動：派遣兵將中';
    actionBadge.style.color = 'var(--theme-earth)';
  } else if (gameState.playerActionState === 'finished') {
    actionBadge.textContent = '軍略行動：已完成';
    actionBadge.style.color = '#a0a0b0';
  }
  
  // 3. 剩餘抽牌點顯示
  const centerDrawPointsBadge = document.getElementById('center-draw-points-badge');
  const centerDrawPointsVal = document.getElementById('center-draw-points-val');

  if ((gameState.playerActionState === 'recruit' && gameState.currentTurn === 'human') || 
      (gameState.selectionMode && gameState.selectionMode.type === 'freeDraw')) {
    drawPointsBadge.classList.remove('hidden');
    drawPointsVal.textContent = gameState.drawPointsRemaining;
    if (centerDrawPointsBadge) {
      centerDrawPointsBadge.classList.remove('hidden');
      centerDrawPointsVal.textContent = gameState.drawPointsRemaining;
    }
  } else {
    drawPointsBadge.classList.add('hidden');
    if (centerDrawPointsBadge) {
      centerDrawPointsBadge.classList.add('hidden');
    }
  }
  
  // 4. 結束回合按鈕狀態
  endTurnBtns.forEach(btn => {
    if (gameState.currentTurn === 'human' && 
        (gameState.playerActionState === 'finished' || gameState.playerActionState === 'recruit')) {
      btn.classList.remove('disabled');
      btn.removeAttribute('disabled');
    } else {
      btn.classList.add('disabled');
      btn.setAttribute('disabled', 'true');
    }
  });
  
  // 5. 回合點選阻擋層
  if (gameState.currentTurn === 'cpu') {
    center.classList.add('disabled-interaction');
  } else {
    center.classList.remove('disabled-interaction');
  }
}

// 結束回合與補充中央展示列
function endTurn() {
  if (gameState.isGameOver) return;
  if (gameState.currentTurn === 'human') {
    // 檢查若有尚未完成的選擇模式，不給結束
    if (gameState.selectionMode) {
      showToast('請先完成當前效果選擇！');
      return;
    }
    
    // 清空雙方的戰役減免
    gameState.human.campaignDiscounts = [];
    gameState.cpu.campaignDiscounts = [];
    
    // 補滿中央展示列
    refillCenterDisplay();
    
    // 交給 CPU 回合
    gameState.currentTurn = 'cpu';
    
    // 檢查是否已達到 12 名兵將
    if (gameState.human.playedArea.length >= 12 || gameState.cpu.playedArea.length >= 12) {
      showToast('⚠️ 出牌區已有玩家達到 12 張兵將！此輪為最後一輪！');
    } else {
      showToast('你的回合結束，CPU 回合開始。');
    }
    renderAll();
    
    // 延遲啟動 CPU AI 回合
    setTimeout(cpuPlayTurn, 1000);
  } else {
    // CPU 回合結束，交回玩家 (先補牌)
    refillCenterDisplay();
    
    // 檢查是否觸發遊戲結束
    if (gameState.human.playedArea.length >= 12 || gameState.cpu.playedArea.length >= 12) {
      showToast('⚔️ 遊戲結束！開始進行最後結算與計分。');
      setTimeout(resolveGameEnd, 1500);
      return;
    }
    
    gameState.currentTurn = 'human';
    gameState.turnActionTaken = false;
    gameState.turnFreeActionTaken = false;
    gameState.drawPointsRemaining = 2;
    gameState.activeActionType = null;
    gameState.selectionMode = null;
    gameState.playerActionState = 'idle';
    
    // 清空雙方的戰役減免
    gameState.human.campaignDiscounts = [];
    gameState.cpu.campaignDiscounts = [];
    
    showToast('你的回合開始！請選擇延攬豪傑或派遣兵將。');
    renderAll();
  }
}

// 遊戲結束結算與計分
function resolveGameEnd() {
  // 1. 復甦全部好漢
  gameState.human.playedArea.forEach(item => {
    if (item.state === 'exhausted') item.state = item.previousState || 'active';
  });
  gameState.cpu.playedArea.forEach(item => {
    if (item.state === 'exhausted') item.state = item.previousState || 'active';
  });
  
  gameState.isGameOver = true;
  
  // 重新渲染以顯示復甦狀態
  renderAll();
  
  // 2. 計算最終分數 (強制視為復甦)
  const humanFinal = getPlayerScore('human', true);
  const cpuFinal = getPlayerScore('cpu', true);
  
  gameState.human.score = humanFinal.score;
  gameState.cpu.score = cpuFinal.score;
  
  // 更新 UI 上的分數顯示
  document.getElementById('player-score').textContent = humanFinal.score;
  document.getElementById('cpu-score').textContent = cpuFinal.score;
  
  const humanGenerals = gameState.human.playedArea.length;
  const cpuGenerals = gameState.cpu.playedArea.length;
  
  // 3. 判定勝負與勝負說明
  let winner = '';
  let reason = '';
  
  if (humanFinal.score > cpuFinal.score) {
    winner = 'human';
    reason = `玩家以較高的積分 (${humanFinal.score} 分 vs ${cpuFinal.score} 分) 獲得勝利！`;
  } else if (cpuFinal.score > humanFinal.score) {
    winner = 'cpu';
    reason = `CPU 以較高的積分 (${cpuFinal.score} 分 vs ${humanFinal.score} 分) 獲得勝利！`;
  } else {
    // 同分，以兵將數量較少者為勝
    if (humanGenerals < cpuGenerals) {
      winner = 'human';
      reason = `雙方積分相同 (${humanFinal.score} 分)，玩家因已進場兵將數量較少 (${humanGenerals} 名 vs ${cpuGenerals} 名) 獲得勝利！`;
    } else if (cpuGenerals < humanGenerals) {
      winner = 'cpu';
      reason = `雙方積分相同 (${cpuFinal.score} 分)，CPU 因已進場兵將數量較少 (${cpuGenerals} 名 vs ${humanGenerals} 名) 獲得勝利！`;
    } else {
      // 仍同，以行動次序在後者為勝 (CPU在後)
      winner = 'cpu';
      reason = `雙方積分與兵將數量均相同 (${humanFinal.score} 分，${humanGenerals} 名)，CPU 因行動次序在後 (後手) 獲得勝利！`;
    }
  }
  
  // 4. 取得單人模式評價
  const score = humanFinal.score;
  let rating = '';
  if (score <= 30) {
    rating = '書讀未精， 功敗垂成， 當如李逵再起， 重振雄風。';
  } else if (score <= 40) {
    rating = '已見鋒芒，然仍欠火候。或許只是命途多舛， 正如楊志般多舛不遇。';
  } else if (score <= 50) {
    rating = '膽勇無雙，卻仍前路險阻，恰似武松行走江湖。';
  } else if (score <= 60) {
    rating = '智勇兼備，謀略深遠，堪比盧俊義之帷幄。';
  } else if (score <= 70) {
    rating = '博學多識，人稱三眼秀士，足可比肩朱武。';
  } else if (score <= 80) {
    rating = '眾好漢皆敬仰追隨，宛若呼保義宋江。';
  } else if (score <= 107) {
    rating = '智計無雙，幾近堪稱當代之智多星吳用再世。';
  } else {
    rating = '屬實不可能……還是公孫勝的法術顯靈乎？';
  }
  
  // 5. 渲染 Game Over Modal 內容
  const winnerTextEl = document.getElementById('winner-text');
  if (winner === 'human') {
    winnerTextEl.textContent = '🎉 恭喜你一統天地，獲得大勝！';
    winnerTextEl.style.color = '#2ecc71';
  } else {
    winnerTextEl.textContent = '💀 棋差一招，未能一統天地！';
    winnerTextEl.style.color = '#e74c3c';
  }
  
  document.getElementById('game-over-player-score').textContent = `${humanFinal.score} 分`;
  document.getElementById('game-over-player-heaven-score').textContent = humanFinal.heavenScore;
  document.getElementById('game-over-player-campaign-score').textContent = humanFinal.campaignScore;
  document.getElementById('game-over-player-generals').textContent = humanGenerals;
  
  document.getElementById('game-over-cpu-score').textContent = `${cpuFinal.score} 分`;
  document.getElementById('game-over-cpu-heaven-score').textContent = cpuFinal.heavenScore;
  document.getElementById('game-over-cpu-campaign-score').textContent = cpuFinal.campaignScore;
  document.getElementById('game-over-cpu-generals').textContent = cpuGenerals;
  
  document.getElementById('player-evaluation-text').textContent = rating;
  
  // 顯示原因
  const reasonDiv = document.createElement('div');
  reasonDiv.id = 'game-over-reason';
  reasonDiv.style.color = 'var(--text-secondary)';
  reasonDiv.style.fontSize = '0.95rem';
  reasonDiv.style.marginBottom = '20px';
  reasonDiv.style.padding = '0 10px';
  reasonDiv.style.lineHeight = '1.5';
  reasonDiv.textContent = reason;
  
  // 移除舊的 reason 元素，避免重複
  const oldReason = document.getElementById('game-over-reason');
  if (oldReason) oldReason.remove();
  winnerTextEl.after(reasonDiv);
  
  // 5b. 填入計分明細
  function buildBreakdownHTML(final) {
    if (!final.breakdown || final.breakdown.length === 0) {
      return '<div style="color: rgba(255,255,255,0.3); font-style: italic;">（無得分項目）</div>';
    }
    let html = '';
    final.breakdown.forEach(item => {
      if (item.type === 'heaven') {
        const earnedColor = item.earned > 0 ? '#f39c12' : 'rgba(255,255,255,0.3)';
        html += `<div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid rgba(255,255,255,0.05); padding:3px 0;">
          <span>⚔ <strong style="color:#f0f0f5;">${item.name}</strong>
            <span style="font-size:0.78rem; color:rgba(255,255,255,0.4);"> (${item.condition})</span>
            <span style="font-size:0.78rem; color:rgba(255,255,255,0.35);"> × ${item.groups} 組</span>
          </span>
          <span style="color:${earnedColor}; font-weight:bold; min-width:48px; text-align:right;">+${item.earned} 分</span>
        </div>`;
      } else {
        html += `<div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid rgba(255,255,255,0.05); padding:3px 0;">
          <span>🏅 <strong style="color:#2ecc71;">${item.name}</strong></span>
          <span style="color:#2ecc71; font-weight:bold; min-width:48px; text-align:right;">+${item.earned} 分</span>
        </div>`;
      }
    });
    html += `<div style="text-align:right; margin-top:8px; font-size:0.95rem; color:#f39c12; font-weight:bold;">合計：${final.score} 分</div>`;
    return html;
  }
  
  document.getElementById('player-breakdown-detail').innerHTML = buildBreakdownHTML(humanFinal);
  document.getElementById('cpu-breakdown-detail').innerHTML = buildBreakdownHTML(cpuFinal);
  
  // 重置明細展開按鈕
  const breakdownPanel = document.getElementById('score-breakdown-panel');
  const breakdownBtn = document.getElementById('breakdown-toggle-btn');
  breakdownPanel.classList.add('hidden');
  breakdownBtn.textContent = '📊 顯示計分明細';
  
  // 顯示 modal
  document.getElementById('game-over-modal').classList.remove('hidden');
}

// 補充中央展示列至指定數量
function refillCenterDisplay() {
  while (gameState.centerDisplay.heaven.length < 5 && gameState.decks.heaven.length > 0) {
    gameState.centerDisplay.heaven.push(gameState.decks.heaven.pop());
  }
  while (gameState.centerDisplay.earth.length < 5 && gameState.decks.earth.length > 0) {
    gameState.centerDisplay.earth.push(gameState.decks.earth.pop());
  }
  while (gameState.centerDisplay.majorCampaign.length < 2 && gameState.decks.majorCampaign.length > 0) {
    gameState.centerDisplay.majorCampaign.push(gameState.decks.majorCampaign.pop());
  }
  while (gameState.centerDisplay.minorCampaign.length < 4 && gameState.decks.minorCampaign.length > 0) {
    gameState.centerDisplay.minorCampaign.push(gameState.decks.minorCampaign.pop());
  }
}

// 渲染剩餘牌組張數與牌背
function renderDecksCount() {
  document.getElementById('heaven-deck-count').textContent = gameState.decks.heaven.length;
  document.getElementById('earth-deck-count').textContent = gameState.decks.earth.length;
  document.getElementById('major-deck-count').textContent = gameState.decks.majorCampaign.length;
  document.getElementById('minor-deck-count').textContent = gameState.decks.minorCampaign.length;
}

// 渲染中央展示列
function renderCenterDisplay() {
  // 天罡
  const heavenContainer = document.getElementById('center-heaven');
  heavenContainer.innerHTML = '';
  gameState.centerDisplay.heaven.forEach(card => {
    const el = createCardDOM(card, {
      isFaceUp: true,
      onClick: () => {
        const canRecruit = gameState.currentTurn === 'human' && 
                           ((!gameState.turnActionTaken && gameState.activeActionType !== 'deploy') || 
                            (gameState.selectionMode && gameState.selectionMode.type === 'freeDraw'));
        if (canRecruit) {
          recruitCard(card, 'display_heaven', el);
        } else {
          showCardDetail(card);
        }
      }
    });
    heavenContainer.appendChild(el);
  });
  
  // 地煞
  const earthContainer = document.getElementById('center-earth');
  earthContainer.innerHTML = '';
  gameState.centerDisplay.earth.forEach(card => {
    const el = createCardDOM(card, {
      isFaceUp: true,
      onClick: () => {
        const canRecruit = gameState.currentTurn === 'human' && 
                           ((!gameState.turnActionTaken && gameState.activeActionType !== 'deploy') || 
                            (gameState.selectionMode && gameState.selectionMode.type === 'freeDraw'));
        if (canRecruit) {
          recruitCard(card, 'display_earth', el);
        } else {
          showCardDetail(card);
        }
      }
    });
    earthContainer.appendChild(el);
  });
  
  // 重大戰役
  const majorContainer = document.getElementById('center-major');
  majorContainer.innerHTML = '';
  gameState.centerDisplay.majorCampaign.forEach(card => {
    const el = createCardDOM(card, {
      isFaceUp: true,
      onClick: () => {
        // 戰役卡點擊觸發「參與戰役」
        if (gameState.currentTurn === 'human') {
          tryParticipateCampaign(card);
        } else {
          showCardDetail(card);
        }
      }
    });
    majorContainer.appendChild(el);
  });
  
  // 小型戰役
  const minorContainer = document.getElementById('center-minor');
  minorContainer.innerHTML = '';
  gameState.centerDisplay.minorCampaign.forEach(card => {
    const el = createCardDOM(card, {
      isFaceUp: true,
      onClick: () => {
        if (gameState.currentTurn === 'human') {
          tryParticipateCampaign(card);
        } else {
          showCardDetail(card);
        }
      }
    });
    minorContainer.appendChild(el);
  });
}

// ============================================================
// 卡牌飛行動畫系統 (Card Flight Animation System)
// ============================================================

/**
 * Lock UI clicks during animation to prevent double-firing.
 */
function lockUI() {
  let lock = document.getElementById('ui-animation-lock');
  if (!lock) {
    lock = document.createElement('div');
    lock.id = 'ui-animation-lock';
    document.body.appendChild(lock);
  }
}

/**
 * Unlock UI after animation completes.
 */
function unlockUI() {
  const lock = document.getElementById('ui-animation-lock');
  if (lock) lock.remove();
}

/**
 * Burst coloured particles from a screen position.
 * @param {number} cx - Centre X (px, viewport)
 * @param {number} cy - Centre Y (px, viewport)
 * @param {string} color - CSS colour for particles
 */
function particleBurst(cx, cy, color = '#f39c12') {
  const container = document.createElement('div');
  container.className = 'particle-burst';
  container.style.left = cx + 'px';
  container.style.top  = cy + 'px';
  document.body.appendChild(container);
  
  const count = 14;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.background = color;
    const angle = (360 / count) * i;
    const dist  = 40 + Math.random() * 55;
    const dx    = Math.cos(angle * Math.PI / 180) * dist;
    const dy    = Math.sin(angle * Math.PI / 180) * dist;
    p.style.animationDuration = (0.5 + Math.random() * 0.3) + 's';
    p.style.setProperty('--dx', dx + 'px');
    p.style.setProperty('--dy', dy + 'px');
    // Directly set keyframe end via inline style trick
    p.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) scale(0)`, opacity: 0 }
    ], { duration: 600 + Math.random() * 200, easing: 'ease-out', fill: 'forwards' });
    container.appendChild(p);
  }
  
  setTimeout(() => container.remove(), 900);
}

/**
 * Animate a card flying from a source element to a destination element.
 * The actual state update + renderAll() is called via `callback` AFTER the animation.
 *
 * @param {HTMLElement|DOMRect} fromEl - Source element or DOMRect to fly from
 * @param {string|HTMLElement}  toTarget - Target container element or CSS selector string
 * @param {string}  animClass - CSS @keyframes name to apply ('cardFlyToHand' | 'cardFlyToPlayed')
 * @param {string}  imgSrc - image src for the flying clone
 * @param {number}  durationMs - animation duration in ms
 * @param {Function} callback - called when animation ends
 */
function animateCardFly(fromEl, toTarget, animClass, imgSrc, durationMs, callback) {
  // --- Grab source rect ---
  const fromRect = (fromEl instanceof DOMRect) ? fromEl : fromEl.getBoundingClientRect();
  
  // --- Resolve destination rect ---
  let toEl = (typeof toTarget === 'string') ? document.querySelector(toTarget) : toTarget;
  const toRect = toEl ? toEl.getBoundingClientRect() : { left: window.innerWidth/2, top: window.innerHeight/2, width: 95, height: 133 };
  
  // --- Create flying clone ---
  const clone = document.createElement('img');
  clone.src = imgSrc;
  clone.className = 'card-flying-clone';
  clone.style.left   = fromRect.left + 'px';
  clone.style.top    = fromRect.top  + 'px';
  clone.style.width  = fromRect.width + 'px';
  clone.style.height = fromRect.height + 'px';
  document.body.appendChild(clone);
  
  // Lock UI
  lockUI();
  
  // Calculate destination offset (centre of dest container)
  const destX = toRect.left + toRect.width / 2 - fromRect.left - fromRect.width / 2;
  const destY = toRect.top  + toRect.height/ 2 - fromRect.top  - fromRect.height / 2;
  
  // Use Web Animations API for precise control
  const anim = clone.animate([
    { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
    { transform: `translate(${destX * 0.4}px, ${destY * 0.35}px) scale(1.18) rotate(${animClass === 'cardFlyToHand' ? -5 : 7}deg)`, opacity: 0.92, offset: 0.38 },
    { transform: `translate(${destX}px, ${destY}px) scale(0.78) rotate(${animClass === 'cardFlyToHand' ? 3 : -3}deg)`, opacity: 0 }
  ], {
    duration: durationMs,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    fill: 'forwards'
  });
  
  anim.onfinish = () => {
    clone.remove();
    unlockUI();
    if (callback) callback();
  };
}

/**
 * Flash a victory burst on a campaign card element.
 * @param {HTMLElement} cardWrapperEl
 */
function flashCampaignVictory(cardWrapperEl, cx, cy) {
  if (cardWrapperEl) {
    cardWrapperEl.classList.add('campaign-victory-flash');
    setTimeout(() => cardWrapperEl.classList.remove('campaign-victory-flash'), 700);
  }
  particleBurst(cx, cy, '#2ecc71');
}

/**
 * Flash an earth card effect pop on a played card element.
 * @param {HTMLElement} cardWrapperEl
 */
function flashEarthEffect(cardWrapperEl, cx, cy) {
  if (cardWrapperEl) {
    cardWrapperEl.classList.add('earth-effect-pop');
    setTimeout(() => cardWrapperEl.classList.remove('earth-effect-pop'), 650);
  }
  particleBurst(cx, cy, '#3498db');
}

// 延攬豪傑 (抽牌) 行動
function recruitCard(card, sourceType, sourceEl) {
  if (!gameState.gameStarted || gameState.isGameOver) return;
  
  if (gameState.currentTurn !== 'human') {
    showToast('現在是 CPU 的回合！');
    return;
  }
  
  // 如果處於非「免費抽牌 (freeDraw)」的選擇模式中，予以限制
  if (gameState.selectionMode && gameState.selectionMode.type !== 'freeDraw') {
    showToast('請先完成當前卡牌效果選擇！');
    return;
  }
  
  if (gameState.playerActionState === 'finished' && (!gameState.selectionMode || gameState.selectionMode.type !== 'freeDraw')) {
    showToast('你本回合已完成軍略行動，請點擊「結束回合」！');
    return;
  }
  
  // 若已打牌，且非效果發動的「免費抽牌」，則不允許一般延攬
  if (gameState.playerActionState === 'deploy' && (!gameState.selectionMode || gameState.selectionMode.type !== 'freeDraw')) {
    showToast('你本回合已派遣過兵將，無法再延攬豪傑！');
    return;
  }
  
  let cost = 0;
  if (sourceType.includes('earth')) cost = 1;
  if (sourceType.includes('heaven')) cost = 2;
  
  if (gameState.drawPointsRemaining < cost) {
    if (sourceType.includes('heaven') && gameState.drawPointsRemaining === 1) {
      showToast('剩餘抽牌點不足以延攬天罡卡！(需要 2 點)');
    } else {
      showToast('剩餘抽牌點不足！');
    }
    return;
  }
  
  // Capture source rect BEFORE modifying DOM
  let fromRect = null;
  if (sourceEl) {
    const imgEl = sourceEl.querySelector('.card-img') || sourceEl;
    fromRect = imgEl.getBoundingClientRect();
  }
  
  let drawnCard = null;
  if (sourceType === 'display_earth') {
    const idx = gameState.centerDisplay.earth.indexOf(card);
    if (idx !== -1) drawnCard = gameState.centerDisplay.earth.splice(idx, 1)[0];
  } else if (sourceType === 'display_heaven') {
    const idx = gameState.centerDisplay.heaven.indexOf(card);
    if (idx !== -1) drawnCard = gameState.centerDisplay.heaven.splice(idx, 1)[0];
  } else if (sourceType === 'deck_earth') {
    if (gameState.decks.earth.length > 0) {
      drawnCard = gameState.decks.earth.pop();
      // For deck draws, use the deck image container as source
      if (!fromRect) {
        const deckEl = document.querySelector('.deck-row:nth-child(2) .deck-image-container');
        if (deckEl) fromRect = deckEl.getBoundingClientRect();
      }
    } else {
      showToast('地煞牌堆已空！');
      return;
    }
  } else if (sourceType === 'deck_heaven') {
    if (gameState.decks.heaven.length > 0) {
      drawnCard = gameState.decks.heaven.pop();
      if (!fromRect) {
        const deckEl = document.querySelector('.deck-row:nth-child(1) .deck-image-container');
        if (deckEl) fromRect = deckEl.getBoundingClientRect();
      }
    } else {
      showToast('天罡牌堆已空！');
      return;
    }
  }
  
  if (drawnCard) {
    gameState.human.hand.push(drawnCard);
    gameState.drawPointsRemaining -= cost;
    
    // 非特殊抽牌模式才轉移主行動狀態為 recruit
    if (!gameState.selectionMode || gameState.selectionMode.type !== 'freeDraw') {
      gameState.playerActionState = 'recruit';
    }
    
    showToast(`成功延攬【${drawnCard.name || '戰役'}】入麾下！`);
    
    // 如果抽牌點歸零
    const onDrawDone = () => {
      if (gameState.drawPointsRemaining <= 0) {
        if (gameState.selectionMode && gameState.selectionMode.type === 'freeDraw') {
          const cb = gameState.selectionMode.callback;
          cb(); // 回調退出 freeDraw 選擇模式
        } else {
          gameState.playerActionState = 'finished';
          showToast('抽牌點已用盡，請點擊「結束回合」！');
        }
      }
      renderAll();
      
      // 在新渲染後，給最後一張手牌加 land-snap 動畫
      setTimeout(() => {
        const handEl = document.getElementById('player-hand');
        if (handEl) {
          const cards = handEl.querySelectorAll('.card-wrapper');
          const lastCard = cards[cards.length - 1];
          if (lastCard) {
            lastCard.classList.add('card-land-snap');
            setTimeout(() => lastCard.classList.remove('card-land-snap'), 400);
          }
        }
      }, 30);
    };
    
    // 執行飛行動畫 (若有來源位置)
    if (fromRect) {
      const imgSrc = getCardImagePath(drawnCard);
      const handContainer = document.getElementById('player-hand');
      animateCardFly(fromRect, handContainer, 'cardFlyToHand', imgSrc, 480, onDrawDone);
    } else {
      onDrawDone();
    }
  }
}

// 渲染玩家手牌
function renderPlayerHand() {
  const container = document.getElementById('player-hand');
  container.innerHTML = '';
  
  if (gameState.currentTurn === 'cpu' && !gameState.selectionMode) {
    container.classList.add('disabled-interaction');
  } else {
    container.classList.remove('disabled-interaction');
  }
  
  gameState.human.hand.forEach((card, index) => {
    const el = createCardDOM(card, {
      isFaceUp: true,
      onClick: () => {
        // 如果在選擇模式中
        if (gameState.selectionMode) {
          const mode = gameState.selectionMode;
          // 額外出牌模式
          if (mode.type === 'freePlay' && mode.eligibleIndices.includes(index)) {
            mode.callback(index);
            return;
          }
          // 棄牌觸發模式
          if (mode.type === 'discardToTrigger' && mode.eligibleIndices.includes(index)) {
            mode.callback(index);
            return;
          }
          return;
        }
        playCard(index);
      }
    });
    
    // 如果在選擇模式中，套用高亮或灰置樣式
    if (gameState.selectionMode) {
      const cardImg = el.querySelector('.card-img');
      const mode = gameState.selectionMode;
      
      if (mode.type === 'freePlay') {
        if (mode.eligibleIndices.includes(index)) {
          cardImg.classList.add('card-highlight-revive');
        } else {
          cardImg.classList.add('card-dimmed');
        }
      } else if (mode.type === 'discardToTrigger') {
        if (mode.eligibleIndices.includes(index)) {
          cardImg.classList.add('card-highlight-cost'); // 棄牌高亮
        } else {
          cardImg.classList.add('card-dimmed');
        }
      } else {
        cardImg.classList.add('card-dimmed');
      }
    }
    
    container.appendChild(el);
  });
}

// 渲染玩家出牌區
function renderPlayerPlayed() {
  const container = document.getElementById('player-played');
  container.innerHTML = '';
  
  // 取得當前的有效符號狀態（包含水軍的轉換選項）
  const stats = getEffectiveSymbols('human');
  const waterOptions = stats.waterOptions;
  
  gameState.human.playedArea.forEach((playedItem, index) => {
    const el = createCardDOM(playedItem.card, {
      isFaceUp: true,
      isPlayed: true,
      playedState: playedItem.state,
      playedItem: playedItem,
      waterOptions: waterOptions,
      onClick: () => {
        // 1. 如果在選擇模式中
        if (gameState.selectionMode) {
          const mode = gameState.selectionMode;
          // 手動戰役選派將領模式
          if (mode.type === 'campaignSelection') {
            if (playedItem.state === 'active' || playedItem.state === 'inverted') {
              const selIdx = mode.selectedIndices.indexOf(index);
              if (selIdx !== -1) {
                mode.selectedIndices.splice(selIdx, 1); // 取消選擇
              } else {
                mode.selectedIndices.push(index); // 選擇
              }
              renderAll();
            }
            return;
          }
          // 天罡力竭支付模式
          if (mode.type === 'exhaust' && mode.eligibleIndices.includes(index)) {
            gameState.human.playedArea[index].previousState = gameState.human.playedArea[index].state;
            gameState.human.playedArea[index].state = 'exhausted';
            showToast(`力竭了【${playedItem.card.name}】！`);
            
            if (mode.handIndex !== -1) {
              gameState.human.hand.splice(mode.handIndex, 1);
            }
            gameState.human.playedArea.push({
              card: mode.cardToPlay,
              state: 'active'
            });
            
            exitSelectionMode();
            if (mode.isFreePlay) {
              if (mode.onPlayFinished) {
                mode.onPlayFinished();
              }
            } else {
              completeMilitaryAction();
            }
            return;
          }
          // 異能觸發力竭模式 (例如使一名後勤兵將力竭以觸發效果)
          if (mode.type === 'exhaustToTrigger' && mode.eligibleIndices.includes(index)) {
            gameState.human.playedArea[index].previousState = gameState.human.playedArea[index].state;
            gameState.human.playedArea[index].state = 'exhausted';
            showToast(`力竭了【${playedItem.card.name}】以滿足效果代價！`);
            mode.callback();
            return;
          }
          // 復甦模式
          if (mode.type === 'revive' && mode.eligibleIndices.includes(index)) {
            mode.callback(index);
            return;
          }
          return;
        }
        
        // 2. 正常情況下點擊，顯示詳細資訊，不可隨意旋轉
        showCardDetail(playedItem.card);
      }
    });
    
    // 選擇模式下的特殊高亮
    if (gameState.selectionMode) {
      const cardImg = el.querySelector('.card-img');
      const mode = gameState.selectionMode;
      
      if (mode.type === 'campaignSelection') {
        if (mode.selectedIndices.includes(index)) {
          cardImg.classList.add('card-highlight-cost'); // 已選擇：金光高亮
        } else if (playedItem.state === 'active' || playedItem.state === 'inverted') {
          cardImg.classList.remove('card-dimmed'); // 可選擇但未選：正常顯示
        } else {
          cardImg.classList.add('card-dimmed'); // 力竭狀態：灰置
        }
      } else if (mode.type === 'exhaust' || mode.type === 'exhaustToTrigger') {
        if (mode.eligibleIndices.includes(index)) {
          cardImg.classList.add('card-highlight-cost');
        } else {
          cardImg.classList.add('card-dimmed');
        }
      } else if (mode.type === 'revive') {
        if (mode.eligibleIndices.includes(index)) {
          cardImg.classList.add('card-highlight-revive');
        } else {
          cardImg.classList.add('card-dimmed');
        }
      } else {
        cardImg.classList.add('card-dimmed');
      }
    }
    
    container.appendChild(el);
  });
}

// 處理派遣天罡卡的力竭代價與派遣
function payHeavenCostAndPlay(card, isFreePlay = false, handIndex = -1, onPlayFinished = null) {
  const costSymbol = card.exhaustCost;
  
  // 尋找玩家出牌區中具備該符號的「活躍」兵將索引
  const eligibleIndices = [];
  gameState.human.playedArea.forEach((item, index) => {
    if (item.state === 'active') {
      if (item.card.symbols.includes(costSymbol)) {
        eligibleIndices.push(index);
      }
    } else if (item.state === 'inverted') {
      if (item.card.invertedSymbols && item.card.invertedSymbols.includes(costSymbol)) {
        eligibleIndices.push(index);
      }
    }
  });
  
  if (eligibleIndices.length === 0) {
    showToast(`出牌失敗！需要力竭一位具備【${costSymbol}】符號的活躍兵將！`);
    return;
  }
  
  // 進入力竭代價選擇模式
  enterSelectionMode({
    type: 'exhaust',
    eligibleIndices: eligibleIndices,
    cardToPlay: card,
    handIndex: handIndex,
    isFreePlay: isFreePlay,
    onPlayFinished: onPlayFinished,
    message: `【${card.name}】派遣代價：請點擊出牌區中高亮【金光】的活躍兵將以進行「力竭」`
  });
}

// 渲染 CPU 手牌
function renderCPUHand() {
  const container = document.getElementById('cpu-hand');
  container.innerHTML = '';
  
  gameState.cpu.hand.forEach(card => {
    // CPU手牌顯示背面
    const el = createCardDOM(card, {
      isFaceUp: false,
      isCPU: true
    });
    container.appendChild(el);
  });
}

// 渲染 CPU 出牌區
function renderCPUPlayed() {
  const container = document.getElementById('cpu-played');
  container.innerHTML = '';
  
  gameState.cpu.playedArea.forEach((playedItem, index) => {
    const el = createCardDOM(playedItem.card, {
      isFaceUp: true,
      isPlayed: true,
      playedState: playedItem.state,
      isCPU: true,
      onClick: () => showCardDetail(playedItem.card)
    });
    container.appendChild(el);
  });
}

// 判斷玩家是否滿足地煞卡的倒置觸發條件
function checkTriggerCondition(condition) {
  if (!condition || condition === '-' || condition === '無') return false;
  
  // 收集玩家出牌區所有「活躍」兵將的符號
  const activeSymbols = [];
  gameState.human.playedArea.forEach(item => {
    if (item.state === 'active') {
      activeSymbols.push(...item.card.symbols);
    } else if (item.state === 'inverted') {
      activeSymbols.push(...(item.card.invertedSymbols || []));
    }
  });
  
  if (condition.includes('步軍與斥侯') || condition.includes('步軍和斥侯')) {
    return activeSymbols.includes('步軍') && activeSymbols.includes('斥侯');
  }
  if (condition.includes('步軍與後勤') || condition.includes('步軍和後勤')) {
    return activeSymbols.includes('步軍') && activeSymbols.includes('後勤');
  }
  if (condition.includes('統御與後勤') || condition.includes('統御和後勤')) {
    return activeSymbols.includes('統御') && activeSymbols.includes('後勤');
  }
  if (condition.includes('步軍與水軍') || condition.includes('步軍和水軍')) {
    return activeSymbols.includes('步軍') && activeSymbols.includes('水軍');
  }
  if (condition.includes('步軍與步軍')) {
    return activeSymbols.filter(s => s === '步軍').length >= 2;
  }
  if (condition.includes('後勤與後勤')) {
    return activeSymbols.filter(s => s === '後勤').length >= 2;
  }
  if (condition.includes('統御符號') || condition.includes('具備統御')) {
    return activeSymbols.includes('統御');
  }
  if (condition.includes('步軍符號') || condition.includes('具備步軍')) {
    return activeSymbols.includes('步軍');
  }
  if (condition.includes('騎軍符號') || condition.includes('具備騎軍')) {
    return activeSymbols.includes('騎軍');
  }
  
  return false;
}

// 進入互動選擇模式，高亮符合條件的卡牌
// 進入互動選擇模式，高亮符合條件的卡牌
function enterSelectionMode(mode) {
  gameState.selectionMode = mode;
  renderAll();
}

// 結束選擇模式
function exitSelectionMode() {
  gameState.selectionMode = null;
  const banner = document.getElementById('interaction-banner');
  if (banner) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
  }
  renderAll();
}

// 渲染互動橫幅與控制面板
function renderInteractionBanner() {
  const banner = document.getElementById('interaction-banner');
  if (!banner) return;
  
  if (!gameState.selectionMode) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    return;
  }
  
  banner.classList.remove('hidden');
  const mode = gameState.selectionMode;
  
  if (mode.type === 'campaignSelection') {
    const campaignCard = mode.campaignCard;
    const reqs = campaignCard.requirements;
    
    // 1. 計算套用折抵後的賸餘需求
    const remainingReqs = { ...reqs };
    const playerDiscounts = gameState.human.campaignDiscounts || [];
    
    for (const discIdx in mode.selectedDiscounts) {
      const chosenSym = mode.selectedDiscounts[discIdx];
      if (chosenSym && remainingReqs[chosenSym] > 0) {
        remainingReqs[chosenSym]--;
      }
    }
    
    // 2. 格式化需求顯示文字
    const reqParts = [];
    for (const sym in reqs) {
      const total = reqs[sym];
      const remaining = remainingReqs[sym] || 0;
      if (remaining === 0) {
        reqParts.push(`<span class="req-satisfied">${sym} x${total} (已滿足)</span>`);
      } else {
        reqParts.push(`<span class="req-pending">${sym} x${remaining}</span>`);
      }
    }
    
    // 3. 格式化已選武將資訊
    const stats = getEffectiveSymbols('human');
    const selectedCards = mode.selectedIndices.map(idx => {
      const effCard = stats.activeCards.find(c => c.index === idx);
      if (effCard) return effCard;
      
      // Fallback for exhausted or other edge cases
      const item = gameState.human.playedArea[idx];
      return {
        index: idx,
        name: item.card.name,
        symbols: item.state === 'active' ? item.card.symbols : (item.card.invertedSymbols || [])
      };
    });
    
    const cardNames = selectedCards.map(c => c.name).join('、') || '無';
    
    // 4. 驗證目前選擇的武將組合是否完全且剛好滿足需求
    const path = canPayCampaignRequirements(selectedCards, remainingReqs);
    const isSuccess = path && path.length === selectedCards.length;
    
    // 5. 渲染戰役減免折抵下拉選單
    let discountsHtml = '';
    if (playerDiscounts.length > 0) {
      discountsHtml += `<div class="discount-container" style="margin-top: 8px; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">`;
      playerDiscounts.forEach((discOptions, idx) => {
        const selectedVal = mode.selectedDiscounts[idx] || '';
        discountsHtml += `
          <div class="discount-item" style="display: flex; align-items: center; gap: 5px;">
            <span style="color: var(--color-gold); font-size: 0.9rem;">【減免效果 #${idx + 1}】</span>
            <select class="discount-select" onchange="onCampaignDiscountChange(${idx}, this.value)" style="background: #121216; color: #f0f0f5; border: 1px solid var(--color-gold); border-radius: 4px; padding: 2px 8px; cursor: pointer; outline: none; font-family: inherit;">
              <option value="">--不使用減免--</option>
              ${discOptions.map(opt => `<option value="${opt}" ${selectedVal === opt ? 'selected' : ''}>減免 ${opt}</option>`).join('')}
            </select>
          </div>
        `;
      });
      discountsHtml += `</div>`;
    }
    
    banner.innerHTML = `
      <div class="campaign-selection-banner-content" style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
        <div style="font-weight: bold; font-size: 1.1rem; color: var(--color-gold);">
          ⚔️ 正在參與戰役：【${campaignCard.name || campaignCard.id}】（${campaignCard.type}）
        </div>
        <div>
          <strong>戰役軍力需求：</strong> ${reqParts.join('， ')}
        </div>
        <div>
          <strong>已選派武將：</strong> <span style="color: var(--color-cyan); font-weight: bold;">${cardNames}</span>
        </div>
        ${discountsHtml}
        <div style="margin-top: 6px; display: flex; gap: 15px;">
          <button id="btn-confirm-campaign" class="btn-primary-small ${isSuccess ? '' : 'disabled'}" onclick="confirmCampaignParticipation()" ${isSuccess ? '' : 'disabled'} style="padding: 6px 16px; font-weight: bold;">確定參與戰役</button>
          <button id="btn-cancel-campaign" class="btn-secondary" onclick="cancelCampaignParticipation()" style="padding: 4px 14px; font-size: 0.9rem; min-height: unset; height: auto;">取消</button>
        </div>
      </div>
    `;
  } else {
    // 一般文字提示橫幅 (復甦、免費出牌、棄牌等)
    banner.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; gap: 15px; width: 100%;">
        <span>${mode.message}</span>
        ${(mode.type === 'freePlay' || mode.type === 'discardToTrigger' || mode.type === 'exhaustToTrigger' || mode.type === 'revive' || mode.type === 'freeDraw') ? `
          <button onclick="cancelCurrentSelectionMode()" style="background: #3a1a1a; color: #ff8888; border: 1px solid #7a2a2a; padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: bold; transition: var(--transition-smooth);" onmouseover="this.style.background='#5a2a2a'" onmouseout="this.style.background='#3a1a1a'">放棄/跳過</button>
        ` : ''}
      </div>
    `;
  }
}

// 取得目前出牌區的有效符號與活躍卡牌 (支援天罡卡水軍動態轉換與軍師符號)
function getEffectiveSymbols(playerKey) {
  const area = gameState[playerKey].playedArea;
  const symbolMap = { '步軍': '步軍', '水軍': '水軍', '騎軍': '騎軍', '統御': '統御', '斥侯': '斥侯', '後勤': '後勤', '戰役': '戰役' };
  
  // 1. 收集水軍的可用選項 (基於阮氏兄弟)
  const waterOptions = new Set(['水軍']);
  area.forEach(item => {
    if (item.state === 'active') {
      const effect = item.card.specialEffect || '';
      if (effect.includes('水軍符號便可以視為斥侯符號來使用')) waterOptions.add('斥侯');
      if (effect.includes('水軍符號便可以視為騎軍符號來使用')) waterOptions.add('騎軍');
      if (effect.includes('水軍符號便可以視為步軍符號來使用')) waterOptions.add('步軍');
      if (effect.includes('水軍符號便可以視為統御符號來使用')) waterOptions.add('統御');
    }
  });

  const activeSymbols = [];
  const totalSymbols = [];
  let activeCounselorCount = 0;
  let totalCounselorCount = 0;
  const activeCards = [];
  const counselors = ["朱武", "蕭讓", "裴宣", "蔣敬"];
  
  area.forEach((item, index) => {
    const isCounselor = counselors.includes(item.card.name) || (item.card.specialEffect && item.card.specialEffect.includes("梁山軍師群"));
    
    // 決定軍師當前啟用的符號
    let counselorSymbol = null;
    if (isCounselor) {
      if (!item.currentCounselorSymbol && item.card.symbols && item.card.symbols.length > 0) {
        item.currentCounselorSymbol = item.card.symbols[0]; // 預設使用第一個
      }
      counselorSymbol = item.currentCounselorSymbol;
    }
    
    // 決定該卡牌的水軍符號當前被轉換成什麼
    let waterSymbol = '水軍';
    if (item.waterTransformation && waterOptions.has(item.waterTransformation)) {
      waterSymbol = item.waterTransformation;
    } else {
      item.waterTransformation = '水軍'; // 重設或預設為水軍
    }
    
    // 將該卡牌的原始符號映射為轉換後的符號 (水軍 -> waterSymbol)
    const mapCardSymbol = (sym) => {
      if (sym === '水軍') return waterSymbol;
      return sym;
    };
    
    // 累積總計 (所有卡牌)
    if (isCounselor) {
      totalCounselorCount++;
      if (counselorSymbol) totalSymbols.push(mapCardSymbol(counselorSymbol));
    } else {
      const allSyms = (item.state === 'inverted' && item.card.invertedSymbols) ? item.card.invertedSymbols : (item.card.symbols || []);
      allSyms.forEach(sym => totalSymbols.push(mapCardSymbol(sym)));
    }
    
    // 活躍可用
    let syms = [];
    if (item.state === 'active') {
      if (isCounselor) {
        activeCounselorCount++;
        if (counselorSymbol) syms.push(counselorSymbol);
      } else {
        syms = item.card.symbols || [];
      }
    } else if (item.state === 'inverted') {
      syms = item.card.invertedSymbols || [];
    }
    
    // 套用轉換並加入 activeCards 供發動戰役檢核
    const effectiveSyms = syms.map(mapCardSymbol);
    effectiveSyms.forEach(sym => activeSymbols.push(sym));
    
    if (item.state === 'active' || item.state === 'inverted') {
      activeCards.push({
        index: index,
        name: item.card.name,
        symbols: effectiveSyms
      });
    }
  });
  
  return { activeSymbols, totalSymbols, activeCounselorCount, totalCounselorCount, activeCards, waterOptions: Array.from(waterOptions) };
}

// 減免下拉選單值改變時的回調
function onCampaignDiscountChange(discountIdx, value) {
  if (gameState.selectionMode && gameState.selectionMode.type === 'campaignSelection') {
    if (value === "") {
      delete gameState.selectionMode.selectedDiscounts[discountIdx];
    } else {
      gameState.selectionMode.selectedDiscounts[discountIdx] = value;
    }
    renderAll();
  }
}

// 放棄或跳過當前選擇模式
function cancelCurrentSelectionMode() {
  const mode = gameState.selectionMode;
  exitSelectionMode();
  if (mode && mode.cancelCallback) {
    mode.cancelCallback();
  }
}

// 取消戰役參與
function cancelCampaignParticipation() {
  exitSelectionMode();
}

// 確定參與戰役並扣除代價
function confirmCampaignParticipation() {
  if (gameState.isGameOver) return;
  const mode = gameState.selectionMode;
  if (!mode || mode.type !== 'campaignSelection') return;
  
  const campaignCard = mode.campaignCard;
  
  // 扣除代價：力竭所選武將
  mode.selectedIndices.forEach(idx => {
    gameState.human.playedArea[idx].previousState = gameState.human.playedArea[idx].state;
    gameState.human.playedArea[idx].state = 'exhausted';
  });
  
  // 從中央展示列移除該戰役卡
  let removed = false;
  let idx = gameState.centerDisplay.minorCampaign.indexOf(campaignCard);
  if (idx !== -1) {
    gameState.centerDisplay.minorCampaign.splice(idx, 1);
    removed = true;
  } else {
    idx = gameState.centerDisplay.majorCampaign.indexOf(campaignCard);
    if (idx !== -1) {
      gameState.centerDisplay.majorCampaign.splice(idx, 1);
      removed = true;
    }
  }
  
  if (removed) {
    // 加入玩家已奪取的戰役卡
    gameState.human.wonCampaigns.push(campaignCard);
    gameState.turnFreeActionTaken = true; // 標記已執行自由行動
    showToast(`🎉 成功參與戰役並奪取了戰役卡！`);
    
    // 清空本次回合的戰役減免
    gameState.human.campaignDiscounts = [];
    
    exitSelectionMode();
    calculateScore();
    renderAll();
    
    // 戰役勝利特效：在渲染後閃爍已奪取的戰役卡
    setTimeout(() => {
      const wonArea = document.getElementById('player-won-campaigns');
      if (wonArea) {
        const wonCards = wonArea.querySelectorAll('.card-wrapper');
        const lastWon = wonCards[wonCards.length - 1];
        if (lastWon) {
          const rect = lastWon.getBoundingClientRect();
          flashCampaignVictory(lastWon, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
      }
    }, 100);
    
    // 結算小型戰役卡立即獎勵
    if (campaignCard.type === '小型戰役') {
      setTimeout(() => resolveCampaignReward(campaignCard), 200);
    }
  }
}

// 渲染已奪取的戰役卡區
function renderWonCampaigns() {
  const playerContainer = document.getElementById('player-won-campaigns');
  const cpuContainer = document.getElementById('cpu-won-campaigns');
  
  if (playerContainer) {
    playerContainer.innerHTML = '';
    gameState.human.wonCampaigns.forEach(card => {
      const el = createCardDOM(card, {
        isFaceUp: true,
        onClick: () => showCardDetail(card)
      });
      el.classList.add('won-campaign-card');
      playerContainer.appendChild(el);
    });
  }
  
  if (cpuContainer) {
    cpuContainer.innerHTML = '';
    gameState.cpu.wonCampaigns.forEach(card => {
      const el = createCardDOM(card, {
        isFaceUp: true,
        isCPU: true,
        onClick: () => showCardDetail(card)
      });
      el.classList.add('won-campaign-card');
      cpuContainer.appendChild(el);
    });
  }
}

// 完成本回合軍略行動 (二擇一)
function completeMilitaryAction() {
  gameState.turnActionTaken = true;
  gameState.activeActionType = 'deploy';
  gameState.playerActionState = 'finished';
  showToast('軍略行動已完成！可執行參與戰役，或點擊結束回合。');
  renderAll();
  
  // 出牌區張數檢查，若玩家已滿 12 張則觸發最後一輪
  if (gameState.human.playedArea.length >= 12) {
    showToast('🎉 玩家出牌區已達 12 張或以上兵將，此輪將是遊戲的最後一輪！');
  }
}

// 檢查玩家出牌區是否滿足特定現場符號條件 (處理軍師卡與普通卡)
function checkPresenceCondition(playerKey, condition) {
  if (!condition || condition === '-' || condition === '無') return false;
  
  const stats = getEffectiveSymbols(playerKey);
  const activeSymbols = stats.activeSymbols;
  const activeCards = stats.activeCards;
  
  // 解析條件所需符號與數量
  const reqSymbols = {
    '統御': 0, '步軍': 0, '騎軍': 0, '水軍': 0, '斥侯': 0, '後勤': 0
  };
  
  for (const sym in reqSymbols) {
    if (condition.includes(sym)) {
      let count = 0;
      if (condition.includes(`三枚${sym}`) || condition.includes(`${sym}、${sym}與${sym}`) || condition.includes(`${sym}和${sym}和${sym}`)) {
        count = 3;
      } else if (condition.includes(`兩枚${sym}`) || condition.includes(`${sym}與${sym}`) || condition.includes(`${sym}和${sym}`) || condition.includes(`兩個${sym}`) || condition.includes(`2個${sym}`)) {
        count = 2;
      } else {
        count = 1;
      }
      reqSymbols[sym] = count;
    }
  }
  
  const reqs = {};
  for (const sym in reqSymbols) {
    if (reqSymbols[sym] > 0) {
      reqs[sym] = reqSymbols[sym];
    }
  }
  
  if (Object.keys(reqs).length === 0) return false;
  
  const matches = canPayCampaignRequirements(activeCards, reqs);
  return matches !== null;
}

// 判斷玩家是否滿足地煞卡的倒置/觸發條件
function checkTriggerCondition(condition, playerKey = 'human') {
  return checkPresenceCondition(playerKey, condition);
}

// 解析立即效果為步驟陣列
function parseImmediateEffect(effectText) {
  const steps = [];
  if (!effectText || effectText === '-' || effectText === '無') return steps;
  
  // 將效果文字按中文分號或句號拆分，逐句進行獨立解析，防範前段「復甦任意」受後段「打出步軍」等關鍵字全局污染
  const parts = effectText.split(/[；。]/);
  
  parts.forEach(part => {
    part = part.trim();
    if (!part) return;
    
    // 1. 復甦步驟
    if (part.includes('復甦')) {
      const allowedSymbols = [];
      if (part.includes('步軍')) allowedSymbols.push('步軍');
      if (part.includes('後勤')) allowedSymbols.push('後勤');
      if (part.includes('騎軍')) allowedSymbols.push('騎軍');
      if (part.includes('水軍')) allowedSymbols.push('水軍');
      if (part.includes('斥侯')) allowedSymbols.push('斥侯');
      if (part.includes('統御')) allowedSymbols.push('統御');
      
      let count = 1;
      if (part.includes('兩名') || part.includes('2名') || part.includes('兩位') || part.includes('2位') || part.includes('任意兩') || part.includes('兩名')) {
        count = 2;
      }
      steps.push({
        type: 'revive',
        allowedSymbols: allowedSymbols,
        count: count
      });
    }
    
    // 2. 免費打出步驟
    if (part.includes('打出一張') || part.includes('打出')) {
      let reqSymbol = '';
      if (part.includes('水軍')) reqSymbol = '水軍';
      if (part.includes('統御')) reqSymbol = '統御';
      if (part.includes('騎軍')) reqSymbol = '騎軍';
      if (part.includes('步軍')) reqSymbol = '步軍';
      if (part.includes('斥侯')) reqSymbol = '斥侯';
      if (part.includes('後勤')) reqSymbol = '後勤';
      
      steps.push({
        type: 'freePlay',
        symbol: reqSymbol
      });
    }
    
    // 3. 抽牌步驟
    if (part.includes('抽牌點') || part.includes('獲取卡片') || part.includes('加抽') || part.includes('抽牌')) {
      let pts = 1;
      if (part.includes('4點') || part.includes('4 點') || part.includes('4張') || part.includes('4 張')) pts = 4;
      else if (part.includes('3點') || part.includes('3 點') || part.includes('3張') || part.includes('3 張')) pts = 3;
      else if (part.includes('2點') || part.includes('2 點') || part.includes('2張') || part.includes('2 張')) pts = 2;
      
      steps.push({
        type: 'freeDraw',
        points: pts
      });
    }
    
    // 4. 戰役減免步驟
    if (part.includes('減免')) {
      const syms = [];
      if (part.includes('步軍')) syms.push('步軍');
      if (part.includes('水軍')) syms.push('水軍');
      if (part.includes('騎軍')) syms.push('騎軍');
      if (part.includes('後勤')) syms.push('後勤');
      if (part.includes('斥侯')) syms.push('斥侯');
      if (part.includes('統御')) syms.push('統御');
      
      steps.push({
        type: 'campaignDiscount',
        symbols: syms
      });
    }
  });
  
  return steps;
}

// 執行步驟處理鏈
function runEffectSteps(playerKey, steps, onComplete) {
  if (steps.length === 0) {
    onComplete();
    return;
  }
  
  const step = steps[0];
  const remainingSteps = steps.slice(1);
  
  if (step.type === 'revive') {
    const allowed = step.allowedSymbols;
    const eligibleIndices = [];
    gameState[playerKey].playedArea.forEach((item, idx) => {
      if (item.state === 'exhausted') {
        if (allowed.length === 0) {
          eligibleIndices.push(idx);
        } else {
          const hasSymbol = item.card.symbols.some(s => allowed.includes(s));
          if (hasSymbol) eligibleIndices.push(idx);
        }
      }
    });
    
    if (eligibleIndices.length === 0) {
      showToast(`${playerKey === 'human' ? '出牌區無符合條件的力竭兵將，無法執行復甦。' : 'CPU 無符合條件的力竭兵將。'}`);
      runEffectSteps(playerKey, remainingSteps, onComplete);
      return;
    }
    
    if (playerKey === 'human') {
      let reviveCount = step.count;
      function startReviveSelection() {
        if (reviveCount <= 0 || eligibleIndices.length === 0) {
          exitSelectionMode();
          runEffectSteps(playerKey, remainingSteps, onComplete);
          return;
        }
        
        enterSelectionMode({
          type: 'revive',
          eligibleIndices: eligibleIndices,
          message: `【復甦效果】請點選出牌區中高亮【金光】的力竭兵將進行復甦 (剩餘: ${reviveCount} 次，必須具備: ${allowed.join('或') || '任意'} 符號)`,
          callback: (targetIdx) => {
            gameState[playerKey].playedArea[targetIdx].state = gameState[playerKey].playedArea[targetIdx].previousState || 'active';
            showToast(`已復甦【${gameState[playerKey].playedArea[targetIdx].card.name}】！`);
            
            const pos = eligibleIndices.indexOf(targetIdx);
            if (pos !== -1) eligibleIndices.splice(pos, 1);
            
            reviveCount--;
            startReviveSelection();
          },
          cancelCallback: () => {
            runEffectSteps(playerKey, remainingSteps, onComplete);
          }
        });
      }
      startReviveSelection();
    } else {
      const countToRevive = Math.min(step.count, eligibleIndices.length);
      for (let i = 0; i < countToRevive; i++) {
        const idx = eligibleIndices[i];
        gameState[playerKey].playedArea[idx].state = gameState[playerKey].playedArea[idx].previousState || 'active';
        showToast(`⚠️ CPU 復甦了【${gameState[playerKey].playedArea[idx].card.name}】！`);
      }
      runEffectSteps(playerKey, remainingSteps, onComplete);
    }
  }
  else if (step.type === 'freePlay') {
    const sym = step.symbol;
    const eligibleIndices = [];
    gameState[playerKey].hand.forEach((handCard, idx) => {
      if (handCard.symbols.includes(sym)) {
        // 如果是天罡卡，必須檢查是否付得出代價（出牌區有對應的活躍符號可供力竭）
        if (handCard.type === '天罡卡') {
          const costSym = handCard.exhaustCost;
          const hasEligibleExhaust = gameState[playerKey].playedArea.some(item => {
            if (item.state === 'active' && item.card.symbols.includes(costSym)) return true;
            if (item.state === 'inverted' && item.card.invertedSymbols && item.card.invertedSymbols.includes(costSym)) return true;
            return false;
          });
          if (hasEligibleExhaust) {
            eligibleIndices.push(idx);
          }
        } else {
          eligibleIndices.push(idx);
        }
      }
    });
    
    if (eligibleIndices.length === 0) {
      showToast(`${playerKey === 'human' ? '手牌中無具備【' + sym + '】且能支付代價的卡牌，無法執行額外出牌。' : 'CPU 無符合額外出牌手牌。'}`);
      runEffectSteps(playerKey, remainingSteps, onComplete);
      return;
    }
    
    if (playerKey === 'human') {
      enterSelectionMode({
        type: 'freePlay',
        eligibleIndices: eligibleIndices,
        message: `【額外出牌】請點選手牌中具備【${sym}】符號的卡牌進行免費打出`,
        callback: (handIdx) => {
          const freeCard = gameState[playerKey].hand[handIdx];
          exitSelectionMode();
          if (freeCard.type === '地煞卡') {
            playEarthCardWithEffect(freeCard, handIdx, true, playerKey, () => {
              runEffectSteps(playerKey, remainingSteps, onComplete);
            });
          } else if (freeCard.type === '天罡卡') {
            payHeavenCostAndPlay(freeCard, true, handIdx, () => {
              runEffectSteps(playerKey, remainingSteps, onComplete);
            });
          }
        },
        cancelCallback: () => {
          runEffectSteps(playerKey, remainingSteps, onComplete);
        }
      });
    } else {
      const handIdx = eligibleIndices[0];
      const freeCard = gameState[playerKey].hand[handIdx];
      showToast(`⚠️ CPU 免費派遣了【${freeCard.name}】！`);
      if (freeCard.type === '地煞卡') {
        playEarthCardWithEffect(freeCard, handIdx, true, playerKey, () => {
          runEffectSteps(playerKey, remainingSteps, onComplete);
        });
      } else {
        // CPU 免費派遣天罡卡也必須支付力竭代價
        payHeavenCostAndPlayForCpu(freeCard, false, handIdx);
        runEffectSteps(playerKey, remainingSteps, onComplete);
      }
    }
  }
  else if (step.type === 'freeDraw') {
    const pts = step.points;
    if (playerKey === 'human') {
      gameState.drawPointsRemaining = pts;
      gameState.activeActionType = 'recruit';
      
      enterSelectionMode({
        type: 'freeDraw',
        drawCountNeeded: pts,
        message: `獲得 ${pts} 點免費延攬機會！請點選中央展示列或牌背抽地煞卡`,
        callback: () => {
          exitSelectionMode();
          runEffectSteps(playerKey, remainingSteps, onComplete);
        },
        cancelCallback: () => {
          runEffectSteps(playerKey, remainingSteps, onComplete);
        }
      });
    } else {
      for (let i = 0; i < pts; i++) {
        if (gameState.decks.earth.length > 0) {
          gameState.cpu.hand.push(gameState.decks.earth.pop());
        }
      }
      showToast(`⚠️ CPU 獲得 ${pts} 張免費抽牌！`);
      runEffectSteps(playerKey, remainingSteps, onComplete);
    }
  }
  else if (step.type === 'campaignDiscount') {
    if (!gameState[playerKey].campaignDiscounts) {
      gameState[playerKey].campaignDiscounts = [];
    }
    gameState[playerKey].campaignDiscounts.push(step.symbols);
    showToast(`${playerKey === 'human' ? '獲得' : 'CPU 獲得'} 戰役符號減免: 【${step.symbols.join('或')}】`);
    runEffectSteps(playerKey, remainingSteps, onComplete);
  }
}

// 核心卡牌效果管理器
function playEarthCardWithEffect(card, handIndex, isFreePlay, playerKey, onPlayFinished) {
  const condition = card.triggerCondition || '-';
  const hand = gameState[playerKey].hand;
  
  // 1. 從手牌移除卡牌 (避免後續棄牌等操作導致索引位移)
  if (handIndex !== -1 && playerKey === 'human') {
    hand.splice(handIndex, 1);
  } else {
    const idx = hand.indexOf(card);
    if (idx !== -1) hand.splice(idx, 1);
  }
  
  function moveCardToPlayed(triggerActivated) {
    // 2. 決定是否倒置打出
    let state = 'active';
    if (triggerActivated && card.immediateEffect.includes('倒置')) {
      state = 'inverted';
      showToast(`${playerKey === 'human' ? '【' + card.name + '】' : 'CPU ' + card.name} 倒置打出，解鎖雙軍力！`);
    } else {
      if (playerKey === 'human' && !isFreePlay) {
        showToast(`以普通將領派遣【${card.name}】。`);
      }
    }
    
    // 3. 放至出牌區
    gameState[playerKey].playedArea.push({
      card: card,
      state: state
    });
    
    renderAll();
    calculateScore();
    
    // 4. 觸發後續的立即效果
    if (triggerActivated) {
      if (card.immediateEffect.includes('倒置')) {
        onPlayFinished();
      } else {
        const steps = parseImmediateEffect(card.immediateEffect);
        runEffectSteps(playerKey, steps, onPlayFinished);
      }
    } else {
      onPlayFinished();
    }
  }

  // 1. 無條件直接生效
  if (condition === '-' || condition === '無') {
    moveCardToPlayed(true);
    return;
  }
  
  // 2. 棄牌觸發條件
  if (condition.includes('棄掉')) {
    let reqs = [];
    if (condition.includes('步軍')) reqs.push('步軍');
    if (condition.includes('騎軍')) reqs.push('騎軍');
    if (condition.includes('斥侯')) reqs.push('斥侯');
    if (condition.includes('後勤')) reqs.push('後勤');
    if (condition.includes('統御')) reqs.push('統御');
    
    const isDouble = reqs.length >= 2 && condition.includes('與');
    
    if (playerKey === 'human') {
      const eligibleIndices = [];
      hand.forEach((hc, idx) => {
        eligibleIndices.push(idx);
      });
      
      if (isDouble) {
        const symA = reqs[0];
        const symB = reqs[1];
        let pathFound = false;
        for (let i = 0; i < eligibleIndices.length; i++) {
          for (let j = 0; j < eligibleIndices.length; j++) {
            if (i !== j) {
              const idx1 = eligibleIndices[i];
              const idx2 = eligibleIndices[j];
              if (hand[idx1].symbols.includes(symA) && hand[idx2].symbols.includes(symB)) {
                pathFound = true;
                break;
              }
            }
          }
          if (pathFound) break;
        }
        
        if (pathFound) {
          if (confirm(`【${card.name}】效果觸發確認：\n是否支付代價（棄掉一張【${symA}】手牌與一張【${symB}】手牌）以發動效果？\n\n（點擊「確定」發動效果並支付代價；點擊「取消」則不發動效果，直接將此卡派遣至出牌區）`)) {
            const matchA = eligibleIndices.filter(idx => hand[idx].symbols.includes(symA));
            enterSelectionMode({
              type: 'discardToTrigger',
              eligibleIndices: matchA,
              message: `【${card.name}】觸發代價：請從手牌中點選一張高亮【金光】且具備【${symA}】符號的卡牌棄掉 (1/2)`,
              callback: (firstIndex) => {
                const discardedCard = hand[firstIndex];
                hand.splice(firstIndex, 1);
                showToast(`已棄掉手牌【${discardedCard.name}】`);
                
                const eligibleIndices2 = [];
                hand.forEach((hc, idx) => {
                  if (hc.symbols.includes(symB)) {
                    eligibleIndices2.push(idx);
                  }
                });
                
                enterSelectionMode({
                  type: 'discardToTrigger',
                  eligibleIndices: eligibleIndices2,
                  message: `【${card.name}】觸發代價：請從手牌中點選一張高亮【金光】且具備【${symB}】符號的卡牌棄掉 (2/2)`,
                  callback: (secondIndex) => {
                    const discardedCard2 = hand[secondIndex];
                    hand.splice(secondIndex, 1);
                    showToast(`已棄掉手牌【${discardedCard2.name}】`);
                    exitSelectionMode();
                    
                    moveCardToPlayed(true);
                  },
                  cancelCallback: () => {
                    moveCardToPlayed(false);
                  }
                });
              },
              cancelCallback: () => {
                moveCardToPlayed(false);
              }
            });
            return;
          }
        }
      } else {
        const targetSymbol = reqs[0] || '步軍';
        const matchIndices = eligibleIndices.filter(idx => hand[idx].symbols.includes(targetSymbol));
        if (matchIndices.length > 0) {
          if (confirm(`【${card.name}】效果觸發確認：\n是否支付代價（棄掉一張具備【${targetSymbol}】的手牌）以發動效果？\n\n（點擊「確定」發動效果並支付代價；點擊「取消」則不發動效果，直接將此卡派遣至出牌區）`)) {
            enterSelectionMode({
              type: 'discardToTrigger',
              eligibleIndices: matchIndices,
              message: `【${card.name}】觸發代價：請從手牌中點選一張高亮【金光】且具備【${targetSymbol}】符號的卡牌棄掉`,
              callback: (idx) => {
                const discardedCard = hand[idx];
                hand.splice(idx, 1);
                showToast(`已棄掉手牌【${discardedCard.name}】`);
                exitSelectionMode();
                moveCardToPlayed(true);
              },
              cancelCallback: () => {
                moveCardToPlayed(false);
              }
            });
            return;
          }
        }
      }
    } else {
      // CPU 棄牌邏輯
      if (isDouble) {
        const symA = reqs[0];
        const symB = reqs[1];
        let idxA = -1;
        let idxB = -1;
        for (let i = 0; i < hand.length; i++) {
          if (hand[i].symbols.includes(symA)) {
            for (let j = 0; j < hand.length; j++) {
              if (j === i) continue;
              if (hand[j].symbols.includes(symB)) {
                idxA = i;
                idxB = j;
                break;
              }
            }
          }
          if (idxA !== -1 && idxB !== -1) break;
        }
        if (idxA !== -1 && idxB !== -1) {
          const first = Math.max(idxA, idxB);
          const second = Math.min(idxA, idxB);
          hand.splice(first, 1);
          hand.splice(second, 1);
          moveCardToPlayed(true);
          return;
        }
      } else {
        const targetSymbol = reqs[0] || '步軍';
        let idxMatch = hand.findIndex(hc => hc.symbols.includes(targetSymbol));
        if (idxMatch !== -1) {
          hand.splice(idxMatch, 1);
          moveCardToPlayed(true);
          return;
        }
      }
    }
    moveCardToPlayed(false);
    return;
  }
  
  // 3. 力竭觸發條件
  if (condition.includes('力竭')) {
    let targetSymbol = '';
    if (condition.includes('步軍')) targetSymbol = '步軍';
    if (condition.includes('騎軍')) targetSymbol = '騎軍';
    if (condition.includes('斥侯')) targetSymbol = '斥侯';
    if (condition.includes('後勤')) targetSymbol = '後勤';
    if (condition.includes('水軍')) targetSymbol = '水軍';
    if (condition.includes('統御')) targetSymbol = '統御';
    
    const played = gameState[playerKey].playedArea;
    const eligibleIndices = [];
    played.forEach((item, index) => {
      if (item.state === 'active' && item.card.symbols.includes(targetSymbol)) {
        eligibleIndices.push(index);
      } else if (item.state === 'inverted' && item.card.invertedSymbols && item.card.invertedSymbols.includes(targetSymbol)) {
        eligibleIndices.push(index);
      }
    });
    
    if (eligibleIndices.length > 0) {
      if (playerKey === 'human') {
        if (confirm(`【${card.name}】效果觸發確認：\n是否支付代價（力竭出牌區一名具備【${targetSymbol}】的活躍兵將）以發動效果？\n\n（點擊「確定」發動效果並支付代價；點擊「取消」則不發動效果，直接將此卡派遣至出牌區）`)) {
          enterSelectionMode({
            type: 'exhaustToTrigger',
            eligibleIndices: eligibleIndices,
            message: `【${card.name}】觸發代價：請點選出牌區中高亮【金光】的活躍兵將將其力竭`,
            callback: (idx) => {
              // 點擊處理中已完成力竭，此處直接結束選擇並放置新牌
              exitSelectionMode();
              moveCardToPlayed(true);
            },
            cancelCallback: () => {
              moveCardToPlayed(false);
            }
          });
          return;
        }
      } else {
        played[eligibleIndices[0]].previousState = played[eligibleIndices[0]].state;
        played[eligibleIndices[0]].state = 'exhausted';
        moveCardToPlayed(true);
        return;
      }
    }
    moveCardToPlayed(false);
    return;
  }
  
  // 4. 戰役觸發條件
  if (condition.includes('本回合參與戰役')) {
    if (playerKey === 'human') {
      if (confirm(`【${card.name}】效果觸發確認：\n是否發動效果（本回合參與戰役可減免一個符號）？\n\n（點擊「確定」發動效果；點擊「取消」則不發動效果，直接將此卡派遣至出牌區）`)) {
        moveCardToPlayed(true);
        return;
      }
    } else {
      moveCardToPlayed(true);
      return;
    }
    moveCardToPlayed(false);
    return;
  }
  
  // 5. 現場存在特定符號條件
  if (checkPresenceCondition(playerKey, condition)) {
    if (playerKey === 'human') {
      if (confirm(`【${card.name}】效果觸發確認：\n已滿足條件「${condition}」，是否發動立即效果：「${card.immediateEffect}」？\n\n（點擊「確定」發動效果；點擊「取消」則不發動效果，直接將此卡派遣至出牌區）`)) {
        moveCardToPlayed(true);
        return;
      }
    } else {
      moveCardToPlayed(true);
      return;
    }
  }
  
  moveCardToPlayed(false);
}

// 打出手牌至出牌區
function playCard(index) {
  if (gameState.isGameOver) return;
  if (gameState.currentTurn !== 'human') {
    showToast('現在是 CPU 的回合！');
    return;
  }
  
  if (gameState.selectionMode && gameState.selectionMode.type !== 'freePlay') {
    showToast('請先完成當前效果選擇！');
    return;
  }
  
  if (!gameState.selectionMode || gameState.selectionMode.type !== 'freePlay') {
    if (gameState.playerActionState === 'recruit') {
      showToast('你本回合已執行過延攬豪傑，無法再派遣兵將！');
      return;
    }
    if (gameState.playerActionState === 'deploy' || gameState.playerActionState === 'finished') {
      showToast('你本回合已執行過派遣兵將，無法再執行其他軍略行動！');
      return;
    }
  }
  
  const card = gameState.human.hand[index];
  
  // Capture hand card element for animation before anything changes
  let fromRect = null;
  const handEl = document.getElementById('player-hand');
  if (handEl) {
    const cardEls = handEl.querySelectorAll('.card-wrapper');
    if (cardEls[index]) {
      const imgEl = cardEls[index].querySelector('.card-img') || cardEls[index];
      fromRect = imgEl.getBoundingClientRect();
    }
  }
  const playedContainer = document.getElementById('player-played');
  const imgSrc = getCardImagePath(card);
  
  if (card.type === '地煞卡') {
    gameState.playerActionState = 'deploy';
    
    if (fromRect) {
      // Fly the card to played area, then actually play it
      animateCardFly(fromRect, playedContainer, 'cardFlyToPlayed', imgSrc, 430, () => {
        playEarthCardWithEffect(card, index, false, 'human', () => {
          completeMilitaryAction();
          // After render, flash the new card in played area
          setTimeout(() => {
            const pEl = document.getElementById('player-played');
            if (pEl) {
              const lastCard = pEl.querySelectorAll('.card-wrapper');
              const target = lastCard[lastCard.length - 1];
              if (target) flashEarthEffect(target,
                target.getBoundingClientRect().left + target.getBoundingClientRect().width / 2,
                target.getBoundingClientRect().top  + target.getBoundingClientRect().height / 2);
            }
          }, 80);
        });
      });
    } else {
      playEarthCardWithEffect(card, index, false, 'human', () => {
        completeMilitaryAction();
      });
    }
  } else if (card.type === '天罡卡') {
    const costSymbol = card.exhaustCost;
    const eligibleIndices = [];
    gameState.human.playedArea.forEach((item, idx) => {
      if (item.state === 'active' && item.card.symbols.includes(costSymbol)) {
        eligibleIndices.push(idx);
      } else if (item.state === 'inverted' && item.card.invertedSymbols && item.card.invertedSymbols.includes(costSymbol)) {
        eligibleIndices.push(idx);
      }
    });
    
    if (eligibleIndices.length === 0) {
      showToast(`出牌失敗！需要力竭一位具備【${costSymbol}】符號的活躍兵將！`);
      return;
    }
    
    gameState.playerActionState = 'deploy';
    
    if (fromRect) {
      animateCardFly(fromRect, playedContainer, 'cardFlyToPlayed', imgSrc, 430, () => {
        payHeavenCostAndPlay(card, false, index);
      });
    } else {
      payHeavenCostAndPlay(card, false, index);
    }
  }
}

// CPU 天罡卡派遣 (處理力竭代價)
function payHeavenCostAndPlayForCpu(card, isFreePlay = false, handIndex = -1) {
  if (!isFreePlay) {
    const costSym = card.exhaustCost;
    const target = gameState.cpu.playedArea.find(item => {
      if (item.state === 'active') {
        return item.card.symbols.includes(costSym);
      } else if (item.state === 'inverted') {
        return item.card.invertedSymbols && item.card.invertedSymbols.includes(costSym);
      }
      return false;
    });
      if (target) {
        target.previousState = target.state;
        target.state = 'exhausted';
      } else {
      return false;
    }
  }
  
  if (handIndex !== -1) {
    gameState.cpu.hand.splice(handIndex, 1);
  }
  gameState.cpu.playedArea.push({
    card: card,
    state: 'active'
  });
  return true;
}

// CPU 自動回合 AI 邏輯
function cpuPlayTurn() {
  if (gameState.currentTurn !== 'cpu') return;
  
  showToast('朝廷官軍 (CPU) 思考中...');
  
  // 第一步：CPU 檢查並參與戰役 (自由行動)
  setTimeout(() => {
    const activeCpuCards = [];
    gameState.cpu.playedArea.forEach((item, index) => {
      if (item.state === 'active') {
        activeCpuCards.push({
          index: index,
          name: item.card.name,
          symbols: item.card.symbols
        });
      } else if (item.state === 'inverted') {
        activeCpuCards.push({
          index: index,
          name: item.card.name,
          symbols: item.card.invertedSymbols || []
        });
      }
    });
    
    const allCampaigns = [
      ...gameState.centerDisplay.minorCampaign,
      ...gameState.centerDisplay.majorCampaign
    ];
    
    let targetCampaign = null;
    let payIndices = null;
    
    for (const camp of allCampaigns) {
      // 套用 CPU 的戰役減免
      const cpuDiscounts = gameState.cpu.campaignDiscounts || [];
      const discountedReqs = getDiscountedRequirements(camp.requirements, cpuDiscounts);
      
      const idxs = canPayCampaignRequirements(activeCpuCards, discountedReqs);
      if (idxs) {
        targetCampaign = camp;
        payIndices = idxs;
        break;
      }
    }
    
    if (targetCampaign && payIndices) {
      payIndices.forEach(idx => {
        gameState.cpu.playedArea[idx].previousState = gameState.cpu.playedArea[idx].state;
        gameState.cpu.playedArea[idx].state = 'exhausted';
      });
      
      let removed = false;
      let idx = gameState.centerDisplay.minorCampaign.indexOf(targetCampaign);
      if (idx !== -1) {
        gameState.centerDisplay.minorCampaign.splice(idx, 1);
        removed = true;
      } else {
        idx = gameState.centerDisplay.majorCampaign.indexOf(targetCampaign);
        if (idx !== -1) {
          gameState.centerDisplay.majorCampaign.splice(idx, 1);
          removed = true;
        }
      }
      
      if (removed) {
        gameState.cpu.wonCampaigns.push(targetCampaign);
        showToast(`⚠️ CPU 成功參與了戰役並奪取【${targetCampaign.id}】！`);
        renderAll();
        calculateScore();
        
        // CPU 小型戰役獎勵處理
        if (targetCampaign.type === '小型戰役') {
          const rewardText = targetCampaign.immediateEffect;
          if (rewardText.includes('抽牌')) {
            for (let i = 0; i < 2; i++) {
              if (gameState.decks.earth.length > 0) gameState.cpu.hand.push(gameState.decks.earth.pop());
            }
            showToast('⚠️ CPU 獲得戰役獎勵：抽 2 張地煞卡！');
          } else if (rewardText.includes('打出一張')) {
            let reqSymbol = '';
            if (rewardText.includes('統御')) reqSymbol = '統御';
            if (rewardText.includes('騎軍')) reqSymbol = '騎軍';
            if (rewardText.includes('步軍')) reqSymbol = '步軍';
            
            const eligibleIndices = [];
            gameState.cpu.hand.forEach((handCard, idx) => {
              if (handCard.symbols.includes(reqSymbol)) {
                if (handCard.type === '天罡卡') {
                  const costSym = handCard.exhaustCost;
                  const hasEligibleExhaust = gameState.cpu.playedArea.some(item => {
                    if (item.state === 'active' && item.card.symbols.includes(costSym)) return true;
                    if (item.state === 'inverted' && item.card.invertedSymbols && item.card.invertedSymbols.includes(costSym)) return true;
                    return false;
                  });
                  if (hasEligibleExhaust) {
                    eligibleIndices.push(idx);
                  }
                } else {
                  eligibleIndices.push(idx);
                }
              }
            });
            
            if (eligibleIndices.length > 0) {
              const freeCard = gameState.cpu.hand[eligibleIndices[0]];
              showToast(`⚠️ CPU 獲得戰役獎勵：免費打出【${freeCard.name}】！`);
              if (freeCard.type === '地煞卡') {
                playEarthCardWithEffect(freeCard, eligibleIndices[0], true, 'cpu', () => {});
              } else if (freeCard.type === '天罡卡') {
                payHeavenCostAndPlayForCpu(freeCard, false, eligibleIndices[0]);
              }
            }
          }
        }
      }
    }
    
    // 第二步：CPU 執行軍略行動 (派遣或延攬)
    setTimeout(cpuMilitaryAction, 1000);
  }, 1000);
}

// CPU 派遣或延攬行動
function cpuMilitaryAction() {
  let played = false;
  
  // 1. 優先嘗試打出手牌中的天罡卡 (檢查是否能支付代價)
  const heavenInHand = gameState.cpu.hand.filter(c => c.type === '天罡卡');
  if (heavenInHand.length > 0) {
    for (const hc of heavenInHand) {
      const hidx = gameState.cpu.hand.indexOf(hc);
      if (payHeavenCostAndPlayForCpu(hc, false, hidx)) {
        showToast(`⚠️ CPU 派遣了天罡將領【${hc.name}】！`);
        played = true;
        break;
      }
    }
  }
  
  // 2. 若未打出天罡卡，則嘗試派遣地煞卡
  if (!played) {
    const earthInHand = gameState.cpu.hand.filter(c => c.type === '地煞卡');
    if (earthInHand.length > 0) {
      const ec = earthInHand[Math.floor(Math.random() * earthInHand.length)];
      const eidx = gameState.cpu.hand.indexOf(ec);
      played = true;
      
      playEarthCardWithEffect(ec, eidx, false, 'cpu', () => {
        calculateScore();
        renderAll();
        
        if (gameState.cpu.playedArea.length >= 12) {
          showToast('⚠️ CPU 出牌區已達 12 張或以上兵將，此輪將是遊戲的最後一輪！');
        }
        
        setTimeout(() => {
          endTurn();
        }, 1000);
      });
      return; // 提前返回，讓 playEarthCardWithEffect 的 callback 處理後續
    }
  }
  
  // 3. 若無法出牌，則執行延攬行動（抽 2 張牌）
  if (!played) {
    showToast('⚠️ CPU 選擇執行延攬豪傑（抽牌）...');
    for (let i = 0; i < 2; i++) {
      if (gameState.decks.earth.length > 0) {
        gameState.cpu.hand.push(gameState.decks.earth.pop());
      }
    }
  }
  
  calculateScore();
  renderAll();
  
  // 出牌區張數檢查
  if (gameState.cpu.playedArea.length >= 12) {
    showToast('⚠️ CPU 出牌區已達 12 張或以上兵將，此輪將是遊戲的最後一輪！');
  }
  
  // 第三步：1 秒後結束回合
  setTimeout(() => {
    endTurn();
  }, 1000);
}

// 計算折扣後的戰役需求
function applyDiscounts(neededSymbols, discounts) {
  let currentNeeded = [...neededSymbols];
  let remainingDiscounts = [...discounts];
  
  let minNeededLength = currentNeeded.length;
  let bestNeeded = [...currentNeeded];
  
  function search(discountIdx, activeNeeded) {
    if (discountIdx >= remainingDiscounts.length) {
      if (activeNeeded.length < minNeededLength) {
        minNeededLength = activeNeeded.length;
        bestNeeded = [...activeNeeded];
      }
      return;
    }
    
    const options = remainingDiscounts[discountIdx];
    for (const opt of options) {
      const idx = activeNeeded.indexOf(opt);
      if (idx !== -1) {
        const nextNeeded = [...activeNeeded];
        nextNeeded.splice(idx, 1);
        search(discountIdx + 1, nextNeeded);
      }
    }
    search(discountIdx + 1, activeNeeded);
  }
  
  search(0, currentNeeded);
  return bestNeeded;
}

function getDiscountedRequirements(reqs, discounts) {
  if (!discounts || discounts.length === 0) return reqs;
  
  const needed = [];
  for (const sym in reqs) {
    for (let i = 0; i < reqs[sym]; i++) {
      needed.push(sym);
    }
  }
  
  const discountedNeeded = applyDiscounts(needed, discounts);
  
  const discountedReqs = {};
  discountedNeeded.forEach(sym => {
    discountedReqs[sym] = (discountedReqs[sym] || 0) + 1;
  });
  return discountedReqs;
}

// 檢查並嘗試參與戰役 (自由行動)
function tryParticipateCampaign(campaignCard) {
  if (!gameState.gameStarted) return;
  
  if (gameState.currentTurn !== 'human') {
    showToast('現在是 CPU 的回合！');
    return;
  }
  
  if (gameState.selectionMode) {
    showToast('請先完成當前效果選擇！');
    return;
  }
  
  if (gameState.turnFreeActionTaken) {
    showToast('你本回合已執行過參與戰役的自由行動！');
    return;
  }
  
  // 進入手動戰役選將模式
  enterSelectionMode({
    type: 'campaignSelection',
    campaignCard: campaignCard,
    selectedIndices: [],
    selectedDiscounts: {},
    message: `正在參與戰役【${campaignCard.name || campaignCard.id}】。請點擊出牌區中活躍/倒置的兵將以參與戰役。`
  });
}

// 回溯法搜尋能滿足戰役條件的最少卡牌組合
function canPayCampaignRequirements(activeCards, reqs) {
  // 將需求轉換為符號陣列，例如：['步軍', '步軍', '騎軍']
  const needed = [];
  for (const sym in reqs) {
    for (let i = 0; i < reqs[sym]; i++) {
      needed.push(sym);
    }
  }
  if (needed.length === 0) return [];
  
  // 軍師群名單（朱武、蕭讓、裴宣、蔣敬），每次僅能提供多個符號中的一個
  const counselors = ["朱武", "蕭讓", "裴宣", "蔣敬"];
  let bestSubset = null;
  
  function search(cardIdx, currentSubset, currentProvided) {
    // 檢查 currentProvided 是否已完全覆蓋 needed
    let tempNeeded = [...needed];
    for (const sym of currentProvided) {
      const idx = tempNeeded.indexOf(sym);
      if (idx !== -1) {
        tempNeeded.splice(idx, 1);
      }
    }
    
    if (tempNeeded.length === 0) {
      // 找到了可行解，優先保留卡牌數量最少的組合
      if (!bestSubset || currentSubset.length < bestSubset.length) {
        bestSubset = [...currentSubset];
      }
      return;
    }
    
    if (cardIdx >= activeCards.length) return;
    
    const card = activeCards[cardIdx];
    const isCounselor = counselors.includes(card.name) && card.symbols.length > 1;
    
    // 決策一：包含當前卡牌
    if (isCounselor) {
      // 軍師群只能挑選其符號中的任意「一個」提供
      card.symbols.forEach(sym => {
        search(cardIdx + 1, [...currentSubset, card.index], [...currentProvided, sym]);
      });
    } else {
      // 一般兵將提供其具備的所有符號
      search(cardIdx + 1, [...currentSubset, card.index], [...currentProvided, ...card.symbols]);
    }
    
    // 決策二：不包含當前卡牌
    search(cardIdx + 1, currentSubset, currentProvided);
  }
  
  search(0, [], []);
  return bestSubset;
}

// 結算小型戰役卡的立即獎勵
function resolveCampaignReward(campaignCard) {
  const effectText = campaignCard.immediateEffect;
  if (!effectText || effectText === '無' || effectText === 'L' || effectText === '無 ') return;
  
  showToast(`獲得戰役獎勵：${effectText}`);
  
  // 1. 免費派遣卡牌 (例如：立即從手牌打出一張具備「統御」符號的卡片)
  if (effectText.includes('打出一張')) {
    let reqSymbol = '';
    if (effectText.includes('統御')) reqSymbol = '統御';
    if (effectText.includes('騎軍')) reqSymbol = '騎軍';
    if (effectText.includes('步軍')) reqSymbol = '步軍';
    
    const eligibleIndices = [];
    gameState.human.hand.forEach((handCard, idx) => {
      if (handCard.symbols.includes(reqSymbol)) {
        // 如果是天罡卡，必須檢查是否付得出代價（出牌區有對應的活躍符號可供力竭）
        if (handCard.type === '天罡卡') {
          const costSym = handCard.exhaustCost;
          const hasEligibleExhaust = gameState.human.playedArea.some(item => {
            if (item.state === 'active' && item.card.symbols.includes(costSym)) return true;
            if (item.state === 'inverted' && item.card.invertedSymbols && item.card.invertedSymbols.includes(costSym)) return true;
            return false;
          });
          if (hasEligibleExhaust) {
            eligibleIndices.push(idx);
          }
        } else {
          eligibleIndices.push(idx);
        }
      }
    });
    
    if (eligibleIndices.length > 0) {
      enterSelectionMode({
        type: 'freePlay',
        eligibleIndices: eligibleIndices,
        message: `【小型戰役獎勵】觸發：請點擊手牌中具備【${reqSymbol}】符號的卡牌進行免費打出`,
        callback: (handIdx) => {
          const freeCard = gameState.human.hand[handIdx];
          exitSelectionMode();
          
          if (freeCard.type === '地煞卡') {
            playEarthCardWithEffect(freeCard, handIdx, true, 'human', () => {});
          } else if (freeCard.type === '天罡卡') {
            payHeavenCostAndPlay(freeCard, true, handIdx);
          }
        }
      });
    } else {
      showToast(`手牌中無具備【${reqSymbol}】的卡牌，無法使用戰役獎勵。`);
    }
  }
  
  // 2. 額外獲得抽牌點 (例如：獲得 2 點抽牌點)
  if (effectText.includes('抽牌點') || effectText.includes('抽牌')) {
    let pts = 2;
    const match = effectText.match(/\d+/);
    if (match) pts = parseInt(match[0]);
    
    gameState.drawPointsRemaining = pts;
    gameState.activeActionType = 'recruit';
    
    enterSelectionMode({
      type: 'freeDraw',
      drawCountNeeded: pts,
      message: `【小型戰役獎勵】觸發：獲得 ${pts} 點抽牌點，請從展示列或牌堆抽取地煞卡`,
      callback: () => {
        exitSelectionMode();
      }
    });
  }
}

// DFS bipartite matching to match required symbols (targets) to available symbol slots
function canMatchAll(slots, targets) {
  function dfs(targetIdx, visitedSlots) {
    if (targetIdx === targets.length) return true;
    
    const requiredSym = targets[targetIdx];
    for (let i = 0; i < slots.length; i++) {
      if (visitedSlots.has(i)) continue;
      if (slots[i].includes(requiredSym)) {
        visitedSlots.add(i);
        if (dfs(targetIdx + 1, visitedSlots)) {
          return true;
        }
        visitedSlots.delete(i);
      }
    }
    return false;
  }
  return dfs(0, new Set());
}

function updatePlayerSymbolCounts() {
  const activeCounts = { '步軍': 0, '水軍': 0, '騎軍': 0, '統御': 0, '斥侯': 0, '後勤': 0 };
  const totalCounts = { '步軍': 0, '水軍': 0, '騎軍': 0, '統御': 0, '斥侯': 0, '後勤': 0 };
  
  const stats = getEffectiveSymbols('human');
  
  stats.activeSymbols.forEach(sym => {
    if (activeCounts[sym] !== undefined) activeCounts[sym]++;
  });
  stats.totalSymbols.forEach(sym => {
    if (totalCounts[sym] !== undefined) totalCounts[sym]++;
  });
  
  const cpuActiveCounts = { '步軍': 0, '水軍': 0, '騎軍': 0, '統御': 0, '斥侯': 0, '後勤': 0 };
  const cpuTotalCounts = { '步軍': 0, '水軍': 0, '騎軍': 0, '統御': 0, '斥侯': 0, '後勤': 0 };
  const cpuStats = getEffectiveSymbols('cpu');
  cpuStats.activeSymbols.forEach(sym => {
    if (cpuActiveCounts[sym] !== undefined) cpuActiveCounts[sym]++;
  });
  cpuStats.totalSymbols.forEach(sym => {
    if (cpuTotalCounts[sym] !== undefined) cpuTotalCounts[sym]++;
  });
  
  const renderCounts = (counts, cCount, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = '';
    for (const [sym, count] of Object.entries(counts)) {
      if (count > 0) {
        let color = '#fff';
        if (sym === '步軍') color = '#2ecc71';
        else if (sym === '水軍') color = '#3498db';
        else if (sym === '騎軍') color = '#e74c3c';
        else if (sym === '統御') color = '#f39c12';
        else if (sym === '斥侯') color = '#9b59b6';
        else if (sym === '後勤') color = '#1abc9c';
        
        html += `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: ${color}; border: 1px solid ${color};">${sym}: ${count}</span>`;
      }
    }
    if (cCount > 0) {
      html += `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #fff; border: 1px solid #aaa;">軍師: ${cCount}</span>`;
    }
    if (html === '') html = `<span style="font-size: 0.8rem; color: #666;">無</span>`;
    
    container.innerHTML = html;
  };
  
  renderCounts(activeCounts, stats.activeCounselorCount, 'player-symbol-counts-active');
  renderCounts(totalCounts, stats.totalCounselorCount, 'player-symbol-counts-total');
  renderCounts(cpuActiveCounts, cpuStats.activeCounselorCount, 'cpu-symbol-counts-active');
  renderCounts(cpuTotalCounts, cpuStats.totalCounselorCount, 'cpu-symbol-counts-total');
  
  const playedCountEl = document.getElementById('player-played-count');
  if (playedCountEl) playedCountEl.textContent = gameState.human.playedArea.length;
  
  const cpuPlayedCountEl = document.getElementById('cpu-played-count');
  if (cpuPlayedCountEl) cpuPlayedCountEl.textContent = gameState.cpu.playedArea.length;
}

// Find maximum groups of a pattern from available slots
function getMaxGroups(slots, pattern) {
  if (!pattern || pattern.length === 0) return 0;
  const maxK = Math.floor(slots.length / pattern.length);
  for (let k = maxK; k >= 1; k--) {
    const targets = [];
    for (let i = 0; i < k; i++) {
      targets.push(...pattern);
    }
    if (canMatchAll(slots, targets)) {
      return k;
    }
  }
  return 0;
}

// Get player score using the official scoring rules
function getPlayerScore(playerKey, forceReviveAll = false) {
  let heavenScore = 0;
  let campaignScore = 0;
  
  // 1. Gather all symbol slots
  const slots = [];
  const played = gameState[playerKey].playedArea;
  
  // Counselors list
  const counselors = ["朱武", "蕭讓", "裴宣", "蔣敬"];
  
  // Ruan brothers active flags (needs to check if the Ruan card is active or revived)
  let ruan27 = false; // 阮小二 -> water to command (統御)
  let ruan29 = false; // 阮小五 -> water to infantry (步軍)
  let ruan31 = false; // 阮小七 -> water to scout (斥侯)
  
  // Check Ruan brothers
  played.forEach(item => {
    let state = item.state;
    if (forceReviveAll && state === 'exhausted') {
      state = item.previousState || 'active';
    }
    
    // Check if the card is active/inverted
    const isActiveOrInverted = (state === 'active' || state === 'inverted');
    if (isActiveOrInverted) {
      if (item.card.id === "27") ruan27 = true;
      if (item.card.id === "29") ruan29 = true;
      if (item.card.id === "31") ruan31 = true;
    }
  });
  
  // Ruan conversions
  const waterConversions = ["水軍"];
  if (ruan27) waterConversions.push("統御");
  if (ruan29) waterConversions.push("步軍");
  if (ruan31) waterConversions.push("斥侯");
  
  // Add slots from played cards
  played.forEach(item => {
    let state = item.state;
    if (forceReviveAll && state === 'exhausted') {
      state = item.previousState || 'active';
    }
    
    if (state === 'active') {
      const isCounselor = counselors.includes(item.card.name) || (item.card.specialEffect && item.card.specialEffect.includes("梁山軍師群"));
      if (isCounselor) {
        // Counselor provides ONE slot containing its options
        const opts = [...item.card.symbols];
        slots.push(opts);
      } else {
        // Normal card provides multiple slots
        item.card.symbols.forEach(sym => {
          slots.push([sym]);
        });
      }
    } else if (state === 'inverted') {
      // Inverted card provides multiple slots of inverted symbols
      const invSyms = item.card.invertedSymbols || [];
      invSyms.forEach(sym => {
        slots.push([sym]);
      });
    }
  });
  
  // Add slots from won campaigns
  gameState[playerKey].wonCampaigns.forEach(c => {
    slots.push(["戰役"]);
  });
  
  // Apply Ruan brothers' conversions: if a slot has "水軍", expand its options
  if (waterConversions.length > 1) {
    slots.forEach(slot => {
      if (slot.includes("水軍")) {
        waterConversions.forEach(sym => {
          if (!slot.includes(sym)) {
            slot.push(sym);
          }
        });
      }
    });
  }
  
  // 2. Calculate Heaven card score
  const breakdown = [];
  played.forEach(item => {
    const card = item.card;
    if (card.type === '天罡卡' && card.scoringCondition && card.scoringCondition !== '-') {
      const cond = card.scoringCondition;
      const match = cond.match(/每組 \[(.+)\] 獲得 (\d+) 分/);
      if (match) {
        const pattern = match[1].split('+').map(s => s.trim());
        const pts = parseInt(match[2]);
        const groups = getMaxGroups(slots, pattern);
        const earned = groups * pts;
        heavenScore += earned;
        breakdown.push({
          type: 'heaven',
          name: card.name,
          condition: cond,
          groups: groups,
          pts: pts,
          earned: earned
        });
      }
    }
  });
  
  // 3. Calculate Campaign card score
  gameState[playerKey].wonCampaigns.forEach(c => {
    const match = c.scoringCondition.match(/\d+/);
    if (match) {
      const pts = parseInt(match[0]);
      campaignScore += pts;
      breakdown.push({
        type: 'campaign',
        name: c.type + ' (' + (c.conditionText || '') + ')',
        earned: pts
      });
    }
  });
  
  return {
    score: heavenScore + campaignScore,
    heavenScore: heavenScore,
    campaignScore: campaignScore,
    breakdown: breakdown
  };
}

// 計算分數（使用實際卡牌與戰役計分，動態顯示目前分數，不強迫復甦）
function calculateScore() {
  const humanRes = getPlayerScore('human', false);
  gameState.human.score = humanRes.score;
  
  const cpuRes = getPlayerScore('cpu', false);
  gameState.cpu.score = cpuRes.score;
}

// 點擊牌堆抽牌功能
function drawCardFromDeck(deckKey) {
  if (gameState.decks[deckKey] && gameState.decks[deckKey].length > 0) {
    const card = gameState.decks[deckKey].pop();
    gameState.human.hand.push(card);
    showToast(`你從牌堆抽了一張【${card.name || card.type}】！`);
    renderAll();
  } else {
    showToast('該牌堆已無剩餘卡牌！');
  }
}

// Toast 提示框
function showToast(message) {
  let toast = document.getElementById('game-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'game-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(20, 20, 25, 0.95)';
    toast.style.color = 'var(--color-gold)';
    toast.style.border = '1px solid var(--color-gold)';
    toast.style.padding = '12px 28px';
    toast.style.borderRadius = '30px';
    toast.style.boxShadow = '0 5px 20px rgba(0,0,0,0.5)';
    toast.style.zIndex = '9999';
    toast.style.fontSize = '0.95rem';
    toast.style.fontWeight = 'bold';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.pointerEvents = 'none';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, 2500);
}

// 顯示卡牌詳細資訊 Modal
function showCardDetail(card) {
  const modal = document.getElementById('card-modal');
  const img = document.getElementById('modal-card-img');
  const name = document.getElementById('modal-card-name');
  const type = document.getElementById('modal-card-type');
  const symbols = document.getElementById('modal-card-symbols');
  
  img.src = getCardImagePath(card);
  name.textContent = card.name || card.id;
  type.textContent = card.type;
  symbols.textContent = card.symbols.join('、') || '無';
  
  // 依卡片類型動態隱藏/顯示資訊區塊
  const invertedBlock = document.getElementById('modal-inverted-block');
  const costBlock = document.getElementById('modal-cost-block');
  const triggerBlock = document.getElementById('modal-trigger-block');
  const effectBlock = document.getElementById('modal-effect-block');
  const scoringBlock = document.getElementById('modal-scoring-block');
  
  // 地煞卡專用欄位
  if (card.type === '地煞卡') {
    invertedBlock.style.display = 'block';
    document.getElementById('modal-card-inverted-symbols').textContent = 
      (card.invertedSymbols && card.invertedSymbols.length > 0) ? card.invertedSymbols.join('、') : '無';
    
    triggerBlock.style.display = 'block';
    document.getElementById('modal-card-trigger').textContent = card.triggerCondition || '無';
    
    effectBlock.style.display = 'block';
    document.getElementById('modal-card-effect').textContent = card.immediateEffect || '無';
    
    costBlock.style.display = 'none';
    scoringBlock.style.display = 'none';
  } 
  // 天罡卡專用欄位
  else if (card.type === '天罡卡') {
    invertedBlock.style.display = 'none';
    triggerBlock.style.display = 'none';
    
    costBlock.style.display = 'block';
    document.getElementById('modal-card-cost').textContent = card.exhaustCost || '無';
    
    effectBlock.style.display = 'block';
    document.getElementById('modal-card-effect').textContent = 
      card.specialEffect !== '-' ? card.specialEffect : '無特殊效果';
    
    scoringBlock.style.display = 'block';
    document.getElementById('modal-card-scoring').textContent = card.scoringCondition || '無';
  }
  // 戰役卡專用欄位
  else {
    invertedBlock.style.display = 'none';
    costBlock.style.display = 'none';
    triggerBlock.style.display = 'none';
    
    effectBlock.style.display = 'block';
    document.getElementById('modal-card-effect').textContent = card.immediateEffect || '無';
    
    scoringBlock.style.display = 'block';
    document.getElementById('modal-card-scoring').textContent = card.scoringCondition || '無';
  }
  
  modal.classList.remove('hidden');
}

// 更新玩家出牌區的軍力符號統計
function updatePlayerSymbolCounts() {
  const activeCounts = { '步軍': 0, '水軍': 0, '騎軍': 0, '統御': 0, '斥侯': 0, '後勤': 0 };
  const totalCounts = { '步軍': 0, '水軍': 0, '騎軍': 0, '統御': 0, '斥侯': 0, '後勤': 0 };
  
  const stats = getEffectiveSymbols('human');
  
  stats.activeSymbols.forEach(sym => {
    if (activeCounts[sym] !== undefined) activeCounts[sym]++;
  });
  stats.totalSymbols.forEach(sym => {
    if (totalCounts[sym] !== undefined) totalCounts[sym]++;
  });
  
  const renderCounts = (counts, cCount, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = '';
    for (const [sym, count] of Object.entries(counts)) {
      if (count > 0) {
        let color = '#fff';
        if (sym === '步軍') color = '#2ecc71';
        else if (sym === '水軍') color = '#3498db';
        else if (sym === '騎軍') color = '#e74c3c';
        else if (sym === '統御') color = '#f39c12';
        else if (sym === '斥侯') color = '#9b59b6';
        else if (sym === '後勤') color = '#1abc9c';
        
        html += `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: ${color}; border: 1px solid ${color};">${sym}: ${count}</span>`;
      }
    }
    if (cCount > 0) {
      html += `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #fff; border: 1px solid #aaa;">軍師: ${cCount}</span>`;
    }
    if (html === '') html = `<span style="font-size: 0.8rem; color: #666;">無</span>`;
    
    container.innerHTML = html;
  };
  
  renderCounts(activeCounts, stats.activeCounselorCount, 'player-symbol-counts-active');
  renderCounts(totalCounts, stats.totalCounselorCount, 'player-symbol-counts-total');
}

// 註冊 Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // 難易度按鈕選擇
  const diffButtons = document.querySelectorAll('.btn-diff');
  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameState.difficulty = btn.dataset.difficulty;
    });
  });
  
  // 開始遊戲點擊
  document.getElementById('btn-start').addEventListener('click', () => {
    const activeDiffBtn = document.querySelector('.btn-diff.active');
    const diff = activeDiffBtn ? activeDiffBtn.dataset.difficulty : 'beginner';
    startNewGame(diff);
  });
  
  // 重新開局
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('確定要結束當前牌局，返回主選單嗎？')) {
      document.getElementById('game-container').classList.add('hidden');
      document.getElementById('start-menu').classList.remove('hidden');
      gameState.gameStarted = false;
    }
  });
  
  // 關閉 Modal
  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('card-modal').classList.add('hidden');
  });
  
  document.getElementById('card-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('card-modal')) {
      document.getElementById('card-modal').classList.add('hidden');
    }
  });
  
  // 點擊牌背堆抽牌 (延攬)
  document.querySelector('.deck-row:nth-child(1) .deck-image-container').addEventListener('click', () => {
    if (gameState.gameStarted) recruitCard(null, 'deck_heaven');
  });
  document.querySelector('.deck-row:nth-child(2) .deck-image-container').addEventListener('click', () => {
    if (gameState.gameStarted) recruitCard(null, 'deck_earth');
  });
  
  // 點擊結束回合
  document.querySelectorAll('.btn-end-turn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (gameState.gameStarted) endTurn();
    });
  });
  
  // 遊戲結束重新開始
  document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.add('hidden');
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('start-menu').classList.remove('hidden');
    gameState.gameStarted = false;
  });
  
  // 查看盤面
  document.getElementById('view-board-btn').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.add('hidden');
    const viewScoreBtn = document.getElementById('btn-view-score');
    if (viewScoreBtn) viewScoreBtn.classList.remove('hidden');
    showToast('請自由查看盤面。準備好時，可點擊上方「查看計分板」或「重新開局」。');
  });

  // 回看計分板
  const viewScoreBtn = document.getElementById('btn-view-score');
  if (viewScoreBtn) {
    viewScoreBtn.addEventListener('click', () => {
      document.getElementById('game-over-modal').classList.remove('hidden');
      viewScoreBtn.classList.add('hidden');
    });
  }
});
