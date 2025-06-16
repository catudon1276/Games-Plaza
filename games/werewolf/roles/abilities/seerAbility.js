// 占い師の能力処理
class SeerAbility {
  constructor(game) {
    this.game = game;
    this.rolesMeta = require('../meta').rolesMeta;
  }

  // 占い能力実行
  execute(seerId, targetId) {
    const seer = this.game.getPlayer(seerId);
    const target = this.game.getPlayer(targetId);

    if (!seer || !target) {
      return {
        success: false,
        message: '無効なプレイヤーです。'
      };
    }

    if (!target.isAlive) {
      return {
        success: false,
        message: '死亡したプレイヤーは占えません。'
      };
    }

    if (seerId === targetId) {
      return {
        success: false,
        message: '自分自身は占えません。'
      };
    }

    // 占い結果を取得
    const targetRoleMeta = this.rolesMeta[target.role];
    const result = targetRoleMeta.reveal.seenBySeer; // "white" or "black"

    // 結果テキスト生成
    const resultText = result === 'white' ? '村人陣営' : '人狼陣営';
    const resultEmoji = result === 'white' ? '⚪' : '⚫';

    return {
      success: true,
      result: result,
      message: `🔮 占い結果\n${target.nickname}は「${resultEmoji} ${resultText}」です。`,
      targetId: targetId,
      targetName: target.nickname,
      seerId: seerId,
      seerName: seer.nickname
    };
  }

  // 占い可能対象のリスト取得
  getValidTargets(seerId) {
    return this.game.players.filter(player => 
      player.isAlive && player.id !== seerId
    ).map(player => ({
      id: player.id,
      name: player.nickname
    }));
  }

  // 占い履歴の記録
  recordAction(seerId, targetId, result) {
    if (!this.game.seerHistory) {
      this.game.seerHistory = [];
    }

    this.game.seerHistory.push({
      timestamp: new Date(),
      seerId: seerId,
      targetId: targetId,
      result: result,
      dayCount: this.game.phaseManager.dayCount
    });
  }
}

module.exports = SeerAbility;
