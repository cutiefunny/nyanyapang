import Phaser from 'phaser';

// 이미지 에셋
import img1 from '../assets/1.png';
import img2 from '../assets/2.png';
import img3 from '../assets/3.png';
import img4 from '../assets/4.png';
import img5 from '../assets/5.png';
import img6 from '../assets/6.png';
import bombImg from '../assets/bomb.png';
import dogWalkImg from '../assets/dog_walk.png'; 
import backgroundImg from '../assets/background.jpg'; 

// 사운드 에셋
import soundOuch1 from '../assets/Ouch1.mp3';
import soundOuch2 from '../assets/Ouch2.mp3';
import bgm from '../assets/level1.mp3';
import bombSound from '../assets/Boom.wav';

// 매니저 임포트
import { BoardManager } from './BoardManager';
import { MatchChecker } from './MatchChecker';
import { ExplosionManager } from './ExplosionManager';
import { UIManager } from './UIManager';

export class AnipangScene extends Phaser.Scene {
  constructor() {
    super('AnipangScene');
    
    // 기본 설정
    this.gemSize = 0; 
    this.boardSize = { rows: 8, cols: 8 };
    this.selectedGem = null;
    this.isProcessing = false;
    this.comboCount = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    // 타이머
    this.timerStarted = false;
    this.timeLeft = 60;
    this._tickEvent = null;
    this._endTimer = null;

    // 점수
    this.score = 0;
    this.nextBonusThreshold = 10000;

    // 사운드
    this.soundEnabled = true;

    // 드래그
    this.draggingGem = null;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Gem 설정
    this.gemTypes = ['gem1', 'gem2', 'gem3', 'gem4', 'gem5', 'gem6'];
    
    this.particleColors = {
      'gem1': 0xff0000, 'gem2': 0x00ff00, 'gem3': 0x0000ff,
      'gem4': 0xffff00, 'gem5': 0x800080, 'gem6': 0x00ffff,
      'bomb': 0xff0000, 'dog': 0x8B4513
    };

    this.baseTints = {
      'gem1': 0xffffff, 'gem2': 0xffffff, 'gem3': 0xeeffee, 
      'gem4': 0xffffff, 'gem5': 0xffffff, 'gem6': 0xffffff,
      'bomb': 0xff0000, 'dog': 0xffffff
    };

    // 매니저들
    this.boardManager = null;
    this.matchChecker = null;
    this.explosionManager = null;
    this.uiManager = null;

    // 보드 체크 타이머
    this.boardCheckTimer = 0;
  }

  preload() {
    this.load.image('gem1', img1);
    this.load.image('gem2', img2);
    this.load.image('gem3', img3);
    this.load.image('gem4', img4);
    this.load.image('gem5', img5);
    this.load.image('gem6', img6);
    this.load.image('bomb', bombImg);
    this.load.image('background', backgroundImg);
    this.load.spritesheet('dog', dogWalkImg, { frameWidth: 100, frameHeight: 100 });
    this.load.audio('ouch1', soundOuch1);
    this.load.audio('ouch2', soundOuch2);
    this.load.audio('bgm', bgm);
    this.load.audio('bomb', bombSound);
  }

  create() {
    // 배경 이미지 설정
    const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'background').setName('background');
    const texW = bg.width;
    const texH = bg.height;
    const canvasW = this.scale.width;
    const canvasH = this.scale.height;
    const coverScale = Math.max(canvasW / texW, canvasH / texH);
    bg.setScale(coverScale).setPosition(canvasW / 2, canvasH / 2).setAlpha(0.2).setDepth(-1);

    // Gem 크기 계산
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const sizeBasedOnWidth = screenWidth / this.boardSize.cols;
    const sizeBasedOnHeight = screenHeight / this.boardSize.rows;
    this.gemSize = Math.floor(Math.min(sizeBasedOnWidth, sizeBasedOnHeight));
    this.offsetX = (screenWidth - this.boardSize.cols * this.gemSize) / 2 + this.gemSize / 2;
    this.offsetY = (screenHeight - this.boardSize.rows * this.gemSize) / 2 + this.gemSize / 2;

