import { useState, useEffect, useRef } from 'react';
import { Clock, Search } from 'lucide-react';
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

// Default queries (fallback if no DB connection)
const DEFAULT_QUERIES = [
  { label: 'Query history trends', value: 'query history analytics' },
  { label: 'Schema statistics', value: 'table count and schema stats' },
  { label: 'Column types', value: 'column type distribution' },
  { label: 'Saved queries', value: 'show my saved queries' }
];

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
  const [connections, setConnections] = useState([]);
  const [dbConnection, setDbConnection] = useState(null);
  const [suggestedQueries, setSuggestedQueries] = useState(DEFAULT_QUERIES);
  const [schemaData, setSchemaData] = useState([]);
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

  // Fetch database connections on mount
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await api.get('/api/database/connections');
        if (response.data && response.data.data) {
          const conns = response.data.data;
          setConnections(conns);
          // Set the first connection as active, or find one marked as active
          const activeConn = conns.find(c => c.isActive) || conns[0];
          if (activeConn) {
            setDbConnection(activeConn);
            // Fetch schema to generate relevant queries
            fetchSchemaAndGenerateSuggestions(activeConn.connectionId);
          }
        }
      } catch (error) {
        console.error('Failed to fetch connections:', error);
      }
    };

    if (user) {
      fetchConnections();
    }
  }, [user]);

  // Fetch schema and generate smart query suggestions based on actual tables
  const fetchSchemaAndGenerateSuggestions = async (connectionId) => {
    try {
      const response = await api.get(`/api/database/connections/${connectionId}/schema`);
      if (response.data && response.data.schema) {
        const tables = response.data.schema;
        setSchemaData(tables);
        
        // Generate smart query suggestions based on actual table names
        const suggestions = generateSmartSuggestions(tables);
        setSuggestedQueries(suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch schema for suggestions:', error);
      // Keep default queries on error
    }
  };

  // Generate intelligent query suggestions based on database schema
  const generateSmartSuggestions = (tables) => {
    const suggestions = [];
    
    // Always include meta-analytics
    suggestions.push({ label: 'Query history trends', value: 'query history analytics' });
    suggestions.push({ label: 'Schema statistics', value: 'table count and schema stats' });
    
    // Analyze table names to suggest relevant queries
    const tableNames = tables.map(t => (t.table_name || t.name || '').toLowerCase());
    
    // Check for common patterns and suggest queries
    if (tableNames.some(name => name.includes('user') || name.includes('customer') || name.includes('account'))) {
      const userTable = tableNames.find(name => name.includes('user') || name.includes('customer') || name.includes('account'));
      suggestions.push({ 
        label: `User growth trends`, 
        value: `show growth trend of ${userTable} over time` 
      });
      suggestions.push({ 
        label: `Total users count`, 
        value: `count total number of records in ${userTable}` 
      });
    }
    
    if (tableNames.some(name => name.includes('order') || name.includes('sale') || name.includes('transaction'))) {
      const orderTable = tableNames.find(name => name.includes('order') || name.includes('sale') || name.includes('transaction'));
      suggestions.push({ 
        label: `Recent orders/sales`, 
        value: `show ${orderTable} from last 30 days` 
      });
      suggestions.push({ 
        label: `Sales trends`, 
        value: `analyze ${orderTable} by month` 
      });
    }
    
    if (tableNames.some(name => name.includes('product') || name.includes('item') || name.includes('inventory'))) {
      const productTable = tableNames.find(name => name.includes('product') || name.includes('item') || name.includes('inventory'));
      suggestions.push({ 
        label: `Top products`, 
        value: `show most popular items from ${productTable}` 
      });
    }
    
    if (tableNames.some(name => name.includes('event') || name.includes('log') || name.includes('activity'))) {
      const eventTable = tableNames.find(name => name.includes('event') || name.includes('log') || name.includes('activity'));
      suggestions.push({ 
        label: `Recent activity`, 
        value: `show latest ${eventTable}` 
      });
    }
    
    if (tableNames.some(name => name.includes('employee') || name.includes('staff') || name.includes('worker'))) {
      const empTable = tableNames.find(name => name.includes('employee') || name.includes('staff') || name.includes('worker'));
      suggestions.push({ 
        label: `Employee statistics`, 
        value: `analyze ${empTable} distribution` 
      });
    }

    // Add generic table analysis if we have tables
    if (tables.length > 0) {
      const largestTable = tables.reduce((prev, current) => 
        ((current.columns || []).length > (prev.columns || []).length) ? current : prev
      );
      const tableName = largestTable.table_name || largestTable.name;
      
      suggestions.push({ 
        label: `Analyze ${tableName}`, 
        value: `show distribution of data in ${tableName}` 
      });
    }
    
    // Column type distribution
    suggestions.push({ label: 'Column types', value: 'column type distribution' });
    
    // Limit to 8 suggestions max
    return suggestions.slice(0, 8);
  };

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
    
    console.log('🔍 Analytics Query Debug:', {
      query: input,
      connectionId: dbConnection?.connectionId,
      hasConnection: !!dbConnection,
      connectionDetails: dbConnection
    });
    
    try {
      // Get query history and saved queries from localStorage
      const queryHistory = localStorage.getItem('queryHistory') || '[]';
      const savedQueries = localStorage.getItem('savedQueries') || '[]';
      
      // Call the real analytics API
      const response = await api.post('/api/analytics/nlquery', {
        query: input,
        connectionId: dbConnection?.connectionId,
        queryHistory,
        savedQueries
      });
      
      console.log('📊 Analytics Response:', response.data);
      
      const { sql, chart, useRealData } = response.data;
      
      // Display SQL with indicator if using real data
      const dataSource = useRealData ? '<span style="color:#43E97B;">[Real Data]</span>' : '<span style="color:#FFA500;">[Sample Data]</span>';
      
      // Show warning for demo data
      const warningMessage = !useRealData 
        ? '<div style="background:rgba(245,158,11,0.1);border-left:3px solid #f59e0b;padding:8px 12px;margin:8px 0;border-radius:4px;color:#92400e;font-size:0.875rem;">⚠️ Using demo data. Connect to your database for real analytics.</div>'
        : '';
      
      setChartInfo(`${dataSource} ${warningMessage}<b>Generated SQL:</b><div style='max-width:100%;overflow-x:auto;'><pre>${sql || 'N/A'}</pre></div>`);
      
      // Use chart data from backend
      if (chart && chart.labels && chart.values) {
        // ALWAYS use user's selected chart type - don't let backend override it
        // Backend's chartType is just a suggestion, user has final say
        const effectiveChartType = chartType; // Use user selection, ignore backend suggestion
        
        console.log('📊 Chart rendering:', { userSelectedType: chartType, backendSuggestion: chart.chartType, using: effectiveChartType });
        
        // Render primary chart
        renderChart(effectiveChartType, chart.labels, chart.values, { label: chart.title || input });

        // Compute metrics from primary values
        if (chart.values && chart.values.length) {
          const min = Math.min(...chart.values);
          const max = Math.max(...chart.values);
          const mean = chart.values.reduce((a,b)=>a+b,0) / chart.values.length;
          setMetrics({ min, max, mean: Number(mean.toFixed(2)), lastUpdated: new Date().toLocaleString() });
        }

        // Update 3D chart if enabled
        if (use3D) initThree(chart.values, chart.labels);
      } else {
        // Fallback to demo data if backend doesn't return chart
        const demoData = generateDemoData(input);
        renderChart(chartType, demoData.labels, demoData.values, { label: input });
        
        if (demoData.values && demoData.values.length) {
          const min = Math.min(...demoData.values);
          const max = Math.max(...demoData.values);
          const mean = demoData.values.reduce((a,b)=>a+b,0) / demoData.values.length;
          setMetrics({ min, max, mean: Number(mean.toFixed(2)), lastUpdated: new Date().toLocaleString() });
        }
        
        if (use3D) initThree(demoData.values, demoData.labels);
      }
      
    } catch(error) {
      console.error('Analytics query error:', error);
      // Fallback to demo data on error
      const demoData = generateDemoData(input);
      
      const errorReason = dbConnection 
        ? 'Connection lost or AI error. Check console for details.'
        : 'No database connected';
      
      const errorWarning = `<div style="background:rgba(220,38,38,0.1);border-left:3px solid #dc2626;padding:8px 12px;margin:8px 0;border-radius:4px;color:#991b1b;font-size:0.875rem;">❌ ${errorReason}</div>`;
      
      setChartInfo(`<span style="color:#FFA500;">[Demo Data - API Error]</span> ${errorWarning}<b>Generated SQL:</b><div style='max-width:100%;overflow-x:auto;'><pre>${demoData.sql}</pre></div>`);
      renderChart(chartType, demoData.labels, demoData.values, { label: input });
      
      if (demoData.values && demoData.values.length) {
        const min = Math.min(...demoData.values);
        const max = Math.max(...demoData.values);
        const mean = demoData.values.reduce((a,b)=>a+b,0) / demoData.values.length;
        setMetrics({ min, max, mean: Number(mean.toFixed(2)), lastUpdated: new Date().toLocaleString() });
      }
      
      if (use3D) initThree(demoData.values, demoData.labels);
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

  const lastUpdatedLabel = metrics.lastUpdated || '—';

  return (
    <div className="analytics-page">
      {/* Connection Status Indicator */}
      <div className="analytics-connection-status">
        {dbConnection ? (
          <div className="connection-status-badge status-connected">
            <span className="status-icon">✓</span>
            <span className="status-text">
              Connected to <strong>{dbConnection.database}</strong> ({dbConnection.type || dbConnection.dbType})
            </span>
          </div>
        ) : (
          <div className="connection-status-badge status-disconnected">
            <span className="status-icon">⚠</span>
            <span className="status-text">
              No database connected - 
              <button 
                className="status-link" 
                onClick={() => navigate('/dashboard')}
              >
                Connect now
              </button>
            </span>
          </div>
        )}
      </div>

      <section className="analytics-hero">
        <div className="analytics-hero__content">
          <div className="hero-copy">
            <span className="hero-eyebrow">Insights workspace</span>
            <h1>Analytics Control Center</h1>
            <p>Ask questions in natural language and watch them turn into beautiful, interactive visuals. Perfect for status meetings, deep dives, or quick checks before shipping.</p>
            <div className="hero-actions">
              <button
                type="button"
                className="btn hero-btn"
                onClick={() => {
                  if (nlQueryInput.trim()) {
                    handleNLQuery();
                  } else {
                    handleSampleClick('last month users');
                  }
                }}
              >
                Generate latest insight
              </button>
              <div className="hero-metric">
                <Clock size={16} />
                <span>{lastUpdatedLabel === '—' ? 'Not run yet' : `Updated ${lastUpdatedLabel}`}</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            {/* Decorative background only */}
          </div>
        </div>
        <div className="analytics-chip-group">
          <span className="chip-label">Popular queries</span>
          <div className="chip-tray">
            {suggestedQueries.map((sample) => (
              <button
                key={sample.value}
                type="button"
                className="chip"
                onClick={() => handleSampleClick(sample.value)}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="analytics-toolbar">
        <div className="toolbar-input">
          <label htmlFor="nlQueryInput" className="sr-only">Describe your insight</label>
          <div className="input-shell">
            <Search size={16} />
            <input
              type="text"
              id="nlQueryInput"
              value={nlQueryInput}
              onChange={(e) => setNlQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNLQuery()}
              placeholder="E.g. Monthly retention by plan, Revenue by region, Active users today"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNLQuery}
            >
              Generate
            </button>
          </div>
        </div>
        <div className="toolbar-controls">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleRefresh}
          >
            Refresh insight
          </button>
          <div className="control-select">
            <label htmlFor="chartType">Chart</label>
            <select id="chartType" value={chartType} onChange={handleChartTypeChange}>
              <option value="line">Line</option>
              <option value="bar">Bar</option>
              <option value="pie">Pie</option>
              <option value="doughnut">Doughnut</option>
              <option value="area">Area</option>
            </select>
          </div>
          <div className="control-select">
            <label htmlFor="threeType">3D mode</label>
            <div className="toggle-stack">
              <label className="switch">
                <input type="checkbox" checked={use3D} onChange={handle3DToggle} />
                <span className="slider" />
              </label>
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
      </section>

      <section className={`analytics-charts ${use3D ? 'with-3d' : ''}`}>
        <div className="chart-card primary">
          <canvas id="analyticsChart" ref={chartCanvasRef}></canvas>
        </div>
        {use3D && (
          <div className="chart-card secondary">
            <div className="three-container" ref={threeContainerRef} />
            {hover.visible && (
              <div className="three-tooltip" style={{ left: hover.x + 12, top: hover.y + 12 }}>
                {hover.text}
              </div>
            )}
          </div>
        )}
      </section>

      <section id="chartInfo" className="analytics-footnote">
        {chartInfo ? (
          <div className="footnote-card" dangerouslySetInnerHTML={{ __html: chartInfo }} />
        ) : (
          <div className="footnote-card placeholder">
            <p>Generate an insight to preview the SQL we used behind the scenes.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Analytics;
