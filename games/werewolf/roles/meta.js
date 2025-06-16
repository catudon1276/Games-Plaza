// 人狼ゲーム役職メタデータ - 全役職の情報を一元管理
const ROLES_META = {
  villager: {
    id: 'villager',
    name: '市民',
    team: 'village',
    priority: 1,
    intro: 'あなたは市民です。',
    description: '特殊能力はありませんが、議論と投票で人狼を見つけ出しましょう。議論での推理力が勝負の鍵です。',
    abilities: ['focus'],
    countType: {
      humanCount: 1, // 人間陣営としてカウント
      wolfCount: 0   // 人狼としてはカウントしない
    },
    scaling: {
      minPlayers: 3,
      baseCount: 0,
      scaling: 'remainder'
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
    priority: 10,
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
      ratio: 0.33,
      maxCount: 3
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
      humanCount: 1, // 人間陣営としてカウント
      wolfCount: 0   // 人狼としてはカウントしない
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
      humanCount: 1, // 人間陣営としてカウント
      wolfCount: 0   // 人狼としてはカウントしない
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
    winConditions: ['eliminate_werewolves']
  },

  medium: {
    id: 'medium',
    name: '霊媒師',
    team: 'village',
    priority: 6,
    intro: 'あなたは霊媒師です。',
    description: '処刑された人の役職を知ることができます。死者の声を聞き、真実を暴きましょう。',
    abilities: ['medium'],
    countType: {
      humanCount: 1, // 人間陣営としてカウント
      wolfCount: 0   // 人狼としてはカウントしない
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
      humanCount: 1, // 狂人は人間としてカウント（人狼ではないため）
      wolfCount: 0   // 人狼としてはカウントしない（狼ではないため）
    },
    scaling: {
      minPlayers: 6,
      baseCount: 1,
      scaling: 'fixed'
    },
    reveal: {
      seenBySeer: 'white', // 狂人は白く見える
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
    .sort((a, b) => b.priority - a.priority);

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

module.exports = {
  ROLES_META,
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
  checkWinCondition
};
