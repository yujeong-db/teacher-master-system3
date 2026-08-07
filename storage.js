/* ============================================================
   Teacher Talent Management System — V2
   storage.js
   -------------------------------------------------------------
   [2026-08 업데이트] LocalStorage는 브라우저(기기)마다 따로 저장되어
   다른 사람이 접속하면 내용이 반영되지 않는 문제가 있었습니다. 이제는
   같은 데이터를 Supabase(서버 저장소: Postgres 테이블 + Storage)에
   저장해서, 누가 접속하든 항상 같은 최신 데이터를 봅니다.
   (GitHub Pages는 정적 파일만 서빙하고 서버 함수를 실행할 수 없어서,
   브라우저가 Supabase에 직접 접속하는 구조로 만들었습니다. 연결 정보는
   supabase-config.js의 sbClient를 사용합니다.)

   내부 데이터 구조(Teacher/Interview/Training/Settlement/Report/
   Evaluator로 분리해서 저장하는 방식)는 그대로 유지하고, 이 파일
   내부의 _readRaw() / _writeRaw()만 "localStorage 읽기/쓰기"에서
   "서버 API 호출"로 바뀌었습니다. 이 클래스를 호출하는 다른 모든
   서비스(TeacherService, EvaluationService 등)는 전혀 수정할 필요가
   없습니다.

   모든 메서드가 Promise를 반환합니다.
============================================================ */
const APP_DATA_TABLE = 'app_data';
const APP_DATA_ROW_ID = 'main';
const RESUME_BUCKET = 'resumes';

class StorageService {
  constructor(){
    this._inflightRead = null; // 동시에 여러 곳에서 읽기를 요청하면 요청을 한 번으로 합칩니다.
  }

  _defaultShape(){
    return {
      version: 6,
      roster: [],          // [{id, name, createdAt}]
      teachers: {},        // id -> 기본정보 + 우리 시스템 내부 관리 필드
      interviews: {},      // id -> 면접 평가
      trainings: {},       // id -> 신입교육(2주)
      settlements: {},      // id -> 정착교육(4주)
      reports: {},         // id -> 인수인계 / 히스토리 / 평가기록
      evaluators: [],       // [{id, name}]
      settings: { evaluatorId:'', seeded:false, rejectedSeenIds:[] },
      teamConfig: {
        newTeams: ['CNE1', 'CN1'],
        placedTeams: ['C2','C3','C4','C5','C6','C7','C8','C9','C10','C11'],
      },
      trainingCohorts: [], // [{id, label, date, targetEnglish, targetSubject}]
      interviewRooms: ['1회의실', '2회의실'],
      interviewers: [],
      interviewSchedules: [], // [{id, date, time, room, intervieweeName, job, interviewer, result, memo, createdAt}]
      statusConfig: [
        { key:'interview',  label:'채용진행 중',   color:'amber'  },
        { key:'rejected',   label:'면접 탈락',     color:'red'    },
        { key:'training2w', label:'신입교육 2주',  color:'primary'},
        { key:'training4w', label:'정착교육 4주',  color:'purple' },
        { key:'placed',     label:'팀 배치 완료',  color:'green'  },
        { key:'dismissed',  label:'해촉',         color:'red'    },
      ],
    };
  }

  /* ---- 서버에서 전체 데이터 읽기 ----
     동시에 여러 메서드가 호출돼도(예: Promise.all) 네트워크 요청은
     한 번만 나가도록 in-flight 요청을 공유하고, 호출자마다 독립된
     사본을 돌려줘서(구조 복제) 서로의 값을 실수로 공유하지 않게 합니다. */
  async _readRaw(){
    if(!this._inflightRead){
      this._inflightRead = (async ()=>{
        try{
          const { data: row, error } = await sbClient
            .from(APP_DATA_TABLE)
            .select('data')
            .eq('id', APP_DATA_ROW_ID)
            .maybeSingle();
          if(error) throw error;
          const stored = row ? row.data : null;
          return stored ? { ...this._defaultShape(), ...stored } : this._defaultShape();
        }catch(e){
          console.error('StorageService: 서버에서 데이터를 불러오지 못했어요.', e);
          if(typeof ui !== 'undefined' && ui.toast) ui.toast('서버 연결에 실패했어요. 네트워크를 확인해주세요.');
          return this._defaultShape();
        }
      })();
      this._inflightRead.finally(()=>{ this._inflightRead = null; });
    }
    const shared = await this._inflightRead;
    return JSON.parse(JSON.stringify(shared)); // 호출자별 독립 사본
  }

