// 基本ゲームクラス
class BaseGame {  constructor(groupId) {
    this.groupId = groupId;
    this.players = [];
    this.status = 'waiting'; // waiting, playing, ended
    this.gameType = 'base';
    this.createdAt = new Date();
    this.lastActivity = new Date();
    this.minPlayers = 3;
    this.maxPlayers = 20;
    this.autoEndTimer = null;
    this.autoEndTimeout = 30 * 60 * 1000; // 30分（ミリ秒）
    
    // 自動終了タイマーを開始
    this.startAutoEndTimer();
  }

  // プレイヤーを追加
  addPlayer(userId, userName = null) {
    if (this.players.find(p => p.userId === userId)) {
      return { success: false, message: '既に参加しています。' };
    }

    if (this.players.length >= this.maxPlayers) {
      return { success: false, message: `参加人数が上限（${this.maxPlayers}人）に達しています。` };
    }    this.players.push({
      userId,
      id: userId, // idプロパティを追加
      userName: userName || `プレイヤー${this.players.length + 1}`,
      joinedAt: new Date()
    });

    return { 
      success: true, 
      message: `${userName || 'あなた'}がゲームに参加しました！\n現在の参加者: ${this.players.length}/${this.maxPlayers}人\n\n参加者一覧:\n${this.getPlayerList()}`
    };
  }

  // プレイヤーを削除
  removePlayer(userId) {
    const index = this.players.findIndex(p => p.userId === userId);
    if (index === -1) {
      return { success: false, message: 'ゲームに参加していません。' };
    }

    const player = this.players[index];
    this.players.splice(index, 1);
    
    return { 
      success: true, 
      message: `${player.userName}がゲームから退出しました。\n現在の参加者: ${this.players.length}人`
    };
  }

  // ゲーム状態取得
  getStatus() {
    return {
      gameType: this.gameType,
      status: this.status,
      playerCount: this.players.length,
      maxPlayers: this.maxPlayers,
      minPlayers: this.minPlayers,
      players: this.players.map(p => ({ userId: p.userId, userName: p.userName }))
    };
  }

  // プレイヤー一覧取得
  getPlayerList() {
    return this.players.map((p, index) => `${index + 1}. ${p.userName}`).join('\n');
  }
  // プレイヤー取得
  getPlayer(userId) {
    return this.players.find(p => p.userId === userId);
  }

  // アクティビティ更新（コマンド受信時に呼び出し）
  updateActivity() {
    this.lastActivity = new Date();
    this.resetAutoEndTimer();
  }

  // 自動終了タイマー開始
  startAutoEndTimer() {
    if (this.autoEndTimer) {
      clearTimeout(this.autoEndTimer);
    }
    
    this.autoEndTimer = setTimeout(() => {
      this.autoEnd();
    }, this.autoEndTimeout);
  }

  // 自動終了タイマーリセット
  resetAutoEndTimer() {
    if (this.status === 'ended') return;
    
    if (this.autoEndTimer) {
      clearTimeout(this.autoEndTimer);
    }
    
    this.startAutoEndTimer();
  }

  // 自動終了実行
  autoEnd() {
    if (this.status === 'ended') return;
    
    this.status = 'ended';
    console.log(`Game ${this.groupId} auto-ended due to inactivity`);
    
    // GameManagerに通知が必要な場合のためのフラグ
    this.autoEnded = true;
  }

  // タイマークリア（ゲーム終了時）
  clearAutoEndTimer() {
    if (this.autoEndTimer) {
      clearTimeout(this.autoEndTimer);
      this.autoEndTimer = null;
    }
  }

  // ゲーム終了時にタイマーもクリア
  endGame() {
    this.status = 'ended';
    this.clearAutoEndTimer();
    return { success: true, message: 'ゲームが終了しました。' };
  }
}

module.exports = BaseGame;
