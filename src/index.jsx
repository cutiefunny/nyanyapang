/* @refresh reload */
import { render } from 'solid-js/web';
import './index.css';
import App from './App';

// 개발자님의 index.html에 있는 <div id="app"></div>을 찾습니다.
const root = document.getElementById('app');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

// SolidJS 앱을 마운트합니다.
render(() => <App />, root);