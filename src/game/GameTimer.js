/**
 * GameTimer - 게임 타이머 관리
 */
import { GAME_CONFIG } from './GameConstants';

export class GameTimer {
  constructor(scene) {
    this.scene = scene;
    this.timerStarted = false;
    this.timeLeft = GAME_CONFIG.INITIAL_TIME;
    this._tickEvent = null;
  }

  /**
   * 카운트다운 시작
   */
  start() {
    if (this.timerStarted) return;
    this.timerStarted = true;
    this.timeLeft = GAME_CONFIG.INITIAL_TIME;

    this._tickEvent = this.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timeLeft -= 1;
        if (this.timeLeft < 0) this.timeLeft = 0;
        if (this.scene.game && this.scene.game.events) {
          this.scene.game.events.emit('tick', this.timeLeft);
        }

        // 시간이 0이 되면 게임 종료
        if (this.timeLeft <= 0) {
          this.end();
        }
      }
    });
  }

  /**
   * 게임 종료
   */
  end() {
    this.timerStarted = false;
    this.scene.isProcessing = true;
    this.scene.input.enabled = false;

    this.scene.tweens.killAll();
    if (this._tickEvent) this._tickEvent.remove(false);

    if (this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('gameOver');
    }
  }

  /**
   * 시간 추가
   */
  addTime(seconds) {
    this.timeLeft += seconds;
    if (this.scene.game && this.scene.game.events) {
      this.scene.game.events.emit('tick', this.timeLeft);
    }
  }

  /**
   * 정리
   */
  destroy() {
    if (this._tickEvent) {
      this._tickEvent.remove();
      this._tickEvent = null;
    }
  }
}
