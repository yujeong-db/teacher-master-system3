/* ============================================================
   Teacher Talent Management System — V2
   constants.js
   -------------------------------------------------------------
   모든 서비스/페이지가 공유하는 도메인 상수입니다. 다른 스크립트보다
   먼저 로드되어야 합니다.

   NEW_TEAMS / PLACED_TEAMS / ALL_TEAMS / STATUS는 기본값이며, 설정
   페이지에서 관리자가 추가/삭제하면 loadDynamicConfig()가 이 값들을
   LocalStorage에 저장된 값으로 덮어씁니다(각 페이지 부트스트랩 맨 처음에
   호출). 즉 이 파일의 값은 "최초 기본값"이고, 실제 화면에 쓰이는 값은
   런타임에 갱신될 수 있습니다.
============================================================ */
let NEW_TEAMS = ['CNE1', 'CN1'];              // 신입 교육 중 소속되는 팀
let PLACED_TEAMS = ['C2','C3','C4','C5','C6','C7','C8','C9','C10','C11']; // 정식 배치팀
let ALL_TEAMS = [...NEW_TEAMS, ...PLACED_TEAMS]; // 교사관리 팀 필터/선택 목록

// 교사 직무 — 교사 추가 시 선택하며, 기수별 채용 목표 인원을 직무별로 구분하는 데 쓰입니다.
const JOB_TYPES = {
  english:    { key:'english',    label:'영어 교사' },
  subject:    { key:'subject',    label:'교과 교사' },
  elementary: { key:'elementary', label:'초등전담' },
  freeTrial:  { key:'freeTrial',  label:'무료체험' },
};

// 신입 교육 일정(기수) 목록 — 설정 페이지가 아닌 Dashboard에서 직접 등록/수정합니다.
// 각 기수: { id, label, date(YYYY-MM-DD), targetEnglish, targetSubject }
let TRAINING_COHORTS = [];

// 면접 일정 — 회의실/면접관 목록은 설정 페이지에서 관리자가 추가/삭제합니다.
let INTERVIEW_ROOMS = [];
let INTERVIEWERS = [];
const INTERVIEW_RESULT = {
  pending: { label:'대기중', color:'amber' },
  passed:  { label:'합격',   color:'green' },
  failed:  { label:'불합격', color:'red'   },
};

// 핵심 파이프라인 상태 — 설정 페이지에서 삭제할 수 없습니다 (팀 배치 자동화 등 로직이 의존함)
const CORE_STATUS_KEYS = ['interview','rejected','training2w','training4w','placed'];

// 면접 탈락 처리된 교사는 이후 단계(신입교육/정착교육/인수인계/최종리포트)를 진행하지 않습니다.
const REJECTED_STATUS_KEY = 'rejected';
const DISABLED_TABS_WHEN_REJECTED = ['train2w','settle4w','handover','report'];

let STATUS = {
  interview:   { label:'채용진행 중',   color:'amber'  },
  rejected:    { label:'면접 탈락',     color:'red'    },
  training2w:  { label:'신입교육 2주',  color:'primary'},
  training4w:  { label:'정착교육 4주',  color:'purple' },
  placed:      { label:'팀 배치 완료',  color:'green'  },
  dismissed:   { label:'해촉',         color:'red'    },
};

