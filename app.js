// Angela's Poker Bankroll Tracker - Complete
const STORAGE_KEY = 'angela_poker_sessions';
let sessions = [];
let chart = null;

document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    setupEventListeners();
    setDefaultDate();
});

function loadSessions() {
    const stored = localStorage.getItem(STORAGE_KEY);
    sessions = stored ? JSON.parse(stored) : [];
    updateDashboard();
}

function saveSessions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    updateDashboard();
}

function setDefaultDate() {
    document.getElementById('date').valueAsDate = new Date();
}

function setupEventListeners() {
    document.getElementById('sessionForm').addEventListener('submit', addSession);
    document.getElementById('editForm').addEventListener('submit', saveEdit);
    document.getElementById('searchInput').addEventListener('input', filterSessions);
    document.getElementById('filterGame').addEventListener('change', filterSessions);
}

function addSession(e) {
    e.preventDefault();
    const session = {
        id: Date.now(),
        date: document.getElementById('date').value,
        gameType: document.getElementById('gameType').value,
        location: document.getElementById('location').value,
        buyIn: parseFloat(document.getElementById('buyIn').value) || 0,
        cashOut: parseFloat(document.getElementById('cashOut').value) || 0,
        hours: parseFloat(document.getElementById('hours').value) || 0,
        notes: document.getElementById('notes').value
    };
    sessions.push(session);
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveSessions();
    document.getElementById('sessionForm').reset();
    setDefaultDate();
    showToast('Session added! 🎉');
}

function getProfit(s) { return s.cashOut - s.buyIn; }
function formatCurrency(n) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

function updateDashboard() {
    const totalProfit = sessions.reduce((sum, s) => sum + getProfit(s), 0);
    const totalHours = sessions.reduce((sum, s) => sum + s.hours, 0);
    const wins = sessions.filter(s => getProfit(s) > 0).length;
    const winRate = sessions.length > 0 ? (wins / sessions.length * 100) : 0;
    const hourly = totalHours > 0 ? totalProfit / totalHours : 0;

    const profitEl = document.getElementById('totalProfit');
    profitEl.textContent = (totalProfit >= 0 ? '+' : '') + formatCurrency(totalProfit);
    profitEl.className = 'stat-value ' + (totalProfit >= 0 ? 'positive' : 'negative');

    document.getElementById('totalHours').textContent = totalHours.toFixed(1) + 'h';
    document.getElementById('winRate').textContent = winRate.toFixed(1) + '%';

    const hourlyEl = document.getElementById('hourlyRate');
    hourlyEl.textContent = (hourly >= 0 ? '+' : '') + formatCurrency(hourly) + '/h';
    hourlyEl.className = 'stat-value ' + (hourly >= 0 ? 'positive' : 'negative');

    renderTable();
    renderChart();
}

function renderTable(toRender = sessions) {
    const tbody = document.getElementById('sessionsBody');
    if (toRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><p>No sessions yet. Add your first poker session! 🃏</p></td></tr>`;
        return;
    }
    tbody.innerHTML = toRender.map(s => {
        const p = getProfit(s);
        const profitClass = p > 0 ? 'profit-positive' : (p < 0 ? 'profit-negative' : '');
        return `<tr>
            <td>${fmtDate(s.date)}</td>
            <td><span class="game-badge">${s.gameType}</span></td>
            <td>${esc(s.location)}</td>
            <td>${formatCurrency(s.buyIn)}</td>
            <td>${formatCurrency(s.cashOut)}</td>
            <td class="${profitClass}">${p >= 0 ? '+' : ''}${formatCurrency(p)}</td>
            <td>${s.hours}h</td>
            <td>${esc(s.notes) || '-'}</td>
            <td>
                <button class="action-btn edit" onclick="editSession(${s.id})">✏️</button>
                <button class="action-btn delete" onclick="deleteSession(${s.id})">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function fmtDate(d) { return new Date(d).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}); }
function esc(t) { if (!t) return '-'; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function filterSessions() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const g = document.getElementById('filterGame').value;
    let f = sessions;
    if (q) f = f.filter(s => s.location.toLowerCase().includes(q) || (s.notes && s.notes.toLowerCase().includes(q)));
    if (g) f = f.filter(s => s.gameType === g);
    renderTable(f);
}

