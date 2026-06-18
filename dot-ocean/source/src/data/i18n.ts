import type { Lang } from './species';

export interface UIStrings {
  appName: string;
  tagline: string;
  level: string;
  discovered: string;
  // floating nav
  navSettings: string;
  navEncyclopedia: string;
  navMission: string;
  navDotpad: string;
  navTutorial: string;
  close: string;
  back: string;
  // settings
  settingsTitle: string;
  sound: string;
  tts: string;
  highContrast: string;
  reducedMotion: string;
  dotpadStatus: string;
  connect: string;
  connected: string;
  keyboardGuide: string;
  language: string;
  on: string;
  off: string;
  keyMove: string;
  keyScan: string;
  keyEncy: string;
  keyClose: string;
  // encyclopedia
  encyTitle: string;
  encyProgress: string;
  encyEmpty: string;
  undiscovered: string;
  classification: string;
  size: string;
  tailShape: string;
  finPos: string;
  habitat: string;
  region: string;
  features: string;
  foodchain: string;
  eats: string;
  eatenBy: string;
  tactileDesc: string;
  touchWithDotpad: string;
  silhouette: string;
  partsLayer: string;
  // quiz
  navQuiz: string;
  quizTitle: string;
  quizIntro: string;
  quizQuestion: string;
  quizNeed: string;
  quizCorrect: (n: string) => string;
  quizWrong: (n: string) => string;
  quizNext: string;
  quizScore: (a: number, b: number) => string;
  quizListen: string;
  // dotpad preview popup
  dotpadPreview: string;
  shape: string;
  direction: string;
  right: string;
  sentToPad: string;
  // mission
  missionTitle: string;
  missionIntro: string;
  missionProgress: (a: number, b: number) => string;
  missionDone: string;
  // tutorial
  tutTitle: string;
  tutSteps: { t: string; d: string }[];
  tutStart: string;
  tutNext: string;
  // events / tts
  evDiscover: (n: string) => string;
  evEat: (n: string) => string;
  evLevelUp: (lv: number) => string;
  evDanger: (n: string) => string;
  evConnected: string;
  // inclusive co-play
  audioCues: string;
  verbose: string;
  captions: string;
  radarMode: string;
  focusMode: string;
  surveyBtn: string;
  keySurvey: string;
  dir8: string[];
  distNear: string;
  distMid: string;
  distFar: string;
  annDiscover: (n: string, dir: string, dist: string) => string;
  annDanger: (n: string, dir: string) => string;
  annSurveyHead: string;
  annSurveyItem: (n: string, dir: string, dist: string, danger: boolean) => string;
  annNothing: string;
  annEdge: (dir: string) => string;
  radarHint: string;
  // danger labels
  danger: string[];
  rarity: Record<string, string>;
  startPlay: string;
  startHint: string;
  cmCompare: (n: string) => string;
  cmCompareSmall: (n: string) => string;
  mySize: string;
  simLabel: string;
  // expanded encyclopedia / detail
  scientific: string;
  bodyShape: string;
  ecology: string;
  tactileLevel: string;
  tactileLevels: string[];        // [easy, medium, hard]
  hearDescription: string;
  srDescTitle: string;
  searchPlaceholder: string;
  filterAll: string;
  categories: Record<string, string>;
  resultCount: (n: number) => string;
  noResults: string;
  allFound: string;
  allFoundHint: string;
  lockedHint: string;
  loading: string;
  // quiz modes
  quizModeShape: string;
  quizModeDesc: string;
  quizDescQuestion: string;
  quizListenDesc: string;
}

