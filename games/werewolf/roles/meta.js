// 人狼ゲーム役職メタデータ - 全役職の情報を一元管理
const ROLES_META = {
  villager: {
    id: 'villager',
    name: '市民',
    team: 'village',
    priority: 1, // 配役優先度（低いほど後回し）
    intro: 'あなたは市民です。',
    description: '特殊能力はありませんが、議論と投票で人狼を見つけ出しましょう。議論での推理力が勝負の鍵です。',
    abilities: ['focus'],
    countType: {
      humanCount: 1, // 人間陣営としてカウント
      wolfCount: 0   // 人狼としてはカウントしない
    },
    scaling: {
      minPlayers: 3,
      baseCount: 0, // 基本数（0=残り全員）
      scaling: 'remainder' // 'remainder' = 残り全員, 'ratio' = 比率, 'fixed' = 固定数
    },
    reveal: {
      seenBySeer: 'white',
      seenByMedium: 'white',
      announceOnDeath: true
    },
    winConditions: ['eliminate_werewolves']
  },
  werewolf: {
    id: 'werewolf',
    name: '人狼',
    team: 'werewolf',
    priority: 10, // 最優先で配役
    intro: 'あなたは人狼です。',
    description: '夜に市民を1人襲撃できます。仲間の人狼と協力して市民陣営を全滅させましょう。昼は市民のふりをして疑いを避けてください。',
    abilities: ['attack'],
    countType: {
      humanCount: 0, // 人間としてはカウントしない
      wolfCount: 1   // 人狼としてカウント
    },
    scaling: {
      minPlayers: 3,
      baseCount: 1,
      scaling: 'ratio',
      ratio: 0.33, // プレイヤー数の1/3
      maxCount: 3  // 最大3人まで
    },
    reveal: {
      seenBySeer: 'black',
      seenByMedium: 'black',
      announceOnDeath: true
    },
    winConditions: ['equal_or_outnumber_village']
  },
  seer: {
    id: 'seer',
    name: '占い師',
    team: 'village',
    priority: 8,
    intro: 'あなたは占い師です。',
    description: '夜に1人を占い、その人が村人陣営か人狼陣営かを知ることができます。得た情報を昼の議論で活用しましょう。',
    abilities: ['divine'],
    countType: {
      humanCount: 1,
      wolfCount: 0
    },
    scaling: {
      minPlayers: 5,
      baseCount: 1,
      scaling: 'fixed'
    },
    reveal: {
      seenBySeer: 'white',
      seenByMedium: 'white',
      announceOnDeath: true
    },
    winConditions: ['eliminate_werewolves']
  },
  knight: {
    id: 'knight',
    name: '騎士',
    team: 'village',
    priority: 7,
    intro: 'あなたは騎士です。',
    description: '夜に1人を護衛し、人狼の襲撃から守ることができます。大切な人を守り抜きましょう。',
    abilities: ['guard'],
    countType: {
      humanCount: 1,
      wolfCount: 0
    },
    scaling: {
      minPlayers: 7,
      baseCount: 1,
      scaling: 'fixed'
    },
    reveal: {
      seenBySeer: 'white',
      seenByMedium: 'white',
      announceOnDeath: true
    },
    winConditions: ['eliminate_werewolves']  },
  medium: {
    id: 'medium',
    name: '霊能者',
    team: 'village',
    priority: 6,
    intro: 'あなたは霊能者です。',
    description: '夜に注目行動を行い、深夜に処刑された人の役職を知ることができます。死者の声を聞き、真実を暴きましょう。',
    abilities: ['focus', 'medium'],
    countType: {
      humanCount: 1,
      wolfCount: 0
    },
    scaling: {
      minPlayers: 9,
      baseCount: 1,
      scaling: 'fixed'
    },
    reveal: {
      seenBySeer: 'white',
      seenByMedium: 'white',
      announceOnDeath: true
    },
    winConditions: ['eliminate_werewolves']
  },
  madman: {
    id: 'madman',
    name: '狂人',
    team: 'werewolf',
    priority: 5,
    intro: 'あなたは狂人です。',
    description: '人狼陣営ですが、人狼が誰かは分かりません。人狼の勝利のために市民を混乱させましょう。占い師には市民として見えます。',
    abilities: ['focus'],
    countType: {
      humanCount: 1,
      wolfCount: 0
    },
    scaling: {
      minPlayers: 6,
      baseCount: 1,
      scaling: 'fixed'
    },
    reveal: {
      seenBySeer: 'white',
      seenByMedium: 'white',
      announceOnDeath: true
    },
    winConditions: ['equal_or_outnumber_village']
  }
};

// チーム別役職取得
const getTeamRoles = (team) => {
  return Object.values(ROLES_META).filter(role => role.team === team);
};

// 能力別役職取得
const getRolesByAbility = (ability) => {
  return Object.values(ROLES_META).filter(role => role.abilities.includes(ability));
};

