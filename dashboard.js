/* ============================================================
   Teacher Talent Management System — V2
   dashboard.js
   -------------------------------------------------------------
   DashboardService: Dashboard 화면에 필요한 집계만 담당합니다.
   점수 계산 자체는 TeacherService에 위임해서 중복 계산을 피합니다.

   이 파일은 index.html 전용 페이지 부트스트랩(bootDashboard)과 렌더
   함수도 함께 포함합니다.
============================================================ */
class DashboardService {
  constructor(teacherService){ this.ts = teacherService; }

  getKPIs(teachers){
    const count = s => teachers.filter(t=>t.status===s).length;
    const growths = teachers.map(t=>this.ts.growthPct(t)).filter(v=>v!==null);
    const avgGrowth = growths.length ? growths.reduce((a,b)=>a+b,0)/growths.length : null;
    return [
      { label:'전체 교사',       val: teachers.length },
      { label:'채용진행 중',     val: count('interview') },
      { label:'평균 성장률',     val: avgGrowth!==null ? (avgGrowth>=0?'+':'')+avgGrowth.toFixed(1)+'%' : '–' },
    ];
  }

  // 신입교사 성장 추이: 신입 교육 일정에서 "완료 처리"하지 않아 계속 노출되는(숨기지 않은)
  // 기수 중 가장 최근 2개 기수를 대상으로, 직무(영어/교과)별로 신입교육(2주차)·정착교육(4주차)
  // "총점(종합점수)" 평균을 비교합니다. 기수 × 직무 조합마다 그래프를 하나씩 만듭니다
  // (예: 기수 2개 x 직무 2개 = 그래프 4개). Dashboard에서 "완료" 처리해 기수를 숨기면
  // 자동으로 다음으로 최근인 기수가 그 자리를 채웁니다.
  getRecentCohortJobGrowth(teachers){
    const visibleCohorts = TRAINING_COHORTS.filter(c=>!c.completed).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const recentCohorts = visibleCohorts.slice(0,2).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    const jobs = ['english','subject'];
    const groups = [];
    recentCohorts.forEach(cohort=>{
      jobs.forEach(jobKey=>{
        const list = teachers.filter(t=> t.cohortId===cohort.id && t.job===jobKey && t.status!==REJECTED_STATUS_KEY);
        const trainVals = list.map(t=>this.ts.avgOf(t.scores.train2w, TRAIN_SCORES)).filter(v=>v!==null);
        const settleVals = list.map(t=>this.ts.avgOf(t.scores.settle4w, SETTLE_SCORES)).filter(v=>v!==null);
        groups.push({
          key: `${cohort.id}_${jobKey}`,
          cohortLabel: cohort.label,
          cohortDate: cohort.date,
          jobLabel: JOB_TYPES[jobKey] ? JOB_TYPES[jobKey].label : jobKey,
          teacherCount: list.length,
          trainAvg: trainVals.length ? trainVals.reduce((a,b)=>a+b,0)/trainVals.length : null,
          settleAvg: settleVals.length ? settleVals.reduce((a,b)=>a+b,0)/settleVals.length : null,
        });
      });
    });
    return groups;
  }

  // 신입팀(CNE1/CN1) 배치 현황: 교사의 "현재 소속팀(currentTeam)"을 읽어 자동 계산
  getNewTeamRoster(teachers, teamCode){
    return teachers
      .filter(t => t.currentTeam === teamCode)
      .slice()
      .sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  }
}
const dashboardService = new DashboardService(teacherService);

/* ============================================================
   DASHBOARD PAGE BOOTSTRAP (index.html)
============================================================ */
async function bootDashboard(){
  await seedIfEmpty();
  await loadDynamicConfig();
  await ui.initEvaluatorSelect();

  const teachers = await teacherService.list();
  ui.initGlobalSearch(teachers);
  renderNavCounts(teachers);

  renderKPIs(teachers);
  renderTrainingSchedule(teachers);
  initCohortModal();
  initHiddenCohortsToggle();
  renderNewTeamRosters(teachers);
  renderGrowthChart(teachers);

  document.getElementById('notifyBtn')?.addEventListener('click', ()=>{
    ui.toast('알림 기능은 준비 중이에요.');
  });
}

