// 襲撃能力（人狼）
class AttackAbility {
  constructor() {
    this.id = 'attack';
    this.name = '襲撃';
    this.description = '対象を襲撃して殺害する';
    this.requiredRoles = ['werewolf'];
  }

  // 襲撃対象の有効性チェック
  validateTarget(actor, target, gameState) {
    if (!target) {
      return { valid: false, message: '襲撃対象を指定してください。' };
    }

    if (!target.isAlive) {
      return { valid: false, message: '死亡したプレイヤーを襲撃することはできません。' };
    }

    if (target.id === actor.id) {
      return { valid: false, message: '自分自身を襲撃することはできません。' };
    }

    if (target.role === 'werewolf') {
      return { valid: false, message: '仲間の人狼を襲撃することはできません。' };
    }

    return { valid: true };
  }

  // 襲撃実行
  execute(actor, target, gameState) {
    const validation = this.validateTarget(actor, target, gameState);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }    // 護衛チェック
    const guardedPlayers = this.getGuardedPlayers(gameState);
    const isGuarded = guardedPlayers.includes(target.id);

    if (isGuarded) {
      return {
        success: true,
        result: 'guarded',
        target: target,
        message: `${target.nickname}を襲撃しましたが、護衛されていました。`,
        publicMessage: '昨夜は平和でした。'
      };
    }

    // 襲撃成功
    return {
      success: true,
      result: 'killed',
      target: target,
      message: `${target.nickname}を襲撃しました。`,
      publicMessage: `${target.nickname}が人狼に襲撃されました。`,
      effects: {
        kill: [target.id]
      }
    };
  }  // 護衛されているプレイヤーを取得
  getGuardedPlayers(gameState) {
    // nightActionsがMapの場合の処理
    if (gameState.nightActions instanceof Map) {
      const guardedPlayers = [];
      for (const [userId, action] of gameState.nightActions.entries()) {
        // actionの構造: { type: 'guard', target: 'villager1', timestamp: ... }
        if (action.type === 'guard' && action.target) {
          guardedPlayers.push(action.target);
        }
      }
      return guardedPlayers;
    }
    
    // 従来形式の配列の場合の処理
    const guardActions = gameState.nightActions?.guard || [];
    return guardActions.map(action => action.targetId);
  }

  // クイックリプライ選択肢生成
  generateQuickReply(actor, gameState) {
    const alivePlayers = gameState.players.filter(p => 
      p.isAlive && p.id !== actor.id && p.role !== 'werewolf'
    );

    return {
      type: 'quick_reply',
      title: '襲撃対象を選んでください',
      options: alivePlayers.map(player => ({
        label: player.nickname,
        text: `#襲撃 @${player.nickname}`,
        value: player.id
      }))
    };
  }

  // 深夜処理後の個人ログ生成（襲撃結果詳細）
  generateNightLog(actor, attackResult, attackType = 'single', additionalInfo = {}) {
    if (!attackResult || !attackResult.target) return null;

    const target = attackResult.target;
    let message = '';

    if (attackResult.result === 'killed') {
      message = `🔪 襲撃成功！${target.nickname}を襲撃しました。`;
      
      if (attackType === 'random' && additionalInfo.allTargets) {
        message += `\n（複数の襲撃対象から${target.nickname}がランダムで選ばれました）`;
      } else if (attackType === 'unified' && additionalInfo.actorCount > 1) {
        message += `\n（${additionalInfo.actorCount}人の人狼が同じ対象を襲撃しました）`;
      }
    } else if (attackResult.result === 'guarded') {
      message = `🛡️ 襲撃失敗！${target.nickname}は護衛されていました。`;
    } else {
      message = `❓ 襲撃が何らかの理由で阻止されました。`;
    }

    return message;
  }
}

module.exports = AttackAbility;
