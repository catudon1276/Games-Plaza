const BaseGame = require('../../utils/baseGame');
const PhaseManager = require('./utils/phaseManager');
const RoleManager = require('./utils/roleManager');
const NightActionManager = require('./utils/nightActionManager');
const VoteManager = require('./utils/voteManager');
const WinConditionChecker = require('./utils/winConditionChecker');
const StartCommand = require('./commands/startCommand');
const VoteCommand = require('./commands/voteCommand');
const VoteCheckCommand = require('./commands/voteCheckCommand');
const AttackCommand = require('./commands/attackCommand');
const FocusCommand = require('./commands/focusCommand');
const NightResolutionCommand = require('./commands/nightResolutionCommand');
const DivineCommand = require('./commands/divineCommand');
const { guardCommand } = require('./commands/guardCommand');

class WerewolfGame extends BaseGame {
  constructor(groupId) {
    super(groupId);
    this.gameType = 'werewolf';
    this.minPlayers = 3;
    this.maxPlayers = 20;
    
    // 人狼ゲーム専用マネージャー
    this.phaseManager = new PhaseManager();
    this.roleManager = new RoleManager();
    this.nightActionManager = new NightActionManager(this);
    this.voteManager = new VoteManager(this);
    this.winConditionChecker = new WinConditionChecker(this);    // コマンドハンドラー
    this.startCommand = new StartCommand(this);    this.voteCommand = new VoteCommand(this);
    this.voteCheckCommand = new VoteCheckCommand(this);
    this.attackCommand = new AttackCommand(this);
    this.focusCommand = new FocusCommand(this);
    this.nightResolutionCommand = new NightResolutionCommand(this);
    this.divineCommand = new DivineCommand(this);
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
  }  // #開始コマンド処理
  handleStartCommand(userId, userName) {
    const phaseCheck = this.checkPhaseRestriction('start', userId);
    if (!phaseCheck.allowed) {
      return { success: false, message: phaseCheck.message };
    }
    const result = this.startCommand.execute(userId, userName);
    
    // ゲーム開始時に会議フェーズのタイマーを開始
    if (result.success) {
      this.startDayPhaseTimer();
    }
    
    return result;
  }
  // #投票コマンド処理
  handleVoteCommand(userId, args) {
    const phaseCheck = this.checkPhaseRestriction('vote', userId);
    if (!phaseCheck.allowed) {
      return { success: false, message: phaseCheck.message };
    }
    const result = this.voteCommand.execute(userId, args);
    this.checkAutoNightTransition();
    return result;
  }

  // #投票確認コマンド処理
  handleVoteCheckCommand(userId) {
    const phaseCheck = this.checkPhaseRestriction('vote_check', userId);
    if (!phaseCheck.allowed) {
      return { success: false, message: phaseCheck.message };
    }
    return this.voteCheckCommand.execute(userId);
  }
  // #襲撃コマンド処理
  handleAttackCommand(userId, args) {
    const phaseCheck = this.checkPhaseRestriction('attack', userId);
    if (!phaseCheck.allowed) {
      return { success: false, message: phaseCheck.message };
    }
    const result = this.attackCommand.execute(userId, args);
    this.checkAutoNightResolution();
    return result; // publicMessageも含めて返す
  }
  // #疑う / #憧憬コマンド処理
  handleFocusCommand(userId, args) {
    // フェーズチェック（argsから実際のコマンドタイプを推定）
    const actionMap = { '疑う': 'suspect', '憧憬': 'admire' };
    const commandType = actionMap[args?.action] || 'focus';
    const phaseCheck = this.checkPhaseRestriction(commandType, userId);
    if (!phaseCheck.allowed) {
      return { success: false, message: phaseCheck.message };
    }
    const result = this.focusCommand.execute(userId, args);
    this.checkAutoNightResolution();
    return result; // publicMessageも含めて返す
  }
  // #占いコマンド処理
  async handleDivineCommand(userId, args) {
    const phaseCheck = this.checkPhaseRestriction('divine', userId);
    if (!phaseCheck.allowed) {
      return { success: false, message: phaseCheck.message };
    }    const result = this.divineCommand.execute(userId, args);
    this.checkAutoNightResolution();
    
    // publicMessageの可能性も考慮
    return { 
      success: true, 
      message: result.message, 
      isPrivate: result.isPrivate,
      publicMessage: result.publicMessage 
    };
  }
  // #護衛コマンド処理
  async handleGuardCommand(userId, args) {
    const phaseCheck = this.checkPhaseRestriction('guard', userId);
    if (!phaseCheck.allowed) {
      return { success: false, message: phaseCheck.message };
    }    const result = await guardCommand(this, userId, args);
    this.checkAutoNightResolution();
    
    // publicMessageの可能性も考慮
    return { 
      success: true, 
      message: result.message, 
      isPrivate: result.isPrivate,
      publicMessage: result.publicMessage 
    };
  }