const INTERVIEW_SCORES = [
  { key:'envReady', label:'온라인 환경 준비도' },
  { key:'content',  label:'수업 내용 구성' },
  { key:'voice',    label:'성량 및 딕션' },
  { key:'gesture',  label:'제스처 및 표정' },
  { key:'material', label:'자료 활용도' },
];
// 신입교육/정착교육 평가는 코칭능력·회원관리·업무지식 3개 카테고리로 묶여 있고,
// 카테고리마다 항목 3개씩(5점 척도)입니다. hasExam:true인 항목은 별점 옆에
// 시험결과를 적는 칸이 추가로 나옵니다(신입: 내용이해도, 정착: 정책이해도).
const SCORE_CATEGORIES = [
  { key:'coaching',      label:'코칭능력' },
  { key:'memberMgmt',    label:'회원관리' },
  { key:'workKnowledge', label:'업무지식' },
];
// pairKey: 최종리포트 '카테고리별 분석' 막대그래프에서 이 신입교육 항목과
// 나란히 비교해서 보여줄 정착교육(SETTLE_SCORES) 항목의 key입니다.
const TRAIN_SCORES = [
  { key:'trainContentUnderstand', label:'콘텐츠 이해도',   category:'coaching',      pairKey:'settleClassDesign' },
  { key:'trainProgramOperate',    label:'프로그램 조작도', category:'coaching',      pairKey:'settleMemberFeedback' },
  { key:'trainDelivery',          label:'내용 전달력',     category:'coaching',      pairKey:'settleApplication' },
  { key:'trainCommunication',     label:'의사소통능력',    category:'memberMgmt',    pairKey:'settleCounselSat' },
  { key:'trainTaskPerform',       label:'업무수행력',      category:'memberMgmt',    pairKey:'settleMemberMgmtAbility' },
  { key:'trainProblemSolving',    label:'문제해결능력',    category:'memberMgmt',    pairKey:'settleProblemSolving' },
  { key:'trainContentKnowledge',  label:'내용이해도',      category:'workKnowledge', pairKey:'settlePolicyUnderstand', hasExam:true },
  { key:'trainParticipation',     label:'교육참여도',      category:'workKnowledge', pairKey:'settleErrorRate' },
  { key:'trainCasOperate',        label:'CAS 조작',        category:'workKnowledge', pairKey:'settleAccuracy' },
];
const SETTLE_SCORES = [
  { key:'settleClassDesign',       label:'수업구성능력', category:'coaching' },
  { key:'settleMemberFeedback',    label:'회원별피드백', category:'coaching' },
  { key:'settleApplication',       label:'내용 응용력',  category:'coaching' },
  { key:'settleCounselSat',        label:'상담만족도',   category:'memberMgmt' },
  { key:'settleMemberMgmtAbility', label:'회원관리능력', category:'memberMgmt' },
  { key:'settleProblemSolving',    label:'문제해결능력', category:'memberMgmt' },
  { key:'settlePolicyUnderstand',  label:'정책이해도',   category:'workKnowledge', hasExam:true },
  { key:'settleAccuracy',          label:'업무 정확성',  category:'workKnowledge' },
  { key:'settleErrorRate',         label:'실수율',       category:'workKnowledge' },
];
/* ============================================================
   SCORE_RUBRICS — 항목별 5점 척도 채점 기준
   -------------------------------------------------------------
   면접평가(INTERVIEW_SCORES) 5개 항목은 실제 채점 기준 원문을 그대로
   담았습니다. 신입교육/정착교육 항목은 아직 기준 원문을 받지 못해
   자리만 마련해뒀습니다(criteria:null) — 나중에 기준 텍스트를 주시면
   여기에 채워 넣기만 하면 화면에 바로 반영돼요.
============================================================ */
const SCORE_RUBRICS = {
  envReady: {
    desc: '화면, 조명, 음향, 복장 등 온라인 수업을 위한 하드웨어적 세팅과 프로페셔널한 태도를 평가',
    criteria: [
      { score:5, title:'매우 우수', text:'배경이 매우 깔끔하고, 조명과 마이크 상태가 완벽하여 잡음이나 어두움이 전혀 없다. 단정한 복장을 갖추었으며, 시선이 시종일관 카메라를 정확히 향해 아이와 완벽히 눈을 맞추는 느낌을 준다.' },
      { score:4, title:'우수', text:'전체적으로 깔끔하고 정돈된 환경이다. 음질과 화질이 양호하며 단정한 편이다. 간혹 시선이 아래(대본 등)로 내려가지만 대체로 카메라를 잘 응시한다.' },
      { score:3, title:'보통', text:'일반적인 가정 환경의 배경이 노출되나 수업에 방해될 정도는 아니다. 음질이나 화질은 무난하지만, 대본이나 화면을 읽느라 카메라를 보는 비율이 50~60% 수준이다.' },
      { score:2, title:'미흡', text:'역광이나 어두운 조명으로 교사의 얼굴이 잘 보이지 않거나, 약간의 하울링(울림)이 발생한다. 복장이 지나치게 캐주얼하고, 시선이 모니터나 대본에 고정되어 아이컨택이 거의 이루어지지 않는다.' },
      { score:1, title:'매우 미흡', text:'주변 생활 소음(가족 소리, 가전 소리 등)이 그대로 섞여 들리거나 화질이 심하게 깨진다. 수업을 진행하기 어려운 환경이다.' },
    ],
  },
  content: {
    desc: '도입, 전개, 마무리의 흐름이 매끄러운지, 그리고 교사 혼자 대화를 독점하지 않고 학습자 참여를 유도하는지 평가',
    criteria: [
      { score:5, title:'매우 우수', text:'제한된 시간 내에 [도입-전개-마무리]가 완벽한 비율로 구성되어 있다. 가상의 학생에게 끊임없이 질문을 던지며 학생의 발화와 참여를 유도하는 밀당(Interaction) 능력이 매우 탁월하다.' },
      { score:4, title:'우수', text:'수업의 흐름이 매끄럽고 학습 목표가 명확히 전달된다. 질문을 통해 학생의 참여를 유도하려는 시도가 돋보이나, 가끔 시간 조절이 살짝 아쉽다.' },
      { score:3, title:'보통', text:'교재의 내용을 순서대로 잘 전달하지만, 다소 주입식 수업 양상을 보인다. 교사의 발화 비중이 높아 가상의 학생이 참여할 틈이 조금 부족하다.' },
      { score:2, title:'미흡', text:'특정 구간(예: 도입부)에 시간을 너무 많이 써서 본학습이나 마무리가 흐지부지 끝난다. 흐름이 뚝뚝 끊기거나 학습 목표가 무엇인지 모호하다.' },
      { score:1, title:'매우 미흡', text:'단순히 교재나 대본을 처음부터 끝까지 읽는 수준이며, 학생을 참여시키려는 발문이나 유도 노력이 전혀 없다.' },
    ],
  },
  voice: {
    desc: '비대면 환경에서 아이들의 귀에 쏙쏙 꽂히는 또렷한 발음, 적절한 속도, 지루하지 않은 목소리 톤을 평가',
    criteria: [
      { score:5, title:'매우 우수', text:'목소리가 아주 맑고 성량이 풍부하여 귀에 확 꽂힌다. 영어/한국어 발음과 딕션이 매우 정확하며, 중요 단어에서 강세와 억양을 적절히 살려 몰입도를 극대화한다.' },
      { score:4, title:'우수', text:'발음이 또렷하고 전달력이 좋다. 목소리 톤이 안정적이며 아이들이 알아듣기 좋은 적절한 속도를 시종일관 유지한다.' },
      { score:3, title:'보통', text:'전달력에 큰 문제는 없으나 목소리 톤이 다소 단조로워 장시간 들으면 지루할 수 있는 톤이다. 속도가 가끔 빨라지거나 느려지기도 한다.' },
      { score:2, title:'미흡', text:'웅얼거리는 발음이 있거나 성량이 작아 집중해서 들어야 한다. 비대면 수업에 맞지 않게 목소리가 너무 가라앉아(Low-tone) 있다.' },
      { score:1, title:'매우 미흡', text:'발음이나 문법적 오류가 잦아 학습자에게 잘못된 지식을 전달할 우려가 있으며, 말하는 속도가 너무 빠르거나 느려 내용파악이 어렵다.' },
    ],
  },
  gesture: {
    desc: '화면 안에서 아이의 주의를 끌 수 있는 밝은 표정(Energy)과 전신 반응(TPR) 등의 신체 언어 활용도를 평가',
    criteria: [
      { score:5, title:'매우 우수', text:'시종일관 진심 어린 밝은 미소와 에너지가 넘치며, 손동작/제스처를 적극적이고 자연스럽게 사용하여 텍스트 없이도 의미가 전달된다.' },
      { score:4, title:'우수', text:'표정이 밝고 가상의 학생 반응에 대한 리액션(고개 끄덕임, 환한 웃음)이 좋다. 주요 포인트를 짚어줄 때 적절한 손동작을 활용한다.' },
      { score:3, title:'보통', text:'표정이 차분하고 무난하지만 역동적인 에너지는 부족하다. 제스처는 가끔 사용하나 다소 어색하거나 정형화되어 있다.' },
      { score:2, title:'미흡', text:'긴장한 기색이 역력하여 표정이 딱딱하게 굳어 있거나 무표정이다. 손동작을 거의 쓰지 않고 가만히 앉아서 말로만 수업을 진행한다.' },
      { score:1, title:'매우 미흡', text:'비언어적 표현(표정/제스처)이 전혀 없어 아이들이 겁을 먹거나 지루해할 만한 태도이다.' },
    ],
  },
  material: {
    desc: '태블릿 화면, 교재, 실물 교구, 혹은 디지털 판서 툴을 얼마나 능숙하고 효과적으로 다루는지 평가',
    criteria: [
      { score:5, title:'매우 우수', text:'교재나 태블릿 화면의 핵심 아이콘/단어를 정확히 짚어가며 설명한다. 타이밍에 맞춰 판서를 결합하여 학습 효과를 배가시킨다.' },
      { score:4, title:'우수', text:'제공된 자료를 적재적소에 잘 활용한다. 화면 공유나 판서 기능을 매끄럽게 다루며, 자료와 교사의 설명이 따로 놀지 않는다.' },
      { score:3, title:'보통', text:'자료를 띄워두기는 하지만 단순히 화면을 보여주는 용도로만 쓰고, 구체적인 판서나 강조 기법(포인팅)의 활용은 평범한 수준이다.' },
      { score:2, title:'미흡', text:'자료를 활용할 때 버벅거림이 있어 수업 흐름이 끊긴다. 자료의 엉뚱한 곳을 짚거나 활용도가 떨어진다.' },
      { score:1, title:'매우 미흡', text:'주어진 학습 자료나 교구를 전혀 활용하지 않고 말로만 때우거나, 기기 조작 미숙으로 모의 수업 진행 자체가 원활하지 않다.' },
    ],
  },
  /* ---- 신입교육(TRAIN_SCORES) 채점 기준 ---- */
  trainContentUnderstand: {
    desc: '무엇을 가르치는지 알고 있는가?',
    criteria: [
      { score:1, title:'매우 미흡', text:'캐잉의 주요 교과 및 영어 콘텐츠의 기본적인 구성과 종류를 부분적으로 알고 있다. (테스트 7~10점)' },
      { score:2, title:'미흡', text:'캐잉의 교과·영어 콘텐츠와 부가 콘텐츠의 주요 기능과 쓰임을 설명할 수 있다. (테스트 11~13점)' },
      { score:3, title:'보통', text:'담당 학년·레벨에서 사용하는 콘텐츠의 전체 구성과 학습 흐름을 설명할 수 있다. (테스트 14~16점)' },
      { score:4, title:'우수', text:'담당 학년·레벨에서 사용하는 콘텐츠의 세부 내용과 학습 목적을 정확하게 설명할 수 있다. (테스트 17~19점)' },
      { score:5, title:'매우 우수', text:'학생의 수준과 상황에 따라 적절한 콘텐츠·기능·스케줄을 선택하고, 선택 이유와 활용 방법까지 설명할 수 있다. (테스트 20점)' },
    ],
  },
  trainProgramOperate: {
    desc: '수업을 실제로 운영할 수 있는가?',
    criteria: [
      { score:1, title:'매우 미흡', text:'안내를 받아 코칭룸 입장 및 교안 준비가 가능하다.' },
      { score:2, title:'미흡', text:'코칭룸 입장, 교안 준비 및 기본적인 수업 동선을 독립적으로 수행한다.' },
      { score:3, title:'보통', text:'발표 시작, 공동판서, 학생용 교안 공유, 화면 공유 등 기본적인 수업 기능을 순서에 맞게 수행한다.' },
      { score:4, title:'우수', text:'수업 흐름에 따라 필요한 기능을 스스로 판단하여 조작하고, 오류 발생 시 원인을 찾아 해결한다.' },
      { score:5, title:'매우 우수', text:'수업 중 발생하는 교사·학생 기기의 일반적인 문제를 스스로 진단·해결하고 필요한 후속 조치까지 수행한다.' },
    ],
  },
  trainDelivery: {
    desc: '학생에게 제대로 가르칠 수 있는가?',
    criteria: [
      { score:1, title:'매우 미흡', text:'교재의 음원이나 문장을 그대로 제시하며 교사의 추가적인 설명이나 확인이 거의 없다.' },
      { score:2, title:'미흡', text:'핵심 단어와 문장을 제시하고 반복·따라 말하기를 통해 기본적인 내용을 전달한다.' },
      { score:3, title:'보통', text:'학습 목표와 핵심 내용을 명확하게 제시하고 기본적인 설명과 예시를 활용한다.' },
      { score:4, title:'우수', text:'학생의 반응과 이해도를 확인하며 추가 설명, 예시, 질문 등을 활용하여 이해를 돕는다.' },
      { score:5, title:'매우 우수', text:'학생의 수준·반응·학습 속도에 따라 설명 방식과 난이도를 조절하고, 학생이 스스로 이해하고 활용하도록 이끈다.' },
    ],
  },
  trainCommunication: {
    desc: '상대방에게 정확하게 전달하고, 상대의 의도를 파악하는 능력',
    criteria: [
      { score:1, title:'매우 미흡', text:'내가 전달해야 하는 핵심 내용을 일부만 전달할 수 있으며, 설명 과정에서 누락되는 내용이 많다.' },
      { score:2, title:'미흡', text:'내가 전달해야 하는 내용을 대부분 빠짐없이 전달할 수 있으나, 상대방의 질문이나 반응에 대한 대응은 미흡하다.' },
      { score:3, title:'보통', text:'전달해야 할 내용을 정확하게 설명하고, 통화 흐름을 주도하며 학부모의 기본적인 질문에 적절하게 답변할 수 있다.' },
      { score:4, title:'우수', text:'학부모의 질문 중 본인이 모르는 내용이 나와도 당황하지 않고, 확인이 필요한 부분을 안내하거나 적절한 방법으로 대응할 수 있다.' },
      { score:5, title:'매우 우수', text:'학부모의 질문과 반응을 통해 궁금해하거나 걱정하는 부분을 먼저 파악하고, 필요한 정보를 선제적으로 설명할 수 있다.' },
    ],
  },
  trainTaskPerform: {
    desc: '주어진 업무를 스스로 확인하고 정확하게 완료하는 능력',
    criteria: [
      { score:1, title:'매우 미흡', text:'미션이나 업무를 수행하는 데 어려움이 크며, 안내를 받아도 결과물을 완성하지 못한다.' },
      { score:2, title:'미흡', text:'팀장의 구체적인 안내와 도움을 받아 미션이나 업무를 수행하고 결과물을 제출할 수 있다.' },
      { score:3, title:'보통', text:'라인 공지사항 및 제공된 자료를 스스로 확인하여 필요한 업무를 수행하고 제출할 수 있다.' },
      { score:4, title:'우수', text:'공지사항과 업무 내용을 스스로 확인하고, 정해진 시간과 기준에 맞춰 정확하게 업무를 완료한다.' },
      { score:5, title:'매우 우수', text:'주어진 업무를 수행하는 것에 그치지 않고, 교육에서 배운 내용을 다른 업무나 상황에 응용하여 스스로 추가적인 업무를 수행한다.' },
    ],
  },
  trainProblemSolving: {
    desc: '모르는 상황에서 멈추지 않고 해결책을 찾아 적용하는 능력',
    criteria: [
      { score:1, title:'매우 미흡', text:'모르는 상황이나 문제가 발생하면 스스로 해결하지 못하고 상황을 멈춘 채 기다린다.' },
      { score:2, title:'미흡', text:'모르는 상황이나 문제가 발생하면 스스로 도움을 요청하여 해결한다.' },
      { score:3, title:'보통', text:'문제가 발생했을 때 교육자료, 매뉴얼, 라인 공지사항 등을 스스로 찾아보며 해결 방법을 확인한다.' },
      { score:4, title:'우수', text:'문제가 발생하기 전에 발생 가능한 상황을 예상하고 필요한 내용을 미리 질문하거나 확인한다.' },
      { score:5, title:'매우 우수', text:'기존에 배운 내용과 경험을 응용하여 처음 접하는 상황에서도 적절한 해결 방법을 스스로 판단하고 실행한다.' },
    ],
  },
  trainContentKnowledge: {
    desc: '콘텐츠 / 업무 프로세스 / 그룹코칭 이해 / 보다에듀 / CAS — 5개 영역 중 이해한 과목의 개수로 점수를 제공합니다.',
    criteria: [
      { score:1, title:'1개 영역', text:'5개 영역(콘텐츠, 업무 프로세스, 그룹코칭 이해, 보다에듀, CAS) 중 1개 영역을 이해하고 있다.' },
      { score:2, title:'2개 영역', text:'5개 영역 중 2개 영역을 이해하고 있다.' },
      { score:3, title:'3개 영역', text:'5개 영역 중 3개 영역을 이해하고 있다.' },
      { score:4, title:'4개 영역', text:'5개 영역 중 4개 영역을 이해하고 있다.' },
      { score:5, title:'5개 영역', text:'5개 영역을 모두 이해하고 있다.' },
    ],
  },
  trainParticipation: {
    desc: '교육에 참여하는 태도와 적극성을 평가합니다.',
    criteria: [
      { score:1, title:'매우 미흡', text:'교육에 지각하거나 불참하는 경우가 있으며, 교육 중에도 참여가 원활하지 않다.' },
      { score:2, title:'미흡', text:'교육에는 참여하지만 집중력이 자주 흐트러지며, 안내가 있어야 교육 활동에 참여한다.' },
      { score:3, title:'보통', text:'정해진 시간에 참여하고 교육 내용을 따라가며, 주어진 활동과 미션을 수행한다.' },
      { score:4, title:'우수', text:'교육에 적극적으로 참여하며, 교육 중 궁금한 점이나 이해가 부족한 부분을 스스로 확인하고 질문한다.' },
      { score:5, title:'매우 우수', text:'교육 내용을 적극적으로 활용하고, 교육 후에도 관련 내용을 추가로 질문하거나 실제 업무에 적용하려는 모습을 보인다.' },
    ],
  },
  trainCasOperate: {
    desc: 'CAS(회원관리 시스템) 조작 숙련도를 평가합니다.',
    criteria: [
      { score:1, title:'매우 미흡', text:'필요한 회원을 검색하여 찾을 수 있다.' },
      { score:2, title:'미흡', text:'회원 검색 후 코칭 이력 작성, 코칭 일정 확인, 교안 다운로드 등 기본적인 회원 관리 기능을 수행할 수 있다.' },
      { score:3, title:'보통', text:'필요한 회원의 코칭을 위해 코칭룸을 스스로 생성하고 기본적인 수업 준비를 완료할 수 있다.' },
      { score:4, title:'우수', text:'상품 및 회원의 상황에 따라 첫 상담 이력을 적절하게 구분하여 작성할 수 있다.' },
      { score:5, title:'매우 우수', text:'회원의 학습 상황과 상품 특성을 고려하여 적절한 스케줄을 스스로 설정하고 필요한 CAS 기능을 종합적으로 활용할 수 있다.' },
    ],
  },
  // 정착교육 항목은 채점 기준 원문을 받으면 위와 같은 형식으로 채워주세요.
  settleClassDesign: null, settleMemberFeedback: null, settleApplication: null,
  settleCounselSat: null, settleMemberMgmtAbility: null, settleProblemSolving: null,
  settlePolicyUnderstand: null, settleAccuracy: null, settleErrorRate: null,
};

