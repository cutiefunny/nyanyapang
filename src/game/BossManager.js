/**
 * BossManager - 보스 전투 관리
 */
import { BOSS_CONFIG, BOSS2_CONFIG, SOUND_CONFIG } from './GameConstants';
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
    this.bossType = 'wawa'; // 'wawa' 또는 'boss2'
    this.bossRound = 0;
    this.bossHitsRemaining = 0;
    this.bossHitsRemaining_current = 0;
    this.bossDamage = 0;
    
    // Boss2 관련 속성
    this.boss2Sprite = null;          // boss2.png 스프라이트
    this.boss2CirclePool = [];        // 현재 활성 원들
    this.boss2HitsRemaining = 0;      // Boss2 클릭 필요 횟수 (항상 10)
    this.boss2SpawnTimer = 0;         // 원 생성 타이머
    this.boss2NextSpawnTime = 0;      // 다음 원 생성 시간
    this.boss2SpawningComplete = false; // 10개 모두 생성 완료 여부
    
    // 보스 스폰 보류 상태 (피버타임 중 스폰 조건 만족 시 사용)
    this.pendingBossSpawn = false;
    this.pendingBossType = null; // 보류된 보스 타입

    // 보스 AI (wawa만 사용)
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
  startBossMode(bossType = 'wawa') {

    this.bossMode = true;
    this.bossActive = true;
    this.bossRound = 1;
    this.bossType = bossType;

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
        
        // 보스 타입에 따라 다른 스폰 메서드 호출
        if (bossType === 'boss2') {
          this.spawnBoss2();
        } else {
          this.spawnBoss();
        }
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
    this.bossHitsRemaining = 30 + Math.floor(this.scene.score / 20000);
    if (this.bossHitsRemaining < 5) this.bossHitsRemaining = 5;
    if (this.bossHitsRemaining > 80) this.bossHitsRemaining = 80;
    this.bossHitsRemaining_current = this.bossHitsRemaining;

    
    this.bossDamage = Math.floor(this.scene.score / 20000);
    if (this.bossDamage > 60) this.bossDamage = 60;



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


  }

  /**
   * Boss2 생성 (원 메커닉)
   */
  spawnBoss2() {
    console.log('[Boss2] spawnBoss2 호출됨');
    
    // 기존 boss2 정리
    if (this.boss2Sprite) {
      this.boss2Sprite.destroy();
    }
    this.boss2CirclePool.forEach(circle => {
      if (circle.graphic) circle.graphic.destroy();
      if (circle.tween) circle.tween.stop();
    });
    this.boss2CirclePool = [];

    // 기존 wawa 보스 제거
    if (this.boss && this.boss.active) {
      this.boss.destroy();
    }
    if (this.bossHitsTextTopCenter) {
      this.bossHitsTextTopCenter.destroy();
    }

    // Boss2 상태 설정
    this.bossType = 'boss2';
    this.boss2HitsRemaining = BOSS2_CONFIG.TOTAL_ENERGY; // 보스2 총 에너지
    this.boss2SpawningComplete = false;
    this.boss2SpawnTimer = 0;
    this.boss2NextSpawnTime = 1000; // 첫 원은 1초 후 나타남
    console.log('[Boss2] 상태 초기화 - bossActive:', this.bossActive, 'bossMode:', this.bossMode, '보스 에너지:', this.boss2HitsRemaining);

    // Boss2 스프라이트 추가 (게임 캔버스 50% 크기)
    const canvasWidth = this.scene.scale.width;
    const boss2Size = canvasWidth * 0.5;
    this.boss2Sprite = this.scene.add.sprite(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      'boss_sprite',  // boss_sprite.png 스프라이트시트 사용 (프레임 0=idle, 1=공격)
      0  // 프레임 0: idle 상태
    );
    this.boss2Sprite.setDisplaySize(boss2Size, boss2Size);
    this.boss2Sprite.setDepth(1000);
    this.boss2Sprite.setAlpha(0);

    // 나타나기 애니메이션
    this.scene.tweens.add({
      targets: this.boss2Sprite,
      alpha: 1,
      duration: 500,
      ease: 'Power2.easeOut',
      onComplete: () => {
        console.log('[Boss2] 스프라이트 나타남 - 첫 원 생성 시작');
        // 스프라이트가 나타난 후 첫 원 생성
        this.createBoss2Circle();
        // 첫 원 생성 후 타이머 초기화 - 다음 원은 1초 후 생성
        this.boss2SpawnTimer = 0;
        this.boss2NextSpawnTime = 1000;
        console.log('[Boss2] 첫 원 생성 완료 - 다음 원 1초 후 생성 대기');
      }
    });

    // 상단 중앙 클릭 회수 표시
    this.bossHitsTextTopCenter = this.scene.add.text(
      this.scene.scale.width / 2,
      BOSS_CONFIG.TOP_CENTER_HITS_Y_OFFSET,
      `${this.boss2HitsRemaining}`,
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
    
    console.log('[Boss2] spawnBoss2 완료!');
  }

  /**
   * Boss2 원 하나 생성 (랜덤 위치, 축소 애니메이션 포함)
   */
  createBoss2Circle() {
    try {

      const gemSize = this.scene.gemSize;
      console.log('[Boss2 Circle] gemSize:', gemSize);
      const centerRadius = gemSize/2;
      const outerRadius = gemSize;

      // 게임 보드 영역 내 랜덤 위치
      const boardSize = this.scene.boardSize;
      const boardWidth = boardSize.cols * gemSize;
      const boardHeight = boardSize.rows * gemSize;
      const offsetX = this.scene.offsetX;
      const offsetY = this.scene.offsetY;

      console.log('[Boss2 Circle] 계산 - gemSize:', gemSize, 'boardWidth:', boardWidth, 'boardHeight:', boardHeight);

      // 보드 내에서 여백을 고려한 랜덤 위치
      const randomX = offsetX + centerRadius + Math.random() * (boardWidth - centerRadius * 2);
      const randomY = offsetY + centerRadius + Math.random() * (boardHeight - centerRadius * 2);
      console.log('[Boss2 Circle] 생성 위치:', {randomX, randomY});

      // 원 그리기 (graphics 객체)
      const circleGraphic = this.scene.make.graphics({
        x: randomX,
        y: randomY,
        add: true
      });
      console.log('[Boss2 Circle] Graphics 생성됨');
      
      circleGraphic.setDepth(1002);  // 보스2 스프라이트(1000)보다 위에 표시
      circleGraphic.setInteractive(
        new Phaser.Geom.Circle(0, 0, centerRadius),
        Phaser.Geom.Circle.Contains
      );
      console.log('[Boss2 Circle] 인터랙티브 설정 완료');

    // 원 그리기
    const drawCircle = () => {
      circleGraphic.clear();

      // 바깥쪽 원 (축소 진행 중)
      circleGraphic.fillStyle(BOSS2_CONFIG.OUTER_FILL_COLOR, 0.3);
      circleGraphic.fillCircleShape(new Phaser.Geom.Circle(0, 0, outerRadius));

      circleGraphic.lineStyle(3, BOSS2_CONFIG.OUTER_FILL_COLOR, 1);
      circleGraphic.strokeCircleShape(new Phaser.Geom.Circle(0, 0, outerRadius));

      // 안쪽 원 (클릭 대상)
      circleGraphic.fillStyle(BOSS2_CONFIG.CENTER_FILL_COLOR, 0.8);
      circleGraphic.fillCircleShape(new Phaser.Geom.Circle(0, 0, centerRadius));

      circleGraphic.lineStyle(2, 0xffffff, 1);
      circleGraphic.strokeCircleShape(new Phaser.Geom.Circle(0, 0, centerRadius));

      // 중앙 점
      circleGraphic.fillStyle(0xffffff, 1);
      circleGraphic.fillCircle(0, 0, 5);
    };

    drawCircle();

    // 축소 상태 추적 (0 ~ 1)
    const shrinkState = { progress: 0 };

    // 축소 애니메이션
    const tween = this.scene.tweens.add({
      targets: shrinkState,
      progress: 1,
      duration: BOSS2_CONFIG.SHRINK_DURATION,
      ease: 'Linear',
      onUpdate: () => {
        // 바깥쪽 원 크기 계산
        const currentOuterRadius =
          outerRadius - (outerRadius - centerRadius) * shrinkState.progress;

        circleGraphic.clear();

        // 바깥쪽 원
        circleGraphic.fillStyle(BOSS2_CONFIG.OUTER_FILL_COLOR, 0.3);
        circleGraphic.fillCircleShape(new Phaser.Geom.Circle(0, 0, currentOuterRadius));

        circleGraphic.lineStyle(3, BOSS2_CONFIG.OUTER_FILL_COLOR, 1);
        circleGraphic.strokeCircleShape(new Phaser.Geom.Circle(0, 0, currentOuterRadius));

        // 안쪽 원
        circleGraphic.fillStyle(BOSS2_CONFIG.CENTER_FILL_COLOR, 0.8);
        circleGraphic.fillCircleShape(new Phaser.Geom.Circle(0, 0, centerRadius));

        circleGraphic.lineStyle(2, 0xffffff, 1);
        circleGraphic.strokeCircleShape(new Phaser.Geom.Circle(0, 0, centerRadius));

        circleGraphic.fillStyle(0xffffff, 1);
        circleGraphic.fillCircle(0, 0, 5);
      },
      onComplete: () => {
        // 축소 완료 - 플레이어에게 10초(DAMAGE_PER_SHRINK) 데미지
        if (this.bossMode && this.bossType === 'boss2' && this.bossActive) {
          console.log('[Boss2] ✗ 원 축소 완료! 플레이어 시간 -' + BOSS2_CONFIG.DAMAGE_PER_SHRINK + ' 데미지 입음');
          
          // Boss2 스프라이트를 공격 상태로 변경 (프레임 1)
          if (this.boss2Sprite) {
            this.boss2Sprite.setFrame(1);  // 공격 상태 프레임
            
            // 500ms 후 원래 상태로 돌아오기 (프레임 0: idle)
            this.scene.time.delayedCall(500, () => {
              if (this.boss2Sprite && this.bossActive) {
                this.boss2Sprite.setFrame(0);  // idle 상태 프레임으로 복귀
              }
            });
          }
          
          // wawa와 같은 타격 이펙트 발생
          // 1. 카메라 플래시 및 쉐이크
          try {
            this.scene.cameras.main.flash(150, 255, 0, 0);
            this.scene.cameras.main.shake(200, 0.02);
          } catch (e) {}
          
          // 2. 원의 위치에서 파티클 이펙트
          for (let i = 0; i < 15; i++) {
            this.scene.particleManager.emitParticleAt(circleGraphic.x, circleGraphic.y, 1);
          }
          this.scene.particleManager.setParticleTint(0xff0000);
          
          // 3. 타격음
          if (this.scene.soundEnabled) {
            const ouchSounds = ['ouch1', 'ouch2'];
            const randomOuchSound = Phaser.Utils.Array.GetRandom(ouchSounds);
            this.scene.sound.play(randomOuchSound, { volume: SOUND_CONFIG.SOUND_VOLUME_BASE });
          }
          
          // 4. 플레이어 시간 감소 (wawa와 동일하게 timeLeft 사용)
          this.scene.gameTimer.timeLeft = Math.max(0, this.scene.gameTimer.timeLeft - BOSS2_CONFIG.DAMAGE_PER_SHRINK);
          
          // 5. 게임 이벤트 발생 (UI 업데이트)
          if (this.scene.game && this.scene.game.events) {
            this.scene.game.events.emit('tick', this.scene.gameTimer.timeLeft);
            this.scene.game.events.emit('timeDamaged', BOSS2_CONFIG.DAMAGE_PER_SHRINK);
          }
          
          console.log('[Boss2] 현재 시간:', this.scene.gameTimer.timeLeft);
          
          // 시간이 0 이하가 되면 게임 종료
          if (this.scene.gameTimer.timeLeft <= 0) {
            console.log('[Boss2] 시간 부족! 게임 종료');
            this.scene.gameTimer.end();
          }
        }

        // 원 제거
        this.removeBoss2Circle(circleGraphic);
      }
    });

    // Circle 객체 저장
    const circleObj = {
      graphic: circleGraphic,
      tween: tween,
      centerRadius: centerRadius,
      x: randomX,
      y: randomY
    };

    this.boss2CirclePool.push(circleObj);
    console.log('[Boss2 Circle] 풀에 추가됨 - 현재 크기:', this.boss2CirclePool.length);

    // 클릭 이벤트
    circleGraphic.on('pointerdown', () => {
      console.log('[Boss2 Circle] 클릭됨!');
      if (this.boss2CirclePool.includes(circleObj)) {
        this.onBoss2CircleClicked(circleObj);
      }
    });
    console.log('[Boss2 Circle] 클릭 이벤트 등록 완료');
    } catch (error) {
      console.error('[Boss2 Circle] 에러 발생:', error);
      console.error('[Boss2 Circle] 스택:', error.stack);
    }
  }

  /**
   * Boss2 원 제거
   */
  removeBoss2Circle(graphic) {
    const index = this.boss2CirclePool.findIndex(c => c.graphic === graphic);
    if (index >= 0) {
      const circle = this.boss2CirclePool[index];
      if (circle.tween) circle.tween.stop();
      if (circle.graphic) {
        circle.graphic.off('pointerdown');
        circle.graphic.destroy();
      }
      this.boss2CirclePool.splice(index, 1);
    }
  }

  /**
   * Boss2 원 타이머 업데이트 (0.5초마다 새로운 원 생성)
   */
  updateBoss2Spawner(deltaTime) {
    if (!this.bossMode || this.bossType !== 'boss2' || this.boss2SpawningComplete) {
      if (!this.bossMode) console.log('[Boss2Spawner] 조기 반환 - bossMode: false');
      else if (this.bossType !== 'boss2') console.log('[Boss2Spawner] 조기 반환 - bossType:', this.bossType);
      else if (this.boss2SpawningComplete) console.log('[Boss2Spawner] 조기 반환 - 이미 10개 생성 완료');
      return;
    }

    this.boss2SpawnTimer += deltaTime;

    if (this.boss2SpawnTimer >= this.boss2NextSpawnTime) {
      console.log('[Boss2Spawner] 원 생성 시간 도달 - timer:', this.boss2SpawnTimer, 'target:', this.boss2NextSpawnTime);
      this.boss2SpawnTimer = 0;

      this.createBoss2Circle();
      console.log('[Boss2Spawner] 원 생성 완료 - 현재 풀 크기:', this.boss2CirclePool.length);

      // 보스 에너지만큼 모두 생성했으므로 스포닝 완료
      if (this.boss2CirclePool.length >= BOSS2_CONFIG.TOTAL_ENERGY) {
        this.boss2SpawningComplete = true;
        console.log('[Boss2Spawner] ✓✓✓ 10개 모두 생성 완료!')
      }

      // 다음 원은 1초 후
      this.boss2NextSpawnTime = 500;
    }
  }

  /**
   * Boss2 원 클릭 처리
   */
  onBoss2CircleClicked(circleObj) {
    if (!this.bossMode || this.bossType !== 'boss2' || !this.bossActive) return;

    this.boss2HitsRemaining--;
    console.log('[Boss2] 원 클릭! 보스 타격 - 남은 클릭 회수:', this.boss2HitsRemaining);

    // 상단 중앙 텍스트 업데이트
    if (this.bossHitsTextTopCenter) {
      this.bossHitsTextTopCenter.setText(`${this.boss2HitsRemaining}`);

      // 클릭할 때마다 스케일 애니메이션
      this.scene.tweens.add({
        targets: this.bossHitsTextTopCenter,
        scale: 1.15,
        duration: 100,
        yoyo: true
      });
    }

    // 화면 효과 (초록색 플래시 + 쉐이크)
    try {
      this.scene.cameras.main.flash(150, 0, 255, 0);  // 초록색 플래시
      this.scene.cameras.main.shake(200, 0.02);
    } catch (e) {}

    // 원의 위치에서 초록색 파티클 방출
    for (let i = 0; i < 15; i++) {
      this.scene.particleManager.emitParticleAt(circleObj.x, circleObj.y, 1);
    }
    this.scene.particleManager.setParticleTint(0x00ff00);  // 초록색

    // 클릭 이펙트 추가
    this.addClickEffectBoss2(circleObj.x, circleObj.y, circleObj.centerRadius);

    if (this.scene.soundEnabled) {
      const hitSounds = ['hit1', 'hit2', 'hit3'];
      const randomHitSound = Phaser.Utils.Array.GetRandom(hitSounds);
      this.scene.sound.play(randomHitSound, { volume: 0.5 });
    }

    // 원 제거 (tween 중단으로 damage 스킵)
    this.removeBoss2Circle(circleObj.graphic);

    if (this.boss2HitsRemaining <= 0) {
      // 보스2 라운드 완료
      console.log('[Boss2] ✓ 보스2 라운드 완료!');
      this.completeBossRound();
    }
  }

  /**
   * Boss2 클릭 이펙트
   */
  addClickEffectBoss2(centerX, centerY, radius) {
    // 클릭 원형 파티클 이펙트
    const particle = this.scene.add.circle(
      centerX,
      centerY,
      radius,
      0xffff00,
      0.5
    );
    particle.setDepth(1000);

    this.scene.tweens.add({
      targets: particle,
      scale: 1.3,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        particle.destroy();
      }
    });

    // 텍스트 "+1" 표시
    const hitText = this.scene.add.text(
      centerX,
      centerY - 40,
      '+1',
      {
        fontSize: '32px',
        fontFamily: 'Arial Black',
        fill: '#ffff00',
        stroke: '#000000',
        strokeThickness: 3
      }
    );
    hitText.setOrigin(0.5);
    hitText.setDepth(1001);

    this.scene.tweens.add({
      targets: hitText,
      y: centerY - 100,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        hitText.destroy();
      }
    });
  }

  /**
   * Boss2 제거 및 정리
   */
  clearBoss2() {
    if (this.boss2Sprite) {
      this.boss2Sprite.destroy();
      this.boss2Sprite = null;
    }

    this.boss2CirclePool.forEach(circle => {
      if (circle.graphic) {
        circle.graphic.off('pointerdown');
        circle.graphic.destroy();
      }
      if (circle.tween) {
        circle.tween.stop();
      }
    });
    this.boss2CirclePool = [];

    this.bossType = 'wawa';
    this.boss2HitsRemaining = 0;
    this.boss2SpawningComplete = false;
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
    
    // 시간이 0 이하가 되면 게임 종료
    if (this.scene.gameTimer.timeLeft <= 0) {
      console.log('[Boss] 시간 부족! 게임 종료');
      this.scene.gameTimer.end();
    }

    this.scene.particleManager.emitParticleAt(this.boss.x, this.boss.y, 10);
    this.scene.particleManager.setParticleTint(0xff6666);
  }

  /**
   * 보스 AI 업데이트
   */
  update(deltaTime) {
    if (!this.bossMode || !this.bossActive) return;

    // Boss2 타이머 업데이트 (10개 생성 전까지만)
    if (this.bossType === 'boss2') {
      if (!this.boss2SpawningComplete) {
        this.updateBoss2Spawner(deltaTime);
      }
      return;
    }

    // wawa 보스 처리
    if (!this.boss) return;

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
    this.bossActive = false;

    if (this.scene.soundEnabled) {
      this.scene.sound.play('bomb', { volume: 0.7 });
    }

    this.scene.cameras.main.flash(200, 255, 0, 0);

    // Boss2와 wawa에 따라 다른 처리
    if (this.bossType === 'boss2') {
      // 클릭 카운터 텍스트를 0으로 업데이트
      if (this.bossHitsTextTopCenter) {
        this.bossHitsTextTopCenter.setText('0');
      }

      // Boss2 스프라이트 제거 애니메이션
      if (this.boss2Sprite) {
        this.scene.tweens.add({
          targets: this.boss2Sprite,
          alpha: 0,
          scaleX: 0,
          scaleY: 0,
          angle: 360,
          duration: 500,
          ease: 'Power2.easeIn',
          onComplete: () => {
            // 클릭 카운터 텍스트 정리
            if (this.bossHitsTextTopCenter) {
              this.bossHitsTextTopCenter.destroy();
              this.bossHitsTextTopCenter = null;
            }

            // 모든 원과 보스 스프라이트 정리
            this.clearBoss2();

            if (this.bossRound >= BOSS2_CONFIG.TOTAL_ROUNDS) {
              this.completeBossMode();
            } else {
              this.bossRound++;
              this.scene.time.delayedCall(1000, () => {
                this.spawnBoss2();
              });
            }
          }
        });

        // 보스 위치에서 노란색 파티클 방출
        for (let i = 0; i < 30; i++) {
          this.scene.particleManager.emitParticleAt(this.boss2Sprite.x, this.boss2Sprite.y, 1);
        }
        this.scene.particleManager.setParticleTint(0xffff00);
      }
    } else {
      // wawa 보스 처리
      if (!this.boss) return;

      this.bossHitsRemaining = 0;

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
  }

  /**
   * 보스전 클리어
   */
  completeBossMode() {

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
    if (this.boss2Sprite && this.boss2Sprite.destroy) {
      this.boss2Sprite.destroy();
      this.boss2Sprite = null;
    }
    this.boss2CirclePool.forEach(circle => {
      if (circle.graphic && circle.graphic.destroy) circle.graphic.destroy();
      if (circle.tween) circle.tween.stop();
    });
    this.boss2CirclePool = [];
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