export const UI: Record<Lang, UIStrings> = {
  ko: {
    appName: 'Dot Ocean', tagline: '만지며 배우는 촉각 해양 탐험',
    level: 'Lv.', discovered: '발견한 생물',
    navSettings: '설정', navEncyclopedia: '백과사전', navMission: '미션', navDotpad: 'Dot Pad', navTutorial: '도움말',
    close: '닫기', back: '뒤로',
    settingsTitle: '설정', sound: '소리', tts: '음성 안내(TTS)', highContrast: '고대비 모드', reducedMotion: '모션 줄이기',
    dotpadStatus: 'Dot Pad 연결', connect: '연결하기', connected: '연결됨 (시뮬레이션)',
    keyboardGuide: '키보드 안내', language: '언어',
    on: '켜짐', off: '꺼짐',
    keyMove: '이동', keyScan: '가장 가까운 생물 스캔', keyEncy: '백과사전 열기', keyClose: '닫기 / 뒤로',
    encyTitle: '촉각 백과사전', encyProgress: '발견 진행', encyEmpty: '아직 발견한 생물이 없어요. 바다를 탐험해 생물을 만나 보세요.',
    undiscovered: '미발견',
    classification: '분류', size: '크기', tailShape: '꼬리 모양', finPos: '지느러미 위치', habitat: '서식지', region: '발견 지역', features: '특징',
    foodchain: '먹이사슬 관계', eats: '먹이', eatenBy: '천적', tactileDesc: '촉각 설명', touchWithDotpad: 'Dot Pad로 만져보기',
    silhouette: '실루엣', partsLayer: '부위 강조',
    navQuiz: '퀴즈',
    quizTitle: '촉각 퀴즈',
    quizIntro: 'Dot Pad 촉각 실루엣만 만지고(보고) 어떤 생물인지 맞혀 보세요.',
    quizQuestion: '이 촉각 패턴은 어떤 생물일까요?',
    quizNeed: '퀴즈를 풀려면 먼저 바다에서 생물을 3종 이상 발견해야 해요.',
    quizCorrect: (n) => `정답이에요! ${n}.`,
    quizWrong: (n) => `아쉬워요. 정답은 ${n}였어요.`,
    quizNext: '다음 문제',
    quizScore: (a, b) => `점수 ${a} / ${b}`,
    quizListen: '촉각 설명 다시 듣기',
    dotpadPreview: 'Dot Pad 미리보기', shape: '형태', direction: '방향', right: '오른쪽',
    sentToPad: '패턴을 Dot Pad로 전송했어요',
    missionTitle: '학습 미션', missionIntro: '간단한 미션을 완료하며 바다 생물을 배워요.',
    missionProgress: (a, b) => `${a} / ${b} 완료`, missionDone: '완료!',
    tutTitle: '처음 오셨네요!',
    tutSteps: [
      { t: '바다를 헤엄쳐요', d: '화살표 키나 W A S D, 또는 화면을 끌어 물고기를 움직여요.' },
      { t: '먹고 성장해요', d: '나보다 작은 생물에 닿으면 먹고 경험치를 얻어요. 레벨이 오르면 더 커지고 빛이 강해져요.' },
      { t: '조심해요', d: '나보다 크거나 독이 있는 생물은 위험해요. 가까이 가면 소리와 음성으로 알려줘요.' },
      { t: '만지며 배워요', d: '생물에 다가가면 Dot Pad 60×40 촉각 미리보기가 떠요. 백과사전에서 다시 만져볼 수 있어요.' },
    ],
    tutStart: '바다로 들어가기', tutNext: '다음',
    evDiscover: (n) => `새로운 생물 발견! ${n}을(를) 백과사전에 등록했어요.`,
    evEat: (n) => `${n}을(를) 먹었어요.`,
    evLevelUp: (lv) => `레벨 ${lv} 달성! 더 커지고 빛이 강해졌어요.`,
    evDanger: (n) => `위험! ${n}은(는) 나보다 큽니다. 물러나세요.`,
    evConnected: 'Dot Pad가 연결되었어요 (시뮬레이션).',
    audioCues: '공간 음향 큐', verbose: '음성 안내 자세히', captions: '소리 자막',
    radarMode: '레이더(주변)', focusMode: '포커스(한 마리)',
    surveyBtn: '주변 살피기', keySurvey: '주변 살피기 (Q)',
    dir8: ['오른쪽', '오른쪽 위', '위', '왼쪽 위', '왼쪽', '왼쪽 아래', '아래', '오른쪽 아래'],
    distNear: '가까이', distMid: '중간 거리', distFar: '멀리',
    annDiscover: (n, dir, dist) => `발견! ${n}, ${dir} ${dist}.`,
    annDanger: (n, dir) => `위험! ${n}, ${dir}. 물러나세요.`,
    annSurveyHead: '주변 생물:',
    annSurveyItem: (n, dir, dist, danger) => `${n}, ${dir} ${dist}${danger ? ', 위험' : ''}`,
    annNothing: '주변에 생물이 없어요. 더 헤엄쳐 보세요.',
    annEdge: (dir) => `${dir}은(는) 바다 끝이에요.`,
    radarHint: '플레이어는 가운데, 점은 주변 생물, 진하게 깜빡이는 곳은 위험 생물이에요.',
    danger: ['무해', '주의', '독성', '포식자'],
    rarity: { common: '일반', uncommon: '비범', rare: '희귀', legendary: '전설' },
    startPlay: '▶  소리 켜고 시작', startHint: '화살표 / WASD 이동 · 화면 끌기 · Space 스캔',
    cmCompare: (n) => `내 물고기보다 약 ${n}배 큼`, cmCompareSmall: (n) => `내 물고기의 약 ${n}배 (더 작음)`,
    mySize: '내 크기', simLabel: 'SIMULATION · 실제 핀 출력 미리보기',
    scientific: '학명', bodyShape: '몸통 형태', ecology: '생태', tactileLevel: '촉각 난이도',
    tactileLevels: ['쉬움', '보통', '어려움'],
    hearDescription: '스크린리더 설명 듣기', srDescTitle: '스크린리더 설명',
    searchPlaceholder: '이름으로 검색', filterAll: '전체',
    categories: { reef: '산호초', pelagic: '외양', shark: '상어', ray: '가오리', cephalopod: '두족류', mammal: '해양 포유류', jelly: '해파리', crustacean: '갑각류', eel: '장어', other: '기타' },
    resultCount: (n) => `${n}종 표시 중`, noResults: '조건에 맞는 생물이 없어요.',
    allFound: '모든 생물을 발견했어요!', allFoundHint: '대백과사전을 완성했어요. 촉각 퀴즈로 복습해 보세요.',
    lockedHint: '바다에서 만나면 잠금이 풀려요.', loading: '바다를 불러오는 중…',
    quizModeShape: '촉각 실루엣', quizModeDesc: '설명 듣기',
    quizDescQuestion: '이 설명은 어떤 생물일까요?',
    quizListenDesc: '설명 다시 듣기',
  },
  en: {
    appName: 'Dot Ocean', tagline: 'Explore the ocean by touch',
    level: 'Lv.', discovered: 'Discovered',
    navSettings: 'Settings', navEncyclopedia: 'Encyclopedia', navMission: 'Missions', navDotpad: 'Dot Pad', navTutorial: 'Help',
    close: 'Close', back: 'Back',
    settingsTitle: 'Settings', sound: 'Sound', tts: 'Voice narration (TTS)', highContrast: 'High contrast', reducedMotion: 'Reduce motion',
    dotpadStatus: 'Dot Pad connection', connect: 'Connect', connected: 'Connected (simulated)',
    keyboardGuide: 'Keyboard guide', language: 'Language',
    on: 'On', off: 'Off',
    keyMove: 'Move', keyScan: 'Scan nearest creature', keyEncy: 'Open encyclopedia', keyClose: 'Close / back',
    encyTitle: 'Tactile Encyclopedia', encyProgress: 'Discovery progress', encyEmpty: 'No creatures discovered yet. Explore the ocean to meet them.',
    undiscovered: 'Undiscovered',
    classification: 'Class', size: 'Size', tailShape: 'Tail shape', finPos: 'Fin position', habitat: 'Habitat', region: 'Found in', features: 'Features',
    foodchain: 'Food chain', eats: 'Eats', eatenBy: 'Eaten by', tactileDesc: 'Tactile description', touchWithDotpad: 'Touch with Dot Pad',
    silhouette: 'Silhouette', partsLayer: 'Parts',
    navQuiz: 'Quiz',
    quizTitle: 'Tactile Quiz',
    quizIntro: 'Feel (or look at) only the Dot Pad silhouette and guess the creature.',
    quizQuestion: 'Which creature makes this tactile pattern?',
    quizNeed: 'Discover at least 3 creatures in the ocean before playing the quiz.',
    quizCorrect: (n) => `Correct! It's the ${n}.`,
    quizWrong: (n) => `Not quite. It was the ${n}.`,
    quizNext: 'Next question',
    quizScore: (a, b) => `Score ${a} / ${b}`,
    quizListen: 'Hear the tactile description again',
    dotpadPreview: 'Dot Pad Preview', shape: 'Shape', direction: 'Direction', right: 'Right',
    sentToPad: 'Pattern sent to Dot Pad',
    missionTitle: 'Learning Missions', missionIntro: 'Complete simple missions to learn about sea life.',
    missionProgress: (a, b) => `${a} / ${b} done`, missionDone: 'Done!',
    tutTitle: 'Welcome!',
    tutSteps: [
      { t: 'Swim the ocean', d: 'Move your fish with arrow keys, W A S D, or by dragging the screen.' },
      { t: 'Eat and grow', d: 'Touch a smaller creature to eat it and gain XP. Leveling up makes you bigger and brighter.' },
      { t: 'Be careful', d: 'Bigger or venomous creatures are dangerous. You will hear sound and voice when one is near.' },
      { t: 'Learn by touch', d: 'Approach a creature to see its 60×40 Dot Pad preview. You can feel it again in the encyclopedia.' },
    ],
    tutStart: 'Enter the ocean', tutNext: 'Next',
    evDiscover: (n) => `New creature found! ${n} added to the encyclopedia.`,
    evEat: (n) => `Ate the ${n}.`,
    evLevelUp: (lv) => `Reached level ${lv}! You grew bigger and brighter.`,
    evDanger: (n) => `Danger! The ${n} is bigger than you. Back away.`,
    evConnected: 'Dot Pad connected (simulated).',
    audioCues: 'Spatial audio cues', verbose: 'Detailed voice guidance', captions: 'Sound captions',
    radarMode: 'Radar (around)', focusMode: 'Focus (one)',
    surveyBtn: 'Survey surroundings', keySurvey: 'Survey surroundings (Q)',
    dir8: ['right', 'upper-right', 'up', 'upper-left', 'left', 'lower-left', 'down', 'lower-right'],
    distNear: 'close', distMid: 'mid-range', distFar: 'far',
    annDiscover: (n, dir, dist) => `Found! ${n}, ${dir}, ${dist}.`,
    annDanger: (n, dir) => `Danger! ${n}, ${dir}. Back away.`,
    annSurveyHead: 'Nearby creatures:',
    annSurveyItem: (n, dir, dist, danger) => `${n}, ${dir}, ${dist}${danger ? ', dangerous' : ''}`,
    annNothing: 'Nothing nearby. Swim around to find creatures.',
    annEdge: (dir) => `The ${dir} is the edge of the sea.`,
    radarHint: 'You are at the center; dots are nearby creatures; the dense blinking area is a dangerous creature.',
    danger: ['Harmless', 'Caution', 'Toxic', 'Predator'],
    rarity: { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' },
    startPlay: '▶  Turn on sound & start', startHint: 'Arrows / WASD move · drag · Space scan',
    cmCompare: (n) => `about ${n}× larger than my fish`, cmCompareSmall: (n) => `about ${n}× my fish (smaller)`,
    mySize: 'My size', simLabel: 'SIMULATION · pin output preview',
    scientific: 'Scientific name', bodyShape: 'Body shape', ecology: 'Ecology', tactileLevel: 'Tactile level',
    tactileLevels: ['Easy', 'Medium', 'Hard'],
    hearDescription: 'Hear screen-reader description', srDescTitle: 'Screen-reader description',
    searchPlaceholder: 'Search by name', filterAll: 'All',
    categories: { reef: 'Reef', pelagic: 'Open water', shark: 'Shark', ray: 'Ray', cephalopod: 'Cephalopod', mammal: 'Marine mammal', jelly: 'Jelly', crustacean: 'Crustacean', eel: 'Eel', other: 'Other' },
    resultCount: (n) => `Showing ${n}`, noResults: 'No creatures match your filters.',
    allFound: 'You discovered every creature!', allFoundHint: 'The encyclopedia is complete. Review them in the tactile quiz.',
    lockedHint: 'Unlocks when you meet it in the ocean.', loading: 'Loading the ocean…',
    quizModeShape: 'Tactile silhouette', quizModeDesc: 'Listen to a description',
    quizDescQuestion: 'Which creature does this describe?',
    quizListenDesc: 'Hear the description again',
  },
};
