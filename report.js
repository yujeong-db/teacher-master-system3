/* ============================================================
   Teacher Talent Management System — V2
   report.js
   -------------------------------------------------------------
   최종리포트/면접평가 탭에서 쓰는 "우수배지·주의배지 자동 생성"과
   AI 요약/분석 문구 생성을 담당합니다. 차트 렌더링 자체는 ChartService가
   맡고, 이 서비스는 표시할 텍스트·배지 데이터만 만들어 돌려줍니다.
============================================================ */
class ReportService {
  // 평가 점수 기반으로 우수배지(good)/주의배지(watch)를 자동 생성합니다.
  computeBadges(record){
    const s = record.scores;
    const good = [], watch = [];
    const g = (v,label)=>{ if(Number(v)>=4.5) good.push(label); };
    const w = (v,label)=>{ if(Number(v)>0 && Number(v)<=2.5) watch.push(label); };
    g(s.settle4w?.settleClassDesign, '🏆 수업 우수'); g(s.interview?.content, '🏆 수업 우수');
    g(s.settle4w?.settleMemberMgmtAbility, '🏆 회원관리 우수');
    g(s.train2w?.trainCommunication, '🏆 소통 우수'); g(s.settle4w?.settleCounselSat, '🏆 소통 우수');
    g(s.settle4w?.settleMemberFeedback, '🏆 피드백 반영 우수');
    w(s.settle4w?.settleProblemSolving, '⚠ 문제 해결 코칭 필요');
    w(s.settle4w?.settleAccuracy, '⚠ 업무 정확성 보완');
    w(s.train2w?.trainProblemSolving, '⚠ 문제해결 경험 부족');
    return { good:[...new Set(good)].slice(0,4), watch:[...new Set(watch)].slice(0,4) };
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
