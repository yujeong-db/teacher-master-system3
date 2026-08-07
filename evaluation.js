/* ============================================================
   Teacher Talent Management System — V2
   evaluation.js
   -------------------------------------------------------------
   평가자(Evaluator) 등록/선택과, 별점 채점을 평가 기록(evaluations)에
   반영하는 로직을 담당합니다. 평가자 목록과 현재 선택된 평가자는
   StorageService를 통해 LocalStorage에 저장되어 새로고침 후에도
   유지됩니다.
============================================================ */
class EvaluationService {
  /* ---- 평가자 목록 ---- */
  async listEvaluators(){ return storageService.getEvaluators(); }

  async addEvaluator(name){
    const evaluators = await storageService.getEvaluators();
    const id = 'E' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
    evaluators.push({ id, name });
    await storageService.saveEvaluators(evaluators);
    await this.setCurrentEvaluatorId(id);
    return { id, name };
  }

  async removeEvaluator(id){
    const evaluators = await storageService.getEvaluators();
    await storageService.saveEvaluators(evaluators.filter(e=>e.id!==id));
    const currentId = await this.getCurrentEvaluatorId();
    if(currentId===id) await this.setCurrentEvaluatorId('');
  }

  /* ---- 현재 선택된 평가자 ---- */
  async getCurrentEvaluatorId(){
    const settings = await storageService.getSettings();
    return settings.evaluatorId || '';
  }
  async setCurrentEvaluatorId(id){ return storageService.saveSettings({ evaluatorId: id }); }
  async getCurrentEvaluatorName(){
    const [settings, evaluators] = await Promise.all([storageService.getSettings(), storageService.getEvaluators()]);
    return (evaluators.find(e=>e.id===settings.evaluatorId) || {}).name || '미지정';
  }

  /* ---- 평가 기록 ----
     별점 채점을 평가 기록(evaluations)에 반영합니다. 같은 항목(section+key)을
     다시 채점하면 새 기록을 쌓지 않고, 그 항목의 점수·평가자·수정일(updatedAt)만
     갱신합니다. 최초 평가일(ts)은 그대로 보존되어 "평가자/평가일/수정일"이
     항목별로 자동 기록됩니다. record 자체를 변형(mutate)하고 반환하며,
     실제 영속화(StorageService.saveTeacherRecord)는 호출부에서 수행합니다. */
  async recordScore(record, section, key, label, value){
    if(!record.scores[section]) record.scores[section] = {};
    record.scores[section][key] = Number(value);

    const evaluatorName = await this.getCurrentEvaluatorName();
    if(!record.evaluations) record.evaluations = [];
    const now = Date.now();
    const existing = record.evaluations.find(e=>e.section===section && e.key===key);
    if(existing){
      existing.score = Number(value);
      existing.evaluator = evaluatorName;
      existing.updatedAt = now;
    } else {
      record.evaluations.push({ section, key, category:label, evaluator:evaluatorName, score:Number(value), ts:now, updatedAt:now });
    }
    return record;
  }

  /* ---- 평가 기록 조회 (최근 수정 순) ---- */
  getSortedLogs(record){
    return (record.evaluations || []).slice().sort((a,b)=>(b.updatedAt||b.ts) - (a.updatedAt||a.ts));
  }
}

const evaluationService = new EvaluationService();
