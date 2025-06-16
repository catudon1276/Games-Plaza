// 投票管理機能
class VoteManager {
  constructor(werewolfGame) {
    this.game = werewolfGame;
    this.votes = new Map(); // Map<voterId, targetId>
    this.voteHistory = [];  // 投票履歴
  }
  // 投票実行
  vote(voterId, targetId) {
    // 投票者チェック
    const voter = this.game.getPlayer(voterId);
    if (!voter || !voter.isAlive) {
      return { 
        success: false, 
        message: '投票できません。' 
      };
    }

    // 投票先チェック
    const target = this.game.getPlayer(targetId);
    if (!target || !target.isAlive) {
      return { 
        success: false, 
        message: '投票先が無効です。' 
      };
    }

    // 前回の投票を記録
    const previousVote = this.votes.get(voterId);
    
    // 投票実行
    this.votes.set(voterId, targetId);
    
    // 履歴に追加
    this.voteHistory.push({
      timestamp: new Date(),
      voterId: voterId,
      voterName: voter.nickname,
      targetId: targetId,
      targetName: target.nickname,
      action: previousVote ? 'change' : 'vote'
    });

    const voteStatus = this.getVoteStatus();
    
    return {
      success: true,
      message: `${target.nickname}に投票しました。`,
      voteCount: voteStatus.votes[targetId]?.count || 0,
      totalVotes: voteStatus.totalVotes,
      allVoted: voteStatus.allVoted
    };
  }

  // 投票状況取得
  getVoteStatus() {
    const alivePlayers = this.game.players.filter(p => p.isAlive);
    const totalVotes = this.votes.size;
    const allVoted = totalVotes === alivePlayers.length;
    
    // 各プレイヤーの得票数を計算
    const votes = {};
    for (const player of alivePlayers) {
      votes[player.id] = {
        count: 0,
        voters: []
      };
    }
    
    for (const [voterId, targetId] of this.votes.entries()) {
      if (votes[targetId]) {
        votes[targetId].count++;
        const voter = this.game.getPlayer(voterId);
        if (voter) {
          votes[targetId].voters.push({
            id: voterId,
            name: voter.nickname
          });
        }
      }
    }

    return {
      votes: votes,
      totalVotes: totalVotes,
      alivePlayers: alivePlayers.length,
      allVoted: allVoted,
      voteHistory: this.voteHistory
    };
  }

  // 処刑対象決定
  determineExecution() {
    const voteStatus = this.getVoteStatus();
    const alivePlayers = this.game.players.filter(p => p.isAlive);
    
    // 得票数の多い順にソート
    const sortedVotes = Object.entries(voteStatus.votes)
      .filter(([playerId, voteInfo]) => voteInfo.count > 0)
      .sort(([,a], [,b]) => b.count - a.count);

    if (sortedVotes.length === 0) {
      return {
        executed: null,
        message: '誰も投票されませんでした。今日は処刑はありません。',
        reason: 'no_votes'
      };
    }

    const [topPlayerId, topVotes] = sortedVotes[0];
    const topPlayer = this.game.getPlayer(topPlayerId);
    
    // 同票かチェック
    const sameVoteCount = sortedVotes.filter(([,voteInfo]) => 
      voteInfo.count === topVotes.count
    ).length;

    if (sameVoteCount > 1) {
      const tiedPlayers = sortedVotes
        .filter(([,voteInfo]) => voteInfo.count === topVotes.count)
        .map(([playerId]) => this.game.getPlayer(playerId).nickname)
        .join('、');
        
      return {
        executed: null,
        message: `${tiedPlayers}が同票のため、今日は処刑はありません。`,
        reason: 'tie',
        tiedPlayers: tiedPlayers,
        tiedVoteCount: topVotes.count
      };
    }

    // 処刑実行
    if (topPlayer) {
      topPlayer.isAlive = false;
      topPlayer.deathReason = 'execution';
      topPlayer.deathDay = this.game.phaseManager.dayCount;
      
      return {
        executed: {
          id: topPlayer.id,
          name: topPlayer.nickname,
          role: topPlayer.role
        },
        message: `${topPlayer.nickname}が処刑されました。役職は「${this.game.roleManager.getRoleDisplayName(topPlayer.role)}」でした。`,
        reason: 'execution',
        voteCount: topVotes.count
      };
    }

    return {
      executed: null,
      message: 'エラーが発生しました。',
      reason: 'error'
    };
  }

  // 投票リセット（新しい日の開始時）
  resetVotes() {
    this.votes.clear();
    // 履歴は保持
  }

  // 投票履歴取得
  getVoteHistory() {
    return this.voteHistory;
  }
}

module.exports = VoteManager;