const NAV = [
  { key:'dashboard',  label:'Dashboard',  icon:'◆', href:'index.html' },
  { key:'interviews', label:'면접 일정',   icon:'📅', href:'interviews.html' },
  { key:'teachers',   label:'교사관리',    icon:'☰', href:'teachers.html' },
  { key:'recruit',    label:'채용관리',    icon:'✎', href:'teachers.html?filter=recruit' },
  { key:'train2w',    label:'신입교육',    icon:'●', href:'teachers.html?filter=train2w' },
  { key:'train4w',    label:'정착교육',    icon:'▲', href:'teachers.html?filter=train4w' },
  { key:'handover',   label:'인수인계',    icon:'⇄', href:'teachers.html?filter=handover' },
  { key:'settings',   label:'설정',        icon:'⚙', href:'settings.html' },
];

// Dashboard 사이드바 링크(?filter=recruit 등)를 교사관리 상태 필터로 매핑
// 'handover'는 단순 상태값이 아니라 "팀 배치 완료 + 기존팀(C2~C11) 배치" 복합 조건이라
// 이 맵에 넣지 않고 teachers-page.js에서 별도 분기로 처리합니다.
const NAV_FILTER_TO_STATUS = { recruit:'interview', train2w:'training2w', train4w:'training4w' };

