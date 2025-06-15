// ゲーム管理クラス
class GameManager {
  constructor() {
    this.games = new Map(); // groupId -> game instance
  }

  // コマンド処理（@から始まるコマンド）
  handleCommand(groupId, userId, userName, command) {
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
      return this.joinGame(groupId, userId, nickname);
    }
    
    // @キャンセル - ゲーム参加キャンセル
    if (command === '@キャンセル') {
      return this.leaveGame(groupId, userId);
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
      'werewolf': require('../games/werewolf')
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
}

module.exports = GameManager;
