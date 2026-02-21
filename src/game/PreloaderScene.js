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

import { BOSS_CONFIG, SOUND_CONFIG } from './GameConstants';

export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super('PreloaderScene');
  }

  preload() {
    // Minimal loader UI: gem1 logo and a spinner only
    try {
      const width = this.scale ? this.scale.width : 800;
      const height = this.scale ? this.scale.height : 600;
      const centerX = width / 2;
      const centerY = height / 2;

      // no spinner: will display gem1 logo and dim it to show progress

      // logo will be created once gem1 is loaded to avoid missing-texture issues
      this.logo = null;

      this.load.on('filecomplete', (key) => {
        if (key === 'gem1') {
          try {
            const logo = this.add.image(centerX, centerY - 120, 'gem1').setOrigin(0.5).setAlpha(0.4).setScale(0.92);
            // scale logo to fit nicely if image size available
            const maxLogoW = Math.min(180, width * 0.25);
            if (logo.width) {
              const logoRatio = maxLogoW / logo.width;
              logo.setDisplaySize(logo.width * logoRatio, logo.height * logoRatio);
            }
            this.logo = logo;
            this.tweens.add({ targets: logo, scale: { from: 0.92, to: 1 }, duration: 360, ease: 'Cubic.easeOut' });
          } catch (e) {
            // ignore
          }
        }
      });

      // Update logo tint/scale as loading progresses. If logo not ready yet, pulse spinner alpha.
      this.load.on('progress', (value) => {
        try {
          if (this.logo) {
            // dimming effect: start dim (alpha 0.4) -> normal (alpha 1.0)
            this.logo.setAlpha(0.4 + 0.6 * value);
            // slight scale feedback
            this.logo.setScale(0.92 + 0.08 * value);
          }
        } catch (e) {
          // ignore visual update errors
        }
      });

      this.load.on('complete', () => {
        try {
            this.tweens.add({
              targets: [this.logo],
              alpha: 0,
              duration: 300,
              onComplete: () => {
                if (this.logo && this.logo.destroy) this.logo.destroy();
                this.scene.start('AnipangScene');
              }
            });
        } catch (e) {
          [this.logo, this.spinner, this.spinnerArc].forEach(o => { if (o && o.destroy) o.destroy(); });
          this.scene.start('AnipangScene');
        }
      });
    } catch (e) {
      console.warn('Preloader init failed', e);
    }

    // Asset loading
    this.load.image('gem1', img1);
    this.load.image('gem2', img2);
    this.load.image('gem3', img3);
    this.load.image('gem4', img4);
    this.load.image('gem5', img5);
    this.load.image('gem6', img6);
    this.load.image('bomb', bombImg);
    this.load.image('background', backgroundImg);
    this.load.image('boss', bossImg);
    this.load.spritesheet('dog', dogWalkImg, { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('wawa', wawaImg, { frameWidth: BOSS_CONFIG.FRAME_WIDTH, frameHeight: BOSS_CONFIG.FRAME_HEIGHT });
    this.load.audio('ouch1', soundOuch1);
    this.load.audio('ouch2', soundOuch2);
    this.load.audio('bgm', bgm);
    this.load.audio('bgm_boss', bgmBoss);
    this.load.audio('bomb', bombSound);
    this.load.audio('hit1', hitSound1);
    this.load.audio('hit2', hitSound2);
    this.load.audio('hit3', hitSound3);
  }

  create() {
    // nothing - assets loaded and scene started from complete handler
  }
}
