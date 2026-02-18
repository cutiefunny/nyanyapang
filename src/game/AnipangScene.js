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
// [추가] 배경 이미지 import
import backgroundImg from '../assets/background.jpg'; 

// 사운드 에셋
import soundOuch1 from '../assets/Ouch1.mp3';
import soundOuch2 from '../assets/Ouch2.mp3';

export class AnipangScene extends Phaser.Scene {
  constructor() {
    super('AnipangScene');
    this.gemSize = 0; 
    this.boardSize = { rows: 8, cols: 8 };
    this.gems = [];
    this.selectedGem = null;
    this.isProcessing = false;
    this.comboCount = 0;

    this.draggingGem = null;
    this.dragStartX = 0;
    this.dragStartY = 0;

    this.gemTypes = ['gem1', 'gem2', 'gem3', 'gem4', 'gem5', 'gem6'];
    
    this.particleColors = {
        'gem1': 0xff0000, 'gem2': 0x00ff00, 'gem3': 0x0000ff,
        'gem4': 0xffff00, 'gem5': 0x800080, 'gem6': 0x00ffff,
        'bomb': 0xff0000,
        'dog': 0x8B4513
    };

    this.baseTints = {
        'gem1': 0xffffff,
        'gem2': 0xffffff,
        'gem3': 0xeeffee, 
        'gem4': 0xffffff,
        'gem5': 0xffffff,
        'gem6': 0xffffff,
        'bomb': 0xff0000, 
        'dog': 0xffffff
    };
  }

  preload() {
    this.load.image('gem1', img1);
    this.load.image('gem2', img2);
    this.load.image('gem3', img3);
    this.load.image('gem4', img4);
    this.load.image('gem5', img5);
    this.load.image('gem6', img6);
    this.load.image('bomb', bombImg);
    
    // [추가] 배경 이미지 로드
    this.load.image('background', backgroundImg);

    this.load.spritesheet('dog', dogWalkImg, { 
        frameWidth: 100, 
        frameHeight: 100 
    });

    this.load.audio('ouch1', soundOuch1);
    this.load.audio('ouch2', soundOuch2);
  }

  create() {
    // [제거] 기존 단색 배경 설정 제거
    // this.cameras.main.setBackgroundColor('#2d2d2d');

    // [추가] 배경 이미지 설정
    // 1. 이미지 추가 및 이름 설정 (onResize에서 찾기 위해)
    const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'background')
                .setName('background');

    // 2. 화면 전체를 덮도록 크기 조절 (비율 유지 없이 강제로 맞춤)
    bg.setDisplaySize(this.scale.width, this.scale.height);

    // 3. 불투명도 20% 적용
    bg.setAlpha(0.2);

    // 4. 가장 뒤로 보내기
    bg.setDepth(-1);
    

    // --- 기존 코드 시작 ---
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    
    const sizeBasedOnWidth = screenWidth / this.boardSize.cols;
    const sizeBasedOnHeight = screenHeight / this.boardSize.rows;
    
    this.gemSize = Math.floor(Math.min(sizeBasedOnWidth, sizeBasedOnHeight));

    this.offsetX = (screenWidth - this.boardSize.cols * this.gemSize) / 2 + this.gemSize / 2;
    this.offsetY = (screenHeight - this.boardSize.rows * this.gemSize) / 2 + this.gemSize / 2;

    if (!this.anims.exists('dog_walk_anim')) {
        this.anims.create({
            key: 'dog_walk_anim',
            frames: this.anims.generateFrameNumbers('dog', { start: 0, end: 1 }),
            frameRate: 8,
            repeat: -1
        });
    }

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

    this.createBoard();
    
    this.scale.on('resize', this.onResize, this);

    this.input.on('gameobjectdown', this.onGemDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
  }

  // [수정] onResize에서 배경 이미지 크기 조절 추가
  onResize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.cameras.main.setViewport(0, 0, width, height);
    
    // 배경 이미지 리사이즈
    const bg = this.children.getByName('background');
    if (bg) {
        bg.setPosition(width / 2, height / 2);
        bg.setDisplaySize(width, height);
    }

