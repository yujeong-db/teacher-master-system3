/* ============================================================
   Teacher Talent Management System — V2
   settings.js
   -------------------------------------------------------------
   settings.html(설정) 전용 페이지 부트스트랩입니다. 평가자 관리,
   소속팀·진행상태 드롭다운 목록 관리, 데이터 백업/초기화를 다룹니다.
============================================================ */
async function bootSettingsPage(){
  await seedIfEmpty();
  await loadDynamicConfig();
  await ui.initEvaluatorSelect();

  const teachers = await teacherService.list();
  ui.initGlobalSearch(teachers);
  renderNavCounts(teachers);

  await renderEvaluatorList();
  await renderTeamLists();
  await renderInterviewConfigLists();
  await renderStatusConfigList();

  document.getElementById('addEvaluatorForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const input = document.getElementById('newEvaluatorNameInput');
    const name = input.value.trim();
    if(!name){ ui.toast('평가자 이름을 입력해주세요.'); return; }
    await evaluationService.addEvaluator(name);
    input.value = '';
    await renderEvaluatorList();
    await ui.initEvaluatorSelect();
    ui.toast(name+' 평가자가 등록됐어요.');
  });

  document.getElementById('addNewTeamForm')?.addEventListener('submit', (e)=>addTeam(e, 'newTeams', 'newTeamCodeInput'));
  document.getElementById('addPlacedTeamForm')?.addEventListener('submit', (e)=>addTeam(e, 'placedTeams', 'placedTeamCodeInput'));
  document.getElementById('addInterviewerForm')?.addEventListener('submit', (e)=>addInterviewConfigItem(e, 'interviewers', 'newInterviewerInput'));
  document.getElementById('addInterviewRoomForm')?.addEventListener('submit', (e)=>addInterviewConfigItem(e, 'interviewRooms', 'newInterviewRoomInput'));
  document.getElementById('addStatusForm')?.addEventListener('submit', addStatus);

  document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
  document.getElementById('importDataInput')?.addEventListener('change', handleImportFile);
  document.getElementById('clearAllBtn')?.addEventListener('click', clearAllData);
  document.getElementById('notifyBtn')?.addEventListener('click', ()=> ui.toast('알림 기능은 준비 중이에요.'));
}

/* ---- 평가자 관리 ---- */
async function renderEvaluatorList(){
  const evaluators = await evaluationService.listEvaluators();
  const currentId = await evaluationService.getCurrentEvaluatorId();
  const el = document.getElementById('evaluatorList');
  el.innerHTML = evaluators.length ? evaluators.map(ev=>`
    <div class="row-mini" style="cursor:default">
      <span class="avatar">${ui.initials(ev.name)}</span>
      <span class="rname">${ui.escapeHtml(ev.name)}</span>
      ${currentId===ev.id ? '<span class="tag-mini" style="background:var(--primary-dim);color:var(--primary-ink)">현재 선택됨</span>' : ''}
      <button class="note-del" data-id="${ev.id}" data-action="removeEvaluator">삭제</button>
    </div>`).join('') : `<div class="card-sub">등록된 평가자가 없어요.</div>`;

  el.querySelectorAll('[data-action="removeEvaluator"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(!confirm('이 평가자를 삭제할까요? 이미 기록된 평가 로그의 평가자 이름은 그대로 남아요.')) return;
      await evaluationService.removeEvaluator(btn.dataset.id);
      await renderEvaluatorList();
      await ui.initEvaluatorSelect();
      ui.toast('평가자를 삭제했어요.');
    });
  });
}

/* ---- 소속팀 목록 관리 ---- */
async function renderTeamLists(){
  const cfg = await storageService.getTeamConfig();
  renderTeamListInto('newTeamList', cfg.newTeams, 'newTeams');
  renderTeamListInto('placedTeamList', cfg.placedTeams, 'placedTeams');
}
function renderTeamListInto(elId, codes, group){
  const el = document.getElementById(elId);
  el.innerHTML = codes.length ? codes.map(code=>`
    <span class="tag-mini" style="display:inline-flex;align-items:center;gap:6px;margin:0 6px 6px 0;padding:5px 6px 5px 12px">
      ${code}
      <button class="note-del" data-code="${code}" data-group="${group}" data-action="removeTeam" style="font-size:13px;line-height:1">✕</button>
    </span>`).join('') : `<div class="card-sub">등록된 팀이 없어요.</div>`;

  el.querySelectorAll('[data-action="removeTeam"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const cfg = await storageService.getTeamConfig();
      cfg[btn.dataset.group] = cfg[btn.dataset.group].filter(c=>c!==btn.dataset.code);
      await storageService.saveTeamConfig(cfg);
      await loadDynamicConfig();
      await renderTeamLists();
      ui.toast(btn.dataset.code+' 팀을 삭제했어요.');
    });
  });
}
async function addTeam(e, group, inputId){
  e.preventDefault();
  const input = document.getElementById(inputId);
  const code = input.value.trim().toUpperCase();
  if(!code){ ui.toast('팀 코드를 입력해주세요.'); return; }
  const cfg = await storageService.getTeamConfig();
  if(cfg.newTeams.includes(code) || cfg.placedTeams.includes(code)){ ui.toast('이미 등록된 팀 코드예요.'); return; }
  cfg[group] = [...cfg[group], code];
  await storageService.saveTeamConfig(cfg);
  await loadDynamicConfig();
  input.value = '';
  await renderTeamLists();
  ui.toast(code+' 팀을 추가했어요.');
}

