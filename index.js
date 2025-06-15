const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const GameManager = require('./utils/gameManager');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// LINE BOT configuration
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);
const gameManager = new GameManager();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Games Plaza LINEBOT is running!',
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint for LINE
app.post('/webhook', middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error handling events:', err);
      res.status(500).end();
    });
});

// Event handler
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;
  const groupId = event.source.groupId || event.source.roomId || userId; // 個人チャットの場合はuserIdを使用
  
  // ユーザー名を取得（可能な場合）
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
    return null; // 何も返さない
  }

  let replyMessage = '';

  // @コマンドの処理
  if (userMessage.startsWith('@')) {
    const result = gameManager.handleCommand(groupId, userId, userName, userMessage);
    replyMessage = result.message;
  }
  // #コマンドの処理（将来の拡張用）
  else if (userMessage.startsWith('#')) {
    replyMessage = '不明なコマンドです。';
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyMessage
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Games Plaza LINEBOT is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
});
