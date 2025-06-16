// #投票コマンド処理
class VoteCommand {
  constructor(werewolfGame) {
    this.game = werewolfGame;
    this.voteManager = this.game.voteManager;
  }

  // #投票コマンド処理
  execute(userId, args) {
    // 昼フェーズチェック
    if (!this.game.phaseManager.isDay()) {
      return { 
        success: false, 
        message: '昼フェーズでのみ投票できます。' 
      };
    }

    // プレイヤーチェック
    const player = this.game.getPlayer(userId);
    if (!player) {
      return { 
        success: false, 
        message: 'ゲームに参加していません。' 
      };
    }

    // 死亡プレイヤーチェック
    if (!player.isAlive) {
      return { 
        success: false, 
        message: '死亡したプレイヤーは投票できません。' 
      };
    }

    // 引数チェック
    if (!args || args.length === 0) {
      return { 
        success: false, 
        message: '投票先を指定してください。形式: #投票 @プレイヤー名' 
      };
    }

    const targetName = args.join(' ').replace('@', '').trim();
    if (!targetName) {
      return { 
        success: false, 
        message: '投票先のプレイヤー名を正しく指定してください。' 
      };
    }

    // 投票先プレイヤーを検索
    const targetPlayer = this.game.players.find(p => 
      p.nickname === targetName && p.isAlive
    );

    if (!targetPlayer) {
      return { 
        success: false, 
        message: `プレイヤー「${targetName}」が見つからないか、既に死亡しています。` 
      };
    }

    // 自己投票チェック
    if (targetPlayer.id === userId) {
      return { 
        success: false, 
        message: '自分自身には投票できません。' 
      };
    }

    // 投票実行
    const result = this.voteManager.vote(userId, targetPlayer.id);
    
    if (result.success) {
      this.game.updateActivity();
      
      let message = `${targetPlayer.nickname}に投票しました。`;
      
      // 全員投票完了チェック
      const voteStatus = this.voteManager.getVoteStatus();
      if (voteStatus.allVoted) {
        message += '\n\n全員が投票完了しました。夜フェーズに移行します...';
        
        // 自動で夜フェーズに移行
        setTimeout(() => {
          this.autoSwitchToNight();
        }, 2000); // 2秒後に自動移行
      } else {
        message += `\n投票済み: ${voteStatus.totalVotes}/${voteStatus.alivePlayers}人`;
      }
      
      return {
        success: true,
        message: message,
        voteCount: result.voteCount,
        totalVotes: result.totalVotes,
        allVoted: voteStatus.allVoted
      };
    } else {
      return result;
    }
  }

  // 自動夜フェーズ移行
  autoSwitchToNight() {
    // 処刑対象決定
    const executionResult = this.game.voteManager.determineExecution();
    
    // フェーズを夜に移行
    const phaseResult = this.game.phaseManager.switchToNightWaiting();
    
    if (phaseResult.success) {
      this.game.updateActivity();
      
      let message = `📊 投票結果:\n${executionResult.message}\n\n`;
      message += phaseResult.message;
      
      // 勝利判定
      const winCheck = this.game.checkWinCondition();
      if (winCheck.gameEnded) {
        message += `\n\n${winCheck.message}`;
        this.game.endGame();
      }
      
      // グループチャットに結果を送信（実際のLINE BOT実装時に使用）
      return {
        success: true,
        message: message,
        phase: phaseResult.phase,
        dayCount: phaseResult.dayCount,
        execution: executionResult,
        winCheck: winCheck
      };
    }
  }
}

module.exports = VoteCommand;
