/* ============================================================
   Teacher Talent Management System — V2
   teacher-detail.js
   -------------------------------------------------------------
   teacher-detail.html(교사 상세) 전용 페이지 부트스트랩입니다.
   점수/평가기록은 EvaluationService, 배지·AI 문구는 ReportService,
   차트는 ChartService에 위임하고, 이 파일은 8개 탭의 화면 렌더링과
   저장/입력 상태 관리만 담당합니다.
============================================================ */
let DETAIL_STATE = { record:null, currentTab:'basic', dirty:false, evaluators:[] };

async function bootTeacherDetailPage(){
  await seedIfEmpty();
  await loadDynamicConfig();
  await ui.initEvaluatorSelect();

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const initialTab = params.get('tab');

  const allTeachers = await teacherService.list();
  ui.initGlobalSearch(allTeachers);
  renderNavCounts(allTeachers);

  const record = id ? await storageService.getTeacherRecord(id) : null;
  if(!record){
    document.getElementById('detailBody').innerHTML = `<div class="empty-block"><b>교사 정보를 찾을 수 없어요.</b><br>목록으로 돌아가 다시 시도해주세요.</div>`;
    document.getElementById('heroSection').style.display='none';
    document.getElementById('tabsBar').style.display='none';
    return;
  }
  DETAIL_STATE.record = record;
  DETAIL_STATE.evaluators = await evaluationService.listEvaluators();
  DETAIL_STATE.currentTab = DETAIL_TABS.some(t=>t.key===initialTab) ? initialTab : 'basic';

  renderDetailPage();
  attachDetailListeners();

  document.getElementById('backLink')?.addEventListener('click', ()=>{ location.href='teachers.html'; });
  document.getElementById('notifyBtn')?.addEventListener('click', ()=> ui.toast('알림 기능은 준비 중이에요.'));
}

function renderDetailPage(){
  renderHeroOnly();

  const isRejected = DETAIL_STATE.record.status===REJECTED_STATUS_KEY;
  const TAB_SCORE_FIELDS = { interview:INTERVIEW_SCORES, train2w:TRAIN_SCORES, settle4w:SETTLE_SCORES };
  document.getElementById('tabsBar').innerHTML = DETAIL_TABS.map(t=>{
    const disabled = isRejected && DISABLED_TABS_WHEN_REJECTED.includes(t.key);
    const tip = ui.tabTooltipHtml(TAB_SCORE_FIELDS[t.key]);
    return `<button class="tab-btn ${DETAIL_STATE.currentTab===t.key?'active':''} ${disabled?'disabled':''}" data-tab="${t.key}" ${disabled?'data-disabled="1"':''}><span>${t.label}</span>${tip}</button>`;
  }).join('');
  document.getElementById('tabsBar').querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.dataset.disabled){ ui.toast('면접 탈락 처리된 교사는 이 항목을 진행하지 않아요.'); return; }
      if(DETAIL_STATE.dirty && !confirm('저장하지 않은 변경사항이 있어요. 이동하면 사라져요. 계속할까요?')) return;
      DETAIL_STATE.dirty = false;
      DETAIL_STATE.currentTab = btn.dataset.tab;
      renderDetailPage();
    });
  });

  renderDetailBody();
}

function renderHeroOnly(){
  const record = DETAIL_STATE.record;
  const overall = teacherService.overallScore(record);
  const growth = teacherService.growthPct(record);
  const badges = reportService.computeBadges(record);
  const st = STATUS[record.status] || STATUS.interview;

  const heroBadges = [
    `<span class="badge status-${record.status}">${st.label}</span>`,
    ...(record.profileIncomplete ? [`<span class="profile-warn-badge">● 개인정보 등록 필요</span>`] : []),
    ...badges.good.map(b=>`<span class="tag-mini" style="background:var(--green-dim);color:var(--green)">${b}</span>`),
    ...badges.watch.map(w=>`<span class="tag-mini" style="background:var(--red-dim);color:var(--red)">⚠ ${w.label}</span>`),
  ].join('');

  document.getElementById('heroSection').innerHTML = `
    <div class="hero-avatar">${ui.initials(record.name)}</div>
    <div class="hero-info">
      <h2 class="hero-name">${ui.escapeHtml(record.name)}</h2>
      <div class="hero-meta-row">
        <span>👤 담당 팀장: ${ui.escapeHtml(record.teamLead)||'미지정'}</span>
        <span>🎓 교육 기수: ${ui.escapeHtml((TRAINING_COHORTS.find(c=>c.id===record.cohortId)||{}).label)||'미지정'}</span>
        <span>🏫 현재 소속팀: ${record.currentTeam||'미배치'}</span>
      </div>
      <div class="hero-badges">${heroBadges}</div>
      ${record.status==='dismissed' && record.dismissReason ? `<div class="card-sub" style="margin-top:8px;color:var(--red)"><b>해촉 사유:</b> ${ui.escapeHtml(record.dismissReason)}</div>` : ''}
    </div>
    <div class="hero-stats">
      <div class="hstat"><div class="v">${overall!==null?overall.toFixed(1):'–'}</div><div class="l">종합점수</div></div>
      <div class="hstat"><div class="v" style="color:${growth===null?'inherit':(growth>=0?'var(--primary-ink)':'var(--red)')}">${growth!==null?(growth>=0?'+':'')+growth.toFixed(1)+'%':'–'}</div><div class="l">성장률</div></div>
    </div>
    <div class="hero-actions no-print">
      <button class="btn btn-danger btn-sm" data-action="deleteTeacher">삭제</button></div>`;
}

