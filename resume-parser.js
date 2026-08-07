/* ============================================================
   Teacher Talent Management System — V2
   resume-parser.js
   -------------------------------------------------------------
   이력서(입사지원서) PDF를 브라우저에서 직접 읽어(pdf.js) 텍스트와
   1페이지의 글자 크기·위치 정보를 함께 추출하고, 정규식/레이아웃
   기반 추정으로 아래 항목을 채웁니다.

     이름, 이메일, 전화번호, 생년월일, 현주소, 학력사항(대학+학과),
     경력사항(회사명), 자기소개, 추천인, 직무(지원분야 매핑)

   "인적사항 / 학력사항 / 직장경력(경력사항) / 지원분야 / 추가질문"
   라벨을 쓰는 표준 입사지원서 양식을 기준으로 정규식을 짰습니다.
   양식이 다르면 인식률이 떨어질 수 있어, 자동으로 채운 값은 항상
   사람이 확인하도록 안내합니다.

   외부 AI API를 호출하지 않는 무료 방식이라 서버 비용이나 API 키
   설정이 필요 없습니다.
============================================================ */
const PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.269/build/pdf.mjs';
const PDFJS_WORKER_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.269/build/pdf.worker.mjs';
let _pdfjsLibPromise = null;
function loadPdfjsLib(){
  if(!_pdfjsLibPromise){
    _pdfjsLibPromise = import(PDFJS_CDN).then(mod=>{
      mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      return mod;
    }).catch(err=>{
      _pdfjsLibPromise = null; // 실패하면 다음 시도 때 다시 불러오도록 리셋
      throw err;
    });
  }
  return _pdfjsLibPromise;
}

// 이름으로 인식하면 안 되는 흔한 문서 제목들 (상단에 가장 큰 글자로 찍혀 있는 경우가 많음)
const NAME_BLACKLIST = [
  '이력서','자기소개서','입사지원서','지원서','포트폴리오','인적사항','프로필',
  'RESUME','PROFILE','CV','CURRICULUMVITAE',
];

// 섹션 라벨들 — 학력사항/경력사항 블록을 잘라낼 때 "여기서부터는 다음 섹션"이라고
// 판단하는 기준으로 씁니다.
// 주의: "어학"만 넣으면 "어학원"(회사/기관 이름 접미어)에도 걸려버리므로
// 반드시 "어학능력"처럼 실제 섹션 제목에만 매칭되는 형태로 씁니다.
const SECTION_STOP_AFTER_EDUCATION = /(경력사항|직장경력|자격증|어학\s*능력|수상경력|자기소개서|지원동기|추가질문|지원\s*분야)/;
const SECTION_STOP_AFTER_CAREER = /(자격증|어학\s*능력|수상경력|자기소개서|지원동기|추가질문|지원\s*분야|학력사항)/;

