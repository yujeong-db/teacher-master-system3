/* ============================================================
   Teacher Talent Management System — V2
   app.js
   -------------------------------------------------------------
   여러 페이지가 공유하는 사이드바 카운트 렌더링과, 현재 페이지
   (body[data-page])에 맞는 부트스트랩 함수를 호출하는 라우터입니다.
   반드시 다른 모든 서비스/페이지 스크립트보다 나중에 로드하세요.
============================================================ */
function renderNavCounts(teachers){
  const map = {
    teachers: teachers.length,
    recruit: teachers.filter(t=>t.status==='interview').length, // "채용관리" = 채용진행 중인 교사 수
    train2w: teachers.filter(t=>t.status==='training2w').length,
    train4w: teachers.filter(t=>t.status==='training4w').length,
    handover: teachers.filter(t=>t.status==='placed' && PLACED_TEAMS.includes(t.currentTeam)).length, // "인수인계" = 팀 배치 완료 + 기존팀 배치자
  };
  Object.entries(map).forEach(([key, n])=>{
    const el = document.querySelector(`.nav-count[data-nav="${key}"]`);
    if(el){ el.textContent = n; el.style.display = n>0 ? 'inline-flex' : 'none'; }
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  const page = document.body.dataset.page;
  if(page==='teachers') bootTeachersPage();
  else if(page==='teacher-detail') bootTeacherDetailPage();
  else if(page==='settings') bootSettingsPage();
  else if(page==='interviews') bootInterviewsPage();
  else bootDashboard(); // 기본값: Dashboard
});
