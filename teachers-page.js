/* ============================================================
   Teacher Talent Management System — V2
   teachers-page.js
   -------------------------------------------------------------
   teachers.html(교사관리) 전용 페이지 부트스트랩입니다. 데이터/도메인
   로직은 TeacherService·StorageService에 위임하고, 이 파일은 화면
   렌더링과 필터 상태 관리만 담당합니다.

   ?filter= 파라미터가 있으면 "잠긴(locked)" 전용 화면으로 동작합니다
   (채용관리/신입교육/정착교육/인수인계). 상태·팀 필터 칩은 숨기고,
   해당 조건에 맞는 교사만 보여줍니다. 파라미터가 없으면(교사관리 기본
   화면) 전체 교사를 검색·칩 필터로 자유롭게 조회합니다.
============================================================ */
let PHONE_DUP_COUNTS = {};
let TEACHER_PHONE_DUP_COUNTS = {};
let REJECTED_SEEN_IDS = [];

async function bootTeachersPage(){
  await seedIfEmpty();
  await loadDynamicConfig();
  await ui.initEvaluatorSelect();

  const teachers = await teacherService.list();
  ui.initGlobalSearch(teachers);
  renderNavCounts(teachers);

  // 면접 일정의 전화번호를 기준으로 "중복지원" 여부를 계산합니다.
  const interviewSchedules = await storageService.getInterviewSchedules();
  PHONE_DUP_COUNTS = {};
  interviewSchedules.forEach(s=>{ if(s.phone) PHONE_DUP_COUNTS[s.phone] = (PHONE_DUP_COUNTS[s.phone]||0)+1; });

  // 같은 전화번호로 교사가 2번 이상 등록된 경우도 "중복지원"으로 계산합니다.
  TEACHER_PHONE_DUP_COUNTS = {};
  teachers.forEach(t=>{ if(t.phone) TEACHER_PHONE_DUP_COUNTS[t.phone] = (TEACHER_PHONE_DUP_COUNTS[t.phone]||0)+1; });

  const settings = await storageService.getSettings();
  REJECTED_SEEN_IDS = settings.rejectedSeenIds || [];

  const params = new URLSearchParams(location.search);
  const filterParam = params.get('filter');
  const pageInfo = getLockedFilterInfo(filterParam);

  const listState = {
    query: '',
    statusFilter: new Set(),
    teamFilter: new Set(),
    jobFilter: new Set(),
    lockedFilter: pageInfo ? filterParam : null,
  };

  if(pageInfo){
    applyPageHeader(pageInfo);
    document.getElementById('statusFilterChips').style.display = 'none';
    document.getElementById('teamFilterChips').style.display = 'none';
  } else {
    renderStatusFilterChips(listState, teachers);
    renderTeamFilterChips(listState, teachers);
  }
  renderJobFilterChips(listState, teachers);

  renderTeacherTable(teachers, listState);
  initAddTeacherModal();

  document.getElementById('listSearchInput')?.addEventListener('input', (e)=>{
    listState.query = e.target.value;
    renderTeacherTable(teachers, listState);
  });
  document.getElementById('notifyBtn')?.addEventListener('click', ()=> ui.toast('알림 기능은 준비 중이에요.'));
}

function getLockedFilterInfo(filterParam){
  const map = {
    recruit:  { title:'채용관리', sub:'진행상태가 "채용진행 중"인 교사만 표시됩니다. 모두 소속팀이 미배치 상태예요.' },
    train2w:  { title:'신입교육', sub:'진행상태가 "신입교육"인 교사만 표시됩니다.' },
    train4w:  { title:'정착교육', sub:'진행상태가 "정착교육"인 교사만 표시됩니다. 소속팀을 기존팀(C2~C11)으로 지정하면 자동으로 "팀 배치 완료"로 전환돼요.' },
    handover: { title:'인수인계', sub:'진행상태가 "팀 배치 완료"이고 기존팀(C2~C11)에 배치된 교사만 표시됩니다.' },
  };
  return map[filterParam] || null;
}
function applyPageHeader(pageInfo){
  const titleEl = document.querySelector('.page-title');
  const subEl = document.querySelector('.page-sub');
  if(titleEl) titleEl.textContent = pageInfo.title;
  if(subEl) subEl.textContent = pageInfo.sub;
}

