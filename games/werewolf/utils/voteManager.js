// 投票管理機能
class VoteManager {
  constructor(werewolfGame) {
    this.game = werewolfGame;
    this.votes = new Map(); // Map<voterId, targetId>
    this.voteHistory = [];  // 投票履歴
    this.voteTimer = null;  // 投票タイマー
    this.autoVoteEnabled = false; // 自動投票モード
  }

  // 投票フェーズ開始（個人チャットに投票選択肢送信）
  async startVotingPhase() {
    this.autoVoteEnabled = true;
    this.votes.clear(); // 前回の投票をクリア
    
    const alivePlayers = this.getAlivePlayers();
    const votingPlayers = alivePlayers.slice(); // 生存者全員が投票可能
    
    console.log(`🗳️ Starting voting phase for ${votingPlayers.length} players`);
    
    // 各プレイヤーに個人チャットで投票選択肢を送信
    const votingPromises = votingPlayers.map(player => 
      this.sendVoteQuickReply(player, alivePlayers)
    );
    
    try {
      await Promise.all(votingPromises);
      
      // 3分後に自動投票処理
      this.voteTimer = setTimeout(() => {
        this.handleVoteTimeout();
      }, 3 * 60 * 1000); // 3分
        return {
        success: true,
        message: `🗳️ 投票フェーズが開始されました！\n\n` +
                 `各プレイヤーは個人チャットで投票してください。\n` +
                 `⏰ 制限時間: 3分\n` +
                 `⚠️ 時間内に投票しなかった場合、ランダムで投票が割り当てられます。\n` +
                 `📊 投票対象者: ${votingPlayers.length}人`,
        votingPlayers: votingPlayers.length
      };
    } catch (error) {
      console.error('Vote quick reply send error:', error);
      return {
        success: false,
        message: '投票開始でエラーが発生しました。'
      };
    }
  }

  // 個人チャットに投票クイックリプライを送信
  async sendVoteQuickReply(voter, candidates) {
    if (!this.game.gameManager || !this.game.gameManager.messageSender) {
      console.log('MessageSender not available for vote quick reply');
      return;
    }
    
    // 自分以外の生存者が投票対象
    const validCandidates = candidates.filter(c => c.userId !== voter.userId);
    
    const quickReplyItems = validCandidates.map(candidate => ({
      label: `🗳️ ${candidate.displayName}`,
      text: `#投票 ${candidate.displayName}`
    }));
      try {
      await this.game.gameManager.messageSender.sendQuickReply(
        voter.userId,
        `🗳️ **投票フェーズ**\n` +
        `処刑対象を選択してください。\n\n` +
        `⏰ 制限時間: 3分\n` +
        `⚠️ 未投票の場合はランダム投票になります。\n\n` +
        `👆 下のボタンから選択してください：`,
        quickReplyItems,
        false // pushMessage使用
      );
    } catch (error) {
      console.error(`Failed to send vote quick reply to ${voter.displayName}:`, error);
    }
  }
  // 投票タイムアウト処理
  handleVoteTimeout() {
    console.log('🗳️ Vote timeout - processing automatic votes');
    
    const alivePlayers = this.getAlivePlayers();
    const unvotedPlayers = alivePlayers.filter(p => !this.votes.has(p.userId));
    
    // 未投票者にランダム投票を割り当て
    if (unvotedPlayers.length > 0) {
      console.log(`⏰ Assigning random votes to ${unvotedPlayers.length} players who didn't vote`);
      
      unvotedPlayers.forEach(player => {
        const candidates = alivePlayers.filter(c => c.userId !== player.userId);
        if (candidates.length > 0) {
          const randomTarget = candidates[Math.floor(Math.random() * candidates.length)];
          this.votes.set(player.userId, randomTarget.userId);
          
          this.voteHistory.push({
            timestamp: new Date(),
            voterId: player.userId,
            voterName: player.displayName,
            targetId: randomTarget.userId,
            targetName: randomTarget.displayName,
            action: 'auto_vote'
          });
          
          console.log(`🎲 Auto vote: ${player.displayName} → ${randomTarget.displayName}`);
        }
      });
    } else {
      console.log('✅ All players have voted - no auto votes needed');
    }
    
    // 投票結果発表・処刑実行
    this.processVoteResults();
  }
  // 投票結果処理
  async processVoteResults() {
    this.autoVoteEnabled = false;
    this.clearVoteTimer();
    
    const results = this.determineExecution();
    
    // 結果をグループに送信
    if (this.game.gameManager && this.game.gameManager.messageSender) {
      try {
        await this.game.gameManager.sendAdditionalMessage(
          this.game.groupId,
          results.message,
          0 // 即座に送信
        );
        
        // 夜フェーズに移行
        setTimeout(() => {
          this.game.switchToNightPhase();
        }, 3000); // 3秒後
        
      } catch (error) {
        console.error('Vote results send error:', error);
      }
    }
    
    return results;
  }

  // 投票タイマークリア
  clearVoteTimer() {
    if (this.voteTimer) {
      clearTimeout(this.voteTimer);
      this.voteTimer = null;
    }
  }

  // 生存プレイヤー取得
  getAlivePlayers() {
    return this.game.players.filter(p => p.isAlive);
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

  // 投票可能なプレイヤー一覧を取得
  getVotablePlayer(voterId) {
    const voter = this.game.getPlayer(voterId);
    if (!voter || !voter.isAlive) {
      return [];
    }

    // 生存プレイヤーから投票者自身を除外
    return this.game.players.filter(p => 
      p.isAlive && p.userId !== voterId
    );
  }

  // 投票用クイックリプライを生成
  generateVoteQuickReply(voterId) {
    const votablePlayers = this.getVotablePlayer(voterId);
    
    if (votablePlayers.length === 0) {
      return {
        message: '投票可能なプレイヤーがいません。',
        quickReply: null
      };
    }

    const quickReplyItems = votablePlayers.map(player => ({
      type: 'action',
      action: {
        type: 'message',
        label: `🗳️ ${player.displayName}`,
        text: `#投票 ${player.displayName}`
      }
    }));

    return {
      message: '📊 投票先を選択してください：',
      quickReply: {
        items: quickReplyItems.slice(0, 13) // LINEの制限（最大13個）
      }
    };
  }
}

module.exports = VoteManager;
