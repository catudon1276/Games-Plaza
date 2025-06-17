const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const GameManager = require('./utils/gameManager');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// LINE BOT configuration
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || 'dummy_token',
  channelSecret: process.env.CHANNEL_SECRET || 'dummy_secret',
};

// LINE Clientの初期化（環境変数チェック付き）
let client = null;
let lineEnabled = false;

try {
  if (process.env.CHANNEL_ACCESS_TOKEN && process.env.CHANNEL_SECRET) {
    client = new Client({
      channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.CHANNEL_SECRET,
    });
    lineEnabled = true;
    console.log('LINE BOT enabled');
  } else {
    console.log('LINE BOT disabled - environment variables not set');
    console.log('Server will run without LINE integration');
  }
} catch (error) {
  console.error('LINE client initialization failed:', error.message);
  console.log('Server will run without LINE integration');
}

const gameManager = new GameManager();

// 定期的なゲームクリーンアップを開始（今後実装予定）
// gameManager.startPeriodicCleanup();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Games Plaza LINEBOT is running!',
    lineEnabled: lineEnabled,
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint for LINE
app.post('/webhook', (req, res) => {
  if (!lineEnabled) {
    return res.status(503).json({ error: 'LINE integration not configured' });
  }

  // LINE署名検証のミドルウェアを手動で適用
  const lineMiddleware = middleware({
    channelSecret: process.env.CHANNEL_SECRET
  });

  lineMiddleware(req, res, () => {
    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => res.json(result))
      .catch((err) => {
        console.error('Error handling events:', err);
        res.status(500).end();
      });
  });
});

// Event handler
async function handleEvent(event) {
  if (!lineEnabled || !client) {
    console.log('LINE integration disabled, skipping event');
    return null;
  }

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
  const isPrivateChat = event.source.type === 'user';
  
  try {
    // @コマンドの処理
    if (userMessage.startsWith('@')) {
      if (isPrivateChat) {
        // 個人チャットでは@コマンドは受け付けない
        replyMessage = '@コマンドはグループチャットで送信してください。';
      } else {
        // グループチャットでの@コマンド処理
        const result = gameManager.handleCommand(groupId, userId, userName, userMessage);
        replyMessage = result.message;
      }
    }
    // #コマンドの処理
    else if (userMessage.startsWith('#')) {
      // コマンドと引数を分離
      const parts = userMessage.split(' ');
      const command = parts[0];
      const args = parts.slice(1);
      
      if (isPrivateChat) {
        // 個人チャットでの夜行動コマンド処理
        const result = await gameManager.handlePrivateNightCommand(userId, userName, command, args);
        replyMessage = result.message;
      } else {
        // グループチャットでの#コマンド処理
        const result = await gameManager.handleHashCommand(groupId, userId, userName, command, args);
        replyMessage = result.message;
      }
    }
  } catch (error) {
    console.error('Command processing error:', error);
    replyMessage = 'エラーが発生しました。もう一度お試しください。';
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
  console.log(`LINE integration: ${lineEnabled ? 'ENABLED' : 'DISABLED'}`);
  
  if (!lineEnabled) {
    console.log('To enable LINE integration, set CHANNEL_ACCESS_TOKEN and CHANNEL_SECRET environment variables');
  }
});
