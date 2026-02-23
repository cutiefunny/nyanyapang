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
}