function renderKPIs(teachers){
  const kpis = dashboardService.getKPIs(teachers);
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = kpis.map((k,idx)=>`
    <div class="kpi">
      <div class="klabel">${k.label}</div>
      <div class="kval mono" id="kpi-${idx}">0</div>
    </div>`).join('');
  kpis.forEach((k,idx)=> ui.countUp(document.getElementById(`kpi-${idx}`), k.val));
}

function renderNewTeamRosters(teachers){
  const wrap = document.getElementById('newTeamGrid');
  wrap.innerHTML = NEW_TEAMS.map(code=>`
    <div class="card card-pad newteam-card" data-team="${code}">
      <div class="nt-head">
        <span class="nt-name">${code}</span>
        <span class="nt-count">현재 인원 <b id="nt-count-${code}">0</b>명</span>
      </div>
      <input type="text" class="nt-search" placeholder="이름으로 검색" data-team-search="${code}"/>
      <div class="nt-list" id="nt-list-${code}"></div>
    </div>`).join('');

  const paint = (code, query)=>{
    let list = dashboardService.getNewTeamRoster(teachers, code);
    if(query) list = teacherService.search(list, query);
    document.getElementById(`nt-count-${code}`).textContent = dashboardService.getNewTeamRoster(teachers, code).length;
    const listEl = document.getElementById(`nt-list-${code}`);
    listEl.innerHTML = list.length
      ? list.map(t=>`
          <div class="nt-item" data-id="${t.id}">
            <span class="avatar nt-avatar">${ui.initials(t.name)}</span>
            <span style="flex:1">${ui.escapeHtml(t.name)}</span>
            <span class="badge status-${t.status}">${STATUS[t.status].label}</span>
          </div>`).join('')
      : `<div class="nt-empty">배치된 교사가 없어요.</div>`;
    listEl.querySelectorAll('.nt-item').forEach(el=>{
      el.addEventListener('click', ()=>{ location.href = `teacher-detail.html?id=${el.dataset.id}`; });
    });
  };

  NEW_TEAMS.forEach(code=>{
    paint(code, '');
    document.querySelector(`[data-team-search="${code}"]`).addEventListener('input', (e)=>paint(code, e.target.value));
  });
}

function renderGrowthChart(teachers){
  const groups = dashboardService.getRecentCohortJobGrowth(teachers);
  const grid = document.getElementById('growthChartGrid');
  if(!grid) return;

  if(!groups.length){
    grid.innerHTML = '<div class="card-sub" style="padding-top:4px">신입 교육 일정을 등록하면 기수별 성장 추이를 확인할 수 있어요. 완료 처리하지 않은(숨기지 않은) 기수 중 최근 2개가 자동으로 표시돼요.</div>';
    return;
  }

  grid.innerHTML = groups.map(g=>`
    <div class="growth-chart-cell">
      <div class="growth-chart-cell-title">${ui.escapeHtml(g.jobLabel)} · ${ui.escapeHtml(g.cohortLabel)}</div>
      <div class="chart-h" style="height:200px"><canvas id="chartGrowth_${g.key}"></canvas></div>
      <div class="card-sub" style="margin:6px 0 0;text-align:center">${g.teacherCount}명</div>
    </div>`).join('');

  groups.forEach(g=>{
    const ctx = document.getElementById(`chartGrowth_${g.key}`);
    if(!ctx) return;
    if(g.trainAvg===null && g.settleAvg===null){
      ctx.closest('.chart-h').innerHTML = '<div class="card-sub" style="padding-top:20px;text-align:center">아직 평가 데이터가 없어요.</div>';
      return;
    }
    // 막대 위에 정확한 평균 점수를 함께 표시합니다.
    chartService.categoryItemsChart(`growth_${g.key}`, ctx, ['신입교육 평균','정착교육 평균'], [g.trainAvg, g.settleAvg], ['#4F7CFF','#8B6FF0']);
  });
}

