// ゲーム管理クラス
class GameManager {
  constructor() {
    this.games = new Map(); // groupId -> game instance
    this.playerGroupMap = new Map(); // userId -> groupId (プレイヤーがどのグループでゲーム中か)
    this.cleanupInterval = null; // 定期クリーンアップのタイマー
    this.messageSender = null; // メッセージ送信機能
    this.lineClient = null; // LINE Client
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
  }  // 自動終了したゲームをクリーンアップ
  cleanupAutoEndedGames() {
    let cleanedCount = 0;
    const now = new Date();
    
    for (const [groupId, game] of this.games.entries()) {
      // より厳密なクリーンアップ条件
      const isAutoEnded = game.autoEnded === true;
      const isStatusEnded = game.status === 'ended';
      const isOldInactivity = game.lastActivity && (now - game.lastActivity) > (35 * 60 * 1000); // 35分以上前
      
      if (isAutoEnded || (isStatusEnded && isOldInactivity)) {
        console.log(`🧹 Cleaning up auto-ended game: ${groupId} (autoEnded: ${isAutoEnded}, statusEnded: ${isStatusEnded}, oldInactivity: ${isOldInactivity})`);
        
        // タイマーをクリア
        if (game.clearAutoEndTimer) {
          game.clearAutoEndTimer();
        }
        
        // プレイヤーマッピングのクリーンアップ
        if (game.players) {
          game.players.forEach(player => {
            this.playerGroupMap.delete(player.userId);
          });
        }
        
        // ゲームインスタンス削除
        this.games.delete(groupId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} auto-ended games`);
    }
  }

  // 定期的なクリーンアップを開始（オプション）
  startPeriodicCleanup() {
    // 既にタイマーが動いている場合は停止
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // 5分ごとに自動終了ゲームをクリーンアップ
    this.cleanupInterval = setInterval(() => {
      this.cleanupAutoEndedGames();
    }, 5 * 60 * 1000); // 5分間隔
    
    console.log('Periodic cleanup started (5-minute intervals)');
  }

  // 定期クリーンアップ停止
  stopPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Periodic cleanup stopped');
    }
  }
  // 個人チャットでのゲームコマンド処理
  async handlePrivateNightCommand(userId, userName, command, args = []) {
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
    }    // 人狼ゲーム専用の夜行動コマンド
    if (game.gameType === 'werewolf') {
      let result;
      
      switch (command) {
        case '#投票':
          result = await game.handleVoteCommand(userId, args);
          break;
        case '#襲撃':
          result = await game.handleAttackCommand(userId, args);
          break;
        case '#疑う':
        case '#憧憬':
          result = await game.handleFocusCommand(userId, { action: command.substring(1), target: args[0] });
          break;
        case '#占い':
          result = await game.handleDivineCommand(userId, command + ' ' + args.join(' '));
          break;
        case '#護衛':
          result = await game.handleGuardCommand(userId, command + ' ' + args.join(' '));
          break;
        default:
          return { 
            success: false, 
            message: `不明なコマンドです: ${command}\n使用可能: #投票 #襲撃 #占い #護衛 #疑う #憧憬` 
          };
      }
      // ゲームコマンド完了時の追加メッセージ処理
      if (result.success && result.publicMessage) {
        this.sendAdditionalMessage(groupId, result.publicMessage, 1500);
      }
      
      // 占い結果など個人メッセージがある場合
      if (result.success && result.privateMessages && result.privateMessages.length > 0) {
        setTimeout(async () => {
          try {
            await this.messageSender.sendPrivateMessages(result.privateMessages);
          } catch (error) {
            console.error('Private messages send error:', error);
          }
        }, 500);
      }
      
      return result;
    }

    return { success: false, message: 'このゲームではコマンドは使用できません。' };
  }

  // プレイヤーの参加グループ取得
  getPlayerGroup(userId) {
    return this.playerGroupMap.get(userId);
  }

  // プレイヤーマッピングのクリーンアップ
  cleanupPlayerMapping(userId) {
    this.playerGroupMap.delete(userId);
  }

  // MessageSender設定
  setMessageSender(messageSender) {
    this.messageSender = messageSender;
  }

  // LINE Clientを設定
  setLineClient(lineClient) {
    this.lineClient = lineClient;
    this.messageSender = new (require('./lineMessageSender'))(lineClient);
  }

  // コマンド結果に応じてメッセージを送信
  async sendCommandResult(event, result) {
    if (!this.messageSender) {
      console.log('LineMessageSender not initialized');
      return;
    }
    
    try {
      // 基本の応答メッセージ
      await this.messageSender.sendCommandResult(event, result);
      
      // 追加の公開メッセージがある場合
      if (result.publicMessage && result.groupId) {
        setTimeout(async () => {
          await this.messageSender.sendPublicMessage(result.groupId, result.publicMessage);
        }, 500);
      }
    } catch (error) {
      console.error('Error sending command result:', error);
    }
  }

  // 追加メッセージ送信（夜更け通知など）
  async sendAdditionalMessage(groupId, message, delay = 1000) {
    if (this.messageSender) {
      setTimeout(async () => {
        try {
          await this.messageSender.sendPublicMessage(groupId, message);
        } catch (error) {
          console.error('Additional message send error:', error);
        }
      }, delay);
    }
  }

  // 個人メッセージ送信
  async sendPrivateMessage(userId, message) {
    if (this.messageSender) {
      try {
        await this.messageSender.sendPrivateMessages([{ userId, message }]);
      } catch (error) {
        console.error('Private message send error:', error);
      }
    }
  }
}

module.exports = GameManager;
