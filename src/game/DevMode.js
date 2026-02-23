/**
 * DevMode - 개발자 모드 관리
 * Shift+D 키로 활성화되는 개발자 도구
 */
export class DevMode {
  constructor(scene) {
    this.scene = scene;
    this.devUIElements = [];
    this.setupKeyboardListener();
  }

  /**
   * 키보드 이벤트 설정 (Shift+D)
   */
  setupKeyboardListener() {
    try {
      this.scene.input.keyboard.on('keydown', (event) => {
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

  /**
   * Dev UI 토글
   */
  toggleDevUI() {
    // if already visible, destroy
    if (this.devUIElements && this.devUIElements.length > 0) {
      this.devUIElements.forEach(e => { try { if (e && e.destroy) e.destroy(); } catch (err) {} });
      this.devUIElements = [];
      return;
    }

    const width = this.scene.scale.width;
    const padding = 8;
    const btnW = 110;
    const btnH = 36;
    const centerY = 24;
    const secondRowY = 65;

    const leftX = width / 2 - btnW - padding;
    const centerX = width / 2;
    const rightX = width / 2 + btnW + padding;

    // FEVER 버튼
    const feverBtn = this.scene.add.rectangle(leftX, centerY, btnW, btnH, 0x333333, 0.9)
      .setOrigin(0.5)
      .setDepth(2000);
    const feverText = this.scene.add.text(leftX, centerY, 'FEVER', { fontSize: '14px', fill: '#ffdd55', fontFamily: 'Arial' })
      .setOrigin(0.5)
      .setDepth(2001);
    const feverZone = this.scene.add.zone(leftX, centerY, btnW, btnH).setOrigin(0.5).setInteractive().setDepth(2002);
    feverZone.on('pointerdown', () => {
      try {
        this.scene.feverTimeManager.activate();
      } catch (e) {}
      this.toggleDevUI();
    });

    // ADD POINT 버튼
    const pointBtn = this.scene.add.rectangle(centerX, centerY, btnW, btnH, 0x333333, 0.9)
      .setOrigin(0.5)
      .setDepth(2000);
    const pointText = this.scene.add.text(centerX, centerY, '+POINT', { fontSize: '14px', fill: '#55ff55', fontFamily: 'Arial' })
      .setOrigin(0.5)
      .setDepth(2001);
    const pointZone = this.scene.add.zone(centerX, centerY, btnW, btnH).setOrigin(0.5).setInteractive().setDepth(2002);
    pointZone.on('pointerdown', () => {
      try {
        this.scene.addScore(100000);
        this.scene.gameTimer.addTime(100);
      } catch (e) {}
      this.toggleDevUI();
    });

    // BOSS 버튼
    const bossBtn = this.scene.add.rectangle(rightX, centerY, btnW, btnH, 0x333333, 0.9)
      .setOrigin(0.5)
      .setDepth(2000);
    const bossText = this.scene.add.text(rightX, centerY, 'BOSS', { fontSize: '14px', fill: '#ff7788', fontFamily: 'Arial' })
      .setOrigin(0.5)
      .setDepth(2001);
    const bossZone = this.scene.add.zone(rightX, centerY, btnW, btnH).setOrigin(0.5).setInteractive().setDepth(2002);
    bossZone.on('pointerdown', () => {
      try {
        this.scene.bossManager.startBossMode('wawa');
      } catch (e) {}
      this.toggleDevUI();
    });

    // BOSS2 버튼
    const boss2Btn = this.scene.add.rectangle(centerX, secondRowY, btnW, btnH, 0x333333, 0.9)
      .setOrigin(0.5)
      .setDepth(2000);
    const boss2Text = this.scene.add.text(centerX, secondRowY, 'BOSS2', { fontSize: '14px', fill: '#ff6b9d', fontFamily: 'Arial' })
      .setOrigin(0.5)
      .setDepth(2001);
    const boss2Zone = this.scene.add.zone(centerX, secondRowY, btnW, btnH).setOrigin(0.5).setInteractive().setDepth(2002);
    boss2Zone.on('pointerdown', () => {
      try {
        this.scene.bossManager.startBossMode('boss2');
      } catch (e) {}
      this.toggleDevUI();
    });

    // store elements for cleanup
    this.devUIElements = [
      feverBtn, feverText, feverZone,
      pointBtn, pointText, pointZone,
      bossBtn, bossText, bossZone,
      boss2Btn, boss2Text, boss2Zone
    ];
  }

  /**
   * Dev UI 정리
   */
  destroy() {
    if (this.devUIElements && this.devUIElements.length > 0) {
      this.devUIElements.forEach(e => { try { if (e && e.destroy) e.destroy(); } catch (err) {} });
      this.devUIElements = [];
    }
  }
}
