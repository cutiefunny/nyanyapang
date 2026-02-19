import Phaser from 'phaser';

/**
 * ExplosionManager - 폭발 및 연쇄 폭발 로직
 * 책임: 폭탄 폭발, 연쇄 폭발, 개 활성화
 */
export class ExplosionManager {
  constructor(scene, boardManager) {
    this.scene = scene;
    this.boardManager = boardManager;
  }

  /**
   * 폭탄 폭발 (초기)
   */
  explodeBomb(bombGem) {
    this.scene.isProcessing = true;
    this.explodeBombRecursive(bombGem.row, bombGem.col, new Set(), 0);
    this.scene.isProcessing = false;
    this.scene.time.delayedCall(500, () => {
      const maxDuration = this.boardManager.fillBoard();
      this.scene.time.delayedCall(maxDuration + 150, () => {
        this.scene.handleMatchesAfterExplosion();
      });
    });
  }

  /**
   * 재귀적 폭탄 폭발 (범위 확대)
   */
  explodeBombRecursive(centerRow, centerCol, visited, chainDepth = 0) {
    const key = `${centerRow},${centerCol}`;
    if (visited.has(key)) return;
    visited.add(key);

    const range = 1 + chainDepth;
    const gems = this.boardManager.gems;
    const destroyedGems = [];
    const bombsToExplode = [];

    for (let r = centerRow - range; r <= centerRow + range; r++) {
      for (let c = centerCol - range; c <= centerCol + range; c++) {
        if (this.boardManager.isValidSlot(r, c)) {
          const gem = gems[r][c];
          if (gem && gem.active) {
            destroyedGems.push(gem);
            if (gem.texture.key === 'bomb') {
              bombsToExplode.push({ row: gem.row, col: gem.col });
            }
          }
        }
      }
    }

    if (destroyedGems.length === 0) return;

    this.scene.cameras.main.shake(300, 0.03);
    this.scene.cameras.main.flash(200, 255, 100, 100);
    this.scene.sound.play('bomb', { volume: 0.7 });
    this.scene.addScore(destroyedGems.length * 200);

    destroyedGems.forEach(gem => {
      this.scene.playMatchSound();
      this.scene.createExplosionEffect(gem);
      gems[gem.row][gem.col] = null;
      gem.destroy();
    });

    const centerX = this.boardManager.getGemX(centerCol);
    const centerY = this.boardManager.getGemY(centerRow);
    if (bombsToExplode.length > 0) {
      this.scene.showComboText(centerX, centerY, "CHAIN!!");
    } else {
      this.scene.showComboText(centerX, centerY, "BOOM!!");
    }

    bombsToExplode.forEach((bomb, index) => {
      this.scene.time.delayedCall(200 * (index + 1), () => {
        this.explodeBombRecursive(bomb.row, bomb.col, visited, chainDepth + 1);
      });
    });
  }

  /**
   * 개 활성화
   */
  activateDog(dogGem) {
    this.scene.isProcessing = true;
    const row = dogGem.row;
    const gems = this.boardManager.gems;
    
    gems[row][dogGem.col] = null;
    
    this.scene.tweens.killTweensOf(dogGem);
    dogGem.setDepth(100);
    dogGem.play('dog_walk_anim');

    this.scene.isProcessing = false;

    this.scene.tweens.add({
      targets: dogGem,
      x: this.boardManager.getGemX(-1),
      duration: 1500,
      ease: 'Linear',
      onUpdate: () => {
        for (let c = 0; c < this.boardManager.boardSize.cols; c++) {
          const target = gems[row][c];
          if (target && target.active) {
            if (Math.abs(dogGem.x - target.x) < this.boardManager.gemSize / 2) {
              const targetRow = target.row;
              const targetCol = target.col;
              const isBomb = target.texture.key === 'bomb';

              this.scene.playMatchSound();
              this.scene.createExplosionEffect(target);
              gems[row][c] = null;
              target.destroy();
              this.scene.addScore(300);

              if (isBomb) {
                this.scene.time.delayedCall(50, () => {
                  this.explodeBombRecursive(targetRow, targetCol, new Set(), 1);
                });
              }
            }
          }
        }
      },
      onComplete: () => {
        dogGem.destroy();
        this.scene.cameras.main.shake(400, 0.02);
        this.scene.showComboText(400, 300, "YUMMY!");
        const maxDuration = this.boardManager.fillBoard();
        this.scene.time.delayedCall(maxDuration + 150, () => {
          this.scene.handleMatchesAfterExplosion();
        });
      }
    });
  }

  /**
   * 폭탄 생성
   */
  createBomb() {
    const candidates = this.boardManager.getValidCandidates();
    if (candidates.length > 0) {
      const target = Phaser.Math.RND.pick(candidates);
      target.setTexture('bomb');
      target.setDisplaySize(this.boardManager.gemSize * 1.2, this.boardManager.gemSize * 1.2);
      this.scene.restoreGemTint(target);
      this.scene.addPulseTween(target);
      this.scene.showComboText(target.x, target.y, "BOMB!");
    }
  }

  /**
   * 개 생성
   */
  createDog() {
    const col = this.boardManager.boardSize.cols - 1;
    const candidates = [];
    const gems = this.boardManager.gems;
    
    for (let r = 0; r < this.boardManager.boardSize.rows; r++) {
      const g = gems[r][col];
      if (g && g.active && g.texture.key !== 'bomb' && g.texture.key !== 'dog') {
        candidates.push(g);
      }
    }

    if (candidates.length > 0) {
      const target = Phaser.Math.RND.pick(candidates);
      target.setTexture('dog', 0);
      target.setDisplaySize(this.boardManager.gemSize * 1.2, this.boardManager.gemSize * 1.2);
      this.scene.restoreGemTint(target);
      this.scene.addPulseTween(target);
      this.scene.showComboText(target.x, target.y, "DOG!");
    }
  }
}
