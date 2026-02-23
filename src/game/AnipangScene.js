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
import { BossManager } from './BossManager';
import { FeverTimeManager } from './FeverTimeManager';
import { GameTimer } from './GameTimer';
import { InputHandler } from './InputHandler';
import { DevMode } from './DevMode';
import { GAME_CONFIG, COMBO_CONFIG, SCORE_CONFIG, ANIMATION_CONFIG, SOUND_CONFIG, DRAG_CONFIG, BOARD_CHECK_CONFIG, FEVER_CONFIG, BOSS_CONFIG } from './GameConstants';

export class AnipangScene extends Phaser.Scene {
  constructor() {
    super('AnipangScene');
    
    // 기본 설정
    this.gemSize = 0; 
    this.boardSize = { rows: 8, cols: 8 };
    this.isProcessing = false;
    this.processingStartTime = 0; // isProcessing 타임아웃 추적
    this.comboCount = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    // 점수
    this.score = 0;
    this.nextBonusThreshold = SCORE_CONFIG.BONUS_THRESHOLD;

    // 사운드
    this.soundEnabled = true;

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
    this.bossManager = null;
    this.feverTimeManager = null;
    this.gameTimer = null;
    this.inputHandler = null;
    this.devMode = null;

    // 보스 스코어 임계값
    this.nextBossScoreThreshold = BOSS_CONFIG.SPAWN_SCORE_THRESHOLD;
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
    this.bossManager = new BossManager(this);
    this.feverTimeManager = new FeverTimeManager(this);
    this.gameTimer = new GameTimer(this);
    this.inputHandler = new InputHandler(this);

    // 게임 보드 생성
    this.boardManager.createBoard();
    
    // BGM 재생
    this.sound.play('bgm', { loop: true, volume: SOUND_CONFIG.BGM_VOLUME });
    
    // UI 버튼
    this.uiManager.createSoundToggleButton();
    
    // 입력 처리 초기화
    this.inputHandler.initialize();

    // 보드 정기 체크 타이머 시작 (5초마다 비어있는 부분 채우기 & 중복 gem 제거)
    this.boardCheckEvent = this.time.addEvent({
      delay: BOARD_CHECK_CONFIG.CHECK_INTERVAL,
      callback: () => {
        if (this.boardManager && !this.isProcessing) {
          this.boardManager.periodicBoardCheck();
        }
      },
      loop: true
    });

    // Dev mode 초기화
    this.devMode = new DevMode(this);
  }

  update() {
    // isProcessing 타임아웃 체크 (5초 이상 true면 강제 복구 - 무한 대기 방지)
    if (this.isProcessing) {
      if (this.processingStartTime === 0) {
        this.processingStartTime = Date.now();
      }
      const elapsedTime = Date.now() - this.processingStartTime;
      if (elapsedTime > 5000) {

        this.isProcessing = false;
        this.processingStartTime = 0;
      }
    } else {
      this.processingStartTime = 0;
    }

    // 겹친 gem 감지 및 수정 (매 프레임)
    this.boardManager.fixOverlappingGems();
    
    // 보스 AI 업데이트 (BossManager에서 처리)
    if (this.bossManager.bossMode && this.bossManager.bossActive && this.bossManager.boss) {
      this.bossManager.update(this.game.loop.delta);
    }
  }

  /**
   * 점수 추가 (BossManager/DevMode에서 사용)
   */
  addScore(points) {
    try {
      this.score += points;
      this.game.events.emit('addScore', points);

      // 포인트 보너스 시스템: 10000점마다 10초 추가
      if (this.score >= this.nextBonusThreshold) {
        this.uiManager.grantTimeBonus();
        this.nextBonusThreshold += SCORE_CONFIG.BONUS_THRESHOLD;
      }

      // 보스 생성 조건 체크
      if (!this.bossManager.bossMode && this.score >= this.nextBossScoreThreshold) {

        
        // 피버타임 중이면 보류, 아니면 즉시 시작
        if (this.feverTimeManager.feverTimeActive) {

          this.bossManager.pendingBossSpawn = true;
        } else {
          this.bossManager.startBossMode();
        }
        
        this.nextBossScoreThreshold += BOSS_CONFIG.SPAWN_SCORE_THRESHOLD;
      }
    } catch (e) {
      console.error('[Error] addScore 중 예외:', e);
    }
  }

