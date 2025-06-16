// 人狼ゲーム開始コマンド処理
class StartCommand {
  constructor(werewolfGame) {
    this.game = werewolfGame;
  }

  // #開始コマンド処理
  execute(userId, userName) {
    // ゲーム状態チェック
    if (!this.game.phaseManager.isWaiting()) {
      return { 
        success: false, 
        message: 'ゲームは既に開始されています。' 
      };
    }

    // 最低人数チェック
    if (this.game.players.length < this.game.minPlayers) {
      return { 
        success: false, 
        message: `ゲーム開始には最低${this.game.minPlayers}人必要です。\n現在の参加者: ${this.game.players.length}人` 
      };
    }

    // プレイヤーが参加しているかチェック
    const player = this.game.getPlayer(userId);
    if (!player) {
      return { 
        success: false, 
        message: 'ゲームに参加していない人は開始できません。' 
      };
    }

    // ゲーム開始処理
    try {
      // 役職割り当て
      this.game.assignRoles();
      
      // フェーズを昼に切り替え
      const phaseResult = this.game.phaseManager.startGame();
      
      // アクティビティ更新
      this.game.updateActivity();
      
      return {
        success: true,
        message: this.buildStartMessage(),
        phase: phaseResult.phase,
        dayCount: phaseResult.dayCount
      };
    } catch (error) {
      console.error('Game start error:', error);
      return { 
        success: false, 
        message: 'ゲーム開始中にエラーが発生しました。' 
      };
    }
  }

  // ゲーム開始メッセージ構築
  buildStartMessage() {
    const playerCount = this.game.players.length;
    const werewolfCount = this.game.getWerewolfCount();
    const villagerCount = playerCount - werewolfCount;

    let message = `🐺 人狼ゲームを開始します！\n\n`;
    message += `👥 参加者: ${playerCount}人\n`;
    message += `🐺 人狼: ${werewolfCount}人\n`;
    message += `👨‍🌾 市民陣営: ${villagerCount}人\n\n`;
    message += `各プレイヤーには役職が割り当てられました。\n`;
    message += `役職確認は個人チャットで行ってください。\n\n`;
    message += `🌅 1日目の朝になりました。\n`;
    message += `議論を開始してください。`;

    return message;
  }
}

module.exports = StartCommand;
