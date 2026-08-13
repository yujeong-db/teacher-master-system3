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
  // 카테고리 1개당 신입교육/정착교육 세부 평가항목들을 막대로 나열하는 그래프 (최종리포트 카테고리별 비교용)
  // labels/values/colors는 같은 길이의 배열이며, 막대 위에 점수를 숫자로 표시합니다.
  // tickColors(선택): 항목별로 x축 이름 글자·막대 위 점수 글자 색을 따로 지정하고 싶을 때 같은 길이의 배열로 전달합니다.
  categoryItemsChart(key, ctx, labels, values, colors, tickColors){
    if(!ctx) return;
    const { grid, tick } = this._themeColors();
    const labelColorAt = (i)=> (tickColors && tickColors[i]) || tick;
    const valueLabelPlugin = {
      id:'valueLabel',
      afterDatasetsDraw(chart){
        const c = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((bar, i)=>{
          const v = chart.data.datasets[0].data[i];
          if(v===null || v===undefined || v===0) return;
          c.save();
          c.fillStyle = labelColorAt(i);
          c.font = '700 11px Pretendard, sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'bottom';
          c.fillText(Number(v).toFixed(1), bar.x, bar.y - 4);
          c.restore();
        });
      }
    };
    this.registry[key] = new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets:[{ data:values, backgroundColor:colors, borderRadius:6, barThickness:24 }] },
      options:{
        responsive:true, maintainAspectRatio:false,
        animation:{ duration:700, easing:'easeOutQuart' },
        layout:{ padding:{ top:16 } },
        scales:{
          y:{ min:0, max:5, ticks:{ stepSize:1, color: tick }, grid:{ color: grid } },
          x:{ ticks:{ color: (c2)=>labelColorAt(c2.index), font:{ size:10, weight:'700' }, maxRotation:55, minRotation:0 }, grid:{ display:false } },
        },
        plugins:{ legend:{ display:false } },
      },
      plugins:[valueLabelPlugin],
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
