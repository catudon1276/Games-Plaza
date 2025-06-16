// 占い能力（占い師）
class DivineAbility {
  constructor() {
    this.id = 'divine';
    this.name = '占い';
    this.description = '対象の正体（白/黒）を知る';
    this.requiredRoles = ['seer'];
  }

  // 占い対象の有効性チェック
  validateTarget(actor, target, gameState) {
    if (!target) {
      return { valid: false, message: '占い対象を指定してください。' };
    }

    if (!target.isAlive) {
      return { valid: false, message: '死亡したプレイヤーを占うことはできません。' };
    }

    if (target.id === actor.id) {
      return { valid: false, message: '自分自身を占うことはできません。' };
    }

    return { valid: true };
  }

  // 占い実行
  execute(actor, target, gameState) {
    const validation = this.validateTarget(actor, target, gameState);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    // 占い結果を取得
    const result = this.getDivineResult(target);
    const resultText = result === 'white' ? '白（村人陣営）' : '黒（人狼陣営）';

    return {
      success: true,
      result: result,
      target: target,
      message: `${target.nickname}を占いました。`,
      privateMessage: `🔮 占い結果: ${target.nickname}は「${resultText}」です。`,
      effects: {
        // 占いは直接的な効果なし（情報取得のみ）
      }
    };
  }

  // 占い結果取得
  getDivineResult(target) {
    const { getDivineResult } = require('../meta');
    return getDivineResult(target.role);
  }

  // クイックリプライ選択肢生成
  generateQuickReply(actor, gameState) {
    const alivePlayers = gameState.players.filter(p => 
      p.isAlive && p.id !== actor.id
    );

    return {
      type: 'quick_reply',
      title: '占い対象を選んでください',
      options: alivePlayers.map(player => ({
        label: player.nickname,
        text: `#占い @${player.nickname}`,
        value: player.id
      }))
    };
  }
}

module.exports = DivineAbility;
