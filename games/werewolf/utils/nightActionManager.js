// 夜フェーズの行動管理 - メタデータシステム統合
const { getRoleAbilities, getRoleInfo, getRoleName } = require('../roles/meta');
const AbilityManager = require('../roles/abilities/abilityManager');

class NightActionManager {
  constructor(werewolfGame) {
    this.game = werewolfGame;
    this.pendingActions = new Map(); // userId -> action
    this.nightStartTime = null;
    this.nightTimeLimit = 5 * 60 * 1000; // 5分（ミリ秒）
    this.autoActionTimer = null;
    this.abilityManager = new AbilityManager();
  }

  // 夜フェーズ開始
  startNightPhase() {
    this.pendingActions.clear();
    this.nightStartTime = new Date();
    this.startAutoActionTimer();

    // 全プレイヤーに行動選択を送信
    return this.sendActionRequestsToAllPlayers();
  }

  // 全プレイヤーに行動選択要求を送信
  sendActionRequestsToAllPlayers() {
    const requests = [];
    
    for (const player of this.game.players) {
      if (!player.isAlive) continue;

      const actionRequest = this.createActionRequestForPlayer(player);
      requests.push({
        userId: player.userId,
        userName: player.userName,
        role: player.role,
        actions: actionRequest.actions,
        message: actionRequest.message
      });
    }

    return {
      success: true,
      message: '🌙 夜になりました。各プレイヤーは行動を選択してください。',
      requests: requests,
      timeLimit: this.nightTimeLimit / 1000 // 秒単位
    };
  }
  // プレイヤー別の行動選択肢作成（メタデータベース対応）
  createActionRequestForPlayer(player) {
    const roleInfo = getRoleInfo(player.role);
    if (!roleInfo) {
      return {
        message: '❓ 役職情報が不明です',
        actions: [{ type: 'skip', target: null, display: '何もしない' }]
      };
    }

    const abilities = getRoleAbilities(player.role);
    if (abilities.length === 0) {
      // 能力を持たない役職（村人など）
      return {
        message: `😴 ${getRoleName(player.role)}は夜の間は休みます`,
        actions: [{ type: 'skip', target: null, display: '休む' }]
      };
    }

    // 能力を持つ役職の行動選択肢を生成
    return this.generateAbilityActions(player, abilities);
  }

  // 能力別の行動選択肢生成
  generateAbilityActions(player, abilities) {
    const alivePlayers = this.game.players.filter(p => p.isAlive && p.id !== player.id);
    let message = '';
    let actions = [];

    for (const abilityId of abilities) {
      const abilityActions = this.abilityManager.generateAbilityQuickReply(abilityId, player, {
        alivePlayers: alivePlayers,
        game: this.game
      });

      if (abilityActions) {
        if (message) message += '\n';
        message += abilityActions.message;
        actions.push(...abilityActions.actions);
      }
    }

    // 何もしない選択肢を追加
    actions.push({ type: 'skip', target: null, display: '何もしない' });

    return {
      message: message || `${getRoleName(player.role)}として行動を選択してください`,
      actions: actions
    };  }

  // プレイヤーの行動を登録
  submitAction(userId, actionType, targetId = null) {
    const player = this.game.getPlayer(userId);
    if (!player || !player.isAlive) {
      return { success: false, message: 'あなたは行動できません。' };
    }

    // 既に行動済みかチェック
    if (this.pendingActions.has(userId)) {
      return { success: false, message: '既に行動を選択済みです。' };
    }

    // 行動の妥当性チェック
    const validationResult = this.validateAction(player, actionType, targetId);
    if (!validationResult.success) {
      return validationResult;
    }

    // 行動を保存
    this.pendingActions.set(userId, {
      type: actionType,
      target: targetId,
      timestamp: new Date()
    });

    const targetName = targetId ? this.game.getPlayer(targetId)?.userName : 'なし';
    
    // 全員の行動が揃ったかチェック
    if (this.areAllActionsSubmitted()) {
      this.clearAutoActionTimer();
      // 深夜フェーズに移行
      setTimeout(() => this.resolveNightActions(), 1000);
      
      return {
        success: true,
        message: `行動を受付けました（対象: ${targetName}）\n全員の行動が揃いました。深夜フェーズに移行します...`,
        allReady: true
      };
    }

    const remaining = this.getRemainingPlayersCount();
    return {
      success: true,
      message: `行動を受付けました（対象: ${targetName}）\n残り${remaining}人の行動待ちです。`,
      allReady: false,
      remaining: remaining
    };
  }
  // 行動の妥当性チェック（メタデータベース対応）
  validateAction(player, actionType, targetId) {
    // スキップ系は常に有効
    if (['skip', 'sleep', 'wait'].includes(actionType)) {
      return { success: true };
    }

    const abilities = getRoleAbilities(player.role);
    if (!abilities.includes(actionType)) {
      return { success: false, message: 'その行動は実行できません。' };
    }

    // ターゲットが必要な行動でターゲットが無効
    if (targetId) {
      const target = this.game.getPlayer(targetId);
      const validation = this.abilityManager.validateAbilityTarget(
        actionType, 
        player, 
        target, 
        { game: this.game }
      );
      
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }
    }

