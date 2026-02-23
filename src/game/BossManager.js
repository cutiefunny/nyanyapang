/**
 * BossManager - 보스 전투 관리
 */
import { BOSS_CONFIG, SOUND_CONFIG } from './GameConstants';
import Phaser from 'phaser';

export class BossManager {
  constructor(scene) {
    this.scene = scene;
    this.boss = null;
    this.bossOverlay = null;
    this.bossEnergyBar = null;
    this.bossEnergyBarBg = null;
    this.bossHitsTextTopCenter = null; // 상단 중앙 클릭 회수 표시
    this.bossScale = 1; // 디바이스별 보스 크기

    // 보스 상태
    this.bossMode = false;
    this.bossActive = false;
    this.bossRound = 0;
    this.bossHitsRemaining = 0;
    this.bossHitsRemaining_current = 0;
    this.bossDamage = 0;

    // 보스 AI
    this.bossAttackTimer = 0;
    this.bossMovementTimer = 0;
    this.bossTargetX = 0;
    this.bossTargetY = 0;
    this.bossMoveVelocityX = 0;
    this.bossMoveVelocityY = 0;
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
    this.scene.sound.stopByKey('bgm');
    this.scene.sound.play('bgm_boss', { loop: true, volume: SOUND_CONFIG.BGM_VOLUME });

    // 화면 어두워지는 오버레이 생성
    this.bossOverlay = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0x000000,
      0
    );
    this.bossOverlay.setDepth(1000);

    // 오버레이 페이드인
    this.scene.tweens.add({
      targets: this.bossOverlay,
      alpha: 0.7,
      duration: BOSS_CONFIG.FADE_DURATION,
      onComplete: () => {
        this.bossOverlay.setInteractive();
        this.bossOverlay.on('pointerdown', () => {});
        this.spawnBoss();
      }
    });

