// 新しい役職管理システム - メタデータベース
const { 
  calculateRoleComposition, 
  getRoleInfo, 
  getRoleName,
  getRoleTeam,
  checkWinCondition 
} = require('../roles/meta');

class RoleManager {
  constructor() {
    // 互換性のための旧フォーマット
    this.roles = {
      WEREWOLF: 'werewolf',
      VILLAGER: 'villager', 
      SEER: 'seer',
      KNIGHT: 'knight',
      MEDIUM: 'medium'
    };
  }

  // プレイヤーに役職を割り当て
  assignRolesToPlayers(players) {
    const playerCount = players.length;
    const roleComposition = calculateRoleComposition(playerCount);
    
    // シャッフル
    const shuffledRoles = this.shuffleArray([...roleComposition]);
    
    // 役職割り当て
    for (let i = 0; i < players.length; i++) {
      players[i].role = shuffledRoles[i];
    }
    
    // 統計情報構築
    const composition = this.buildCompositionStats(roleComposition);
    
    // 各プレイヤーに役職通知メッセージを設定
    this.setRoleIntroMessages(players);
    
    return {
      success: true,
      composition: composition,
      assignments: players.map(p => ({
        playerId: p.id,
        playerName: p.nickname,
        role: p.role,
        roleName: getRoleName(p.role),
        team: getRoleTeam(p.role)
      }))
    };
  }

  // 役職構成統計
  buildCompositionStats(roleComposition) {
    const stats = {};
    
    for (const role of roleComposition) {
      stats[role] = (stats[role] || 0) + 1;
    }
    
    return {
      total: roleComposition.length,
      roles: stats,
      summary: Object.entries(stats).map(([role, count]) => ({
        role: role,
        roleName: getRoleName(role),
        count: count,
        team: getRoleTeam(role)
      }))
    };
  }

  // 役職紹介メッセージ設定
  setRoleIntroMessages(players) {
    for (const player of players) {
      const roleInfo = getRoleInfo(player.role);
      if (roleInfo) {
        player.roleIntro = roleInfo.intro;
        player.roleDescription = roleInfo.description;
        player.roleIntroMessage = `${roleInfo.intro}\n\n${roleInfo.description}`;
      }
    }
  }

  // 配列シャッフル
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // 役職表示名取得（互換性）
  getRoleDisplayName(roleId) {
    return getRoleName(roleId);
  }

  // チーム取得（互換性）
  getRoleTeam(roleId) {
    return getRoleTeam(roleId);
  }

  // 勝利条件チェック（互換性）
  checkWinCondition(players) {
    const alivePlayers = players.filter(p => p.isAlive);
    return checkWinCondition(alivePlayers);
  }

  // 人数に応じた役職構成プレビュー
  previewRoleComposition(playerCount) {
    if (playerCount < 3) {
      return { 
        valid: false, 
        message: '最低3人必要です。' 
      };
    }

    const composition = calculateRoleComposition(playerCount);
    const stats = this.buildCompositionStats(composition);
    
    return {
      valid: true,
      playerCount: playerCount,
      composition: stats,
      message: this.buildCompositionMessage(stats)
    };
  }

  // 構成メッセージ構築
  buildCompositionMessage(stats) {
    let message = `👥 ${stats.total}人での役職構成:\n\n`;
    
    const villageTeam = stats.summary.filter(s => s.team === 'village');
    const werewolfTeam = stats.summary.filter(s => s.team === 'werewolf');
    
    if (werewolfTeam.length > 0) {
      message += '🐺 人狼陣営:\n';
      for (const role of werewolfTeam) {
        message += `  ${role.roleName}: ${role.count}人\n`;
      }
      message += '\n';
    }
    
    if (villageTeam.length > 0) {
      message += '👨‍🌾 村人陣営:\n';
      for (const role of villageTeam) {
        message += `  ${role.roleName}: ${role.count}人\n`;
      }
    }
    
    return message;
  }

  // 特定役職のプレイヤー取得
  getPlayersByRole(players, roleId) {
    return players.filter(p => p.role === roleId);
  }

  // 生存している特定役職のプレイヤー取得
  getAlivePlayersByRole(players, roleId) {
    return players.filter(p => p.role === roleId && p.isAlive);
  }

  // チーム別プレイヤー取得
  getPlayersByTeam(players, team) {
    return players.filter(p => getRoleTeam(p.role) === team);
  }

  // 生存チーム別プレイヤー取得
  getAlivePlayersByTeam(players, team) {
    return players.filter(p => getRoleTeam(p.role) === team && p.isAlive);
  }
}

module.exports = RoleManager;
