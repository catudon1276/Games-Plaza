// ゲーム管理クラス
class GameManager {
  constructor() {
    this.games = new Map(); // groupId -> game instance
    this.playerGroupMap = new Map(); // userId -> groupId (プレイヤーがどのグループでゲーム中か)
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
    }    // 人狼ゲーム専用のコマンド
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
        case '#占い':
          return game.handleDivineCommand(userId, command + ' ' + args.join(' '));
        case '#護衛':
          return game.handleGuardCommand(userId, command + ' ' + args.join(' '));
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
    }

    const game = new GameClass(groupId);
    this.games.set(groupId, game);
    
    // ゲーム作成者を最初のプレイヤーとして追加
    const result = game.addPlayer(userId, userName);
    if (result.success) {
      // プレイヤー-グループマッピングを記録
      this.playerGroupMap.set(userId, groupId);
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

    const result = game.addPlayer(userId, nickname);
    if (result.success) {
      // プレイヤー-グループマッピングを記録
      this.playerGroupMap.set(userId, groupId);
    }

    return result;
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
      
      // プレイヤーマッピングのクリーンアップ
      game.players.forEach(player => {
        this.playerGroupMap.delete(player.userId);
      });
      
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

  // 個人チャットでの夜行動コマンド処理
  handlePrivateNightCommand(userId, userName, command, args = []) {
    // プレイヤーがゲームに参加しているグループを取得
    const groupId = this.playerGroupMap.get(userId);
    if (!groupId) {
      return { 
        success: false, 
        message: '現在参加中のゲームがありません。グループチャットで@人狼を送ってゲームを開始してください。' 
      };
    }

    const game = this.games.get(groupId);
    if (!game) {
      // マッピングが残っているがゲームが存在しない場合（クリーンアップ）
      this.playerGroupMap.delete(userId);
      return { 
        success: false, 
        message: 'ゲームが見つかりません。グループチャットで@人狼を送ってゲームを開始してください。' 
      };
    }

    // 人狼ゲーム専用の夜行動コマンド
    if (game.gameType === 'werewolf') {
      switch (command) {
        case '#襲撃':
          return game.handleAttackCommand(userId, args);
        case '#疑う':
        case '#憧憬':
          return game.handleFocusCommand(userId, { action: command.substring(1), target: args[0] });
        case '#占い':
          return game.handleDivineCommand(userId, command + ' ' + args.join(' '));
        case '#護衛':
          return game.handleGuardCommand(userId, command + ' ' + args.join(' '));
        default:
          return { 
            success: false, 
            message: `不明な夜行動コマンドです: ${command}\n使用可能: #襲撃 #占い #護衛 #疑う #憧憬` 
          };
      }
    }

    return { success: false, message: 'このゲームでは夜行動コマンドは使用できません。' };
  }

  // プレイヤーの参加グループ取得
  getPlayerGroup(userId) {
    return this.playerGroupMap.get(userId);
  }

  // プレイヤーマッピングのクリーンアップ
  cleanupPlayerMapping(userId) {
    this.playerGroupMap.delete(userId);
  }
}

module.exports = GameManager;
