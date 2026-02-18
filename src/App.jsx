import { createSignal } from 'solid-js';
import GameCanvas from './components/GameCanvas';
import './App.css'; // 기본 CSS는 비웁니다.

function App() {
  const [score, setScore] = createSignal(0);

  const handleScoreUpdate = (points) => {
    setScore((prev) => prev + points);
  };

  return (
    <div style={{ "text-align": "center", "font-family": "Arial, sans-serif", "padding": "20px" }}>
      <h1>1분 냐냐팡</h1>
      
      <div style={{ "margin-bottom": "20px", "font-size": "24px", "font-weight": "bold", "color": "#ffdb78" }}>
        {score()}냥
      </div>

      <GameCanvas onScoreUpdate={handleScoreUpdate} />
    </div>
  );
}

export default App;