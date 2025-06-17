// LINE メッセージ送信の改善案
// utils/lineMessageSender.js

class LineMessageSender {
    constructor(client) {
        this.client = client;
    }
      /**
     * コマンド結果に応じてメッセージを送信
     * @param {object} event - LINEイベント
     * @param {object} result - コマンド結果
     */
    async sendCommandResult(event, result) {
        const { replyToken } = event;
        const groupId = event.source.groupId || event.source.roomId;
        const userId = event.source.userId;
        
        if (!result.success) {
            // エラーメッセージは即座にreplyで返す
            return this.client.replyMessage(replyToken, {
                type: 'text',
                text: result.message
            });
        }
        
        // 成功時の処理
        if (result.isPrivate || event.source.type === 'user') {
            // 個人メッセージの場合
            if (event.source.type === 'group' || event.source.type === 'room') {
                // グループ内では個人にpushMessage
                return this.client.pushMessage(userId, {
                    type: 'text',
                    text: result.message
                });
            } else {
                // 個人チャットではreplyMessage
                return this.client.replyMessage(replyToken, {
                    type: 'text',
                    text: result.message
                });
            }
        } else {
            // 公開メッセージの場合
            return this.client.replyMessage(replyToken, {
                type: 'text',
                text: result.message
            });
        }
    }
    
    /**
     * 追加の公開メッセージを送信（夜更け通知など）
     * @param {string} groupId - グループID
     * @param {string} message - メッセージ
     */
    async sendPublicMessage(groupId, message) {
        return this.client.pushMessage(groupId, {
            type: 'text',
            text: message
        });
    }
    
    /**
     * 複数の個人メッセージを送信（占い結果など）
     * @param {Array} userMessages - [{userId, message}]の配列
     */
    async sendPrivateMessages(userMessages) {
        const promises = userMessages.map(({userId, message}) => 
            this.client.pushMessage(userId, {
                type: 'text',
                text: message
            })
        );
        
        return Promise.all(promises);
    }
    
    /**
     * クイックリプライ付きメッセージを送信
     * @param {string} target - 送信先（userIdまたはgroupId）
     * @param {string} message - メッセージ
     * @param {Array} quickReplyItems - クイックリプライアイテム
     * @param {boolean} isReply - replyMessageを使用するか
     * @param {string} replyToken - リプライトークン
     */
    async sendQuickReply(target, message, quickReplyItems, isReply = false, replyToken = null) {
        const messageData = {
            type: 'text',
            text: message,
            quickReply: {
                items: quickReplyItems.map(item => ({
                    type: 'action',
                    action: {
                        type: 'message',
                        label: item.label,
                        text: item.text
                    }
                }))
            }
        };
        
        if (isReply && replyToken) {
            return this.client.replyMessage(replyToken, messageData);
        } else {
            return this.client.pushMessage(target, messageData);
        }
    }
}

module.exports = LineMessageSender;
