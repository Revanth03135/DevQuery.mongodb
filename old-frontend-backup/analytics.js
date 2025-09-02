(function(){
  // Lightweight analytics frontend that talks to /api/analytics/* endpoints
  const chartCanvas = () => document.getElementById('analyticsChart');
  let currentChart = null;

  function destroyChart(){
    if (currentChart && currentChart.destroy) {
      try { currentChart.destroy(); } catch(e){}
    }
    currentChart = null;
  }

  function getPalette(type, labels) {
    // Predefined palettes
    const regionColors = ["#4F8EF7", "#43E97B", "#F7B32B", "#F76E6E", "#7D5FFF", "#00C9A7"];
    const dayColors = ["#A0C4FF", "#BDB2FF", "#FFC6FF", "#FFADAD", "#FFD6A5", "#FDFFB6", "#CAFFBF", "#9BF6FF", "#B2F7EF", "#F7F7F7"];
    const productColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#F6702C", "#C9CBCF", "#8E44AD", "#2ECC71"];
    // Fallback
    const defaultColors = ["#4F8EF7", "#43E97B", "#F7B32B", "#F76E6E", "#7D5FFF", "#00C9A7", "#A0C4FF", "#BDB2FF", "#FFC6FF", "#FFADAD"];

    if (labels && labels.length > 0) {
      if (labels[0].toLowerCase().includes('north') || labels[0].toLowerCase().includes('region')) return regionColors;
      if (labels[0].toLowerCase().includes('day')) return dayColors;
      if (labels[0].toLowerCase().includes('product')) return productColors;
    }
    // Heuristic by chart label
    if (type && type.toLowerCase().includes('region')) return regionColors;
    if (type && type.toLowerCase().includes('day')) return dayColors;
    if (type && type.toLowerCase().includes('product')) return productColors;
    return defaultColors;
  }

  function renderChart(type, labels, values, options = {}){
    destroyChart();
    const ctx = chartCanvas().getContext('2d');

    // Pick palette
    const palette = getPalette(options.label || type, labels);
    // For pie/doughnut, use all colors; for line/bar, use one main color
    let backgroundColor, borderColor;
    if (["pie","doughnut","area"].includes(type)) {
      backgroundColor = palette.slice(0, labels.length);
      borderColor = palette.slice(0, labels.length);
    } else {
      backgroundColor = palette[0] || "#4F8EF7";
      borderColor = palette[1] || "#43E97B";
    }

    // Transform 'area' into line with fill
    const mapType = (t)=> t === 'area' ? 'line' : t;
    const cfg = {
      type: mapType(type),
      data: {
        labels: labels,
        datasets: [{
          label: options.label || 'Metric',
          data: values,
          backgroundColor,
          borderColor,
          borderWidth: 2,
          fill: type === 'area'
        }]
      },
      options: {
        responsive: true,
        animation: {
          duration: 800,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: { display: true },
          y: { display: type !== 'pie' && type !== 'doughnut' }
        }
      }
    };

    // Some chart libraries expose Chart global
    if (typeof Chart === 'undefined'){
      // Fallback: render simple text
      const info = document.getElementById('chartInfo');
      info.innerText = 'Chart library not found. Data:\n' + JSON.stringify({labels, values},null,2);
      return;
    }

    currentChart = new Chart(ctx, cfg);
  }

  async function fetchOverview(){
    try{
      const data = await window.devQueryAPI.request('/analytics/overview');
      return data;
    } catch(e){
      console.warn('Overview fetch failed', e);
      return null;
    }
  }

  async function queryMetric(metric){
    try{
      const body = { metric };
      const data = await window.devQueryAPI.request('/analytics/query', { method: 'POST', body });
      return data;
    } catch(e){
      console.warn('Metric query failed', e);
      return null;
    }
  }

  function buildFromOverview(name, overview){
    // Map overview demo structure to labels/values
    if (!overview) return { labels: ['No data'], values: [0] };
    switch(name){
      case 'monthly_signups':
        return { labels: overview.months || ['Jan','Feb','Mar','Apr','May','Jun'], values: overview.monthly_signups || [2,5,10,8,6,11] };
      case 'daily_active':
        return { labels: (overview.daily && overview.daily.labels) || Array.from({length:30},(_,i)=>`D${i+1}`), values: (overview.daily && overview.daily.values) || Array.from({length:30},()=>Math.floor(Math.random()*200)) };
      case 'region_breakdown':
        return { labels: overview.regions && overview.regions.map(r=>r.name) || ['North','South','East','West'], values: overview.regions && overview.regions.map(r=>r.count) || [120,90,45,30] };
      case 'revenue_monthly':
        return { labels: overview.months || ['Jan','Feb','Mar','Apr','May','Jun'], values: overview.revenue_monthly || [1200,1500,1700,1600,1800,2100] };
      default:
        return { labels: ['x'], values: [0] };
    }
  }

  async function refresh(){
    const metric = document.getElementById('metricSelect').value;
    const chartType = document.getElementById('chartType').value;

    // Prefer a targeted query endpoint
    const resp = await queryMetric(metric);
    let labels, values;
    if (resp && resp.labels && resp.values){
      labels = resp.labels; values = resp.values;
    } else {
      const overview = await fetchOverview();
      const built = buildFromOverview(metric, overview);
      labels = built.labels; values = built.values;
    }

    renderChart(chartType, labels, values, { label: metric });
  }

  async function handleNLQuery(){
    const input = document.getElementById('nlQueryInput').value.trim();
    if (!input) return;
    const chartType = document.getElementById('chartType').value;
    const info = document.getElementById('chartInfo');
    info.innerText = 'Generating SQL and fetching data...';
    try {
      const resp = await window.devQueryAPI.request('/analytics/nlquery', {
        method: 'POST',
        body: { query: input }
      });
      // Expect resp: { sql, columns, rows, chart: { labels, values } }
      if (resp.sql) {
        info.innerHTML = `<b>Generated SQL:</b><div style='max-width:100%;overflow-x:auto;'><pre>${resp.sql}</pre></div>`;
      }
      if (resp.columns && resp.rows) {
        // Render table
        let html = `<div style='max-width:100%;overflow-x:auto;'><table><tr>` + resp.columns.map(c=>`<th>${c}</th>`).join('') + '</tr>';
        html += resp.rows.map(row => '<tr>' + resp.columns.map(c=>`<td>${row[c]}</td>`).join('') + '</tr>').join('');
        html += '</table></div>';
        info.innerHTML += html;
      }
      if (resp.chart && resp.chart.labels && resp.chart.values) {
        renderChart(chartType, resp.chart.labels, resp.chart.values, { label: input });
      }
    } catch(e){
      info.innerText = 'Error: ' + (e.message || e);
    }
  }

  function handleSampleClick(e){
    if (e.target.classList.contains('sample-btn')) {
      document.getElementById('nlQueryInput').value = e.target.dataset.sample;
      handleNLQuery();
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', handleNLQuery);

    const chartType = document.getElementById('chartType');
    chartType.addEventListener('change', handleNLQuery);

    const nlQueryBtn = document.getElementById('nlQueryBtn');
    nlQueryBtn.addEventListener('click', handleNLQuery);

  const samplesCard = document.querySelector('.analytics-samples-card');
  if (samplesCard) samplesCard.addEventListener('click', handleSampleClick);

    // Initial render: show first sample
    setTimeout(() => {
      document.getElementById('nlQueryInput').value = 'last month users';
      handleNLQuery();
    }, 200);
  });

})();