/* ============================================================
   신입 교육 일정(기수) — D-day / 채용 목표·완료·추가 필요 인원
============================================================ */
function dDayInfo(dateStr){
  if(!dateStr) return null;
  const target = new Date(dateStr+'T00:00:00');
  if(isNaN(target.getTime())) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((target-today)/86400000);
  const label = diff>0 ? `D-${diff}` : diff===0 ? 'D-DAY' : `D+${Math.abs(diff)}`;
  return { diff, label };
}

// 기수 시작일(cohort.date)이 곧 그 기수 교사들의 "입과일"로 취급됩니다.
const RETENTION_CUTOFF_MS = 1000*60*60*24*30*3; // 30일 x 3 근사치(3개월)

function cohortRecruitStats(cohort, teachers){
  const engTeachers = teachers.filter(t=>t.cohortId===cohort.id && t.job==='english');
  const subTeachers = teachers.filter(t=>t.cohortId===cohort.id && t.job==='subject');
  const eng = engTeachers.length, sub = subTeachers.length;
  const targetEng = Number(cohort.targetEnglish)||0;
  const targetSub = Number(cohort.targetSubject)||0;

  // 3개월 경과 여부(=입과일 기준) 판단 후, 그 시점 기준으로 해촉되지 않은 비율을 "정착률"로 계산합니다.
  const cohortStart = cohort.date ? new Date(cohort.date+'T00:00:00').getTime() : NaN;
  const pastThreeMonths = !isNaN(cohortStart) && (Date.now()-cohortStart) >= RETENTION_CUTOFF_MS;
  const retentionRate = (list)=>{
    if(!pastThreeMonths || !list.length) return null;
    const kept = list.filter(t=>t.status!=='dismissed').length;
    return (kept/list.length)*100;
  };

  return {
    eng, sub, targetEng, targetSub,
    total: eng+sub, target: targetEng+targetSub,
    remainEng: Math.max(targetEng-eng,0),
    remainSub: Math.max(targetSub-sub,0),
    remain: Math.max((targetEng+targetSub)-(eng+sub),0),
    rateEng: targetEng>0 ? Math.min(100,(eng/targetEng)*100) : null,
    rateSub: targetSub>0 ? Math.min(100,(sub/targetSub)*100) : null,
    pastThreeMonths,
    retentionEng: retentionRate(engTeachers),
    retentionSub: retentionRate(subTeachers),
  };
}

// 기수 한 행의 HTML — 목록(활성)과 숨겨진 기수 드롭다운에서 공용으로 씁니다.
function cohortRowHtml(c, teachers, isHidden){
  const stats = cohortRecruitStats(c, teachers);
  const dd = dDayInfo(c.date);
  const isPast = dd && dd.diff<0;
  const toggleBtn = isHidden
    ? `<button type="button" class="btn btn-ghost btn-sm" data-action="uncompleteCohort" data-id="${c.id}">미완료</button>`
    : `<button type="button" class="btn btn-ghost btn-sm" data-action="completeCohort" data-id="${c.id}">완료</button>`;
  return `<div class="cohort-row ${isPast?'past':''}">
    <div class="cr-head">
      <span class="cr-dday ${isPast?'muted':''}">${dd?dd.label:''}</span>
      <span class="cr-label">${ui.escapeHtml(c.label)}</span>
      <span class="cr-date">${ui.fmtDate(c.date)}</span>
      <span style="margin-left:auto;display:flex;gap:6px">
        ${toggleBtn}
        <button type="button" class="note-del" data-action="deleteCohort" data-id="${c.id}">삭제</button>
      </span>
    </div>
    <div class="cr-jobs">
      <div class="cr-job">
        <span>${JOB_TYPES.english.label}</span>
        <span class="cr-job-nums">목표 <input type="number" min="0" class="cf-target-input" data-id="${c.id}" data-job="targetEnglish" value="${stats.targetEng}" ${c.completed?'disabled':''}> 명 · 완료 ${stats.eng}명 · 추가 ${stats.remainEng}명${stats.rateEng!==null?` · 달성률 <b>${stats.rateEng.toFixed(0)}%</b>`:''}${stats.retentionEng!==null?` · 3개월 정착률 <b>${stats.retentionEng.toFixed(0)}%</b>`:''}</span>
      </div>
      <div class="cr-job">
        <span>${JOB_TYPES.subject.label}</span>
        <span class="cr-job-nums">목표 <input type="number" min="0" class="cf-target-input" data-id="${c.id}" data-job="targetSubject" value="${stats.targetSub}" ${c.completed?'disabled':''}> 명 · 완료 ${stats.sub}명 · 추가 ${stats.remainSub}명${stats.rateSub!==null?` · 달성률 <b>${stats.rateSub.toFixed(0)}%</b>`:''}${stats.retentionSub!==null?` · 3개월 정착률 <b>${stats.retentionSub.toFixed(0)}%</b>`:''}</span>
      </div>
    </div>
  </div>`;
}