function renderDetailBody(){
  const record = DETAIL_STATE.record;
  if(record.status===REJECTED_STATUS_KEY && DISABLED_TABS_WHEN_REJECTED.includes(DETAIL_STATE.currentTab)){
    document.getElementById('detailBody').innerHTML = `<div class="empty-block"><b>면접 탈락 처리된 교사예요.</b><br>신입교육 이후 단계는 진행하지 않아요.</div>`;
    return;
  }
  let html = '';
  if(DETAIL_STATE.currentTab==='basic') html = renderBasicTab(record);
  else if(DETAIL_STATE.currentTab==='interview') html = renderInterviewTab(record);
  else if(DETAIL_STATE.currentTab==='train2w') html = renderTrain2wTab(record);
  else if(DETAIL_STATE.currentTab==='settle4w') html = renderSettle4wTab(record);
  else if(DETAIL_STATE.currentTab==='handover') html = renderHandoverTab(record);
  else if(DETAIL_STATE.currentTab==='report') html = renderReportTab(record);
  const body = document.getElementById('detailBody');
  body.innerHTML = html;
  ui.autosizeAll(body);
  if(DETAIL_STATE.currentTab==='report') renderReportCharts(record);
}

function attachDetailListeners(){
  const body = document.getElementById('detailBody');

  body.addEventListener('click', (e)=>{
    const star = e.target.closest('.star');
    if(star){ setDetailScore(star.dataset.section, star.dataset.key, star.dataset.val); return; }
    const el = e.target.closest('[data-action]');
    if(!el) return;
    const act = el.dataset.action;
    if(act==='saveDetail') saveDetail();
    else if(act==='copyText') copyDetailText(el.dataset.value);
    else if(act==='addInterviewNote') addInterviewNote();
    else if(act==='deleteInterviewNote') deleteInterviewNote(el.dataset.ts);
    else if(act==='printPage') window.print();
    else if(act==='resetScore') setDetailScore(el.dataset.section, el.dataset.key, 0);
    else if(act==='deleteResume') handleDeleteResume();
  });

  body.addEventListener('input', (e)=>{
    const el = e.target;
    if(el.dataset && el.dataset.field){
      setNestedValue(DETAIL_STATE.record, el.dataset.field, el.value);
      markDetailDirty();
      if(el.dataset.field==='birth'){
        const ageEl = document.getElementById('birthAgeDisplay');
        if(ageEl){ const age = ui.calcManAge(el.value); ageEl.textContent = age!==null ? `만 ${age}세` : ''; }
      }
    }
  });
  body.addEventListener('change', (e)=>{
    const el = e.target;
    if(el.id==='resumeFileInput'){
      handleResumeFileSelected(el.files && el.files[0]);
      return;
    }
    if(el.dataset && el.dataset.field){
      setNestedValue(DETAIL_STATE.record, el.dataset.field, el.value);
      markDetailDirty();
      if(el.dataset.field==='birth'){
        const ageEl = document.getElementById('birthAgeDisplay');
        if(ageEl){ const age = ui.calcManAge(el.value); ageEl.textContent = age!==null ? `만 ${age}세` : ''; }
      }
      if(el.dataset.field==='currentTeam'){
        const before = DETAIL_STATE.record.status;
        teacherService.applyTeamPlacementRule(DETAIL_STATE.record);
        if(DETAIL_STATE.record.status!==before) ui.toast('진행상태가 "팀 배치 완료"로 자동 전환됐어요. 저장을 눌러 반영하세요.');
        renderDetailPage(); // 히어로/기본정보의 소속팀·상태 표시 즉시 갱신
      } else if(el.dataset.field==='status'){
        renderHeroOnly();   // 해촉 배지 등 히어로 표시 즉시 갱신
        renderDetailBody(); // 해촉 사유 입력칸 표시/숨김 즉시 갱신
        markDetailDirty();
      }
    }
  });

  document.getElementById('heroSection').addEventListener('click', async (e)=>{
    const el = e.target.closest('[data-action="deleteTeacher"]');
    if(!el) return;
    if(!confirm(`${DETAIL_STATE.record.name} 교사의 모든 기록을 삭제할까요? 되돌릴 수 없어요.`)) return;
    await teacherService.remove(DETAIL_STATE.record.id);
    ui.toast('삭제되었어요.');
    location.href = 'teachers.html';
  });
}

function setNestedValue(obj, path, value){
  const parts = path.split('.');
  let cur = obj;
  for(let i=0;i<parts.length-1;i++){
    const p = parts[i];
    if(cur[p]===undefined) cur[p] = isNaN(Number(parts[i+1])) ? {} : [];
    cur = cur[p];
  }
  cur[parts[parts.length-1]] = value;
}
function markDetailDirty(){
  DETAIL_STATE.dirty = true;
  const note = document.getElementById('saveNote');
  if(note) note.innerHTML = '<span style="color:var(--amber)">● 저장되지 않은 변경사항이 있어요.</span>';
}
async function saveDetail(){
  const record = DETAIL_STATE.record;
  // 이메일·전화번호·생년월일이 모두 채워지면 "개인정보 등록 필요" 표시를 자동으로 해제합니다.
  let profileJustCompleted = false;
  if(record.profileIncomplete && record.email && record.phone && record.birth){
    record.profileIncomplete = false;
    profileJustCompleted = true;
  }
  const ok = await storageService.saveTeacherRecord(record.id, record);
  DETAIL_STATE.dirty = false;
  if(ok){
    renderHeroOnly();
    if(profileJustCompleted && DETAIL_STATE.currentTab==='basic') renderDetailBody();
  }
  const note = document.getElementById('saveNote');
  if(note) note.innerHTML = ok ? '<span style="color:var(--green)">✓ 저장되었어요.</span>' : '<span style="color:var(--red)">저장에 실패했어요.</span>';
  ui.toast(ok ? '저장되었어요.' : '저장에 실패했어요.');
}
function copyDetailText(value){
  if(!value){ ui.toast('복사할 내용이 없어요.'); return; }
  navigator.clipboard?.writeText(value).then(()=>ui.toast('복사되었어요.')).catch(()=>ui.toast('복사에 실패했어요.'));
}