  /**
   * 매칭 처리 (재귀적 체인)
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
              // 피버타임 활성화 조건 체크
              if (this.feverTimeManager.isBoardHalfEmpty()) {
                this.feverTimeManager.activate();
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
                // 가능한 움직임이 없는 교착 상태 확인
                if (!this.matchChecker.canMakeAnyMove()) {

                  this.breakDeadlock();
                } else {
                  this.isProcessing = false;
                }
              }
            } catch (e) {
              console.error('[Error] handleMatchesAfterExplosion delayedCall 중 예외:', e);
              this.isProcessing = false;
            }
          });
        } else {
          this.isProcessing = false;
        }
      }
    } catch (e) {
      console.error('[Error] handleMatchesAfterExplosion 중 예외:', e);
      this.isProcessing = false;
    }
  }

  /**
   * 교착 상태 해제 (랜덤 블록을 폭탄으로 변경)
   */
  breakDeadlock() {
    try {
      const gems = this.boardManager.gems;
      const candidates = []; // 일반 gem 후보

      // 폭탄이나 개가 아닌 일반 gem 찾기
      for (let row = 0; row < this.boardManager.boardSize.rows; row++) {
        for (let col = 0; col < this.boardManager.boardSize.cols; col++) {
          const gem = gems[row][col];
          if (gem && gem.active && 
              gem.texture.key !== 'bomb' && gem.texture.key !== 'dog') {
            candidates.push({ gem, row, col });
          }
        }
      }

      if (candidates.length === 0) {

        this.isProcessing = false;
        return;
      }

      // 랜덤한 블록 선택
      const randomIdx = Phaser.Math.Between(0, candidates.length - 1);
      const { gem, row, col } = candidates[randomIdx];



      // 기존 gem 제거
      this.tweens.killTweensOf(gem);
      gem.destroy();

      // 폭탄으로 변경
      const bomb = this.boardManager.spawnGem(row, col, 'bomb');
      if (bomb) {
        bomb.depth = 500; // 깊이 설정
        
        // pulse 애니메이션 추가
        this.addPulseTween(bomb);
        
        // 폭탄이 터지도록 처리
        this.time.delayedCall(100, () => {
          this.explosionManager.explodeBomb(bomb);
        });
      }
    } catch (e) {
      console.error('[Error] breakDeadlock 중 예외:', e);
      this.isProcessing = false;
    }
  }  /**
   * 매칭음 재생
   */
  playMatchSound() {
    if (this.soundEnabled) {
      const soundKey = Phaser.Utils.Array.GetRandom(['ouch1', 'ouch2']);
      this.sound.play(soundKey, { volume: SOUND_CONFIG.SOUND_VOLUME_BASE });
    }
  }

  /**
   * 폭발 이펙트 생성
   */
  createExplosionEffect(gem) {
    const color = this.particleColors[gem.texture.key] || 0xff0000;
    this.particleManager.emitParticleAt(gem.x, gem.y, 20);
    this.particleManager.setParticleTint(color);
  }

  /**
   * 같은 색 gem 범위 체크 및 선택 (폭탄 용)
   */
  findAdjacentGemsOfType(gem, type, visited = new Set()) {
    if (!gem || visited.has(gem)) return [];
    
    visited.add(gem);
    const result = [gem];

    if (!gem.texture || gem.texture.key !== type) return [gem];

    const neighbors = [
      [gem.row - 1, gem.col],
      [gem.row + 1, gem.col],
      [gem.row, gem.col - 1],
      [gem.row, gem.col + 1]
    ];

    for (const [row, col] of neighbors) {
      if (this.boardManager.isValidSlot(row, col)) {
        const neighbor = this.boardManager.gems[row][col];
        if (neighbor) {
          const adjacent = this.findAdjacentGemsOfType(neighbor, type, visited);
          result.push(...adjacent);
        }
      }
    }

    return result;
  }

  /**
   * 콤보 텍스트 표시
   */
  showComboText(x, y, textOrCount) {
    this.uiManager.showComboText(x, y, textOrCount);
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
   * Gem 크기 복원
   */
  restoreGemSize(gem) {
    if (gem.texture.key === 'bomb' || gem.texture.key === 'dog') {
      gem.setDisplaySize(
        this.gemSize * 1.0,
        this.gemSize * 1.0
      );
    } else {
      gem.setDisplaySize(
        this.gemSize - 2,
        this.gemSize - 2
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
   * 보드 비어있는 부분 체크 (fillBoard 완료 후 호출)
   * BoardManager.fillBoard()에서 호출됨
   */
  checkBoardEmptySpaces() {
    if (!this.boardManager) return;
    
    // 비어있는 부분이 있으면 강제로 채우기
    this.boardManager.enforceNoEmptySlots();
  }

  /**
   * 씬 종료 시 정리
   */
  /**
   * 정리
   */
  shutdown() {
    try {
      // 모든 타이머 정리
      if (this.gameTimer && this.gameTimer._tickEvent) {
        this.gameTimer._tickEvent.remove();
      }
      if (this.feverTimeManager && this.feverTimeManager.feverTimeEvent) {
        this.feverTimeManager.feverTimeEvent.remove();
      }
      if (this.boardCheckEvent) {
        this.boardCheckEvent.remove();
      }

      // 모든 tweens 정리
      this.tweens.killAll();

      // 모든 사운드 정지
      if (this.sound) {
        this.sound.stopAll();
        this.sound.unlock();
      }

      // 매니저들 정리
      if (this.inputHandler) this.inputHandler.destroy();
      if (this.bossManager) this.bossManager.destroy();
      if (this.feverTimeManager) this.feverTimeManager.destroy();
      if (this.gameTimer) this.gameTimer.destroy();

      // 파티클 정리
      if (this.particleManager) {
        this.particleManager.destroy();
        this.particleManager = null;
      }

      // dev mode 정리
      if (this.devMode) {
        this.devMode.destroy();
        this.devMode = null;
      }

      // 보드 정리
      if (this.boardManager && this.boardManager.gems) {
        this.boardManager.gems.forEach(row => {
          row.forEach(gem => {
            if (gem && gem.destroy) {
              gem.destroy();
            }
          });
        });
      }
    } catch (e) {
      console.error('[Error] Scene shutdown 중 예외:', e);
    }
  }
}
