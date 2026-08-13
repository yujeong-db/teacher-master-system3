/* ============================================================
   Teacher Talent Management System — V2
   report.js
   -------------------------------------------------------------
   최종리포트/면접평가 탭에서 쓰는 "우수배지·주의배지 자동 생성"과
   AI 요약/분석 문구 생성을 담당합니다. 차트 렌더링 자체는 ChartService가
   맡고, 이 서비스는 표시할 텍스트·배지 데이터만 만들어 돌려줍니다.
============================================================ */
// 항목별 "보완 필요" 시 보여줄 개선 방법 1~2줄 + 추천 교육. 항목 key 기준.
const ADVICE_MAP = {
  envReady: { advice:'조명·마이크 세팅을 점검하고 카메라 응시 비율을 높이는 연습이 필요해요.', training:'온라인 수업 환경 세팅 가이드 교육' },
  content: { advice:'도입-전개-마무리 시간 배분을 미리 리허설하고, 질문으로 참여를 유도하는 연습이 필요해요.', training:'수업 설계·시연 코칭' },
  voice: { advice:'발음과 목소리 톤에 강약을 주는 낭독 연습으로 전달력을 높여보세요.', training:'보이스 트레이닝·딕션 교육' },
  gesture: { advice:'리액션과 제스처를 의식적으로 크게 사용하는 연습이 필요해요.', training:'비언어적 커뮤니케이션 코칭' },
  material: { advice:'자료의 핵심 포인트를 짚어가며 설명하는 연습과 판서 기능 숙달이 필요해요.', training:'수업 자료·툴 활용 교육' },
  trainContentUnderstand: { advice:'콘텐츠·교재 내용을 반복 학습하고 모의 테스트로 점검이 필요해요.', training:'콘텐츠 이해 보충 교육' },
  trainProgramOperate: { advice:'수업 프로그램 조작을 반복 실습해 익숙해지는 연습이 필요해요.', training:'프로그램 조작 실습 교육' },
  trainDelivery: { advice:'핵심 내용을 짧고 명확하게 전달하는 스피치 연습이 필요해요.', training:'전달력 강화 코칭' },
  trainCommunication: { advice:'동료·회원과의 소통 상황을 롤플레이로 연습해보는 게 도움이 돼요.', training:'커뮤니케이션 스킬 교육' },
  trainTaskPerform: { advice:'업무 체크리스트를 활용해 처리 속도와 정확도를 높이는 연습이 필요해요.', training:'업무 프로세스 교육' },
  trainProblemSolving: { advice:'다양한 케이스 스터디로 문제 상황 대응력을 길러보세요.', training:'문제해결 코칭' },
  trainContentKnowledge: { advice:'시험 결과를 바탕으로 취약 단원을 다시 학습해보세요.', training:'콘텐츠 재교육 및 재시험' },
  trainParticipation: { advice:'교육 세션에 적극적으로 질문하고 참여하는 태도가 필요해요.', training:'1:1 멘토링 코칭' },
  trainCasOperate: { advice:'CAS 시스템 조작을 반복 실습해 숙련도를 높여보세요.', training:'CAS 시스템 실습 교육' },
  settleClassDesign: { advice:'수업 흐름과 구성을 미리 설계해보는 연습이 필요해요.', training:'수업 설계 코칭' },
  settleMemberFeedback: { advice:'회원별 맞춤 피드백을 기록하고 정기적으로 전달하는 습관이 필요해요.', training:'피드백 작성 교육' },
  settleApplication: { advice:'배운 내용을 다양한 상황에 응용하는 연습이 필요해요.', training:'응용력 강화 코칭' },
  settleCounselSat: { advice:'상담 스크립트를 점검하고 공감적 커뮤니케이션 연습이 필요해요.', training:'상담 스킬 교육' },
  settleMemberMgmtAbility: { advice:'회원 관리 프로세스를 체크리스트화해 누락 없이 관리하는 연습이 필요해요.', training:'회원관리 실무 교육' },
  settleProblemSolving: { advice:'실제 발생했던 이슈 사례를 함께 리뷰하며 대응력을 길러보세요.', training:'문제해결 코칭' },
  settlePolicyUnderstand: { advice:'시험 결과를 바탕으로 정책 매뉴얼을 다시 숙지해보세요.', training:'정책 재교육 및 재시험' },
  settleAccuracy: { advice:'당일 예정 업무부터 월간 업무까지 미리 파악해 계획적으로 처리하는 습관이 필요해요.', training:'업무 계획·수행 관리 교육' },
  settleErrorRate: { advice:'반복되는 실수 유형을 기록하고 나만의 점검 기준을 만들어 관리하는 루틴이 필요해요.', training:'업무 정확도 향상 교육' },
};

