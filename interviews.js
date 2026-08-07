/* ============================================================
   Teacher Talent Management System — V2
   interviews.js
   -------------------------------------------------------------
   InterviewService: 면접 일정(직접 등록) CRUD와 주간 지원자·합격률
   집계를 담당합니다. 등록된 교사의 면접일(interview.date)은
   TeacherService/StorageService의 기존 데이터를 그대로 읽어와
   캘린더에 함께 표시합니다.

   이 파일은 interviews.html 전용 페이지 부트스트랩(bootInterviewsPage)과
   캘린더 렌더링, 면접 등록/수정 모달 로직도 함께 포함합니다.
============================================================ */
class InterviewService {
  async list(){ return storageService.getInterviewSchedules(); }

  async create(data){
    const list = await this.list();
    const item = {
      id: 'IV' + Date.now().toString(36) + Math.random().toString(36).slice(2,5),
      date: data.date || '', time: data.time || '',
      room: data.room || '', intervieweeName: data.intervieweeName || '', phone: data.phone || '',
      job: data.job || '', interviewer: data.interviewer || '', cohortId: data.cohortId || '',
      result: data.result || 'pending', memo: data.memo || '',
      linkedTeacherId: data.linkedTeacherId || '',
      createdAt: Date.now(),
    };
    list.push(item);
    await storageService.saveInterviewSchedules(list);
    return item;
  }
  async update(id, patch){
    const list = await this.list();
    const idx = list.findIndex(x=>x.id===id);
    if(idx===-1) return null;
    list[idx] = { ...list[idx], ...patch };
    await storageService.saveInterviewSchedules(list);
    return list[idx];
  }
  async remove(id){
    const list = await this.list();
    await storageService.saveInterviewSchedules(list.filter(x=>x.id!==id));
  }

  // 이번 주(월~금, 업무 주간) 범위
  getWeekRange(base=new Date()){
    const d = new Date(base); d.setHours(0,0,0,0);
    const day = d.getDay(); // 0=일 .. 6=토
    const diffToMonday = (day===0 ? -6 : 1-day);
    const monday = new Date(d); monday.setDate(d.getDate()+diffToMonday);
    const friday = new Date(monday); friday.setDate(monday.getDate()+4); friday.setHours(23,59,59,999);
    return { start: monday, end: friday };
  }
  inRange(dateStr, start, end){
    if(!dateStr) return false;
    const d = new Date(dateStr+'T00:00:00');
    if(isNaN(d.getTime())) return false;
    return d>=start && d<=end;
  }

  // 이번 주 "신규 지원자" 수 — 면접 날짜가 아니라 "면접 등록일(createdAt)" 기준으로 집계합니다.
  // 예: 8/3 면접이어도 7/28에 등록했다면 7/28이 속한 주(7/27~7/31)의 지원자로 카운팅됩니다.
  getWeeklyRegistrationStats(schedules){
    const { start, end } = this.getWeekRange();
    const startMs = start.getTime(), endMs = end.getTime();
    const weekList = schedules.filter(s=> s.createdAt && s.createdAt>=startMs && s.createdAt<=endMs);
    return {
      total: weekList.length,
      english: weekList.filter(s=>s.job==='english').length,
      subject: weekList.filter(s=>s.job==='subject').length,
    };
  }

  // 이번 주 "면접 진행자" 수 — 실제 면접 날짜(date)가 이번 주에 속하는 건수
  getWeeklyUpcomingCount(schedules){
    const { start, end } = this.getWeekRange();
    return schedules.filter(s=>this.inRange(s.date, start, end)).length;
  }

  _passFailCalc(list){
    const passed = list.filter(s=>s.result==='passed').length;
    const failed = list.filter(s=>s.result==='failed').length;
    const decided = passed+failed;
    return {
      passed, failed, decided,
      passRate: decided ? (passed/decided)*100 : null,
      failRate: decided ? (failed/decided)*100 : null,
    };
  }

  // 기수별 합격/불합격 명수·비율 (면접 일정에 연결된 교육 기수 기준)
  getCohortPassStats(schedules){
    return TRAINING_COHORTS.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(cohort=>{
      const list = schedules.filter(s=>s.cohortId===cohort.id);
      return { cohort, ...this._passFailCalc(list) };
    });
  }

  // 직무별 전체(누적) 합격/불합격 명수·비율 — 특정 주/기수에 한정하지 않고 지금까지 등록된 모든 면접 기준
  getJobPassStats(schedules){
    return {
      english: this._passFailCalc(schedules.filter(s=>s.job==='english')),
      subject: this._passFailCalc(schedules.filter(s=>s.job==='subject')),
    };
  }
}
const interviewService = new InterviewService();

/* ============================================================
   INTERVIEWS PAGE BOOTSTRAP (interviews.html)
============================================================ */
let CAL_STATE = { year:0, month:0, schedules:[], teachers:[] };

