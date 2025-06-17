/**
 * 騎士（狩人）の夜行動コマンド - 対象を守る
 * @param {object} game - WerewolfGameインスタンス
 * @param {string} userId - ユーザーID
 * @param {string} text - コマンドテキスト
 * @returns {Promise<{message: string, isPrivate: boolean}>}
 */
async function guardCommand(game, userId, args) {
    try {
        // 引数の処理
        let text = '';
        if (Array.isArray(args)) {
            text = args.join(' ');
        } else if (typeof args === 'string') {
            text = args;
        }

        // 現在のフェーズチェック
        if (!game.phaseManager.isNightWaiting()) {
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
            };        }        // ターゲット検索
        const target = game.players.find(p => 
            p.nickname === targetText || 
            p.userId === targetText ||
            (p.nickname && p.nickname.includes && p.nickname.includes(targetText)) ||
            (p.displayName && p.displayName.includes && p.displayName.includes(targetText))
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
        }        // abilityManagerを使用して行動を登録
        const result = game.nightActionManager.submitAction(player.userId, 'guard', target.userId);

        if (result.success) {
            return {
                message: result.message,
                isPrivate: true
            };
        } else {
            return {
                message: result.message,
                isPrivate: true
            };
        }

    } catch (error) {
        console.error('Guard command error:', error);
        return {
            message: 'エラーが発生しました。もう一度お試しください。',
            isPrivate: true
        };
    }
}

module.exports = { guardCommand };