/* ---- 면접 일정 목록 관리 (면접관/회의실, 면접 등록 시 드롭다운으로 사용) ---- */
async function renderInterviewConfigLists(){
  const [interviewers, rooms] = await Promise.all([
    storageService.getInterviewers(), storageService.getInterviewRooms(),
  ]);
  renderInterviewConfigListInto('interviewerList', interviewers, 'interviewers');
  renderInterviewConfigListInto('interviewRoomList', rooms, 'interviewRooms');
}
function renderInterviewConfigListInto(elId, items, storeKey){
  const el = document.getElementById(elId);
  if(!el) return;
  el.innerHTML = items.length ? items.map(name=>`
    <span class="tag-mini" style="display:inline-flex;align-items:center;gap:6px;margin:0 6px 6px 0;padding:5px 6px 5px 12px">
      ${ui.escapeHtml(name)}
      <button class="note-del" data-name="${ui.escapeHtml(name)}" data-key="${storeKey}" data-action="removeInterviewConfigItem" style="font-size:13px;line-height:1">✕</button>
    </span>`).join('') : `<div class="card-sub">등록된 항목이 없어요.</div>`;

  el.querySelectorAll('[data-action="removeInterviewConfigItem"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const getFn = btn.dataset.key==='interviewers' ? storageService.getInterviewers : storageService.getInterviewRooms;
      const saveFn = btn.dataset.key==='interviewers' ? storageService.saveInterviewers : storageService.saveInterviewRooms;
      const list = await getFn.call(storageService);
      await saveFn.call(storageService, list.filter(n=>n!==btn.dataset.name));
      await loadDynamicConfig();
      await renderInterviewConfigLists();
      ui.toast(btn.dataset.name+' 항목을 삭제했어요.');
    });
  });
}
async function addInterviewConfigItem(e, storeKey, inputId){
  e.preventDefault();
  const input = document.getElementById(inputId);
  const name = input.value.trim();
  if(!name){ ui.toast('이름을 입력해주세요.'); return; }
  const getFn = storeKey==='interviewers' ? storageService.getInterviewers : storageService.getInterviewRooms;
  const saveFn = storeKey==='interviewers' ? storageService.saveInterviewers : storageService.saveInterviewRooms;
  const list = await getFn.call(storageService);
  if(list.includes(name)){ ui.toast('이미 등록된 항목이에요.'); return; }
  await saveFn.call(storageService, [...list, name]);
  await loadDynamicConfig();
  input.value = '';
  await renderInterviewConfigLists();
  ui.toast(name+' 항목을 추가했어요.');
}

/* ---- 진행상태 목록 관리 ---- */
async function renderStatusConfigList(){
  const list = await storageService.getStatusConfig();
  const el = document.getElementById('statusConfigList');
  el.innerHTML = list.map(s=>{
    const isCore = CORE_STATUS_KEYS.includes(s.key);
    return `<div class="row-mini" style="cursor:default">
      <span class="badge status-${s.key}">${ui.escapeHtml(s.label)}</span>
      ${isCore
        ? '<span class="card-sub" style="margin:0">기본 상태 (삭제 불가)</span>'
        : `<button class="note-del" data-key="${s.key}" data-action="removeStatus" style="margin-left:auto">삭제</button>`}
    </div>`;
  }).join('');

  el.querySelectorAll('[data-action="removeStatus"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(!confirm('이 진행상태를 삭제할까요? 이미 이 상태로 지정된 교사가 있다면 배지 표시가 비어 보일 수 있어요.')) return;
      const list = await storageService.getStatusConfig();
      await storageService.saveStatusConfig(list.filter(s=>s.key!==btn.dataset.key));
      await loadDynamicConfig();
      await renderStatusConfigList();
      ui.toast('진행상태를 삭제했어요.');
    });
  });
}
async function addStatus(e){
  e.preventDefault();
  const input = document.getElementById('newStatusLabelInput');
  const label = input.value.trim();
  if(!label){ ui.toast('진행상태 이름을 입력해주세요.'); return; }
  const list = await storageService.getStatusConfig();
  const key = 'custom_' + Date.now().toString(36);
  list.push({ key, label, color:'primary' });
  await storageService.saveStatusConfig(list);
  await loadDynamicConfig();
  input.value = '';
  await renderStatusConfigList();
  ui.toast(label+' 상태를 추가했어요.');
}

/* ---- 데이터 백업/복원/초기화 ---- */
async function exportData(){
  const raw = await storageService.exportRawString();
  const blob = new Blob([raw], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'teacher-management-backup-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  ui.toast('데이터를 내보냈어요.');
}

async function handleImportFile(e){
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const text = await file.text();
    if(!confirm('가져오기를 진행하면 서버에 저장된(모두가 공유하는) 데이터를 덮어써요. 계속할까요?')) { e.target.value=''; return; }
    await storageService.importRawString(text);
    ui.toast('데이터를 가져왔어요. 페이지를 새로고침할게요.');
    setTimeout(()=>location.reload(), 800);
  }catch(err){
    console.error(err);
    ui.toast('가져오기에 실패했어요. 파일 형식을 확인해주세요.');
  }
  e.target.value = '';
}

async function clearAllData(){
  if(!confirm('정말 모든 데이터를 초기화할까요? 등록된 교사, 평가, 평가자, 팀·상태 설정이 모두 사라지고 되돌릴 수 없어요.')) return;
  await storageService.clearAll();
  ui.toast('모든 데이터를 초기화했어요.');
  setTimeout(()=>location.href='index.html', 800);
}
