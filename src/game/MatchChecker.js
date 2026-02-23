/**
 * MatchChecker - 매칭 감지
 * 책임: 3개 이상 연속된 같은 색 gem 감지
 */
export class MatchChecker {
  constructor(boardManager) {
    this.boardManager = boardManager;
  }

  /**
   * 매칭된 gem 배열 반환 (Set 기반으로 중복 최적화)
   */
  checkMatches() {
    const matchedGems = new Set(); // Set으로 중복 방지하면서 시작
    const isSpecial = (key) => key === 'bomb' || key === 'dog';
    const gems = this.boardManager.gems;
    const rows = this.boardManager.boardSize.rows;
    const cols = this.boardManager.boardSize.cols;

    // 가로 매칭 체크
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols - 2; col++) {
        let gem1 = gems[row][col];
        let gem2 = gems[row][col + 1];
        let gem3 = gems[row][col + 2];
        
        if (gem1 && gem2 && gem3 && 
            !isSpecial(gem1.texture.key) &&
            gem1.texture.key === gem2.texture.key && 
            gem2.texture.key === gem3.texture.key) {
          matchedGems.add(gem1);
          matchedGems.add(gem2);
          matchedGems.add(gem3);
        }
      }
    }
    
    // 세로 매칭 체크
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows - 2; row++) {
        let gem1 = gems[row][col];
        let gem2 = gems[row + 1][col];
        let gem3 = gems[row + 2][col];

        if (gem1 && gem2 && gem3 &&
            !isSpecial(gem1.texture.key) &&
            gem1.texture.key === gem2.texture.key && 
            gem2.texture.key === gem3.texture.key) {
          matchedGems.add(gem1);
          matchedGems.add(gem2);
          matchedGems.add(gem3);
        }
      }
    }
    
    // 마지막에만 Set을 배열로 변환
    return Array.from(matchedGems);
  }

  /**
   * 특정 위치 주변의 매칭만 확인 (성능 최적화)
   * gem 교환 후 해당 위치 주변의 매칭만 확인하여 전체 보드 검사 회피
   */
  checkMatchesAroundPosition(row, col) {
    const matchedGems = new Set();
    const isSpecial = (key) => key === 'bomb' || key === 'dog';
    const gems = this.boardManager.gems;
    const rows = this.boardManager.boardSize.rows;
    const cols = this.boardManager.boardSize.cols;

    // 검사 범위: row, col을 중심으로 ±2
    const startRow = Math.max(0, row - 2);
    const endRow = Math.min(rows - 1, row + 2);
    const startCol = Math.max(0, col - 2);
    const endCol = Math.min(cols - 1, col + 2);

    // 가로 매칭 확인 (row 위치에서만 확인)
    for (let c = startCol; c <= endCol - 2; c++) {
      let gem1 = gems[row][c];
      let gem2 = gems[row][c + 1];
      let gem3 = gems[row][c + 2];
      
      if (gem1 && gem2 && gem3 && 
          !isSpecial(gem1.texture.key) &&
          gem1.texture.key === gem2.texture.key && 
          gem2.texture.key === gem3.texture.key) {
        matchedGems.add(gem1);
        matchedGems.add(gem2);
        matchedGems.add(gem3);
        return Array.from(matchedGems); // 매칭 찾으면 바로 반환
      }
    }

    // 세로 매칭 확인 (col 위치에서만 확인)
    for (let r = startRow; r <= endRow - 2; r++) {
      let gem1 = gems[r][col];
      let gem2 = gems[r + 1][col];
      let gem3 = gems[r + 2][col];

      if (gem1 && gem2 && gem3 &&
          !isSpecial(gem1.texture.key) &&
          gem1.texture.key === gem2.texture.key && 
          gem2.texture.key === gem3.texture.key) {
        matchedGems.add(gem1);
        matchedGems.add(gem2);
        matchedGems.add(gem3);
        return Array.from(matchedGems); // 매칭 찾으면 바로 반환
      }
    }

    return Array.from(matchedGems); // 빈 배열 반환
  }
  canMakeAnyMove() {
    const gems = this.boardManager.gems;
    const rows = this.boardManager.boardSize.rows;
    const cols = this.boardManager.boardSize.cols;

    // 모든 gem에 대해 우측, 하단 인접 gem과의 교환 시뮬레이션
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const gem1 = gems[row][col];
        if (!gem1 || !gem1.active) continue;

        // 우측으로 교환
        if (col + 1 < cols) {
          const gem2 = gems[row][col + 1];
          if (gem2 && gem2.active) {
            // 임시 교환
            gems[row][col] = gem2;
            gems[row][col + 1] = gem1;

            // 교환된 위치 주변만 매칭 확인 (성능 최적화)
            if (this.checkMatchesAroundPosition(row, col).length > 0 ||
                this.checkMatchesAroundPosition(row, col + 1).length > 0) {
              // 교환 상태 복구
              gems[row][col] = gem1;
              gems[row][col + 1] = gem2;
              return true; // 가능한 움직임 있음
            }

            // 교환 상태 복구
            gems[row][col] = gem1;
            gems[row][col + 1] = gem2;
          }
        }

        // 하단으로 교환
        if (row + 1 < rows) {
          const gem2 = gems[row + 1][col];
          if (gem2 && gem2.active) {
            // 임시 교환
            gems[row][col] = gem2;
            gems[row + 1][col] = gem1;

            // 교환된 위치 주변만 매칭 확인 (성능 최적화)
            if (this.checkMatchesAroundPosition(row, col).length > 0 ||
                this.checkMatchesAroundPosition(row + 1, col).length > 0) {
              // 교환 상태 복구
              gems[row][col] = gem1;
              gems[row + 1][col] = gem2;
              return true; // 가능한 움직임 있음
            }

            // 교환 상태 복구
            gems[row][col] = gem1;
            gems[row + 1][col] = gem2;
          }
        }
      }
    }

    return false; // 가능한 움직임 없음 (교착 상태)
  }
}
