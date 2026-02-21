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
import bossImg from '../assets/boss1.png';
import wawaImg from '../assets/wawa.png';

// 사운드 에셋
import soundOuch1 from '../assets/Ouch1.mp3';
import soundOuch2 from '../assets/Ouch2.mp3';
import bgm from '../assets/level1.mp3';
import bgmBoss from '../assets/level4.mp3';
import bombSound from '../assets/Boom.wav';
import hitSound1 from '../assets/Hit1.wav';
import hitSound2 from '../assets/Hit2.wav';
import hitSound3 from '../assets/Hit3.wav';

// 매니저 임포트
import { BoardManager } from './BoardManager';
import { MatchChecker } from './MatchChecker';
import { ExplosionManager } from './ExplosionManager';
import { UIManager } from './UIManager';
import { GAME_CONFIG, COMBO_CONFIG, SCORE_CONFIG, ANIMATION_CONFIG, SOUND_CONFIG, DRAG_CONFIG, BOARD_CHECK_CONFIG, FEVER_CONFIG, BOSS_CONFIG } from './GameConstants';

export class AnipangScene extends Phaser.Scene {
  constructor() {
    super('AnipangScene');
    
    // 기본 설정
    this.gemSize = 0; 
    this.boardSize = { rows: 8, cols: 8 };
    this.selectedGem = null;
    this.isProcessing = false;
    this.processingStartTime = 0; // isProcessing 타임아웃 추적
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
    this.nextBonusThreshold = SCORE_CONFIG.BONUS_THRESHOLD;

    // 사운드
    this.soundEnabled = true;

    // 드래그
    this.draggingGem = null;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Gem 설정
    this.gemTypes = GAME_CONFIG.GEM_TYPES;
    
    this.particleColors = {
      'gem1': 0xff0000, 'gem2': 0x00ff00, 'gem3': 0x0000ff,
      'gem4': 0xffff00, 'gem5': 0x800080, 'gem6': 0x00ffff,
      'bomb': 0xff0000, 'dog': 0x8B4513
    };

    this.baseTints = {
      'gem1': 0xffffff, 'gem2': 0xffffff, 'gem3': 0xffffff, 
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

    // 피버타임
    this.feverTimeActive = false;
    this.feverTimeEvent = null;

    // 보스전
    this.bossMode = false;
    this.bossActive = false;
    this.bossRound = 0;
    this.bossHitsRemaining = 0;
    this.bossHitsRemaining_current = 0;
    this.boss = null;
    this.bossOverlay = null;
    this.nextBossScoreThreshold = BOSS_CONFIG.SPAWN_SCORE_THRESHOLD;
    this.bossHitsText = null;
    this.bossDamage = 0;
    
    // 보스 AI
    this.bossAttackTimer = 0;
    this.bossMovementTimer = 0;
    this.bossTargetX = 0;
    this.bossTargetY = 0;
    this.bossMoveVelocityX = 0;
    this.bossMoveVelocityY = 0;
    // Dev mode UI helpers
    this.devMode = false;
    this.devUIElements = [];
  }

  /**
   * Toggle dev UI buttons (Fever / Boss)
   */
  toggleDevUI() {
    // if already visible, destroy
    if (this.devUIElements && this.devUIElements.length > 0) {
      this.devUIElements.forEach(e => { try { if (e && e.destroy) e.destroy(); } catch (err) {} });
      this.devUIElements = [];
      return;
    }

    const width = this.scale.width;
    const padding = 12;
    const btnW = 140;
    const btnH = 36;
    const centerY = 24;

    const leftX = width / 2 - btnW - padding;
    const rightX = width / 2 + padding;

    const feverBtn = this.add.rectangle(leftX + btnW / 2, centerY, btnW, btnH, 0x333333, 0.9)
      .setOrigin(0.5)
      .setDepth(2000);
    const feverText = this.add.text(leftX + btnW / 2, centerY, 'FEVER', { fontSize: '16px', fill: '#ffdd55', fontFamily: 'Arial' })
      .setOrigin(0.5)
      .setDepth(2001);
    const feverZone = this.add.zone(leftX + btnW / 2, centerY, btnW, btnH).setOrigin(0.5).setInteractive().setDepth(2002);
    feverZone.on('pointerdown', () => {
      try {
        this.activateFeverTime();
      } catch (e) {}
      this.toggleDevUI();
    });

    const bossBtn = this.add.rectangle(rightX + btnW / 2, centerY, btnW, btnH, 0x333333, 0.9)
      .setOrigin(0.5)
      .setDepth(2000);
    const bossText = this.add.text(rightX + btnW / 2, centerY, 'BOSS', { fontSize: '16px', fill: '#ff7788', fontFamily: 'Arial' })
      .setOrigin(0.5)
      .setDepth(2001);
    const bossZone = this.add.zone(rightX + btnW / 2, centerY, btnW, btnH).setOrigin(0.5).setInteractive().setDepth(2002);
    bossZone.on('pointerdown', () => {
      try {
        this.startBossMode();
      } catch (e) {}
      this.toggleDevUI();
    });

    // store elements for cleanup
    this.devUIElements = [feverBtn, feverText, feverZone, bossBtn, bossText, bossZone];
  }

  // Assets are preloaded by PreloaderScene. Keep preload empty to avoid duplicate loads.
  preload() {}

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
    this.sound.play('bgm', { loop: true, volume: SOUND_CONFIG.BGM_VOLUME });
    
    // UI 버튼
    this.uiManager.createSoundToggleButton();
    
    // 이벤트
    this.input.on('gameobjectdown', this.onGemDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    // Dev mode: show quick action buttons when Shift+D pressed
    try {
      this.input.keyboard.on('keydown', (event) => {
        try {
          if ((event.key === 'D' || event.code === 'KeyD') && event.shiftKey) {
            this.toggleDevUI();
          }
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // some environments may not support keyboard input here
    }
  }

  update() {
    // isProcessing 타임아웃 체크 (5초 이상 true면 강제 복구 - 무한 대기 방지)
    if (this.isProcessing) {
      if (this.processingStartTime === 0) {
        this.processingStartTime = Date.now();
      }
      const elapsedTime = Date.now() - this.processingStartTime;
      if (elapsedTime > 5000) {
        console.warn('[경고] isProcessing이 5초 이상 유지됨. 강제 복구합니다.');
        this.isProcessing = false;
        this.processingStartTime = 0;
        this.draggingGem = null;
      }
    } else {
      this.processingStartTime = 0;
    }

    // 겹친 gem 감지 및 수정 (매 프레임)
    this.boardManager.fixOverlappingGems();
    
    // 정기적 보드 체크: 빈칸 + 중복 gem 감지
    this.boardCheckTimer += this.game.loop.delta;
    if (this.boardCheckTimer >= BOARD_CHECK_CONFIG.CHECK_INTERVAL) {
      this.boardCheckTimer = 0;
      this.checkBoardEmptySpaces();
    }

    // 보스 AI 업데이트
    if (this.bossMode && this.bossActive && this.boss) {
      this.updateBossAI();
    }
  }

  /**
   * 보스 AI 업데이트
   */
  updateBossAI() {
    if (!this.boss || !this.boss.active) return;

    const deltaTime = this.game.loop.delta;

    // 보스 이동 업데이트
    this.boss.x += this.bossMoveVelocityX * (deltaTime / 1000);
    this.boss.y += this.bossMoveVelocityY * (deltaTime / 1000);

    // 화면 경계 체크. direction change only every interval; otherwise clamp position.
    const padding = 150;
    const widthLimit = this.scale.width - padding;
    const heightLimit = this.scale.height - padding * 2;
    const canChangeDirection = this.bossMovementTimer >= BOSS_CONFIG.MOVE_CHANGE_INTERVAL;
    let directionChangedThisFrame = false;
    const tryChangeDirection = () => {
      if (canChangeDirection && !directionChangedThisFrame) {
        this.setNewBossMoveTarget();
        directionChangedThisFrame = true;
      }
    };

    if (this.boss.x < padding) {
      this.boss.x = padding;
      tryChangeDirection();
    } else if (this.boss.x > widthLimit) {
      this.boss.x = widthLimit;
      tryChangeDirection();
    }
    if (this.boss.y < padding) {
      this.boss.y = padding;
      tryChangeDirection();
    } else if (this.boss.y > heightLimit) {
      this.boss.y = heightLimit;
      tryChangeDirection();
    }

    // 목표 도달 확인
    const distToTarget = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.bossTargetX, this.bossTargetY);
    if (distToTarget < BOSS_CONFIG.MIN_MOVE_DISTANCE) {
      tryChangeDirection();
    }

    // 이동 방향 변경 타이머
    this.bossMovementTimer += deltaTime;
    if (this.bossMovementTimer >= BOSS_CONFIG.MOVE_CHANGE_INTERVAL) {
      this.bossMovementTimer = 0;
      if (!directionChangedThisFrame) {
        this.setNewBossMoveTarget();
      }
    }

    // 공격 타이머
    this.bossAttackTimer += deltaTime;
    if (this.bossAttackTimer >= BOSS_CONFIG.ATTACK_INTERVAL) {
      this.bossAttackTimer = 0;
      this.performBossAttack();
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
    let baseVolume;
    let detune;
    
    if (this.comboCount >= 10) {
      soundKey = Phaser.Math.RND.pick(['ouch1', 'ouch2', 'ouch1', 'ouch2']);
      baseVolume = SOUND_CONFIG.SOUND_VOLUME_COMBO10;
      detune = Phaser.Math.Between(-SOUND_CONFIG.SOUND_DETUNE_COMBO10, SOUND_CONFIG.SOUND_DETUNE_COMBO10);
    } else if (this.comboCount >= 5) {
      soundKey = Phaser.Math.RND.pick(['ouch1', 'ouch2']);
      baseVolume = SOUND_CONFIG.SOUND_VOLUME_COMBO5;
      detune = Phaser.Math.Between(-SOUND_CONFIG.SOUND_DETUNE_COMBO5, SOUND_CONFIG.SOUND_DETUNE_COMBO5);
    } else {
      soundKey = Phaser.Math.RND.pick(['ouch1', 'ouch2']);
      baseVolume = SOUND_CONFIG.SOUND_VOLUME_BASE;
      detune = Phaser.Math.Between(-SOUND_CONFIG.SOUND_DETUNE_BASE, SOUND_CONFIG.SOUND_DETUNE_BASE);
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
      this.nextBonusThreshold += SCORE_CONFIG.BONUS_THRESHOLD;
    }

    // 보스전 시작 점수 체크 (배수마다 반복)
    if (this.score >= this.nextBossScoreThreshold) {
      this.nextBossScoreThreshold += BOSS_CONFIG.SPAWN_SCORE_THRESHOLD;
      this.startBossMode();
    }
  }

  /**
   * Gem 크기 복원
   * 주의: SPECIAL_GEM_SCALE=1.0 유지 (누적 스케일링 버그 회피)
   */
  restoreGemSize(gem) {
    if (gem.texture.key === 'bomb' || gem.texture.key === 'dog') {
      gem.setDisplaySize(this.gemSize * GAME_CONFIG.SPECIAL_GEM_SCALE, this.gemSize * GAME_CONFIG.SPECIAL_GEM_SCALE);
    } else {
      gem.setDisplaySize(this.gemSize - GAME_CONFIG.GEM_SIZE_OFFSET, this.gemSize - GAME_CONFIG.GEM_SIZE_OFFSET);
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
    if (this.bossMode || this.isProcessing || !gem || !gem.active || !gem.texture) return;

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
    this.timeLeft = GAME_CONFIG.INITIAL_TIME;

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

    // 입력 비활성화 (게임 오버 후)
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
    if (this.bossMode || this.isProcessing || !this.draggingGem) return;

    // draggingGem이 여전히 유효한지 검증
    if (!this.draggingGem.active || !this.draggingGem.texture) {
      this.draggingGem = null;
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.dragStartX, this.dragStartY, pointer.x, pointer.y);
    const sensitivity = Math.max(DRAG_CONFIG.DRAG_MIN_DISTANCE, this.gemSize * DRAG_CONFIG.DRAG_BASE_SENSITIVITY);

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
        if (targetGem && targetGem.active && targetGem.texture) {
          if (this.selectedGem) {
            this.restoreGemTint(this.selectedGem);
            this.restoreGemSize(this.selectedGem);
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
    if (this.bossMode) return;
    
    const draggingGem = this.draggingGem;
    this.draggingGem = null;
    
    if (draggingGem && !this.isProcessing && draggingGem.active && draggingGem.texture) {
      try {
        this.handleGemClick(draggingGem);
      } catch (e) {
        console.error('[Error] onPointerUp 처리 중 예외:', e);
        this.isProcessing = false;
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
    if (this.feverTimeActive) {
      this.explosionManager.explodeBomb(gem);
      return;
    }

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
      gem.setTint(ANIMATION_CONFIG.GEM_SELECT_TINT);
      this.tweens.add({ targets: gem, scaleX: ANIMATION_CONFIG.GEM_SELECT_SCALE, scaleY: ANIMATION_CONFIG.GEM_SELECT_SCALE, duration: ANIMATION_CONFIG.GEM_SELECT_DURATION });
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
        gem.setTint(ANIMATION_CONFIG.GEM_SELECT_TINT);
        this.tweens.add({ targets: gem, scaleX: ANIMATION_CONFIG.GEM_SELECT_SCALE, scaleY: ANIMATION_CONFIG.GEM_SELECT_SCALE, duration: ANIMATION_CONFIG.GEM_SELECT_DURATION });
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
    if (!gem1 || !gem2 || gem1.active === false || gem2.active === false || 
        !gem1.texture || !gem2.texture) {
      this.isProcessing = false;
      return;
    }

    // 이미 처리 중이면 중복 호출 방지
    if (this.isProcessing) {
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

    try {
      this.tweens.add({
        targets: [gem1, gem2],
        x: (target) => this.boardManager.getGemX(target.col),
        y: (target) => this.boardManager.getGemY(target.row),
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          try {
            // 애니메이션 완료 후 gem이 여전히 유효한지 확인
            if (!gem1 || !gem2 || gem1.active === false || gem2.active === false || 
                !gem1.texture || !gem2.texture) {
              this.isProcessing = false;
              return;
            }

            const matches = this.matchChecker.checkMatches();
            if (matches.length > 0) {
              this.handleMatches();
            } else {
              this.swapGemsReverse(gem1, gem2, gem1OriginalRow, gem1OriginalCol, gem2OriginalRow, gem2OriginalCol);
            }
          } catch (e) {
            console.error('[Error] swapGems onComplete 처리 중 예외:', e);
            this.isProcessing = false;
          }
        }
      });
    } catch (e) {
      console.error('[Error] swapGems tween 생성 중 예외:', e);
      this.isProcessing = false;
    }
  }

  /**
   * Gem 스왑 역순 (실패 시)
   */
  swapGemsReverse(gem1, gem2, gem1OrigRow, gem1OrigCol, gem2OrigRow, gem2OrigCol) {
    try {
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
        duration: ANIMATION_CONFIG.GEM_SWAP_DURATION,
        ease: ANIMATION_CONFIG.GEM_SWAP_EASE,
        onComplete: () => {
          this.isProcessing = false;
        }
      });
    } catch (e) {
      console.error('[Error] swapGemsReverse 중 예외:', e);
      this.isProcessing = false;
    }
  }

  /**
   * 매칭 처리
   */
  handleMatches() {
    try {
      const matches = this.matchChecker.checkMatches();
      if (matches.length === 0) {
        this.isProcessing = false;
        return;
      }

      this.comboCount++;
      const score = matches.length * SCORE_CONFIG.MATCH_BASE * this.comboCount;
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

      if (this.comboCount >= COMBO_CONFIG.BOMB_THRESHOLD) {
        this.explosionManager.createBomb();
      } else if (this.comboCount === COMBO_CONFIG.DOG_THRESHOLD) {
        this.explosionManager.createDog();
      }

      if (this.comboCount >= COMBO_CONFIG.FLASH_THRESHOLD) {
        this.cameras.main.flash(200, 255, 255, 255);
      }

      this.isProcessing = false;
      this.time.delayedCall(200, () => {
        try {
          const maxDuration = this.boardManager.fillBoard();
          this.time.delayedCall(maxDuration + 150, () => {
            try {
              // 보드의 반이 비워졌는지 체크
              if (this.isBoardHalfEmpty()) {
                this.activateFeverTime();
              } else {
                this.handleMatchesAfterExplosion();
              }
            } catch (e) {
              console.error('[Error] handleMatches delayedCall 중 예외:', e);
              this.isProcessing = false;
            }
          });
        } catch (e) {
          console.error('[Error] handleMatches fillBoard 중 예외:', e);
          this.isProcessing = false;
        }
      });
    } catch (e) {
      console.error('[Error] handleMatches 중 예외:', e);
      this.isProcessing = false;
    }
  }

  /**
   * 폭발 후 매칭 처리
   */
  handleMatchesAfterExplosion() {
    try {
      if (this.matchChecker.checkMatches().length > 0) {
        this.handleMatches();
      } else {
        if (this.boardManager.enforceNoEmptySlots()) {
          this.time.delayedCall(500, () => {
            try {
              if (this.matchChecker.checkMatches().length > 0) {
                this.handleMatches();
              } else {
                // 피버타임 상태면 새로운 블록들에 tween 적용
                this.applyFeverTweenToNewGems();
              }
            } catch (e) {
              console.error('[Error] handleMatchesAfterExplosion delayedCall 중 예외:', e);
              this.isProcessing = false;
            }
          });
        } else {
          // 피버타임 상태면 새로운 블록들에 tween 적용
          this.applyFeverTweenToNewGems();
        }
      }
    } catch (e) {
      console.error('[Error] handleMatchesAfterExplosion 중 예외:', e);
      this.isProcessing = false;
    }
  }

  /**
   * 보드에 남은 gems 개수 확인 (반 이상 터졌는지 확인)
   * 피버타임 발동 조건: 전체 64칸 중 32칸 이상이 비어있음 (gems의 반 이상 터짐)
   */
  isBoardHalfEmpty() {
    let gemCount = 0;
    const totalSlots = this.boardSize.rows * this.boardSize.cols; // 64

    for (let row = 0; row < this.boardSize.rows; row++) {
      for (let col = 0; col < this.boardSize.cols; col++) {
        const gem = this.boardManager.gems[row][col];
        // null이거나 active가 false면 비어있다고 간주
        if (gem && gem.active !== false && gem.texture.key !== 'bomb' && gem.texture.key !== 'dog') {
          gemCount++;
        }
      }
    }

    console.log(`[피버] gem 비율: ${gemCount}/${totalSlots} (${(gemCount / totalSlots * 100).toFixed(1)}%), 한계: ${FEVER_CONFIG.REMAINING_GEM_THRESHOLD}`);

    // gems이 3개 이하로 줄어들면 피버타임 발동
    return gemCount <= FEVER_CONFIG.REMAINING_GEM_THRESHOLD;
  }

  /**
   * 보드가 비어있는지 확인 (기존 로직)
   */
  isBoardEmpty() {
    for (let row = 0; row < this.boardSize.rows; row++) {
      for (let col = 0; col < this.boardSize.cols; col++) {
        const gem = this.boardManager.gems[row][col];
        if (gem && gem.active && gem.texture.key !== 'bomb' && gem.texture.key !== 'dog') {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 피버타임 활성화 (모든 블록 터짐)
   */
  activateFeverTime() {
    console.log('[피버] 피버타임 발동!');
    if (this.feverTimeActive) {
      console.log('[피버] 이미 발동 중, 중복 바방 처리');
      return;
    }
    this.feverTimeActive = true;

    // "Fever Time!!" 텍스트 표시
    this.uiManager.showFeverTimeText();

    // 모든 블록에 빨간색 틴트 반짝이 효과
    this.applyFeverTweenToNewGems();

    // 10초 후 피버타임 종료
    this.feverTimeEvent = this.time.delayedCall(FEVER_CONFIG.DURATION, () => {
      this.endFeverTime();
    });
    
    // 빰버타임은 단순히 대기 중이브로 기능
    this.isProcessing = false;
  }

  /**
   * 피버타임에 새로 생성된 블록들에 틴트 반짝이 효과 적용
   */
  applyFeverTweenToNewGems() {
    if (!this.feverTimeActive) return;
    
    for (let row = 0; row < this.boardSize.rows; row++) {
      for (let col = 0; col < this.boardSize.cols; col++) {
        const gem = this.boardManager.gems[row][col];
        if (gem && gem.active) {
          // 특수블록(폭탄, 개)은 반짝임 효과 제외
          if (gem.texture.key === 'bomb' || gem.texture.key === 'dog') {
            continue;
          }
          
          // 이미 tween이 있으면 스킵
          const tweens = this.tweens.getTweensOf(gem);
          const hasSparkle = tweens.some(t => t.targets.includes(gem) && t.data.some(d => d.key === 'tint'));
          
          if (!hasSparkle) {
            this.tweens.add({
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
   * 피버타임 종료
   */
  endFeverTime() {
    this.feverTimeActive = false;

    // "Cool Down!" 텍스트 표시
    this.uiManager.showCoolDownText();

    // 모든 블록의 반짝이 애니메이션 정지 및 tint 복구
    for (let row = 0; row < this.boardSize.rows; row++) {
      for (let col = 0; col < this.boardSize.cols; col++) {
        const gem = this.boardManager.gems[row][col];
        if (gem && gem.active && gem.texture.key !== 'bomb' && gem.texture.key !== 'dog') {
          this.tweens.killTweensOf(gem);
          gem.tint = 0xffffff;
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * 콤보 텍스트 표시
   */
  showComboText(x, y, textOrCount) {
    this.uiManager.showComboText(x, y, textOrCount);
  }

  /**
   * 보스전 시작
   */
  startBossMode() {
    console.log('[보스] 보스전 시작!');
    this.bossMode = true;
    this.bossActive = true;
    this.bossRound = 1;

    // BGM 변경
    this.sound.stopByKey('bgm');
    this.sound.play('bgm_boss', { loop: true, volume: SOUND_CONFIG.BGM_VOLUME });

    // 화면 어두워지는 오버레이 생성
    this.bossOverlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0
    );
    this.bossOverlay.setDepth(1000);

    // 오버레이 페이드인
    this.tweens.add({
      targets: this.bossOverlay,
      alpha: 0.7,
      duration: BOSS_CONFIG.FADE_DURATION,
      onComplete: () => {
        // 오버레이 클릭 처리 (아무것도 하지 않음)
        this.bossOverlay.setInteractive();
        this.bossOverlay.on('pointerdown', () => {
          // 오버레이 클릭은 무시
        });

        // 첫 보스 생성
        this.spawnBoss();
      }
    });

    // "BOSS ATTACK!" 텍스트 표시
    const bossText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'BOSS\nATTACK!',
      {
        fontSize: '80px',
        fontFamily: 'Arial Black',
        fill: '#ff0000',
        stroke: '#000000',
        strokeThickness: 8
      }
    );
    bossText.setOrigin(0.5);
    bossText.setDepth(1001);
    bossText.setAlpha(0);

    this.tweens.add({
      targets: bossText,
      alpha: 1,
      scale: 1.2,
      duration: 500,
      onComplete: () => {
        this.tweens.add({
          targets: bossText,
          alpha: 0,
          duration: 500,
          delay: 1000,
          onComplete: () => {
            bossText.destroy();
          }
        });
      }
    });
  }

  /**
   * 보스 생성 - 랜덤 위치
   */
  spawnBoss() {
    if (this.boss && this.boss.active) {
      this.boss.destroy();
    }

    // 보스 클릭 회수 동적 계산
    this.bossHitsRemaining = Math.floor(this.score / 5000);
    let bossDamageBase = 20000;
    if (this.score >= 800000) bossDamageBase = 30000;
    this.bossDamage = Math.floor(this.score / bossDamageBase);
    
    console.log(`[보스] 점수: ${this.score}, 클릭 필요: ${this.bossHitsRemaining}회, 공격 데미지: ${this.bossDamage}초`);

    // 보드 영역 내의 랜덤 위치 계산
    const padding = 100;
    const randomX = Phaser.Math.Between(
      padding,
      this.scale.width - padding
    );
    const randomY = Phaser.Math.Between(
      padding,
      this.scale.height - padding * 2
    );

    // 보스 스프라이트 생성 (wawa 스프라이트시트 사용)
    this.boss = this.add.sprite(randomX, randomY, 'wawa');
    this.boss.setScale(BOSS_CONFIG.BOSS_SCALE);
    this.boss.setDepth(1001);
    this.boss.setInteractive();
    this.boss.setAlpha(0);

    // 보스 애니메이션 설정
    if (!this.anims.exists('boss_walk')) {
      this.anims.create({
        key: 'boss_walk',
        frames: this.anims.generateFrameNumbers('wawa', { frames: BOSS_CONFIG.WALK_FRAMES }),
        frameRate: BOSS_CONFIG.WALK_ANIMATION_SPEED,
        repeat: -1
      });
    }

    // 보스 나타나기 애니메이션
    this.tweens.add({
      targets: this.boss,
      alpha: 1,
      scale: BOSS_CONFIG.BOSS_SCALE,
      duration: BOSS_CONFIG.SPAWN_ANIMATION_DURATION,
      ease: 'Back.easeOut'
    });

    // 보스 클릭 이벤트
    this.boss.on('pointerdown', () => this.onBossClicked());

    // 보스 아래 남은 클릭 회수 표시
    this.bossHitsText = this.add.text(
      this.boss.x,
      this.boss.y + BOSS_CONFIG.HITS_TEXT_OFFSET_Y,
      `${this.bossHitsRemaining}`,
      {
        fontSize: BOSS_CONFIG.HITS_TEXT_FONT_SIZE,
        fontFamily: 'Arial Black',
        fill: BOSS_CONFIG.HITS_TEXT_COLOR
      }
    );
    this.bossHitsText.setOrigin(0.5);
    this.bossHitsText.setDepth(1002);

    // 보스 AI 초기화
    this.bossAttackTimer = 0;
    this.bossMovementTimer = 0;
    this.setNewBossMoveTarget();
    this.boss.play('boss_walk');

    console.log(`[보스] 라운드 ${this.bossRound}, 보스 생성 (클릭 필요: ${this.bossHitsRemaining}회)`);
  }

  /**
   * 보스 새로운 이동 목표 설정
   */
  setNewBossMoveTarget() {
    if (!this.boss) return;

    this.bossMovementTimer = 0;

    const padding = 150;
    const targetX = Phaser.Math.Between(padding, this.scale.width - padding);
    const targetY = Phaser.Math.Between(padding, this.scale.height - padding * 2);

    const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, targetX, targetY);
    this.bossMoveVelocityX = Math.cos(angle) * BOSS_CONFIG.MOVEMENT_SPEED;
    this.bossMoveVelocityY = Math.sin(angle) * BOSS_CONFIG.MOVEMENT_SPEED;

    this.bossTargetX = targetX;
    this.bossTargetY = targetY;
  }

  /**
   * 보스 클릭 처리
   */
  onBossClicked() {
    if (!this.bossActive || !this.boss) return;

    console.log(`[보스] 클릭! 남은 횟수: ${this.bossHitsRemaining - 1}`);
    this.bossHitsRemaining--;

    // 클릭 회수 텍스트 업데이트
    if (this.bossHitsText) {
      this.bossHitsText.setText(`${this.bossHitsRemaining}`);
    }

    // 타격음 재생
    if (this.soundEnabled) {
      const hitSounds = ['hit1', 'hit2', 'hit3'];
      const randomHitSound = Phaser.Utils.Array.GetRandom(hitSounds);
      this.sound.play(randomHitSound, { volume: 0.5 });
    }

    // 타격 모션 (프레임 4)
    this.boss.setFrame(BOSS_CONFIG.HIT_FRAME);

    // 타격 애니메이션
    this.tweens.add({
      targets: this.boss,
      scale: BOSS_CONFIG.BOSS_SCALE * 0.85,
      duration: BOSS_CONFIG.HIT_ANIMATION_DURATION,
      yoyo: true,
      onComplete: () => {
        // 애니메이션 완료 후 걷기로 복귀
        if (this.boss && this.bossActive) {
          this.boss.play('boss_walk');
        }
      }
    });

    // 파티클 이펙트
    this.particleManager.emitParticleAt(this.boss.x, this.boss.y, 15);
    this.particleManager.setParticleTint(0xff0000);

    if (this.bossHitsRemaining <= 0) {
      this.completeBossRound();
    }
  }

  /**
   * 보스 공격 수행
   */
  performBossAttack() {
    if (!this.bossActive || !this.boss) return;

    console.log(`[보스] 공격! 플레이어 시간 -${this.bossDamage}초`);

    // 공격음 재생
    if (this.soundEnabled) {
      const ouchSounds = ['ouch1', 'ouch2'];
      const randomOuchSound = Phaser.Utils.Array.GetRandom(ouchSounds);
      this.sound.play(randomOuchSound, { volume: SOUND_CONFIG.SOUND_VOLUME_BASE });
    }

    // 공격 모션 (프레임 3)
    this.boss.setFrame(BOSS_CONFIG.ATTACK_FRAME);

    // 공격 애니메이션
    this.tweens.add({
      targets: this.boss,
      scaleX: BOSS_CONFIG.BOSS_SCALE * 0.95,
      scaleY: BOSS_CONFIG.BOSS_SCALE * 1.05,
      duration: BOSS_CONFIG.ATTACK_ANIMATION_DURATION,
      yoyo: true,
      onComplete: () => {
        // 애니메이션 완료 후 걷기로 복귀
        if (this.boss && this.bossActive) {
          this.boss.play('boss_walk');
        }
      }
    });

    // 화면 빨간색 깜빡임 및 약한 쉐이크로 공격을 강조
    try {
      this.cameras.main.flash(150, 255, 0, 0);
      this.cameras.main.shake(200, 0.02);
    } catch (e) {
      // 환경에 따라 cameras가 없을 수 있으므로 무시
    }

    // 플레이어 시간 감소 (동적 계산된 데미지 사용)
    this.timeLeft = Math.max(0, this.timeLeft - this.bossDamage);
    if (this.game && this.game.events) {
      this.game.events.emit('tick', this.timeLeft);
      // emit an event to signal time was damaged so UI can flash
      this.game.events.emit('timeDamaged', this.bossDamage);
    }

    // 공격 파티클
    this.particleManager.emitParticleAt(this.boss.x, this.boss.y, 10);
    this.particleManager.setParticleTint(0xff6666);
  }

  /**
   * 보스 라운드 완료
   */
  completeBossRound() {
    if (!this.boss) return;

    console.log(`[보스] 라운드 ${this.bossRound} 완료!`);

    this.bossActive = false;
    this.bossHitsRemaining = 0;

    // 죽음 사운드 재생
    if (this.soundEnabled) {
      this.sound.play('bomb', { volume: 0.7 });
    }

    // 화면 빨간색 깜빡임
    this.cameras.main.flash(200, 255, 0, 0);

    // 보스 죽음 애니메이션
    this.tweens.killTweensOf(this.boss);
    this.boss.stop();

    this.tweens.add({
      targets: this.boss,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      angle: 360,
      duration: 500,
      ease: 'Power2.easeIn',
      onComplete: () => {
        if (this.boss) {
          this.boss.destroy();
          this.boss = null;
        }
        if (this.bossHitsText) {
          this.bossHitsText.destroy();
          this.bossHitsText = null;
        }

        if (this.bossRound >= BOSS_CONFIG.TOTAL_ROUNDS) {
          this.completeBossMode();
        } else {
          this.bossRound++;

          // 라운드 간 딜레이
          this.time.delayedCall(1000, () => {
            this.spawnBoss();
          });
        }
      }
    });

    // 승리 파티클
    for (let i = 0; i < 30; i++) {
      this.particleManager.emitParticleAt(this.boss.x, this.boss.y, 1);
    }
    this.particleManager.setParticleTint(0xffff00);
  }

  /**
   * 보스전 클리어
   */
  completeBossMode() {
    console.log('[보스] 보스전 클리어!');
    this.bossMode = false;
    this.bossActive = false;

    // BGM 복구
    this.sound.stopByKey('bgm_boss');
    this.sound.play('bgm', { loop: true, volume: SOUND_CONFIG.BGM_VOLUME });

    // 타임 보너스 지급
    this.uiManager.grantTimeBonus();
    this.uiManager.grantTimeBonus();
    this.uiManager.grantTimeBonus();

    // 클리어 텍스트 표시
    const clearText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'BOSS CLEAR\n+30 SECONDS!',
      {
        fontSize: '70px',
        fontFamily: 'Arial Black',
        fill: '#00ff00',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center'
      }
    );
    clearText.setOrigin(0.5);
    clearText.setDepth(1002);

    this.tweens.add({
      targets: clearText,
      alpha: 0,
      scale: 0.8,
      duration: 2000,
      delay: 1000,
      onComplete: () => {
        clearText.destroy();

        // 오버레이 페이드아웃
        this.tweens.add({
          targets: this.bossOverlay,
          alpha: 0,
          duration: BOSS_CONFIG.FADE_DURATION,
          onComplete: () => {
            this.bossOverlay.destroy();
            this.bossOverlay = null;
          }
        });
      }
    });
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
        // 배열 중복 자동 정리됨
      }
    });

    // 3단계: 물리적 좌표 겹침 체크 (추가 안전장치)
    const physicalMap = this.boardManager.detectPhysicalOverlaps();

    // 겹친 gem 제거 (진행 중인 애니메이션 먼저 정리)
    physicalMap.forEach((gemList, key) => {
      if (gemList.length > 1) {
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
    if (this.feverTimeEvent) {
      this.feverTimeEvent.remove();
      this.feverTimeEvent = null;
    }

    // 모든 tweens 정리
    this.tweens.killAll();

    // 모든 사운드 정지
    if (this.sound) {
      this.sound.stopAll();
      this.sound.unlock();
    }

    // 보스 정리
    if (this.boss && this.boss.destroy) {
      this.boss.destroy();
      this.boss = null;
    }
    if (this.bossOverlay && this.bossOverlay.destroy) {
      this.bossOverlay.destroy();
      this.bossOverlay = null;
    }
    if (this.bossHitsText && this.bossHitsText.destroy) {
      this.bossHitsText.destroy();
      this.bossHitsText = null;
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
      this.particleManager.destroy();
      this.particleManager = null;
    }

    // dev UI cleanup
    if (this.devUIElements && this.devUIElements.length > 0) {
      this.devUIElements.forEach(e => { try { if (e && e.destroy) e.destroy(); } catch (err) {} });
      this.devUIElements = [];
    }
  }
}

