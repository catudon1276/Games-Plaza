// #占い コマンド処理
class DivineCommand {
  constructor(werewolfGame) {
    this.game = werewolfGame;
    this.abilityManager = this.game.nightActionManager.abilityManager;
  }

  // 占いコマンド処理
  execute(userId, args) {
    // 夜フェーズチェック
    if (!this.game.phaseManager.isNightWaiting()) {
      return { 
        success: false, 
        message: '夜フェーズでのみ使用できるコマンドです。' 
      };
    }

    // プレイヤーチェック
    const player = this.game.getPlayer(userId);
    if (!player) {
      return { 
        success: false, 
        message: 'ゲームに参加していません。' 
      };
    }

    // 死亡プレイヤーチェック
    if (!player.isAlive) {
      return { 
        success: false, 
        message: '死亡したプレイヤーは行動できません。' 
      };
    }

    // 役職チェック
    if (player.role !== 'seer') {
      return { 
        success: false, 
        message: '占い師のみが使用できるコマンドです。' 
      };
    }

    // 既に行動済みかチェック
    if (this.game.nightActionManager.pendingActions.has(userId)) {
      return { 
        success: false, 
        message: '既に夜行動を選択済みです。' 
      };
    }

    // 対象プレイヤーの解析
    let targetPlayer = null;
    
    if (args && args.length > 0) {
      // @プレイヤー名 形式での指定
      const targetName = args[0].startsWith('@') ? args[0].substring(1) : args[0];
      targetPlayer = this.game.players.find(p => 
        p.nickname === targetName || p.userName === targetName
      );
    }

    if (!targetPlayer) {
      return { 
        success: false, 
        message: '占い対象を指定してください。\n使用例: #占い @プレイヤー名' 
      };
    }

    // 占い能力の検証
    const divineAbility = this.abilityManager.getAbility('divine');
    const validation = divineAbility.validateTarget(player, targetPlayer, { game: this.game });
    
    if (!validation.valid) {
      return { 
        success: false, 
        message: validation.message 
      };
    }

    // 夜行動として登録
    const submitResult = this.game.nightActionManager.submitAction(userId, 'divine', targetPlayer.id);
    
    if (submitResult.success) {
      this.game.updateActivity();
      return {
        success: true,
        message: submitResult.message, // nightActionManagerのメッセージを使用
        target: targetPlayer.nickname,
        publicMessage: submitResult.publicMessage // 公開メッセージがあれば含める
      };
    } else {
      return submitResult;
    }
  }
}

module.exports = DivineCommand;
