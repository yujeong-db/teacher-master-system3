/* ============================================================
   Teacher Talent Management System — V2
   teacher.js
   -------------------------------------------------------------
   교사 CRUD, 검색/필터, 점수 평균·성장률·성장 배지 계산을 담당합니다.
   여러 페이지(Dashboard/교사관리/상세/리포트)에서 공통으로 재사용됩니다.
   교사는 관리자가 기본정보(이름 등)를 입력해 직접 등록합니다.
============================================================ */
class TeacherService {
  static uid(){ return 'T' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

  static blankInternal(id, basicInfo={}){
    return {
      id,
      name: basicInfo.name||'', email: basicInfo.email||'', phone: basicInfo.phone||'',
      birth: basicInfo.birth||'', hireDate: basicInfo.hireDate||'',
      currentTeam:'', teamLead: basicInfo.teamLead||'', job: basicInfo.job||'', cohortId: basicInfo.cohortId||'',
      referrer: basicInfo.referrer||'', priorCareer: basicInfo.priorCareer||'',
      address: basicInfo.address||'', education: basicInfo.education||'', selfIntro: basicInfo.selfIntro||'',
      converted: basicInfo.converted||'no',
      status:'interview', memo:'', dismissReason:'', profileIncomplete: !!basicInfo.profileIncomplete,
      resumeMeta: null,
      interview:{ date:'', script:'', notes:[] },
      train2w:{ firstRpLink:'', selfEval:'', memo:'', examResult:'' },
      settle4w:{ weeks:[{memo:'',feedback:'',notes:''},{memo:'',feedback:'',notes:''},{memo:'',feedback:'',notes:''},{memo:'',feedback:'',notes:''}], examResult:'' },
      handover:{ strengths:'', cautions:'', classLevel:'', desiredMembers:'', currentMembers:'', opinion:'' },
      scores:{ interview:{}, train2w:{}, settle4w:{} },
      history:[], evaluations:[], createdAt: Date.now(),
    };
  }

  async list(){ return storageService.getAllTeacherRecords(); }

  // 관리자가 교사를 직접 추가합니다. (이름만 필수, 나머지는 상세 페이지에서 보완 가능)
  async create(basicInfo){
    const name = (basicInfo.name||'').trim();
    if(!name) throw new Error('이름은 필수입니다.');
    const roster = await storageService.getRoster();
    const id = TeacherService.uid();
    const internal = TeacherService.blankInternal(id, { ...basicInfo, name });
    roster.push({ id, name, createdAt: internal.createdAt });
    await storageService.saveRoster(roster);
    await storageService.saveTeacherRecord(id, internal);
    return storageService.getTeacherRecord(id);
  }

  async remove(id){
    const roster = await storageService.getRoster();
    await storageService.saveRoster(roster.filter(t=>t.id!==id));
    await storageService.deleteTeacherRecord(id);
  }

  search(list, query){
    const q = (query||'').trim().toLowerCase();
    if(!q) return list;
    return list.filter(t => t.name.toLowerCase().includes(q));
  }
  filterByStatus(list, statuses){
    if(!statuses || !statuses.length) return list;
    return list.filter(t => statuses.includes(t.status));
  }
  filterByTeam(list, team){
    if(!team) return list;
    return list.filter(t => t.currentTeam===team);
  }

  // 현재 소속팀이 기존팀(C2~C11)으로 설정되면 진행상태를 자동으로 '팀 배치 완료'로 바꿉니다.
  // (teachers-page.js의 팀 드롭다운, teacher-detail.js의 기본정보 탭 양쪽에서 공통으로 사용)
  applyTeamPlacementRule(record){
    if(PLACED_TEAMS.includes(record.currentTeam)){
      record.status = 'placed';
    }
    return record;
  }

  /* ---- 점수 계산 ---- */
  avgOf(scoreObj, fields){
    if(!scoreObj) return null;
    const vals = fields.map(f=>Number(scoreObj[f.key])).filter(v=>v>0 && !isNaN(v));
    if(!vals.length) return null;
    return vals.reduce((a,b)=>a+b,0)/vals.length;
  }
  // 코칭능력/회원관리/업무지식처럼 fields를 카테고리로 묶었을 때, 특정 카테고리 항목들만의 평균
  categoryAvg(scoreObj, fields, categoryKey){
    return this.avgOf(scoreObj, fields.filter(f=>f.category===categoryKey));
  }
  stageAvgs(t){
    return {
      interview: this.avgOf(t.scores.interview, INTERVIEW_SCORES),
      train2w:   this.avgOf(t.scores.train2w, TRAIN_SCORES),
      settle4w:  this.avgOf(t.scores.settle4w, SETTLE_SCORES),
    };
  }
  overallScore(t){
    const a = this.stageAvgs(t);
    const vals = [a.interview,a.train2w,a.settle4w].filter(v=>v!==null);
    if(!vals.length) return null;
    return vals.reduce((x,y)=>x+y,0)/vals.length;
  }
  // 성장률 = 신입교육(2주) 평균 → 정착교육(4주, 최종) 평균의 변화폭을
  // 5점 만점 대비 퍼센트로 환산합니다. (예: 2.1→3.8이면 (3.8-2.1)/5*100 = +34%)
  // 상대적 증가율(%)로 계산하면 시작 점수가 낮을 때 숫자가 비정상적으로
  // 커지는 문제(예: 1.0→2.0이면 +100%)가 있어 5점 척도 기준으로 바꿨습니다.
  growthPct(t){
    const a = this.stageAvgs(t);
    const start = a.train2w;
    const end = a.settle4w;
    if(start===null || end===null) return null;
    return ((end-start)/5) * 100;
  }
}

const teacherService = new TeacherService();
