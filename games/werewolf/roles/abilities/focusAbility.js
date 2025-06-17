// 注目アクション（疑う/憧憬） - 統一実装
const { getRoleName, getRoleTeam } = require('../meta');

class FocusAbility {
  constructor() {
    this.id = 'focus';
    this.name = '注目';
    this.description = '誰かに注目する（効果なし、メタ推理防止用）';
  }

  // 注目対象の検証
  validateTarget(actor, target, gameState) {
    if (!target) {
      return { valid: false, message: '注目対象を選択してください。' };
    }

    if (!target.isAlive) {
      return { valid: false, message: '死亡したプレイヤーを選択することはできません。' };
    }

    if (target.id === actor.id) {
      return { valid: false, message: '自分自身を選択することはできません。' };
    }

    return { valid: true };
  }

  // 注目実行（何も起こらない）
  execute(actor, target, gameState) {
    const validation = this.validateTarget(actor, target, gameState);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    // 役職に応じたメッセージを生成
    const actionName = this.getActionName(actor.role);
    const actionEmoji = this.getActionEmoji(actor.role);    return {
      success: true,
      result: {
        targetId: target.id,
        targetName: target.nickname,
        actionType: actionName,
        noEffect: true
      },
      message: `${target.nickname}を${actionName}しました。`
    };
  }

  // 役職に応じたアクション名取得
  getActionName(roleId) {
    const team = getRoleTeam(roleId);
    switch (team) {
      case 'village':
        return '疑い'; // 村人陣営は「疑う」
      case 'werewolf':
        return '憧憬'; // 人狼陣営（狂人）は「憧憬」
      default:
        return '注目'; // デフォルト
    }
  }

  // 役職に応じた絵文字取得
  getActionEmoji(roleId) {
    const team = getRoleTeam(roleId);
    switch (team) {
      case 'village':
        return '🤔'; // 村人陣営は疑い
      case 'werewolf':
        return '😍'; // 人狼陣営は憧憬
      default:
        return '👁️'; // デフォルト
    }
  }

  // クイックリプライ生成
  generateQuickReply(actor, gameState) {
    const alivePlayers = gameState.alivePlayers || [];
    const validTargets = alivePlayers.filter(p => p.id !== actor.id);

    if (validTargets.length === 0) {
      return {
        message: '注目できる対象がいません。',
        actions: [{ type: 'skip', target: null, display: '何もしない' }]
      };
    }

    const actionName = this.getActionName(actor.role);
    const actionEmoji = this.getActionEmoji(actor.role);

    return {
      message: `${actionEmoji} ${actionName}の対象を選択してください（必須）`,
      actions: validTargets.map(p => ({
        type: 'focus',
        target: p.id,
        display: `${p.nickname}を${actionName}`
      }))
      // スキップオプションは意図的に追加しない（必須選択）
    };
  }

  // ランダムターゲット生成（タイムアウト時）
  generateRandomTarget(actor, gameState) {
    const alivePlayers = gameState.alivePlayers || [];
    const validTargets = alivePlayers.filter(p => p.id !== actor.id);

    if (validTargets.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * validTargets.length);
    return validTargets[randomIndex];
  }

  // 深夜処理後の個人ログ生成（注目行動詳細）
  generateNightLog(actor, focusResult) {
    if (!focusResult || !focusResult.target) return null;

    const target = focusResult.target;
    const actionName = this.getActionName(actor.role);
    const actionEmoji = this.getActionEmoji(actor.role);

    return `${actionEmoji} あなたは${target.nickname}を${actionName}ました`;
  }

  // 公開メッセージなし（隠密行動）
  buildPublicMessage(result) {
    return null; // この行動は公開されない
  }
}

module.exports = FocusAbility;