// 人数に応じた役職構成計算
const calculateRoleComposition = (playerCount) => {
  const composition = [];
  const availableRoles = Object.values(ROLES_META)
    .filter(role => role.scaling.minPlayers <= playerCount)
    .sort((a, b) => b.priority - a.priority); // 優先度順

  // 固定数・比率役職を先に配置
  for (const role of availableRoles) {
    if (role.scaling.scaling === 'fixed') {
      for (let i = 0; i < role.scaling.baseCount; i++) {
        composition.push(role.id);
      }
    } else if (role.scaling.scaling === 'ratio') {
      const count = Math.min(
        Math.floor(playerCount * role.scaling.ratio),
        role.scaling.maxCount || playerCount
      );
      for (let i = 0; i < count; i++) {
        composition.push(role.id);
      }
    }
  }

  // 残りを市民で埋める
  while (composition.length < playerCount) {
    composition.push('villager');
  }

  return composition;
};

// 役職情報取得ヘルパー
const getRoleInfo = (roleId) => {
  return ROLES_META[roleId] || null;
};

const getRoleName = (roleId) => {
  return ROLES_META[roleId]?.name || '不明';
};

const getRoleTeam = (roleId) => {
  return ROLES_META[roleId]?.team || 'unknown';
};

const getRoleAbilities = (roleId) => {
  return ROLES_META[roleId]?.abilities || [];
};

const getDivineResult = (roleId) => {
  return ROLES_META[roleId]?.reveal?.seenBySeer || 'unknown';
};

const getMediumResult = (roleId) => {
  return ROLES_META[roleId]?.reveal?.seenByMedium || 'unknown';
};

// カウントタイプ取得ヘルパー
const getHumanCount = (roleId) => {
  return ROLES_META[roleId]?.countType?.humanCount || 0;
};

const getWolfCount = (roleId) => {
  return ROLES_META[roleId]?.countType?.wolfCount || 0;
};

// 能力メタデータ取得ヘルパー
const getAbilityMeta = (abilityId) => {
  return ABILITIES_META[abilityId] || null;
};

const getAbilityTargetRules = (abilityId) => {
  return ABILITIES_META[abilityId]?.targetRules || {};
};

// 勝利条件チェック（humanCount/wolfCountベース）
const checkWinCondition = (alivePlayers) => {
  let humanCount = 0;
  let wolfCount = 0;

  // 各プレイヤーの役職から正しいカウントを計算
  for (const player of alivePlayers) {
    humanCount += getHumanCount(player.role);
    wolfCount += getWolfCount(player.role);
  }

  // 人狼陣営の勝利（人狼数 >= 人間数）
  if (wolfCount >= humanCount && wolfCount > 0) {
    return {
      winner: 'werewolf',
      condition: 'equal_or_outnumber_village',
      message: '🐺 人狼陣営の勝利！\n人狼が村を支配しました！',
      counts: { humanCount, wolfCount }
    };
  }

  // 村人陣営の勝利（人狼が全滅）
  if (wolfCount === 0 && humanCount > 0) {
    return {
      winner: 'village',
      condition: 'eliminate_werewolves',
      message: '🎉 村人陣営の勝利！\n人狼を全て排除しました！',
      counts: { humanCount, wolfCount }
    };
  }

  return null; // ゲーム継続
};

// 能力メタデータ - クイックリプライ生成の統一設定
const ABILITIES_META = {
  attack: {
    id: 'attack',
    name: '襲撃',
    description: '夜に1人を襲撃して排除します',
    command: '襲撃',
    targetRules: {
      excludeSelf: true,           // 自分を除外
      excludeDead: true,           // 死亡者を除外
      excludeTeammates: true,      // チームメイト（同じ人狼）を除外
      allowedTargets: ['village']  // 村人陣営のみ対象
    }
  },
  divine: {
    id: 'divine',
    name: '占い',
    description: '夜に1人を占って陣営を調べます',
    command: '占い',
    targetRules: {
      excludeSelf: true,           // 自分を除外
      excludeDead: true,           // 死亡者を除外
      excludeTeammates: false,     // チームメイトも対象
      allowedTargets: []           // 全陣営対象
    }
  },
  guard: {
    id: 'guard',
    name: '護衛',
    description: '夜に1人を護衛して襲撃から守ります',
    command: '護衛',
    targetRules: {
      excludeSelf: true,           // 自分を除外
      excludeDead: true,           // 死亡者を除外
      excludeTeammates: false,     // チームメイトも対象
      allowedTargets: []           // 全陣営対象
    }
  },  medium: {
    id: 'medium',
    name: '霊能',
    description: '処刑された人の役職を自動的に調べます',
    command: '霊能',
    targetRules: {
      automatic: true,             // 自動実行（クイックリプライ不要）
      specialTarget: 'allExecuted' // 特殊：処刑された全員が対象
    }
  },
  focus: {
    id: 'focus',
    name: '注目',
    description: '他のプレイヤーを疑ったり憧憬したりします',
    command: '注目',
    targetRules: {
      excludeSelf: true,           // 自分を除外
      excludeDead: true,           // 死亡者を除外
      excludeTeammates: false,     // チームメイトも対象
      allowedTargets: [],          // 全陣営対象
      customOptions: [             // 特殊選択肢
        { label: '疑う', command: '疑う' },
        { label: '憧憬', command: '憧憬' }
      ]
    }
  }
};

module.exports = {
  ROLES_META,
  ABILITIES_META,
  getTeamRoles,
  getRolesByAbility,
  calculateRoleComposition,
  getRoleInfo,
  getRoleName,
  getRoleTeam,
  getRoleAbilities,
  getDivineResult,
  getMediumResult,
  getHumanCount,
  getWolfCount,
  getAbilityMeta,
  getAbilityTargetRules,
  checkWinCondition
};