function renderStatusFilterChips(listState, teachers){
  const wrap = document.getElementById('statusFilterChips');
  if(!wrap) return;
  const options = Object.entries(STATUS).map(([key,v])=>({ key, label:v.label }));
  const paint = ()=>{
    wrap.innerHTML = options.map(opt=>{
      const hasNew = opt.key===REJECTED_STATUS_KEY &&
        teachers.some(t=>t.status===REJECTED_STATUS_KEY && !REJECTED_SEEN_IDS.includes(t.id));
      return `<button class="filter-chip ${listState.statusFilter.has(opt.key)?'on':''}" data-status="${opt.key}">${opt.label}${hasNew?' <span class="chip-new">New</span>':''}</button>`;
    }).join('');
    wrap.querySelectorAll('.filter-chip').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const key = btn.dataset.status;
        const turningOn = !listState.statusFilter.has(key);
        listState.statusFilter.has(key) ? listState.statusFilter.delete(key) : listState.statusFilter.add(key);
        // "면접 탈락" 칩을 열어보면 그 시점의 탈락자들을 확인한 것으로 처리해 New 표시를 지웁니다.
        if(key===REJECTED_STATUS_KEY && turningOn){
          const rejectedIds = teachers.filter(t=>t.status===REJECTED_STATUS_KEY).map(t=>t.id);
          REJECTED_SEEN_IDS = rejectedIds;
          await storageService.saveSettings({ rejectedSeenIds: rejectedIds });
        }
        paint();
        renderTeacherTable(teachers, listState);
      });
    });
  };
  paint();
}
function renderTeamFilterChips(listState, teachers){
  const wrap = document.getElementById('teamFilterChips');
  if(!wrap) return;
  const paint = ()=>{
    wrap.innerHTML = ALL_TEAMS.map(code=>`
      <button class="filter-chip ${listState.teamFilter.has(code)?'on':''}" data-team="${code}">${code}</button>`).join('');
    wrap.querySelectorAll('.filter-chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const code = btn.dataset.team;
        listState.teamFilter.has(code) ? listState.teamFilter.delete(code) : listState.teamFilter.add(code);
        paint();
        renderTeacherTable(teachers, listState);
      });
    });
  };
  paint();
}

function renderJobFilterChips(listState, teachers){
  const wrap = document.getElementById('jobFilterChips');
  if(!wrap) return;
  const options = Object.values(JOB_TYPES).map(j=>({ key:j.key, label:j.label }));
  const paint = ()=>{
    wrap.innerHTML = options.map(opt=>
      `<button class="filter-chip ${listState.jobFilter.has(opt.key)?'on':''}" data-job="${opt.key}">${opt.label}</button>`).join('');
    wrap.querySelectorAll('.filter-chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const key = btn.dataset.job;
        listState.jobFilter.has(key) ? listState.jobFilter.delete(key) : listState.jobFilter.add(key);
        paint();
        renderTeacherTable(teachers, listState);
      });
    });
  };
  paint();
}

// 교육 기수가 있는 교사는 기수 날짜가 최신인 순으로 묶어서 정렬하고,
// 아직 기수가 배정되지 않은 교사는 맨 아래에 이름 가나다순으로 정렬합니다.
function sortTeacherRowsByCohort(rows){
  const cohortDate = (t)=>{
    const cohort = TRAINING_COHORTS.find(c=>c.id===t.cohortId);
    return cohort ? (cohort.date || '') : '';
  };
  return rows.slice().sort((a,b)=>{
    const da = cohortDate(a), db = cohortDate(b);
    if(da && db){
      if(da!==db) return db.localeCompare(da); // 최근 날짜 순
      return a.name.localeCompare(b.name, 'ko');
    }
    if(da && !db) return -1; // 기수 있는 사람이 위로
    if(!da && db) return 1;
    return a.name.localeCompare(b.name, 'ko'); // 둘 다 기수 없음 → 이름순
  });
}