/* ---- 이력서 PDF 업로드 → 텍스트 추출 → 기본정보 자동입력 ----
   AI API를 쓰지 않고 브라우저에서 pdf.js로 텍스트만 뽑아 정규식으로
   추정하는 방식이라 무료지만, 이력서 양식에 따라 정확도가 다를 수
   있어 자동으로 채운 뒤 바로 저장하고 사람이 확인하도록 안내합니다. */
async function handleResumeFileSelected(file){
  if(!file) return;
  if(file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')){
    ui.toast('PDF 파일만 업로드할 수 있어요.');
    return;
  }
  const record = DETAIL_STATE.record;
  const statusEl = document.getElementById('resumeParseStatus');
  if(statusEl) statusEl.textContent = 'PDF에서 정보를 읽는 중...';
  try{
    const fields = await ResumeParser.parse(file);
    const filledLabels = [];
    if(fields.name){ record.name = fields.name; filledLabels.push('이름'); }
    if(fields.email){ record.email = fields.email; filledLabels.push('이메일'); }
    if(fields.phone){ record.phone = fields.phone; filledLabels.push('전화번호'); }
    if(fields.birth){ record.birth = fields.birth; filledLabels.push('생년월일'); }
    if(fields.address){ record.address = fields.address; filledLabels.push('현주소'); }
    if(fields.education){ record.education = fields.education; filledLabels.push('학력사항'); }
    if(fields.priorCareer){ record.priorCareer = fields.priorCareer; filledLabels.push('경력사항'); }
    if(fields.selfIntro){ record.selfIntro = fields.selfIntro; filledLabels.push('자기소개'); }
    if(fields.job){ record.job = fields.job; filledLabels.push('직무'); }
    if(fields.referrer){ record.referrer = fields.referrer; filledLabels.push('추천인'); }

    if(statusEl) statusEl.textContent = '파일 저장 중...';
    const meta = await storageService.uploadResume(record.id, file);
    if(meta) record.resumeMeta = meta;

    await saveDetail();
    renderDetailBody();
    if(statusEl) statusEl.textContent = '';
    ui.toast(filledLabels.length
      ? `${filledLabels.join(', ')}을(를) 자동으로 채우고 저장했어요. 내용을 꼭 확인해주세요.`
      : 'PDF는 저장했지만 자동으로 인식된 정보가 없어요. 직접 입력해주세요.');
  }catch(err){
    console.error(err);
    if(statusEl) statusEl.textContent = '';
    ui.toast(err.message || 'PDF 처리에 실패했어요.');
  }
}
async function handleDeleteResume(){
  const record = DETAIL_STATE.record;
  if(!confirm('업로드된 이력서 원본 파일을 삭제할까요? 자동으로 채워진 기본정보는 그대로 남아요.')) return;
  await storageService.deleteResume(record.id);
  record.resumeMeta = null;
  await storageService.saveTeacherRecord(record.id, record);
  renderDetailBody();
  ui.toast('이력서 파일을 삭제했어요.');
}
function renderResumeBlock(record){
  const meta = record.resumeMeta;
  if(meta && !meta.deleted){
    return `<div class="resume-meta-row">
      <span>📄 ${ui.escapeHtml(meta.filename)} · ${ui.fmtDate(meta.uploadedAt)} 업로드</span>
      <a href="${storageService.resumeDownloadUrl(record.id)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">다운로드</a>
      <button type="button" class="btn btn-ghost btn-sm" data-action="deleteResume">삭제</button>
    </div>`;
  }
  if(meta && meta.deleted){
    return `<div class="card-sub" style="margin:0 0 10px">📄 ${ui.escapeHtml(meta.filename||'이력서')} — 입사 3개월 경과로 원본 파일은 자동 삭제됐어요. (자동입력된 기본정보는 유지돼요)</div>`;
  }
  return '';
}

// 별점 채점 → EvaluationService에 위임 (평가자/평가일/수정일 자동 기록)
async function setDetailScore(section, key, val){
  const record = DETAIL_STATE.record;
  let label = '';
  if(section==='interview') label = (INTERVIEW_SCORES.find(f=>f.key===key)||{}).label;
  if(section==='train2w') label = (TRAIN_SCORES.find(f=>f.key===key)||{}).label;
  if(section==='settle4w') label = (SETTLE_SCORES.find(f=>f.key===key)||{}).label;
  await evaluationService.recordScore(record, section, key, label, val);
  await storageService.saveTeacherRecord(record.id, record);
  renderDetailBody();
}

async function addInterviewNote(){
  const ta = document.getElementById('newIvNote');
  const text = (ta?.value||'').trim();
  if(!text) return;
  const record = DETAIL_STATE.record;
  if(!record.interview.notes) record.interview.notes = [];
  record.interview.notes.push({ ts:Date.now(), text });
  await storageService.saveTeacherRecord(record.id, record);
  renderDetailBody();
}
async function deleteInterviewNote(ts){
  const record = DETAIL_STATE.record;
  record.interview.notes = (record.interview.notes||[]).filter(n=>String(n.ts)!==String(ts));
  await storageService.saveTeacherRecord(record.id, record);
  renderDetailBody();
}

