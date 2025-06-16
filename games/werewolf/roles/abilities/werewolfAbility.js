// 人狼の能力処理
class WerewolfAbility {
  constructor(game) {
    this.game = game;
    this.rolesMeta = require('../meta').rolesMeta;
  }

  // 襲撃能力実行
  execute(werewolfId, targetId) {
    const werewolf = this.game.getPlayer(werewolfId);
    const target = this.game.getPlayer(targetId);

    if (!werewolf || !target) {
      return {
        success: false,
        message: '無効なプレイヤーです。'
      };
    }

    if (!target.isAlive) {
      return {
        success: false,
        message: '死亡したプレイヤーは襲撃できません。'
      };
    }

    if (werewolfId === targetId) {
      return {
        success: false,
        message: '自分自身は襲撃できません。'
      };
    }

    // 同じ人狼は襲撃できない
    if (target.role === this.game.roleManager.roles.WEREWOLF) {
      return {
        success: false,
        message: '人狼同士は襲撃できません。'
      };
    }

    // 襲撃実行（護衛判定は後で）
    return {
      success: true,
      targetId: targetId,
      targetName: target.nickname,
      werewolfId: werewolfId,
      werewolfName: werewolf.nickname,
      message: `${target.nickname}を襲撃対象に選択しました。`
    };
  }

  // 襲撃処理（護衛との相互作用を含む）
  resolveAttack(targetId, protections = []) {
    const target = this.game.getPlayer(targetId);
    if (!target || !target.isAlive) {
      return {
        success: false,
        killed: false,
        message: '襲撃対象が無効です。'
      };
    }

    // 護衛チェック
    const isProtected = protections.some(protection => 
      protection.targetId === targetId && protection.success
    );

    if (isProtected) {
      return {
        success: true,
        killed: false,
        protected: true,
        targetId: targetId,
        targetName: target.nickname,
        message: `${target.nickname}は護衛されていたため、襲撃は失敗しました。`
      };
    }

    // 襲撃成功
    target.isAlive = false;
    target.deathReason = 'werewolf_attack';
    target.deathDay = this.game.phaseManager.dayCount;

    return {
      success: true,
      killed: true,
      protected: false,
      targetId: targetId,
      targetName: target.nickname,
      targetRole: target.role,
      message: `${target.nickname}が人狼に襲撃されました。`
    };
  }

  // 襲撃可能対象のリスト取得
  getValidTargets(werewolfId) {
    return this.game.players.filter(player => 
      player.isAlive && 
      player.id !== werewolfId && 
      player.role !== this.game.roleManager.roles.WEREWOLF
    ).map(player => ({
      id: player.id,
      name: player.nickname
    }));
  }

  // 人狼チーム取得
  getWerewolfTeam() {
    return this.game.players.filter(player => 
      player.role === this.game.roleManager.roles.WEREWOLF
    ).map(player => ({
      id: player.id,
      name: player.nickname,
      isAlive: player.isAlive
    }));
  }

  // 襲撃履歴の記録
  recordAction(werewolfId, targetId, result) {
    if (!this.game.attackHistory) {
      this.game.attackHistory = [];
    }

    this.game.attackHistory.push({
      timestamp: new Date(),
      werewolfId: werewolfId,
      targetId: targetId,
      result: result,
      dayCount: this.game.phaseManager.dayCount
    });
  }
}

module.exports = WerewolfAbility;
