# 냐냐팡 코드 리뷰

> 분석 기준: 메모리 누수 / 코드 중복 / 최적화  
> (`isProcessing` 조기 해제는 의도된 동시성 컨셉으로 제외)

---

## 💧 메모리 누수 (3건)

| # | 파일 | 내용 | 상태 |
|---|------|------|------|
| 1 | `BoardManager.js` | `setTimeout` 사용 — 씬 파괴 후에도 콜백 실행됨 | ✅ 수정 완료 |
| 2 | `GameCanvas.jsx` | `window` 이벤트 리스너 미제거 — `{ once: true }`는 이벤트 미발생 시 미제거 | ✅ 수정 완료 |
| 3 | `AnipangScene.js` | `shutdown()`에서 `particleManager.destroy()` 누락 | ✅ 수정 완료 |

### 상세

**1. BoardManager.js — `setTimeout` → Phaser `time.delayedCall`**  
씬이 파괴(게임 오버, `scene.restart()`)되어도 네이티브 타이머는 계속 실행되며
destroyed된 씬 객체(`this.scene`, `this.finalizePositions()`)에 접근을 시도함.  
Phaser의 `time.delayedCall`은 씬 종료 시 자동 정리됨.

**2. GameCanvas.jsx — `onMount` 내부에서 `onCleanup` 등록**  
`{ once: true }`는 이벤트가 실제 발화했을 때만 자동 제거됨.
게임 시작 전 컴포넌트가 언마운트되면 리스너가 `window`에 잔류함.  
SolidJS 패턴: `onMount` 내부의 `onCleanup`은 closure로 `unlockAudio` 참조를 유지함.

**3. AnipangScene.js — `particleManager.destroy()` 누락**  
기존 `emitParticleAt(0, 0, 1)` 호출은 정리가 아닌 파티클 발사임.  
Phaser 파티클 에미터는 내부적으로 텍스처·프레임 참조를 유지하므로 `destroy()` 필요.

---

## 🔁 코드 중복 (5건)

| # | 파일 | 내용 | 상태 |
|---|------|------|------|
| 4 | `AnipangScene.js` | `BOARD_CHECK_CONFIG` 로컬 재선언 — `GameConstants.js`에 이미 export됨 | ✅ 수정 완료 |
| 5 | 5개 파일 | 젬 크기 로직(`gemSize - 2`, `gemSize * 1.0`) 분산 — `GameConstants` 상수 미활용 + `SPECIAL_GEM_SCALE = 1.0`으로 누적 스케일링 버그 회피 | ✅ 수정 완료 |
| 6 | `BoardManager.js` / `AnipangScene.js` | 물리 좌표 겹침 감지 로직 중복 구현 | ✅ 수정 완료 |
| 7 | `BoardManager.js` | `fillBoardWithBomb()` — 미호출 dead code + `spawnGem()`과 로직 중복 | ✅ 수정 완료 |
| 8 | `GemPool.js`, `counter.js` | 파일 전체가 미사용 dead code | ✅ 수정 완료 |

---

## ⚡ 최적화 (4건)

