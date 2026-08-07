/* ============================================================
   Teacher Talent Management System — V2
   supabase-config.js
   -------------------------------------------------------------
   Supabase 프로젝트 연결 정보입니다. 아래 두 값은 "공개용(anon/
   publishable)" 키라서 브라우저 코드에 그대로 노출돼도 안전하고,
   실제 데이터 접근 범위는 Supabase 프로젝트의 RLS(행 수준 보안)
   정책으로 제어합니다.

   이 파일은 반드시 Supabase SDK(<script src=".../supabase.js">)
   보다 뒤에, storage.js보다는 앞에 로드해야 합니다.
============================================================ */
const SUPABASE_URL = 'https://kluyjedfddjvwtppszdd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JN7S5bOEg1wc1l3-hyqcUQ_Drbt8xyZ';

const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