    // 애니메이션 설정
    if (!this.anims.exists('dog_walk_anim')) {
      this.anims.create({
        key: 'dog_walk_anim',
        frames: this.anims.generateFrameNumbers('dog', { start: 0, end: 1 }),
        frameRate: 8,
        repeat: -1
      });
    }

    // 파티클 설정
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('particle', 12, 12);
    this.particleManager = this.add.particles(0, 0, 'particle', {
      lifespan: 600,
      speed: { min: 150, max: 350 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false
    });

    // 매니저 초기화
    this.boardManager = new BoardManager(this, this.boardSize, this.gemTypes, this.gemSize);
    this.matchChecker = new MatchChecker(this.boardManager);
    this.explosionManager = new ExplosionManager(this, this.boardManager);
    this.uiManager = new UIManager(this);

    // 게임 보드 생성
    this.boardManager.createBoard();
    
    // BGM 재생
    this.sound.play('bgm', { loop: true, volume: 0.5 });
    
    // UI 버튼
    this.uiManager.createSoundToggleButton();
    
    // 이벤트
    this.input.on('gameobjectdown', this.onGemDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
  }

  update() {
    this.boardManager.fixOverlappingGems();
    
    // 5초마다 보드 상태 체크
    this.boardCheckTimer += this.game.loop.delta;
    if (this.boardCheckTimer >= 5000) {
      this.boardCheckTimer = 0;
      this.checkBoardEmptySpaces();
    }
  }

  /**
   * 스크린 리사이즈 처리
   */
  onResize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;
    this.cameras.main.setViewport(0, 0, width, height);
    
    const bg = this.children.getByName('background');
    if (bg) {
      const texW = bg.width;
      const texH = bg.height;
      const coverScale = Math.max(width / texW, height / texH);
      bg.setScale(coverScale).setPosition(width / 2, height / 2);
    }

    this.scene.restart();
  }

  /**
   * 사운드 재생
   */
  playMatchSound() {
    if (!this.soundEnabled) return;
    
    // 콤보 등급에 따라 음향 선택
    let soundKey;
    let baseVolume = 0.4;
    let detune = Phaser.Math.Between(-400, 400);
    
    if (this.comboCount >= 10) {
      // 높은 콤보: 다양한 음향
      soundKey = Phaser.Math.RND.pick(['ouch1', 'ouch2', 'ouch1', 'ouch2']);
      baseVolume = 0.6; // 더 크게
      detune = Phaser.Math.Between(-600, 600); // 더 넓은 음정 변화
    } else if (this.comboCount >= 5) {
      // 중간 콤보
      soundKey = Phaser.Math.RND.pick(['ouch1', 'ouch2']);
      baseVolume = 0.5;
      detune = Phaser.Math.Between(-400, 400);
    } else {
      // 낮은 콤보: 기본 음향
      soundKey = Phaser.Math.RND.pick(['ouch1', 'ouch2']);
      baseVolume = 0.4;
      detune = Phaser.Math.Between(-200, 200); // 더 좁은 범위
    }
    
    this.sound.play(soundKey, { detune: detune, volume: baseVolume });
  }

  /**
   * 폭발 이펙트 생성
   */
  createExplosionEffect(gem) {
    const type = gem.texture.key;
    const particleColor = this.particleColors[type] || 0xffffff;
    const particleCount = 10 + (this.comboCount * 5);
    this.particleManager.emitParticleAt(gem.x, gem.y, particleCount);
    this.particleManager.setParticleTint(particleColor);
  }

  /**
   * 점수 추가
   */
  addScore(points) {
    this.score += points;
    if (this.game && this.game.events) {
      this.game.events.emit('addScore', points);
    }

    if (this.score >= this.nextBonusThreshold) {
      this.uiManager.grantTimeBonus();
      this.nextBonusThreshold += 10000;
    }
  }

  /**
   * Gem 크기 복원
   */
  restoreGemSize(gem) {
    if (gem.texture.key === 'bomb' || gem.texture.key === 'dog') {
      gem.setDisplaySize(this.gemSize * 1.2, this.gemSize * 1.2);
    } else {
      gem.setDisplaySize(this.gemSize - 2, this.gemSize - 2);
    }
  }

  /**
   * Gem 색상 복원
   */
  restoreGemTint(gem) {
    const type = gem.texture.key;
    const baseTint = this.baseTints[type] || 0xffffff;
    gem.setTint(baseTint);
  }

