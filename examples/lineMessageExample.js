// メインのindex.jsでの使用例
// LineMessageSenderを使った改善版

// Event handler (改善版)
async function handleEventImproved(event) {
  if (!lineEnabled || !client) {
    console.log('LINE integration disabled, skipping event');
    return null;
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;
  const groupId = event.source.groupId || event.source.roomId || userId;
  
  // LineMessageSenderを初期化
  const messageSender = new LineMessageSender(client);
  
  // ユーザー名を取得
  let userName = 'ユーザー';
  try {
    if (event.source.type === 'group' || event.source.type === 'room') {
      const profile = await client.getGroupMemberProfile(groupId, userId);
      userName = profile.displayName;
    } else {
      const profile = await client.getProfile(userId);
      userName = profile.displayName;
    }
  } catch (error) {
    console.log('Could not get user profile:', error.message);
  }

  // @または#から始まるコマンドのみ処理
  if (!userMessage.startsWith('@') && !userMessage.startsWith('#')) {
    return null;
  }

  let result;
  
  // @コマンドの処理
  if (userMessage.startsWith('@')) {
    result = gameManager.handleCommand(groupId, userId, userName, userMessage);
  }
  // #コマンドの処理
  else if (userMessage.startsWith('#')) {
    const parts = userMessage.split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    
    result = gameManager.handleHashCommand(groupId, userId, userName, command, args);
  }

  // 結果に応じてメッセージを送信
  await messageSender.sendCommandResult(event, result);
  
  // 夜行動完了時の追加メッセージ（例）
  if (result.additionalPublicMessage) {
    setTimeout(async () => {
      await messageSender.sendPublicMessage(groupId, result.additionalPublicMessage);
    }, 1000);
  }
  
  // 占い結果などの個人メッセージ（例）
  if (result.privateMessages && result.privateMessages.length > 0) {
    setTimeout(async () => {
      await messageSender.sendPrivateMessages(result.privateMessages);
    }, 500);
  }
}

// クイックリプライの使用例
async function sendNightActionPrompts(game, messageSender) {
  const alivePlayers = game.players.filter(p => p.isAlive);
  
  for (const player of alivePlayers) {
    const abilities = game.getRoleAbilities(player.role);
    const quickReplyItems = [];
    
    // 役職に応じたクイックリプライを生成
    if (abilities.includes('attack')) {
      const targets = game.getValidTargets(player, 'attack');
      targets.forEach(target => {
        quickReplyItems.push({
          label: `襲撃: ${target.displayName}`,
          text: `#襲撃 ${target.displayName}`
        });
      });
    }
    
    if (abilities.includes('divine')) {
      const targets = game.getValidTargets(player, 'divine');
      targets.forEach(target => {
        quickReplyItems.push({
          label: `占い: ${target.displayName}`,
          text: `#占い ${target.displayName}`
        });
      });
    }
    
    if (abilities.includes('guard')) {
      const targets = game.getValidTargets(player, 'guard');
      targets.forEach(target => {
        quickReplyItems.push({
          label: `護衛: ${target.displayName}`,
          text: `#護衛 ${target.displayName}`
        });
      });
    }
    
    if (abilities.includes('focus')) {
      const targets = game.getValidTargets(player, 'focus');
      targets.forEach(target => {
        quickReplyItems.push({
          label: `疑う: ${target.displayName}`,
          text: `#疑う ${target.displayName}`
        });
        quickReplyItems.push({
          label: `憧憬: ${target.displayName}`,
          text: `#憧憬 ${target.displayName}`
        });
      });
    }
    
    if (quickReplyItems.length > 0) {
      await messageSender.sendQuickReply(
        player.userId,
        `夜が訪れました。あなたの行動を選択してください。`,
        quickReplyItems.slice(0, 10) // LINEは最大13個まで
      );
    }
  }
}

module.exports = {
  handleEventImproved,
  sendNightActionPrompts,
  LineMessageSender
};
