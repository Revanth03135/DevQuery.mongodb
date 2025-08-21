// Demo: Accept NL query, return SQL, columns, rows, and chart data
const nlQuery = async (req, res) => {
	const { query } = req.body || {};
	if (!query) return res.status(400).json({ message: 'query required' });

	// Demo: parse query and return canned SQL and results
	// In real use, call LLM and run SQL on connected DB
	let sql, columns, rows, chart;
	if (/sales.*region/i.test(query)) {
		sql = 'SELECT region, SUM(sales) as total_sales FROM orders WHERE order_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH) GROUP BY region';
		columns = ['region', 'total_sales'];
		rows = [
			{ region: 'North', total_sales: 12000 },
			{ region: 'South', total_sales: 9500 },
			{ region: 'East', total_sales: 7800 },
			{ region: 'West', total_sales: 6700 }
		];
		chart = {
			labels: rows.map(r=>r.region),
			values: rows.map(r=>r.total_sales)
		};
	} else if (/users.*last month|last month users|monthly users|signups.*last month/i.test(query)) {
		sql = 'SELECT DAY(created_at) as day, COUNT(*) as signups FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) GROUP BY day';
		columns = ['day', 'signups'];
		rows = Array.from({length:30}, (_,i)=>({ day: i+1, signups: Math.floor(Math.random()*20+5) }));
		chart = {
			labels: rows.map(r=>`Day ${r.day}`),
			values: rows.map(r=>r.signups)
		};
	} else if (/top.*products/i.test(query)) {
		sql = 'SELECT name, SUM(sales) as total_sales FROM products GROUP BY name ORDER BY total_sales DESC LIMIT 10';
		columns = ['name', 'total_sales'];
		rows = [
			{ name: 'Product A', total_sales: 3200 },
			{ name: 'Product B', total_sales: 2900 },
			{ name: 'Product C', total_sales: 2700 },
			{ name: 'Product D', total_sales: 2500 },
			{ name: 'Product E', total_sales: 2300 },
			{ name: 'Product F', total_sales: 2100 },
			{ name: 'Product G', total_sales: 1900 },
			{ name: 'Product H', total_sales: 1700 },
			{ name: 'Product I', total_sales: 1500 },
			{ name: 'Product J', total_sales: 1300 }
		];
		chart = {
			labels: rows.map(r=>r.name),
			values: rows.map(r=>r.total_sales)
		};
	} else if (/active.*users.*today/i.test(query)) {
		sql = 'SELECT HOUR(created_at) as hour, COUNT(*) as active_users FROM users WHERE created_at >= CURDATE() GROUP BY hour';
		columns = ['hour', 'active_users'];
		rows = Array.from({length:24}, (_,i)=>({ hour: i, active_users: Math.floor(Math.random()*10+1) }));
		chart = {
			labels: rows.map(r=>`Hour ${r.hour}`),
			values: rows.map(r=>r.active_users)
		};
	} else {
		sql = 'SELECT * FROM users LIMIT 10';
		columns = ['id','name','email'];
		rows = [
			{ id: 1, name: 'Alice', email: 'alice@example.com' },
			{ id: 2, name: 'Bob', email: 'bob@example.com' }
		];
		chart = {
			labels: rows.map(r=>r.name),
			values: rows.map(r=>r.id)
		};
	}
	res.json({ sql, columns, rows, chart });
};
const getOverview = async (req, res) => {
	// Return richer in-memory analytics for demo
	const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	const monthly_signups = [12,18,25,22,30,28,35,40,38,45,50,48];
	const revenue_monthly = [1200,1500,1700,1600,1800,2100,2300,2500,2400,2600,2800,3000];
	const regions = [
		{ name: 'North', count: 420 },
		{ name: 'South', count: 312 },
		{ name: 'East', count: 210 },
		{ name: 'West', count: 150 }
	];

	// Daily active demo for 30 days
	const daily = {
		labels: Array.from({length:30}, (_,i)=>`Day ${i+1}`),
		values: Array.from({length:30}, ()=>Math.floor(50 + Math.random()*300))
	};

	res.json({
		users: 12420,
		active_users: 834,
		months,
		monthly_signups,
		revenue_monthly,
		regions,
		daily
	});
};

// Accept a simple metric query and return chart-ready labels/values
const queryMetric = async (req, res) => {
	const { metric } = req.body || {};

	// Demo mapping
	if (!metric) return res.status(400).json({ message: 'metric required' });

	const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

	switch(metric){
		case 'monthly_signups':
			return res.json({ labels: months, values: [12,18,25,22,30,28,35,40,38,45,50,48] });
		case 'daily_active':
			return res.json({ labels: Array.from({length:30}, (_,i)=>`Day ${i+1}`), values: Array.from({length:30}, ()=>Math.floor(50 + Math.random()*300)) });
		case 'region_breakdown':
			return res.json({ labels: ['North','South','East','West'], values: [420,312,210,150] });
		case 'revenue_monthly':
			return res.json({ labels: months, values: [1200,1500,1700,1600,1800,2100,2300,2500,2400,2600,2800,3000] });
		default:
			return res.status(400).json({ message: 'unknown metric' });
	}
};

module.exports = { getOverview, queryMetric, nlQuery };
