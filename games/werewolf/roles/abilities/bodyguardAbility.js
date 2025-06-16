// 狩人（ボディガード）の能力処理
class BodyguardAbility {
  constructor(game) {
    this.game = game;
    this.rolesMeta = require('../meta').rolesMeta;
  }

  // 護衛能力実行
  execute(bodyguardId, targetId) {
    const bodyguard = this.game.getPlayer(bodyguardId);
    const target = this.game.getPlayer(targetId);

    if (!bodyguard || !target) {
      return {
        success: false,
        message: '無効なプレイヤーです。'
      };
    }

    if (!target.isAlive) {
      return {
        success: false,
        message: '死亡したプレイヤーは護衛できません。'
      };
    }

    // 自分を護衛することはできない（ゲームバランス調整）
    if (bodyguardId === targetId) {
      return {
        success: false,
        message: '自分自身は護衛できません。'
      };
    }

    return {
      success: true,
      targetId: targetId,
      targetName: target.nickname,
      bodyguardId: bodyguardId,
      bodyguardName: bodyguard.nickname,
      message: `${target.nickname}を護衛対象に選択しました。`
    };
  }

  // 護衛判定（襲撃との相互作用）
  resolveProtection(targetId, attackTargetId) {
    const target = this.game.getPlayer(targetId);
    if (!target || !target.isAlive) {
      return {
        success: false,
        protected: false,
        message: '護衛対象が無効です。'
      };
    }

    // 護衛対象と襲撃対象が一致するかチェック
    const isTargetAttacked = targetId === attackTargetId;

    if (isTargetAttacked) {
      return {
        success: true,
        protected: true,
        targetId: targetId,
        targetName: target.nickname,
        message: `${target.nickname}の護衛が成功しました。襲撃を防ぎました。`
      };
    } else {
      return {
        success: true,
        protected: false,
        targetId: targetId,
        targetName: target.nickname,
        message: `${target.nickname}を護衛しましたが、襲撃はありませんでした。`
      };
    }
  }

  // 護衛可能対象のリスト取得
  getValidTargets(bodyguardId) {
    return this.game.players.filter(player => 
      player.isAlive && player.id !== bodyguardId
    ).map(player => ({
      id: player.id,
      name: player.nickname
    }));
  }

  // 連続護衛チェック（同じ相手を連続で護衛できないルール用）
  checkConsecutiveProtection(bodyguardId, targetId) {
    if (!this.game.protectionHistory) {
      return true; // 初回は常にOK
    }

    const lastProtection = this.game.protectionHistory
      .filter(p => p.bodyguardId === bodyguardId)
      .sort((a, b) => b.dayCount - a.dayCount)[0];

    if (!lastProtection) {
      return true; // 過去に護衛していない
    }

    // 前日と同じ対象は護衛できない場合
    return lastProtection.targetId !== targetId;
  }

  // 護衛履歴の記録
  recordAction(bodyguardId, targetId, result) {
    if (!this.game.protectionHistory) {
      this.game.protectionHistory = [];
    }

    this.game.protectionHistory.push({
      timestamp: new Date(),
      bodyguardId: bodyguardId,
      targetId: targetId,
      result: result,
      dayCount: this.game.phaseManager.dayCount
    });
  }
}

module.exports = BodyguardAbility;