/* ---- 기본정보 (직접 입력, 모두 수정 가능) ---- */
function renderBasicTab(record){
  const teamOptions = `<option value="">미배치</option>` + ALL_TEAMS.map(code=>
    `<option value="${code}" ${record.currentTeam===code?'selected':''}>${code}</option>`).join('');
  const statusOptions = Object.entries(STATUS).map(([key,v])=>
    `<option value="${key}" ${record.status===key?'selected':''}>${v.label}</option>`).join('');
  const jobOptions = `<option value="">미지정</option>` + Object.values(JOB_TYPES).map(j=>
    `<option value="${j.key}" ${record.job===j.key?'selected':''}>${j.label}</option>`).join('');
  const cohorts = TRAINING_COHORTS.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const cohortOptions = `<option value="">미지정</option>` + cohorts.map(c=>
    `<option value="${c.id}" ${record.cohortId===c.id?'selected':''} ${c.completed?'disabled':''}>${ui.escapeHtml(c.label)} (${ui.fmtDate(c.date)})${c.completed?' · 완료됨':''}</option>`).join('');
  const teamLeadNames = (DETAIL_STATE.evaluators||[]).map(ev=>ev.name);
  if(record.teamLead && !teamLeadNames.includes(record.teamLead)) teamLeadNames.push(record.teamLead); // 기존에 수기로 적혀 있던 값 보존
  const teamLeadOptions = `<option value="">미지정</option>` + teamLeadNames.map(n=>
    `<option value="${ui.escapeHtml(n)}" ${record.teamLead===n?'selected':''}>${ui.escapeHtml(n)}</option>`).join('');
  const profileNotice = record.profileIncomplete ? `
  <div class="card card-pad" style="margin-bottom:16px;border-color:var(--red)">
    <div style="display:flex;align-items:center;gap:8px;color:var(--red);font-weight:800;font-size:13px">● 개인정보 등록이 필요해요</div>
    <p class="card-sub" style="margin:6px 0 0">면접 합격으로 자동 등록된 교사예요. 이메일·전화번호·생년월일을 모두 입력하고 저장하면 이 표시가 사라져요.</p>
  </div>` : '';
  return `
  ${profileNotice}
  <div class="card card-pad" style="margin-bottom:16px">
    <h3 class="card-title">이력서로 자동입력</h3>
    <p class="card-sub">이력서 PDF를 올리면 이름·이메일·전화번호·생년월일·현주소·학력사항·경력사항·자기소개·추천인·직무를 자동으로 채워봐요. AI를 쓰지 않고 문서에서 텍스트만 읽어 추정하는 방식이라 무료지만, 이력서 양식에 따라 정확하지 않을 수 있으니 채워진 내용은 꼭 확인해주세요.</p>
    ${renderResumeBlock(record)}
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px">
      <input type="file" id="resumeFileInput" accept="application/pdf,.pdf"/>
      <span id="resumeParseStatus" class="card-sub" style="margin:0"></span>
    </div>
  </div>
  <div class="card card-pad" style="margin-bottom:16px">
    <h3 class="card-title">기본정보</h3>
    <p class="card-sub">교사의 인적사항입니다. 필요한 항목을 자유롭게 입력·수정하세요.</p>
    <div class="field-grid">
      <div class="field"><label>이름</label><input type="text" data-field="name" value="${ui.escapeHtml(record.name)}"/></div>
      <div class="field"><label>생년월일</label>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="date" data-field="birth" value="${ui.escapeHtml(record.birth)}" id="basicBirthInput"/>
          <span id="birthAgeDisplay" class="card-sub" style="margin:0;white-space:nowrap">${(()=>{ const age=ui.calcManAge(record.birth); return age!==null?`만 ${age}세`:''; })()}</span>
        </div>
      </div>
      <div class="field"><label>전화번호</label><input type="text" data-field="phone" value="${ui.escapeHtml(record.phone)}" placeholder="010-0000-0000"/></div>
      <div class="field"><label>이메일</label><input type="text" data-field="email" value="${ui.escapeHtml(record.email)}" placeholder="teacher@example.com"/></div>
      <div class="field"><label>직무</label><select data-field="job">${jobOptions}</select></div>
      <div class="field"><label>추천인</label><input type="text" data-field="referrer" value="${ui.escapeHtml(record.referrer)}" placeholder="추천인 이름"/></div>
      <div class="field"><label>전환 여부</label>
        <select data-field="converted">
          <option value="no" ${record.converted!=='yes'?'selected':''}>아니요</option>
          <option value="yes" ${record.converted==='yes'?'selected':''}>예</option>
        </select>
      </div>
      <div class="field full"><label>현주소</label><input type="text" data-field="address" value="${ui.escapeHtml(record.address)}" placeholder="예: 서울시 OO구 OO동"/></div>
      <div class="field full"><label>학력사항</label><input type="text" data-field="education" value="${ui.escapeHtml(record.education)}" placeholder="예: OO대학교 OO학과"/></div>
      <div class="field full"><label>이전 경력</label><textarea data-field="priorCareer" data-autosize placeholder="예: OO어학원, OO초등학교">${ui.escapeHtml(record.priorCareer)}</textarea></div>
      <div class="field full"><label>자기소개</label><textarea data-field="selfIntro" data-autosize placeholder="자기소개 내용">${ui.escapeHtml(record.selfIntro)}</textarea></div>
    </div>
  </div>
  <div class="card card-pad">
    <h3 class="card-title">내부 관리 정보</h3>
    <p class="card-sub">팀 배치, 진행상태, 담당 팀장, 교육 기수, 참고메모를 관리합니다. 소속팀을 기존팀(C2~C11)으로 지정하면 진행상태가 자동으로 "팀 배치 완료"로 바뀌어요.</p>
    <div class="field-grid">
      <div class="field"><label>현재 소속팀</label><select data-field="currentTeam">${teamOptions}</select></div>
      <div class="field"><label>진행상태</label><select data-field="status">${statusOptions}</select></div>
      <div class="field"><label>담당 팀장</label><select data-field="teamLead">${teamLeadOptions}</select></div>
      <div class="field"><label>교육 기수</label><select data-field="cohortId">${cohortOptions}</select></div>
      ${record.status==='dismissed' ? `
      <div class="field full"><label>해촉 사유</label><textarea data-field="dismissReason" data-autosize placeholder="해촉 사유를 입력하세요." style="border-color:var(--red)">${ui.escapeHtml(record.dismissReason)}</textarea></div>` : ''}
      <div class="field full"><label>참고메모</label><textarea data-field="memo" data-autosize placeholder="이 교사에 대해 기억해둘 내용을 자유롭게 기록하세요.">${ui.escapeHtml(record.memo)}</textarea></div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:14px">
      <button class="btn btn-primary btn-sm" data-action="saveDetail">💾 저장</button>
      <div class="save-note" id="saveNote"></div>
    </div>
  </div>`;
}

