// 霊媒能力（霊媒師）
class MediumAbility {
  constructor() {
    this.id = 'medium';
    this.name = '霊媒';
    this.description = '処刑された人の正体を知る';
    this.requiredRoles = ['medium'];
  }

  // 霊媒は自動実行（処刑後に結果を通知）
  execute(actor, executedPlayer, gameState) {
    if (!executedPlayer) {
      return {
        success: true,
        message: '昨日は処刑がありませんでした。',
        privateMessage: '🔮 昨日は処刑がありませんでした。霊視する対象がいません。'
      };
    }

    // 霊媒結果を取得
    const result = this.getMediumResult(executedPlayer);
    const resultText = result === 'white' ? '白（村人陣営）' : '黒（人狼陣営）';

    return {
      success: true,
      result: result,
      target: executedPlayer,
      message: `${executedPlayer.nickname}を霊視しました。`,
      privateMessage: `👻 霊媒結果: ${executedPlayer.nickname}は「${resultText}」でした。`,
      effects: {
        // 霊媒は直接的な効果なし（情報取得のみ）
      }
    };
  }

  // 霊媒結果取得
  getMediumResult(target) {
    const { getMediumResult } = require('../meta');
    return getMediumResult(target.role);
  }

  // 霊媒師は夜行動不要（自動実行）
  generateQuickReply(actor, gameState) {
    return {
      type: 'text',
      message: '霊媒師は自動で処刑者を霊視します。行動選択は不要です。'
    };
  }
}

module.exports = MediumAbility;
