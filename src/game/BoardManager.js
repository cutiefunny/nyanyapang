import Phaser from 'phaser';

/**
 * BoardManager - 보드 및 gem 관리
 * 책임: gem 배치, 빈칸 채우기, 겹침 감지, 콜라이션 처리
 */
export class BoardManager {
  constructor(scene, boardSize, gemTypes, gemSize) {
    this.scene = scene;
    this.boardSize = boardSize;
    this.gemTypes = gemTypes;
    this.gemSize = gemSize;
    this.gems = [];
  }

  /**
   * 보드 초기 생성
   */
  createBoard() {
    this.gems = [];
    for (let row = 0; row < this.boardSize.rows; row++) {
      this.gems[row] = [];
      for (let col = 0; col < this.boardSize.cols; col++) {
        let type;
        do {
          type = Phaser.Math.RND.pick(this.gemTypes);
        } while (
          (row >= 2 && this.gems[row - 1][col].texture.key === type && this.gems[row - 2][col].texture.key === type) ||
          (col >= 2 && this.gems[row][col - 1].texture.key === type && this.gems[row][col - 2].texture.key === type)
        );
        this.spawnGem(row, col, type);
      }
    }
  }

  /**
   * 특정 위치에 gem 생성
   */
  spawnGem(row, col, type) {
    const x = this.getGemX(col);
    const y = this.getGemY(row);
    
    const gem = this.scene.add.sprite(x, y, type);
    gem.setDisplaySize(this.gemSize - 2, this.gemSize - 2);
    
    const baseTint = this.scene.baseTints[type] || 0xffffff;
    gem.setTint(baseTint);

    gem.setInteractive();
    gem.row = row;
    gem.col = col;
    
    this.gems[row][col] = gem;
    return gem;
  }

  /**
   * 빈칸 채우기 (gem이 떨어짐)
   */
  fillBoard() {
    let maxDuration = 0;

    for (let col = 0; col < this.boardSize.cols; col++) {
      let emptySlots = 0;
      
      for (let row = this.boardSize.rows - 1; row >= 0; row--) {
        if (this.gems[row][col] === null) {
          emptySlots++;
        } else if (emptySlots > 0) {
          const gem = this.gems[row][col];
          const newRow = row + emptySlots;
          
          this.gems[newRow][col] = gem;
          this.gems[row][col] = null;
          gem.row = newRow;

          this.scene.tweens.add({
            targets: gem,
            y: this.getGemY(newRow),
            duration: 400,
            ease: 'Bounce.easeOut'
          });
        }
      }

      for (let i = 0; i < emptySlots; i++) {
        const row = emptySlots - 1 - i;
        const type = Phaser.Math.RND.pick(this.gemTypes);
        const startY = this.getGemY(row) - (emptySlots * this.gemSize) - 50;
        const destY = this.getGemY(row);

        const gem = this.spawnGem(row, col, type);
        gem.y = startY;

        this.scene.tweens.add({
          targets: gem,
          y: destY,
          duration: 500,
          ease: 'Bounce.easeOut',
          delay: i * 80
        });

        maxDuration = Math.max(maxDuration, 500 + i * 80);
      }
    }

    return maxDuration;
  }

  /**
   * 빈칸 감지 및 자동 채우기
   */
  enforceNoEmptySlots() {
    const emptySlots = [];
    
    for (let row = 0; row < this.boardSize.rows; row++) {
      for (let col = 0; col < this.boardSize.cols; col++) {
        if (this.gems[row][col] === null) {
          emptySlots.push({ row, col });
        }
      }
    }

    if (emptySlots.length === 0) return false;

    // 빈칸을 파괴된 것으로 간주하고 점수 처리
    if (this.scene.addScore) {
      this.scene.addScore(emptySlots.length * 50);
    }

    // 빈칸 채우기
    emptySlots.forEach(({ row, col }) => {
      const type = Phaser.Math.RND.pick(this.gemTypes);
      const startY = this.getGemY(row) - this.gemSize * 2;
      const gem = this.spawnGem(row, col, type);
      gem.y = startY;

      this.scene.tweens.add({
        targets: gem,
        y: this.getGemY(row),
        duration: 400,
        ease: 'Bounce.easeOut'
      });
    });

    return true;
  }

  /**
   * 겹친 gem 감지 및 수정
   */
  fixOverlappingGems() {
    const positionMap = new Map();
    
    for (let row = 0; row < this.boardSize.rows; row++) {
      for (let col = 0; col < this.boardSize.cols; col++) {
        const gem = this.gems[row][col];
        if (gem && gem.active) {
          const key = `${Math.round(gem.x)},${Math.round(gem.y)}`;
          if (!positionMap.has(key)) {
            positionMap.set(key, []);
          }
          positionMap.get(key).push({ gem, row, col });
        }
      }
    }

    positionMap.forEach((gems) => {
      if (gems.length > 1) {
        gems.sort((a, b) => a.gem.depth - b.gem.depth);
        const lowestGem = gems[0];
        
        let closestEmptyRow = -1, closestEmptyCol = -1;
        let minDistance = Infinity;

        for (let r = 0; r < this.boardSize.rows; r++) {
          for (let c = 0; c < this.boardSize.cols; c++) {
            if (this.gems[r][c] === null) {
              const distance = Math.abs(r - lowestGem.row) + Math.abs(c - lowestGem.col);
              if (distance < minDistance) {
                minDistance = distance;
                closestEmptyRow = r;
                closestEmptyCol = c;
              }
            }
          }
        }

        if (closestEmptyRow !== -1) {
          this.gems[lowestGem.row][lowestGem.col] = null;
          this.gems[closestEmptyRow][closestEmptyCol] = lowestGem.gem;
          lowestGem.gem.row = closestEmptyRow;
          lowestGem.gem.col = closestEmptyCol;
          
          this.scene.tweens.killTweensOf(lowestGem.gem);
          this.scene.tweens.add({
            targets: lowestGem.gem,
            x: this.getGemX(closestEmptyCol),
            y: this.getGemY(closestEmptyRow),
            duration: 300,
            ease: 'Power2'
          });
        }
      }
    });
  }

  /**
   * gem의 x 좌표 계산
   */
  getGemX(col) {
    return col * this.gemSize + this.scene.offsetX;
  }

  /**
   * gem의 y 좌표 계산
   */
  getGemY(row) {
    return row * this.gemSize + this.scene.offsetY;
  }

  /**
   * 슬롯 유효성 검사
   */
  isValidSlot(row, col) {
    return row >= 0 && row < this.boardSize.rows && col >= 0 && col < this.boardSize.cols;
  }

  /**
   * 유효한 일반 gem 후보 반환
   */
  getValidCandidates() {
    const candidates = [];
    for (let r = 0; r < this.boardSize.rows; r++) {
      for (let c = 0; c < this.boardSize.cols; c++) {
        const g = this.gems[r][c];
        if (g && g.active && g.texture.key !== 'bomb' && g.texture.key !== 'dog') {
          candidates.push(g);
        }
      }
    }
    return candidates;
  }
}