/* ---- 면접평가 ---- */
function renderInterviewTab(record){
  const iv = record.interview;
  const avg = teacherService.avgOf(record.scores.interview, INTERVIEW_SCORES);
  const stars = INTERVIEW_SCORES.map(f=>ui.starWidget('interview', f.key, record.scores.interview[f.key], f.label)).join('');
  const summary = reportService.generateInterviewSummary(record);
  const notes = (iv.notes||[]).slice().sort((a,b)=>b.ts-a.ts).map(n=>`
    <div class="note-item"><button class="note-del" data-action="deleteInterviewNote" data-ts="${n.ts}" style="float:right">삭제</button>
    <div class="note-top">${ui.fmtDate(n.ts)}</div><div class="note-text">${ui.escapeHtml(n.text)}</div></div>`).join('') || `<p class="card-sub">대면 면접 메모가 아직 없어요.</p>`;

  return `<div>
    <div class="card card-pad" style="margin-bottom:16px">
      <h3 class="card-title">수업시연 평가표</h3><p class="card-sub">${avg!==null?`평균 <b>${avg.toFixed(1)} / 5.0</b>`:'항목별 별점을 매겨주세요.'}</p>
      <div class="star-grid">${stars}</div>
      <div class="field-grid">
        <div class="field"><label>면접일</label><input type="date" data-field="interview.date" value="${ui.escapeHtml(iv.date)}"/></div>
        <div class="field full"><label>상담 스크립트</label><textarea data-field="interview.script" data-autosize placeholder="스크립트로 제출된 경우 여기에 기록">${ui.escapeHtml(iv.script)}</textarea></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:14px">
        <button class="btn btn-primary btn-sm" data-action="saveDetail">💾 저장</button>
        <div class="save-note" id="saveNote"></div>
      </div>
    </div>
    <div class="card card-pad" style="margin-bottom:16px">
      <div class="ai-card"><div class="ai-label">✨ AI Summary</div>${summary}</div>
    </div>
    <div class="card card-pad">
      <h3 class="card-title">대면 면접 메모</h3><p class="card-sub">면접 중 나눈 대화, 인상, 특이사항을 기록합니다.</p>
      ${notes}
      <div class="add-note-row"><textarea id="newIvNote" placeholder="예: 아이들 대상 경력 3년, 침착한 태도"></textarea><button data-action="addInterviewNote">기록 추가</button></div>
    </div>
  </div>`;
}

// 코칭능력/회원관리/업무지식 카테고리별로 별점 항목을 묶어서 렌더링합니다.
// (신입교육/정착교육 탭에서 공용으로 사용) hasExam인 항목 옆에는 시험결과 입력칸이 붙습니다.
function renderScoreCategoryGroups(section, scoreObj, fields, examResultValue, notesObj={}){
  return SCORE_CATEGORIES.map(cat=>{
    const items = fields.filter(f=>f.category===cat.key);
    const avg = teacherService.categoryAvg(scoreObj, fields, cat.key);
    const stars = items.map(f=>{
      let widget = ui.starWidget(section, f.key, scoreObj[f.key], f.label, notesObj[f.key]);
      if(f.hasExam){
        widget += `<div class="field exam-result-field"><label>시험결과</label><input type="text" data-field="${section}.examResult" value="${ui.escapeHtml(examResultValue)}" placeholder="예: 92점"/></div>`;
      }
      return widget;
    }).join('');
    return `<div class="score-category-block">
      <div class="score-category-head"><h4>${cat.label}</h4>${avg!==null?`<span class="score-pill">${avg.toFixed(1)}</span>`:'<span class="card-sub" style="margin:0">–</span>'}</div>
      <div class="star-grid">${stars}</div>
    </div>`;
  }).join('');
}

