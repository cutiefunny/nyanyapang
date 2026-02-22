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
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveMessage, setSaveMessage] = createSignal('');
  const [showRanking, setShowRanking] = createSignal(false);
  const [topScores, setTopScores] = createSignal([]);
  
  // 간단한 해시 함수
  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  };

  // 기기 정보 수집 함수
  const getDeviceFingerprint = () => {
    const nav = navigator;
    const screen_info = `${window.screen.width}x${window.screen.height}`;
    const userAgent = nav.userAgent;
    const language = nav.language;
    const timezone = new Date().getTimezoneOffset();
    const cores = nav.hardwareConcurrency || 'unknown';
    const memory = nav.deviceMemory || 'unknown';
    
    const fingerprint = `${userAgent}|${screen_info}|${language}|${timezone}|${cores}|${memory}`;
    return simpleHash(fingerprint);
  };

  // deviceID 생성 함수 (기기 정보 포함)
  const generateDeviceId = () => {
    const fingerprint = getDeviceFingerprint();
    const timestamp = Date.now().toString(36);
    return `device_${fingerprint}_${timestamp}`;
  };

  // localStorage에서 deviceID 로드 (없으면 새로 생성)
  const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem('deviceId', deviceId);
      console.log('새 deviceID 생성:', deviceId);
    }
    return deviceId;
  };

  const [deviceId] = createSignal(getOrCreateDeviceId());

  // localStorage에서 저장된 이름 로드
  const [playerName, setPlayerName] = createSignal(localStorage.getItem('playerName') || '');

  // 이름 검증 함수 (한글 6글자, 영문 10글자)
  const validatePlayerName = (name) => {
    const koreanChars = (name.match(/[\uac00-\ud7a3]/g) || []).length;
    const englishChars = (name.match(/[a-zA-Z0-9]/g) || []).length;
    return koreanChars <= 6 && englishChars <= 10;
  };

  // 이름 입력 처리
  const handleNameInput = (value) => {
    if (validatePlayerName(value)) {
      setPlayerName(value);
    }
  };

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

  // 랜덤 이름 생성 함수 (접두사 + 접미사)
  const generateRandomName = () => {
    const prefixes = ['귀여운', '근육질', '머슬업', '역도', '헬쓰', '쇠질', '롹앤롤', '용감한', '똑똑한', '빠른', '강한', '착한', '반짝이는', '우아한', '야무진', '영리한', '활발한', '조용한', '친절한', '신비로운', '멋진'];
    const suffixes = ['턱시도', '고양이', '치즈', '러블', '코숏', '냥이', '길냥이', '발바닥', '츄르', '젤리', '아메숏', '카오스', '삼색이', '못난이', '고등어', '하양이', '까망이','개냥이','무릎냥'];
    
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return randomPrefix + randomSuffix;
  };

  // 날짜 포맷 함수 (YYYY-MM-DD HH:mm:ss)
  const formatDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const handleSaveScore = async () => {
    if (!playerName().trim()) {
      setSaveMessage('이름을 입력해주세요');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('저장 중...');

    try {
      const now = new Date();
      const finalName = playerName().trim() || generateRandomName();
      const param = {
        name: finalName,
        score: score(),
        deviceId: deviceId(),
        createTm: formatDateTime(now),
        createTs: now
      };

      const response = await fetch('https://musclecat.co.kr/nyanyapang/saveScore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(param)
      });

      const data = await response.json();

      if (data.result === 'success' || data.result === 'skip') {
        // localStorage에 이름 저장
        localStorage.setItem('playerName', playerName().trim());
        if (data.result === 'success') setSaveMessage('✓ 점수가 저장되었습니다!');
        // skip인 경우 아무 메시지도 표시하지 않음
        
        // 1초 후 랭킹 조회
        setTimeout(async () => {
          try {
            const rankingResponse = await fetch('https://musclecat.co.kr/nyanyapang/getRecentScores?limit=10', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            const rankingData = await rankingResponse.json();
            if (rankingData.result === 'success' && rankingData.data) {
              setTopScores(rankingData.data);
              setShowRanking(true);
              setGameOver(false);
            }
          } catch (err) {
            console.error('Error fetching ranking:', err);
            window.location.reload();
          }
        }, 1000);
      } else {
        setSaveMessage('✗ 저장 실패: ' + (data.message || '알 수 없는 오류'));
        setIsSaving(false);
      }
    } catch (err) {
      console.error('Error saving score:', err);
      setSaveMessage('✗ 저장 중 오류가 발생했습니다');
      setIsSaving(false);
    }
  };

  return (
    <div style={{ "text-align": "center", "font-family": "Arial, sans-serif", "width": "100%", "height": "100%", "display": "flex", "flex-direction": "column", "overflow": "hidden" }}>
      <img src={titleImg} alt="냐냐팡" style={{ 
        "width": isMobile() ? "300px" : "60vw", 
        "max-width": isMobile() ? "300px" : "500px",
        "height": "auto", 
        "margin": "10px auto 0px auto"
      }} />

      <div style={{ display: 'flex', 'justify-content': 'center', gap: '80px', 'align-items': 'center' }}>
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

        <button
          onClick={() => {
            setScore(0);
            setTimeLeft(60);
            setGameOver(false);
            setTimeDamagedFlash(false);
            window.location.reload();
          }}
          style={{
            padding: '3px 8px',
            "font-size": "12px",
            "font-weight": "bold",
            "border-radius": "8px",
            border: "2px solid #ffdb78",
            background: "#333333",
            color: "#ffdb78",
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#ffdb78";
            e.target.style.color = "#000";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#333333";
            e.target.style.color = "#ffdb78";
          }}
        >
          재시작
        </button>
      </div>

      <div style={{ 
        position: 'relative',
        "width": "100%",
        "flex": "1"
      }}>
        <GameCanvas onScoreUpdate={handleScoreUpdate} onTick={handleTick} onGameOver={handleGameOver} onTimeBonus={handleTimeBonus} onTimeDamaged={handleTimeDamaged} />

        {gameOver() && !showRanking() && (
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

              <input
                type="text"
                placeholder="플레이어 이름 (한글 6글자 또는 영문 10글자 이내)"
                value={playerName()}
                onInput={(e) => handleNameInput(e.target.value)}
                disabled={isSaving()}
                style={{
                  width: '100%',
                  padding: '12px',
                  'font-size': '16px',
                  'border-radius': '8px',
                  border: '2px solid #ffdb78',
                  background: '#1a1a1a',
                  color: '#fff',
                  'margin-bottom': '12px',
                  'box-sizing': 'border-box',
                  opacity: isSaving() ? 0.6 : 1,
                  cursor: isSaving() ? 'not-allowed' : 'text'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isSaving()) {
                    handleSaveScore();
                  }
                }}
              />

              {saveMessage() && (
                <div style={{
                  color: saveMessage().includes('✓') ? '#41c73c' : '#ff6b6b',
                  'font-size': '14px',
                  'margin-bottom': '12px',
                  'min-height': '20px'
                }}>
                  {saveMessage()}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSaveScore}
                  disabled={isSaving()}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    'font-size': '16px',
                    'font-weight': 'bold',
                    'border-radius': '10px',
                    border: 'none',
                    background: isSaving() ? '#8b8b8b' : 'linear-gradient(135deg, #41c73c 0%, #2a8b1f 100%)',
                    color: '#fff',
                    cursor: isSaving() ? 'not-allowed' : 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    'box-shadow': '0 4px 12px rgba(65, 199, 60, 0.3)',
                    opacity: isSaving() ? 0.7 : 1
                  }}
                >
                  {isSaving() ? '저장 중...' : '점수 저장'}
                </button>

                <button
                  onClick={() => window.location.reload()}
                  disabled={isSaving()}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    'font-size': '16px',
                    'font-weight': 'bold',
                    'border-radius': '10px',
                    border: 'none',
                    background: isSaving() ? '#8b8b8b' : 'linear-gradient(135deg, #ffdb78 0%, #ffc857 100%)',
                    color: '#000',
                    cursor: isSaving() ? 'not-allowed' : 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    'box-shadow': '0 4px 12px rgba(255, 219, 120, 0.3)',
                    opacity: isSaving() ? 0.7 : 1
                  }}
                >
                  다시 시작
                </button>
              </div>
            </div>
          </div>
        )}

        {showRanking() && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            'justify-content': 'center',
            'align-items': 'center',
            'z-index': 1000,
            'overflow-y': 'auto'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
              border: '4px solid #ffdb78',
              'border-radius': '20px',
              padding: '32px',
              'text-align': 'center',
              'box-shadow': '0 10px 40px rgba(0, 0, 0, 0.5)',
              'max-width': '500px',
              animation: 'slideIn 0.4s ease-out',
              'max-height': '650px',
              'display': 'flex',
              'flex-direction': 'column'
            }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#ffdb78', 'font-size': '32px' }}>🏆 TOP 10 순위</h2>
              
              <div style={{
                display: 'grid',
                'grid-template-columns': '1fr',
                gap: '0px',
                'margin-bottom': '24px',
                'flex': '1',
                'overflow-y': 'auto',
                'border': '1px solid rgba(255, 255, 255, 0.1)',
                'border-radius': '8px',
                'background': '#0a0a0a'
              }}>
                {topScores().map((entry, index) => (
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center',
                    padding: '6px 14px',
                    background: index === 0 ? 'rgba(255, 215, 0, 0.15)' : index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    'border-bottom': index < topScores().length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                    color: '#fff',
                    'transition': 'background 0.2s ease'
                  }}>
                    <div style={{ 'text-align': 'left', flex: 1, 'display': 'flex', 'align-items': 'center' }}>
                      <div style={{ 
                        'font-size': '18px', 
                        'min-width': '30px',
                        'text-align': 'center'
                      }}>
                        {(() => {
                          const medals = ['🥇', '🥈', '🥉'];
                          return medals[index] || `#${index + 1}`;
                        })()}
                      </div>
                      <div style={{ 
                        'font-size': '14px', 
                        'margin-left': '12px',
                        color: index === 0 ? '#ffd700' : '#ffffff'
                      }}>
                        {entry.name}
                      </div>
                    </div>
                    <div style={{ 'font-size': '16px', 'font-weight': 'bold', color: '#41c73c' }}>
                      {entry.score}
                    </div>
                  </div>
                ))}
                {topScores().length === 0 && (
                  <div style={{ color: '#ff6b6b', padding: '20px' }}>
                    데이터를 불러올 수 없습니다
                  </div>
                )}
              </div>

              <button
                onClick={() => window.location.reload()}
                style={{
                  width: '100%',
                  padding: '14px 40px',
                  'font-size': '18px',
                  'font-weight': 'bold',
                  'border-radius': '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ffdb78 0%, #ffc857 100%)',
                  color: '#000',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  'box-shadow': '0 4px 12px rgba(255, 219, 120, 0.3)'
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