  /**
   * Gem 다운 이벤트
   */
  onGemDown(pointer, gem) {
    if (this.isProcessing) return;

    if (!this.timerStarted) {
      this.startCountdown();
    }

    this.draggingGem = gem;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
  }

  /**
   * 카운트다운 시작
   */
  startCountdown() {
    if (this.timerStarted) return;
    this.timerStarted = true;
    this.timeLeft = 60;

    this._tickEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timeLeft -= 1;
        if (this.timeLeft < 0) this.timeLeft = 0;
        if (this.game && this.game.events) this.game.events.emit('tick', this.timeLeft);
        
        // 시간이 0이 되면 게임 종료
        if (this.timeLeft <= 0) {
          this.endGame();
        }
      }
    });
  }

  /**
   * 게임 종료
   */
  endGame() {
    this.isProcessing = true;
    this.input.enabled = false;
    this.tweens.killAll();
    if (this._tickEvent) this._tickEvent.remove(false);
    if (this._endTimer) this._endTimer.remove(false);
    if (this.game && this.game.events) this.game.events.emit('gameOver');
  }

  /**
   * 포인터 이동
   */
  onPointerMove(pointer) {
    if (this.isProcessing || !this.draggingGem) return;

    const dist = Phaser.Math.Distance.Between(this.dragStartX, this.dragStartY, pointer.x, pointer.y);
    const sensitivity = Math.max(20, this.gemSize * 0.4);

    if (dist > sensitivity) {
      const angle = Phaser.Math.Angle.Between(this.dragStartX, this.dragStartY, pointer.x, pointer.y);
      const direction = this.getDirectionFromAngle(angle);
      
      let targetRow = this.draggingGem.row;
      let targetCol = this.draggingGem.col;

      if (direction === 'LEFT') targetCol--;
      else if (direction === 'RIGHT') targetCol++;
      else if (direction === 'UP') targetRow--;
      else if (direction === 'DOWN') targetRow++;

      if (this.boardManager.isValidSlot(targetRow, targetCol)) {
        const targetGem = this.boardManager.gems[targetRow][targetCol];
        if (targetGem) {
          if (this.selectedGem) {
            this.restoreGemTint(this.selectedGem);
            this.restoreGemSize(this.selectedGem);
            this.selectedGem = null;
          }
          this.swapGems(this.draggingGem, targetGem);
          this.draggingGem = null;
        }
      }
    }
  }

  /**
   * 포인터 업
   */
  onPointerUp(pointer) {
    if (this.draggingGem && !this.isProcessing) {
        this.handleGemClick(this.draggingGem);
    }
    this.draggingGem = null;
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
    if (gem.texture.key === 'bomb') {
      this.explosionManager.explodeBomb(gem);
      return;
    }
    if (gem.texture.key === 'dog') {
      this.explosionManager.activateDog(gem);
      return;
    }

    if (!this.selectedGem) {
      this.selectedGem = gem;
      gem.setTint(0x888888);
      this.tweens.add({ targets: gem, scaleX: 1.1, scaleY: 1.1, duration: 100 });
    } else {
      if (this.selectedGem === gem) {
        this.restoreGemTint(this.selectedGem);
        this.restoreGemSize(this.selectedGem);
        this.selectedGem = null;
        return;
      }

      if (this.areAdjacent(this.selectedGem, gem)) {
        this.restoreGemTint(this.selectedGem);
        this.restoreGemSize(this.selectedGem);
        this.swapGems(this.selectedGem, gem);
        this.selectedGem = null;
      } else {
        this.restoreGemTint(this.selectedGem);
        this.restoreGemSize(this.selectedGem);
        this.selectedGem = gem;
        gem.setTint(0x888888);
        this.tweens.add({ targets: gem, scaleX: 1.1, scaleY: 1.1, duration: 100 });
      }
    }
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
    // 선택된 gem이 유효한지 검증
    if (!gem1 || !gem2 || gem1.active === false || gem2.active === false) {
      console.warn('[swapGems] 유효하지 않은 gem 선택 (이미 삭제됨?)');
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    this.comboCount = 0;

    const gem1OriginalRow = gem1.row;
    const gem1OriginalCol = gem1.col;
    const gem2OriginalRow = gem2.row;
    const gem2OriginalCol = gem2.col;
    const gems = this.boardManager.gems;

    gems[gem1.row][gem1.col] = gem2;
    gems[gem2.row][gem2.col] = gem1;

    gem1.row = gem2OriginalRow;
    gem1.col = gem2OriginalCol;
    gem2.row = gem1OriginalRow;
    gem2.col = gem1OriginalCol;

    this.tweens.add({
      targets: [gem1, gem2],
      x: (target) => this.boardManager.getGemX(target.col),
      y: (target) => this.boardManager.getGemY(target.row),
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        // 애니메이션 완료 후 gem이 여전히 유효한지 확인
        if (!gem1 || !gem2 || gem1.active === false || gem2.active === false) {
          this.isProcessing = false;
          return;
        }

        const matches = this.matchChecker.checkMatches();
        if (matches.length > 0) {
          this.handleMatches();
        } else {
          this.swapGemsReverse(gem1, gem2, gem1OriginalRow, gem1OriginalCol, gem2OriginalRow, gem2OriginalCol);
        }
      }
    });
  }

  /**
   * Gem 스왑 역순 (실패 시)
   */
  swapGemsReverse(gem1, gem2, gem1OrigRow, gem1OrigCol, gem2OrigRow, gem2OrigCol) {
    const gems = this.boardManager.gems;
    gems[gem1OrigRow][gem1OrigCol] = gem1;
    gems[gem2OrigRow][gem2OrigCol] = gem2;

    gem1.row = gem1OrigRow;
    gem1.col = gem1OrigCol;
    gem2.row = gem2OrigRow;
    gem2.col = gem2OrigCol;

    this.tweens.add({
      targets: [gem1, gem2],
      x: (target) => this.boardManager.getGemX(target.col),
      y: (target) => this.boardManager.getGemY(target.row),
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.isProcessing = false;
      }
    });
  }

  /**
   * 매칭 처리
   */
  handleMatches() {
    const matches = this.matchChecker.checkMatches();
    if (matches.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.comboCount++;
    const score = matches.length * 100 * this.comboCount;
    this.addScore(score);

    let centerX = 0, centerY = 0;
    matches.forEach(gem => {
      centerX += gem.x;
      centerY += gem.y;
      this.playMatchSound();
      this.createExplosionEffect(gem);
      if (gem.active) {
        this.boardManager.gems[gem.row][gem.col] = null;
        gem.destroy();
      }
    });

    if (matches.length > 0) {
      this.uiManager.showComboText(centerX / matches.length, centerY / matches.length, this.comboCount);
    }

    if (this.comboCount >= 3) {
      this.explosionManager.createBomb();
    } else if (this.comboCount === 2) {
      this.explosionManager.createDog();
    }

    if (this.comboCount >= 4) {
      this.cameras.main.flash(200, 255, 255, 255);
    }

    this.isProcessing = false;
    this.time.delayedCall(200, () => {
      const maxDuration = this.boardManager.fillBoard();
      this.time.delayedCall(maxDuration + 150, () => {
        this.handleMatchesAfterExplosion();
      });
    });
  }

  /**
   * 폭발 후 매칭 처리
   */
  handleMatchesAfterExplosion() {
    if (this.matchChecker.checkMatches().length > 0) {
      this.handleMatches();
    } else {
      if (this.boardManager.enforceNoEmptySlots()) {
        this.time.delayedCall(500, () => {
          if (this.matchChecker.checkMatches().length > 0) {
            this.handleMatches();
          }
        });
      }
    }
  }

  /**
   * 콤보 텍스트 표시
   */
  showComboText(x, y, textOrCount) {
    this.uiManager.showComboText(x, y, textOrCount);
  }

  /**
   * 보드 상태 체크: 빈공간 + 겹친 gem (10초마다 실행)
   * 겹친 gem이 발견되면 depth가 낮은 gem을 삭제
   * 빈공간은 박스로 시각화하여 디버깅
   */
  checkBoardEmptySpaces() {
    // 애니메이션 진행 중이면 체크 스킵 (경합 방지)
    if (this.boardManager._filling) {
      return;
    }

    const emptySpaces = [];
    const gemPositions = new Map(); // gem object → [positions]
    
    // 1단계: 배열 스캔 - 빈공간 수집 & 중복 감지
    for (let row = 0; row < this.boardSize.rows; row++) {
      for (let col = 0; col < this.boardSize.cols; col++) {
        const gem = this.boardManager.gems[row][col];
        
        if (!gem || gem.active === false) {
          emptySpaces.push({ row, col });
        } else {
          // 같은 gem이 여러 위치에 있는지 추적
          const positions = gemPositions.get(gem) || [];
          positions.push({ row, col });
          gemPositions.set(gem, positions);
        }
      }
    }

    // 2단계: 배열 중복 제거 (같은 gem이 여러 위치에 있으면 첫 위치만 유지)
    let dupCount = 0;
    gemPositions.forEach((positions, gem) => {
      if (positions.length > 1) {
        dupCount++;
        // 첫 위치만 유지하고 나머지는 null
        for (let i = 1; i < positions.length; i++) {
          const { row, col } = positions[i];
          this.boardManager.gems[row][col] = null;
          emptySpaces.push({ row, col });
        }
        if (dupCount === 1) { // 처음 중복 발견시만 로그
          console.error(`[Array Dedup] ${dupCount}개 gem 중복 발견, 정리 완료`);
        }
      }
    });

    // 3단계: 물리적 좌표 겹침 체크 (추가 안전장치)
    const physicalMap = new Map(); // "x,y" → gem list
    for (let row = 0; row < this.boardSize.rows; row++) {
      for (let col = 0; col < this.boardSize.cols; col++) {
        const gem = this.boardManager.gems[row][col];
        if (gem && gem.active !== false) {
          const key = `${Math.round(gem.x)},${Math.round(gem.y)}`;
          if (!physicalMap.has(key)) {
            physicalMap.set(key, []);
          }
          physicalMap.get(key).push({ gem, row, col });
        }
      }
    }

    // 겹친 gem 제거 (진행 중인 애니메이션 먼저 정리)
    physicalMap.forEach((gemList, key) => {
      if (gemList.length > 1) {
        console.warn(`[Overlap] ${key}에 ${gemList.length}개 gems 겹침, 정리 중`);
        // depth가 낮은 gem부터 정렬
        gemList.sort((a, b) => (a.gem.depth || 0) - (b.gem.depth || 0));
        
        // 첫 번째 제외 나머지 삭제
        for (let i = 1; i < gemList.length; i++) {
          const { gem, row, col } = gemList[i];
          
          // 진행 중인 tweens 정리
          this.tweens.killTweensOf(gem);
          
          // 배열에서 제거
          this.boardManager.gems[row][col] = null;
          
          // gem 삭제
          gem.destroy();
          
          // 빈공간 추가
          emptySpaces.push({ row, col });
        }
      }
    });

    // 4단계: 빈공간 체우기
    if (emptySpaces.length > 0) {
      this.boardManager.fillBoard();
    }
  }

  /**
   * Pulse 트윈 추가
   */
  addPulseTween(target) {
    this.tweens.add({
      targets: target,
      scaleX: '*=1.1',
      scaleY: '*=1.1',
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * 씬 종료 시 정리
   */
  shutdown() {
    // 모든 타이머 정리
    if (this._tickEvent) {
      this._tickEvent.remove();
      this._tickEvent = null;
    }
    if (this._endTimer) {
      this._endTimer.remove();
      this._endTimer = null;
    }
    if (this.boardCheckTimer) {
      this.time.removeEvent(this.boardCheckTimer);
      this.boardCheckTimer = null;
    }

    // 모든 tweens 정리
    this.tweens.killAll();

    // 모든 사운드 정지
    if (this.sound) {
      this.sound.stopAll();
      this.sound.unlock();
    }

    // 매니저 정리
    if (this.boardManager && this.boardManager.gems) {
      this.boardManager.gems.forEach(row => {
        row.forEach(gem => {
          if (gem && gem.destroy) {
            gem.destroy();
          }
        });
      });
    }

    // 파티클 정리
    if (this.particleManager) {
      this.particleManager.emitParticleAt(0, 0, 1);
    }
  }
}

