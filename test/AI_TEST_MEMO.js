// AI向け人狼ゲームテスト作成メモ
// CRITICAL: テスト作成時に必ず対応すべき問題と解決法

/*
=== 重要な問題 ===
1. "Resolving night actions..." の重複出力
   - nightActionManager.js で複数回実行される問題
   - テストの効率を大幅に悪化させる

2. 護衛システムの正しい実装
   - attackAbility.js の getGuardedPlayers メソッドで正しいデータ構造を使用

3. 個人メッセージの重複
   - execute() と generateNightLog() の両方で privateMessage を生成しないよう注意
*/

/*
=== テスト作成時の必須パターン ===

1. 基本的なゲーム初期化
```javascript
const WerewolfGame = require('../games/werewolf/index.js');

const game = new WerewolfGame('test-group');

// プレイヤー追加
const players = [
  { userId: 'wolf1', userName: 'ウルフ1号', nickname: 'ウルフ1号' },
  { userId: 'seer1', userName: '占い師', nickname: '占い師' },
  { userId: 'knight1', userName: '騎士', nickname: '騎士' },
  { userId: 'villager1', userName: '村人A', nickname: '村人A' },
  { userId: 'villager2', userName: '村人B', nickname: '村人B' }
];

for (const player of players) {
  game.addPlayer(player.userId, player.userName);
}

const startResult = game.handleStartCommand('wolf1', 'ウルフ1号');

// ゲーム状態設定
game.isStarted = true;
game.isActive = true;
game.phaseManager.switchToNightWaiting();

// 役職強制割り当て
game.players[0].role = 'werewolf';
game.players[1].role = 'seer';
game.players[2].role = 'knight';
game.players[3].role = 'villager';
game.players[4].role = 'villager';

// プレイヤーの生存状態とnicknameを確保
game.players.forEach((p, index) => {
  p.isAlive = true;
  if (!p.nickname) {
    p.nickname = players[index].nickname;
  }
});

// 霊能者テスト用の前日処刑者設定
game.lastExecuted = [
  { nickname: '前日処刑者', role: 'werewolf', id: 'executed_player' }
];
```

2. 夜行動の実行
```javascript
// 人狼の襲撃
const attackResult = await game.handleAttackCommand('wolf1', ['村人A']);

// 占い師の占い
const divineResult = await game.handleDivineCommand('seer1', ['ウルフ1号']);

// 騎士の護衛
const guardResult = await game.handleGuardCommand('knight1', '村人A');

// 村人の注目行動
const focusResult1 = await game.handleFocusCommand('villager1', { target: 'ウルフ1号' });
const focusResult2 = await game.handleFocusCommand('villager2', { target: 'ウルフ1号' });
```

3. 深夜処理の実行
```javascript
// 深夜フェーズに移行
game.phaseManager.switchToNightResolving();

// 深夜処理実行
const nightResult = game.nightResolutionCommand.execute();
```
*/

/*
=== 護衛システムの正しい実装確認 ===

attackAbility.js の getGuardedPlayers メソッドが以下の構造を正しく処理できているか確認：

nightActions Map 構造:
{
  'knight1' => {
    type: 'guard',        // 'ability' ではなく 'type'
    target: 'villager1',  // 'targetId' ではなく 'target'
    timestamp: Date
  }
}

正しい実装:
```javascript
getGuardedPlayers(gameState) {
  if (gameState.nightActions instanceof Map) {
    const guardedPlayers = [];
    for (const [userId, action] of gameState.nightActions.entries()) {
      if (action.type === 'guard' && action.target) {  // type と target を使用
        guardedPlayers.push(action.target);
      }
    }
    return guardedPlayers;
  }
  // 従来形式の処理...
}
```
*/

/*
=== 個人メッセージの重複回避 ===

各アビリティで以下を確認：
1. execute() メソッドで privateMessage を返すか
2. generateNightLog() メソッドで個人メッセージを生成するか

重複を避けるため、どちらか一方のみで個人メッセージを生成する。

推奨パターン:
- 即座の確認が必要: execute() で privateMessage
- 結果処理が必要: generateNightLog() で生成

騎士の場合:
- execute(): privateMessage なし（護衛対象の登録のみ）
- generateNightLog(): 護衛対象の確認メッセージを生成
*/

/*
=== デバッグ出力の管理 ===

テスト作成時は必要に応じてデバッグ出力を追加：
```javascript
console.log('[DEBUG] nightActions:', gameState.nightActions);
console.log('[DEBUG] Guard check:', isGuarded);
```

テスト完成後は必ずデバッグ出力を削除して効率化する。
*/

/*
=== テストの構造テンプレート ===

```javascript
async function testName() {
  console.log('🧪 Testing [機能名]');
  
  try {
    // 1. ゲーム初期化
    // 2. プレイヤー追加
    // 3. 役職設定
    // 4. 夜行動実行
    // 5. 深夜処理
    // 6. 結果検証
    
    console.log('🎉 Test Completed');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testName()
    .then(result => {
      if (result.success) {
        console.log('🎉 テスト成功！');
      } else {
        console.log('❌ テスト失敗:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ テストエラー:', error);
      process.exit(1);
    });
}
```
*/
