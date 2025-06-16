// 勝利判定機能 - メタデータベース
const { checkWinCondition, getRoleInfo, getRoleName, getRoleTeam, getHumanCount, getWolfCount } = require('../roles/meta');
class WinConditionChecker {
  constructor(werewolfGame) {
    this.game = werewolfGame;
  }  // 勝利条件チェック（メタデータベース使用）
  checkWinCondition() {
    const alivePlayers = this.game.players.filter(p => p.isAlive);
    
    // カウント計算（デバッグ用）
    let humanCount = 0;
    let wolfCount = 0;
    const roleCounts = {};
    
    for (const player of alivePlayers) {
      const role = player.role;
      humanCount += getHumanCount(role);
      wolfCount += getWolfCount(role);
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
    
    console.log(`[WinConditionChecker] 生存者: ${alivePlayers.length}人`);
    console.log(`[WinConditionChecker] humanCount: ${humanCount}, wolfCount: ${wolfCount}`);
    console.log(`[WinConditionChecker] 役職別: ${JSON.stringify(roleCounts)}`);
    
    // メタデータシステムで勝利判定
    const winResult = checkWinCondition(alivePlayers);
    
    if (winResult) {
      console.log(`[WinConditionChecker] ゲーム終了: ${winResult.winner}陣営の勝利`);
      return {
        gameEnded: true,
        winner: winResult.winner,
        message: winResult.message,
        winCondition: winResult.condition,
        counts: winResult.counts,
        survivors: this.buildSurvivorList(alivePlayers),
        gameStats: this.buildGameStats()
      };
    }

    // ゲーム継続
    const teamCounts = this.getTeamCounts(alivePlayers);
    console.log(`[WinConditionChecker] ゲーム継続`);
    return {
      gameEnded: false,
      winner: null,
      message: null,
      aliveWerewolves: wolfCount,
      aliveVillagers: humanCount,
      totalAlive: alivePlayers.length,
      teamCounts: teamCounts,
      counts: { humanCount, wolfCount }
    };
  }

  // チーム別人数カウント
  getTeamCounts(alivePlayers) {
    const teamCounts = {};
    
    for (const player of alivePlayers) {
      const team = getRoleTeam(player.role);
      teamCounts[team] = (teamCounts[team] || 0) + 1;
    }
    
    return teamCounts;
  }
  // 生存者リスト構築
  buildSurvivorList(alivePlayers) {
    return alivePlayers.map(player => ({
      id: player.id,
      name: player.nickname,
      role: player.role,
      roleDisplayName: getRoleName(player.role),
      team: getRoleTeam(player.role)
    }));
  }

  // ゲーム統計構築
  buildGameStats() {
    const allPlayers = this.game.players;
    const totalDays = this.game.phaseManager.dayCount;
      // 死亡者リスト
    const deadPlayers = allPlayers.filter(p => !p.isAlive);
    const deaths = deadPlayers.map(player => ({
      id: player.id,
      name: player.nickname,
      role: player.role,
      roleDisplayName: getRoleName(player.role),
      team: getRoleTeam(player.role),
      deathReason: player.deathReason || 'unknown',
      deathDay: player.deathDay || 0
    }));

    // 役職別統計
    const roleStats = {};
    for (const player of allPlayers) {
      const role = player.role;
      if (!roleStats[role]) {
        roleStats[role] = {
          total: 0,
          alive: 0,
          dead: 0
        };
      }
      roleStats[role].total++;
      if (player.isAlive) {
        roleStats[role].alive++;
      } else {
        roleStats[role].dead++;
      }
    }

    return {
      totalPlayers: allPlayers.length,
      totalDays: totalDays,
      deaths: deaths,
      roleStats: roleStats,
      gameStartTime: this.game.startTime,
      gameEndTime: new Date()
    };
  }
  // 勝利メッセージの詳細版構築
  buildDetailedWinMessage(winResult) {
    let message = winResult.message + '\n\n';
    
    // カウント情報
    if (winResult.counts) {
      message += `📊 最終カウント:\n`;
      message += `・人間数: ${winResult.counts.humanCount}\n`;
      message += `・人狼数: ${winResult.counts.wolfCount}\n\n`;
    }
    
    // 生存者情報
    if (winResult.survivors && winResult.survivors.length > 0) {
      message += '🌟 生存者:\n';
      for (const survivor of winResult.survivors) {
        message += `・${survivor.name}（${survivor.roleDisplayName}）\n`;
      }
      message += '\n';
    }

    // 死亡者情報
    const gameStats = winResult.gameStats;
    if (gameStats && gameStats.deaths.length > 0) {
      message += '💀 死亡者:\n';
      for (const death of gameStats.deaths) {
        const deathReasonText = this.getDeathReasonText(death.deathReason);
        message += `・${death.name}（${death.roleDisplayName}）- ${death.deathDay}日目 ${deathReasonText}\n`;
      }
      message += '\n';
    }

    // ゲーム統計
    if (gameStats) {
      message += `📊 ゲーム統計:\n`;
      message += `・総日数: ${gameStats.totalDays}日\n`;
      message += `・参加者: ${gameStats.totalPlayers}人\n`;
      
      const duration = Math.floor((gameStats.gameEndTime - gameStats.gameStartTime) / 1000 / 60);
      message += `・所要時間: ${duration}分\n`;
    }

    return message;
  }

  // 死亡理由のテキスト取得
  getDeathReasonText(reason) {
    switch (reason) {
      case 'execution':
        return '処刑';
      case 'werewolf_attack':
        return '人狼の襲撃';
      case 'unknown':
      default:
        return '不明';
    }
  }

  // 特殊勝利条件チェック（今後の拡張用）
  checkSpecialWinConditions() {
    // 今後、狂人や第三陣営などの特殊勝利条件をここに追加
    return null;
  }
}

module.exports = WinConditionChecker;
