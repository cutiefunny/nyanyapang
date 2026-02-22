/**
 * InputHandler - Gem 입력 및 상호작용 처리
 */
import { DRAG_CONFIG, ANIMATION_CONFIG } from './GameConstants';
import Phaser from 'phaser';

export class InputHandler {
  constructor(scene) {
    this.scene = scene;
    this.selectedGem = null;
    this.draggingGem = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
  }

  /**
   * 초기화
   */
  initialize() {
    this.scene.input.on('gameobjectdown', this.onGemDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
  }

  /**
   * Gem 다운 이벤트
   */
  onGemDown(pointer, gem) {
    if (this.scene.bossManager.bossMode || this.scene.isProcessing || !gem || !gem.active || !gem.texture) return;

    if (!this.scene.gameTimer.timerStarted) {
      this.scene.gameTimer.start();
    }

    this.draggingGem = gem;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
  }

  /**
   * 포인터 이동
   */
  onPointerMove(pointer) {
    if (this.scene.bossManager.bossMode || this.scene.isProcessing || !this.draggingGem) return;

    // 유효성 검증
    if (!this.draggingGem.active || !this.draggingGem.texture) {
      this.draggingGem = null;
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.dragStartX, this.dragStartY, pointer.x, pointer.y);
    const sensitivity = Math.max(DRAG_CONFIG.DRAG_MIN_DISTANCE, this.scene.gemSize * DRAG_CONFIG.DRAG_BASE_SENSITIVITY);

    if (dist > sensitivity) {
      const angle = Phaser.Math.Angle.Between(this.dragStartX, this.dragStartY, pointer.x, pointer.y);
      const direction = this.getDirectionFromAngle(angle);

      let targetRow = this.draggingGem.row;
      let targetCol = this.draggingGem.col;

      if (direction === 'LEFT') targetCol--;
      else if (direction === 'RIGHT') targetCol++;
      else if (direction === 'UP') targetRow--;
      else if (direction === 'DOWN') targetRow++;

      if (this.scene.boardManager.isValidSlot(targetRow, targetCol)) {
        const targetGem = this.scene.boardManager.gems[targetRow][targetCol];
        if (targetGem && targetGem.active && targetGem.texture) {
          if (this.selectedGem) {
            this.restoreGemAppearance(this.selectedGem);
            this.selectedGem = null;
          }

          const currentDragging = this.draggingGem;
          this.draggingGem = null;
          this.swapGems(currentDragging, targetGem);
        }
      }
    }
  }

  /**
   * 포인터 업
   */
  onPointerUp(pointer) {
    if (this.scene.bossManager.bossMode) return;

    const draggingGem = this.draggingGem;
    this.draggingGem = null;

    if (draggingGem && !this.scene.isProcessing && draggingGem.active && draggingGem.texture) {
      try {
        this.handleGemClick(draggingGem);
      } catch (e) {
        console.error('[Error] onPointerUp 처리 중 예외:', e);
        this.scene.isProcessing = false;
      }
    }
  }

  /**
   * 각도에서 방향 계산
   */
  getDirectionFromAngle(angle) {
    const deg = Phaser.Math.RadToDeg(angle);
    if (deg >= -45 && deg <= 45) return 'RIGHT';
    if (deg > 45 && deg < 135) return 'DOWN';
    if (deg >= 135 || deg <= -135) return 'LEFT';
    return 'UP';
  }

  /**
   * Gem 클릭 처리
   */
  handleGemClick(gem) {
    if (!gem || !gem.texture) return;

    // 피버타임 중이면 모든 블록을 폭탄처럼 터뜨림
    if (this.scene.feverTimeManager.feverTimeActive) {
      this.scene.explosionManager.explodeBomb(gem);
      return;
    }

    if (gem.texture.key === 'bomb') {
      this.scene.explosionManager.explodeBomb(gem);
      return;
    }
    if (gem.texture.key === 'dog') {
      this.scene.explosionManager.activateDog(gem);
      return;
    }

    if (!this.selectedGem) {
      this.selectedGem = gem;
      this.selectGem(gem);
    } else {
      if (this.selectedGem === gem) {
        this.restoreGemAppearance(this.selectedGem);
        this.selectedGem = null;
        return;
      }

      if (this.areAdjacent(this.selectedGem, gem)) {
        this.restoreGemAppearance(this.selectedGem);
        this.swapGems(this.selectedGem, gem);
        this.selectedGem = null;
      } else {
        this.restoreGemAppearance(this.selectedGem);
        this.selectedGem = gem;
        this.selectGem(gem);
      }
    }
  }

  /**
   * Gem 선택 상태 설정
   */
  selectGem(gem) {
    gem.setTint(ANIMATION_CONFIG.GEM_SELECT_TINT);
    this.scene.tweens.add({
      targets: gem,
      scaleX: ANIMATION_CONFIG.GEM_SELECT_SCALE,
      scaleY: ANIMATION_CONFIG.GEM_SELECT_SCALE,
      duration: ANIMATION_CONFIG.GEM_SELECT_DURATION
    });
  }

  /**
   * Gem 외형 복원
   */
  restoreGemAppearance(gem) {
    this.restoreGemTint(gem);
    this.restoreGemSize(gem);
  }

  /**
   * Gem 크기 복원
   */
  restoreGemSize(gem) {
    if (gem.texture.key === 'bomb' || gem.texture.key === 'dog') {
      gem.setDisplaySize(
        this.scene.gemSize * 1.0,
        this.scene.gemSize * 1.0
      );
    } else {
      gem.setDisplaySize(
        this.scene.gemSize - 2,
        this.scene.gemSize - 2
      );
    }
  }

  /**
   * Gem 색상 복원
   */
  restoreGemTint(gem) {
    const type = gem.texture.key;
    const baseTints = {
      'gem1': 0xffffff, 'gem2': 0xffffff, 'gem3': 0xffffff,
      'gem4': 0xffffff, 'gem5': 0xffffff, 'gem6': 0xffffff,
      'bomb': 0xff0000, 'dog': 0xffffff
    };
    const baseTint = baseTints[type] || 0xffffff;
    gem.setTint(baseTint);
  }

  /**
   * 인접한 gem 확인
   */
  areAdjacent(gem1, gem2) {
    const rowDiff = Math.abs(gem1.row - gem2.row);
    const colDiff = Math.abs(gem1.col - gem2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  /**
   * Gem 스왑
   */
  swapGems(gem1, gem2) {
    if (!gem1 || !gem2 || gem1.active === false || gem2.active === false ||
        !gem1.texture || !gem2.texture) {
      this.scene.isProcessing = false;
      return;
    }

    if (this.scene.isProcessing) {
      return;
    }

    this.scene.isProcessing = true;
    this.scene.comboCount = 0;

    const gem1OriginalRow = gem1.row;
    const gem1OriginalCol = gem1.col;
    const gem2OriginalRow = gem2.row;
    const gem2OriginalCol = gem2.col;
    const gems = this.scene.boardManager.gems;

    gems[gem1.row][gem1.col] = gem2;
    gems[gem2.row][gem2.col] = gem1;

    gem1.row = gem2OriginalRow;
    gem1.col = gem2OriginalCol;
    gem2.row = gem1OriginalRow;
    gem2.col = gem1OriginalCol;

    try {
      this.scene.tweens.add({
        targets: [gem1, gem2],
        x: (target) => this.scene.boardManager.getGemX(target.col),
        y: (target) => this.scene.boardManager.getGemY(target.row),
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          try {
            if (!gem1 || !gem2 || gem1.active === false || gem2.active === false ||
                !gem1.texture || !gem2.texture) {
              this.scene.isProcessing = false;
              return;
            }

            const matches = this.scene.matchChecker.checkMatches();
            if (matches.length > 0) {
              this.scene.handleMatches();
            } else {
              this.swapGemsReverse(gem1, gem2, gem1OriginalRow, gem1OriginalCol, gem2OriginalRow, gem2OriginalCol);
            }
          } catch (e) {
            console.error('[Error] swapGems onComplete 처리 중 예외:', e);
            this.scene.isProcessing = false;
          }
        }
      });
    } catch (e) {
      console.error('[Error] swapGems tween 생성 중 예외:', e);
      this.scene.isProcessing = false;
    }
  }

  /**
   * Gem 스왑 역순 (실패 시)
   */
  swapGemsReverse(gem1, gem2, gem1OrigRow, gem1OrigCol, gem2OrigRow, gem2OrigCol) {
    try {
      const gems = this.scene.boardManager.gems;
      gems[gem1OrigRow][gem1OrigCol] = gem1;
      gems[gem2OrigRow][gem2OrigCol] = gem2;

      gem1.row = gem1OrigRow;
      gem1.col = gem1OrigCol;
      gem2.row = gem2OrigRow;
      gem2.col = gem2OrigCol;

      this.scene.tweens.add({
        targets: [gem1, gem2],
        x: (target) => this.scene.boardManager.getGemX(target.col),
        y: (target) => this.scene.boardManager.getGemY(target.row),
        duration: ANIMATION_CONFIG.GEM_SWAP_DURATION,
        ease: ANIMATION_CONFIG.GEM_SWAP_EASE,
        onComplete: () => {
          this.scene.isProcessing = false;
        }
      });
    } catch (e) {
      console.error('[Error] swapGemsReverse 중 예외:', e);
      this.scene.isProcessing = false;
    }
  }

  /**
   * 정리
   */
  destroy() {
    this.selectedGem = null;
    this.draggingGem = null;
  }
}
