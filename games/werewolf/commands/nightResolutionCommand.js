// 深夜フェーズの行動処理コマンド - メタデータベース対応
class NightResolutionCommand {
  constructor(werewolfGame) {
    this.game = werewolfGame;
  }

  // 深夜フェーズの行動処理実行
  execute() {
    // 深夜フェーズチェック
    if (!this.game.phaseManager.isNightResolving()) {
      return { 
        success: false, 
        message: '深夜フェーズではありません。' 
      };
    }

    try {
      // 夜の行動を処理（新しいメタデータシステム使用）
      const actionResults = this.game.nightActionManager.resolveNightActions();
      
      // 昼フェーズに移行
      const phaseResult = this.game.phaseManager.switchToDay();
      
      if (phaseResult.success) {
        // 投票をリセット
        this.game.voteManager.resetVotes();
        
        // アクティビティ更新
        this.game.updateActivity();
        
        // 勝利判定
        const winCheck = this.game.checkWinCondition();
        
        let publicMessage = actionResults.publicMessage;
        publicMessage += `\n\n${phaseResult.message}`;
        
        if (winCheck.gameEnded) {
          publicMessage += `\n\n${winCheck.message}`;
          this.game.endGame();
        }
        
        return {
          success: true,
          publicMessage: publicMessage,
          privateMessages: actionResults.privateMessages,
          phase: phaseResult.phase,
          dayCount: phaseResult.dayCount,
          actionResults: actionResults,
          winCheck: winCheck
        };
      } else {
        return phaseResult;
      }
    } catch (error) {
      console.error('Night resolution error:', error);
      return { 
        success: false, 
        message: '深夜フェーズの処理中にエラーが発生しました。' 
      };    }
  }

  // 自動深夜フェーズ移行チェック
  checkAutoNightResolution() {
    if (!this.game.phaseManager.isNightWaiting()) {
      return false;
    }

    // 全ての生きている特殊役職が行動完了しているかチェック
    const aliveWerewolves = this.game.players.filter(p => 
      p.isAlive && p.role === this.game.roleManager.roles.WEREWOLF
    );

    // 人狼が行動を選択しているかチェック
    const werewolfActions = this.game.nightActionManager.getActionsByRole('werewolf');
    const werewolfActionsCompleted = werewolfActions.werewolf !== null;

    // 今後、他の役職の行動も含める
    // const seerActionsCompleted = ...;
    // const knightActionsCompleted = ...;

    return werewolfActionsCompleted; // && seerActionsCompleted && knightActionsCompleted;
  }

  // 自動深夜フェーズ移行実行
  autoResolveNight() {
    if (this.checkAutoNightResolution()) {
      // 深夜フェーズに移行
      const switchResult = this.game.phaseManager.switchToNightResolving();
      if (switchResult.success) {
        // 少し待ってから行動処理を実行
        setTimeout(() => {
          this.execute();
        }, 3000); // 3秒後
        
        return {
          success: true,
          message: '全ての夜行動が完了しました。深夜フェーズに移行します...'
        };
      }
    }
    
    return {
      success: false,
      message: 'まだ行動が完了していない役職があります。'
    };
  }
}

module.exports = NightResolutionCommand;
