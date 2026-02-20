import Phaser from 'phaser';
import { GAME_CONFIG, BOARD_CHECK_CONFIG, ANIMATION_CONFIG } from './GameConstants';

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
    this._filling = false; // fillBoard 중복 호출 방지
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
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
          type = Phaser.Math.RND.pick(this.gemTypes);
          attempts++;
          
          // 최대 시도 횟수 초과 방지
          if (attempts > maxAttempts) {
            break;
          }
        } while (
          (row >= 2 && this.gems[row - 1]?.[col]?.texture?.key === type && this.gems[row - 2]?.[col]?.texture?.key === type) ||
          (col >= 2 && this.gems[row]?.[col - 1]?.texture?.key === type && this.gems[row]?.[col - 2]?.texture?.key === type)
        );
        
        this.spawnGem(row, col, type);
      }
    }
  }

  /**
   * 특정 위치에 gem 생성 - 중복 방지 강화
   */
  spawnGem(row, col, type) {
    const x = this.getGemX(col);
    const y = this.getGemY(row);
    
    // 해당 위치에 이미 gem이 있으면 강제 제거
    if (this.gems[row] && this.gems[row][col]) {
      const existing = this.gems[row][col];
      
      // tweens 정리
      this.scene.tweens.killTweensOf(existing);
      
      // 기존 gem 제거
      existing.destroy();
      this.gems[row][col] = null;
    }
    
    // 새 gem 생성
    const gem = this.scene.add.sprite(x, y, type);
    gem.setDisplaySize(this.gemSize - GAME_CONFIG.GEM_SIZE_OFFSET, this.gemSize - GAME_CONFIG.GEM_SIZE_OFFSET);
    
    const baseTint = this.scene.baseTints[type] || 0xffffff;
    gem.setTint(baseTint);

    gem.setInteractive();
    gem.row = row;
    gem.col = col;
    gem.type = type;
    
    // 배열에 설정
    this.gems[row][col] = gem;
    
    // 설정 검증
    if (this.gems[row][col] !== gem) {
      gem.destroy();
      return null;
    }
    
    return gem;
  }

  /**
   * 빈칸 채우기 (gem이 떨어짐)
   * 배열 업데이트는 동기, 애니메이션은 비동기 (겹침 방지 & 시각효과 유지)
   */
  fillBoard() {
    // 이미 진행 중인 fillBoard를 방지하기 위한 플래그
    if (this._filling) {
      return 0;
    }
    this._filling = true;

    // Step 1: 진행 중인 tweens 정리 (특수 블록 유휴 애니메이션은 보호)
    const gems = this.gems;
    const specialBlockAnimations = new Map(); // 특수 블록의 animation 상태 저장
    
    gems.forEach(row => {
      row.forEach(gem => {
        if (gem) {
          // bomb/dog의 pulse 애니메이션 상태 저장
          if (gem.texture.key === 'bomb' || gem.texture.key === 'dog') {
            // 현재 active tween 정보 저장
            const activeTweens = this.scene.tweens.getTweensOf(gem);
            if (activeTweens.length > 0) {
              specialBlockAnimations.set(gem, activeTweens);
            }
          }
          
          // 모든 tween kill
          this.scene.tweens.killTweensOf(gem);
        }
      });
    });
    
    // 특수 블록의 pulse 애니메이션 복구
    specialBlockAnimations.forEach((tweens, gem) => {
      if (gem && gem.active !== false) {
        this.scene.addPulseTween(gem);
      }
    });

    // Step 2: 배열 정리 - null 슬롯 찾고 위에서 아래로 gem 이동 (동기)
    const animatingGems = []; // 애니메이션이 필요한 gem 수집
    
    for (let col = 0; col < this.boardSize.cols; col++) {
      let emptySlots = 0;
      
      for (let row = this.boardSize.rows - 1; row >= 0; row--) {
        const gem = gems[row][col];
        if (!gem || gem.active === false) {
          emptySlots++;
        } else if (emptySlots > 0) {
          const newRow = row + emptySlots;
          const distance = emptySlots;
          const targetY = this.getGemY(newRow);
          
          // 배열 업데이트 (동기화) - 하지만 gem.y는 현재 위치 유지!
          gems[newRow][col] = gem;
          gems[row][col] = null;
          gem.row = newRow;
          gem.col = col;
          // gem.y는 업데이트하지 않음! (현재 위치에서 출발)
          
          // 애니메이션 정보 수집 - 현재 위치에서 목표 위치로
          animatingGems.push({
            gem: gem,
            fromY: gem.y,      // 현재 위치에서 시작
            toY: targetY,      // 목표 위치로 끝남
            distance: distance
          });
        }
      }

      // Step 3: 빈 슬롯에 새로운 gem 생성 (동기)
      if (emptySlots > 0) {
        for (let row = 0; row < this.boardSize.rows && row < emptySlots; row++) {
          if (gems[row][col] === null) {
            const type = Phaser.Math.RND.pick(this.gemTypes);
            const gem = this.spawnGem(row, col, type);
            
            if (gem) {
              // 새로운 gem은 위에서 떨어져 내려오는 효과
              animatingGems.push({
                gem: gem,
                fromY: this.getGemY(-1), // 화면 위에서
                toY: gem.y,
                isNew: true,
                distance: row + 1
              });
            }
          }
        }
      }
    }

    // Step 4: 모든 gem에 대해 중력 애니메이션 추가
    animatingGems.forEach((animData, index) => {
      const { gem, fromY, toY, distance, isNew } = animData;
      
      // 떨어지는 거리에 따라 시간 결정 - 빠른 속도로 조정
      const duration = ANIMATION_CONFIG.GEM_FALL_BASE_DURATION + distance * ANIMATION_CONFIG.GEM_FALL_DISTANCE_MULTIPLIER;
      const delay = index * ANIMATION_CONFIG.GEM_FALL_DELAY;
      
      if (isNew) {
        // 새 gem: 위에서 아래로 떨어지며 튀기
        gem.y = fromY;
        this.scene.tweens.add({
          targets: gem,
          y: toY,
          duration: duration,
          delay: delay,
          ease: ANIMATION_CONFIG.GEM_FALL_EASE,
          onComplete: () => {
            // 튀기는 효과 - 올라갔다 내려옴 (빠른 버전)
            this.scene.tweens.add({
              targets: gem,
              y: toY - ANIMATION_CONFIG.GEM_BOUNCE_NEW_HEIGHT,
              duration: ANIMATION_CONFIG.GEM_BOUNCE_NEW_DURATION,
              yoyo: true,
              repeat: 1,
              ease: ANIMATION_CONFIG.GEM_BOUNCE_EASE,
              onComplete: () => {
                // 최종 위치 강제 설정
                gem.y = toY;
              }
            });
          }
        });
      } else {
        // 기존 gem: 목표 위치로 이동 후 튀기
        this.scene.tweens.add({
          targets: gem,
          y: toY,
          duration: duration,
          delay: delay,
          ease: ANIMATION_CONFIG.GEM_FALL_EASE,
          onComplete: () => {
            // 튀기는 효과 - 올라갔다 내려옴 (빠른 버전)
            this.scene.tweens.add({
              targets: gem,
              y: toY - ANIMATION_CONFIG.GEM_BOUNCE_EXISTING_HEIGHT,
              duration: ANIMATION_CONFIG.GEM_BOUNCE_EXISTING_DURATION,
              yoyo: true,
              repeat: 1,
              ease: ANIMATION_CONFIG.GEM_BOUNCE_EASE,
              onComplete: () => {
                // 최종 위치 강제 설정
                gem.y = toY;
              }
            });
          }
        });
      }
    });

    // Step 5: fillBoard 완료 후 겹침 체크 호출 (애니메이션이 충분히 진행된 후)
    const maxDuration = Math.max(
      200 + Math.max(...animatingGems.map(a => a.distance)) * 30,  // 빠른 속도 반영
      400
    ) + 100; // 더 짧은 여유 시간

    // setTimeout 대신 Phaser time.delayedCall 사용 — 씬 파괴 시 자동 정리됨
    this.scene.time.delayedCall(maxDuration, () => {
      // 모든 gem의 최종 위치 재정렬 (부동소수점 오류 보정)
      this.finalizePositions();

      if (this.scene && this.scene.checkBoardEmptySpaces) {
        this.scene.checkBoardEmptySpaces();
      }
      this._filling = false;
    });

    return 0;
  }

  /**
   * 모든 gem의 최종 위치 재정렬 (애니메이션 후 보정)
   * 부동소수점 오류나 애니메이션 부정확성을 보정
   */
  finalizePositions() {
    for (let row = 0; row < this.boardSize.rows; row++) {
      for (let col = 0; col < this.boardSize.cols; col++) {
        const gem = this.gems[row][col];
        if (gem && gem.active !== false) {
          const correctX = this.getGemX(col);
          const correctY = this.getGemY(row);
          
          // 위치 차이가 크면 강제 재설정
          if (Math.abs(gem.x - correctX) > 1 || Math.abs(gem.y - correctY) > 1) {
            gem.x = correctX;
            gem.y = correctY;
          }
          
          // 특수 블록의 유휴 애니메이션 복구 (pulse tween 보장)
          if ((gem.texture.key === 'bomb' || gem.texture.key === 'dog') && gem.active !== false) {
            const activeTweens = this.scene.tweens.getTweensOf(gem);
            
            // pulse tween이 없으면 복구 (fillBoard 후에는 보통 tween이 없으므로, 특수 블록이면 복구)
            if (activeTweens.length === 0) {
              this.scene.addPulseTween(gem);
            }
          }
        }
      }
    }
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
   * 물리적 좌표 기준 겹침 감지 (공유 로직)
   * fixOverlappingGems / checkBoardEmptySpaces 양쪽에서 사용
   */
  detectPhysicalOverlaps() {
    const physicalMap = new Map();
    for (let row = 0; row < this.boardSize.rows; row++) {
      for (let col = 0; col < this.boardSize.cols; col++) {
        const gem = this.gems[row][col];
        if (gem && gem.active) {
          const key = `${Math.round(gem.x)},${Math.round(gem.y)}`;
          if (!physicalMap.has(key)) physicalMap.set(key, []);
          physicalMap.get(key).push({ gem, row, col });
        }
      }
    }
    return physicalMap;
  }

  /**
   * 겹친 gem 감지 및 수정
   */
  fixOverlappingGems() {
    const positionMap = this.detectPhysicalOverlaps();

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
            duration: ANIMATION_CONFIG.GEM_SWAP_DURATION,
            ease: ANIMATION_CONFIG.GEM_SWAP_EASE
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