async function bootInterviewsPage(){
  await seedIfEmpty();
  await loadDynamicConfig();
  await ui.initEvaluatorSelect();

  const teachers = await teacherService.list();
  ui.initGlobalSearch(teachers);
  renderNavCounts(teachers);

  const schedules = await interviewService.list();
  const today = new Date();
  CAL_STATE = { year: today.getFullYear(), month: today.getMonth(), schedules, teachers };

  renderInterviewStats(CAL_STATE.schedules);
  renderCalendar();
  initInterviewModal();

  document.getElementById('calPrevBtn')?.addEventListener('click', ()=>shiftMonth(-1));
  document.getElementById('calNextBtn')?.addEventListener('click', ()=>shiftMonth(1));
  document.getElementById('calTodayBtn')?.addEventListener('click', ()=>{
    const t = new Date();
    CAL_STATE.year = t.getFullYear(); CAL_STATE.month = t.getMonth();
    renderCalendar();
  });
  document.getElementById('notifyBtn')?.addEventListener('click', ()=> ui.toast('알림 기능은 준비 중이에요.'));
}

function shiftMonth(delta){
  let m = CAL_STATE.month + delta, y = CAL_STATE.year;
  if(m<0){ m=11; y--; } else if(m>11){ m=0; y++; }
  CAL_STATE.month = m; CAL_STATE.year = y;
  renderCalendar();
}

