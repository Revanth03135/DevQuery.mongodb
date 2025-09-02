import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  LineController,
  BarController,
  PieController,
  DoughnutController
} from 'chart.js';
import './Analytics.css';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  LineController,
  BarController,
  PieController,
  DoughnutController
);

function Analytics({ user, setUser }) {
  const [nlQueryInput, setNlQueryInput] = useState('');
  const [chartType, setChartType] = useState('line');
  const [chartInfo, setChartInfo] = useState('');
  const chartCanvasRef = useRef(null);
  const currentChartRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we're sure there's no user and we're not in a loading state
    if (!user && !localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    
    // Initialize with first sample only if we have a user
    if (user) {
      setTimeout(() => {
        setNlQueryInput('last month users');
        handleNLQuery();
      }, 200);
    }
  }, [user, navigate]);

  const destroyChart = () => {
    if (currentChartRef.current && currentChartRef.current.destroy) {
      try { 
        currentChartRef.current.destroy(); 
      } catch(e) {}
    }
    currentChartRef.current = null;
  };

  const getPalette = (type, labels) => {
    // Predefined palettes - exact match to your original
    const regionColors = ["#4F8EF7", "#43E97B", "#F7B32B", "#F76E6E", "#7D5FFF", "#00C9A7"];
    const dayColors = ["#A0C4FF", "#BDB2FF", "#FFC6FF", "#FFADAD", "#FFD6A5", "#FDFFB6", "#CAFFBF", "#9BF6FF", "#B2F7EF", "#F7F7F7"];
    const productColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#F6702C", "#C9CBCF", "#8E44AD", "#2ECC71"];
    const defaultColors = ["#4F8EF7", "#43E97B", "#F7B32B", "#F76E6E", "#7D5FFF", "#00C9A7", "#A0C4FF", "#BDB2FF", "#FFC6FF", "#FFADAD"];

    if (labels && labels.length > 0) {
      if (labels[0] && (labels[0].toLowerCase().includes('north') || labels[0].toLowerCase().includes('region'))) return regionColors;
      if (labels[0] && labels[0].toLowerCase().includes('day')) return dayColors;
      if (labels[0] && labels[0].toLowerCase().includes('product')) return productColors;
    }
    // Heuristic by chart label
    if (type && type.toLowerCase().includes('region')) return regionColors;
    if (type && type.toLowerCase().includes('day')) return dayColors;
    if (type && type.toLowerCase().includes('product')) return productColors;
    return defaultColors;
  };

  const buildFromOverview = (name, overview) => {
    // Map overview demo structure to labels/values - exact match to your original
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
  };

  const generateDemoData = (query) => {
    const lowercaseQuery = query.toLowerCase();
    
    if (lowercaseQuery.includes('last month users') || lowercaseQuery.includes('monthly')) {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        values: [45, 78, 92, 67, 89, 115],
        sql: 'SELECT month, COUNT(DISTINCT user_id) as users FROM user_activity WHERE date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY month ORDER BY month;'
      };
    } else if (lowercaseQuery.includes('sales by region') || lowercaseQuery.includes('region')) {
      return {
        labels: ['North America', 'Europe', 'Asia Pacific', 'South America'],
        values: [125000, 89000, 156000, 67000],
        sql: 'SELECT region, SUM(sales_amount) as total_sales FROM sales_data GROUP BY region ORDER BY total_sales DESC;'
      };
    } else if (lowercaseQuery.includes('top 10 products') || lowercaseQuery.includes('products')) {
      return {
        labels: ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'],
        values: [450, 380, 320, 290, 250],
        sql: 'SELECT product_name, SUM(quantity_sold) as total_sold FROM product_sales GROUP BY product_name ORDER BY total_sold DESC LIMIT 10;'
      };
    } else if (lowercaseQuery.includes('active users today') || lowercaseQuery.includes('daily')) {
      return {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        values: Array.from({length: 24}, () => Math.floor(Math.random() * 100) + 20),
        sql: 'SELECT HOUR(login_time) as hour, COUNT(DISTINCT user_id) as active_users FROM user_sessions WHERE DATE(login_time) = CURDATE() GROUP BY HOUR(login_time);'
      };
    } else {
      // Default data
      return {
        labels: ['Data 1', 'Data 2', 'Data 3', 'Data 4', 'Data 5'],
        values: [65, 59, 80, 81, 56],
        sql: 'SELECT * FROM demo_table LIMIT 5;'
      };
    }
  };

  const renderChart = (type, labels, values, options = {}) => {
    destroyChart();
    
    if (!chartCanvasRef.current) {
      console.error('Chart canvas ref not available');
      return;
    }
    
    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) {
      console.error('Canvas context not available');
      return;
    }

    // Pick palette - exact match to your original logic
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

    // Transform 'area' into line with fill - exact match to your original
    const mapType = (t) => t === 'area' ? 'line' : t;
    
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
          fill: type === 'area',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { 
            display: true,
            position: 'top'
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff'
          }
        },
        scales: type !== 'pie' && type !== 'doughnut' ? {
          x: { 
            display: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          y: { 
            display: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        } : {}
      }
    };

    try {
      currentChartRef.current = new ChartJS(ctx, cfg);
    } catch (error) {
      console.error('Error creating chart:', error);
      setChartInfo('Error creating chart: ' + error.message);
    }
  };

  const handleNLQuery = async () => {
    const input = nlQueryInput.trim();
    if (!input) return;
    
    setChartInfo('Generating SQL and fetching data...');
    
    try {
      // Simulate API call delay like in your original
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const demoData = generateDemoData(input);
      
      // Display SQL like in your original
      setChartInfo(`<b>Generated SQL:</b><div style='max-width:100%;overflow-x:auto;'><pre>${demoData.sql}</pre></div>`);
      
      // Render chart
      renderChart(chartType, demoData.labels, demoData.values, { label: input });
      
    } catch(e) {
      setChartInfo('Error: ' + (e.message || e));
    }
  };

  const handleSampleClick = (sample) => {
    setNlQueryInput(sample);
    // Auto-trigger the query like in your original
    setTimeout(() => {
      handleNLQuery();
    }, 100);
  };

  const handleRefresh = () => {
    handleNLQuery();
  };

  const handleChartTypeChange = (e) => {
    setChartType(e.target.value);
    // Auto-refresh chart with new type like in your original
    if (nlQueryInput) {
      setTimeout(() => {
        handleNLQuery();
      }, 100);
    }
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header-row">
        <h1 className="analytics-title">Analytics</h1>
        <div className="analytics-samples-card">
          <span className="analytics-samples-label">Try:</span>
          <button 
            className="sample-btn" 
            data-sample="last month users"
            onClick={() => handleSampleClick('last month users')}
          >
            last month users
          </button>
          <button 
            className="sample-btn" 
            data-sample="sales by region"
            onClick={() => handleSampleClick('sales by region')}
          >
            sales by region
          </button>
          <button 
            className="sample-btn" 
            data-sample="top 10 products"
            onClick={() => handleSampleClick('top 10 products')}
          >
            top 10 products
          </button>
          <button 
            className="sample-btn" 
            data-sample="active users today"
            onClick={() => handleSampleClick('active users today')}
          >
            active users today
          </button>
        </div>
      </div>
      
      <div className="analytics-controls-row">
        <div className="analytics-controls">
          <input 
            type="text" 
            id="nlQueryInput"
            value={nlQueryInput}
            onChange={(e) => setNlQueryInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleNLQuery()}
            placeholder="e.g. Last month users, Sales by region, Top 10 products" 
          />
          <button 
            id="nlQueryBtn" 
            className="btn btn-primary"
            onClick={handleNLQuery}
          >
            Generate
          </button>
          <button 
            id="refreshBtn" 
            className="btn"
            onClick={handleRefresh}
          >
            Refresh
          </button>
          <select 
            id="chartType"
            value={chartType}
            onChange={handleChartTypeChange}
          >
            <option value="line">Line</option>
            <option value="bar">Bar</option>
            <option value="pie">Pie</option>
            <option value="doughnut">Doughnut</option>
            <option value="area">Area</option>
          </select>
        </div>
      </div>
      
      <main className="analytics-main">
        <div className="chart-card">
          <canvas 
            id="analyticsChart" 
            ref={chartCanvasRef}
            width="900" 
            height="420"
          ></canvas>
        </div>
        <div id="chartInfo" className="chart-info">
          {chartInfo && (
            <div dangerouslySetInnerHTML={{ __html: chartInfo }} />
          )}
        </div>
      </main>
    </div>
  );
}

export default Analytics;