  // 深夜フェーズ処理
  handleNightResolution() {
    return this.nightResolutionCommand.execute();
  }

  // 勝利判定
  checkWinCondition() {
    return this.winConditionChecker.checkWinCondition();
  }
  // 自動夜移行チェック
  checkAutoNightTransition() {
    if (!this.phaseManager.isVote()) return;

    const voteStatus = this.voteManager.getVoteStatus();
    if (voteStatus.allVoted) {
      // 少し待ってから自動移行
      setTimeout(() => {
        this.autoSwitchToNight();
      }, 2000); // 2秒後
    }
  }

  // 会議フェーズタイマー開始
  startDayPhaseTimer() {
    if (!this.phaseManager.isDay()) return;
    
    this.phaseManager.startPhaseTimer('DAY', () => {
      this.handleDayPhaseTimeout();
    });
  }

  // 会議時間終了時の処理
  async handleDayPhaseTimeout() {
    console.log('🕐 Day phase timeout - switching to voting phase');
    
    // 投票フェーズに移行
    const phaseResult = this.phaseManager.switchToVoting();
    
    if (phaseResult.success) {
      this.updateActivity();
      
      // 投票開始
      const voteResult = await this.voteManager.startVotingPhase();
      
      // グループにメッセージ送信
      if (this.gameManager && this.gameManager.messageSender) {
        try {
          await this.gameManager.sendAdditionalMessage(
            this.groupId,
            phaseResult.message,
            0 // 即座に送信
          );
          
          if (voteResult.success) {
            await this.gameManager.sendAdditionalMessage(
              this.groupId,
              voteResult.message,
              1000 // 1秒後
            );
          }
        } catch (error) {
          console.error('Day phase timeout message send error:', error);
        }
      }
    }
  }

  // 投票フェーズから夜フェーズへの移行
  async switchToNightPhase() {
    const phaseResult = this.phaseManager.switchToNightWaiting();
    
    if (phaseResult.success) {
      this.updateActivity();
      
      // 夜行動のクイックリプライを送信
      const nightActionResult = await this.nightActionManager.startNightPhase();
      
      // 勝利判定
      const winCheck = this.checkWinCondition();
      
      // グループにメッセージ送信
      if (this.gameManager && this.gameManager.messageSender) {
        try {
          await this.gameManager.sendAdditionalMessage(
            this.groupId,
            phaseResult.message,
            0 // 即座に送信
          );
          
          if (nightActionResult.success) {
            await this.gameManager.sendAdditionalMessage(
              this.groupId,
              nightActionResult.message,
              1000 // 1秒後
            );
          }
          
          if (winCheck.gameEnded) {
            await this.gameManager.sendAdditionalMessage(
              this.groupId,
              winCheck.message,
              2000 // 2秒後
            );
          }
        } catch (error) {
          console.error('Night phase transition message send error:', error);
        }
      }
    }
  }
  // 自動夜移行実行
  autoSwitchToNight() {
    if (!this.phaseManager.isVote()) return;

    const voteStatus = this.voteManager.getVoteStatus();
    if (!voteStatus.allVoted) return;

    // 投票タイマーをクリア
    this.voteManager.clearVoteTimer();
    
    // 投票結果を処理して夜フェーズに移行
    this.voteManager.processVoteResults();
  }
  // 自動深夜移行チェック
  checkAutoNightResolution() {
    if (!this.phaseManager.isNightWaiting()) return;

    // 新しいアクション要約システムを使用
    const actionSummary = this.nightActionManager.getActionSummary();
    
    if (actionSummary.allComplete) {
      // 少し待ってから自動移行
      setTimeout(() => {
        this.autoSwitchToNightResolving();
      }, 2000); // 2秒後
    }
  }