/* ---- 신입교육 (코칭능력/회원관리/업무지식 3개 카테고리, 항목별 5점 척도) ---- */
function renderTrain2wTab(record){
  const tr = record.train2w;
  const avg = teacherService.avgOf(record.scores.train2w, TRAIN_SCORES);
  const groups = renderScoreCategoryGroups('train2w', record.scores.train2w, TRAIN_SCORES, tr.examResult, record.scoreNotes?.train2w||{});
  return `<div class="card card-pad">
    <h3 class="card-title">신입교육 2주 평가</h3><p class="card-sub">${avg!==null?`평균 <b>${avg.toFixed(1)} / 5.0</b>`:'코칭능력·회원관리·업무지식 3개 영역을 항목별 5점 척도로 평가합니다.'}</p>
    ${groups}
    <div class="field-grid" style="margin-top:16px">
      <div class="field full"><label>첫 상담 RP 평가 링크</label>
        <div class="copy-row"><input type="url" data-field="train2w.firstRpLink" value="${ui.escapeHtml(tr.firstRpLink)}" placeholder="젬스 공유 링크"/>
        <button class="copy-btn" data-action="copyText" data-value="${ui.escapeHtml(tr.firstRpLink)}">복사</button></div>
      </div>
      <div class="field full"><label>코칭 자기평가 내용</label><textarea data-field="train2w.selfEval" data-autosize>${ui.escapeHtml(tr.selfEval)}</textarea></div>
      <div class="field full"><label>교육 메모</label><textarea data-field="train2w.memo" data-autosize>${ui.escapeHtml(tr.memo)}</textarea></div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:14px">
      <button class="btn btn-primary btn-sm" data-action="saveDetail">💾 저장</button>
      <div class="save-note" id="saveNote"></div>
    </div>
  </div>`;
}

/* ---- 정착교육 (코칭능력/회원관리/업무지식 3개 카테고리 + 주차별 기록) ---- */
function renderSettle4wTab(record){
  const avg = teacherService.avgOf(record.scores.settle4w, SETTLE_SCORES);
  const groups = renderScoreCategoryGroups('settle4w', record.scores.settle4w, SETTLE_SCORES, record.settle4w.examResult, record.scoreNotes?.settle4w||{});
  const weeks = record.settle4w.weeks || [{},{},{},{}];
  const weekCards = weeks.map((w,idx)=>`
    <div class="week-card">
      <h4>Week ${idx+1}</h4>
      <div class="field" style="margin-bottom:9px"><label>교육 메모</label><textarea data-field="settle4w.weeks.${idx}.memo" data-autosize style="min-height:50px">${ui.escapeHtml(w.memo)}</textarea></div>
      <div class="field" style="margin-bottom:9px"><label>피드백</label><textarea data-field="settle4w.weeks.${idx}.feedback" data-autosize style="min-height:50px">${ui.escapeHtml(w.feedback)}</textarea></div>
      <div class="field"><label>특이사항</label><textarea data-field="settle4w.weeks.${idx}.notes" data-autosize style="min-height:50px">${ui.escapeHtml(w.notes)}</textarea></div>
    </div>`).join('');
  return `<div>
    <div class="card card-pad" style="margin-bottom:16px">
      <h3 class="card-title">정착교육 4주 평가</h3><p class="card-sub">${avg!==null?`평균 <b>${avg.toFixed(1)} / 5.0</b>`:'코칭능력·회원관리·업무지식 3개 영역을 항목별 5점 척도로 평가합니다.'}</p>
      ${groups}
      <div style="display:flex;align-items:center;gap:12px;margin-top:14px">
        <button class="btn btn-primary btn-sm" data-action="saveDetail">💾 저장</button>
        <div class="save-note" id="saveNote"></div>
      </div>
    </div>
    <div class="card card-pad">
      <h3 class="card-title">주차별 기록</h3><p class="card-sub">Week 1~4 동안의 상세 기록입니다.</p>
      <div class="week-grid">${weekCards}</div>
    </div>
  </div>`;
}

/* ---- 인수인계 ---- */
function renderHandoverTab(record){
  const h = record.handover;
  return `<div class="card card-pad">
    <h3 class="card-title">인수인계서</h3><p class="card-sub">정착교육 종료 후 기존 팀장에게 전달할 정보를 작성합니다.</p>
    <div class="field-grid">
      <div class="field full"><label>강점</label><textarea data-field="handover.strengths" data-autosize>${ui.escapeHtml(h.strengths)}</textarea></div>
      <div class="field full"><label>주의사항</label><textarea data-field="handover.cautions" data-autosize>${ui.escapeHtml(h.cautions)}</textarea></div>
      <div class="field"><label>수업 레벨</label><input type="text" data-field="handover.classLevel" value="${ui.escapeHtml(h.classLevel)}"/></div>
      <div class="field"></div>
      <div class="field"><label>현재 보유 회원수</label><input type="number" data-field="handover.currentMembers" value="${ui.escapeHtml(h.currentMembers)}"/></div>
      <div class="field"><label>희망 회원수</label><input type="number" data-field="handover.desiredMembers" value="${ui.escapeHtml(h.desiredMembers)}"/></div>
      <div class="field full"><label>교육자 종합의견</label><textarea data-field="handover.opinion" data-autosize>${ui.escapeHtml(h.opinion)}</textarea></div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:14px">
      <button class="btn btn-primary btn-sm" data-action="saveDetail">💾 저장</button>
      <div class="save-note" id="saveNote"></div>
    </div>
  </div>`;
}

