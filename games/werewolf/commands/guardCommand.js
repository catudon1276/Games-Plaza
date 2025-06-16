const { AbilityManager } = require('../roles/abilities/abilityManager');

/**
 * 騎士（狩人）の夜行動コマンド - 対象を守る
 * @param {object} game - WerewolfGameインスタンス
 * @param {string} userId - ユーザーID
 * @param {string} text - コマンドテキスト
 * @returns {Promise<{message: string, isPrivate: boolean}>}
 */
async function guardCommand(game, userId, text) {
    try {
        // 現在のフェーズチェック
        if (game.phase !== 'night') {
            return {
                message: '護衛は夜の間のみ行えます。',
                isPrivate: true
            };
        }

        // プレイヤーの取得
        const player = game.players.find(p => p.userId === userId);
        if (!player) {
            return {
                message: 'ゲームに参加していません。',
                isPrivate: true
            };
        }

        // 死亡チェック
        if (!player.isAlive) {
            return {
                message: '死亡したプレイヤーは行動できません。',
                isPrivate: true
            };
        }

        // 役職チェック
        if (player.role !== 'knight') {
            return {
                message: 'あなたは騎士ではありません。',
                isPrivate: true
            };
        }

        // ターゲット解析
        const targetText = text.replace(/^#護衛?\s*/, '').trim();
        if (!targetText) {
            return {
                message: '護衛対象を指定してください。例: #護衛 太郎',
                isPrivate: true
            };
        }

        // ターゲット検索
        const target = game.players.find(p => 
            p.displayName === targetText || 
            p.userId === targetText ||
            p.displayName.includes(targetText)
        );

        if (!target) {
            return {
                message: `対象が見つかりません: ${targetText}`,
                isPrivate: true
            };
        }

        // 生存チェック
        if (!target.isAlive) {
            return {
                message: '死亡したプレイヤーは護衛できません。',
                isPrivate: true
            };
        }

        // 自分自身の護衛チェック（メタデータで制御されるが、念のため）
        if (target.userId === userId) {
            return {
                message: '自分自身は護衛できません。',
                isPrivate: true
            };
        }

        // AbilityManagerを使用して行動を登録
        const result = await AbilityManager.executeAbility(
            'guard',
            game,
            player,
            target
        );

        return {
            message: result.message,
            isPrivate: true
        };

    } catch (error) {
        console.error('Guard command error:', error);
        return {
            message: 'エラーが発生しました。もう一度お試しください。',
            isPrivate: true
        };
    }
}

module.exports = { guardCommand };
