// 人狼ゲームの役職管理
class RoleManager {
  constructor() {
    this.roles = {
      WEREWOLF: 'werewolf',      // 人狼
      VILLAGER: 'villager',      // 市民
      SEER: 'seer',              // 占い師
      KNIGHT: 'knight',          // 騎士
      MEDIUM: 'medium'           // 霊媒師
    };

    this.roleNames = {
      [this.roles.WEREWOLF]: '人狼',
      [this.roles.VILLAGER]: '市民',
      [this.roles.SEER]: '占い師',
      [this.roles.KNIGHT]: '騎士',
      [this.roles.MEDIUM]: '霊媒師'
    };

    this.roleDescriptions = {
      [this.roles.WEREWOLF]: '夜に市民を襲撃できます。仲間の人狼と協力して市民を全滅させましょう。',
      [this.roles.VILLAGER]: '特殊能力はありませんが、議論で人狼を見つけ出しましょう。',
      [this.roles.SEER]: '夜に一人を占い、人狼かどうか知ることができます。',
      [this.roles.KNIGHT]: '夜に一人を守り、人狼の襲撃から守ることができます。',
      [this.roles.MEDIUM]: '処刑された人の役職を知ることができます。'
    };
  }

  // 人数に応じた役職構成を決定
  getRoleComposition(playerCount) {
    const werewolfCount = Math.floor(playerCount / 3); // 3分の1が人狼
    const roles = [];

    // 人狼を追加
    for (let i = 0; i < werewolfCount; i++) {
      roles.push(this.roles.WEREWOLF);
    }

    // 特殊役職を追加（人数に応じて）
    if (playerCount >= 5) roles.push(this.roles.SEER);     // 占い師
    if (playerCount >= 7) roles.push(this.roles.KNIGHT);   // 騎士
    if (playerCount >= 9) roles.push(this.roles.MEDIUM);   // 霊媒師

    // 残りは市民
    while (roles.length < playerCount) {
      roles.push(this.roles.VILLAGER);
    }

    return roles;
  }

  // 役職をプレイヤーに割り当て
  assignRolesToPlayers(players) {
    const playerCount = players.length;
    const roles = this.getRoleComposition(playerCount);
    
    // シャッフル
    this.shuffleArray(roles);
    
    // プレイヤーに役職を割り当て
    players.forEach((player, index) => {
      player.role = roles[index];
      player.isAlive = true;
      player.actions = {}; // 夜の行動記録用
    });

    return {
      werewolfCount: roles.filter(role => role === this.roles.WEREWOLF).length,
      villagerCount: roles.filter(role => role !== this.roles.WEREWOLF).length,
      composition: this.getRoleCompositionSummary(roles)
    };
  }

  // 役職構成のサマリー取得
  getRoleCompositionSummary(roles) {
    const composition = {};
    roles.forEach(role => {
      composition[role] = (composition[role] || 0) + 1;
    });
    return composition;
  }

  // プレイヤーの役職情報取得
  getPlayerRoleInfo(player) {
    if (!player || !player.role) return null;

    return {
      role: player.role,
      roleName: this.roleNames[player.role],
      description: this.roleDescriptions[player.role]
    };
  }

  // 陣営判定
  getTeam(role) {
    switch (role) {
      case this.roles.WEREWOLF:
        return 'werewolf';
      default:
        return 'villager';
    }
  }

  // 人狼チェック
  isWerewolf(role) {
    return role === this.roles.WEREWOLF;
  }

  // 能力者チェック
  hasNightAbility(role) {
    return [this.roles.WEREWOLF, this.roles.SEER, this.roles.KNIGHT].includes(role);
  }

  // 配列シャッフル
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

module.exports = RoleManager;
