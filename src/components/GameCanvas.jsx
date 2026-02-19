import { onMount, onCleanup } from 'solid-js';
import Phaser from 'phaser';
import { AnipangScene } from '../game/AnipangScene';

export default function GameCanvas(props) {
  let gameContainer;
  let gameInstance;

  onMount(() => {
    const config = {
      type: Phaser.AUTO,
      // 부모 컨테이너의 크기에 맞춰서 100% 채움
      scale: {
        mode: Phaser.Scale.RESIZE, 
        parent: gameContainer,
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      backgroundColor: '#2d2d2d',
      physics: {
        default: 'arcade',
      },
      scene: [AnipangScene],
    };

    gameInstance = new Phaser.Game(config);

    gameInstance.events.on('addScore', (score) => {
      if (props.onScoreUpdate) {
        props.onScoreUpdate(score);
      }
    });

    // 게임 타이머/종료 이벤트 포워딩
    gameInstance.events.on('tick', (secondsLeft) => {
      if (props.onTick) props.onTick(secondsLeft);
    });

    gameInstance.events.on('gameOver', () => {
      if (props.onGameOver) props.onGameOver();
    });

    gameInstance.events.on('timeBonus', () => {
      if (props.onTimeBonus) props.onTimeBonus();
    });
  });

  onCleanup(() => {
    if (gameInstance) {
      gameInstance.destroy(true);
    }
  });

  return (
    <div 
      ref={gameContainer} 
      id="game-container" 
      style={{ 
        width: '100%', 
        height: '80vh', // 모바일에서 스크롤 없이 보이도록 높이 조정
        overflow: 'hidden',
        "touch-action": "none" // 모바일 터치 시 브라우저 스크롤 방지
      }} 
    />
  );
}