  // 自動深夜移行実行
  autoSwitchToNightResolving() {
    if (!this.phaseManager.isNightWaiting()) return;

    // 深夜フェーズに移行
    const switchResult = this.phaseManager.switchToNightResolving();
    if (switchResult.success) {
      // 少し待ってから行動処理を実行
      setTimeout(() => {
        this.handleNightResolution();
      }, 3000); // 3秒後
    }
  }
  // ゲーム状態取得
  getStatus() {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      phase: this.phaseManager.getCurrentPhaseInfo(),
      roleComposition: this.roleComposition || null,
      voteStatus: this.phaseManager.isVote() ? this.voteManager.getVoteStatus() : null,
      nightActions: this.phaseManager.isNight() ? this.nightActionManager.getActionSummary() : null
    };
  }

  // ゲーム終了時の処理
  endGame() {
    this.phaseManager.endGame();
    return super.endGame();
  }
  // フェーズ制限チェック
  checkPhaseRestriction(commandType, userId) {
    const currentPhase = this.phaseManager.currentPhase;
    const player = this.getPlayer(userId);      // ゲーム開始前は#開始と@終了のみ許可
    if (currentPhase === 'waiting') {
      if (['start', 'end'].includes(commandType)) {
        return { allowed: true };
      }
      return { 
        allowed: false, 
        message: 'ゲーム開始前です。#開始 コマンドでゲームを開始してください。' 
      };
    }
    
    // ゲーム中でない場合
    if (!this.isActive) {
      return { 
        allowed: false, 
        message: 'ゲームが開始されていません。' 
      };
    }
      // プレイヤーチェック
    if (!player) {
      return { 
        allowed: false, 
        message: 'ゲームに参加していません。' 
      };
    }
      // 死者チェック（例外コマンドを除く）
    if (!player.isAlive && !['start', 'status', 'end'].includes(commandType)) {
      return { 
        allowed: false, 
        message: '死者は行動できません。（ステータス確認は可能です）' 
      };
    }
    
    // 常に許可されるコマンド
    if (['end', 'status'].includes(commandType)) {
      return { allowed: true };
    }
      // フェーズ別制限
    switch (currentPhase) {
      case 'day':
        if (['vote_check'].includes(commandType)) {
          return { allowed: true };
        }
        if (['vote'].includes(commandType)) {
          return { 
            allowed: false, 
            message: '昼フェーズです。議論を行ってください。投票は投票フェーズで行われます。' 
          };
        }
        if (['attack', 'divine', 'guard', 'focus', 'suspect', 'admire'].includes(commandType)) {
          return { 
            allowed: false, 
            message: '昼フェーズです。議論を行ってください。夜行動は夜フェーズでのみ可能です。' 
          };
        }
        break;
        
      case 'vote':
        if (['vote', 'vote_check'].includes(commandType)) {
          return { allowed: true };
        }
        if (['attack', 'divine', 'guard', 'focus', 'suspect', 'admire'].includes(commandType)) {
          return { 
            allowed: false, 
            message: '投票フェーズです。投票を行ってください。夜行動は夜フェーズでのみ可能です。' 
          };
        }
        break;
        
      case 'night_waiting':
        if (['attack', 'divine', 'guard', 'focus', 'suspect', 'admire'].includes(commandType)) {
          return { allowed: true };
        }
        if (['vote', 'vote_check'].includes(commandType)) {
          return { 
            allowed: false, 
            message: '夜フェーズです。投票は昼フェーズでのみ可能です。' 
          };
        }
        break;
        
      case 'night_resolving':
        return { 
          allowed: false, 
          message: '深夜フェーズ中です。行動を処理しています。しばらくお待ちください。' 
        };
        
      case 'ended':
        return { 
          allowed: false, 
          message: 'ゲームは既に終了しています。' 
        };
        
      default:
        return { 
          allowed: false, 
          message: '不明なフェーズです。' 
        };
    }
    
    // デフォルト拒否
    return { 
      allowed: false, 
      message: `${commandType}コマンドは現在のフェーズ（${currentPhase}）では使用できません。` 
    };
  }

  // #ステータス / #状況 コマンド処理（今後実装予定）
  handleStatusCommand(userId) {
    const phaseCheck = this.checkPhaseRestriction('status', userId);
    if (!phaseCheck.allowed) {
      return { success: false, message: phaseCheck.message };
    }
    
    // TODO: ステータスコマンドの実装
    const player = this.getPlayer(userId);
    const currentPhase = this.phaseManager.getCurrentPhaseInfo();
    
    return {
      success: true,
      message: `📊 ゲーム状況:\n` +
               `・フェーズ: ${currentPhase.name}\n` +
               `・参加者: ${this.players.length}人\n` +
               `・生存者: ${this.players.filter(p => p.isAlive).length}人\n` +
               `・あなたの状態: ${player?.isAlive ? '生存' : '死亡'}\n` +
               `・役職: ${player?.role ? this.roleManager.getRoleName(player.role) : '未割当'}`
    };
  }

  // @終了コマンド処理（GameManagerからの委譲用）
  handleEndCommand(userId) {
    const phaseCheck = this.checkPhaseRestriction('end', userId);
    if (!phaseCheck.allowed) {
      return { success: false, message: phaseCheck.message };
    }
    
    // 通常はGameManagerで処理されるが、念のため
    return {
      success: true,
      message: '⚠️ ゲーム終了はGameManagerで処理されます。',
      delegateToGameManager: true
    };
  }
}

module.exports = WerewolfGame;