  async _writeRaw(data){
    try{
      const { error } = await sbClient
        .from(APP_DATA_TABLE)
        .upsert({ id: APP_DATA_ROW_ID, data, updated_at: new Date().toISOString() });
      if(error) throw error;
      return true;
    }catch(e){
      console.error('StorageService: 서버에 데이터를 저장하지 못했어요.', e);
      if(typeof ui !== 'undefined' && ui.toast) ui.toast('저장에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.');
      return false;
    }
  }

  /* ---- Roster (교사 명단) ---- */
  async getRoster(){ return (await this._readRaw()).roster; }
  async saveRoster(list){ const d=await this._readRaw(); d.roster=list; return this._writeRaw(d); }

  /* ---- Settings (환경설정) ---- */
  async getSettings(){ return (await this._readRaw()).settings; }
  async saveSettings(patch){ const d=await this._readRaw(); d.settings={...d.settings, ...patch}; return this._writeRaw(d); }

  /* ---- Evaluators (평가자 목록) ---- */
  async getEvaluators(){ return (await this._readRaw()).evaluators; }
  async saveEvaluators(list){ const d=await this._readRaw(); d.evaluators=list; return this._writeRaw(d); }

  /* ---- Team config (현재 소속팀 드롭다운 목록, 관리자가 추가/삭제 가능) ---- */
  async getTeamConfig(){ return (await this._readRaw()).teamConfig; }
  async saveTeamConfig(cfg){ const d=await this._readRaw(); d.teamConfig=cfg; return this._writeRaw(d); }

  /* ---- Status config (진행상태 드롭다운 목록, 관리자가 추가/삭제 가능) ---- */
  async getStatusConfig(){ return (await this._readRaw()).statusConfig; }
  async saveStatusConfig(list){ const d=await this._readRaw(); d.statusConfig=list; return this._writeRaw(d); }

  /* ---- Training cohorts (신입 교육 일정/기수, Dashboard에서 직접 등록/수정) ---- */
  async getTrainingCohorts(){ return (await this._readRaw()).trainingCohorts; }
  async saveTrainingCohorts(list){ const d=await this._readRaw(); d.trainingCohorts=list; return this._writeRaw(d); }

  /* ---- 면접 일정 (회의실/면접관 목록은 설정 페이지, 일정 자체는 면접 일정 페이지에서 관리) ---- */
  async getInterviewRooms(){ return (await this._readRaw()).interviewRooms; }
  async saveInterviewRooms(list){ const d=await this._readRaw(); d.interviewRooms=list; return this._writeRaw(d); }
  async getInterviewers(){ return (await this._readRaw()).interviewers; }
  async saveInterviewers(list){ const d=await this._readRaw(); d.interviewers=list; return this._writeRaw(d); }
  async getInterviewSchedules(){ return (await this._readRaw()).interviewSchedules; }
  async saveInterviewSchedules(list){ const d=await this._readRaw(); d.interviewSchedules=list; return this._writeRaw(d); }

  /* ---- Teacher composite record ----
     teachers / interviews / trainings / settlements / reports 5개 컬렉션을
     하나의 교사 레코드로 합치거나(get), 다시 나누어(save) 저장합니다. */
  async getTeacherRecord(id){
    const d = await this._readRaw();
    if(!d.teachers[id]) return null;
    return composeTeacherRecord(id, d);
  }
  async getAllTeacherRecords(){
    const d = await this._readRaw();
    return Object.keys(d.teachers).map(id => composeTeacherRecord(id, d));
  }
  async saveTeacherRecord(id, fullRecord){
    const d = await this._readRaw();
    const split = splitTeacherRecord(id, fullRecord);
    d.teachers[id]    = split.teacher;
    d.interviews[id]  = split.interview;
    d.trainings[id]   = split.training;
    d.settlements[id] = split.settlement;
    d.reports[id]     = split.report;
    return this._writeRaw(d);
  }
  async deleteTeacherRecord(id){
    const d = await this._readRaw();
    delete d.teachers[id]; delete d.interviews[id]; delete d.trainings[id];
    delete d.settlements[id]; delete d.reports[id];
    const ok = await this._writeRaw(d);
    // 교사 레코드를 지울 때 첨부된 이력서 원본도 함께 정리합니다.
    try{ await this.deleteResume(id); }catch(e){ /* 무시 */ }
    return ok;
  }
  async clearAll(){ return this._writeRaw(this._defaultShape()); }