    return { success: true };
  }

  // 役職別の有効な行動リスト（メタデータベース対応）
  getValidActionsForRole(role) {
    const abilities = getRoleAbilities(role);
    const actions = [...abilities, 'skip'];
    
    // 能力を持たない役職（村人など）
    if (abilities.length === 0) {
      return ['sleep'];
    }
    
    return actions;
  }

  // 全員が行動を提出したかチェック
  areAllActionsSubmitted() {
    const alivePlayers = this.game.players.filter(p => p.isAlive);
    return this.pendingActions.size >= alivePlayers.length;
  }

  // 残りプレイヤー数取得
  getRemainingPlayersCount() {
    const alivePlayers = this.game.players.filter(p => p.isAlive);
    return alivePlayers.length - this.pendingActions.size;
  }

  // 自動行動タイマー開始
  startAutoActionTimer() {
    this.autoActionTimer = setTimeout(() => {
      this.executeAutoActions();
    }, this.nightTimeLimit);
  }

  // 自動行動タイマークリア
  clearAutoActionTimer() {
    if (this.autoActionTimer) {
      clearTimeout(this.autoActionTimer);
      this.autoActionTimer = null;
    }
  }

  // 自動行動実行（5分経過時）
  executeAutoActions() {
    const alivePlayers = this.game.players.filter(p => p.isAlive);
    
    for (const player of alivePlayers) {
      if (!this.pendingActions.has(player.userId)) {
        // ランダム行動を選択
        const randomAction = this.generateRandomAction(player);
        this.pendingActions.set(player.userId, {
          type: randomAction.type,
          target: randomAction.target,
          timestamp: new Date(),
          auto: true
        });
      }
    }

    // 深夜フェーズに移行
    this.resolveNightActions();
  }
  // ランダム行動生成（メタデータベース対応）
  generateRandomAction(player) {
    const abilities = getRoleAbilities(player.role);
    const alivePlayers = this.game.players.filter(p => p.isAlive && p.id !== player.id);

    // 能力を持たない場合はスキップ
    if (abilities.length === 0) {
      return { type: 'sleep', target: null };
    }

    // focus能力の場合は必須選択（スキップ不可）
    if (abilities.includes('focus')) {
      const focusAbility = this.abilityManager.getAbility('focus');
      const randomTarget = focusAbility.generateRandomTarget(player, {
        alivePlayers: alivePlayers,
        game: this.game
      });
      
      if (randomTarget) {
        return { type: 'focus', target: randomTarget.id };
      }
    }

    // 他の能力の場合、ランダム選択
    if (alivePlayers.length > 0) {
      const abilityId = abilities[0]; // 最初の能力を使用
      const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      return { type: abilityId, target: randomTarget.id };
    }

    return { type: 'skip', target: null };
  }
  // 深夜フェーズ：行動処理（メタデータベース対応）
  resolveNightActions() {
    console.log('Resolving night actions...');
    
    const results = {
      executions: [],
      privateMessages: [],
      publicMessage: ''
    };

    // 全ての行動を能力別に実行
    for (const [userId, action] of this.pendingActions.entries()) {
      const player = this.game.getPlayer(userId);
      if (!player || !player.isAlive) continue;

      if (['skip', 'sleep', 'wait'].includes(action.type)) {
        continue; // 何もしない行動
      }

      // 能力実行
      const target = action.target ? this.game.getPlayer(action.target) : null;
      const result = this.abilityManager.executeAbility(
        action.type,
        player,
        target,
        { game: this.game, nightActions: this.pendingActions }
      );

      if (result.success && result.result) {
        results.executions.push({
          ability: action.type,
          actor: player,
          target: target,
          result: result.result
        });

        // 個別メッセージがあれば追加
        if (result.privateMessage) {
          results.privateMessages.push({
            userId: userId,
            message: result.privateMessage
          });
        }
      }
    }

    // 公開メッセージ構築
    results.publicMessage = this.buildPublicNightMessage(results.executions);

    // 行動をクリア
    this.pendingActions.clear();

    return results;
  }

  // 公開夜結果メッセージ構築
  buildPublicNightMessage(executions) {
    let message = '🌌 深夜の出来事:\n\n';
    let hasDeaths = false;

    for (const execution of executions) {
      if (execution.ability === 'attack' && execution.result.died) {
        const attackAbility = this.abilityManager.getAbility('attack');
        message += attackAbility.buildPublicMessage(execution.result) + '\n';
        hasDeaths = true;
      }
    }

    if (!hasDeaths) {
      message += '今夜は平和でした。誰も襲われませんでした。\n';
    }

    return message;  }

  // アクション要約取得（メタデータベース対応）
  getActionSummary() {
    const alivePlayers = this.game.players.filter(p => p.isAlive);
    const totalActions = this.pendingActions.size;
    
    // 必要な役職の行動完了状況をチェック
    const requiredActions = alivePlayers.filter(p => {
      const abilities = getRoleAbilities(p.role);
      return abilities.length > 0; // 能力を持つ役職のみ
    });
    
    const completedActions = requiredActions.filter(p => this.pendingActions.has(p.id));
    const allComplete = completedActions.length === requiredActions.length;
    
    return {
      totalPlayers: alivePlayers.length,
      requiredPlayers: requiredActions.length,
      completedActions: completedActions.length,
      totalActions: totalActions,
      allComplete: allComplete,
      nightStartTime: this.nightStartTime,
      timeRemaining: this.getTimeRemaining()
    };
  }

  // 残り時間取得
  getTimeRemaining() {
    if (!this.nightStartTime) return 0;
    
    const elapsed = Date.now() - this.nightStartTime.getTime();
    const remaining = Math.max(0, this.nightTimeLimit - elapsed);
    return Math.floor(remaining / 1000); // 秒単位
  }
}

module.exports = NightActionManager;
