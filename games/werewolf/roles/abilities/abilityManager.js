// 能力管理クラス - 全ての能力を統合管理
const AttackAbility = require('./attackAbility');
const DivineAbility = require('./divineAbility');
const GuardAbility = require('./guardAbility');
const MediumAbility = require('./mediumAbility');
const FocusAbility = require('./focusAbility');

class AbilityManager {
  constructor() {
    this.abilities = {
      attack: new AttackAbility(),
      divine: new DivineAbility(),
      guard: new GuardAbility(),
      medium: new MediumAbility(),
      focus: new FocusAbility()
    };
  }

  // 能力取得
  getAbility(abilityId) {
    return this.abilities[abilityId] || null;
  }

  // 役職の能力リスト取得
  getRoleAbilities(roleId) {
    const { getRoleAbilities } = require('../meta');
    const abilityIds = getRoleAbilities(roleId);
    return abilityIds.map(id => this.abilities[id]).filter(Boolean);
  }
  // 能力実行
  executeAbility(abilityId, actor, target, gameState) {
    const ability = this.getAbility(abilityId);
    if (!ability) {
      return { success: false, message: '不明な能力です。' };
    }

    // 霊媒師の特殊処理：targetの代わりにexecutedPlayersを使用
    if (abilityId === 'medium') {
      const executedPlayers = gameState?.executedPlayers || [];
      return ability.execute(actor, executedPlayers, gameState);
    }

    return ability.execute(actor, target, gameState);
  }

  // 能力対象検証
  validateAbilityTarget(abilityId, actor, target, gameState) {
    const ability = this.getAbility(abilityId);
    if (!ability) {
      return { valid: false, message: '不明な能力です。' };
    }

    return ability.validateTarget(actor, target, gameState);
  }

  // クイックリプライ生成
  generateAbilityQuickReply(abilityId, actor, gameState) {
    const ability = this.getAbility(abilityId);
    if (!ability) {
      return null;
    }

    return ability.generateQuickReply(actor, gameState);
  }

  // 統一クイックリプライ生成（新機能）
  generateUnifiedQuickReply(abilityId, actor, gameState) {
    const { getAbilityMeta, getAbilityTargetRules, getRoleTeam } = require('../meta');
    
    const abilityMeta = getAbilityMeta(abilityId);
    if (!abilityMeta) {
      return null;
    }

    const targetRules = abilityMeta.targetRules;
      // 特殊処理：霊媒は自動実行（クイックリプライ不要）
    if (abilityId === 'medium') {
      return {
        type: 'text',
        message: '霊媒師として処刑された人の役職を自動的に調べます。他のプレイヤーの行動を待っています。'
      };
    }

    // 特殊処理：注目は特別な選択肢
    if (abilityId === 'focus') {
      return this.generateFocusQuickReply(actor, gameState);
    }

    // 通常の対象選択
    let targetPlayers = gameState.players.filter(player => {
      // 死亡者除外
      if (targetRules.excludeDead && !player.isAlive) {
        return false;
      }

      // 自分除外
      if (targetRules.excludeSelf && player.id === actor.id) {
        return false;
      }

      // チームメイト除外（人狼同士など）
      if (targetRules.excludeTeammates && getRoleTeam(player.role) === getRoleTeam(actor.role)) {
        return false;
      }

      // 特定陣営のみ対象
      if (targetRules.allowedTargets && targetRules.allowedTargets.length > 0) {
        const playerTeam = getRoleTeam(player.role);
        if (!targetRules.allowedTargets.includes(playerTeam)) {
          return false;
        }
      }

      return true;
    });

    return {
      type: 'quick_reply',
      title: `${abilityMeta.name}対象を選んでください`,
      options: targetPlayers.map(player => ({
        label: player.nickname,
        text: `#${abilityMeta.command} @${player.nickname}`,
        value: player.id
      }))
    };
  }
  // 注目専用クイックリプライ
  generateFocusQuickReply(actor, gameState) {
    const alivePlayers = gameState.players.filter(p => 
      p.isAlive && p.id !== actor.id
    );

    const suspectOptions = alivePlayers.map(player => ({
      label: `${player.nickname}を疑う`,
      text: `#疑う @${player.nickname}`,
      value: `suspect_${player.id}`
    }));

    const admireOptions = alivePlayers.map(player => ({
      label: `${player.nickname}に憧憬`,
      text: `#憧憬 @${player.nickname}`,
      value: `admire_${player.id}`
    }));

    return {
      type: 'quick_reply',
      title: '注目行動を選んでください',
      options: [...suspectOptions, ...admireOptions]
    };
  }
  // 役職の夜行動メニュー生成
  generateNightActionMenu(actor, gameState) {
    const abilities = this.getRoleAbilities(actor.role);
    
    if (abilities.length === 0) {
      return {
        type: 'text',
        message: 'あなたには夜行動がありません。他のプレイヤーの行動を待っています。'
      };
    }

    if (abilities.length === 1) {
      // 単一能力の場合、統一クイックリプライを生成
      return this.generateUnifiedQuickReply(abilities[0].id, actor, gameState);
    }

    // 複数能力の場合、選択メニューを生成
    return {
      type: 'ability_select',
      title: '夜行動を選んでください',
      options: abilities.map(ability => ({
        label: ability.name,
        description: ability.description,
        abilityId: ability.id
      }))
    };
  }

  // 統一クイックリプライ生成の公開メソッド
  getUnifiedQuickReply(abilityId, actor, gameState) {
    return this.generateUnifiedQuickReply(abilityId, actor, gameState);
  }

  // 全能力の夜間処理順序
  getNightResolutionOrder() {
    return [
      'guard',    // 護衛（最優先）
      'attack',   // 襲撃
      'divine',   // 占い
      'medium'    // 霊媒（昼明け後に自動実行）
    ];
  }

  // 夜間一括処理
  resolveNightActions(nightActions, gameState) {
    const results = {
      guard: [],
      attack: [],
      divine: [],
      medium: [],
      deaths: [],
      privateMessages: []
    };

    const order = this.getNightResolutionOrder();

    for (const abilityId of order) {
      const actions = nightActions[abilityId] || [];
      
      for (const action of actions) {
        const result = this.executeAbility(
          abilityId, 
          action.actor, 
          action.target, 
          gameState
        );

        if (result.success) {
          results[abilityId].push(result);
          
          // 効果適用
          if (result.effects) {
            this.applyEffects(result.effects, gameState);
          }

          // プライベートメッセージ
          if (result.privateMessage) {
            results.privateMessages.push({
              userId: action.actor.id,
              message: result.privateMessage
            });
          }

          // 死亡処理
          if (result.result === 'killed') {
            results.deaths.push(result.target);
          }
        }
      }
    }

    return results;
  }

  // 効果適用
  applyEffects(effects, gameState) {
    // 死亡効果
    if (effects.kill) {
      for (const playerId of effects.kill) {
        const player = gameState.players.find(p => p.id === playerId);
        if (player) {
          player.isAlive = false;
          player.deathReason = 'werewolf_attack';
          player.deathDay = gameState.dayCount;
        }
      }
    }

    // 護衛効果（gameStateに記録）
    if (effects.guard) {
      gameState.nightProtections = effects.guard;
    }
  }
}

module.exports = AbilityManager;
