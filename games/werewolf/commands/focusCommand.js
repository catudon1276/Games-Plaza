// #疑う / #憧憬コマンド処理
class FocusCommand {
  constructor(werewolfGame) {
    this.game = werewolfGame;
    this.abilityManager = this.game.nightActionManager.abilityManager;
  }

  // 注目コマンド処理
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

    // 役職チェック（村人または狂人のみ）
    const playerTeam = this.game.roleManager.getRoleTeam ? 
      this.game.roleManager.getRoleTeam(player.role) : 
      (player.role === 'werewolf' ? 'werewolf' : 'village');

    if (!['village', 'werewolf'].includes(playerTeam) || player.role === 'werewolf') {
      return { 
        success: false, 
        message: 'この行動は実行できません。' 
      };
    }

    // 引数チェック
    if (!args || args.length === 0) {
      const actionName = playerTeam === 'village' ? '疑う' : '憧憬';
      return { 
        success: false, 
        message: `対象を指定してください。形式: #${actionName} @プレイヤー名` 
      };
    }

    const targetName = args.join(' ').replace('@', '').trim();
    if (!targetName) {
      return { 
        success: false, 
        message: '対象のプレイヤー名を正しく指定してください。' 
      };
    }

    // 対象プレイヤーを検索
    const targetPlayer = this.game.players.find(p => 
      p.nickname === targetName && p.isAlive
    );

    if (!targetPlayer) {
      return { 
        success: false, 
        message: `プレイヤー「${targetName}」が見つからないか、既に死亡しています。` 
      };
    }

    // 自己選択チェック
    if (targetPlayer.id === userId) {
      return { 
        success: false, 
        message: '自分自身を選択することはできません。' 
      };
    }

    // 注目アクション実行
    const focusAbility = this.abilityManager.getAbility('focus');
    const result = focusAbility.execute(player, targetPlayer, { game: this.game });

    if (result.success) {
      // 夜行動として登録
      this.game.nightActionManager.submitAction(userId, 'focus', targetPlayer.id);
      
      this.game.updateActivity();
      return {
        success: true,
        message: result.privateMessage,
        target: targetPlayer.nickname
      };
    } else {
      return result;
    }
  }
}

module.exports = FocusCommand;
