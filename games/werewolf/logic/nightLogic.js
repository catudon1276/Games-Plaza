// 夜フェーズ統合処理ロジック
const { getRoleInfo, getRoleAbilities } = require('../roles/meta');
const AbilityManager = require('../roles/abilities/abilityManager');

class NightLogic {
  constructor(werewolfGame) {
    this.game = werewolfGame;
    this.abilityManager = new AbilityManager();
    this.nightStartTime = null;
    this.nightTimeLimit = 5 * 60 * 1000; // 5分
    this.autoTimer = null;
  }

  // 夜フェーズ開始
  startNightPhase() {
    this.nightStartTime = new Date();
    this.clearPendingActions();
    
    // 各プレイヤーに夜行動メニューを送信
    const actionMenus = this.generateNightActionMenus();
    
    // 自動終了タイマー開始
    this.startAutoTimer();
    
    return {
      success: true,
      message: '🌙 夜になりました。各プレイヤーは行動を選択してください。',
      actionMenus: actionMenus,
      timeLimit: this.nightTimeLimit / 1000
    };
  }

  // 夜行動メニュー生成
  generateNightActionMenus() {
    const menus = [];
    
    for (const player of this.game.players) {
      if (!player.isAlive) continue;

      const menu = this.abilityManager.generateNightActionMenu(
        player, 
        this.getGameState()
      );

      if (menu) {
        menus.push({
          userId: player.id,
          userName: player.nickname,
          role: player.role,
          menu: menu
        });
      }
    }

    return menus;
  }

  // 行動記録
  recordAction(userId, abilityId, targetId) {
    const actor = this.game.getPlayer(userId);
    const target = targetId ? this.game.getPlayer(targetId) : null;
    
    if (!actor || !actor.isAlive) {
      return { success: false, message: '行動できません。' };
    }

    // 能力と対象を検証
    const validation = this.abilityManager.validateAbilityTarget(
      abilityId, 
      actor, 
      target, 
      this.getGameState()
    );

    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    // 行動を記録
    this.game.nightActionManager.recordAction(userId, abilityId, targetId);

    // 自動進行チェック
    this.checkAutoProgression();

    return {
      success: true,
      message: `行動を記録しました。`,
      actionSummary: this.getActionSummary()
    };
  }

  // 夜間処理実行
  resolveNightPhase() {
    const nightActions = this.collectNightActions();
    const gameState = this.getGameState();
    
    // 能力一括処理
    const results = this.abilityManager.resolveNightActions(nightActions, gameState);
    
    // 霊媒処理（処刑者がいる場合）
    this.resolveMediumActions(results, gameState);
    
    // 行動をクリア
    this.clearPendingActions();
    
    return {
      success: true,
      results: results,
      publicMessage: this.buildPublicMessage(results),
      privateMessages: results.privateMessages
    };
  }

  // 夜行動収集
  collectNightActions() {
    const actions = {
      attack: [],
      divine: [],
      guard: [],
      medium: []
    };

    const pendingActions = this.game.nightActionManager.getAllActions();

    for (const [userId, actionData] of Object.entries(pendingActions)) {
      const actor = this.game.getPlayer(userId);
      const target = actionData.targetId ? this.game.getPlayer(actionData.targetId) : null;
      
      if (actor && actionData.abilityId) {
        const abilityId = actionData.abilityId;
        if (actions[abilityId]) {
          actions[abilityId].push({
            actor: actor,
            target: target,
            data: actionData
          });
        }
      }
    }

    return actions;
  }

  // 霊媒処理
  resolveMediumActions(results, gameState) {
    const mediums = this.game.players.filter(p => 
      p.isAlive && p.role === 'medium'
    );

    if (mediums.length === 0) return;

    const lastExecuted = gameState.lastExecutedPlayer;
    
    for (const medium of mediums) {
      const mediumResult = this.abilityManager.executeAbility(
        'medium', 
        medium, 
        lastExecuted, 
        gameState
      );

      if (mediumResult.success && mediumResult.privateMessage) {
        results.privateMessages.push({
          userId: medium.id,
          message: mediumResult.privateMessage
        });
      }
    }
  }

  // 公開メッセージ構築
  buildPublicMessage(results) {
    let message = '🌌 深夜の出来事:\n\n';
    
    if (results.deaths.length > 0) {
      for (const death of results.deaths) {
        message += `💀 ${death.nickname}が人狼に襲撃されました。\n`;
        const roleInfo = getRoleInfo(death.role);
        if (roleInfo) {
          message += `役職は「${roleInfo.name}」でした。\n`;
        }
      }
    } else {
      message += '今夜は平和でした。誰も襲われませんでした。\n';
    }

    return message;
  }

  // 自動進行チェック
  checkAutoProgression() {
    const requiredActions = this.getRequiredNightActions();
    const completedActions = this.getCompletedNightActions();

    if (completedActions >= requiredActions) {
      this.autoProgressToNightResolution();
    }
  }

  // 必要行動数取得
  getRequiredNightActions() {
    let count = 0;
    
    for (const player of this.game.players) {
      if (!player.isAlive) continue;
      
      const abilities = getRoleAbilities(player.role);
      if (abilities.length > 0) {
        count++;
      }
    }

    return count;
  }

  // 完了行動数取得
  getCompletedNightActions() {
    return this.game.nightActionManager.getActionCount();
  }

  // 行動要約取得
  getActionSummary() {
    const required = this.getRequiredNightActions();
    const completed = this.getCompletedNightActions();
    
    return {
      required: required,
      completed: completed,
      remaining: required - completed,
      allComplete: completed >= required
    };
  }

  // ゲーム状態取得
  getGameState() {
    return {
      players: this.game.players,
      dayCount: this.game.phaseManager.dayCount,
      lastExecutedPlayer: this.game.lastExecutedPlayer || null,
      nightActions: this.game.nightActionManager.getAllActions(),
      nightProtections: []
    };
  }

  // 自動タイマー開始
  startAutoTimer() {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
    }

    this.autoTimer = setTimeout(() => {
      this.autoProgressToNightResolution();
    }, this.nightTimeLimit);
  }

  // 自動深夜移行
  autoProgressToNightResolution() {
    if (!this.game.phaseManager.isNightWaiting()) return;

    // ランダム行動を自動選択
    this.fillMissingActions();
    
    // 深夜フェーズに移行
    setTimeout(() => {
      this.game.handleNightResolution();
    }, 2000);
  }

  // 未行動者にランダム行動を設定
  fillMissingActions() {
    for (const player of this.game.players) {
      if (!player.isAlive) continue;
      
      const hasAction = this.game.nightActionManager.hasAction(player.id);
      if (!hasAction) {
        const abilities = getRoleAbilities(player.role);
        if (abilities.length > 0) {
          this.selectRandomAction(player, abilities[0]);
        }
      }
    }
  }

  // ランダム行動選択
  selectRandomAction(player, abilityId) {
    const gameState = this.getGameState();
    const possibleTargets = gameState.players.filter(p => 
      p.isAlive && p.id !== player.id
    );

    if (possibleTargets.length > 0) {
      const randomTarget = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
      this.recordAction(player.id, abilityId, randomTarget.id);
    }
  }

  // 行動クリア
  clearPendingActions() {
    this.game.nightActionManager.clearActions();
  }

  // タイマークリア
  clearAutoTimer() {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }
}

module.exports = NightLogic;
