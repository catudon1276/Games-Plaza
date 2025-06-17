// 護衛能力（騎士）
class GuardAbility {
  constructor() {
    this.id = 'guard';
    this.name = '護衛';
    this.description = '対象を人狼の襲撃から守る';
    this.requiredRoles = ['knight'];
  }

  // 護衛対象の有効性チェック
  validateTarget(actor, target, gameState) {
    if (!target) {
      return { valid: false, message: '護衛対象を指定してください。' };
    }

    if (!target.isAlive) {
      return { valid: false, message: '死亡したプレイヤーを護衛することはできません。' };
    }

    // 連続護衛制限（オプション）
    const lastNightGuard = this.getLastNightGuard(actor, gameState);
    if (lastNightGuard === target.id) {
      return { valid: false, message: '同じ人を連続で護衛することはできません。' };
    }

    return { valid: true };
  }

  // 護衛実行
  execute(actor, target, gameState) {
    const validation = this.validateTarget(actor, target, gameState);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }    return {
      success: true,
      result: {
        targetId: target.id,
        targetName: target.nickname,
        actionType: 'guard'
      },
      target: target,
      message: `${target.nickname}を護衛しました。`,
      effects: {
        guard: [target.id]
      }
    };
  }

  // 前夜の護衛対象取得
  getLastNightGuard(actor, gameState) {
    // 護衛履歴から前夜の対象を取得（今後実装）
    return null;
  }

  // クイックリプライ選択肢生成
  generateQuickReply(actor, gameState) {
    const alivePlayers = gameState.players.filter(p => p.isAlive);
    const lastNightGuard = this.getLastNightGuard(actor, gameState);

    return {
      type: 'quick_reply',
      title: '護衛対象を選んでください',
      options: alivePlayers
        .filter(player => player.id !== lastNightGuard) // 連続護衛除外
        .map(player => ({
          label: player.nickname + (player.id === actor.id ? '（自分）' : ''),
          text: `#護衛 @${player.nickname}`,
          value: player.id
        }))
    };
  }  // 深夜処理後の個人ログ生成（護衛対象確認のみ）
  generateNightLog(actor, guardResult, attackResults = []) {
    if (!guardResult) return null;

    // guardResultが直接結果オブジェクトの場合
    if (guardResult.targetName) {
      return `🛡️ ${guardResult.targetName}を護衛しました。`;
    }
    
    // guardResultがtargetプロパティを持つ場合（従来形式）
    if (guardResult.target && guardResult.target.nickname) {
      return `🛡️ ${guardResult.target.nickname}を護衛しました。`;
    }

    return null;
  }

  // 護衛成功判定ヘルパー
  wasGuardSuccessful(guardTarget, attackResults) {
    return attackResults.some(attack => 
      attack.ability === 'attack' && 
      attack.target && 
      attack.target.id === guardTarget.id &&
      attack.result === 'guarded'
    );
  }
}

module.exports = GuardAbility;
