import { createSignal, createEffect } from 'solid-js';
import GameCanvas from './components/GameCanvas';
import titleImg from './assets/title.png';
import './App.css'; // 기본 CSS는 비웁니다.

function App() {
  const [score, setScore] = createSignal(0);
  const [timeLeft, setTimeLeft] = createSignal(60);
  const [timeDamagedFlash, setTimeDamagedFlash] = createSignal(false);
  const [gameOver, setGameOver] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(false);
  const [timeBonusActive, setTimeBonusActive] = createSignal(false);
  const [showTimeBonusText, setShowTimeBonusText] = createSignal(false);

  // 윈도우 크기 감지
  createEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const isMobileValue = width <= 600; // 600px 이하는 모바일로 판단
      console.log('Screen width:', width, 'isMobile:', isMobileValue);
      setIsMobile(isMobileValue);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });

  const handleScoreUpdate = (points) => {
    setScore((prev) => prev + points);
  };

  const handleTick = (secondsLeft) => setTimeLeft(secondsLeft);
  const handleGameOver = () => setGameOver(true);
  
  const handleTimeBonus = () => {
    setTimeBonusActive(true);
    setTimeout(() => setTimeBonusActive(false), 200);
    
    // "+10" 텍스트 1초 동안 표시
    setShowTimeBonusText(true);
    setTimeout(() => setShowTimeBonusText(false), 1000);
  };

  const handleTimeDamaged = (damage) => {
    // flash the time display red briefly
    setTimeDamagedFlash(true);
    setTimeout(() => setTimeDamagedFlash(false), 300);
  };

  return (
    <div style={{ "text-align": "center", "font-family": "Arial, sans-serif", "width": "100%", "height": "100%", "display": "flex", "flex-direction": "column", "overflow": "hidden" }}>
      <img src={titleImg} alt="냐냐팡" style={{ 
        "width": isMobile() ? "300px" : "60vw", 
        "max-width": isMobile() ? "300px" : "500px",
        "height": "auto", 
        "margin": "10px auto 0px auto"
      }} />

      <div style={{ display: 'flex', 'justify-content': 'center', gap: '100px', 'align-items': 'center' }}>
        <div style={{ "margin-bottom": "5px", "font-size": "28px", "font-weight": "bold", "color": "#ffdb78" }}>
          {score()}
        </div>

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{ "margin-bottom": "5px", "font-size": timeBonusActive() ? "28px" : "28px", "font-weight": "bold", "color": timeDamagedFlash() ? "#ff4d4d" : (timeBonusActive() ? "#41c73c" : "#ffffff"), "transition": "font-size 0.2s ease-in-out, color 0.15s ease-in-out" }}>
            {timeLeft()}
          </div>
          
          {showTimeBonusText() && (
            <div style={{
              position: 'absolute',
              right: '-50px',
              top: '0',
              "font-size": "20px",
              "font-weight": "bold",
              color: '#41c73c',
              animation: 'fadeOutBonus 1s ease-in-out forwards'
            }}>
              +10
            </div>
          )}
        </div>
      </div>

      <div style={{ 
        position: 'relative',
        "width": "100%",
        "flex": "1"
      }}>
        <GameCanvas onScoreUpdate={handleScoreUpdate} onTick={handleTick} onGameOver={handleGameOver} onTimeBonus={handleTimeBonus} onTimeDamaged={handleTimeDamaged} />

        {gameOver() && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            'justify-content': 'center',
            'align-items': 'center',
            'z-index': 1000
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
              border: '4px solid #ffdb78',
              'border-radius': '20px',
              padding: '40px',
              'text-align': 'center',
              'box-shadow': '0 10px 40px rgba(0, 0, 0, 0.5)',
              'max-width': '400px',
              animation: 'slideIn 0.4s ease-out'
            }}>
              <h2 style={{ margin: '0 0 16px 0', color: '#ffdb78', 'font-size': '28px' }}>게임 종료</h2>
              
              <div style={{
                'font-size': '48px',
                'font-weight': 'bold',
                color: '#ff7aa2',
                margin: '24px 0 32px 0',
                'text-shadow': '2px 2px 4px rgba(0, 0, 0, 0.5)'
              }}>
                {score()}냥
              </div>

              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '14px 40px',
                  'font-size': '18px',
                  'font-weight': 'bold',
                  'border-radius': '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ffdb78 0%, #ffc857 100%)',
                  color: '#000',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  'box-shadow': '0 4px 12px rgba(255, 219, 120, 0.3)',
                  ':hover': { transform: 'scale(1.05)', 'box-shadow': '0 6px 16px rgba(255, 219, 120, 0.5)' }
                }}
              >
                다시 시작
              </button>
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          @keyframes fadeOutBonus {
            0% {
              opacity: 1;
              transform: translateX(0);
            }
            100% {
              opacity: 0;
              transform: translateX(30px);
            }
          }
        `}
      </style>
    </div>
  );
}

export default App;