| # | 파일 | 내용 | 상태 |
|---|------|------|------|
| 9 | `AnipangScene.js` → `BoardManager.js` | `update()` 매 프레임 `new Map()` 생성 (60fps × 64칸 순회) | ⬜ 미수정 |
| 10 | `AnipangScene.js` | `checkMatches()` 중복 호출 — `swapGems`, `handleMatchesAfterExplosion` 각 2회씩 | ⬜ 미수정 |
| 11 | `BoardManager.js` | `fillBoard()` 내부에서 `maxDuration` 계산 후 `return 0` — 호출부 타이밍 오작동 | ⬜ 미수정 |
| 12 | `ExplosionManager.js` | `activateAngryDog()` 다중 tween `onUpdate`마다 독립적으로 64칸 순회 중복 | ⬜ 미수정 |
    this.sound.stopAll();
  }
  ```

### 3. **Tween 메모리 누수**
**파일**: 전체 (특히 fillBoard, activateDog)
- **문제**: 게임 종료 시 진행 중인 tweens이 자동으로 정리되지 않음
- **증상**: 오래 플레이할수록 느려짐
- **해결책**: 
  ```javascript
  // create()에서
  this.tweens.onComplete.add(() => {
    // 정리 로직
  });
  ```

---

## 🟠 PERFORMANCE ISSUES

### 1. **checkBoardEmptySpaces() 최적화 필요**
**파일**: AnipangScene.js
- **문제**: 10초마다 전체 보드를 순회 (64개 cells * 3번 순회)
- **현재 복잡도**: O(n³) = 64 * 64 * 64 * 3 = ~786,000 연산/10초
- **개선안**:
  ```javascript
  // 대신 필요한 경우만 체크
  checkBoardEmptySpaces() {
    // 배열 중심 체크 (한 번 순회)
    const hasDuplicates = this.checkArrayDuplicates();
    
    // 배열에 중복이 있을 때만 물리적 체크
    if (hasDuplicates) {
      const hasOverlaps = this.checkPhysicalOverlaps();
    }
  }
  ```

### 2. **fillBoard() 반복 호출 오버헤드**
**파일**: BoardManager.js
- **문제**: 중간에 checkBoardEmptySpaces() 호출로 추가 순회
- **개선안**: fillBoard() 완료 후 1회만 체크, 나머지는 10초 타이머 사용

### 3. **createBoard() 초기 생성 최적화**
**파일**: BoardManager.js (line 25-31)
- **현재**: 매번 3-match 체크로 순회
- **최적화**:
  ```javascript
  // 현재 (비효율)
  while (
    (row >= 2 && this.gems[row - 1][col].texture.key === type && ...) ||
    (col >= 2 && ...)
  )
  
  // 개선
  while (this.hasConsecutiveMatches(row, col, type)) { }
  ```

---

## 🟡 ERROR HANDLING & STABILITY

### 1. **Null 체크 부족**
**파일**: 여러 파일
- **위험 위치**:
  ```javascript
  // BoardManager.js line 24-29
  while (
    (row >= 2 && this.gems[row - 1][col].texture.key === type && ...) // gems[row-1][col] null일 수 있음
    ...
  )
  ```
- **수정**:
  ```javascript
  while (
    (row >= 2 && this.gems[row - 1]?.[col]?.texture?.key === type && ...) ||
    (col >= 2 && this.gems[row]?.[col - 1]?.texture?.key === type && ...)
  ) { }
  ```

### 2. **배열 바운드 체크**
**파일**: 모든 매니저
- **문제**: isValidSlot() 체크가 일부 장소에서 누락
- **예**:
  ```javascript
  // ExplosionManager.js line 47-48 - OK
  if (this.boardManager.isValidSlot(r, c)) {
    
  // 하지만 다른 곳에서는:
  const gem = gems[row][col]; // 경계 체크 없음
  ```

### 3. **Active 상태 체크**
**파일**: MatchChecker.js
- **문제**: gem.active 체크가 불완전
  ```javascript
  if (gem1 && gem2 && gem3 &&  // null 체크만 함
  ```
- **개선**:
  ```javascript
  if (gem1?.active && gem2?.active && gem3?.active && ...)
  ```

---

## 🟡 CODE QUALITY ISSUES

### 1. **콘솔 로그 정리**
**파일**: AnipangScene.js (checkBoardEmptySpaces)
- **현재 상태**: 디버깅 로그 과다
  ```javascript
  console.log('[Board Check] 보드 상태 검사 시작');
  console.log('[Board Check] 배열: ${allGems.length}개 gems, 빈공간: ${emptySpaces.length}개');
  console.log('[Board Check] 물리좌표: ${positionMap.size}개 위치');
  // ... 10개 이상의 로그
  ```
- **해결**: 프로덕션 환경에서 조건부 로깅
  ```javascript
  const DEBUG = false; // 또는 import.meta.env.DEV
  if (DEBUG) console.log(...);
  ```

### 2. **드래그 로직 개선**
**파일**: AnipangScene.js (handleDragStart, handleDragEnd)
- **문제**: 드래그 중 중복 처리 가능
- **현재**: 
  ```javascript
  this.draggingGem = gem;  // 중복 할당 가능
  ```
- **개선**:
  ```javascript
  if (this.draggingGem) return; // 이미 드래그 중이면 무시
  ```

### 3. **매직 넘버 제거**
**전체 파일**에서 하드코딩된 값들:
- `this.timeLeft = 60` → 상수로 빼기
- `200 * (index + 1)` 타이밍 → config로 관리
- `0.7` 볼륨 값 → 설정 객체로
- `1 + chainDepth` 범위 계산 → 별도 메서드

---

## 🟢 OPTIMIZATION OPPORTUNITIES

### 1. **Gem 풀링 시스템** (최우선)
**문제**: 매번 gem 생성/삭제로 GC 압박
**해결책**:
```javascript
// gem 풀 관리
class GemPool {
  constructor(scene, poolSize = 100) {
    this.pool = [];
    // 미리 gem 생성해두고 재사용
  }
  
  get() { return this.pool.pop() || this.createGem(); }
  return(gem) { gem.reset(); this.pool.push(gem); }
}
```

### 2. **조건부 렌더링**
**파일**: AnipangScene.js
- 화면 밖의 gem 렌더링 최소화
- Phaser의 frustum culling 활용

### 3. **Tween 배치 처리**
**현재**:
```javascript
gem.y = startY;
this.scene.tweens.add({ targets: gem, ... });
```
**개선**:
```javascript
// 여러 tweens를 한 번에 생성
const tweens = gemsToAnimateTop.map(gem => ({
  targets: gem,
  y: ...,
  ...
}));
this.scene.tweens.timeline(tweens);
```

### 4. **메모리 누수 가능성 - 리스너 정리**
**파일**: GameCanvas.jsx
```javascript
// 현재: 리스너가 정리되지 않을 수 있음
const handleSceneEvent = () => { ... };
this.game.events.on('update', handleSceneEvent);

// 개선: cleanup 함수 추가
onCleanup(() => {
  this.game.events.off('update', handleSceneEvent);
});
```

---

## 📋 SUMMARY TABLE

| 문제 | 심각도 | 파일 | 해결 난이도 | 예상 효과 |
|------|-------|------|-----------|---------|
| gems 겹침 | 🔴 | BoardManager, AnipangScene | 높음 | 게임 안정성 |
| 타이머 정리 | 🔴 | AnipangScene | 낮음 | 메모리 누수 방지 |
| 배열 중복 체크 불완전 | 🔴 | AnipangScene | 중간 | 버그 방지 |
| Tween 누수 | 🟠 | 전체 | 중간 | 성능 (FPS) |
| checkBoardEmptySpaces 최적화 | 🟠 | AnipangScene | 중간 | 성능 |
| Null 체크 부족 | 🟡 | 여러 파일 | 낮음 | 안정성 |
| 콘솔 로그 정리 | 🟡 | AnipangScene, BoardManager | 낮음 | 프로덕션 준비 |
| 드래그 중복 처리 | 🟡 | AnipangScene | 낮음 | UX |
| Gem 풀링 시스템 | 🟢 | BoardManager | 높음 | 성능 (메모리) |
| 드래그 로직 | 🟡 | AnipangScene | 중간 | 안정성 |

---

## 🎯 RECOMMENDED ACTION PLAN

### Phase 1 (즉시 - 1일)
1. ✅ gems 겹침 문제 원인 파악 (배열 vs 물리 좌표 동기화)
2. ✅ destroy() 메서드 완성 (타이머 정리)
3. ✅ 콘솔 로그 조건부 처리

### Phase 2 (1주)
4. Null 안전성 강화 (optional chaining)
5. Tween cleanup 시스템 구축
6. checkBoardEmptySpaces 최적화

### Phase 3 (2-3주)
7. Gem 풀링 시스템 도입
8. 마법의 숫자 설정 파일화
9. 전체 성능 테스트

---

## 💾 PRODUCTION CHECKLIST

- [ ] 모든 console.log 프로덕션 환경에서 비활성화
- [ ] 메모리 누수 테스트 (30분 플레이)
- [ ] 겹침 버그 최종 검증
- [ ] 에러 바운더리 추가
- [ ] 성능 프로파일링 (Lighthouse)
- [ ] 모바일 장시간 테스트
