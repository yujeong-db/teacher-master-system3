/* ============================================================
   Teacher Talent Management System — V2
   ui.js
   -------------------------------------------------------------
   토스트, 다크모드, 카운트업 애니메이션, 오토리사이즈, 전역 검색,
   평가자 선택, 별점 위젯 등 여러 페이지에서 공통으로 쓰는 순수 DOM
   유틸입니다. 데이터 저장/조회는 각 서비스(StorageService,
   EvaluationService 등)에 위임하고, 이 클래스는 렌더링과 이벤트 처리만
   담당합니다.
============================================================ */
class UIService {
  toast(msg){
    const el = document.getElementById('toast');
    if(!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(()=>el.classList.remove('show'), 1800);
  }
  escapeHtml(str){
    return String(str==null?'':str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  initials(name){ return (name||'?').trim().slice(0,1); }
  // 생년월일(YYYY-MM-DD) 문자열로 "만 나이"를 계산합니다. 아직 생일이 지나지 않았으면 1살 뺍니다.
  calcManAge(birthStr){
    if(!birthStr) return null;
    const birth = new Date(birthStr+'T00:00:00');
    if(isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const hadBirthdayThisYear = (now.getMonth() > birth.getMonth()) ||
      (now.getMonth()===birth.getMonth() && now.getDate() >= birth.getDate());
    if(!hadBirthdayThisYear) age--;
    return age>=0 ? age : null;
  }
  fmtDate(ts){
    if(!ts) return '';
    const d = new Date(ts);
    if(isNaN(d.getTime())) return String(ts);
    return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');
  }
  countUp(el, target, opts={}){
    if(!el) return;
    const isPercent = typeof target === 'string';
    const num = isPercent ? parseFloat(target) : target;
    if(isNaN(num)){ el.textContent = target; return; }
    const suffix = isPercent ? target.replace(/^[-+0-9.]+/, '') : '';
    const prefix = isPercent && target.trim().startsWith('+') ? '+' : '';
    const duration = opts.duration || 700;
    const start = performance.now();
    const from = 0;
    const step = (now)=>{
      const p = Math.min(1, (now-start)/duration);
      const eased = 1 - Math.pow(1-p, 3);
      const val = from + (num-from)*eased;
      el.textContent = prefix + (Number.isInteger(num) ? Math.round(val) : val.toFixed(1)) + suffix;
      if(p<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  autosizeAll(root=document){
    root.querySelectorAll('textarea[data-autosize]').forEach(ta=>{
      const resize = ()=>{ ta.style.height='auto'; ta.style.height=(ta.scrollHeight+2)+'px'; };
      resize();
      ta.addEventListener('input', resize);
    });
  }
  // 별점 위젯 (재사용 가능한 순수 HTML 조각). 이미 매긴 별점을 0점(미평가)으로
  // 되돌릴 수 있도록 별점 옆에 "초기화" 버튼을 함께 렌더링합니다.
  // 라벨 옆의 ⓘ 아이콘에 마우스를 올리면 1~5점 채점 기준을 볼 수 있습니다.
  // note: 별점 항목 옆 "근거/행동 기록" 자유서술 값. 점수가 매겨지면(v>0) 입력칸이 함께 나타납니다.
  starWidget(section, key, value, label, note=''){
    const v = Number(value)||0;
    let stars = '';
    for(let i=1;i<=5;i++) stars += `<span class="star ${i<=v?'filled':''}" data-action="setScore" data-section="${section}" data-key="${key}" data-val="${i}">★</span>`;
    const noteBlock = v ? `<div class="field score-note-field"><label>근거 / 행동 기록</label><textarea data-field="scoreNotes.${section}.${key}" data-autosize placeholder="이 점수를 준 근거가 되는 구체적인 행동을 적어주세요.">${this.escapeHtml(note)}</textarea></div>` : '';
    return `<div class="star-field">
      <div class="sf-label"><span>${label}${this.rubricTip(key)}</span>${v?`<b>${v}.0</b>`:''}</div>
      <div class="stars">${stars}${v?`<button type="button" class="star-reset" data-action="resetScore" data-section="${section}" data-key="${key}">초기화</button>`:''}</div>
      ${noteBlock}
    </div>`;
  }

  // 채점 기준 툴팁 — ⓘ 아이콘에 마우스를 올리면(포커스해도) 1~5점 기준이 나타납니다.
  rubricTip(key){
    return `<span class="rubric-tip" tabindex="0">
      <span class="rubric-tip-icon">ⓘ</span>
      <div class="rubric-tip-pop">${this.rubricPopoverHtml(key)}</div>
    </span>`;
  }
  rubricPopoverHtml(key){
    const rubric = (typeof SCORE_RUBRICS !== 'undefined') ? SCORE_RUBRICS[key] : null;
    if(!rubric){
      return `<div class="rubric-empty">아직 이 항목의 채점 기준이 등록되지 않았어요.</div>`;
    }
    const rows = rubric.criteria.map(c=>`
      <div class="rubric-row"><b>${c.score}점 (${this.escapeHtml(c.title)})</b><p>${this.escapeHtml(c.text)}</p></div>`).join('');
    return `${rubric.desc ? `<div class="rubric-desc">${this.escapeHtml(rubric.desc)}</div>` : ''}${rows}`;
  }
  // 탭 제목(면접평가/신입교육/정착교육)에 마우스를 올리면 해당 단계의 평가 항목 요약을 보여줍니다.
  tabTooltipHtml(fields){
    if(!fields || !fields.length) return '';
    const items = fields.map(f=>{
      const rubric = (typeof SCORE_RUBRICS !== 'undefined') ? SCORE_RUBRICS[f.key] : null;
      return `<div class="rubric-row"><b>${this.escapeHtml(f.label)}</b>${rubric && rubric.desc ? `<p>${this.escapeHtml(rubric.desc)}</p>` : `<p class="rubric-empty">채점 기준 준비 중</p>`}</div>`;
    }).join('');
    return `<div class="rubric-tip-pop tab-tip">${items}</div>`;
  }

  /* ---- 전역 검색 (topbar) ---- */
  initGlobalSearch(allTeachers){
    const input = document.getElementById('topSearchInput');
    const drop = document.getElementById('topSearchDrop');
    if(!input || !drop) return;
    input.addEventListener('input', ()=>{
      const q = input.value.trim().toLowerCase();
      if(!q){ drop.innerHTML=''; drop.style.display='none'; return; }
      const matches = allTeachers.filter(t=>t.name.toLowerCase().includes(q)).slice(0,6);
      drop.style.display = 'block';
      drop.innerHTML = matches.length
        ? matches.map(t=>`<div class="sd-item" data-id="${t.id}"><span>${this.escapeHtml(t.name)}</span><span class="tag-mini">${STATUS[t.status]?.label||''}</span></div>`).join('')
        : `<div class="sd-item" style="color:var(--ink-faint)">검색 결과 없음</div>`;
      drop.querySelectorAll('.sd-item[data-id]').forEach(el=>{
        el.addEventListener('click', ()=>{ location.href = `teacher-detail.html?id=${el.dataset.id}`; });
      });
    });
    document.addEventListener('click', (e)=>{
      if(!e.target.closest('.searchbox')){ drop.style.display='none'; }
    });
  }

  /* ---- 평가자 선택 (Dropdown) ----
     이전에는 새 평가자 등록 시 window.prompt()를 사용했는데, 이 프로젝트가
     삽입되는 환경(예: 샌드박스 iframe 미리보기)에 따라 네이티브 prompt/confirm
     다이얼로그가 차단되면서 페이지가 멈춘 것처럼 보이는 버그가 있었습니다.
     이제는 브라우저 다이얼로그를 전혀 쓰지 않고, select를 인라인 입력폼으로
     완전히 교체하는 방식으로 새 평가자를 등록합니다. 별도의 "+" 버튼도 없고,
     데이터 처리는 전부 EvaluationService에 위임합니다. */
  async initEvaluatorSelect(){
    const wrap = document.getElementById('evaluatorWrap');
    if(!wrap) return;

    const renderSelect = async ()=>{
      const evaluators = await evaluationService.listEvaluators();
      const currentId = await evaluationService.getCurrentEvaluatorId();
      wrap.innerHTML = `<select class="evaluator-select" id="evaluatorSelect" title="평가자 선택">
        <option value="">평가자 선택</option>
        ${evaluators.map(ev=>`<option value="${ev.id}" ${currentId===ev.id?'selected':''}>${this.escapeHtml(ev.name)}</option>`).join('')}
        <option value="__new__">＋ 새 평가자 등록</option>
      </select>`;
      const sel = document.getElementById('evaluatorSelect');
      sel.addEventListener('change', async ()=>{
        if(sel.value==='__new__'){ renderAddForm(); return; }
        await evaluationService.setCurrentEvaluatorId(sel.value);
      });
    };

    const renderAddForm = ()=>{
      wrap.innerHTML = `<span class="evaluator-add-form">
        <input type="text" id="newEvaluatorInput" placeholder="평가자 이름" maxlength="20"/>
        <button type="button" class="btn btn-primary btn-sm" id="newEvaluatorConfirm">등록</button>
        <button type="button" class="btn btn-ghost btn-sm" id="newEvaluatorCancel">취소</button>
      </span>`;
      const input = document.getElementById('newEvaluatorInput');
      input.focus();
      const confirmAdd = async ()=>{
        const name = input.value.trim();
        if(!name){ input.focus(); return; }
        await evaluationService.addEvaluator(name);
        await renderSelect();
        this.toast(name+' 평가자가 등록됐어요.');
      };
      document.getElementById('newEvaluatorConfirm').addEventListener('click', confirmAdd);
      document.getElementById('newEvaluatorCancel').addEventListener('click', renderSelect);
      input.addEventListener('keydown', (e)=>{
        if(e.key==='Enter'){ e.preventDefault(); confirmAdd(); }
        else if(e.key==='Escape'){ renderSelect(); }
      });
    };

    await renderSelect();
  }
}
const ui = new UIService();
