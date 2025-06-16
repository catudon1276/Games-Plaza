// ゲーム管理クラス
class GameManager {
  constructor() {
    this.games = new Map(); // groupId -> game instance
  }
  // コマンド処理（@から始まるコマンド）
  handleCommand(groupId, userId, userName, command) {
    // 自動終了したゲームをチェック・削除
    this.cleanupAutoEndedGames();
    
    // @人狼 - 人狼ゲーム開始
    if (command === '@人狼') {
      return this.startGame(groupId, 'werewolf', userId, userName);
    }
    
    // @終了 - ゲーム終了
    if (command === '@終了') {
      return this.endGame(groupId);
    }
    
    // @参加 [ニックネーム] - ゲーム参加
    if (command.startsWith('@参加')) {
      const parts = command.split(' ');
      const nickname = parts.length > 1 ? parts.slice(1).join(' ') : userName;
      const result = this.joinGame(groupId, userId, nickname);
      
      // アクティビティ更新
      const game = this.games.get(groupId);
      if (game) {
        game.updateActivity();
      }
      
      return result;
    }
    
    // @キャンセル - ゲーム参加キャンセル
    if (command === '@キャンセル') {
      const result = this.leaveGame(groupId, userId);
      
      // アクティビティ更新
      const game = this.games.get(groupId);
      if (game) {
        game.updateActivity();
      }
      
      return result;
    }

    return { success: false, message: '不明なコマンドです。' };  }

  // #コマンド処理
  handleHashCommand(groupId, userId, userName, command, args = []) {
    const game = this.games.get(groupId);
    if (!game) {
      return { success: false, message: 'このグループではゲームが開始されていません。' };
    }

    // #開始 - ゲーム開始
    if (command === '#開始') {
      // 人狼ゲーム専用の処理
      if (game.gameType === 'werewolf') {
        const result = game.handleStartCommand(userId, userName);
        
        // アクティビティ更新
        if (result.success) {
          game.updateActivity();
        }
          return result;
      }

      return { success: false, message: 'このゲームでは#開始コマンドは使用できません。' };
    }

    // 人狼ゲーム専用のコマンド
    if (game.gameType === 'werewolf') {
      switch (command) {
        case '#投票':
          return game.handleVoteCommand(userId, args);
        case '#投票確認':
          return game.handleVoteCheckCommand(userId);        case '#襲撃':
          return game.handleAttackCommand(userId, args);
        case '#疑う':
        case '#憧憬':
          return game.handleFocusCommand(userId, args);
        default:
          return { success: false, message: '不明なコマンドです。' };
      }
    }

    return { success: false, message: '不明なコマンドです。' };
  }

  // ゲーム開始
  startGame(groupId, gameType, userId, userName) {
    if (this.games.has(groupId)) {
      return { success: false, message: 'このグループでは既にゲームが進行中です。' };
    }

    const GameClass = this.getGameClass(gameType);
    if (!GameClass) {
      return { success: false, message: 'サポートされていないゲームです。' };
    }    const game = new GameClass(groupId);
    this.games.set(groupId, game);
    
    // ゲーム作成者を最初のプレイヤーとして追加
    const result = game.addPlayer(userId, userName);
    if (result.success) {
      result.message = `${this.getGameName(gameType)}がインストールされました…\n参加したい人は@参加 [ニックネーム]と送ってください`;
    }
    
    return result;
  }

  // ゲーム参加
  joinGame(groupId, userId, nickname) {
    const game = this.games.get(groupId);
    if (!game) {
      return { success: false, message: 'このグループではゲームが開始されていません。' };
    }

    return game.addPlayer(userId, nickname);
  }

  // ゲーム退出
  leaveGame(groupId, userId) {
    const game = this.games.get(groupId);
    if (!game) {
      return { success: false, message: 'このグループではゲームが開始されていません。' };
    }

    return game.removePlayer(userId);
  }

  // ゲーム終了
  endGame(groupId) {
    if (this.games.has(groupId)) {
      const game = this.games.get(groupId);
      this.games.delete(groupId);
      
      return { success: true, message: `🏁 ${game.gameType}ゲームを終了しました。` };
    }
    return { success: false, message: 'このグループではゲームが開始されていません。' };
  }
  // ゲームクラス取得
  getGameClass(gameType) {
    const gameClasses = {
      'werewolf': require('../games/werewolf/index')
    };

    return gameClasses[gameType];
  }

  // ゲーム名取得
  getGameName(gameType) {
    const gameNames = {
      'werewolf': '人狼'
    };
    
    return gameNames[gameType] || gameType;
  }
  // ゲーム状態確認
  getGameStatus(groupId) {
    const game = this.games.get(groupId);
    if (!game) {
      return { success: false, message: 'ゲームが開始されていません。' };
    }

    return { success: true, data: game.getStatus() };
  }

  // 自動終了したゲームをクリーンアップ
  cleanupAutoEndedGames() {
    for (const [groupId, game] of this.games.entries()) {
      if (game.autoEnded || game.status === 'ended') {
        console.log(`Cleaning up auto-ended game: ${groupId}`);
        game.clearAutoEndTimer();
        this.games.delete(groupId);
      }
    }
  }

  // 定期的なクリーンアップを開始（オプション）
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupAutoEndedGames();
    }, 5 * 60 * 1000); // 5分ごと
  }
}

module.exports = GameManager;
