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
    }

    // 護衛チェック
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
  }

  // 護衛されているプレイヤーを取得
  getGuardedPlayers(gameState) {
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
}

module.exports = AttackAbility;
