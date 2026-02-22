/**
 * FeverTimeManager - 피버타임 관리
 */
import { FEVER_CONFIG } from './GameConstants';

export class FeverTimeManager {
  constructor(scene) {
    this.scene = scene;
    this.feverTimeActive = false;
    this.feverTimeEvent = null;
  }

  /**
   * 피버타임 활성화
   */
  activate() {
    console.log('[피버] 피버타임 발동!');
    if (this.feverTimeActive) {
      console.log('[피버] 이미 발동 중, 중복 방지 처리');
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
    for (let row = 0; row < this.scene.boardSize.rows; row++) {
      for (let col = 0; col < this.scene.boardSize.cols; col++) {
        const gem = this.scene.boardManager.gems[row][col];
        if (gem && gem.active && gem.texture.key !== 'bomb' && gem.texture.key !== 'dog') {
          this.scene.tweens.killTweensOf(gem);
          gem.tint = 0xffffff;
        }
      }
    }

    this.scene.isProcessing = false;
  }

  /**
   * 모든 보드 블록에 반짝이 효과 적용
   */
  applyTweenToAllGems() {
    if (!this.feverTimeActive) return;

    for (let row = 0; row < this.scene.boardSize.rows; row++) {
      for (let col = 0; col < this.scene.boardSize.cols; col++) {
        const gem = this.scene.boardManager.gems[row][col];
        if (gem && gem.active) {
          // 특수블록(폭탄, 개)은 효과 제외
          if (gem.texture.key === 'bomb' || gem.texture.key === 'dog') {
            continue;
          }

          // 이미 tween이 있으면 스킵
          const tweens = this.scene.tweens.getTweensOf(gem);
          const hasSparkle = tweens.some(t => t.targets.includes(gem) && t.data.some(d => d.key === 'tint'));

          if (!hasSparkle) {
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

    console.log(`[피버] gem 비율: ${gemCount}/${totalSlots} (${(gemCount / totalSlots * 100).toFixed(1)}%), 한계: ${FEVER_CONFIG.REMAINING_GEM_THRESHOLD}`);

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