function renderTeacherTable(teachers, listState){
  let rows = teachers;
  rows = teacherService.search(rows, listState.query);

  if(listState.lockedFilter==='recruit') rows = rows.filter(t=>t.status==='interview');
  else if(listState.lockedFilter==='train2w') rows = rows.filter(t=>t.status==='training2w');
  else if(listState.lockedFilter==='train4w') rows = rows.filter(t=>t.status==='training4w');
  else if(listState.lockedFilter==='handover') rows = rows.filter(t=>t.status==='placed' && PLACED_TEAMS.includes(t.currentTeam));
  else{
    rows = teacherService.filterByStatus(rows, [...listState.statusFilter]);
    // 상태 필터를 아무것도 고르지 않은 기본 화면에서는 면접 탈락자를 표에서 숨깁니다.
    // "면접 탈락" 칩을 직접 선택했을 때만 보이도록 합니다.
    if(!listState.statusFilter.size) rows = rows.filter(t => t.status!==REJECTED_STATUS_KEY);
    if(listState.teamFilter.size) rows = rows.filter(t => listState.teamFilter.has(t.currentTeam));
  }
  if(listState.jobFilter.size) rows = rows.filter(t => listState.jobFilter.has(t.job));

  const tbody = document.getElementById('teacherTableBody');
  const countEl = document.getElementById('teacherListCount');
  if(countEl) countEl.textContent = `${rows.length}명`;

  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-block" style="border:none;padding:40px">조건에 맞는 교사가 없어요.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = sortTeacherRowsByCohort(rows).map(t=>{
    const trainAvg = teacherService.avgOf(t.scores.train2w, TRAIN_SCORES);
    const settleAvg = teacherService.avgOf(t.scores.settle4w, SETTLE_SCORES);
    const cohort = TRAINING_COHORTS.find(c=>c.id===t.cohortId);
    const teamOptions = `<option value="">미배치</option>` + ALL_TEAMS.map(code=>`<option value="${code}" ${t.currentTeam===code?'selected':''}>${code}</option>`).join('');
    const statusOptions = Object.entries(STATUS).map(([key,v])=>`<option value="${key}" ${t.status===key?'selected':''}>${v.label}</option>`).join('');
    // 신입교육 2주차는 아직 정착교육 평점이 없으므로 성장률 대신 "교육 진행중"을 표시하고,
    // 면접 탈락자는 이후 단계를 진행하지 않으므로 성장률 대신 상태를 표시합니다.
    const growthCell = t.status===REJECTED_STATUS_KEY
      ? `<span class="tag-mini" style="background:var(--red-dim);color:var(--red)">면접 탈락</span>`
      : t.status==='training2w'
      ? `<span class="tag-mini" style="background:var(--primary-dim);color:var(--primary-ink)">교육 진행중</span>`
      : (()=>{ const growth = teacherService.growthPct(t);
          return growth!==null ? `<span style="font-weight:800;color:${growth>=0?'var(--primary-ink)':'var(--red)'}">${growth>=0?'▲':'▼'} ${Math.abs(growth).toFixed(1)}%</span>` : '<span style="color:var(--ink-faint)">–</span>'; })();
    const profileWarn = t.profileIncomplete
      ? `<span class="profile-warn-badge" title="면접 합격으로 자동 등록되어 개인정보가 비어 있어요">● 개인정보 등록</span>` : '';
    const isDuplicatePhone = t.phone && (PHONE_DUP_COUNTS[t.phone]>=2 || TEACHER_PHONE_DUP_COUNTS[t.phone]>=2);
    const duplicateWarn = isDuplicatePhone
      ? `<span class="duplicate-warn-badge" title="동일한 전화번호로 등록된 교사가 2명 이상 있어요">● 중복지원</span>` : '';
    const convertedWarn = t.converted==='yes'
      ? `<span class="converted-badge" title="전환 여부: 예">● 전환교사</span>` : '';
    return `<tr>
      <td><div class="name-cell" data-action="open" data-id="${t.id}"><span class="avatar">${ui.initials(t.name)}</span>${ui.escapeHtml(t.name)}${profileWarn}${duplicateWarn}${convertedWarn}</div></td>
      <td><select class="team-select" data-role="team" data-id="${t.id}">${teamOptions}</select></td>
      <td>${ui.escapeHtml(t.teamLead) || '<span style="color:var(--ink-faint)">–</span>'}</td>
      <td>${trainAvg!==null ? `<span class="score-pill">${trainAvg.toFixed(1)}</span>` : '<span style="color:var(--ink-faint)">–</span>'}</td>
      <td>${settleAvg!==null ? `<span class="score-pill" style="background:var(--purple-dim);color:var(--purple)">${settleAvg.toFixed(1)}</span>` : '<span style="color:var(--ink-faint)">–</span>'}</td>
      <td>${cohort ? `${ui.escapeHtml(cohort.label)} <span style="color:var(--ink-faint);font-size:11px">(${ui.fmtDate(cohort.date)})</span>` : '<span style="color:var(--ink-faint)">–</span>'}</td>
      <td>${growthCell}</td>
      <td><select class="team-select" data-role="status" data-id="${t.id}">${statusOptions}</select></td>
      <td><button class="btn btn-ghost btn-sm" data-action="open" data-id="${t.id}">상세보기</button></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-action="open"]').forEach(el=>{
    el.addEventListener('click', ()=>{ location.href = `teacher-detail.html?id=${el.dataset.id}`; });
  });
  tbody.querySelectorAll('.team-select').forEach(sel=>{
    sel.addEventListener('click', e=>e.stopPropagation());
    sel.addEventListener('change', async ()=>{
      const id = sel.dataset.id;
      const record = await storageService.getTeacherRecord(id);
      if(!record) return;
      let msg;
      if(sel.dataset.role==='team'){
        record.currentTeam = sel.value;
        teacherService.applyTeamPlacementRule(record);
        msg = '현재 소속팀이 변경됐어요.' + (record.status==='placed' ? ' 진행상태도 "팀 배치 완료"로 자동 전환됐어요.' : '');
      } else {
        record.status = sel.value;
        msg = '진행상태가 변경됐어요.';
      }
      await storageService.saveTeacherRecord(id, record);
      const t = teachers.find(x=>x.id===id);
      if(t){ t.currentTeam = record.currentTeam; t.status = record.status; }
      ui.toast(msg);
      renderTeacherTable(teachers, listState);
    });
  });
}

/* ---- 교사 추가 (직접 등록) ---- */
function initAddTeacherModal(){
  const openBtn = document.getElementById('addTeacherBtn');
  const overlay = document.getElementById('addTeacherModal');
  if(!openBtn || !overlay) return;

  const cohortSelect = document.getElementById('newTeacherCohort');
  const teamLeadSelect = document.getElementById('newTeacherTeamLead');
  const fillCohortOptions = ()=>{
    if(!cohortSelect) return;
    const cohorts = TRAINING_COHORTS.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    cohortSelect.innerHTML = `<option value="">미지정</option>` +
      cohorts.map(c=>`<option value="${c.id}" ${c.completed?'disabled':''}>${ui.escapeHtml(c.label)} (${ui.fmtDate(c.date)})${c.completed?' · 완료됨':''}</option>`).join('');
  };
  const fillTeamLeadOptions = async ()=>{
    if(!teamLeadSelect) return;
    const evaluators = await evaluationService.listEvaluators();
    teamLeadSelect.innerHTML = `<option value="">미지정</option>` +
      evaluators.map(ev=>`<option value="${ui.escapeHtml(ev.name)}">${ui.escapeHtml(ev.name)}</option>`).join('');
  };
  fillCohortOptions();
  fillTeamLeadOptions();

  // 생년월일을 입력하면 옆에 "만 O세"를 바로 보여줍니다.
  const birthInput = document.getElementById('newTeacherBirth');
  const birthAgeEl = document.getElementById('newTeacherBirthAge');
  const updateBirthAge = ()=>{
    if(!birthAgeEl) return;
    const age = ui.calcManAge(birthInput ? birthInput.value : '');
    birthAgeEl.textContent = age!==null ? `만 ${age}세` : '';
  };
  birthInput?.addEventListener('input', updateBirthAge);
  birthInput?.addEventListener('change', updateBirthAge);

  const close = ()=>{ overlay.style.display='none'; overlay.querySelector('form').reset(); updateBirthAge(); };
  openBtn.addEventListener('click', async ()=>{ fillCohortOptions(); await fillTeamLeadOptions(); overlay.style.display='flex'; overlay.querySelector('#newTeacherName').focus(); });
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
  overlay.querySelector('[data-action="closeAddTeacher"]')?.addEventListener('click', close);

  overlay.querySelector('form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('newTeacherName').value.trim();
    if(!name){ ui.toast('이름을 입력해주세요.'); return; }
    const job = document.getElementById('newTeacherJob').value; // 미지정(빈 값)도 허용
    const basicInfo = {
      name,
      email: document.getElementById('newTeacherEmail').value.trim(),
      phone: document.getElementById('newTeacherPhone').value.trim(),
      birth: document.getElementById('newTeacherBirth').value,
      job,
      cohortId: cohortSelect ? cohortSelect.value : '',
      teamLead: teamLeadSelect ? teamLeadSelect.value : '',
      referrer: document.getElementById('newTeacherReferrer').value.trim(),
      priorCareer: document.getElementById('newTeacherPriorCareer').value.trim(),
    };
    try{
      const created = await teacherService.create(basicInfo);
      ui.toast(name+' 교사가 등록됐어요.');
      close();
      location.href = `teacher-detail.html?id=${created.id}`;
    }catch(err){
      ui.toast(err.message || '등록에 실패했어요.');
    }
  });
}
