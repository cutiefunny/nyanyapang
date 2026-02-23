/**
 * FeverTimeManager - 피버타임 관리
 */
import { FEVER_CONFIG } from './GameConstants';

export class FeverTimeManager {
  constructor(scene) {
    this.scene = scene;
    this.feverTimeActive = false;
    this.feverTimeEvent = null;
    this.gemTweenFlags = new WeakMap(); // gem별 tween 적용 여부 추적 (플래그 기반)
  }

  /**
   * 피버타임 활성화
   */
  activate() {

    if (this.feverTimeActive) {

      return;
    }
    this.feverTimeActive = true;

    // "Fever Time!!" 텍스트 표시
    this.scene.uiManager.showFeverTimeText();

    // 모든 블록에 빨간색 틴트 반짝이 효과
    this.applyTweenToAllGems();

    // 10초 후 종료
    this.feverTimeEvent = this.scene.time.delayedCall(FEVER_CONFIG.DURATION, () => {
      this.deactivate();
    });

    this.scene.isProcessing = false;
  }

  /**
   * 피버타임 종료
   */
  deactivate() {
    this.feverTimeActive = false;

    // "Cool Down!" 텍스트 표시
    this.scene.uiManager.showCoolDownText();

    // 모든 블록의 반짝이 애니메이션 정지 및 tint 복구
    const gems = this.scene.boardManager.gems;
    for (let row = 0; row < this.scene.boardSize.rows; row++) {
      for (let col = 0; col < this.scene.boardSize.cols; col++) {
        const gem = gems[row][col];
        if (gem && gem.active && gem.texture.key !== 'bomb' && gem.texture.key !== 'dog') {
          this.scene.tweens.killTweensOf(gem);
          gem.tint = 0xffffff;
          this.gemTweenFlags.delete(gem); // 플래그 초기화
        }
      }
    }
    
    // 플래그 맵 초기화
    this.gemTweenFlags = new WeakMap();

    // 피버타임 중 보스 스폰 조건이 만족되었으면 이제 보스전 시작
    if (this.scene.bossManager.pendingBossSpawn) {

      this.scene.bossManager.pendingBossSpawn = false;
      const bossType = this.scene.bossManager.pendingBossType || 'wawa';
      this.scene.bossManager.pendingBossType = null;
      this.scene.bossManager.startBossMode(bossType);
    }

    this.scene.isProcessing = false;
  }

  /**
   * 모든 보드 블록에 반짝이 효과 적용 (플래그 기반 최적화)
   */
  applyTweenToAllGems() {
    if (!this.feverTimeActive) return;

    const gems = this.scene.boardManager.gems;
    for (let row = 0; row < this.scene.boardSize.rows; row++) {
      for (let col = 0; col < this.scene.boardSize.cols; col++) {
        const gem = gems[row][col];
        if (gem && gem.active && gem.texture.key !== 'bomb' && gem.texture.key !== 'dog') {
          // 플래그로 이미 tween이 적용되었는지 빠르게 확인
          if (!this.gemTweenFlags.get(gem)) {
            this.gemTweenFlags.set(gem, true);
            this.scene.tweens.add({
              targets: gem,
              tint: 0xff3333,
              duration: FEVER_CONFIG.SPARKLE_DURATION,
              repeat: -1,
              yoyo: true
            });
          }
        }
      }
    }
  }

  /**
   * 새로 생성된 블록에 반짝이 효과 적용
   */
  applyTweenToNewGems() {
    this.applyTweenToAllGems();
  }

  /**
   * 보드가 반 이상 비워졌는지 확인
   */
  isBoardHalfEmpty() {
    let gemCount = 0;
    const totalSlots = this.scene.boardSize.rows * this.scene.boardSize.cols;

    for (let row = 0; row < this.scene.boardSize.rows; row++) {
      for (let col = 0; col < this.scene.boardSize.cols; col++) {
        const gem = this.scene.boardManager.gems[row][col];
        if (gem && gem.active !== false && gem.texture.key !== 'bomb' && gem.texture.key !== 'dog') {
          gemCount++;
        }
      }
    }



    return gemCount <= FEVER_CONFIG.REMAINING_GEM_THRESHOLD;
  }

  /**
   * 정리
   */
  destroy() {
    if (this.feverTimeEvent) {
      this.feverTimeEvent.remove();
      this.feverTimeEvent = null;
    }
    this.feverTimeActive = false;
  }
}
