import { onMount, onCleanup } from 'solid-js';
import Phaser from 'phaser';
import { AnipangScene } from '../game/AnipangScene';
import { PreloaderScene } from '../game/PreloaderScene';

export default function GameCanvas(props) {
  let gameContainer;
  let gameInstance;
  let retryAttempt = 0;

  const sendLog = (message, level = 'info') => {
    console.log(`[${level.toUpperCase()}] [Phaser] ${message}`);
    
    // 프로덕션 환경에서만 Vercel 로그에 전송
    if (import.meta.env.PROD) {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          level,
          userAgent: navigator.userAgent 
        })
      }).catch(() => {
        // API 호출 실패는 무시
      });
    }
  };

  onMount(() => {
    if (!gameContainer) {
      sendLog('Game container not mounted', 'warn');
      return;
    }

    const parentWidth = gameContainer.clientWidth || window.innerWidth;
    const parentHeight = gameContainer.clientHeight || window.innerHeight;

    const createGame = (forceRenderer = null) => {
      const config = {
        type: forceRenderer || Phaser.AUTO,
        scale: {
          mode: Phaser.Scale.FIT,
          parent: gameContainer,
          width: parentWidth,
          height: parentHeight,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        backgroundColor: '#2d2d2d',
        physics: {
          default: 'arcade',
        },
        scene: [PreloaderScene, AnipangScene],
        callbacks: {
          postBoot: (game) => {
            const rendererType = game.renderer.type === Phaser.CANVAS ? 'CANVAS' : 'WEBGL';
            sendLog(`Booted with renderer: ${rendererType}`, 'info');
            
            // WebGL 생성 후 context 검증
            if (rendererType !== 'CANVAS' && !forceRenderer && !game.renderer.gl) {
              sendLog('WebGL context invalid, falling back to Canvas...', 'warn');
              setTimeout(() => {
                game.destroy(true);
                createGame(Phaser.CANVAS);
              }, 100);
            }
          }
        }
      };

      try {
        gameInstance = new Phaser.Game(config);
        sendLog('Game created successfully', 'info');
        
        // 이벤트 리스너 등록
        gameInstance.events.on('addScore', (score) => {
          if (props.onScoreUpdate) props.onScoreUpdate(score);
        });
        gameInstance.events.on('tick', (secondsLeft) => {
          if (props.onTick) props.onTick(secondsLeft);
        });
        gameInstance.events.on('gameOver', () => {
          if (props.onGameOver) props.onGameOver();
        });
        gameInstance.events.on('timeBonus', () => {
          if (props.onTimeBonus) props.onTimeBonus();
        });
      } catch (err) {
        sendLog(`Creation failed: ${err.message}`, 'error');
        retryAttempt++;
        
        if (retryAttempt <= 2 && !forceRenderer) {
          sendLog('Retrying with Canvas renderer...', 'warn');
          createGame(Phaser.CANVAS);
          return;
        }
        
        // 최종 실패
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:absolute; top:0; left:0; right:0; padding:16px; color:#fff; background:rgba(0,0,0,0.8); text-align:center; font-size:14px;';
        errorDiv.textContent = '게임 렌더러 초기화 실패. 브라우저 업데이트 후 재시도해주세요.';
        gameContainer.appendChild(errorDiv);
      }
    };

    // Auto로 먼저 시도
    createGame();

    // 사운드 재생 가능하도록 첫 터치 시 오디오 context resume
    const unlockAudio = () => {
      try {
        if (gameInstance?.sound?.context?.resume) {
          gameInstance.sound.context.resume().catch(() => {});
        }
      } catch (e) {
        // 무시
      }
    };
    
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    window.addEventListener('mousedown', unlockAudio, { once: true });

    // { once: true }는 이벤트 미발생 시 자동 제거되지 않으므로 명시적 제거 등록
    onCleanup(() => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('mousedown', unlockAudio);
    });
  });

  onCleanup(() => {
    if (gameInstance) {
      gameInstance.destroy(true);
    }
  });

  return (
    <div 
      ref={el => (gameContainer = el)}
      id="game-container" 
      style={{ 
        width: '100%', 
        height: '80vh',
        overflow: 'hidden',
        "touch-action": "none"
      }} 
    />
  );
}