    // 게임 재시작
    this.scene.restart(); 
  }

  playMatchSound() {
    const key = Phaser.Math.RND.pick(['ouch1', 'ouch2']);
    const detuneVal = Phaser.Math.Between(-400, 400); 
    this.sound.play(key, { detune: detuneVal, volume: 0.4 });
  }

  getGemX(col) {
    return col * this.gemSize + this.offsetX;
  }

  getGemY(row) {
    return row * this.gemSize + this.offsetY;
  }

  createBoard() {
    this.gems = [];
    for (let row = 0; row < this.boardSize.rows; row++) {
      this.gems[row] = [];
      for (let col = 0; col < this.boardSize.cols; col++) {
        let type;
        do {
          type = Phaser.Math.RND.pick(this.gemTypes);
        } while (
          (row >= 2 && this.gems[row - 1][col].texture.key === type && this.gems[row - 2][col].texture.key === type) ||
          (col >= 2 && this.gems[row][col - 1].texture.key === type && this.gems[row][col - 2].texture.key === type)
        );
        this.spawnGem(row, col, type);
      }
    }
  }

  spawnGem(row, col, type) {
    const x = this.getGemX(col);
    const y = this.getGemY(row);
    
    const gem = this.add.sprite(x, y, type);
    
    gem.setDisplaySize(this.gemSize - 2, this.gemSize - 2);
    
    const baseTint = this.baseTints[type] || 0xffffff;
    gem.setTint(baseTint);

    gem.setInteractive();
    gem.row = row;
    gem.col = col;
    
    this.gems[row][col] = gem;
    return gem;
  }

  onGemDown(pointer, gem) {
    if (this.isProcessing) return;
    this.draggingGem = gem;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
  }

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

        if (this.isValidSlot(targetRow, targetCol)) {
            const targetGem = this.gems[targetRow][targetCol];
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

  onPointerUp(pointer) {
    if (this.draggingGem && !this.isProcessing) {
        this.handleGemClick(this.draggingGem);
    }
    this.draggingGem = null;
  }

  getDirectionFromAngle(angle) {
    const deg = Phaser.Math.RadToDeg(angle);
    if (deg >= -45 && deg <= 45) return 'RIGHT';
    if (deg > 45 && deg < 135) return 'DOWN';
    if (deg >= 135 || deg <= -135) return 'LEFT';
    return 'UP';
  }

  isValidSlot(row, col) {
      return row >= 0 && row < this.boardSize.rows && col >= 0 && col < this.boardSize.cols;
  }

  restoreGemSize(gem) {
    if (gem.texture.key === 'bomb' || gem.texture.key === 'dog') {
        gem.setDisplaySize(this.gemSize * 1.2, this.gemSize * 1.2);
    } else {
        gem.setDisplaySize(this.gemSize - 2, this.gemSize - 2);
    }
  }

  restoreGemTint(gem) {
      const type = gem.texture.key;
      const baseTint = this.baseTints[type] || 0xffffff;
      gem.setTint(baseTint);
  }

  handleGemClick(gem) {
    if (gem.texture.key === 'bomb') {
        this.explodeBomb(gem);
        return;
    }
    if (gem.texture.key === 'dog') {
        this.activateDog(gem);
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

  areAdjacent(gem1, gem2) {
    const rowDiff = Math.abs(gem1.row - gem2.row);
    const colDiff = Math.abs(gem1.col - gem2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  swapGems(gem1, gem2) {
    this.isProcessing = true;
    this.comboCount = 0;

    const tempRow = gem1.row;
    const tempCol = gem1.col;
    
    this.gems[gem1.row][gem1.col] = gem2;
    this.gems[gem2.row][gem2.col] = gem1;

    gem1.row = gem2.row;
    gem1.col = gem2.col;
    gem2.row = tempRow;
    gem2.col = tempCol;

    this.tweens.add({
      targets: [gem1, gem2],
      x: (target) => this.getGemX(target.col),
      y: (target) => this.getGemY(target.row),
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        if (this.checkMatches().length > 0) {
          this.handleMatches();
        } else {
          this.swapGemsReverse(gem1, gem2);
        }
      }
    });
  }

  swapGemsReverse(gem1, gem2) {
    this.gems[gem1.row][gem1.col] = gem2;
    this.gems[gem2.row][gem2.col] = gem1;

    const tempRow = gem1.row;
    const tempCol = gem1.col;
    gem1.row = gem2.row;
    gem1.col = gem2.col;
    gem2.row = tempRow;
    gem2.col = tempCol;

    this.tweens.add({
      targets: [gem1, gem2],
      x: (target) => this.getGemX(target.col),
      y: (target) => this.getGemY(target.row),
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.isProcessing = false;
      }
    });
  }

  checkMatches() {
    let matches = [];
    const isSpecial = (key) => key === 'bomb' || key === 'dog';

    for (let row = 0; row < this.boardSize.rows; row++) {
      for (let col = 0; col < this.boardSize.cols - 2; col++) {
        let gem1 = this.gems[row][col];
        let gem2 = this.gems[row][col + 1];
        let gem3 = this.gems[row][col + 2];
        
        if (gem1 && gem2 && gem3 && 
            !isSpecial(gem1.texture.key) &&
            gem1.texture.key === gem2.texture.key && 
            gem2.texture.key === gem3.texture.key) {
          matches.push(gem1, gem2, gem3);
        }
      }
    }
    
    for (let col = 0; col < this.boardSize.cols; col++) {
      for (let row = 0; row < this.boardSize.rows - 2; row++) {
        let gem1 = this.gems[row][col];
        let gem2 = this.gems[row + 1][col];
        let gem3 = this.gems[row + 2][col];

        if (gem1 && gem2 && gem3 &&
            !isSpecial(gem1.texture.key) &&
            gem1.texture.key === gem2.texture.key && 
            gem2.texture.key === gem3.texture.key) {
          matches.push(gem1, gem2, gem3);
        }
      }
    }
    return [...new Set(matches)];
  }

  createExplosionEffect(gem) {
    const x = gem.x;
    const y = gem.y;
    const type = gem.texture.key;
    const particleColor = this.particleColors[type] || 0xffffff;

    const particleCount = 10 + (this.comboCount * 5); 
    this.particleManager.emitParticleAt(x, y, particleCount);
    this.particleManager.setParticleTint(particleColor); 
  }

  createBomb() {
    const candidates = this.getValidCandidates();
    if (candidates.length > 0) {
        const target = Phaser.Math.RND.pick(candidates);
        target.setTexture('bomb');
        target.setDisplaySize(this.gemSize * 1.2, this.gemSize * 1.2);
        this.restoreGemTint(target); 
        this.addPulseTween(target);
        this.showComboText(target.x, target.y, "BOMB!");
    }
  }

  createDog() {
    const col = this.boardSize.cols - 1; 
    const candidates = [];
    
    for (let r = 0; r < this.boardSize.rows; r++) {
        const g = this.gems[r][col];
        if (g && g.active && g.texture.key !== 'bomb' && g.texture.key !== 'dog') {
            candidates.push(g);
        }
    }

    if (candidates.length > 0) {
        const target = Phaser.Math.RND.pick(candidates);
        target.setTexture('dog', 0); 
        target.setDisplaySize(this.gemSize * 1.2, this.gemSize * 1.2);
        this.restoreGemTint(target);
        this.addPulseTween(target);
        this.showComboText(target.x, target.y, "DOG!");
    }
  }

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

  getValidCandidates() {
    const candidates = [];
    for(let r=0; r<this.boardSize.rows; r++){
        for(let c=0; c<this.boardSize.cols; c++){
            const g = this.gems[r][c];
            if(g && g.active && g.texture.key !== 'bomb' && g.texture.key !== 'dog') {
                candidates.push(g);
            }
        }
    }
    return candidates;
  }

  explodeBomb(bombGem) {
    this.isProcessing = true;
    const centerRow = bombGem.row;
    const centerCol = bombGem.col;
    const range = 1;

    const destroyedGems = [];
    for (let r = centerRow - range; r <= centerRow + range; r++) {
        for (let c = centerCol - range; c <= centerCol + range; c++) {
            if (this.isValidSlot(r, c)) {
                const gem = this.gems[r][c];
                if (gem && gem.active) {
                    destroyedGems.push(gem);
                }
            }
        }
    }

    this.cameras.main.shake(300, 0.03);
    this.cameras.main.flash(200, 255, 100, 100);
    this.game.events.emit('addScore', destroyedGems.length * 200);

    destroyedGems.forEach(gem => {
        this.playMatchSound();
        this.createExplosionEffect(gem);
        this.gems[gem.row][gem.col] = null;
        gem.destroy();
    });

    this.showComboText(bombGem.x, bombGem.y, "BOOM!!");
    this.time.delayedCall(500, () => this.fillBoard());
  }

  activateDog(dogGem) {
    this.isProcessing = true;
    const row = dogGem.row;
    
    this.gems[row][dogGem.col] = null;
    
    this.tweens.killTweensOf(dogGem);

    dogGem.setDepth(100); 
    dogGem.play('dog_walk_anim');

    this.tweens.add({
        targets: dogGem,
        x: this.getGemX(-1), 
        duration: 1500,
        ease: 'Linear',
        onUpdate: () => {
            for (let c = 0; c < this.boardSize.cols; c++) {
                const target = this.gems[row][c];
                if (target && target.active) {
                    if (Math.abs(dogGem.x - target.x) < this.gemSize / 2) {
                        this.playMatchSound();
                        this.createExplosionEffect(target);
                        this.gems[row][c] = null;
                        target.destroy();
                        this.game.events.emit('addScore', 300);
                    }
                }
            }
        },
        onComplete: () => {
            dogGem.destroy();
            this.cameras.main.shake(400, 0.02);
            this.showComboText(400, 300, "YUMMY!");
            this.fillBoard();
        }
    });
  }

  showComboText(x, y, textOrCount) {
    let textStr = textOrCount;
    if (typeof textOrCount === 'number') {
        const count = textOrCount;
        textStr = `${count} Combo!`;
        if (count >= 3) textStr = 'Great!';
        if (count >= 5) textStr = 'Fantastic!!';
        if (count >= 7) textStr = 'UNBELIEVABLE!!!';
    }

    const textObj = this.add.text(x, y, textStr, {
      fontFamily: 'Arial Black',
      fontSize: '40px',
      color: '#ffdd00',
      stroke: '#000',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.tweens.add({
      targets: textObj,
      y: y - 100,
      scale: 1.5,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => textObj.destroy()
    });
  }

  handleMatches() {
    const matches = this.checkMatches();
    if (matches.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.comboCount++;
    const score = matches.length * 100 * this.comboCount;
    this.game.events.emit('addScore', score);

    let centerX = 0, centerY = 0;
    matches.forEach(gem => {
      centerX += gem.x;
      centerY += gem.y;
      this.playMatchSound();
      this.createExplosionEffect(gem);
      if (gem.active) {
        this.gems[gem.row][gem.col] = null;
        gem.destroy();
      }
    });

    if (matches.length > 0) {
        this.showComboText(centerX / matches.length, centerY / matches.length, this.comboCount);
    }

    if (this.comboCount >= 3) {
        this.createBomb();
    } else if (this.comboCount === 2) {
        this.createDog();
    }

    if (this.comboCount >= 4) {
        this.cameras.main.flash(200, 255, 255, 255);
    }

    this.time.delayedCall(200, () => this.fillBoard());
  }

  fillBoard() {
    let maxDuration = 0;

    for (let col = 0; col < this.boardSize.cols; col++) {
      let emptySlots = 0;
      
      for (let row = this.boardSize.rows - 1; row >= 0; row--) {
        if (this.gems[row][col] === null) {
          emptySlots++;
        } else if (emptySlots > 0) {
          const gem = this.gems[row][col];
          const newRow = row + emptySlots;
          
          this.gems[newRow][col] = gem;
          this.gems[row][col] = null;
          gem.row = newRow;

          this.tweens.add({
            targets: gem,
            y: this.getGemY(newRow),
            duration: 400,
            ease: 'Bounce.easeOut'
          });
        }
      }

      for (let i = 0; i < emptySlots; i++) {
        const row = emptySlots - 1 - i;
        const type = Phaser.Math.RND.pick(this.gemTypes);
        const startY = this.getGemY(row) - (emptySlots * this.gemSize) - 50;
        const destY = this.getGemY(row);

        const gem = this.spawnGem(row, col, type);
        gem.y = startY;

        this.tweens.add({
          targets: gem,
          y: destY,
          duration: 500,
          ease: 'Bounce.easeOut',
          delay: i * 80
        });

        maxDuration = Math.max(maxDuration, 500 + i * 80);
      }
    }

    this.time.delayedCall(maxDuration + 150, () => {
      if (this.checkMatches().length > 0) {
        this.handleMatches();
      } else {
        this.isProcessing = false;
      }
    });
  }
}