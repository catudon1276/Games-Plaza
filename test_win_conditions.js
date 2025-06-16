// 勝利条件テスト
const { checkWinCondition, getRoleTeam } = require('./games/werewolf/roles/meta');

// テストケース
const testCases = [
  {
    name: '村人1人、狂人1人、人狼1人',
    players: [
      { role: 'villager', isAlive: true },
      { role: 'madman', isAlive: true },
      { role: 'werewolf', isAlive: true }
    ]
  },
  {
    name: '村人2人、人狼1人',
    players: [
      { role: 'villager', isAlive: true },
      { role: 'villager', isAlive: true },
      { role: 'werewolf', isAlive: true }
    ]
  },
  {
    name: '村人1人、人狼1人',
    players: [
      { role: 'villager', isAlive: true },
      { role: 'werewolf', isAlive: true }
    ]
  },
  {
    name: '占い師1人、狂人1人（人狼全滅）',
    players: [
      { role: 'seer', isAlive: true },
      { role: 'madman', isAlive: true }
    ]
  },
  {
    name: '村人2人（人狼・狂人全滅）',
    players: [
      { role: 'villager', isAlive: true },
      { role: 'villager', isAlive: true }
    ]
  },
  {
    name: '狂人1人、人狼1人（村人全滅）',
    players: [
      { role: 'madman', isAlive: true },
      { role: 'werewolf', isAlive: true }
    ]
  }
];

console.log('=== 勝利条件テスト ===\n');

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  
  // チーム構成を表示
  const teamCounts = {};
  testCase.players.forEach(player => {
    const team = getRoleTeam(player.role);
    teamCounts[team] = (teamCounts[team] || 0) + 1;
  });
  
  console.log(`   チーム構成: 村人陣営${teamCounts.village || 0}人、人狼陣営${teamCounts.werewolf || 0}人`);
  
  // 勝利判定
  const result = checkWinCondition(testCase.players);
  
  if (result) {
    console.log(`   結果: ${result.winner}陣営の勝利 (${result.condition})`);
    console.log(`   メッセージ: ${result.message.replace(/\n/g, ' ')}`);
  } else {
    console.log('   結果: ゲーム継続');
  }
  
  console.log('');
});
