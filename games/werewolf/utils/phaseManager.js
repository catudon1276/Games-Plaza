// 人狼ゲームのフェーズ管理
class PhaseManager {
  constructor() {
    this.phases = {
      WAITING: 'waiting',     // 待機中（参加者募集）
      DAY: 'day',            // 昼フェーズ（議論・投票）
      NIGHT: 'night',        // 夜フェーズ（人狼行動・能力者行動）
      ENDED: 'ended'         // ゲーム終了
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

  // 昼 → 夜
  switchToNight() {
    if (this.currentPhase !== this.phases.DAY) {
      return { success: false, message: '昼フェーズではありません。' };
    }
    
    const result = this.switchToPhase(this.phases.NIGHT);
    return { 
      success: true, 
      message: result.message,
      phase: result.newPhase,
      dayCount: result.dayCount
    };
  }

  // 夜 → 昼
  switchToDay() {
    if (this.currentPhase !== this.phases.NIGHT) {
      return { success: false, message: '夜フェーズではありません。' };
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
      case this.phases.NIGHT:
        return `🌙 ${this.dayCount}日目の夜になりました。\n人狼と能力者は行動してください。`;
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
  isNight() { return this.currentPhase === this.phases.NIGHT; }
  isEnded() { return this.currentPhase === this.phases.ENDED; }
  isPlaying() { return this.isDay() || this.isNight(); }
}

module.exports = PhaseManager;
