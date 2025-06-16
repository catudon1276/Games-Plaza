const BaseGame = require('../../utils/baseGame');
const PhaseManager = require('./utils/phaseManager');
const RoleManager = require('./utils/roleManager');
const StartCommand = require('./commands/startCommand');

class WerewolfGame extends BaseGame {
  constructor(groupId) {
    super(groupId);
    this.gameType = 'werewolf';
    this.minPlayers = 3;
    this.maxPlayers = 20;
    
    // 人狼ゲーム専用マネージャー
    this.phaseManager = new PhaseManager();
    this.roleManager = new RoleManager();
    
    // コマンドハンドラー
    this.startCommand = new StartCommand(this);
  }

  // 役職割り当て
  assignRoles() {
    const result = this.roleManager.assignRolesToPlayers(this.players);
    this.roleComposition = result.composition;
    return result;
  }

  // 人狼の数を取得
  getWerewolfCount() {
    return this.players.filter(p => p.role === this.roleManager.roles.WEREWOLF).length;
  }

  // #開始コマンド処理
  handleStartCommand(userId, userName) {
    return this.startCommand.execute(userId, userName);
  }

  // アクション処理
  handleAction(userId, action, data) {
    // フェーズ別の処理
    if (this.phaseManager.isWaiting()) {
      return { success: false, message: 'ゲームがまだ開始されていません。#開始 でゲームを開始してください。' };
    }

    // 今後、昼夜別の処理を実装
    return { success: false, message: 'この機能は開発中です。' };
  }

  // ゲーム状態取得
  getStatus() {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      phase: this.phaseManager.getCurrentPhaseInfo(),
      roleComposition: this.roleComposition || null
    };
  }

  // ゲーム終了時の処理
  endGame() {
    this.phaseManager.endGame();
    return super.endGame();
  }
}

module.exports = WerewolfGame;