function attachCohortRowHandlers(root, teachers){
  if(!root) return;
  root.querySelectorAll('[data-action="deleteCohort"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(!confirm('이 교육 일정을 삭제할까요?')) return;
      TRAINING_COHORTS = TRAINING_COHORTS.filter(c=>c.id!==btn.dataset.id);
      await storageService.saveTrainingCohorts(TRAINING_COHORTS);
      ui.toast('교육 일정을 삭제했어요.');
      renderTrainingSchedule(teachers);
    });
  });
  root.querySelectorAll('[data-action="completeCohort"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const cohort = TRAINING_COHORTS.find(c=>c.id===btn.dataset.id);
      if(!cohort) return;
      cohort.completed = true;
      await storageService.saveTrainingCohorts(TRAINING_COHORTS);
      ui.toast(cohort.label+' 일정을 완료 처리했어요.');
      renderTrainingSchedule(teachers);
    });
  });
  root.querySelectorAll('[data-action="uncompleteCohort"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const cohort = TRAINING_COHORTS.find(c=>c.id===btn.dataset.id);
      if(!cohort) return;
      cohort.completed = false;
      await storageService.saveTrainingCohorts(TRAINING_COHORTS);
      ui.toast(cohort.label+' 일정을 다시 활성화했어요.');
      renderTrainingSchedule(teachers);
    });
  });
  root.querySelectorAll('.cf-target-input').forEach(inp=>{
    inp.addEventListener('change', async ()=>{
      const cohort = TRAINING_COHORTS.find(c=>c.id===inp.dataset.id);
      if(!cohort) return;
      cohort[inp.dataset.job] = Math.max(0, Number(inp.value)||0);
      await storageService.saveTrainingCohorts(TRAINING_COHORTS);
      ui.toast('목표 인원을 수정했어요.');
      renderTrainingSchedule(teachers);
    });
  });
}