    // "BOSS ATTACK!" 텍스트 표시
    const bossText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      'BOSS\nATTACK!',
      {
        fontSize: '50px',
        fontFamily: 'Arial Black',
        fill: '#ff0000',
        stroke: '#000000',
        strokeThickness: 8
      }
    );
    bossText.setOrigin(0.5);
    bossText.setDepth(1001);
    bossText.setAlpha(0);

    this.scene.tweens.add({
      targets: bossText,
      alpha: 1,
      scale: 1.2,
      duration: 500,
      onComplete: () => {
        this.scene.tweens.add({
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
   * 보스 생성
   */
  spawnBoss() {
    if (this.boss && this.boss.active) {
      this.boss.destroy();
    }

    // 클릭 회수 동적 계산
    this.bossHitsRemaining = 30 + (this.scene.score / 20000);
    if (this.bossHitsRemaining < 5) this.bossHitsRemaining = 5;
    if (this.bossHitsRemaining > 80) this.bossHitsRemaining = 80;
    this.bossHitsRemaining_current = this.bossHitsRemaining;

    
    this.bossDamage = Math.floor(this.scene.score / 20000);
    if (this.bossDamage > 40) this.bossDamage = 40;

    console.log(`[보스] 점수: ${this.scene.score}, 클릭 필요: ${this.bossHitsRemaining}회, 공격 데미지: ${this.bossDamage}초`);

    // 랜덤 위치
    const padding = 100;
    const randomX = Phaser.Math.Between(padding, this.scene.scale.width - padding);
    const randomY = Phaser.Math.Between(padding, this.scene.scale.height - padding * 2);

    // 보스 스프라이트 생성
    this.boss = this.scene.add.sprite(randomX, randomY, 'wawa');
    
    // 디바이스별 크기 설정 (PC와 태블릿인 경우 2배)
    const isTablet = this.scene.scale.width > 600 && this.scene.scale.width <= 1024;
    const isPC = this.scene.scale.width > 1024;
    this.bossScale = (isPC || isTablet) ? BOSS_CONFIG.BOSS_SCALE * 2 : BOSS_CONFIG.BOSS_SCALE;
    console.log(`[보스] 화면 너비: ${this.scene.scale.width}px, isPC: ${isPC}, isTablet: ${isTablet}, bossScale: ${this.bossScale}`);
    this.boss.setScale(this.bossScale);
    
    this.boss.setDepth(1001);
    this.boss.setInteractive();
    this.boss.setAlpha(0);

    // 애니메이션 설정
    if (!this.scene.anims.exists('boss_walk')) {
      this.scene.anims.create({
        key: 'boss_walk',
        frames: this.scene.anims.generateFrameNumbers('wawa', { frames: BOSS_CONFIG.WALK_FRAMES }),
        frameRate: BOSS_CONFIG.WALK_ANIMATION_SPEED,
        repeat: -1
      });
    }

    // 나타나기 애니메이션
    this.scene.tweens.add({
      targets: this.boss,
      alpha: 1,
      scale: this.bossScale,
      duration: BOSS_CONFIG.SPAWN_ANIMATION_DURATION,
      ease: 'Back.easeOut'
    });

    // 클릭 이벤트
    this.boss.on('pointerdown', () => this.onBossClicked());

    // 상단 중앙 클릭 회수 표시 (큰 숫자)
    this.bossHitsTextTopCenter = this.scene.add.text(
      this.scene.scale.width / 2,
      BOSS_CONFIG.TOP_CENTER_HITS_Y_OFFSET,
      `${this.bossHitsRemaining}`,
      {
        fontSize: BOSS_CONFIG.TOP_CENTER_HITS_FONT_SIZE,
        fontFamily: 'Arial Black',
        fill: BOSS_CONFIG.TOP_CENTER_HITS_COLOR,
        stroke: BOSS_CONFIG.TOP_CENTER_HITS_STROKE,
        strokeThickness: BOSS_CONFIG.TOP_CENTER_HITS_STROKE_WIDTH
      }
    );
    this.bossHitsTextTopCenter.setOrigin(0.5, 0);
    this.bossHitsTextTopCenter.setDepth(1003);

    // AI 초기화
    this.bossAttackTimer = 0;
    this.bossMovementTimer = 0;
    this.setNewBossMoveTarget();
    this.boss.play('boss_walk');

    console.log(`[보스] 라운드 ${this.bossRound}, 보스 생성 (클릭 필요: ${this.bossHitsRemaining}회)`);
  }

  /**
   * 보스 이동 목표 설정
   */
  setNewBossMoveTarget() {
    if (!this.boss) return;

    this.bossMovementTimer = 0;

    const padding = 150;
    const targetX = Phaser.Math.Between(padding, this.scene.scale.width - padding);
    const targetY = Phaser.Math.Between(padding, this.scene.scale.height - padding * 2);

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

    // 상단 중앙 텍스트 업데이트
    if (this.bossHitsTextTopCenter) {
      this.bossHitsTextTopCenter.setText(`${this.bossHitsRemaining}`);
      
      // 클릭할 때마다 스케일 애니메이션
      this.scene.tweens.add({
        targets: this.bossHitsTextTopCenter,
        scale: 1.15,
        duration: 100,
        yoyo: true
      });
    }

    // 타격음
    if (this.scene.soundEnabled) {
      const hitSounds = ['hit1', 'hit2', 'hit3'];
      const randomHitSound = Phaser.Utils.Array.GetRandom(hitSounds);
      this.scene.sound.play(randomHitSound, { volume: 0.5 });
    }

    // 타격 모션
    this.boss.setFrame(BOSS_CONFIG.HIT_FRAME);

    this.scene.tweens.add({
      targets: this.boss,
      scale: this.bossScale * 0.85,
      duration: BOSS_CONFIG.HIT_ANIMATION_DURATION,
      yoyo: true,
      onComplete: () => {
        if (this.boss && this.bossActive) {
          this.boss.play('boss_walk');
        }
      }
    });

    // 파티클
    this.scene.particleManager.emitParticleAt(this.boss.x, this.boss.y, 15);
    this.scene.particleManager.setParticleTint(0xff0000);

    if (this.bossHitsRemaining <= 0) {
      this.completeBossRound();
    }
  }

  /**
   * 보스 공격
   */
  performBossAttack() {
    if (!this.bossActive || !this.boss) return;

    console.log(`[보스] 공격! 플레이어 시간 -${this.bossDamage}초`);

    if (this.scene.soundEnabled) {
      const ouchSounds = ['ouch1', 'ouch2'];
      const randomOuchSound = Phaser.Utils.Array.GetRandom(ouchSounds);
      this.scene.sound.play(randomOuchSound, { volume: SOUND_CONFIG.SOUND_VOLUME_BASE });
    }

    this.boss.setFrame(BOSS_CONFIG.ATTACK_FRAME);

    this.scene.tweens.add({
      targets: this.boss,
      scaleX: this.bossScale * 0.95,
      scaleY: this.bossScale * 1.05,
      duration: BOSS_CONFIG.ATTACK_ANIMATION_DURATION,
      yoyo: true,
      onComplete: () => {
        if (this.boss && this.bossActive) {
          this.boss.play('boss_walk');
        }
      }
    });

    try {
      this.scene.cameras.main.flash(150, 255, 0, 0);
      this.scene.cameras.main.shake(200, 0.02);
    } catch (e) {}

    // 플레이어 시간 감소
    this.scene.gameTimer.timeLeft = Math.max(0, this.scene.gameTimer.timeLeft - this.bossDamage);
    if (this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('tick', this.scene.gameTimer.timeLeft);
      this.scene.game.events.emit('timeDamaged', this.bossDamage);
    }

    this.scene.particleManager.emitParticleAt(this.boss.x, this.boss.y, 10);
    this.scene.particleManager.setParticleTint(0xff6666);
  }

  /**
   * 보스 AI 업데이트
   */
  update(deltaTime) {
    if (!this.bossMode || !this.bossActive || !this.boss) return;

    // 이동
    this.boss.x += this.bossMoveVelocityX * (deltaTime / 1000);
    this.boss.y += this.bossMoveVelocityY * (deltaTime / 1000);

    // 경계 체크
    const padding = 150;
    const widthLimit = this.scene.scale.width - padding;
    const heightLimit = this.scene.scale.height - padding * 2;
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

    // 이동 방향 변경
    this.bossMovementTimer += deltaTime;
    if (this.bossMovementTimer >= BOSS_CONFIG.MOVE_CHANGE_INTERVAL) {
      this.bossMovementTimer = 0;
      if (!directionChangedThisFrame) {
        this.setNewBossMoveTarget();
      }
    }

    // 공격
    this.bossAttackTimer += deltaTime;
    if (this.bossAttackTimer >= BOSS_CONFIG.ATTACK_INTERVAL) {
      this.bossAttackTimer = 0;
      this.performBossAttack();
    }
  }

  /**
   * 보스 라운드 완료
   */
  completeBossRound() {
    if (!this.boss) return;

    console.log(`[보스] 라운드 ${this.bossRound} 완료!`);

    this.bossActive = false;
    this.bossHitsRemaining = 0;

    if (this.scene.soundEnabled) {
      this.scene.sound.play('bomb', { volume: 0.7 });
    }

    this.scene.cameras.main.flash(200, 255, 0, 0);

    this.scene.tweens.killTweensOf(this.boss);
    this.boss.stop();

    this.scene.tweens.add({
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
        if (this.bossHitsTextTopCenter) {
          this.bossHitsTextTopCenter.destroy();
          this.bossHitsTextTopCenter = null;
        }

        if (this.bossRound >= BOSS_CONFIG.TOTAL_ROUNDS) {
          this.completeBossMode();
        } else {
          this.bossRound++;
          this.scene.time.delayedCall(1000, () => {
            this.spawnBoss();
          });
        }
      }
    });

    for (let i = 0; i < 30; i++) {
      this.scene.particleManager.emitParticleAt(this.boss.x, this.boss.y, 1);
    }
    this.scene.particleManager.setParticleTint(0xffff00);
  }

  /**
   * 보스전 클리어
   */
  completeBossMode() {
    console.log('[보스] 보스전 클리어!');
    this.bossMode = false;
    this.bossActive = false;

    this.scene.sound.stopByKey('bgm_boss');
    this.scene.sound.play('bgm', { loop: true, volume: SOUND_CONFIG.BGM_VOLUME });

    this.scene.uiManager.grantTimeBonus();
    this.scene.uiManager.grantTimeBonus();
    this.scene.uiManager.grantTimeBonus();

    const clearText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      'BOSS CLEAR\n+30 SECONDS!',
      {
        fontSize: '40px',
        fontFamily: 'Arial Black',
        fill: '#12b80c',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center'
      }
    );
    clearText.setOrigin(0.5);
    clearText.setDepth(1002);

    this.scene.tweens.add({
      targets: clearText,
      alpha: 0,
      scale: 0.8,
      duration: 2000,
      delay: 1000,
      onComplete: () => {
        clearText.destroy();

        this.scene.tweens.add({
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
   * 정리
   */
  destroy() {
    if (this.boss && this.boss.destroy) {
      this.boss.destroy();
      this.boss = null;
    }
    if (this.bossOverlay && this.bossOverlay.destroy) {
      this.bossOverlay.destroy();
      this.bossOverlay = null;
    }
    if (this.bossHitsTextTopCenter && this.bossHitsTextTopCenter.destroy) {
      this.bossHitsTextTopCenter.destroy();
      this.bossHitsTextTopCenter = null;
    }
    if (this.bossEnergyBar && this.bossEnergyBar.destroy) {
      this.bossEnergyBar.destroy();
      this.bossEnergyBar = null;
    }
    if (this.bossEnergyBarBg && this.bossEnergyBarBg.destroy) {
      this.bossEnergyBarBg.destroy();
      this.bossEnergyBarBg = null;
    }
  }
}
