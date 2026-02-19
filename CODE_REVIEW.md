# 냐냐팡 코드 리뷰 - 최적화 및 오류 가능성 분석

## 🔴 CRITICAL ISSUES (즉시 해결 필요)

### 1. **gems 겹침 문제**
**파일**: BoardManager.js, AnipangScene.js
- **증상**: fillBoard() 실행 중 같은 위치에 2개의 gems가 존재
- **원인**: 배열 업데이트와 물리적 좌표가 tween 애니메이션 중에 비동기로 처리됨
- **영향도**: 🔴 높음 - 게임 플레이 방해
- **권장사항**: 
  ```
  1. fillBoard() 실행 중 tween 중단 후 재시작
  2. 배열 업데이트 시 중복 체크 강화
  3. 물리적 좌표 업데이트를 배열 동기화와 함께 처리
  ```

### 2. **타이머 정리 불완전**
**파일**: AnipangScene.js (update, destroy 메서드)
- **위험**: 
  ```javascript
  this._tickEvent // 정리되지 않을 수 있음
  this._endTimer  // destroy()에서 정리 필요
  this.boardCheckTimer // 계속 실행 가능
  ```
- **해결책**: destroy() 메서드 강화
  ```javascript
  destroy() {
    if (this._tickEvent) this._tickEvent.remove();
    if (this._endTimer) this._endTimer.remove();
    if (this.boardCheckTimer) this.time.removeEvent(this.boardCheckTimer);
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
