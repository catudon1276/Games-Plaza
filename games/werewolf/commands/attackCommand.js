// #襲撃コマンド処理
class AttackCommand {
  constructor(werewolfGame) {
    this.game = werewolfGame;
    this.nightActionManager = this.game.nightActionManager;
  }

  // #襲撃コマンド処理
  execute(userId, args) {
    // 夜フェーズチェック
    if (!this.game.phaseManager.isNightWaiting()) {
      return { 
        success: false, 
        message: '夜フェーズでのみ襲撃できます。' 
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

    // 人狼チェック
    if (player.role !== this.game.roleManager.roles.WEREWOLF) {
      return { 
        success: false, 
        message: '人狼のみが襲撃を行えます。' 
      };
    }

    // 引数チェック
    if (!args || args.length === 0) {
      return { 
        success: false, 
        message: '襲撃対象を指定してください。形式: #襲撃 @プレイヤー名' 
      };
    }

    const targetName = args.join(' ').replace('@', '').trim();
    if (!targetName) {
      return { 
        success: false, 
        message: '襲撃対象のプレイヤー名を正しく指定してください。' 
      };
    }

    // 襲撃対象プレイヤーを検索
    const targetPlayer = this.game.players.find(p => 
      p.nickname === targetName && p.isAlive
    );

    if (!targetPlayer) {
      return { 
        success: false, 
        message: `プレイヤー「${targetName}」が見つからないか、既に死亡しています。` 
      };
    }

    // 自己襲撃チェック
    if (targetPlayer.id === userId) {
      return { 
        success: false, 
        message: '自分自身を襲撃することはできません。' 
      };
    }

    // 人狼同士の襲撃チェック
    if (targetPlayer.role === this.game.roleManager.roles.WEREWOLF) {
      return { 
        success: false, 
        message: '仲間の人狼を襲撃することはできません。' 
      };
    }

    // 襲撃行動を設定
    const result = this.nightActionManager.setAction(userId, 'attack', {
      targetId: targetPlayer.id,
      targetName: targetPlayer.nickname
    });
      if (result.success) {
      this.game.updateActivity();
      
      // submitActionの結果をそのまま返す（重複メッセージを避ける）
      return {
        success: true,
        message: result.message, // nightActionManagerのメッセージを使用
        target: {
          id: targetPlayer.id,
          name: targetPlayer.nickname
        },
        publicMessage: result.publicMessage // 公開メッセージがあれば含める
      };
    } else {
      return result;
    }
  }

  // 自動深夜フェーズ移行
  autoSwitchToNightResolving() {
    // 深夜フェーズに移行
    const switchResult = this.game.phaseManager.switchToNightResolving();
    if (switchResult.success) {
      // 少し待ってから行動処理を実行
      setTimeout(() => {
        this.game.handleNightResolution();
      }, 3000); // 3秒後
    }
  }
}

module.exports = AttackCommand;
