/**
 * GameConstants - 게임 내 모든 하드코딩된 상수 통합 관리
 */

const GEM_TYPE_POOL = ['gem1', 'gem2', 'gem3', 'gem4', 'gem5', 'gem6'];
const GEM_TYPE_COUNT_RANGE = { min: 3, max: GEM_TYPE_POOL.length };
const GEM_TYPE_COUNT_SETTING = 6; // 조정하려면 3~6 사이로 변경
const clampedGemTypeCount = Math.min(Math.max(GEM_TYPE_COUNT_SETTING, GEM_TYPE_COUNT_RANGE.min), GEM_TYPE_COUNT_RANGE.max);
const ACTIVE_GEM_TYPES = GEM_TYPE_POOL.slice(0, clampedGemTypeCount);

export const GAME_CONFIG = {
  // 게임 기본 설정
  BOARD_SIZE: { rows: 8, cols: 8 },
  GEM_TYPES_SOURCE: GEM_TYPE_POOL,
  GEM_TYPES: ACTIVE_GEM_TYPES,
  GEM_TYPE_COUNT: clampedGemTypeCount,
  GEM_TYPE_COUNT_RANGE: GEM_TYPE_COUNT_RANGE,
  INITIAL_TIME: 60,
  
  // Gem 크기
  GEM_SIZE_OFFSET: 2,        // gemSize - 2 (일반)
  SPECIAL_GEM_SCALE: 1.0,    // bomb/dog: gemSize * 1.0 (누적 스케일링 버그 회피)
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

export const BOSS_CONFIG = {
  SPAWN_SCORE_THRESHOLD: 200000,  // 보스전 시작 점수 배수 기준 (20만점)
  // HITS_PER_ROUND와 ATTACK_DAMAGE는 동적으로 계산됨
  // HITS_PER_ROUND = Math.floor(현재점수 / 10000)
  // ATTACK_DAMAGE = Math.floor(현재점수 / 20000)
  TOTAL_ROUNDS: 1,                // 보스전 클리어까지의 라운드 수
  FADE_DURATION: 500,             // 화면 어두워지는 시간 (ms)
  BOSS_SCALE: 1,                  // 보스 크기 배수
  SPAWN_ANIMATION_DURATION: 300,  // 보스 나타나기 애니메이션
  DISAPPEAR_ANIMATION_DURATION: 200,  // 보스 사라지기 애니메이션

  // 스프라이트시트 설정
  FRAME_WIDTH: 100,               // 프레임 너비 (px)
  FRAME_HEIGHT: 100,              // 프레임 높이 (px)
  TOTAL_FRAMES: 5,                // 총 프레임 개수

  // 애니메이션 프레임
  WALK_FRAMES: [1, 2],            // 걷는 모션 (프레임 1-2)
  ATTACK_FRAME: 3,                // 공격 모션 (프레임 3)
  HIT_FRAME: 4,                   // 타격 모션 (프레임 4)

  // 애니메이션 설정
  WALK_ANIMATION_SPEED: 8,        // 걷기 애니메이션 속도 (fps)
  ATTACK_ANIMATION_DURATION: 500, // 공격 애니메이션 지속시간 (ms)
  HIT_ANIMATION_DURATION: 500,    // 타격 애니메이션 지속시간 (ms)

  // 보스 AI
  ATTACK_INTERVAL: 2000,          // 공격 간격 (ms)
  MOVEMENT_SPEED: 300,            // 보스 이동 속도 (px/s)
  MOVE_CHANGE_INTERVAL: 500,     // 이동 방향 변경 간격 (ms)
  MIN_MOVE_DISTANCE: 400,          // 최소 이동 거리 (px)

  // 상단 중앙 클릭 회수 표시
  TOP_CENTER_HITS_FONT_SIZE: '60px',
  TOP_CENTER_HITS_COLOR: '#ffff00',
  TOP_CENTER_HITS_STROKE: '#ff0000',
  TOP_CENTER_HITS_STROKE_WIDTH: 3,
  TOP_CENTER_HITS_Y_OFFSET: 15,  // 화면 상단에서의 Y 위치
};

export const FEVER_CONFIG = {
  DURATION: 10000,              // 피버타임 지속 시간 (ms)
  REMAINING_GEM_THRESHOLD: 50,   // 피버타임 발동 조건 (남은 gem 개수 - 50개 이하일 때 발동)
  SPARKLE_DURATION: 300,        // 반짝임 애니메이션 주기 (ms)
  TEXT_DISPLAY_TIME: 1000,      // Fever Time 텍스트 표시 시간 (ms)
  TEXT_FONT_SIZE: '100px',      // Fever Time 텍스트 크기
  TEXT_SCALE_START: 0.1,        // 텍스트 시작 스케일
  TEXT_SCALE_END: 1.0,          // 텍스트 최종 스케일
  FALL_SPEED_MULTIPLIER: 1      // 피버타임 중 블록 낙하 속도 배수
};