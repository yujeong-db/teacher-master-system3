/* ============================================================
   Teacher Talent Management System — V2
   seed.js
   -------------------------------------------------------------
   [2026-08 업데이트] 데이터가 이제 모두가 함께 보는 서버(Supabase)에
   저장되기 때문에, 예전처럼 "비어있으면 더미 데이터를 자동 생성"하는
   동작을 그대로 두면 누군가 처음 접속하는 순간 가짜 시연용 교사 9명이
   실제 운영 데이터에 섞여 들어가 버립니다. 실제 운영 중인 시스템이므로
   자동 더미 데이터 생성은 꺼두고, seeded 플래그만 기록해 넘어갑니다.
   (더미 데이터 생성 코드는 참고용으로 _createDemoSeedData()에만 남겨두고
   더 이상 자동으로 호출하지 않습니다.)
============================================================ */
async function seedIfEmpty(){
  const settings = await storageService.getSettings();
  if(settings.seeded) return;
  await storageService.saveSettings({ seeded:true });
}

// 참고용 — 필요하면 콘솔에서 직접 호출해 시연용 더미 데이터를 만들 수 있습니다.
// (자동으로는 실행되지 않습니다.)
async function _createDemoSeedData(){
  const evaluators = [
    { id:'E1', name:'슬비' }, { id:'E2', name:'지혜' }, { id:'E3', name:'민지' }, { id:'E4', name:'수연' },
  ];
  await storageService.saveEvaluators(evaluators);
  await storageService.saveSettings({ seeded:true, evaluatorId:'E1' });

  const mk = (basicInfo, status, opts={})=>({ basicInfo, status, ...opts });
  const seeds = [
    mk({name:'곽연순', email:'kwak01@example.com', phone:'010-1111-2001', hireDate:'2026-03-01'}, 'placed',
      {currentTeam:'C5',teamLead:'민지쌤',daysAgo:60,
      iv:{envReady:5,content:5,voice:5,gesture:5,material:5},
      tr:{contentTest:5,systemSkill:4,coaching:5,communication:5,participation:5,taskUnderstand:4},
      se:{memberMgmt:5,featureIntro:5,problemSolving:4,classDesign:5,taskUnderstand2:5,contentUse:5}}),
    mk({name:'한라현', email:'han02@example.com', phone:'010-1111-2002', hireDate:'2026-03-05'}, 'placed',
      {currentTeam:'C8',teamLead:'서연쌤',daysAgo:52,
      iv:{envReady:4,content:4,voice:4,gesture:4,material:4},
      tr:{contentTest:4,systemSkill:4,coaching:4,communication:4,participation:4,taskUnderstand:4},
      se:{memberMgmt:4,featureIntro:4,problemSolving:4,classDesign:4,taskUnderstand2:4,contentUse:4}}),
    mk({name:'김나리', email:'kim03@example.com', phone:'010-1111-2003', hireDate:'2026-04-01'}, 'placed',
      {currentTeam:'C3',teamLead:'하은쌤',daysAgo:20,
      iv:{envReady:5,content:4,voice:5,gesture:4,material:4},
      tr:{contentTest:5,systemSkill:4,coaching:4,communication:5,participation:4,taskUnderstand:4},
      se:{memberMgmt:4,featureIntro:4,problemSolving:4,classDesign:5,taskUnderstand2:4,contentUse:5}}),
    mk({name:'강선아', email:'kang04@example.com', phone:'010-1111-2004', hireDate:'2026-04-25'}, 'training4w',
      {currentTeam:'CNE1',daysAgo:16,
      iv:{envReady:4,content:4,voice:4,gesture:3,material:4},
      tr:{contentTest:4,systemSkill:3,coaching:4,communication:4,participation:5,taskUnderstand:4},
      se:{memberMgmt:4,featureIntro:3,problemSolving:4,classDesign:4,taskUnderstand2:4,contentUse:4}}),
    mk({name:'오채린', email:'oh05@example.com', phone:'010-1111-2005', hireDate:'2026-04-26'}, 'training4w',
      {currentTeam:'CN1',daysAgo:15,
      iv:{envReady:5,content:4,voice:4,gesture:4,material:5},
      tr:{contentTest:5,systemSkill:4,coaching:5,communication:4,participation:5,taskUnderstand:5},
      se:{memberMgmt:5,featureIntro:4,problemSolving:4,classDesign:5,taskUnderstand2:4,contentUse:5}}),
    mk({name:'신민경', email:'shin06@example.com', phone:'010-1111-2006', hireDate:'2026-05-16'}, 'training2w',
      {currentTeam:'CNE1',daysAgo:8,
      iv:{envReady:4,content:3,voice:4,gesture:3,material:4},
      tr:{contentTest:3,systemSkill:3,coaching:4,communication:4,participation:4,taskUnderstand:3}}),
    mk({name:'윤소율', email:'yoon07@example.com', phone:'010-1111-2007', hireDate:'2026-05-18'}, 'training2w',
      {currentTeam:'CN1',daysAgo:6,
      iv:{envReady:3,content:4,voice:3,gesture:4,material:3},
      tr:{contentTest:4,systemSkill:3,coaching:3,communication:4,participation:4,taskUnderstand:3}}),
    mk({name:'배지우', email:'bae08@example.com', phone:'010-1111-2008', hireDate:'2026-05-20'}, 'training2w',
      {currentTeam:'CNE1',daysAgo:4,
      iv:{envReady:4,content:4,voice:4,gesture:4,material:4}}),
    mk({name:'이민정', email:'lee09@example.com', phone:'010-1111-2009', hireDate:'2026-05-22'}, 'interview',
      {daysAgo:2, iv:{}}),
  ];

  const roster = [];
  for(const s of seeds){
    const id = TeacherService.uid();
    const internal = TeacherService.blankInternal(id, s.basicInfo);
    internal.status = s.status;
    internal.currentTeam = s.currentTeam||''; internal.teamLead = s.teamLead||'';
    internal.createdAt = Date.now() - (s.daysAgo||0)*86400000;
    internal.scores.interview = s.iv||{};
    internal.scores.train2w = s.tr||{};
    internal.scores.settle4w = s.se||{};
    roster.push({ id, name: s.basicInfo.name, createdAt: internal.createdAt });
    await storageService.saveTeacherRecord(id, internal);
  }
  await storageService.saveRoster(roster);
}