class ReportService {
  // 평가 점수 기반으로 우수배지(good)/보완필요 항목(watch)을 자동 생성합니다.
  // watch 항목에는 개선 방법(advice)과 추천 교육(training)을 함께 담습니다.
  computeBadges(record){
    const s = record.scores;
    const allItems = [
      ...INTERVIEW_SCORES.map(f=>({ key:f.key, label:f.label, val:s.interview?.[f.key] })),
      ...TRAIN_SCORES.map(f=>({ key:f.key, label:f.label, val:s.train2w?.[f.key] })),
      ...SETTLE_SCORES.map(f=>({ key:f.key, label:f.label, val:s.settle4w?.[f.key] })),
    ];
    const good = [], watch = [];
    allItems.forEach(item=>{
      const v = Number(item.val);
      if(!v) return;
      if(v>=4.5) good.push(`🏆 ${item.label} 우수`);
      else if(v<=2.5){
        const info = ADVICE_MAP[item.key] || {};
        watch.push({ label:item.label, value:v, advice: info.advice || '해당 영역에 대한 코칭과 반복 연습이 필요해요.', training: info.training || '' });
      }
    });
    return { good:[...new Set(good)].slice(0,6), watch: watch.slice(0,6) };
  }

  // 면접평가 탭의 "AI Summary"
  generateInterviewSummary(record){
    const avg = teacherService.avgOf(record.scores.interview, INTERVIEW_SCORES);
    if(avg===null) return '아직 평가 점수가 입력되지 않았어요. 항목별 별점을 매기면 자동으로 총평이 생성됩니다.';
    const sorted = INTERVIEW_SCORES.map(f=>({...f, v:Number(record.scores.interview[f.key])||0})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
    const top = sorted[0], bottom = sorted[sorted.length-1];
    const tone = avg>=4.5?'매우 우수한':avg>=3.5?'우수한':avg>=2.5?'무난한':'보완이 필요한';
    let text = `이 교사는 수업시연 평가에서 평균 ${avg.toFixed(1)}점으로 ${tone} 인상을 남겼습니다.`;
    if(top) text += ` 특히 <b>${top.label}</b> 항목에서 강점을 보였습니다.`;
    if(bottom && bottom.key!==top?.key && bottom.v<=3) text += ` 반면 <b>${bottom.label}</b> 항목은 보완이 필요해 보입니다.`;
    return text;
  }

  // 최종리포트 탭의 "강점" 문장
  generateStrengthSentence(record){
    const all = [];
    INTERVIEW_SCORES.forEach(f=>{ const v=Number(record.scores.interview[f.key]); if(v>0) all.push({label:f.label,v}); });
    TRAIN_SCORES.forEach(f=>{ const v=Number(record.scores.train2w[f.key]); if(v>0) all.push({label:f.label,v}); });
    SETTLE_SCORES.forEach(f=>{ const v=Number(record.scores.settle4w[f.key]); if(v>0) all.push({label:f.label,v}); });
    const top = all.filter(x=>x.v>=4).sort((a,b)=>b.v-a.v).slice(0,3);
    if(!top.length) return '아직 두드러진 강점을 파악할 만한 평가 데이터가 부족해요.';
    return `${top.map(x=>x.label).join(', ')} 영역에서 특히 높은 평가를 받았습니다. 이러한 강점을 살려 배치 후에도 꾸준한 성과가 기대됩니다.`;
  }

  // 최종리포트 탭의 "AI 성장 분석"
  generateAIAnalysis(record, stageAvgs, growth){
    const a = stageAvgs;
    const parts = [];
    if(a.interview!==null) parts.push(`면접(수업시연) 단계에서는 평균 ${a.interview.toFixed(1)}점의 평가를 받았습니다.`);
    if(a.train2w!==null) parts.push(`신입교육 2주 과정을 거치며 평균 ${a.train2w.toFixed(1)}점으로 ${a.interview!==null?(a.train2w>=a.interview?'역량이 향상되었습니다.':'다소 조정이 필요한 모습을 보였습니다.'):'평가되었습니다.'}`);
    if(a.settle4w!==null) parts.push(`정착교육 4주 동안에는 평균 ${a.settle4w.toFixed(1)}점을 기록하며 실무 적응력을 보여주었습니다.`);
    if(growth!==null) parts.push(`전체 과정에서 ${growth>=0?'+'+growth.toFixed(1)+'%의 성장률':growth.toFixed(1)+'%의 변화'}를 나타냈습니다.`);
    if(!parts.length) return '평가 데이터가 쌓이면 이 교사의 성장 과정을 자동으로 분석해드려요.';
    parts.push('앞으로도 강점 영역을 중심으로 코칭을 이어가면 더 큰 성장이 기대됩니다.');
    return parts.join(' ');
  }

  // 최종리포트 탭의 "성장 타임라인" 단계
  buildStageTimeline(record, stageAvgs){
    const a = stageAvgs;
    return [
      { label:'교사 등록', on:!!record.createdAt, date: ui.fmtDate(record.createdAt) },
      { label:'면접평가', on:a.interview!==null, date: ui.fmtDate(record.interview.date), score:a.interview },
      { label:'신입교육 2주', on:a.train2w!==null, score:a.train2w },
      { label:'정착교육 4주', on:a.settle4w!==null, score:a.settle4w },
      { label:'팀 배치', on: record.status==='placed'||!!record.currentTeam, date: record.currentTeam? record.currentTeam+' 배치':'' },
    ];
  }
}
const reportService = new ReportService();