const DETAIL_TABS = [
  { key:'basic',       label:'기본정보' },
  { key:'interview',   label:'면접평가' },
  { key:'train2w',     label:'신입교육' },
  { key:'settle4w',    label:'정착교육' },
  { key:'handover',    label:'인수인계' },
  { key:'report',      label:'최종리포트' },
];

/* ============================================================
   loadDynamicConfig()
   -------------------------------------------------------------
   설정 페이지에서 관리자가 추가/삭제한 팀·진행상태 목록을 불러와
   위의 전역 변수들을 갱신합니다. 각 페이지 부트스트랩의 맨 처음에
   반드시 호출해야 합니다.
============================================================ */
async function loadDynamicConfig(){
  const teamConfig = await storageService.getTeamConfig();
  NEW_TEAMS = teamConfig.newTeams;
  PLACED_TEAMS = teamConfig.placedTeams;
  ALL_TEAMS = [...NEW_TEAMS, ...PLACED_TEAMS];

  let statusConfig = await storageService.getStatusConfig();
  // 기존에 저장된 데이터에는 '면접 탈락' 상태가 없을 수 있으므로 없으면 자동으로 추가합니다.
  if(!statusConfig.some(s=>s.key===REJECTED_STATUS_KEY)){
    statusConfig = [...statusConfig, { key:REJECTED_STATUS_KEY, label:'면접 탈락', color:'red' }];
    await storageService.saveStatusConfig(statusConfig);
  }
  STATUS = {};
  statusConfig.forEach(s=>{ STATUS[s.key] = { label:s.label, color:s.color||'primary' }; });

  TRAINING_COHORTS = await storageService.getTrainingCohorts();

  INTERVIEW_ROOMS = await storageService.getInterviewRooms();
  INTERVIEWERS = await storageService.getInterviewers();
}
