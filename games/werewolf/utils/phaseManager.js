// 人狼ゲームのフェーズ管理
class PhaseManager {
  constructor() {
    this.phases = {
      WAITING: 'waiting',           // 待機中（参加者募集）
      DAY: 'day',                  // 昼フェーズ（議論・投票）
      NIGHT_WAITING: 'night_waiting',     // 夜フェーズ（行動選択待ち）
      NIGHT_RESOLVING: 'night_resolving', // 深夜フェーズ（行動処理）
      ENDED: 'ended'               // ゲーム終了
    };
    
    this.currentPhase = this.phases.WAITING;
    this.dayCount = 0;
    this.phaseStartTime = new Date();
  }

  // フェーズ切り替え
  switchToPhase(newPhase) {
    const oldPhase = this.currentPhase;
    this.currentPhase = newPhase;
    this.phaseStartTime = new Date();
    
    if (newPhase === this.phases.DAY) {
      this.dayCount++;
    }
    
    return {
      oldPhase,
      newPhase,
      dayCount: this.dayCount,
      message: this.getPhaseMessage(newPhase)
    };
  }

  // ゲーム開始（waiting → day）
  startGame() {
    if (this.currentPhase !== this.phases.WAITING) {
      return { success: false, message: 'ゲームは既に開始されています。' };
    }
    
    const result = this.switchToPhase(this.phases.DAY);
    return { 
      success: true, 
      message: result.message,
      phase: result.newPhase,
      dayCount: result.dayCount
    };
  }
  // 昼 → 夜（行動選択）
  switchToNightWaiting() {
    if (this.currentPhase !== this.phases.DAY) {
      return { success: false, message: '昼フェーズではありません。' };
    }
    
    const result = this.switchToPhase(this.phases.NIGHT_WAITING);
    return { 
      success: true, 
      message: result.message,
      phase: result.newPhase,
      dayCount: result.dayCount
    };
  }

  // 夜（行動選択）→ 深夜（処理）
  switchToNightResolving() {
    if (this.currentPhase !== this.phases.NIGHT_WAITING) {
      return { success: false, message: '夜の行動選択フェーズではありません。' };
    }
    
    const result = this.switchToPhase(this.phases.NIGHT_RESOLVING);
    return { 
      success: true, 
      message: result.message,
      phase: result.newPhase,
      dayCount: result.dayCount
    };
  }
  // 夜 → 昼
  switchToDay() {
    if (this.currentPhase !== this.phases.NIGHT_RESOLVING) {
      return { success: false, message: '深夜フェーズではありません。' };
    }
    
    const result = this.switchToPhase(this.phases.DAY);
    return { 
      success: true, 
      message: result.message,
      phase: result.newPhase,
      dayCount: result.dayCount
    };
  }

  // ゲーム終了
  endGame() {
    const result = this.switchToPhase(this.phases.ENDED);
    return { 
      success: true, 
      message: 'ゲームが終了しました。',
      phase: result.newPhase
    };
  }
  // フェーズメッセージ取得
  getPhaseMessage(phase) {
    switch (phase) {
      case this.phases.WAITING:
        return '参加者を募集中です。';
      case this.phases.DAY:
        return `🌅 ${this.dayCount}日目の朝になりました。\n議論を開始してください。`;
      case this.phases.NIGHT_WAITING:
        return `🌙 ${this.dayCount}日目の夜になりました。\n各プレイヤーは行動を選択してください。`;
      case this.phases.NIGHT_RESOLVING:
        return `🌌 深夜です。行動を処理中...`;
      case this.phases.ENDED:
        return 'ゲームが終了しました。';
      default:
        return '';
    }
  }

  // 現在のフェーズ情報取得
  getCurrentPhaseInfo() {
    return {
      phase: this.currentPhase,
      dayCount: this.dayCount,
      startTime: this.phaseStartTime,
      message: this.getPhaseMessage(this.currentPhase)
    };
  }
  // フェーズチェック
  isWaiting() { return this.currentPhase === this.phases.WAITING; }
  isDay() { return this.currentPhase === this.phases.DAY; }
  isNightWaiting() { return this.currentPhase === this.phases.NIGHT_WAITING; }
  isNightResolving() { return this.currentPhase === this.phases.NIGHT_RESOLVING; }
  isEnded() { return this.currentPhase === this.phases.ENDED; }
  isPlaying() { return this.isDay() || this.isNightWaiting() || this.isNightResolving(); }
  isNight() { return this.isNightWaiting() || this.isNightResolving(); }
}

module.exports = PhaseManager;
