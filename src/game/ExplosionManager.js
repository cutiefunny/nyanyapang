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
    const angryDogs = [];
    const bombsToExplode = [];

    for (let r = centerRow - range; r <= centerRow + range; r++) {
      for (let c = centerCol - range; c <= centerCol + range; c++) {
        if (this.boardManager.isValidSlot(r, c)) {
          const gem = gems[r][c];
          if (gem && gem.active) {
            // 개는 별도로 처리 (분노 활성화)
            if (gem.texture.key === 'dog') {
              angryDogs.push(gem);
              gems[r][c] = null;
            } else {
              destroyedGems.push(gem);
              if (gem.texture.key === 'bomb') {
                bombsToExplode.push({ row: gem.row, col: gem.col });
              }
            }
          }
        }
      }
    }

    if (destroyedGems.length === 0 && angryDogs.length === 0) return;

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
    if (bombsToExplode.length > 0 || angryDogs.length > 0) {
      this.scene.showComboText(centerX, centerY, "CHAIN!!");
    } else {
      this.scene.showComboText(centerX, centerY, "BOOM!!");
    }

    // 분노한 개 활성화 (일정 시간 후)
    angryDogs.forEach((dog, index) => {
      this.scene.time.delayedCall(300 + 200 * index, () => {
        this.activateAngryDog(dog);
      });
    });

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
   * 분노한 개 활성화 (폭탄 폭발로 인해 활성화)
   * 랜덤한 방향으로 돌아다니면서 블록을 터뜨린 후 나감
   */
  activateAngryDog(dogGem) {
    this.scene.tweens.killTweensOf(dogGem);
    dogGem.setDepth(100);
    dogGem.setTint(0xff6666); // 빨간색으로 표시
    dogGem.play('dog_walk_anim');

    const gems = this.boardManager.gems;
    const rows = this.boardManager.boardSize.rows;
    const cols = this.boardManager.boardSize.cols;
    const gemSize = this.boardManager.gemSize;
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;

    // 랜덤 waypoint 생성 (3-4개)
    const waypointCount = Phaser.Math.Between(3, 4);
    const waypoints = [];

    // 첫 번째: 보드 내의 랜덤 위치
    for (let i = 0; i < waypointCount; i++) {
      const randomRow = Phaser.Math.Between(0, rows - 1);
      const randomCol = Phaser.Math.Between(0, cols - 1);
      const x = this.boardManager.getGemX(randomCol);
      const y = this.boardManager.getGemY(randomRow);
      waypoints.push({ x, y });
    }

    // 마지막: 화면 왼쪽 밖으로 나가기
    waypoints.push({ x: -gemSize * 2, y: dogGem.y });

    const activateHelper = () => {
      // 충돌 감지 및 블록 파괴 함수
      const checkCollisions = () => {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const target = gems[r][c];
            if (target && target.active) {
              // 개와 블록의 거리 계산
              const dx = dogGem.x - target.x;
              const dy = dogGem.y - target.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < gemSize * 0.7) {
                const isBomb = target.texture.key === 'bomb';

                this.scene.playMatchSound();
                this.scene.createExplosionEffect(target);
                gems[r][c] = null;
                target.destroy();
                this.scene.addScore(300);

                if (isBomb) {
                  this.scene.time.delayedCall(50, () => {
                    this.explodeBombRecursive(r, c, new Set(), 1);
                  });
                }
              }
            }
          }
        }
      };

      // Waypoint 별로 tween 생성
      let totalDuration = 0;
      waypoints.forEach((waypoint, index) => {
        const duration = 800 + Phaser.Math.Between(-100, 100);

        this.scene.tweens.add({
          targets: dogGem,
          x: waypoint.x,
          y: waypoint.y,
          duration: duration,
          ease: 'Linear',
          delay: totalDuration,
          onUpdate: () => {
            checkCollisions();
          },
          onComplete: () => {
            if (index === waypoints.length - 1) {
              // 마지막 waypoint 도달 시 개 파괴
              dogGem.destroy();
              this.scene.cameras.main.shake(300, 0.02);
              this.scene.showComboText(400, 300, "RAWR!");
              
              // 모든 애니메이션 완료 후 보드 재확인
              this.scene.time.delayedCall(300, () => {
                const maxDuration = this.boardManager.fillBoard();
                this.scene.time.delayedCall(maxDuration + 150, () => {
                  this.scene.handleMatchesAfterExplosion();
                });
              });
            }
          }
        });

        totalDuration += duration;
      });
    };

    activateHelper();
  }

  /**
   * 폭탄 생성
   */
  createBomb() {
    const candidates = this.boardManager.getValidCandidates();
    if (candidates.length > 0) {
      const target = Phaser.Math.RND.pick(candidates);
      target.setTexture('bomb');
      target.setDisplaySize(this.boardManager.gemSize * 1.0, this.boardManager.gemSize * 1.0);
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
      target.setDisplaySize(this.boardManager.gemSize * 1.0, this.boardManager.gemSize * 1.0);
      this.scene.restoreGemTint(target);
      this.scene.addPulseTween(target);
      this.scene.showComboText(target.x, target.y, "DOG!");
    }
  }
}
