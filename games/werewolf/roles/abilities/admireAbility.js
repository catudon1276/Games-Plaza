// 憧憬アクション（狂人）
const { getRoleName, getRoleTeam } = require('../meta');

class AdmireAbility {
  constructor() {
    this.id = 'admire';
    this.name = '憧憬';
    this.description = '誰かに憧れる（効果はないが、行動パターンを隠すため）';
    this.requiredRoles = ['madman'];
    this.mandatory = true; // 必須行動（スキップ不可）
  }

  // 憧憬対象の有効性チェック
  validateTarget(actor, target, gameState) {
    if (!target) {
      return { valid: false, message: '憧憬の対象を選択してください。' };
    }

    if (!target.isAlive) {
      return { valid: false, message: '死亡したプレイヤーに憧憬することはできません。' };
    }

    if (target.id === actor.id) {
      return { valid: false, message: '自分自身に憧憬することはできません。' };
    }

    return { valid: true };
  }

  // 憧憬アクション実行（実際には何も起こらない）
  execute(actor, target, gameState) {
    const validation = this.validateTarget(actor, target, gameState);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    // 狂人なので人狼への憧憬を示唆するメッセージ
    let privateMsg = `✨ あなたは${target.nickname}に憧憬を抱きました。`;
    if (getRoleTeam(target.role) === 'werewolf' && target.role === 'werewolf') {
      privateMsg += '（あなたの直感は正しいかもしれません...）';
    } else {
      privateMsg += '（この行動は他の人には見えません）';
    }

    return {
      success: true,
      result: {
        type: 'admire',
        actorId: actor.id,
        actorName: actor.nickname,
        targetId: target.id,
        targetName: target.nickname,
        effect: 'none' // 実際の効果はなし
      },
      message: `${target.nickname}に憧憬しました。`,
      privateMessage: privateMsg,
      publicMessage: null // 公開されない
    };
  }

  // 憧憬対象の選択肢生成
  generateTargetOptions(actor, gameState) {
    const alivePlayers = gameState.alivePlayers || gameState.game.players.filter(p => p.isAlive);
    
    return alivePlayers
      .filter(p => p.id !== actor.id)
      .map(p => ({
        type: 'admire',
        target: p.id,
        display: `${p.nickname}に憧憬する`
      }));
  }

  // クイックリプライ生成
  generateQuickReply(actor, gameState) {
    const options = this.generateTargetOptions(actor, gameState);
    
    return {
      message: '✨ 誰に憧憬しますか？（必須選択）',
      actions: options
    };
  }

  // ランダム対象選択（タイムアウト時）
  generateRandomAction(actor, gameState) {
    const options = this.generateTargetOptions(actor, gameState);
    if (options.length === 0) {
      return null;
    }

    const randomOption = options[Math.floor(Math.random() * options.length)];
    return {
      type: randomOption.type,
      target: randomOption.target
    };
  }

  // 結果の公開メッセージ構築（なし）
  buildPublicMessage(result) {
    return null; // 憧憬は公開されない
  }

  // 個別メッセージ構築
  buildPrivateMessage(actorId, result) {
    if (result.actorId === actorId) {
      return `✨ あなたは${result.targetName}に憧憬しました。`;
    }
    return null;
  }
}

module.exports = AdmireAbility;
