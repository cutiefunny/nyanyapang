/**
 * GameConstants - 게임 내 모든 하드코딩된 상수 통합 관리
 */

export const GAME_CONFIG = {
  // 게임 기본 설정
  BOARD_SIZE: { rows: 8, cols: 8 },
  GEM_TYPES: ['gem1', 'gem2', 'gem3', 'gem4', 'gem5', 'gem6'],
  INITIAL_TIME: 60,
  
  // Gem 크기
  GEM_SIZE_OFFSET: 2,        // gemSize - 2 (일반)
  SPECIAL_GEM_SCALE: 1.2,    // bomb/dog: gemSize * 1.2
};

export const COMBO_CONFIG = {
  DOG_THRESHOLD: 2,           // 2 combo: 개 생성
  BOMB_THRESHOLD: 3,          // 3 combo: 폭탄 생성
  FLASH_THRESHOLD: 4,         // 4 combo: 화면 flash
  GREAT_THRESHOLD: 3,         // 일반 -> "Great!" 텍스트
  FANTASTIC_THRESHOLD: 5,     // -> "Fantastic!!"
  UNBELIEVABLE_THRESHOLD: 7,  // -> "UNBELIEVABLE!!!"
};

export const SCORE_CONFIG = {
  MATCH_BASE: 100,            // 매칭 기본 점수 * combo 배수
  BOMB_MULTIPLIER: 200,       // 폭탄 폭발 * gem 수
  DOG_KILL: 300,              // 개 공격 * gem 수
  EMPTY_SLOT: 50,             // 빈칸 * 수
  TIME_BONUS: 10,             // 시간 보너스 (초)
  BONUS_THRESHOLD: 10000,     // 보너스 획득 점수 threshold
};

export const ANIMATION_CONFIG = {
  // Pulse 애니메이션 (bomb/dog idle)
  PULSE_DURATION: 500,
  PULSE_SCALE: 1.1,
  PULSE_REPEAT: -1,
  
  // 떨어지기 애니메이션
  GEM_FALL_BASE_DURATION: 200,
  GEM_FALL_DISTANCE_MULTIPLIER: 30,
  GEM_FALL_EASE: 'Cubic.easeIn',
  GEM_FALL_DELAY: 10,         // 연쇄 지연
  
  // 튀기기 애니메이션
  GEM_BOUNCE_NEW_DURATION: 60,
  GEM_BOUNCE_NEW_HEIGHT: 10,
  GEM_BOUNCE_EXISTING_DURATION: 50,
  GEM_BOUNCE_EXISTING_HEIGHT: 5,
  GEM_BOUNCE_EASE: 'Quad.easeOut',
  
  // 스왑 애니메이션
  GEM_SWAP_DURATION: 300,
  GEM_SWAP_EASE: 'Power2',
  
  // 선택 애니메이션
  GEM_SELECT_DURATION: 100,
  GEM_SELECT_SCALE: 1.1,
  GEM_SELECT_TINT: 0x888888,
  
  // 콤보 텍스트
  COMBO_TEXT_DURATION: 1000,
  COMBO_TEXT_SCALE: 1.5,
  COMBO_TEXT_OFFSET: 100,
  
  // 보너스 텍스트
  BONUS_TEXT_DURATION: 1200,
  BONUS_TEXT_SCALE: 1.3,
  BONUS_TEXT_OFFSET: 150,
  
  // 폭탄 불타는 애니메이션
  BOMB_SHAKE_DURATION: 300,
  BOMB_SHAKE_INTENSITY: 0.03,
  BOMB_FLASH_DURATION: 200,
  
  // 개 움직임
  DOG_WALK_DURATION: 1500,
  DOG_SHAKE_DURATION: 400,
  DOG_SHAKE_INTENSITY: 0.02,
};

export const SOUND_CONFIG = {
  BGM_VOLUME: 0.5,
  SOUND_VOLUME_BASE: 0.4,
  SOUND_VOLUME_COMBO5: 0.5,
  SOUND_VOLUME_COMBO10: 0.6,
  SOUND_DETUNE_BASE: 200,
  SOUND_DETUNE_COMBO5: 400,
  SOUND_DETUNE_COMBO10: 600,
  BOMB_VOLUME: 0.7,
};

export const BOARD_CHECK_CONFIG = {
  CHECK_INTERVAL: 5000,        // 5초마다 보드 체크
  MAX_CREATION_ATTEMPTS: 10,   // 초기 gem 생성 최대 시도
  OVERLAP_DETECTION_RANGE: 1,  // 겹침 감지 tolerance
};

export const UI_CONFIG = {
  SOUND_BUTTON_PADDING: 16,
  SOUND_BUTTON_WIDTH: 60,
  SOUND_BUTTON_HEIGHT: 40,
  SOUND_BUTTON_FONT: '24px',
  SOUND_BUTTON_BORDER: 2,
  SOUND_BUTTON_COLOR: 0xffdb78,
  SOUND_ICON_ON: '🔊',
  SOUND_ICON_OFF: '🔇',
  
  // 콤보 텍스트 스타일
  COMBO_FONT_SIZE: '40px',
  COMBO_FONT: 'Arial Black',
  COMBO_COLOR: '#ffdd00',
  COMBO_STROKE: '#000',
  COMBO_STROKE_WIDTH: 6,
  
  // 보너스 텍스트 스타일
  BONUS_FONT_SIZE: '100px',
  BONUS_FONT: 'Arial Black',
  BONUS_COLOR: '#ffff00',
  BONUS_STROKE: '#ff0000',
  BONUS_STROKE_WIDTH: 10,
};

export const DRAG_CONFIG = {
  DRAG_BASE_SENSITIVITY: 0.4,   // gemSize * 0.4
  DRAG_MIN_DISTANCE: 20,
};