function fmtYMD(y,m,d){ return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

function renderInterviewStats(schedules){
  const fmtPct = p => p===null ? '–' : Math.round(p)+'%';

  // 이번 주 신규 지원자(등록일 기준) + 면접 진행자(면접일 기준)
  const weekGrid = document.getElementById('interviewStatsGrid');
  if(weekGrid){
    const reg = interviewService.getWeeklyRegistrationStats(schedules);
    const upcoming = interviewService.getWeeklyUpcomingCount(schedules);
    const cards = [
      { label:'이번 주 신규 지원자(전체)', val: reg.total },
      { label:'신규 지원자 · 영어 교사', val: reg.english },
      { label:'신규 지원자 · 교과 교사', val: reg.subject },
      { label:'이번 주 면접 진행자', val: upcoming },
    ];
    weekGrid.innerHTML = cards.map(c=>`
      <div class="kpi">
        <div class="klabel">${c.label}</div>
        <div class="kval mono">${c.val}명</div>
      </div>`).join('');
  }

  // 기수별 합격 현황
  const cohortWrap = document.getElementById('cohortPassList');
  if(cohortWrap){
    const rows = interviewService.getCohortPassStats(schedules);
    cohortWrap.innerHTML = rows.length ? rows.map(r=>`
      <div class="row-mini" style="cursor:default;flex-wrap:wrap">
        <span style="flex:1;min-width:140px">
          <b>${ui.escapeHtml(r.cohort.label)}</b>
          <span class="card-sub" style="margin:0 0 0 6px;display:inline">${ui.fmtDate(r.cohort.date)}</span>
        </span>
        <span class="tag-mini" style="background:var(--green-dim);color:var(--green)">합격 ${r.passed}명 (${fmtPct(r.passRate)})</span>
        <span class="tag-mini" style="background:var(--red-dim);color:var(--red)">불합격 ${r.failed}명 (${fmtPct(r.failRate)})</span>
      </div>`).join('') : `<div class="card-sub">등록된 신입 교육 기수가 없어요. Dashboard에서 먼저 교육 일정을 등록해주세요.</div>`;
  }

  // 직무별 전체(누적) 합격 현황
  const jobGrid = document.getElementById('jobPassGrid');
  if(jobGrid){
    const stats = interviewService.getJobPassStats(schedules);
    const block = (label, s)=>`
      <div class="kpi">
        <div class="klabel">${label}</div>
        <div class="card-sub" style="margin:8px 0 0">합격 <b style="color:var(--green)">${s.passed}명 (${fmtPct(s.passRate)})</b></div>
        <div class="card-sub" style="margin:4px 0 0">불합격 <b style="color:var(--red)">${s.failed}명 (${fmtPct(s.failRate)})</b></div>
      </div>`;
    jobGrid.innerHTML = block('영어 교사', stats.english) + block('교과 교사', stats.subject);
  }
}

function renderCalendar(){
  const { year, month, schedules, teachers } = CAL_STATE;
  const titleEl = document.getElementById('calTitle');
  if(titleEl) titleEl.textContent = `${year}년 ${month+1}월`;

  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const now = new Date();
  const todayStr = fmtYMD(now.getFullYear(), now.getMonth(), now.getDate());

  const dayMap = {};
  schedules.forEach(s=>{ (dayMap[s.date] = dayMap[s.date] || []).push({ type:'schedule', data:s }); });
  teachers.forEach(t=>{
    if(t.interview && t.interview.date){
      (dayMap[t.interview.date] = dayMap[t.interview.date] || []).push({ type:'teacher', data:t });
    }
  });

  const cells = [];
  for(let i=startDay-1;i>=0;i--){
    const dayNum = prevDays-i;
    const m = month===0?11:month-1, y = month===0?year-1:year;
    cells.push({ dateStr: fmtYMD(y,m,dayNum), dayNum, outside:true });
  }
  for(let d=1; d<=daysInMonth; d++) cells.push({ dateStr: fmtYMD(year,month,d), dayNum:d, outside:false });
  const remain = (7 - (cells.length % 7)) % 7;
  for(let d=1; d<=remain; d++){
    const m = month===11?0:month+1, y = month===11?year+1:year;
    cells.push({ dateStr: fmtYMD(y,m,d), dayNum:d, outside:true });
  }

  const grid = document.getElementById('calGrid');
  if(!grid) return;
  grid.innerHTML = cells.map(c=>{
    const events = dayMap[c.dateStr] || [];
    const chips = events.map(e=>{
      if(e.type==='schedule'){
        const s = e.data;
        const jobPrefix = s.job==='english' ? '(영) ' : s.job==='subject' ? '(교) ' : '';
        const timePart = s.time ? `<b>${ui.escapeHtml(s.time)}</b> ` : '';
        const roomPart = s.room ? ` · ${ui.escapeHtml(s.room)}` : '';
        return `<div class="cal-chip result-${s.result||'pending'}" data-action="openSchedule" data-id="${s.id}">
          ${timePart}${jobPrefix}${ui.escapeHtml(s.intervieweeName||'이름없음')}${roomPart}
        </div>`;
      }
      const t = e.data;
      return `<div class="cal-chip registered" data-action="openTeacher" data-id="${t.id}">👤 ${ui.escapeHtml(t.name)}</div>`;
    }).join('');
    return `<div class="cal-day ${c.outside?'outside':''} ${c.dateStr===todayStr?'today':''}" data-date="${c.dateStr}">
      <div class="cal-daynum">${c.dayNum}</div>
      <div class="cal-events">${chips}</div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.cal-day').forEach(cell=>{
    cell.addEventListener('click', (e)=>{
      if(e.target.closest('[data-action="openSchedule"]') || e.target.closest('[data-action="openTeacher"]')) return;
      openAddInterviewModal(cell.dataset.date);
    });
  });
  grid.querySelectorAll('[data-action="openSchedule"]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); openEditInterviewModal(el.dataset.id); });
  });
  grid.querySelectorAll('[data-action="openTeacher"]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); location.href = `teacher-detail.html?id=${el.dataset.id}`; });
  });
}

/* ============================================================
   면접 등록/수정 모달
============================================================ */
function fillInterviewDropdowns(){
  const roomSel = document.getElementById('ivFormRoom');
  if(roomSel) roomSel.innerHTML = `<option value="">미지정</option>` + INTERVIEW_ROOMS.map(r=>`<option value="${ui.escapeHtml(r)}">${ui.escapeHtml(r)}</option>`).join('');
  const ivSel = document.getElementById('ivFormInterviewer');
  if(ivSel) ivSel.innerHTML = `<option value="">미지정</option>` + INTERVIEWERS.map(n=>`<option value="${ui.escapeHtml(n)}">${ui.escapeHtml(n)}</option>`).join('');
  const cohortSel = document.getElementById('ivFormCohort');
  if(cohortSel){
    const cohorts = TRAINING_COHORTS.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    cohortSel.innerHTML = `<option value="">미지정</option>` + cohorts.map(c=>`<option value="${c.id}" ${c.completed?'disabled':''}>${ui.escapeHtml(c.label)} (${ui.fmtDate(c.date)})${c.completed?' · 완료됨':''}</option>`).join('');
  }
}
function closeInterviewModal(){
  const overlay = document.getElementById('interviewModal');
  if(!overlay) return;
  overlay.style.display = 'none';
  overlay.querySelector('form').reset();
  const delBtn = document.getElementById('ivDeleteBtn');
  if(delBtn) delBtn.style.display = 'none';
}
function openAddInterviewModal(dateStr){
  const overlay = document.getElementById('interviewModal');
  if(!overlay) return;
  fillInterviewDropdowns();
  overlay.querySelector('form').reset();
  document.getElementById('interviewModalTitle').textContent = '면접 일정 등록';
  document.getElementById('ivFormId').value = '';
  document.getElementById('ivFormDate').value = dateStr || '';
  document.getElementById('ivFormResult').value = 'pending';
  document.getElementById('ivDeleteBtn').style.display = 'none';
  overlay.style.display = 'flex';
}
function openEditInterviewModal(id){
  const item = CAL_STATE.schedules.find(s=>s.id===id);
  if(!item) return;
  const overlay = document.getElementById('interviewModal');
  if(!overlay) return;
  fillInterviewDropdowns();
  document.getElementById('interviewModalTitle').textContent = '면접 일정 수정';
  document.getElementById('ivFormId').value = item.id;
  document.getElementById('ivFormDate').value = item.date;
  document.getElementById('ivFormTime').value = item.time || '';
  document.getElementById('ivFormName').value = item.intervieweeName || '';
  document.getElementById('ivFormPhone').value = item.phone || '';
  document.getElementById('ivFormJob').value = item.job || '';
  document.getElementById('ivFormResult').value = item.result || 'pending';
  document.getElementById('ivFormRoom').value = item.room || '';
  document.getElementById('ivFormInterviewer').value = item.interviewer || '';
  document.getElementById('ivFormCohort').value = item.cohortId || '';
  document.getElementById('ivFormMemo').value = item.memo || '';
  document.getElementById('ivDeleteBtn').style.display = 'inline-flex';
  overlay.style.display = 'flex';
}

async function refreshInterviewData(){
  CAL_STATE.schedules = await interviewService.list();
  renderInterviewStats(CAL_STATE.schedules);
  renderCalendar();
}

function initInterviewModal(){
  const overlay = document.getElementById('interviewModal');
  const addBtn = document.getElementById('addInterviewBtn');
  if(!overlay) return;

  addBtn?.addEventListener('click', ()=>openAddInterviewModal(''));
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) closeInterviewModal(); });
  overlay.querySelectorAll('[data-action="closeInterviewModal"]').forEach(el=>el.addEventListener('click', closeInterviewModal));

  document.getElementById('ivDeleteBtn')?.addEventListener('click', async ()=>{
    const id = document.getElementById('ivFormId').value;
    if(!id) return;
    if(!confirm('이 면접 일정을 삭제할까요?')) return;
    await interviewService.remove(id);
    await refreshInterviewData();
    ui.toast('면접 일정을 삭제했어요.');
    closeInterviewModal();
  });

  overlay.querySelector('form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const date = document.getElementById('ivFormDate').value;
    const name = document.getElementById('ivFormName').value.trim();
    const phone = document.getElementById('ivFormPhone').value.trim();
    if(!date || !name || !phone){ ui.toast('면접 날짜·면접자 이름·전화번호를 입력해주세요.'); return; }
    const payload = {
      date,
      time: document.getElementById('ivFormTime').value,
      intervieweeName: name,
      phone,
      job: document.getElementById('ivFormJob').value,
      result: document.getElementById('ivFormResult').value,
      room: document.getElementById('ivFormRoom').value,
      interviewer: document.getElementById('ivFormInterviewer').value,
      cohortId: document.getElementById('ivFormCohort').value,
      memo: document.getElementById('ivFormMemo').value.trim(),
    };
    const id = document.getElementById('ivFormId').value;
    const isNew = !id;
    let saved;
    if(id){ saved = await interviewService.update(id, payload); ui.toast('면접 일정을 수정했어요.'); }
    else{ saved = await interviewService.create(payload); ui.toast('면접 일정을 등록했어요.'); }

    // 면접 등록만 해도 이름+전화번호로 교사관리에 자동 등록합니다.
    // (이미 등록된 적이 있다면 linkedTeacherId로 중복 등록을 막습니다.)
    if(isNew && saved && !saved.linkedTeacherId){
      try{
        const created = await teacherService.create({
          name: saved.intervieweeName, phone: saved.phone, job: saved.job, profileIncomplete: true,
        });
        await interviewService.update(saved.id, { linkedTeacherId: created.id });
        saved.linkedTeacherId = created.id;
        ui.toast(`${saved.intervieweeName} 교사가 교사관리에 자동 등록됐어요.`);
      }catch(err){
        console.error(err);
        ui.toast('교사 자동 등록에 실패했어요.');
      }
    }

    // 결과에 따라 연결된 교사의 진행상태를 맞춰줍니다: 불합격 → 면접 탈락, 그 외 → 다시 채용진행 중.
    if(saved && saved.linkedTeacherId){
      const linkedTeacher = await storageService.getTeacherRecord(saved.linkedTeacherId);
      if(linkedTeacher){
        if(saved.result==='failed' && linkedTeacher.status!==REJECTED_STATUS_KEY){
          linkedTeacher.status = REJECTED_STATUS_KEY;
          await storageService.saveTeacherRecord(linkedTeacher.id, linkedTeacher);
        } else if(saved.result!=='failed' && linkedTeacher.status===REJECTED_STATUS_KEY){
          linkedTeacher.status = 'interview';
          await storageService.saveTeacherRecord(linkedTeacher.id, linkedTeacher);
        }
      }
    }

    await refreshInterviewData();
    closeInterviewModal();
  });
}
