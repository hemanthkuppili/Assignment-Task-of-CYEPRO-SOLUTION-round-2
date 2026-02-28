// CONSTANTS
const API_BASE = 'http://localhost:3000/api/v1';
let socket;
let currentUser = null;
let classificationChart, perfChart;

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    setupEventListeners();
    checkAuthStatus();
});

// AUTHENTICATION
function checkAuthStatus() {
    const token = localStorage.getItem('pe_token');
    if (token) {
        showDashboard();
    }
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user === 'admin' && pass === 'priority_2026') {
        localStorage.setItem('pe_token', 'mock_jwt_secret');
        showDashboard();
    } else {
        alert('Invalid demo credentials.');
    }
});

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
    initSocket();
    fetchMetrics();
    fetchRules();
    fetchAuditLogs();
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="showTab('${tabName}')"]`).classList.add('active');

    const titles = {
        'stats': 'System Overview',
        'simulator': 'Event Simulation Console',
        'audit': 'Decision Audit Trail',
        'rules': 'Priority Configuration Rules'
    };
    document.getElementById('tab-title').textContent = titles[tabName];
}

// SOCKET.IO
function initSocket() {
    socket = io('http://localhost:3000');
    socket.on('event_ingested', (data) => {
        addFeedItem(data);
        fetchMetrics(); // Update charts
    });

    socket.on('connect', () => {
        document.querySelector('.health-dot').style.background = '#10b981';
        document.getElementById('health-label').textContent = 'System Healthy';
    });
}

function addFeedItem(data) {
    const container = document.getElementById('event-feed');
    const div = document.createElement('div');
    div.className = 'feed-item';
    div.innerHTML = `
        <div class="content">
            <strong>${data.category}</strong>: ${data.content}
        </div>
        <div class="meta">
            <span class="badge ${getStatusClass(data.status)}">${data.status}</span>
        </div>
    `;
    container.prepend(div);
    if (container.children.length > 5) container.removeChild(container.lastChild);
}

function getStatusClass(status) {
    switch (status) {
        case 'NOW': return 'badge-now';
        case 'LATER': return 'badge-later';
        case 'NEVER': return 'badge-never';
        default: return 'badge-pending';
    }
}

// METRICS & CHARTS
async function fetchMetrics() {
    try {
        const res = await fetch(`${API_BASE}/dashboard/metrics`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('pe_token')}` }
        });
        const data = await res.json();

        updateDashboardStats(data.summary);
        updateCharts(data.summary);
        renderAuditList(data.recentEvents, 'audit-list'); // For overview tab
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

function updateDashboardStats(summary) {
    document.getElementById('stat-now').textContent = summary.classifications['NOW'] || 0;
    document.getElementById('stat-later').textContent = summary.classifications['LATER'] || 0;
    document.getElementById('stat-never').textContent = summary.classifications['NEVER'] || 0;
    document.getElementById('stat-latency').textContent = '22ms'; // Mocked
}

function initCharts() {
    const classCtx = document.getElementById('classChart').getContext('2d');
    classificationChart = new Chart(classCtx, {
        type: 'doughnut',
        data: {
            labels: ['NOW', 'LATER', 'NEVER'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#a1a1aa' } } }
        }
    });

    const perfCtx = document.getElementById('perfChart').getContext('2d');
    perfChart = new Chart(perfCtx, {
        type: 'line',
        data: {
            labels: ['10m', '8m', '6m', '4m', '2m', 'Now'],
            datasets: [{
                label: 'Ingestion Latency (ms)',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#22d3ee',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a1a1aa' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a1a1aa' } }
            }
        }
    });
}

function updateCharts(summary) {
    if (!classificationChart) return;
    classificationChart.data.datasets[0].data = [
        summary.classifications['NOW'] || 0,
        summary.classifications['LATER'] || 0,
        summary.classifications['NEVER'] || 0
    ];
    classificationChart.update();
}

// SIMULATOR
document.getElementById('sim-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const userId = document.getElementById('sim-user-id').value;
    const category = document.getElementById('sim-category').value;
    const content = document.getElementById('sim-content').value;

    try {
        const res = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('pe_token')}`
            },
            body: JSON.stringify({ user_id: userId, category, content })
        });
        const result = await res.json();

        showSimResult(result);
    } catch (err) {
        alert('Simulator failed. Ensure server is running.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Process Event';
    }
});

function showSimResult(result) {
    const area = document.getElementById('sim-result');
    const badge = document.getElementById('sim-final-status');
    const via = document.getElementById('sim-via');
    const detail = document.getElementById('sim-detail');

    area.classList.remove('hidden');
    badge.textContent = result.data.status;
    badge.className = `badge ${getStatusClass(result.data.status)}`;
    via.textContent = `ROUTE: ${result.data.via || 'SYSTEM'}`;
    detail.textContent = JSON.stringify(result.data, null, 2);
}

// RULES & AUDIT
async function fetchRules() {
    try {
        const res = await fetch(`${API_BASE}/rules`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('pe_token')}` }
        });
        const rules = await res.json();
        const list = document.getElementById('rules-list');
        list.innerHTML = rules.map(r => `
            <tr>
                <td>${r.category}</td>
                <td><code>${r.pattern}</code></td>
                <td><span class="badge ${getStatusClass(r.target_priority)}">${r.target_priority}</span></td>
                <td>Active</td>
                <td><button class="btn-ghost">Edit</button></td>
            </tr>
        `).join('') || '<tr><td colspan="5">No active rules.</td></tr>';
    } catch (err) { }
}

async function fetchAuditLogs() {
    // Reusing metrics data for now
    fetchMetrics();
}

function renderAuditList(events, elementId) {
    const list = document.getElementById(elementId);
    if (!list) return;
    list.innerHTML = events.map(e => `
        <tr>
            <td style="font-size: 0.7rem; color: var(--text-muted)">${e.id}</td>
            <td><span class="badge ${getStatusClass(e.status)}">${e.status}</span></td>
            <td>Decision recorded via System Layer</td>
            <td>${Math.random().toFixed(2)}</td>
            <td>${new Date(e.ts).toLocaleTimeString()}</td>
        </tr>
    `).join('');
}

function setupEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('pe_token');
        location.reload();
    });
}
