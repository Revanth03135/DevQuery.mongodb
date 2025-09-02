// Dashboard initialization for DevQuery
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DevQuery Dashboard loaded');
    console.log('🔗 Backend API:', window.devQueryAPI ? 'Connected' : 'Not Connected');
    
    // Test backend connection
    if (window.devQueryAPI) {
        fetch('http://localhost:5000/health')
            .then(response => response.json())
            .then(data => {
                console.log('✅ Backend connection test:', data);
                const connectionStatus = document.getElementById('connectionStatus');
                if (connectionStatus) {
                    connectionStatus.innerHTML = 
                        '<i class="fas fa-circle" style="color: green;"></i><span>Connected to Backend</span>';
                }
            })
            .catch(error => {
                console.error('❌ Backend connection failed:', error);
                const connectionStatus = document.getElementById('connectionStatus');
                if (connectionStatus) {
                    connectionStatus.innerHTML = 
                        '<i class="fas fa-circle" style="color: red;"></i><span>Backend Offline</span>';
                }
            });
    }

            // Chart.js check (CSP-safe local stub)
            if (typeof Chart === 'undefined') {
                console.warn('Chart not available: charts will not render. Consider adding Chart.js to static/chart.umd.js');
            } else if (Chart && Chart.prototype && Chart.prototype.update && Chart.prototype.destroy) {
                console.info('Chart is available (may be stub).');
            }
});
