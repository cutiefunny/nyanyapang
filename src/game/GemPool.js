import Phaser from 'phaser';

/**
 * GemPool - Gem 객체 재사용 풀
 * 게임 진행 중 생성/삭제되는 gem의 GC 압력을 줄임
 * 미리 생성된 gem을 재사용하여 메모리 효율 개선
 */
export class GemPool {
  constructor(scene, initialSize = 100) {
    this.scene = scene;
    this.initialSize = initialSize;
    this.available = []; // 사용 가능한 gem
    this.inUse = new Set(); // 현재 사용 중인 gem
    
    // 초기 풀 생성
    this.createInitialPool();
  }

  /**
   * 초기 gem 풀 생성
   */
  createInitialPool() {
    for (let i = 0; i < this.initialSize; i++) {
      const gem = this.createGemSprite();
      gem.active = false;
      gem.visible = false;
      this.available.push(gem);
    }
  }

  /**
   * 새 gem sprite 생성 (풀 내부용)
   */
  createGemSprite() {
    const gem = this.scene.add.sprite(0, 0, 'empty');
    gem.setDepth(100);
    gem.pooled = true; // 폴링 시스템 표시
    return gem;
  }

  /**
   * 풀에서 gem 가져오기
   */
  get(x, y, type) {
    let gem;

    if (this.available.length > 0) {
      // 사용 가능한 gem 재사용
      gem = this.available.pop();
      gem.active = true;
      gem.visible = true;
    } else {
      // 풀이 부족하면 새로 생성
      gem = this.createGemSprite();
      gem.active = true;
      gem.visible = true;
    }

    // gem 초기화
    gem.x = x;
    gem.y = y;
    gem.type = type;
    gem.texture.key = type; // Phaser sprite의 texture
    gem.setTexture(type); // 텍스처 변경
    
    this.inUse.add(gem);
    return gem;
  }

  /**
   * gem을 풀로 반환
   */
  return(gem) {
    if (!gem || !gem.pooled) {
      return;
    }

    // 풀에서 제거
    this.inUse.delete(gem);

    // gem 상태 초기화
    gem.active = false;
    gem.visible = false;
    gem.x = 0;
    gem.y = 0;
    gem.type = null;
    gem.row = null;
    gem.col = null;
    
    // 애니메이션 정리
    if (this.scene.tweens) {
      this.scene.tweens.killTweensOf(gem);
    }

    // 풀에 추가
    this.available.push(gem);
  }

  /**
   * 모든 gem 정리 (씬 종료 시)
   */
  shutdown() {
    // 사용 중인 gem 정리
    this.inUse.forEach(gem => {
      if (gem && gem.destroy) {
        gem.destroy();
      }
    });
    this.inUse.clear();

    // 사용 가능한 gem 정리
    this.available.forEach(gem => {
      if (gem && gem.destroy) {
        gem.destroy();
      }
    });
    this.available = [];
  }

  /**
   * 풀 상태 반환 (디버깅용)
   */
  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
}