function renderTrainingSchedule(teachers){
  const featured = document.getElementById('cohortFeatured');
  const wrap = document.getElementById('cohortListWrap');
  const hiddenPanel = document.getElementById('hiddenCohortsPanel');
  const hiddenCountEl = document.getElementById('hiddenCohortsCount');
  if(!featured || !wrap) return;

  const allCohorts = TRAINING_COHORTS.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const visibleCohorts = allCohorts.filter(c=>!c.completed);
  const hiddenCohorts = allCohorts.filter(c=>c.completed);

  if(hiddenCountEl) hiddenCountEl.textContent = hiddenCohorts.length;

  if(!visibleCohorts.length){
    featured.innerHTML = '';
    wrap.innerHTML = `<div class="empty-block">${allCohorts.length
      ? '표시할 신입 교육 일정이 없어요. 완료 처리된 기수는 "숨겨진 기수" 버튼에서 확인할 수 있어요.'
      : '아직 등록된 신입 교육 일정이 없어요.<br>"+ 교육 일정 등록" 버튼으로 첫 일정을 등록해 보세요.'}</div>`;
  } else {
    const upcoming = visibleCohorts.filter(c=>{ const d=dDayInfo(c.date); return d && d.diff>=0; });
    const next = upcoming[0] || null;

    if(next){
      const stats = cohortRecruitStats(next, teachers);
      const dd = dDayInfo(next.date);
      featured.innerHTML = `
        <div class="cohort-featured">
          <div class="cf-left">
            <div class="cf-dday">${dd.label}</div>
            <div class="cf-meta">
              <div class="cf-badge">다가오는 신입 교육</div>
              <div class="cf-label">${ui.escapeHtml(next.label)}</div>
              <div class="cf-date">${ui.fmtDate(next.date)} 시작</div>
            </div>
          </div>
          <div class="cf-stats">
            <div class="cf-stat"><div class="cf-stat-label">채용 목표</div><div class="cf-stat-val">${stats.target}명</div></div>
            <div class="cf-stat"><div class="cf-stat-label">채용 완료</div><div class="cf-stat-val" style="color:var(--primary-ink)">${stats.total}명</div></div>
            <div class="cf-stat"><div class="cf-stat-label">추가 채용 필요</div><div class="cf-stat-val" style="color:${stats.remain>0?'var(--red)':'var(--green)'}">${stats.remain}명</div></div>
          </div>
        </div>`;
    } else {
      featured.innerHTML = `<div class="empty-block">다가오는 신입 교육 일정이 없어요. 새 일정을 등록해보세요.</div>`;
    }

    wrap.innerHTML = `<div class="cohort-list">` + visibleCohorts.map(c=>cohortRowHtml(c, teachers, false)).join('') + `</div>`;
  }

  if(hiddenPanel){
    hiddenPanel.innerHTML = hiddenCohorts.length
      ? `<div class="cohort-list">` + hiddenCohorts.map(c=>cohortRowHtml(c, teachers, true)).join('') + `</div>`
      : `<div class="card-sub" style="margin:6px 4px 0">완료 처리된 기수가 없어요.</div>`;
  }

  attachCohortRowHandlers(wrap, teachers);
  attachCohortRowHandlers(hiddenPanel, teachers);
}

function initHiddenCohortsToggle(){
  const btn = document.getElementById('hiddenCohortsBtn');
  const panel = document.getElementById('hiddenCohortsPanel');
  if(!btn || !panel) return;
  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    panel.style.display = panel.style.display==='block' ? 'none' : 'block';
  });
  document.addEventListener('click', (e)=>{
    if(panel.style.display==='block' && !e.target.closest('#hiddenCohortsPanel') && !e.target.closest('#hiddenCohortsBtn')){
      panel.style.display = 'none';
    }
  });
}

function initCohortModal(){
  const openBtn = document.getElementById('addCohortBtn');
  const overlay = document.getElementById('addCohortModal');
  if(!openBtn || !overlay) return;

  const close = ()=>{ overlay.style.display='none'; overlay.querySelector('form').reset(); };
  openBtn.addEventListener('click', ()=>{ overlay.style.display='flex'; document.getElementById('newCohortLabel').focus(); });
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
  overlay.querySelectorAll('[data-action="closeAddCohort"]').forEach(el=>el.addEventListener('click', close));

  overlay.querySelector('form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const label = document.getElementById('newCohortLabel').value.trim();
    const date = document.getElementById('newCohortDate').value;
    if(!label || !date){ ui.toast('기수명과 교육 시작일을 입력해주세요.'); return; }
    const cohort = {
      id: 'CO' + Date.now().toString(36) + Math.random().toString(36).slice(2,5),
      label, date,
      targetEnglish: Math.max(0, Number(document.getElementById('newCohortTargetEnglish').value)||0),
      targetSubject: Math.max(0, Number(document.getElementById('newCohortTargetSubject').value)||0),
      completed: false,
    };
    TRAINING_COHORTS = [...TRAINING_COHORTS, cohort];
    await storageService.saveTrainingCohorts(TRAINING_COHORTS);
    ui.toast(label+' 일정이 등록됐어요.');
    close();
    const teachers = await teacherService.list();
    renderTrainingSchedule(teachers);
  });
}
