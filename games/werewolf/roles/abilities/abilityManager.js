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
      // 単一能力の場合、直接クイックリプライを生成
      return this.generateAbilityQuickReply(abilities[0].id, actor, gameState);
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
