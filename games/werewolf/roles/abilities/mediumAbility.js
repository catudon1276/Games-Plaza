// 霊媒能力（霊媒師）
class MediumAbility {
  constructor() {
    this.id = 'medium';
    this.name = '霊媒';
    this.description = '処刑された人の正体を知る';
    this.requiredRoles = ['medium'];
  }
  // 霊媒は自動実行（処刑後に結果を通知）
  execute(actor, executedPlayers, gameState) {
    if (!executedPlayers || executedPlayers.length === 0) {
      return {
        success: true,
        message: '昨日は処刑がありませんでした。',
        privateMessage: '🔮 昨日は処刑がありませんでした。霊視する対象がいません。'
      };
    }

    // 複数処刑者がいる場合も対応
    const results = [];
    let resultMessage = '👻 霊媒結果:\n';

    for (const executedPlayer of executedPlayers) {
      const result = this.getMediumResult(executedPlayer);
      const resultText = result === 'white' ? '白（村人陣営）' : '黒（人狼陣営）';
      results.push({ player: executedPlayer, result });
      resultMessage += `・${executedPlayer.nickname}: 「${resultText}」\n`;
    }

    return {
      success: true,
      results: results,
      targets: executedPlayers,
      message: `処刑された${executedPlayers.length}人を霊視しました。`,
      privateMessage: resultMessage.trim(),
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
      message: '霊媒師は自動で全ての処刑者を霊視します。行動選択は不要です。'
    };
  }

  // 深夜処理後の個人ログ生成（霊媒結果詳細）
  generateNightLog(actor, mediumResult) {
    if (!mediumResult || !mediumResult.targets || mediumResult.targets.length === 0) {
      return '👻 昨日は処刑がありませんでした。霊視する対象がいません。';
    }

    const results = mediumResult.results || [];
    let message = '👻 霊媒結果:\n';

    for (const result of results) {
      const resultText = result.result === 'white' ? '白（村人陣営）' : '黒（人狼陣営）';
      const resultEmoji = result.result === 'white' ? '😇' : '😈';
      message += `・${result.player.nickname}: 「${resultText}」 ${resultEmoji}\n`;
    }

    return message.trim();
  }
}

module.exports = MediumAbility;
