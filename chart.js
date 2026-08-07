/* ============================================================
   Teacher Talent Management System — V2
   chart.js
   -------------------------------------------------------------
   Chart.js 인스턴스 생성/파괴를 공통화합니다. 페이지 재렌더링 시
   차트 인스턴스가 누적(leak)되지 않도록 registry로 관리합니다.
============================================================ */
class ChartService {
  constructor(){ this.registry = {}; }
  destroyAll(){
    Object.values(this.registry).forEach(c=>{ try{ c.destroy(); }catch(e){} });
    this.registry = {};
  }
  _themeColors(){
    const dark = document.body.getAttribute('data-theme')==='dark';
    return { grid: dark ? 'rgba(255,255,255,.06)' : '#EEF0F5', tick: dark ? '#9298A8' : '#6B7180' };
  }
  lineChart(key, ctx, labels, values, color){
    if(!ctx) return;
    const { grid, tick } = this._themeColors();
    this.registry[key] = new Chart(ctx, {
      type:'line',
      data:{ labels, datasets:[{
        data: values, borderColor: color, backgroundColor: color+'22',
        fill:true, tension:.35, pointRadius:5, pointBackgroundColor: color, spanGaps:true,
      }]},
      options:{
        responsive:true, maintainAspectRatio:false,
        animation:{ duration:700, easing:'easeOutQuart' },
        scales:{
          y:{ min:0, max:5, ticks:{ stepSize:1, color: tick }, grid:{ color: grid } },
          x:{ ticks:{ color: tick }, grid:{ display:false } },
        },
        plugins:{ legend:{ display:false } },
      }
    });
  }
  barChart(key, ctx, labels, values, color){
    if(!ctx) return;
    const { grid, tick } = this._themeColors();
    this.registry[key] = new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets:[{ data: values, backgroundColor: color, borderRadius:8, barThickness:22 }]},
      options:{
        responsive:true, maintainAspectRatio:false,
        animation:{ duration:700, easing:'easeOutQuart' },
        scales:{ y:{ beginAtZero:true, ticks:{ stepSize:1, color: tick }, grid:{ color: grid } }, x:{ ticks:{ color: tick }, grid:{ display:false } } },
        plugins:{ legend:{ display:false } },
      }
    });
  }
  groupedBarChart(key, ctx, labels, datasets){
    if(!ctx) return;
    const { grid, tick } = this._themeColors();
    this.registry[key] = new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets: datasets.map(ds=>({ ...ds, borderRadius:6 })) },
      options:{
        responsive:true, maintainAspectRatio:false,
        animation:{ duration:700, easing:'easeOutQuart' },
        scales:{
          y:{ min:0, max:5, ticks:{ stepSize:1, color: tick }, grid:{ color: grid } },
          x:{ ticks:{ color: tick }, grid:{ display:false } },
        },
        plugins:{ legend:{ display:true, position:'bottom', labels:{ font:{ size:11 } } } },
      }
    });
  }
  // 카테고리 1개당 신입교육/정착교육 막대 2개짜리 소형 막대그래프 (최종리포트 카테고리별 비교용)
  categoryBarChart(key, ctx, trainVal, settleVal){
    if(!ctx) return;
    const { grid, tick } = this._themeColors();
    this.registry[key] = new Chart(ctx, {
      type:'bar',
      data:{
        labels:['신입교육','정착교육'],
        datasets:[{ data:[trainVal, settleVal], backgroundColor:['#4F7CFF','#8B6FF0'], borderRadius:8, barThickness:36 }],
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        animation:{ duration:700, easing:'easeOutQuart' },
        scales:{
          y:{ min:1, max:5, ticks:{ stepSize:1, color: tick }, grid:{ color: grid } },
          x:{ ticks:{ color: tick }, grid:{ display:false } },
        },
        plugins:{ legend:{ display:false } },
      }
    });
  }
  radarChart(key, ctx, labels, datasets){
    if(!ctx) return;
    const { tick } = this._themeColors();
    this.registry[key] = new Chart(ctx, {
      type:'radar',
      data:{ labels, datasets },
      options:{
        responsive:true, maintainAspectRatio:false,
        scales:{ r:{ min:0, max:5, ticks:{ stepSize:1, backdropColor:'transparent', color:tick }, pointLabels:{ font:{ size:10 }, color:tick } } },
        plugins:{ legend:{ position:'bottom', labels:{ font:{ size:11 } } } },
      }
    });
  }
}
const chartService = new ChartService();