const ResumeParser = {
  /* ---- PDF -> 순수 텍스트 (전체 페이지) ----
     content.items의 hasEOL(줄바꿈 여부) 정보를 살려서 실제 줄바꿈을
     텍스트에 그대로 넣습니다. 이게 없으면 한 페이지 전체가 공백으로만
     이어진 한 줄이 되어버려서, "현주소"처럼 줄 단위로 값을 잘라내는
     정규식들이 엉뚱하게 너무 많은 텍스트를 캡처하게 됩니다. */
  async extractText(file){
    const pdfjsLib = await ResumeParser._loadLibOrThrow();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    for(let i=1; i<=pdf.numPages; i++){
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let pageText = '';
      content.items.forEach(it=>{
        pageText += it.str;
        pageText += it.hasEOL ? '\n' : ' ';
      });
      text += pageText + '\n';
    }
    return text;
  },

  /* ---- 1페이지의 글자 크기/위치 정보 (이름 인식용) ---- */
  async extractFirstPageLines(file){
    const pdfjsLib = await ResumeParser._loadLibOrThrow();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items
      .filter(it=>it.str && it.str.trim())
      .map(it=>({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        fontHeight: Math.hypot(it.transform[0], it.transform[1]) || 1,
        fontName: it.fontName || '',
      }));
    return ResumeParser._groupIntoLines(items, viewport.height);
  },

  async _loadLibOrThrow(){
    try{
      return await loadPdfjsLib();
    }catch(e){
      throw new Error('PDF 라이브러리를 불러오지 못했어요. 인터넷 연결을 확인해주세요.');
    }
  },

  // 같은 줄(y좌표가 비슷한)의 글자 조각들을 하나의 줄로 합칩니다.
  _groupIntoLines(items, pageHeight){
    const sorted = items.slice().sort((a,b)=> b.y-a.y || a.x-b.x);
    const lines = [];
    for(const it of sorted){
      let line = lines.find(l => Math.abs(l.y - it.y) < Math.max(2, it.fontHeight*0.4));
      if(!line){ line = { y: it.y, items: [] }; lines.push(line); }
      line.items.push(it);
    }
    return lines.map(l=>{
      l.items.sort((a,b)=>a.x-b.x);
      return {
        text: l.items.map(i=>i.str).join(''),
        fontHeight: Math.max(...l.items.map(i=>i.fontHeight)),
        y: l.y,
        isBold: l.items.some(i=>/bold/i.test(i.fontName)),
        pageHeight,
      };
    });
  },

  /* ---- PDF 파일 -> 기본정보 필드 전체 추출 (메인 진입점) ----
     레이아웃 정보(이름 인식용)와 전체 텍스트(나머지 필드용)를 함께 뽑아
     parseFields()에 전달합니다. */
  async parse(file){
    const [text, lines] = await Promise.all([
      ResumeParser.extractText(file),
      ResumeParser.extractFirstPageLines(file).catch(()=>[]), // 레이아웃 추출 실패해도 나머지는 계속 진행
    ]);
    return ResumeParser.parseFields(text, lines);
  },

  /* ---- 텍스트(+레이아웃) -> 기본정보 필드 후보 추출 (정규식/레이아웃 기반, 최선 노력) ---- */
  parseFields(rawText, firstPageLines){
    const text = (rawText||'').replace(/\r/g,'');
    const result = {
      name:'', email:'', phone:'', birth:'', address:'', education:'',
      priorCareer:'', selfIntro:'', referrer:'', job:'', confidence:{},
    };

    const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    if(emailMatch){ result.email = emailMatch[0]; result.confidence.email = true; }

    const phoneMatch = text.match(/(01[016789])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/);
    if(phoneMatch){ result.phone = `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}`; result.confidence.phone = true; }

    const birth = ResumeParser._findBirth(text);
    if(birth){ result.birth = birth; result.confidence.birth = true; }

    // 이름 — 1순위: 1페이지에서 가장 큰(굵은) 글자, 2순위: "이름/성명" 라벨, 3순위: 문서 앞부분 추정
    const name = ResumeParser._findName(text, firstPageLines);
    if(name){ result.name = name; result.confidence.name = true; }

    const address = ResumeParser._findAddress(text);
    if(address){ result.address = address; result.confidence.address = true; }

    const education = ResumeParser._findEducation(text);
    if(education){ result.education = education; result.confidence.education = true; }

    const career = ResumeParser._findCareerCompanies(text);
    if(career){ result.priorCareer = career; result.confidence.priorCareer = true; }

    const job = ResumeParser._findJob(text);
    if(job){ result.job = job; result.confidence.job = true; }

    const selfIntro = ResumeParser._findSelfIntro(text);
    if(selfIntro){ result.selfIntro = selfIntro; result.confidence.selfIntro = true; }

    const referrer = ResumeParser._findReferrer(text);
    if(referrer){ result.referrer = referrer; result.confidence.referrer = true; }

    return result;
  },

  _findBirth(text){
    const labelWindow = (()=>{
      const m = text.match(/(생년월일|생일)\s*[:：]?\s*([^\n,]{6,20})/);
      return m ? m[2] : null;
    })();
    const candidates = [labelWindow, text].filter(Boolean);
    for(const src of candidates){
      let m = src.match(/(19|20)\d{2}[.\-\/](0?[1-9]|1[0-2])[.\-\/](0?[1-9]|[12]\d|3[01])/);
      if(m){
        const [y,mo,d] = m[0].split(/[.\-\/]/);
        return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
      }
      m = src.match(/(19|20)(\d{2})\s*년\s*(0?[1-9]|1[0-2])\s*월\s*(0?[1-9]|[12]\d|3[01])\s*일/);
      if(m){
        const y = m[1]+m[2];
        return `${y}-${m[3].padStart(2,'0')}-${m[4].padStart(2,'0')}`;
      }
      // 주민등록번호 앞 7자리 (예: 950101-1)
      m = src.match(/(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[-\s]?([1-4])\d{6}/);
      if(m){
        const century = (m[4]==='1'||m[4]==='2') ? '19' : '20';
        return `${century}${m[1]}-${m[2]}-${m[3]}`;
      }
    }
    return '';
  },

  _cleanNameCandidate(str){
    const cleaned = (str||'').replace(/[^가-힣a-zA-Z]/g,'');
    if(cleaned.length<2 || cleaned.length>10) return '';
    if(NAME_BLACKLIST.some(b=>cleaned.toUpperCase()===b.toUpperCase())) return '';
    return cleaned;
  },

  // 1순위: 1페이지 상단에서 가장 큰(굵은) 글자를 이름으로 추정합니다.
  _findName(text, firstPageLines){
    if(firstPageLines && firstPageLines.length){
      const pageHeight = firstPageLines[0].pageHeight || 0;
      // 상단 절반에 있는 줄만 후보로 두고(이름은 보통 문서 맨 위), 글자 크기가 큰 순으로 시도합니다.
      const topLines = firstPageLines.filter(l => !pageHeight || l.y > pageHeight*0.5);
      const pool = topLines.length ? topLines : firstPageLines;
      const sorted = pool.slice().sort((a,b)=> (b.fontHeight-a.fontHeight) || (b.y-a.y));
      for(const line of sorted.slice(0, 8)){
        const candidate = ResumeParser._cleanNameCandidate(line.text);
        if(candidate) return candidate;
      }
    }
    // 2순위: "이름/성명" 라벨 뒤
    let m = text.match(/(이름|성명)\s*[:：]?\s*([가-힣]{2,4})(?!\S)/);
    if(m) return m[2];
    // 3순위: 문서 앞부분(최대 400자)에서 한글 2~4자 단독 토큰을 추정으로 사용합니다.
    const head = text.slice(0, 400);
    const tokens = head.split(/\s+/).filter(Boolean);
    for(const t of tokens){
      if(/^[가-힣]{2,4}$/.test(t) && !NAME_BLACKLIST.includes(t)) return t;
    }
    return '';
  },

  // "인적사항" 아래 "현주소" 라벨 옆 텍스트를 가져옵니다.
  _findAddress(text){
    let m = text.match(/현\s*주소\s*[:：]?\s*([^\n]{4,120})/);
    if(m) return m[1].trim();
    // "현주소"라는 표현이 없으면 "이메일 주소"가 아닌 일반 "주소" 라벨을 시도합니다.
    m = text.match(/(?<!이메일\s?)(?<!메일\s?)(?<!e-?mail\s?)주\s*소\s*[:：]?\s*([^\n]{4,120})/i);
    if(m) return m[1].trim();
    return '';
  },

  // "학력사항" 섹션에서 대학교/대학원 이름과 학과만 뽑습니다.
  _findEducation(text){
    const startMatch = text.match(/학력사항/);
    if(!startMatch) return '';
    const rest = text.slice(startMatch.index + startMatch[0].length);
    const stopMatch = rest.match(SECTION_STOP_AFTER_EDUCATION);
    const block = stopMatch ? rest.slice(0, stopMatch.index) : rest.slice(0, 600);

    const uniMatch = block.match(/([가-힣A-Za-z0-9]{2,20}(?:대학교|대학원))/);
    if(!uniMatch) return '';
    // 학과 이름은 보통 "OO학과/OO교육과/OO공학과"처럼 "~과"로 끝나거나 "전공/학부/계열"로 끝납니다.
    const deptMatch = block.match(/([가-힣A-Za-z0-9·\/&]{2,20}(?:과|전공|학부|계열))/);
    return deptMatch ? `${uniMatch[1]} ${deptMatch[1]}` : uniMatch[1];
  },

  // "직장경력/경력사항" 섹션에서 회사 이름만 뽑습니다.
  _findCareerCompanies(text){
    const startMatch = text.match(/(직장경력|경력사항)/);
    if(!startMatch) return '';
    const rest = text.slice(startMatch.index + startMatch[0].length);
    const stopMatch = rest.match(SECTION_STOP_AFTER_CAREER);
    const block = stopMatch ? rest.slice(0, stopMatch.index) : rest.slice(0, 1000);
    if(!block.trim()) return '';

    // 1) "회사명" 라벨이 명시돼 있으면 전부 수집합니다.
    const labeled = [...block.matchAll(/회사명\s*[:：]?\s*([^\n,]{2,40})/g)].map(m=>m[1].trim()).filter(Boolean);
    if(labeled.length) return [...new Set(labeled)].join(', ');

    // 2) 라벨이 없으면 회사 이름처럼 보이는 표현(학원/센터/㈜ 등)을 추정으로 모읍니다.
    const guessed = [...block.matchAll(/([가-힣A-Za-z0-9&.]{1,20}(?:주식회사|㈜|\(주\)|어학원|학원|유치원|교육원|아카데미|센터))/g)]
      .map(m=>m[1].trim()).filter(Boolean);
    if(guessed.length) return [...new Set(guessed)].join(', ');

    return '';
  },

  // "지원 분야"를 시스템 직무 값으로 매핑합니다. (그룹영어교사→english, 그룹일반교사→subject)
  _findJob(text){
    const m = text.match(/지원\s*분야\s*[:：]?\s*([^\n]{2,30})/);
    const labelValue = m ? m[1] : '';
    if(/영어/.test(labelValue)) return 'english';
    if(/일반/.test(labelValue)) return 'subject';
    if(/그룹\s*영어\s*교사/.test(text)) return 'english';
    if(/그룹\s*일반\s*교사/.test(text)) return 'subject';
    return '';
  },

  // "추가질문" 안에서 자유 자기소개 답변을 찾습니다.
  _findSelfIntro(text){
    const idx = text.search(/추가질문/);
    if(idx===-1) return '';
    const block = text.slice(idx, idx+3000);
    let m = block.match(/자유롭게[^\n]{0,30}(?:자기\s*소개|본인\s*소개)[^\n]*[\n:：]?\s*([\s\S]{10,800}?)(?=\n\s*\n|추천|$)/);
    if(m) return m[1].replace(/\s{2,}/g,' ').trim();
    m = block.match(/(?:자기\s*소개|본인\s*소개)[^\n]*[\n:：]?\s*([\s\S]{10,800}?)(?=\n\s*\n|추천|$)/);
    if(m) return m[1].replace(/\s{2,}/g,' ').trim();
    return '';
  },

  // "추가질문" 안에서 추천 교사 이름을 찾습니다.
  // "추천해주신 분이 있다면..." 같은 질문 문장 자체를 이름으로 잘못 캡처하지 않도록,
  // 실제로 "이름을 적는 칸"에만 걸리게 콜론(:)이 있는 라벨-값 형태만 인정합니다.
  _findReferrer(text){
    const idx = text.search(/추가질문/);
    const scope = idx===-1 ? text : text.slice(idx, idx+3000);
    const m = scope.match(/추천\s*(?:교사|선생님|인)\s*(?:이름)?\s*[:：]\s*([가-힣]{2,4})/);
    return m ? m[1] : '';
  },
};
