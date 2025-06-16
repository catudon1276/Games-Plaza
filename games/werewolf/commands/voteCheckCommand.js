// #投票確認コマンド処理
class VoteCheckCommand {
  constructor(werewolfGame) {
    this.game = werewolfGame;
    this.voteManager = this.game.voteManager;
  }

  // #投票確認コマンド処理
  execute(userId) {
    // 昼フェーズチェック
    if (!this.game.phaseManager.isDay()) {
      return { 
        success: false, 
        message: '昼フェーズでのみ投票状況を確認できます。' 
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

    // 投票状況取得
    const voteStatus = this.voteManager.getVoteStatus();
    let message = '📊 現在の投票状況:\n\n';
    
    if (voteStatus.totalVotes === 0) {
      message += 'まだ誰も投票していません。\n';
    } else {
      // 得票数順にソート
      const sortedVotes = Object.entries(voteStatus.votes)
        .sort(([,a], [,b]) => b.count - a.count);
      
      for (const [playerId, voteInfo] of sortedVotes) {
        const targetPlayer = this.game.getPlayer(playerId);
        if (targetPlayer && voteInfo.count > 0) {
          message += `${targetPlayer.nickname}: ${voteInfo.count}票`;
          if (voteInfo.voters.length > 0) {
            const voterNames = voteInfo.voters.map(v => v.name).join('、');
            message += ` (${voterNames})`;
          }
          message += '\n';
        }
      }
    }
    
    message += `\n投票済み: ${voteStatus.totalVotes}/${voteStatus.alivePlayers}人`;
    
    // 全員投票済みの場合
    if (voteStatus.allVoted) {
      message += '\n\n全員が投票済みです。まもなく夜フェーズに移行します。';
    }
    
    return {
      success: true,
      message: message,
      voteStatus: voteStatus
    };
  }
}

module.exports = VoteCheckCommand;
