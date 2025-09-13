import { useState, useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Activity, Clock } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
  const [metrics, setMetrics] = useState({ min: 0, max: 0, mean: 0, lastUpdated: null });
  const [use3D, setUse3D] = useState(false);
  const [threeChartType, setThreeChartType] = useState('bar'); // 'bar' | 'scatter' | 'line'
  const [hover, setHover] = useState({ visible: false, x: 0, y: 0, text: '' });
  const chartCanvasRef = useRef(null);
  const currentChartRef = useRef(null);
  const threeContainerRef = useRef(null);
  const threeStateRef = useRef({ 
    scene: null, 
    renderer: null, 
    camera: null, 
    controls: null,
    objects: [],
    raf: null, 
    onResize: null, 
    raycaster: null,
    mouse: null,
    containerRect: null,
    lastIntersect: null,
  });
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

  // THREE.js helpers
  const cleanupThree = () => {
    const s = threeStateRef.current;
    if (s.raf) cancelAnimationFrame(s.raf);
    if (s.onResize) window.removeEventListener('resize', s.onResize);
    if (s.controls) s.controls.dispose?.();
    if (s.renderer) {
      s.renderer.dispose?.();
    }
    if (s.scene) {
      // dispose materials and geometries
      s.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
    }
    threeStateRef.current = { 
      scene: null, renderer: null, camera: null, controls: null,
      objects: [], raf: null, onResize: null, raycaster: null, mouse: null, containerRect: null, lastIntersect: null
    };
    if (threeContainerRef.current) {
      threeContainerRef.current.innerHTML = '';
    }
    setHover({ visible: false, x: 0, y: 0, text: '' });
  };

  const initThree = (values = [], labels = []) => {
    cleanupThree();
    if (!threeContainerRef.current) return;

    const width = threeContainerRef.current.clientWidth || 600;
    const height = threeContainerRef.current.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f7fa);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(10, 10, 16);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeContainerRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI * 0.49;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    // Ground plane
    const planeGeo = new THREE.PlaneGeometry(20, 12);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.9 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.01;
    scene.add(plane);

    // Helpers
    const grid = new THREE.GridHelper(20, 20, 0x999999, 0xdddddd);
    grid.position.y = 0;
    scene.add(grid);
    const axes = new THREE.AxesHelper(6);
    axes.position.set(-8, 0, -5);
    scene.add(axes);

  // Build objects by chart type
    const maxVal = Math.max(1, ...values);
    const objects = [];
    if (threeChartType === 'bar') {
      const barWidth = 0.6;
      const gap = 0.3;
      const startX = -((values.length * (barWidth + gap)) / 2) + (barWidth / 2);
      values.forEach((v, i) => {
        const h = (v / maxVal) * 6 + 0.2;
        const geo = new THREE.BoxGeometry(barWidth, h, 0.6);
        const color = new THREE.Color().setHSL((i / Math.max(1, values.length)) * 0.8, 0.6, 0.55);
        const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.6 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(startX + i * (barWidth + gap), h / 2, 0);
        mesh.scale.y = 0.001; // animate up
        mesh.userData = { i, label: labels[i], value: v, type: 'bar' };
        scene.add(mesh);
        objects.push(mesh);
      });
    } else if (threeChartType === 'scatter') {
      const pointGeo = new THREE.SphereGeometry(0.15, 24, 24);
      values.forEach((v, i) => {
        const x = (i - values.length / 2) * 0.8;
        const y = (v / maxVal) * 5 + 0.2;
        const z = Math.sin(i * 0.6) * 2.5; // derived Z for demo
        const color = new THREE.Color().setHSL((i / Math.max(1, values.length)) * 0.8, 0.65, 0.55);
        const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.1, roughness: 0.5 });
        const p = new THREE.Mesh(pointGeo, mat);
        p.position.set(x, y, z);
        p.userData = { i, label: labels[i], value: v, type: 'point' };
        scene.add(p);
        objects.push(p);
      });
      // optional connection line
      const pts = values.map((v, i) => new THREE.Vector3((i - values.length / 2) * 0.8, (v / maxVal) * 5 + 0.2, Math.sin(i * 0.6) * 2.5));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x6666aa });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
    } else if (threeChartType === 'line') {
      const pts = values.map((v, i) => new THREE.Vector3((i - values.length / 2) * 0.8, (v / maxVal) * 5 + 0.2, 0));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x3366ff, linewidth: 2 });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
      // highlight points
      const pointGeo = new THREE.SphereGeometry(0.12, 16, 16);
      pts.forEach((pt, i) => {
        const color = new THREE.Color().setHSL((i / Math.max(1, values.length)) * 0.8, 0.65, 0.55);
        const mat = new THREE.MeshStandardMaterial({ color });
        const p = new THREE.Mesh(pointGeo, mat);
        p.position.copy(pt);
        p.userData = { i, label: labels[i], value: values[i], type: 'point' };
        scene.add(p);
        objects.push(p);
      });
    } else if (threeChartType === 'surface') {
      // Create a surface using a plane with vertex heights derived from values across X and sinus along Z
      const len = values.length;
      const widthX = len * 0.8; // same spacing as other charts
      const depthZ = Math.max(6, len * 0.4);
      const segX = Math.max(16, len * 2);
      const segZ = Math.max(16, Math.ceil(depthZ) * 2);
      const geo = new THREE.PlaneGeometry(widthX, depthZ, segX, segZ);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      let minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i); // [-widthX/2, widthX/2]
        const z = pos.getZ(i); // [-depthZ/2, depthZ/2]
        // map x to index in values
        const idx = Math.min(len - 1, Math.max(0, Math.round((x / 0.8) + (len / 2))));
        const base = (values[idx] / maxVal) * 5 + 0.1; // base height from values
        const wave = Math.sin((z / depthZ) * Math.PI * 2 + idx * 0.2) * 0.6; // variation along Z
        const y = base + wave;
        pos.setY(i, y);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      pos.needsUpdate = true;
      // Vertex colors based on height
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = (y - minY) / Math.max(0.0001, (maxY - minY));
        const c = new THREE.Color().setHSL(0.66 - 0.66 * t, 0.65, 0.5); // blue->green->yellow
        colors[i * 3 + 0] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, metalness: 0.1, roughness: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { type: 'surface', labels };
      scene.add(mesh);
      objects.push(mesh);
    }

    // Simple orbit-like rotation animation
    let frame = 0;
    const animate = () => {
      frame += 1;
      // grow bars only if bar chart
      if (threeChartType === 'bar') {
        objects.forEach((b) => { b.scale.y = Math.min(1, b.scale.y + 0.06); });
      }
      controls.update();
      renderer.render(scene, camera);
      threeStateRef.current.raf = requestAnimationFrame(animate);
    };
    threeStateRef.current.raf = requestAnimationFrame(animate);

    // Save state
    threeStateRef.current.scene = scene;
    threeStateRef.current.renderer = renderer;
    threeStateRef.current.camera = camera;
    threeStateRef.current.controls = controls;
    threeStateRef.current.objects = objects;

    // Handle resize
    const onResize = () => {
      if (!threeContainerRef.current) return;
      const w = threeContainerRef.current.clientWidth || width;
      const h = threeContainerRef.current.clientHeight || height;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    threeStateRef.current.onResize = onResize;

    // Hover interactivity via raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    threeStateRef.current.raycaster = raycaster;
    threeStateRef.current.mouse = mouse;

    const onMouseMove = (evt) => {
      if (!threeContainerRef.current) return;
      const rect = threeContainerRef.current.getBoundingClientRect();
      threeStateRef.current.containerRect = rect;
      mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(objects, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (threeStateRef.current.lastIntersect && threeStateRef.current.lastIntersect !== hit) {
          // reset previous
          threeStateRef.current.lastIntersect.scale.setY?.(1);
          if (threeStateRef.current.lastIntersect.material?.emissive) {
            threeStateRef.current.lastIntersect.material.emissive.setHex(0x000000);
          }
        }
        threeStateRef.current.lastIntersect = hit;
        if (hit.userData?.type === 'bar') {
          hit.scale.y = 1.08;
        }
        if (hit.material?.emissive) hit.material.emissive.setHex(0x222222);
        if (hit.userData?.type === 'surface') {
          // derive index from intersection point x
          const p = intersects[0].point;
          const len = values.length;
          const idx = Math.min(len - 1, Math.max(0, Math.round((p.x / 0.8) + (len / 2))));
          const label = labels[idx] ?? `Index ${idx}`;
          const value = values[idx] ?? 0;
          setHover({ visible: true, x: evt.clientX, y: evt.clientY, text: `${label}: ${value}` });
        } else {
          setHover({ visible: true, x: evt.clientX, y: evt.clientY, text: `${hit.userData?.label || hit.userData?.i}: ${hit.userData?.value}` });
        }
      } else {
        if (threeStateRef.current.lastIntersect) {
          threeStateRef.current.lastIntersect.scale.setY?.(1);
          if (threeStateRef.current.lastIntersect.material?.emissive) {
            threeStateRef.current.lastIntersect.material.emissive.setHex(0x000000);
          }
          threeStateRef.current.lastIntersect = null;
        }
        setHover({ visible: false, x: 0, y: 0, text: '' });
      }
    };
    const onMouseLeave = () => setHover({ visible: false, x: 0, y: 0, text: '' });
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseleave', onMouseLeave);

    // cleanup listeners in return cleanup
    const detach = () => {
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseleave', onMouseLeave);
    };
    threeStateRef.current.detach = detach;

    // cleanup on unmount
    return () => {
      window.removeEventListener('resize', onResize);
      if (threeStateRef.current.raf) cancelAnimationFrame(threeStateRef.current.raf);
      detach();
      cleanupThree();
    };
  };

  // Ensure 3D cleans up when component unmounts
  useEffect(() => {
    return () => cleanupThree();
  }, []);

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

      // Compute metrics
      if (demoData.values && demoData.values.length) {
        const min = Math.min(...demoData.values);
        const max = Math.max(...demoData.values);
        const mean = demoData.values.reduce((a,b)=>a+b,0) / demoData.values.length;
        setMetrics({ min, max, mean: Number(mean.toFixed(2)), lastUpdated: new Date().toLocaleString() });
      }

      // Update 3D chart if enabled
      if (use3D) initThree(demoData.values, demoData.labels);
      
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

  const handle3DToggle = (e) => {
    const checked = e.target.checked;
    setUse3D(checked);
    if (!checked) {
      cleanupThree();
    } else if (nlQueryInput) {
      // regenerate 3D for current data
      setTimeout(() => handleNLQuery(), 50);
    }
  };

  const handleThreeTypeChange = (e) => {
    setThreeChartType(e.target.value);
    if (use3D && nlQueryInput) {
      setTimeout(() => handleNLQuery(), 50);
    }
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header-row">
        <div className="analytics-title-wrap">
          <h1 className="analytics-title gradient-text">Analytics</h1>
          <div className="title-underline" />
        </div>
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

      {/* Animated hero band - data stream equalizer */}
      <div className="analytics-hero">
        <div className="hero-label">
          <span className="dot" /> Live Data Stream
        </div>
        <div className="equalizer">
          {Array.from({ length: 48 }).map((_, i) => (
            <span
              className="equalizer-bar"
              key={i}
              style={{ ['--delay']: `${(i % 12) * 80}ms`, ['--h']: `${30 + ((i * 17) % 60)}%` }}
            />
          ))}
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

          <div className="controls-3d">
            <label className="switch">
              <input type="checkbox" checked={use3D} onChange={handle3DToggle} />
              <span className="slider" />
            </label>
            <span className="switch-label">3D</span>
            <select 
              id="threeType"
              value={threeChartType}
              onChange={handleThreeTypeChange}
              disabled={!use3D}
            >
              <option value="bar">3D Bars</option>
              <option value="scatter">3D Scatter</option>
              <option value="line">3D Line</option>
            </select>
          </div>
        </div>
      </div>
      
      <main className="analytics-main">
        <div className="metrics-row">
          {(() => {
            const max = metrics.max || 0;
            const minPct = max ? Math.max(0, Math.min(100, (metrics.min / max) * 100)) : 0;
            const meanPct = max ? Math.max(0, Math.min(100, (metrics.mean / max) * 100)) : 0;
            const maxPct = max ? 100 : 0;
            return (
              <>
                <div className="metric-card fade-in" style={{ animationDelay: '0ms' }}>
                  <div className="metric-header">
                    <div className="metric-icon min"><ArrowDown size={18} /></div>
                    <div className="metric-label">Min</div>
                  </div>
                  <div className="metric-value">{metrics.min}</div>
                  <div className="metric-progress"><div className="metric-progress-fill" style={{ ['--w']: `${minPct}%` }} /></div>
                </div>
                <div className="metric-card fade-in" style={{ animationDelay: '60ms' }}>
                  <div className="metric-header">
                    <div className="metric-icon mean"><Activity size={18} /></div>
                    <div className="metric-label">Mean</div>
                  </div>
                  <div className="metric-value">{metrics.mean}</div>
                  <div className="metric-progress"><div className="metric-progress-fill" style={{ ['--w']: `${meanPct}%` }} /></div>
                </div>
                <div className="metric-card fade-in" style={{ animationDelay: '120ms' }}>
                  <div className="metric-header">
                    <div className="metric-icon max"><ArrowUp size={18} /></div>
                    <div className="metric-label">Max</div>
                  </div>
                  <div className="metric-value">{metrics.max}</div>
                  <div className="metric-progress"><div className="metric-progress-fill" style={{ ['--w']: `${maxPct}%` }} /></div>
                </div>
                <div className="metric-card fade-in" style={{ animationDelay: '180ms' }}>
                  <div className="metric-header">
                    <div className="metric-icon time"><Clock size={18} /></div>
                    <div className="metric-label">Last Update</div>
                  </div>
                  <div className="metric-value small">{metrics.lastUpdated || '-'}</div>
                </div>
              </>
            );
          })()}
        </div>

        <div className={`grid-2 ${use3D ? 'two-cols' : 'one-col'}`}>
          <div className="chart-card">
            <canvas 
              id="analyticsChart" 
              ref={chartCanvasRef}
            ></canvas>
          </div>
          {use3D && (
            <div className="chart-card three-card">
              <div className="three-container" ref={threeContainerRef} />
              {hover.visible && (
                <div 
                  className="three-tooltip"
                  style={{ left: hover.x + 12, top: hover.y + 12 }}
                >
                  {hover.text}
                </div>
              )}
            </div>
          )}
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
