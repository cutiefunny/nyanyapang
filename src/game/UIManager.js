/**
 * UIManager - UI 요소 및 애니메이션
 * 책임: 사운드 버튼, 텍스트 표시, 보너스 이펙트
 */
export class UIManager {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * 사운드 토글 버튼 생성
   */
  createSoundToggleButton() {
    const padding = 16;
    
    const isMobile = this.scene.game.device.os.mobile || this.scene.scale.width < 768;
    const btnWidth = isMobile ? 120 : 60;
    const btnHeight = isMobile ? 80 : 40;
    const fontSize = isMobile ? '48px' : '24px';
    
    const btnX = this.scene.scale.width - padding - btnWidth / 2;
    const btnY = padding + btnHeight / 2;

    const btnBg = this.scene.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0x000000, 0.6)
      .setDepth(100);

    this.scene.soundToggleText = this.scene.add.text(btnX, btnY, '🔊', {
      fontSize: fontSize
    }).setOrigin(0.5).setDepth(101);

    const btnBorder = this.scene.add.rectangle(btnX, btnY, btnWidth, btnHeight)
      .setStrokeStyle(2, 0xffdb78)
      .setOrigin(0.5)
      .setFillStyle(undefined)
      .setDepth(100);

    const btnHitArea = this.scene.add.zone(btnX, btnY, btnWidth, btnHeight)
      .setOrigin(0.5)
      .setInteractive()
      .setDepth(102);

    btnHitArea.on('pointerdown', () => {
      this.toggleSound();
    });

    btnHitArea.on('pointerover', () => {
      btnBg.setFillStyle(0xffdb78, 0.2);
    });

    btnHitArea.on('pointerout', () => {
      btnBg.setFillStyle(0x000000, 0.6);
    });
  }

  /**
   * 사운드 토글
   */
  toggleSound() {
    this.scene.soundEnabled = !this.scene.soundEnabled;
    this.scene.sound.mute = !this.scene.soundEnabled;
    this.scene.soundToggleText.setText(this.scene.soundEnabled ? '🔊' : '🔇');
    
    this.scene.tweens.add({
      targets: this.scene.soundToggleText,
      scale: 1.2,
      duration: 100,
      yoyo: true
    });
  }

  /**
   * 콤보 텍스트 표시
   */
  showComboText(x, y, textOrCount) {
    let textStr = textOrCount;
    if (typeof textOrCount === 'number') {
      const count = textOrCount;
      textStr = `${count} Combo!`;
      if (count >= 3) textStr = 'Great!';
      if (count >= 5) textStr = 'Fantastic!!';
      if (count >= 7) textStr = 'UNBELIEVABLE!!!';
    }

    const textObj = this.scene.add.text(x, y, textStr, {
      fontFamily: 'Arial Black',
      fontSize: '40px',
      color: '#ffdd00',
      stroke: '#000',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: textObj,
      y: y - 100,
      scale: 1.5,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => textObj.destroy()
    });
  }

  /**
   * 시간 보너스 이펙트
   */
  grantTimeBonus() {
    this.scene.timeLeft += 10;
    if (this.scene.timeLeft > 60) this.scene.timeLeft = 60;

    if (this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('tick', this.scene.timeLeft);
    }

    this.scene.cameras.main.flash(400, 255, 215, 0);
    this.scene.cameras.main.shake(300, 0.05);

    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    const bonusText = this.scene.add.text(centerX, centerY - 50, '+10초 보너스!', {
      fontFamily: 'Arial Black',
      fontSize: '60px',
      color: '#ffd700',
      stroke: '#ff6b00',
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(1000);

    this.scene.tweens.add({
      targets: bonusText,
      scale: 1.5,
      alpha: 0,
      y: centerY - 150,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => bonusText.destroy()
    });

    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const vx = Math.cos(angle) * 300;
      const vy = Math.sin(angle) * 300;

      const star = this.scene.add.text(centerX, centerY, '⭐', {
        fontSize: '32px'
      }).setOrigin(0.5).setDepth(999);

      this.scene.tweens.add({
        targets: star,
        x: centerX + vx * 0.3,
        y: centerY + vy * 0.3,
        alpha: 0,
        duration: 800,
        ease: 'Power2.easeOut',
        onComplete: () => star.destroy()
      });
    }
  }
}