  /* ---- 이력서 PDF 원본 (Supabase Storage) ----
     기본정보 자동입력용 텍스트 추출은 브라우저에서 직접 하고(비용 없음),
     원본 PDF 파일만 서버(Storage 버킷 'resumes')에 올려서 보관합니다.
     교사 id당 파일 1개(`${id}.pdf`)이고, 업로드 메타(filename/uploadedAt/size)는
     메인 데이터(app_data)의 teacher.resumeMeta에 함께 저장됩니다. */
  async uploadResume(id, file){
    try{
      const path = `${id}.pdf`;
      const { error } = await sbClient.storage
        .from(RESUME_BUCKET)
        .upload(path, file, { upsert: true, contentType: 'application/pdf' });
      if(error) throw error;
      return { filename: file.name, uploadedAt: Date.now(), size: file.size };
    }catch(e){
      console.error('StorageService: 이력서 업로드 실패', e);
      if(typeof ui !== 'undefined' && ui.toast) ui.toast('이력서 업로드에 실패했어요.');
      return null;
    }
  }
  resumeDownloadUrl(id){
    const { data } = sbClient.storage.from(RESUME_BUCKET).getPublicUrl(`${id}.pdf`);
    return data.publicUrl;
  }
  async deleteResume(id){
    try{
      const { error } = await sbClient.storage.from(RESUME_BUCKET).remove([`${id}.pdf`]);
      return !error;
    }catch(e){
      console.error('StorageService: 이력서 삭제 실패', e);
      return false;
    }
  }

  /* ---- Raw export / import (백업 / 복원) ---- */
  async exportRawString(){
    const d = await this._readRaw();
    return JSON.stringify(d);
  }
  async importRawString(str){
    const parsed = JSON.parse(str);
    return this._writeRaw({ ...this._defaultShape(), ...parsed });
  }
}

/* ---- 교사 레코드 합치기/나누기 (StorageService 내부 전용 헬퍼) ---- */
function composeTeacherRecord(id, d){
  const teacher     = d.teachers[id];
  const interview   = d.interviews[id]  || {};
  const training    = d.trainings[id]   || {};
  const settlement  = d.settlements[id] || {};
  const report      = d.reports[id]     || {};
  return {
    id: teacher.id,
    name: teacher.name || '',
    email: teacher.email || '',
    phone: teacher.phone || '',
    birth: teacher.birth || '',
    hireDate: teacher.hireDate || '',
    /* ---- 우리 시스템 내부 관리 필드 ---- */
    currentTeam: teacher.currentTeam||'', teamLead: teacher.teamLead||'',
    job: teacher.job||'', cohortId: teacher.cohortId||'',
    referrer: teacher.referrer||'', priorCareer: teacher.priorCareer||'',
    address: teacher.address||'', education: teacher.education||'', selfIntro: teacher.selfIntro||'',
    converted: teacher.converted||'no',
    status: teacher.status||'interview', memo: teacher.memo||'',
    dismissReason: teacher.dismissReason||'',
    profileIncomplete: !!teacher.profileIncomplete,
    resumeMeta: teacher.resumeMeta || null,
    interview: { date:interview.date||'', script:interview.script||'', notes:interview.notes||[] },
    train2w: { firstRpLink:training.firstRpLink||'', selfEval:training.selfEval||'', memo:training.memo||'' },
    settle4w: { weeks: settlement.weeks || [{memo:'',feedback:'',notes:''},{memo:'',feedback:'',notes:''},{memo:'',feedback:'',notes:''},{memo:'',feedback:'',notes:''}] },
    handover: report.handover || { strengths:'', cautions:'', classLevel:'', desiredMembers:'', currentMembers:'', opinion:'' },
    scores: { interview: interview.scores||{}, train2w: training.scores||{}, settle4w: settlement.scores||{} },
    history: report.history || [],
    evaluations: report.evaluations || [],
    createdAt: teacher.createdAt,
  };
}
function splitTeacherRecord(id, t){
  return {
    teacher: { id, name:t.name, email:t.email, phone:t.phone, birth:t.birth, hireDate:t.hireDate,
      currentTeam:t.currentTeam, teamLead:t.teamLead, job:t.job, cohortId:t.cohortId,
      referrer:t.referrer, priorCareer:t.priorCareer,
      address:t.address||'', education:t.education||'', selfIntro:t.selfIntro||'', converted:t.converted||'no',
      status:t.status, memo:t.memo, dismissReason:t.dismissReason||'',
      profileIncomplete:!!t.profileIncomplete, resumeMeta:t.resumeMeta||null, createdAt:t.createdAt },
    interview: { date:t.interview.date, script:t.interview.script, notes:t.interview.notes, scores:t.scores.interview },
    training: { firstRpLink:t.train2w.firstRpLink, selfEval:t.train2w.selfEval, memo:t.train2w.memo, scores:t.scores.train2w },
    settlement: { weeks:t.settle4w.weeks, scores:t.scores.settle4w },
    report: { handover:t.handover, history:t.history, evaluations:t.evaluations },
  };
}

const storageService = new StorageService();