/* ---- 최종리포트 ---- */
// 카테고리별 분석 막대그래프의 "쌍(pair)"별 항목 이름·점수 글자색.
// 신입교육 항목과 그 짝이 되는 정착교육 항목(pairKey로 연결)이 같은 색을 갖습니다.
// - 1번째 쌍(콘텐츠 이해도/수업구성능력, 의사소통능력/회원소통만족도, 내용이해도/정책이해도) → 빨간색
// - 2번째 쌍(프로그램 조작도/회원별피드백, 업무수행력/회원관리능력, 교육참여도/업무수행률) → 연두색
// - 3번째 쌍(내용 전달력/내용 응용력, 문제해결능력, CAS 조작/업무정확도) → 파란색
// 색은 항목(key) 자체에 고정되어 있어서, 막대 위치를 바꿔도 항목의 색은 그대로 따라갑니다.
const CATEGORY_PAIR_LABEL_COLOR = {
  trainContentUnderstand:'#F2415A', settleClassDesign:'#F2415A',
  trainCommunication:'#F2415A',     settleCounselSat:'#F2415A',
  trainContentKnowledge:'#F2415A',  settlePolicyUnderstand:'#F2415A',

  trainProgramOperate:'#8BC34A',    settleMemberFeedback:'#8BC34A',
  trainTaskPerform:'#8BC34A',       settleMemberMgmtAbility:'#8BC34A',
  trainParticipation:'#8BC34A',     settleAccuracy:'#8BC34A',

  trainDelivery:'#4F7CFF',          settleApplication:'#4F7CFF',
  trainProblemSolving:'#4F7CFF',    settleProblemSolving:'#4F7CFF',
  trainCasOperate:'#4F7CFF',        settleErrorRate:'#4F7CFF',
};

// 카테고리 1개에 속한 신입교육 항목 3개 + 정착교육 항목 3개를 번갈아 나열한
// labels/values/colors/tickColors 배열을 만듭니다. (카테고리별 분석 막대그래프용)
function buildCategoryItemsData(cat, record){
  const trainItems = TRAIN_SCORES.filter(f=>f.category===cat.key);
  const entries = [];
  trainItems.forEach(t=>{
    entries.push({
      key: t.key, label: t.label, value: Number(record.scores.train2w[t.key]) || 0,
      color: '#F5B940', tickColor: CATEGORY_PAIR_LABEL_COLOR[t.key],
    });
    const pair = SETTLE_SCORES.find(s=>s.key===t.pairKey);
    if(pair){
      entries.push({
        key: pair.key, label: pair.label, value: Number(record.scores.settle4w[pair.key]) || 0,
        color: '#EB7A3C', tickColor: CATEGORY_PAIR_LABEL_COLOR[pair.key],
      });
    }
  });
  // 업무지식 그래프에서는 "업무수행률"과 "업무정확도" 막대의 위치를 서로 바꿔서 보여줍니다.
  // (각 항목의 글자색은 항목 자체에 고정돼 있으므로 위치를 바꿔도 원래 색을 그대로 유지합니다.)
  if(cat.key==='workKnowledge'){
    const i1 = entries.findIndex(e=>e.key==='settleAccuracy');
    const i2 = entries.findIndex(e=>e.key==='settleErrorRate');
    if(i1!==-1 && i2!==-1){ const tmp = entries[i1]; entries[i1] = entries[i2]; entries[i2] = tmp; }
  }
  return {
    labels: entries.map(e=>e.label),
    values: entries.map(e=>e.value),
    colors: entries.map(e=>e.color),
    tickColors: entries.map(e=>e.tickColor),
  };
}

