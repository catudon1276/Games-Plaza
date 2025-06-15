const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// LINE BOT configuration
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);

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

  const userMessage = event.message.text.toLowerCase();
  let replyMessage = '';

  // Simple response logic - you can expand this
  switch (userMessage) {
    case 'hello':
    case 'こんにちは':
      replyMessage = 'こんにちは！Games Plazaへようこそ！🎮\n\n利用可能なコマンド:\n- "ゲーム" - おすすめゲームを表示\n- "ランキング" - 人気ゲームランキング\n- "ヘルプ" - ヘルプを表示';
      break;
    
    case 'ゲーム':
    case 'game':
      replyMessage = '🎮 おすすめゲーム\n\n1. パズルゲーム\n2. アクションゲーム\n3. RPGゲーム\n4. シューティングゲーム\n\nどのゲームに興味がありますか？';
      break;
    
    case 'ランキング':
    case 'ranking':
      replyMessage = '🏆 人気ゲームランキング\n\n1位: スーパーマリオ\n2位: ポケモン\n3位: ゼルダの伝説\n4位: ファイナルファンタジー\n5位: ドラゴンクエスト';
      break;
    
    case 'ヘルプ':
    case 'help':
      replyMessage = '📖 ヘルプ\n\nGames Plaza BOTの使い方:\n\n• "ゲーム" - ゲーム一覧を表示\n• "ランキング" - 人気ランキングを表示\n• "こんにちは" - 挨拶\n\nその他ご質問があればお気軽にお声かけください！';
      break;
    
    default:
      replyMessage = 'すみません、理解できませんでした。😅\n\n"ヘルプ"と入力すると利用可能なコマンドが表示されます。';
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
