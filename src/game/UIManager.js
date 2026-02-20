/**
 * UIManager - UI 요소 및 애니메이션
 * 책임: 사운드 버튼, 텍스트 표시, 보너스 이펙트
 */
import { FEVER_CONFIG } from './GameConstants';

export class UIManager {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * 사운드 토글 버튼 생성
   */
  createSoundToggleButton() {
    const isMobile = this.scene.game.device.os.mobile || this.scene.scale.width < 768;
    
    // 모바일 모드에서는 버튼 숨김
    if (isMobile) return;
    
    const padding = 16;
    const btnWidth = 60;
    const btnHeight = 40;
    const fontSize = '24px';
    
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

    if (this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('tick', this.scene.timeLeft);
      this.scene.game.events.emit('timeBonus');
    }

    this.scene.cameras.main.flash(400, 255, 215, 0);
    this.scene.cameras.main.shake(300, 0.05);

    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    const bonusText = this.scene.add.text(centerX, centerY, '+10초', {
      fontFamily: 'Arial Black',
      fontSize: '100px',
      color: '#ffff00',
      stroke: '#ff0000',
      strokeThickness: 10,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1000).setScale(0.5);

    this.scene.tweens.add({
      targets: bonusText,
      scale: 1.3,
      alpha: 0,
      y: centerY - 150,
      duration: 1200,
      ease: 'Elastic.easeOut',
      onComplete: () => bonusText.destroy()
    });
  }

  /**
   * 피버타임 텍스트 표시
   */
  showFeverTimeText() {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    const feverText = this.scene.add.text(centerX, centerY, 'Fever\nTime!!', {
      fontFamily: 'Arial Black',
      fontSize: FEVER_CONFIG.TEXT_FONT_SIZE,
      color: '#ff00ff',
      stroke: '#ffff00',
      strokeThickness: 12,
      fontStyle: 'bold',
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 5, fill: true }
    }).setOrigin(0.5).setDepth(1000).setScale(FEVER_CONFIG.TEXT_SCALE_START);

    this.scene.tweens.add({
      targets: feverText,
      scale: FEVER_CONFIG.TEXT_SCALE_END,
      alpha: 0.8,
      duration: 600,
      ease: 'Elastic.easeOut'
    });

    // 명시된 시간 후 사라짐
    this.scene.time.delayedCall(FEVER_CONFIG.TEXT_DISPLAY_TIME, () => {
      this.scene.tweens.add({
        targets: feverText,
        alpha: 0,
        scale: 0.5,
        duration: 400,
        onComplete: () => feverText.destroy()
      });
    });
  }

  /**
   * 쿨다운 텍스트 표시
   */
  showCoolDownText() {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    const cooldownText = this.scene.add.text(centerX, centerY, 'Cool\nDown!', {
      fontFamily: 'Arial Black',
      fontSize: FEVER_CONFIG.TEXT_FONT_SIZE,
      color: '#00ccff',
      stroke: '#0099ff',
      strokeThickness: 12,
      fontStyle: 'bold',
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 5, fill: true }
    }).setOrigin(0.5).setDepth(1000).setScale(FEVER_CONFIG.TEXT_SCALE_START);

    this.scene.tweens.add({
      targets: cooldownText,
      scale: FEVER_CONFIG.TEXT_SCALE_END,
      alpha: 0.8,
      duration: 600,
      ease: 'Elastic.easeOut'
    });

    // 명시된 시간 후 사라짐
    this.scene.time.delayedCall(FEVER_CONFIG.TEXT_DISPLAY_TIME, () => {
      this.scene.tweens.add({
        targets: cooldownText,
        alpha: 0,
        scale: 0.5,
        duration: 400,
        onComplete: () => cooldownText.destroy()
      });
    });
  }
}