function renderChart() {
    const ctx = document.getElementById('bankrollChart')?.getContext('2d');
    if (!ctx) return;
    const sorted = [...sessions].sort((a,b) => new Date(a.date)-new Date(b.date));
    if (sorted.length === 0) { if (chart) { chart.destroy(); chart=null; } return; }
    let total = 0;
    const lbl=[], dat=[];
    sorted.forEach(s => { total += getProfit(s); lbl.push(fmtDate(s.date)); dat.push(total); });
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: lbl, datasets: [{ label: 'Bankroll', data: dat, borderColor: '#16a085', backgroundColor: 'rgba(22,160,133,0.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#d4af37', pointBorderColor: '#fff', pointBorderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, backgroundColor: '#0f3460', titleColor: '#d4af37', bodyColor: '#fff', borderColor: '#2d3748', borderWidth: 1, callbacks: { label: (c) => 'Bankroll: $' + c.parsed.y.toFixed(2) } } }, scales: { x: { grid: { color: '#2d3748' }, ticks: { color: '#a0a0a0' } }, y: { grid: { color: '#2d3748' }, ticks: { color: '#a0a0a0', callback: (v) => '$' + v.toLocaleString() } } } }
    });
}

function editSession(id) {
    const s = sessions.find(x => x.id === id);
    if (!s) return;
    document.getElementById('editId').value = s.id;
    document.getElementById('editDate').value = s.date;
    document.getElementById('editGameType').value = s.gameType;
    document.getElementById('editLocation').value = s.location;
    document.getElementById('editBuyIn').value = s.buyIn;
    document.getElementById('editCashOut').value = s.cashOut;
    document.getElementById('editHours').value = s.hours;
    document.getElementById('editNotes').value = s.notes || '';
    document.getElementById('editModal').style.display = 'block';
}

function saveEdit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('editId').value);
    const i = sessions.findIndex(s => s.id === id);
    if (i === -1) return;
    sessions[i] = {
        id: id, date: document.getElementById('editDate').value,
        gameType: document.getElementById('editGameType').value,
        location: document.getElementById('editLocation').value,
        buyIn: parseFloat(document.getElementById('editBuyIn').value) || 0,
        cashOut: parseFloat(document.getElementById('editCashOut').value) || 0,
        hours: parseFloat(document.getElementById('editHours').value) || 0,
        notes: document.getElementById('editNotes').value
    };
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveSessions();
    closeModal();
    showToast('Session updated! ✏️');
}

function closeModal() { document.getElementById('editModal').style.display = 'none'; }

function deleteSession(id) {
    if (!confirm('Delete this session?')) return;
    sessions = sessions.filter(s => s.id !== id);
    saveSessions();
    showToast('Deleted! 🗑️');
}

function
function exportData() {
    if (sessions.length === 0) { showToast('No data to export'); return; }
    const dataStr = JSON.stringify(sessions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `poker-sessions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported! 💾');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (Array.isArray(data)) {
                sessions = data;
                sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
                saveSessions();
                showToast('Imported! 📂');
            } else throw new Error('Invalid');
        } catch { showToast('Error: invalid file'); }
        e.target.value = '';
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (!confirm('DELETE ALL? This cannot be undone!')) return;
    if (!confirm('REALLY sure?')) return;
    sessions = [];
    saveSessions();
    showToast('All cleared! 🗑️');
}

function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#16a085;color:#fff;padding:15px 30px;border-radius:8px;font-size:1rem;z-index:2000;animation:slideUp 0.3s ease;';
    document.body.appendChild(t);
    setTimeout(() => { t.style.animation = 'fadeOut 0.3s ease'; setTimeout(() => t.remove(), 300); }, 3000);
}

const style = document.createElement('style');
style.textContent = '@keyframes slideUp{from{transform:translateX(-50%) translateY(100px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}@keyframes fadeOut{from{opacity:1}to{opacity:0}}.game-badge{background:rgba(212,175,55,0.1);color:#d4af37;padding:4px 8px;border-radius:4px;font-size:0.85rem}';
document.head.appendChild(style);

window.onclick = function(e) { if (e.target === document.getElementById('editModal')) closeModal(); };

console.log('🃏 Angela\'s Poker Tracker loaded!');