function renderReportTab(record){
  const a = teacherService.stageAvgs(record);
  const growth = teacherService.growthPct(record);
  const badges = reportService.computeBadges(record);
  const growthUp = growth!==null && growth>=0;
  const aiAnalysis = reportService.generateAIAnalysis(record, a, growth);
  const strengthSentence = reportService.generateStrengthSentence(record);
  const timelineSteps = reportService.buildStageTimeline(record, a);

  const tlHtml = timelineSteps.map(s=>`
    <div class="tl-step"><div class="tl-dotcol"><div class="tl-dot ${s.on?'on':''}"></div><div class="tl-line ${s.on?'on':''}"></div></div>
    <div class="tl-body"><div class="tl-title">${s.label}</div>${s.date?`<div class="tl-date">${s.date}</div>`:''}${s.score!=null?`<div class="tl-score">평균 ${s.score.toFixed(1)}점</div>`:''}</div></div>`).join('');

  const categoryChartsHtml = SCORE_CATEGORIES.map(cat=>`
    <div>
      <div style="text-align:center;font-size:12.5px;font-weight:700;color:var(--ink-soft);margin-bottom:6px">${cat.label}</div>
      <div class="chart-h" style="height:220px"><canvas id="chartReportCat_${cat.key}"></canvas></div>
    </div>`).join('');

  const weeksHtml = (record.settle4w.weeks||[]).slice(0,4).map((w,i)=>`
    <div style="padding:10px 12px;background:var(--bg);border-radius:10px">
      <div style="font-weight:700;font-size:12px;margin-bottom:3px">${i+1}주차</div>
      <div style="font-size:12.5px;line-height:1.6">${w.feedback ? ui.escapeHtml(w.feedback) : '<span class="card-sub">기록 없음</span>'}</div>
    </div>`).join('');

  // 성장률 카드 오른쪽에 카테고리(코칭능력/회원관리/업무지식)별 신입교육↔정착교육 평점을 나란히 비교해 보여줍니다.
  const categoryCompareHtml = SCORE_CATEGORIES.map(cat=>{
    const tv = teacherService.categoryAvg(record.scores.train2w, TRAIN_SCORES, cat.key);
    const sv = teacherService.categoryAvg(record.scores.settle4w, SETTLE_SCORES, cat.key);
    return `<div class="growth-cat-row">
      <span class="growth-cat-label">${cat.label}</span>
      <span class="growth-cat-val">${tv!==null?tv.toFixed(1):'–'}</span>
      <span class="growth-cat-arrow">→</span>
      <span class="growth-cat-val settle">${sv!==null?sv.toFixed(1):'–'}</span>
    </div>`;
  }).join('');

  return `<div>
    <div class="two-col" style="margin-bottom:16px">
      <div class="card card-pad">
        <h3 class="card-title">성장률</h3><p class="card-sub">신입교육 2주 → 정착교육 4주(최종)</p>
        <div class="growth-box">
          <div style="display:flex;align-items:center;gap:18px">
            <div><div class="growth-num">${a.train2w!==null?a.train2w.toFixed(1):'–'}</div><div class="card-sub" style="margin:0">신입교육 2주</div></div>
            <div style="font-size:20px;color:var(--ink-faint)">→</div>
            <div><div class="growth-num">${a.settle4w!==null?a.settle4w.toFixed(1):'–'}</div><div class="card-sub" style="margin:0">정착교육 4주(최종)</div></div>
            ${growth!==null?`<span class="growth-arrow ${growthUp?'up':'down'}">${growthUp?'▲':'▼'} ${Math.abs(growth).toFixed(1)}%</span>`:''}
          </div>
          <div class="growth-cat-compare">
            <div class="growth-cat-head">
              <span class="growth-cat-label"></span>
              <span class="growth-cat-val-head">신입</span>
              <span class="growth-cat-arrow"></span>
              <span class="growth-cat-val-head">정착</span>
            </div>
            ${categoryCompareHtml}
          </div>
        </div>
      </div>
      <div class="card card-pad">
        <h3 class="card-title">성장 타임라인</h3>
        <div class="timeline">${tlHtml}</div>
      </div>
    </div>
    <div class="card card-pad" style="margin-bottom:16px">
      <h3 class="card-title">카테고리별 분석</h3><p class="card-sub">코칭능력·회원관리·업무지식 — 신입교육(●)·정착교육(●) 항목별 점수</p>
      <div style="display:flex;gap:14px;justify-content:center;margin-bottom:10px;font-size:11.5px;color:var(--ink-soft)">
        <span><i style="display:inline-block;width:9px;height:9px;background:#F5B940;border-radius:2px;margin-right:4px"></i>신입교육</span>
        <span><i style="display:inline-block;width:9px;height:9px;background:#EB7A3C;border-radius:2px;margin-right:4px"></i>정착교육</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">${categoryChartsHtml}</div>
    </div>
    <div class="card card-pad" style="margin-bottom:16px">
      <div class="ai-card"><div class="ai-label">✨ AI 성장 분석</div>${aiAnalysis}</div>
    </div>
    <div class="two-col" style="grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card card-pad">
        <h3 class="card-title">강점</h3>
        <p style="font-size:13px;line-height:1.7">${strengthSentence}</p>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">${badges.good.length? badges.good.map(b=>`<span class="tag-mini" style="background:var(--green-dim);color:var(--green)">${b}</span>`).join(''):''}</div>
      </div>
      <div class="card card-pad">
        <h3 class="card-title">보완 필요 영역</h3>
        ${badges.watch.length? badges.watch.map(w=>`
          <div style="margin-bottom:9px;padding:9px 11px;background:var(--red-dim);border-radius:10px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
              <span style="font-weight:700;font-size:12.5px;color:var(--red)">⚠ ${w.label}</span>
              <span style="font-size:11px;color:var(--ink-faint)">${w.value.toFixed(1)}점</span>
            </div>
            <div style="font-size:12.5px;line-height:1.6">${w.advice}</div>
            ${w.training?`<div style="font-size:11.5px;color:var(--ink-soft);margin-top:3px">📚 추천 교육: ${w.training}</div>`:''}
          </div>`).join('') : '<span class="card-sub">뚜렷한 약점이 보이지 않아요 👍</span>'}
      </div>
    </div>
    <div class="card card-pad" style="margin-bottom:16px">
      <h3 class="card-title">성장기록지</h3><p class="card-sub">시험 결과, 주차별 피드백, 교육자 종합의견을 한눈에 확인해요.</p>
      <div style="display:flex;gap:14px;margin-bottom:16px">
        <div style="flex:1;padding:12px;background:var(--bg);border-radius:10px">
          <div class="card-sub" style="margin:0 0 4px">1차 시험 점수 (신입교육)</div>
          <div style="font-size:18px;font-weight:800">${record.train2w.examResult ? ui.escapeHtml(record.train2w.examResult) : '–'}</div>
        </div>
        <div style="flex:1;padding:12px;background:var(--bg);border-radius:10px">
          <div class="card-sub" style="margin:0 0 4px">2차 시험 점수 (정착교육)</div>
          <div style="font-size:18px;font-weight:800">${record.settle4w.examResult ? ui.escapeHtml(record.settle4w.examResult) : '–'}</div>
        </div>
      </div>
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">정착교육 주차별 피드백</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">${weeksHtml}</div>
      <div style="font-weight:700;font-size:13px;margin-bottom:6px">교육자 종합의견</div>
      <div style="font-size:13px;line-height:1.7;padding:12px;background:var(--bg);border-radius:10px">${record.handover.opinion ? ui.escapeHtml(record.handover.opinion) : '<span class="card-sub">작성된 종합의견이 없어요.</span>'}</div>
    </div>
    <div style="margin-top:18px;display:flex;gap:8px" class="no-print">
      <button class="btn btn-primary" data-action="printPage">🖨 인쇄</button>
      <button class="btn btn-ghost" data-action="printPage">📄 PDF로 저장</button>
    </div>
  </div>`;
}
function renderReportCharts(record){
  chartService.destroyAll();
  SCORE_CATEGORIES.forEach(cat=>{
    const ctx = document.getElementById(`chartReportCat_${cat.key}`);
    const { labels, values, colors, tickColors } = buildCategoryItemsData(cat, record);
    chartService.categoryItemsChart(`reportCat_${cat.key}`, ctx, labels, values, colors, tickColors);
  });
}
