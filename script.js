let globalCapacities = {};
const DEFAULT_CAPACITY = 10000;
let globalUphCost = {};
let _toastTimer = null;
let _loadProgress = 0; 
let _loadAnimFrame = null;

// ==========================================
// 🌟 1. SAFE DATE PARSER (ป้องกันบั๊ก Timezone)
// ==========================================
function safeParseDate(str) {
    if (!str) return new Date();
    let d = new Date(str);
    if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    
    // Fallback สำหรับเบราว์เซอร์ที่แปลง Format เพี้ยน
    let clean = str.replace(/-/g, ' ').replace(/\s+/g, ' ');
    d = new Date(clean);
    if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return new Date();
}

function showToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('custom-toast');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;
    msgEl.innerText = message;
    const colors = { success: '#10B981', error: '#EF4444', info: '#F59E0B' };
    toast.style.background = colors[type] || colors.success;
    toast.classList.add('show');
    if (_toastTimer) clearTimeout(_toastTimer);
    if (duration > 0) _toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ------------------------------------------------------------
// GLOBAL HELPERS & COLOR MAPPING
// ------------------------------------------------------------
const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getStandardDate = (rawDate) => {
    if (!rawDate) return "";
    let str = String(rawDate).trim();
    if (str.includes('T')) str = str.split('T')[0];
    let dObj = new Date(str);
    if (!isNaN(dObj.getTime())) return `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;
    return str;
};

const formatShortDate = (dStr) => {
    if (!dStr) return ""; let dObj = new Date(dStr);
    return isNaN(dObj.getTime()) ? dStr : `${String(dObj.getDate()).padStart(2, '0')} ${shortMonths[dObj.getMonth()]}`;
};

const getDisplayDate = (dStr) => {
     if (!dStr) return ""; let dObj = new Date(dStr);
     return isNaN(dObj.getTime()) ? dStr : `${String(dObj.getDate()).padStart(2, '0')} ${shortMonths[dObj.getMonth()]} ${dObj.getFullYear()}`;
};

const fmtN = (v) => (v || 0).toLocaleString();

const formatK = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return Math.round(num / 1000) + 'K';
    return num;
};

const buColorMap = {
    'DM02': { s: '#8CC63F', e: '#009245' }, 
    'DP02': { s: '#F59E0B', e: '#B45309' }, 
    'DG02': { s: '#38BDF8', e: '#0284C7' }, 
    '1715': { s: '#F87171', e: '#DC2626' }, 
    '1115': { s: '#F87171', e: '#DC2626' }, 
    'DCWN': { s: '#2DD4BF', e: '#0D9488' }, 
    'DS02': { s: '#A78BFA', e: '#7C3AED' }, 
    'PTG': { s: '#8CC63F', e: '#009245' },  
    '40HRS': { s: '#94A3B8', e: '#64748B' }, 
    'MAN POWER': { s: '#38BDF8', e: '#0284C7' } 
};
const defaultColor = { s: '#94A3B8', e: '#64748B' };
const getBuColor = (bu) => buColorMap[bu] || defaultColor;

function getGradient(ctx, chartArea, colorStart, colorEnd) {
    if (!chartArea) return colorStart;
    let gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
}

function getPeriodLabel(dObj, period) {
    if (period === 'Monthly') return `${shortMonths[dObj.getMonth()]} ${dObj.getFullYear()}`;
    if (period === 'Weekly') {
        let d = new Date(Date.UTC(dObj.getFullYear(), dObj.getMonth(), dObj.getDate()));
        let dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        let yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        let weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
        return `W${weekNo} ${d.getUTCFullYear()}`;
    }
    return `${String(dObj.getDate()).padStart(2,'0')} ${shortMonths[dObj.getMonth()]} ${dObj.getFullYear()}`;
}

function generateTrendHtml(current, previous, isInverse = false, isPct = false) {
    if (previous === null || previous === undefined || previous === 0 || isNaN(current) || isNaN(previous)) {
        return `<span class="trend-badge trend-neutral">-</span> <span class="trend-note">No Data</span>`;
    }
    let diff = current - previous;
    if (diff === 0) return `<span class="trend-badge trend-neutral">- 0%</span> <span class="trend-note">vs Prev</span>`;

    let diffPct = (diff / previous) * 100;
    let isGood = isInverse ? diff < 0 : diff > 0;
    let arrow = diff > 0 ? '▲' : '▼';
    let sign = diff > 0 ? '+' : '';
    let valStr = isPct ? `${sign}${diff.toFixed(2)}%` : `${sign}${diffPct.toFixed(1)}%`;

    if (isGood) return `<span class="trend-badge trend-up">${arrow} ${valStr}</span> <span class="trend-note">vs Prev</span>`;
    return `<span class="trend-badge trend-down">${arrow} ${valStr}</span> <span class="trend-note">vs Prev</span>`;
}

// ------------------------------------------------------------
// CHART.JS CONFIG
// ------------------------------------------------------------
// เปลี่ยนบรรทัดเดิมเป็นแบบนี้
Chart.defaults.font.family = "'Inter', 'Prompt', sans-serif";
Chart.defaults.color = '#64748B';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
Chart.defaults.plugins.tooltip.titleFont = { size: 12, family: 'Inter', weight: 'bold' };
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 6;
Chart.defaults.elements.bar.borderWidth = 0; 
Chart.defaults.elements.line.tension = 0.4; 
Chart.defaults.elements.point.radius = 4;

const dataLabelPlugin = {
    id: 'dataLabelPlugin',
    afterDatasetsDraw(chart) {
        if(chart.config.type !== 'bar' || chart.canvas.id === 'productivityChart') return;
        const { ctx } = chart;
        
        chart.data.datasets.forEach((dataset, i) => {
            if (dataset.type === 'line' || !chart.isDatasetVisible(i) || dataset.stack) return;
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((bar, index) => {
                const data = dataset.data[index];
                if(data > 0 && bar.height > 20){
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 9px Inter'; 
                    ctx.textAlign = 'center'; 
                    ctx.textBaseline = 'middle';
                    let val = (chart.canvas.id.includes('claim')) ? formatK(data) : (data%1!==0 ? data.toFixed(1)+'%' : formatK(data));
                    ctx.fillText(val, bar.x, bar.y + (bar.height / 2));
                }
            });
        });
        
        if (chart.canvas.id === 'ffmTrendChart' || chart.canvas.id === 'workforceChart') {
            let totals = []; let xCoords = []; let topY = [];
            chart.data.datasets.forEach((dataset, i) => {
                if (!chart.isDatasetVisible(i) || dataset.type === 'line') return;
                const meta = chart.getDatasetMeta(i);
                dataset.data.forEach((val, index) => { 
                    totals[index] = (totals[index] || 0) + (val || 0); 
                    if (meta.data[index] && val > 0) {
                        xCoords[index] = meta.data[index].x;
                        topY[index] = Math.min(topY[index] || 99999, meta.data[index].y);
                    }
                });
            });
            chart.data.labels.forEach((_, index) => {
                if (totals[index] > 0 && xCoords[index] && topY[index]) {
                    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#F8FAFC' : '#1E293B';
                    ctx.font = 'bold 10px Inter'; 
                    ctx.textAlign = 'center'; 
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(formatK(Math.round(totals[index])), xCoords[index], topY[index] - 6);
                }
            });
        }
    }
};

const lineDataLabelPlugin = {
    id: 'lineDataLabelPlugin',
    afterDatasetsDraw(chart) {
        if (!['ontimeChart2', 'inventoryChart'].includes(chart.canvas.id)) return;
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            if (!chart.isDatasetVisible(i)) return;
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((point, index) => {
                const data = dataset.data[index];
                if(data !== null && data !== undefined && data !== 0 && data !== "0.00"){
                    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#F8FAFC' : '#1E293B';
                    ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'; 
                    ctx.textBaseline = i % 2 === 0 ? 'bottom' : 'top'; 
                    let yOffset = i % 2 === 0 ? -8 : 8;
                    ctx.fillText(Number(data).toFixed(1) + '%', point.x, point.y + yOffset);
                }
            });
        });
    }
};

// ==========================================
// INITIALIZE CHART INSTANCES
// ==========================================
let ffmTrendChartInstance = new Chart(document.getElementById('ffmTrendChart'), { type: 'bar', data: { labels: [], datasets: [] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels:{usePointStyle:true, boxWidth:8} } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, border: { display: false }, grid: { borderDash: [4, 4] }, grace: '15%' } } }, plugins: [dataLabelPlugin] });
let ffmVolumeChartInstance = new Chart(document.getElementById('ffmVolumeChart'), { type: 'doughnut', data: { labels: [], datasets: [] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels:{usePointStyle:true, boxWidth:8} } } } });
let workforceChartInstance = new Chart(document.getElementById('workforceChart'), { type: 'bar', data: { labels: [], datasets: [] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels:{usePointStyle:true, boxWidth:8} } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, border: { display: false }, grid: { borderDash: [4, 4] }, grace: '15%' } } }, plugins: [dataLabelPlugin] });

let ontimeChartInstance = new Chart(document.getElementById('ontimeChart2'), { 
    type: 'line', data: { labels: [], datasets: [] }, 
    options: { 
        responsive: true, maintainAspectRatio: false, 
        layout: { padding: { top: 20 } },
        plugins: { legend: { position: 'top', labels:{usePointStyle:true, boxWidth:8} } }, 
        scales: { 
            x: { grid: { display: false } }, 
            y: { border: { display: false }, grid: { borderDash: [4, 4] }, suggestedMin: 80, max: 100 } 
        } 
    }, 
    plugins: [lineDataLabelPlugin]
});

let claimChart2Instance = new Chart(document.getElementById('claimChart2'), { type: 'bar', data: { labels: [], datasets: [ { label: 'มูลค่าเคลม (฿)', data: [], backgroundColor: '#F59E0B', borderRadius: 4, yAxisID: 'y' }, { label: 'จำนวนชิ้น', data: [], type: 'line', yAxisID: 'y1', pointRadius: 4, borderWidth: 2, borderColor: '#3B82F6', backgroundColor: '#3B82F6' } ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels:{usePointStyle:true, boxWidth:8} } }, scales: { x: {grid:{display:false}}, y: {position: 'left', grace: '15%', border:{display:false}, grid: { borderDash: [4, 4] }}, y1: {position: 'right', display:false} } }, plugins: [dataLabelPlugin] });
let inventoryChartInstance = new Chart(document.getElementById('inventoryChart'), { type: 'line', data: { labels: [], datasets: [{ label: 'Accuracy %', data: [], fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { border: { display: false }, grid: { borderDash: [4, 4] }, grace: '5%' } } }, plugins: [lineDataLabelPlugin]});
let productivityChartInstance = new Chart(document.getElementById('productivityChart'), { 
    type: 'bar', 
    data: { labels: [], datasets: [] }, 
    options: { 
        responsive: true, maintainAspectRatio: false, 
        plugins: { legend: { position: 'top' } }, 
        scales: { 
            x: { stacked: true, grid: { display: false } }, 
            y: { stacked: false, border: { display: false }, grace: '15%', grid: { borderDash: [4, 4] } } 
        } 
    } 
});

let transportTrendChartInstance = new Chart(document.getElementById('transportTrendChart'), {
    type: 'bar', data: { labels: [], datasets: [] },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } } },
        scales: {
            x: { grid: { display: false } },
            y: { type: 'linear', position: 'left', min: 0, max: 105, title: { display: true, text: 'SLA (%)', color: '#3B82F6', font: {weight: 'bold'} }, grid: { borderDash: [4, 4] } },
            y1: { type: 'linear', position: 'right', title: { display: true, text: 'Cost (฿)', color: '#8B5CF6', font: {weight: 'bold'} }, grid: { display: false }, beginAtZero: true }
        }
    },
    plugins: [dataLabelPlugin]
});

// ==========================================
// DATA FETCHING & PROCESSING 
// ==========================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxB0bNU1P9qrG_6aHoeiKyHMXT0_k76VlL0aq1I9xxHVpPDQK9qcd3FJMip4Jk9o6RY/exec';
let globalData = { workforce:{}, fulfillment:{}, wave_ops:{}, ontime:{}, ontime_hub:{}, ontime_by_aff:{}, claims:{}, inventory:{}, inventory_daily:{}, transport:{}, productivity:{}, prod_area:{}, prod_zone:{}, prod_users_map:{} };
window.selectedBUs = ['ALL'];

const standardizeBU = (bu) => {
    let b = (bu || '').toString().trim().toUpperCase();
    if (b.includes('MART')) return 'DM02';
    if (b.includes('PUN') || b.includes('PUNTHAI')) return 'DP02';
    if (b.includes('GFA') || b.includes('COFFEE')) return 'DG02';
    if (b.includes('LUBE')) return '1115';
    return b;
};

function updateLoaderPct(targetPct, durationMs) {
    const pctEl = document.getElementById('loader-pct');
    if (!pctEl) return;
    let startPct = _loadProgress;
    let startTime = performance.now();
    if (_loadAnimFrame) cancelAnimationFrame(_loadAnimFrame);
    function animate(currentTime) {
        let elapsed = currentTime - startTime;
        let progress = Math.min(elapsed / durationMs, 1);
        _loadProgress = Math.floor(startPct + (targetPct - startPct) * progress);
        pctEl.innerText = _loadProgress + '%';
        if (progress < 1) {
            _loadAnimFrame = requestAnimationFrame(animate);
        } else {
            _loadProgress = targetPct;
            pctEl.innerText = targetPct + '%';
        }
    }
    _loadAnimFrame = requestAnimationFrame(animate);
}

setInterval(() => { initDashboard(); }, 15 * 60 * 1000); 

document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('theme-toggle').innerText = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
    Chart.defaults.color = isDark ? '#94A3B8' : '#64748B';
    Object.values(Chart.instances).forEach(chart => chart.update());
});

document.addEventListener('click', (e) => {
    let buBtn = document.getElementById('bu-multi-select');
    let buMenu = document.getElementById('bu-dropdown-menu');
    if (buBtn && buMenu && !buBtn.contains(e.target) && !buMenu.contains(e.target)) buMenu.style.display = 'none';

    let otBtn = document.getElementById('ontime-line-ms');
    let otMenu = document.getElementById('ontime-line-menu');
    if (otBtn && otMenu && !otBtn.contains(e.target) && !otMenu.contains(e.target)) otMenu.style.display = 'none';
});

document.getElementById('ontime-line-ms')?.addEventListener('click', (e) => {
    e.stopPropagation();
    let menu = document.getElementById('ontime-line-menu');
    document.querySelectorAll('.dropdown-card').forEach(m => { if (m !== menu) m.style.display = 'none'; });
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('btn-apply-ot-line')?.addEventListener('click', () => {
    document.getElementById('ontime-line-menu').style.display = 'none';
    let selected = [];
    if (document.getElementById('cb-ot-overall').checked) selected.push('ภาพรวม');
    if (document.getElementById('cb-ot-ptglg').checked) selected.push('PTGLG');
    if (document.getElementById('cb-ot-hub').checked) selected.push('HUB');
    
    if (selected.length === 0) {
        document.getElementById('cb-ot-overall').checked = true;
        selected.push('ภาพรวม');
    }
    document.getElementById('ontime-line-text').innerText = selected.length > 1 ? `${selected.length} Selected` : selected[0];
    updateOnTimeUI();
});

document.getElementById('tp-metric-filter')?.addEventListener('change', updateTransportUI);

function cleanDataBeforeLoad() {
    ['fulfillment', 'wave_ops', 'claims', 'inventory', 'inventory_daily', 'transport'].forEach(module => {
        if (globalData[module]) {
            Object.keys(globalData[module]).forEach(dateKey => {
                let oldBuData = globalData[module][dateKey].bu_data;
                if (oldBuData) {
                    let newBuData = {};
                    Object.keys(oldBuData).forEach(bu => {
                        let mBu = standardizeBU(bu);
                        if (!newBuData[mBu]) newBuData[mBu] = typeof oldBuData[bu] === 'object' ? { ...oldBuData[bu] } : oldBuData[bu];
                        else {
                            if (typeof oldBuData[bu] === 'object') {
                                Object.keys(oldBuData[bu]).forEach(k => newBuData[mBu][k] = (newBuData[mBu][k] || 0) + oldBuData[bu][k]);
                            } else newBuData[mBu] += oldBuData[bu];
                        }
                    });
                    globalData[module][dateKey].bu_data = newBuData;
                }
            });
        }
    });

    if (globalData.workforce) {
        Object.keys(globalData.workforce).forEach(dateKey => {
            let dayData = globalData.workforce[dateKey];
            if (dayData.matrix) {
                let newMatrix = {};
                Object.keys(dayData.matrix).forEach(aff => {
                    let mBu = standardizeBU(aff);
                    if (!newMatrix[mBu]) newMatrix[mBu] = dayData.matrix[aff];
                    else {
                        Object.keys(dayData.matrix[aff]).forEach(role => {
                            if (!newMatrix[mBu][role]) newMatrix[mBu][role] = {};
                            Object.keys(dayData.matrix[aff][role]).forEach(team => {
                                newMatrix[mBu][role][team] = (newMatrix[mBu][role][team] || 0) + dayData.matrix[aff][role][team];
                            });
                        });
                    }
                });
                dayData.matrix = newMatrix;
            }
        });
    }
}

function populateGlobalBUFilters() {
    let buSet = new Set();
    if(globalData.fulfillment) Object.values(globalData.fulfillment).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    if(globalData.claims) Object.values(globalData.claims).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    if(globalData.inventory) Object.values(globalData.inventory).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    if(globalData.transport) Object.values(globalData.transport).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    
    let sortedBUs = Array.from(buSet).sort();
    const cbList = document.getElementById('bu-checkbox-list');
    const invOwnerList = document.getElementById('inv-owner-filter');
    
    if (cbList && cbList.innerHTML === '') {
        sortedBUs.forEach(bu => {
            const label = document.createElement('label');
            label.className = 'dropdown-item';
            label.innerHTML = `<input type="checkbox" class="bu-item-cb" value="${bu}" checked> ${bu}`;
            cbList.appendChild(label);
            if (invOwnerList) invOwnerList.appendChild(new Option(bu, bu));
        });

        if (invOwnerList) invOwnerList.addEventListener('change', () => { updateInventoryUI(); renderLocationAccuracy(); });

        document.getElementById('bu-select-all').addEventListener('change', (e) => {
            document.querySelectorAll('.bu-item-cb').forEach(cb => cb.checked = e.target.checked);
        });
        
        document.getElementById('bu-apply-btn').addEventListener('click', () => {
            document.getElementById('bu-dropdown-menu').style.display = 'none';
            if (document.getElementById('bu-select-all').checked) {
                window.selectedBUs = ['ALL'];
                document.getElementById('bu-multi-text').innerText = 'All BUs';
            } else {
                const checkedVals = Array.from(document.querySelectorAll('.bu-item-cb')).filter(c => c.checked).map(c => c.value);
                window.selectedBUs = checkedVals.length > 0 ? checkedVals : [];
                document.getElementById('bu-multi-text').innerText = checkedVals.length > 0 ? (checkedVals.length <= 2 ? checkedVals.join(', ') : `${checkedVals.length} BUs Selected`) : 'No Selection';
            }
            refreshAllSections();
            initFulfillmentRealtime();
        });
    }
}

async function initDashboard() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'flex';
    
    _loadProgress = 0; 
    updateLoaderPct(15, 500);

    const dpStart = document.getElementById('date-start');
    const dpEnd = document.getElementById('date-end');
    const periodSel = document.getElementById('global-period');
    
    if (!dpEnd.value) {
        let t = new Date(); 
        dpEnd.value = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
        let s = new Date(); 
        s.setDate(t.getDate() - 6); 
        dpStart.value = `${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,'0')}-${String(s.getDate()).padStart(2,'0')}`;
    }

    if (!dpEnd.hasAttribute('data-listener')) {
        [dpStart, dpEnd, periodSel].forEach(el => el.addEventListener('change', () => { refreshAllSections(); initFulfillmentRealtime(); }));
        document.getElementById('btn-refresh')?.addEventListener('click', () => initDashboard());
        dpEnd.setAttribute('data-listener', 'true');
    }

    try {
        updateLoaderPct(40, 2000);
        const response = await fetch(`${GAS_URL}?section=all`);
        updateLoaderPct(65, 800);
        const result = await response.json();
        
        if (result.status === "success") {
            globalData = result.data;
            cleanDataBeforeLoad();
            populateGlobalBUFilters();
        }
    } catch (e) { console.error("GAS Load Error:", e); }

    updateLoaderPct(85, 600);
    await initFulfillmentRealtime();
    
    updateLoaderPct(95, 300);
    refreshAllSections();
    
    updateLoaderPct(100, 200);
    
    setTimeout(() => { 
        if (loader) loader.style.display = 'none'; 
        showToast("ข้อมูลรีเฟรชสำเร็จ!"); 
        _loadProgress = 0; 
        if (document.getElementById('loader-pct')) document.getElementById('loader-pct').innerText = '0%'; 
    }, 600);
}

function refreshAllSections() {
    try { updateTransportUI(); } catch(e) {}
    try { updateWorkforceUI(); } catch(e) {}
    try { updateOnTimeUI(); } catch(e) {}
    try { updateClaimUI(); } catch(e) {}
    try { updateInventoryUI(); } catch(e) {}
    try { renderLocationAccuracy(); } catch(e) {}
    try { renderProductivitySection(); } catch(e) {}
}

// ------------------------------------------------------------
// MODALS (CAPACITY & UPH)
// ------------------------------------------------------------
function openCapacityModal() {
    const modal = document.getElementById('capacity-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    document.getElementById('cap-target-date').value = document.getElementById('date-end').value;
    fetchAndRenderCapInputs();
}

function closeCapacityModal() {
    const modal = document.getElementById('capacity-modal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

async function fetchAndRenderCapInputs() {
    const targetDate = document.getElementById('cap-target-date').value;
    const container = document.getElementById('cap-inputs-container');
    container.innerHTML = '<span class="text-sm text-muted">⏳ กำลังดึงข้อมูล...</span>';
    try {
        const capResp = await fetch("https://dc-ordermonitoring-backend.onrender.com/api/run", { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ fn: 'apiGetCapacity', args: [targetDate, targetDate] }) 
        });
        const capJson = await capResp.json();
        if (capJson.success && capJson.data) {
            if (!globalCapacities[targetDate]) globalCapacities[targetDate] = {};
            capJson.data.forEach(row => globalCapacities[row.target_date][row.owner] = row.capacity);
        }
    } catch (e) {}
    
    container.innerHTML = '';
    const allBUs = (window.selectedBUs && window.selectedBUs.includes('ALL')) ? ['DM02', 'DP02', '1115', '1715', 'DCWN', 'DG02'] : (window.selectedBUs || ['DM02', 'DP02', '1115', '1715', 'DCWN', 'DG02']); 
    
    allBUs.forEach(bu => {
        let currentCap = globalCapacities[targetDate]?.[bu] || DEFAULT_CAPACITY;
        container.innerHTML += `
        <div style="display:flex; flex-direction:column; gap:4px;">
            <label class="text-xs text-muted font-bold">${bu}</label>
            <input type="number" id="cap-input-${bu}" value="${currentCap}" data-bu="${bu}" class="filter-control" style="width:75px; text-align:center;">
        </div>`;
    });
}

async function saveDailyCapacity() {
    const targetDate = document.getElementById('cap-target-date').value;
    const inputs = document.querySelectorAll('#cap-inputs-container input');
    if (inputs.length === 0) return;
    
    const saveBtn = document.querySelector('#capacity-modal button.btn-primary');
    let originalBtnHtml = ''; 
    if (saveBtn) { originalBtnHtml = saveBtn.innerHTML; saveBtn.disabled = true; saveBtn.innerHTML = '⏳ กำลังบันทึก...'; }
    
    showToast('⏳ กำลังบันทึก Capacity...', 'info', 0);
    let capacityData = [];
    inputs.forEach(input => capacityData.push({ target_date: targetDate, owner: input.getAttribute('data-bu'), capacity: parseInt(input.value) || 0 }));
    
    try {
        const response = await fetch("https://dc-ordermonitoring-backend.onrender.com/api/run", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: 'apiSaveCapacityBulk', args: [capacityData] }) });
        if (!response.ok) throw new Error(`HTTP Error Status`);
        const resData = await response.json();
        if (resData.success === false) throw new Error('บันทึกไม่สำเร็จ');
        
        if (!globalCapacities[targetDate]) globalCapacities[targetDate] = {};
        capacityData.forEach(item => globalCapacities[targetDate][item.owner] = item.capacity);
        
        showToast(`✅ บันทึก Capacity สำเร็จ!`, 'success');
        initFulfillmentRealtime(); 
        closeCapacityModal(); 
    } catch (error) { 
        showToast('❌ บันทึกไม่สำเร็จ: ' + error.message, 'error'); 
    } finally { 
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; } 
    }
}

// 🌟 UPH Modal Functions 🌟
function openUphModal() {
    const modal = document.getElementById('uph-modal');
    if(!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    let dVal = document.getElementById('date-end').value || new Date().toISOString().split('T')[0];
    document.getElementById('uph-target-date').value = dVal;
    applyUphCostInputs(dVal);
}

function closeUphModal() {
    const modal = document.getElementById('uph-modal');
    if(!modal) return;
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

function applyUphCostInputs(dateStr) {
    let eff = getEffectiveUphCost(dateStr);
    if(document.getElementById('trg-all')) document.getElementById('trg-all').value = eff.trg_all || 150;
    if(document.getElementById('trg-full')) document.getElementById('trg-full').value = eff.trg_full || 180;
    if(document.getElementById('trg-half')) document.getElementById('trg-half').value = eff.trg_half || 120;
    if(document.getElementById('trg-ea')) document.getElementById('trg-ea').value = eff.trg_ea || 80;
    if(document.getElementById('cost-salary')) document.getElementById('cost-salary').value = eff.cost_salary || 400;
    if(document.getElementById('cost-days')) document.getElementById('cost-days').value = eff.cost_days || 26;
}

function getEffectiveUphCost(dateStr) {
    if (!dateStr) return { trg_all: 150, trg_full: 180, trg_half: 120, trg_ea: 80, cost_salary: 400, cost_days: 26 };
    let ref = safeParseDate(dateStr).getTime();
    let cand = Object.keys(globalUphCost)
        .filter(d => safeParseDate(d).getTime() <= ref)
        .sort((a,b) => safeParseDate(b).getTime() - safeParseDate(a).getTime());
    
    if (cand.length > 0) return globalUphCost[cand[0]];
    return { trg_all: 150, trg_full: 180, trg_half: 120, trg_ea: 80, cost_salary: 400, cost_days: 26 };
}

// --- นำโค้ดนี้ไปวางต่อท้ายฟังก์ชัน getEffectiveUphCost ---
function getTarget(area, dateStr) {
    let eff = getEffectiveUphCost(dateStr);
    if (!area || area === 'ALL' || area === 'N/A') return eff.trg_all || 150;
    
    let a = area.toString().toLowerCase();
    if (a.includes('full')) return eff.trg_full || 180;
    if (a.includes('half')) return eff.trg_half || 120;
    if (a.includes('ea') || a.includes('piece')) return eff.trg_ea || 80;
    
    return eff.trg_all || 150;
}

async function saveTargets() {
    const targetDate = document.getElementById('uph-target-date')?.value
        || document.getElementById('date-end')?.value
        || new Date().toISOString().split('T')[0];
    const rec = {
        target_date: targetDate,
        trg_all:  parseFloat(document.getElementById('trg-all')?.value)  || 0,
        trg_full: parseFloat(document.getElementById('trg-full')?.value) || 0,
        trg_half: parseFloat(document.getElementById('trg-half')?.value) || 0,
        trg_ea:   parseFloat(document.getElementById('trg-ea')?.value)   || 0,
        cost_salary: parseFloat(document.getElementById('cost-salary')?.value) || 0,
        cost_days:   parseFloat(document.getElementById('cost-days')?.value)   || 0
    };
    const btn = document.querySelector('#uph-modal button.btn-primary');
    let orig = ''; if (btn) { orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '⏳ กำลังบันทึก...'; }
    showToast('⏳ กำลังบันทึก UPH Target / Cost...', 'info', 0);
    try {
        const resp = await fetch("https://dc-ordermonitoring-backend.onrender.com/api/run", {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fn: 'apiSaveUphCostBulk', args: [[rec]] })
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const j = await resp.json();
        if (j.success === false) throw new Error(j.message || 'บันทึกไม่สำเร็จ');
        
        globalUphCost[targetDate] = { ...rec };
        showToast(`✅ บันทึก UPH Target / Cost สำเร็จ!`, 'success');
        closeUphModal(); 
        renderProductivitySection(); 
    } catch (err) {
        showToast('❌ บันทึกไม่สำเร็จ: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig || '💾 บันทึกข้อมูลไปยัง Sheet'; }
    }
}

function hasEffectiveCap(dateStr, bu) {
    if (!bu || !dateStr) return false; let ref = safeParseDate(dateStr).getTime();
    return Object.keys(globalCapacities).some(d => globalCapacities[d] && globalCapacities[d][bu] != null && safeParseDate(d).getTime() <= ref);
}
function getEffectiveCap(dateStr, bu) {
    if (!bu || !dateStr) return DEFAULT_CAPACITY; let ref = safeParseDate(dateStr).getTime();
    let cand = Object.keys(globalCapacities).filter(d => globalCapacities[d] && globalCapacities[d][bu] != null && safeParseDate(d).getTime() <= ref).sort((a,b) => safeParseDate(b).getTime() - safeParseDate(a).getTime());
    return cand.length > 0 ? globalCapacities[cand[0]][bu] : DEFAULT_CAPACITY;
}

// ------------------------------------------------------------
// FULFILLMENT & WAVE OPS 
// ------------------------------------------------------------
async function initFulfillmentRealtime() {
    const getBestOrderData = (bItem, wItem, fItem) => {
        let bt = parseFloat(bItem?.ordTotal || 0), bf = parseFloat(bItem?.ordFull || 0);
        let wt = parseFloat(wItem?.ordTotal || 0), wf = parseFloat(wItem?.ordFull || 0);
        let ft = parseFloat(fItem?.ordTotal || 0), ff = parseFloat(fItem?.ordFull || 0);
        let maxTotal = Math.max(bt, wt, ft);
        if (maxTotal === 0) return { tot: 0, full: 0 };
        let validSources = [];
        if (bt >= maxTotal * 0.9) validSources.push({ tot: bt, full: bf });
        if (wt >= maxTotal * 0.9) validSources.push({ tot: wt, full: wf });
        if (ft >= maxTotal * 0.9) validSources.push({ tot: ft, full: ff });
        validSources.sort((a, b) => b.full - a.full);
        return { tot: validSources[0].tot, full: validSources[0].full };
    };
    
    const dpStartVal = document.getElementById('date-start').value;
    const dpEndVal = document.getElementById('date-end').value;
    const targetStartObj = safeParseDate(dpStartVal);
    const targetEndObj = safeParseDate(dpEndVal);
    const targetStart = targetStartObj.setHours(0, 0, 0, 0);
    const targetEnd = targetEndObj.setHours(23, 59, 59, 999);
    const period = document.getElementById('global-period').value;
    
    const API_URL = "https://dc-ordermonitoring-backend.onrender.com/api/run";
    let bqDataList = [];
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fn: 'apiGetDashboardSummary', args: ["", ""] })
        });
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) bqDataList = result.data;
        }
        
        let dObj = safeParseDate(dpEndVal); dObj.setDate(dObj.getDate() - 90);
        const startDateCap = dObj.toISOString().split('T')[0];
        const capResp = await fetch("https://dc-ordermonitoring-backend.onrender.com/api/run", {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fn: 'apiGetCapacity', args: [startDateCap, dpEndVal] })
        });
        if (capResp.ok) {
            const capJson = await capResp.json();
            if (capJson.success && capJson.data) {
                capJson.data.forEach(row => {
                    if (!globalCapacities[row.target_date]) globalCapacities[row.target_date] = {};
                    globalCapacities[row.target_date][row.owner] = row.capacity;
                });
            }
        }
        
        // 🌟 ดึงข้อมูล UPH Cost 🌟
        const uphResp = await fetch("https://dc-ordermonitoring-backend.onrender.com/api/run", {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fn: 'apiGetUphCost', args: [startDateCap, dpEndVal] }) 
        });
        if (uphResp.ok) {
            const uphJson = await uphResp.json();
            if (uphJson.success && uphJson.data) {
                uphJson.data.forEach(row => {
                    globalUphCost[row.target_date] = row;
                });
            }
        }
    } catch (apiErr) {
        console.warn("⚠️ API Error: Fallback to GAS data only.");
    }

    try {
        let unifiedDatesMap = {};
        
        if (globalData.fulfillment) {
            Object.keys(globalData.fulfillment).forEach(k => {
                let sd = getStandardDate(k); 
                if (!unifiedDatesMap[sd]) unifiedDatesMap[sd] = { bq: {}, wave: {}, ffm: {} };
                let fData = globalData.fulfillment[k].bu_data || {};
                Object.keys(fData).forEach(rawBu => {
                    let sBu = standardizeBU(rawBu);
                    if (!unifiedDatesMap[sd].ffm[sBu]) unifiedDatesMap[sd].ffm[sBu] = { ordTotal: 0, ordFull: 0, req: 0 };
                    let item = fData[rawBu];
                    unifiedDatesMap[sd].ffm[sBu].ordTotal += parseFloat(item.total_orders || item.orders || item.ordTotal || 0);
                    unifiedDatesMap[sd].ffm[sBu].ordFull += parseFloat(item.completed_orders || item.completed || item.ordFull || 0);
                    unifiedDatesMap[sd].ffm[sBu].req += parseFloat(item.req_qty || item.req || 0);
                });
            });
        }

        if (globalData.wave_ops) {
            Object.keys(globalData.wave_ops).forEach(k => {
                let sd = getStandardDate(k); 
                if (!unifiedDatesMap[sd]) unifiedDatesMap[sd] = { bq: {}, wave: {}, ffm: {} };
                let wData = globalData.wave_ops[k].bu_data || {};
                Object.keys(wData).forEach(rawBu => {
                    let sBu = standardizeBU(rawBu);
                    if (!unifiedDatesMap[sd].wave[sBu]) unifiedDatesMap[sd].wave[sBu] = { ordTotal: 0, ordFull: 0, late_orders: 0, total_delay_mins: 0 };
                    unifiedDatesMap[sd].wave[sBu].ordTotal += parseFloat(wData[rawBu].total_orders || 0);
                    unifiedDatesMap[sd].wave[sBu].ordFull += parseFloat(wData[rawBu].completed_orders || 0);
                    unifiedDatesMap[sd].wave[sBu].late_orders += parseFloat(wData[rawBu].late_orders || 0);
                    unifiedDatesMap[sd].wave[sBu].total_delay_mins = Math.max(unifiedDatesMap[sd].wave[sBu].total_delay_mins, parseFloat(wData[rawBu].total_delay_mins || 0));
                });
            });
        }

        bqDataList.forEach(row => {
            let sd = getStandardDate(row.date);
            if (!unifiedDatesMap[sd]) unifiedDatesMap[sd] = { bq: {}, wave: {}, ffm: {} };
            try { 
                let rawBq = JSON.parse(row.ownerJson || '{}'); 
                Object.keys(rawBq).forEach(rawBu => {
                    let sBu = standardizeBU(rawBu); 
                    if (sBu !== 'UNKNOWN' && sBu !== '') {
                        if (!unifiedDatesMap[sd].bq[sBu]) {
                            unifiedDatesMap[sd].bq[sBu] = { req:0, alloc:0, ship:0, actShort:0, pu:0, plt:0, ordTotal:0, ordFull:0 };
                        }
                        let bItem = rawBq[rawBu];
                        unifiedDatesMap[sd].bq[sBu].ordTotal += parseFloat(bItem.ordTotal || 0);
                        let perfectOrders = parseFloat(bItem.ordFull || bItem.perfectOrders || 0);
                        unifiedDatesMap[sd].bq[sBu].ordFull += perfectOrders;
                        
                        unifiedDatesMap[sd].bq[sBu].req += parseFloat(bItem.req || 0);
                        unifiedDatesMap[sd].bq[sBu].alloc += parseFloat(bItem.alloc || 0);
                        unifiedDatesMap[sd].bq[sBu].ship += parseFloat(bItem.ship || 0);
                        unifiedDatesMap[sd].bq[sBu].actShort += parseFloat(bItem.actShort || 0); 
                        unifiedDatesMap[sd].bq[sBu].pu += parseFloat(bItem.pu || 0);
                        unifiedDatesMap[sd].bq[sBu].plt += parseFloat(bItem.plt || 0);
                    }
                });
            } catch(e) {}
        });

        delete unifiedDatesMap[""];
        let sortedDates = Object.keys(unifiedDatesMap).sort((a,b) => safeParseDate(b).getTime() - safeParseDate(a).getTime());

        let htmlTable = ``;
        let buNamesSet = new Set();
        let chartDataMap = {};

        let validChartDates = sortedDates.filter(d => {
            let t = safeParseDate(d).getTime();
            return t >= targetStart && t <= targetEnd;
        }).reverse(); 

        if (validChartDates.length === 0) {
            htmlTable += `<tr><td colspan="14" class="text-center text-muted">ไม่มีข้อมูลในช่วงที่เลือก</td></tr>`;
        } else {
            [...validChartDates].reverse().forEach(dateStr => {
                let parts = dateStr.split('-');
                let displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
                
                let bqData = unifiedDatesMap[dateStr].bq || {};
                let wData = unifiedDatesMap[dateStr].wave || {};
                let fData = unifiedDatesMap[dateStr].ffm || {};
                
                let allBUsInDay = new Set([...Object.keys(bqData), ...Object.keys(wData), ...Object.keys(fData)]);
                let sortedOwners = Array.from(allBUsInDay).filter(o => o !== 'UNKNOWN' && o !== '').sort();

                let dayReq = 0, dayAlloc = 0, dayShip = 0, dayOrdTotal = 0, dayOrdFull = 0, dayActShort = 0, dayPu = 0, dayPlt = 0;

                sortedOwners.forEach(bu => {
                    if (window.selectedBUs && !window.selectedBUs.includes('ALL') && !window.selectedBUs.includes(bu)) return;
                    buNamesSet.add(bu);
                    const bItem = bqData[bu] || {}; const wItem = wData[bu] || {}; const fItem = fData[bu] || {};
                    const bData = getBestOrderData(bItem, wItem, fItem);
                    
                    dayOrdTotal += bData.tot; 
                    dayOrdFull += bData.full;
                    dayReq += Math.max(parseFloat(bItem.req || 0), parseFloat(fItem.req || 0));
                    dayAlloc += parseFloat(bItem.alloc || 0); 
                    dayShip += parseFloat(bItem.ship || 0);
                    dayActShort += parseFloat(bItem.actShort || 0);
                    dayPu += parseFloat(bItem.pu || 0); 
                    dayPlt += parseFloat(bItem.plt || 0);
                });

                if(dayOrdTotal > 0 || dayReq > 0) {
                    let ordSlaSum = dayOrdTotal > 0 ? (dayOrdFull / dayOrdTotal) * 100 : 0;
                    let dcSlaSum = dayAlloc > 0 ? (dayShip / dayAlloc) * 100 : 0;
                    let ffmSum = dayReq > 0 ? (dayShip / dayReq) * 100 : 0;
                    
                    htmlTable += `<tr class="summary-row">
                        <td colspan="2" class="font-bold text-dark text-sm">📅 ${displayDate} - SUMMARY</td>
                        <td class="text-right font-bold text-sm">${fmtN(dayOrdTotal)}</td>
                        <td class="text-right font-bold text-sm">${fmtN(dayReq)}</td>
                        <td class="text-right font-bold text-sm">${fmtN(dayAlloc)}</td>
                        <td class="text-green font-bold text-right text-sm">${fmtN(dayShip)}</td>
                        <td class="text-right font-bold text-sm">${fmtN(Math.max(0, dayReq - dayAlloc))}</td>
                        <td class="text-right font-bold text-red text-sm">${fmtN(dayActShort)}</td>
                        <td class="text-center font-bold text-sm">${ordSlaSum.toFixed(1)}%</td>
                        <td class="text-center font-bold text-sm">${dcSlaSum.toFixed(1)}%</td>
                        <td class="text-center font-bold text-sm">${ffmSum.toFixed(1)}%</td>
                        <td class="text-right text-muted">-</td>
                        <td class="text-right text-muted">-</td>
                        <td class="text-right font-bold text-sm">${dayPlt.toFixed(1)}</td>
                    </tr>`;
                }

                sortedOwners.forEach(bu => {
                    if (window.selectedBUs && !window.selectedBUs.includes('ALL') && !window.selectedBUs.includes(bu)) return;
                    const bItem = bqData[bu] || {}; const wItem = wData[bu] || {}; const fItem = fData[bu] || {};
                    const bData = getBestOrderData(bItem, wItem, fItem);
                    const ordTotal = bData.tot; const ordFull = bData.full;
                    
                    const req = Math.max(parseFloat(bItem.req || 0), parseFloat(fItem.req || 0));
                    const alloc = parseFloat(bItem.alloc || 0); const ship = parseFloat(bItem.ship || 0);
                    const actShort = parseFloat(bItem.actShort || 0);
                    const pu = parseFloat(bItem.pu || 0); const plt = parseFloat(bItem.plt || 0);
                    const estShort = Math.max(0, req - alloc);

                    const bqOrdTotal = parseFloat(bItem.ordTotal || 0); const bqOrdFull  = parseFloat(bItem.ordFull  || 0);
                    const ordSLA = bqOrdTotal > 0 ? Math.max(0, Math.min(1, bqOrdFull / bqOrdTotal)) : null;
                    const dcSLA = alloc > 0 ? Math.min(1, (ship / alloc)) : null;
                    const ffm = req > 0 ? Math.min(1, (ship / req)) : null;
                    const pcsPick = pu > 0 ? (req / pu) : null;
                    const pcsOrd = ordTotal > 0 ? (req / ordTotal) : null;

                    const colorPct = (v) => {
                        if (v === null || v === undefined) return '<span class="text-muted">-</span>';
                        if (v >= 0.99) return `<span class="text-green font-bold">${(v*100).toFixed(1)}%</span>`;
                        if (v >= 0.95) return `<span class="text-orange font-bold">${(v*100).toFixed(1)}%</span>`;
                        return `<span class="text-red font-bold">${(v*100).toFixed(1)}%</span>`;
                    };

                    htmlTable += `<tr>
                        <td class="font-bold text-center" style="position:sticky; left:0; background:var(--bg-card); z-index:10;">${displayDate}</td>
                        <td class="font-bold text-center">${bu}</td>
                        <td class="text-right">${ordTotal > 0 ? fmtN(ordTotal) : 0}</td>
                        <td class="text-right">${req > 0 ? fmtN(req) : 0}</td>
                        <td class="text-right">${alloc > 0 ? fmtN(alloc) : 0}</td>
                        <td class="text-green font-bold text-right">${ship > 0 ? fmtN(ship) : 0}</td>
                        <td class="text-right">${estShort > 0 ? fmtN(estShort) : 0}</td>
                        <td class="text-right" style="color:${actShort > 0 ? 'var(--brand-red)' : 'inherit'};">${actShort > 0 ? fmtN(actShort) : 0}</td>
                        <td class="text-center">${colorPct(ordSLA)}</td>
                        <td class="text-center">${colorPct(dcSLA)}</td>
                        <td class="text-center">${colorPct(ffm)}</td>
                        <td class="text-right">${pcsPick !== null ? pcsPick.toFixed(1) : '-'}</td>
                        <td class="text-right">${pcsOrd !== null ? pcsOrd.toFixed(1) : '-'}</td>
                        <td class="text-right">${plt > 0 ? plt.toFixed(1) : '-'}</td>
                    </tr>`;

                    if (!chartDataMap[dateStr]) chartDataMap[dateStr] = { req:0, alloc:0, ship:0, ordTotal:0, ordFull:0, buShip: {}, buReq: {}, buOrd: {} };
                    chartDataMap[dateStr].req += req; 
                    chartDataMap[dateStr].alloc += alloc;
                    chartDataMap[dateStr].ship += ship; 
                    chartDataMap[dateStr].ordTotal += ordTotal;
                    chartDataMap[dateStr].ordFull += ordFull;
                    chartDataMap[dateStr].buShip[bu] = ship; 
                    chartDataMap[dateStr].buReq[bu] = req; 
                    chartDataMap[dateStr].buOrd[bu] = ordTotal;
                });
            });
        }

        let ffmTbl = document.getElementById('ffm-detail-table');
        if (ffmTbl) {
            ffmTbl.innerHTML = `<thead>
                <tr>
                    <th class="text-center" style="position:sticky; left:0; z-index:30;">Date</th>
                    <th class="text-center">Owner</th><th class="text-center">Orders</th><th class="text-center">Req</th>
                    <th class="text-center">ETA</th><th class="text-center">Ship</th><th class="text-center">Est.Short</th>
                    <th class="text-center">Act.Short</th><th class="text-center">Ord.SLA</th><th class="text-center">DC SLA</th>
                    <th class="text-center">FFM%</th><th class="text-center">Pcs/Pick</th><th class="text-center">Pcs/Ord</th>
                    <th class="text-center">Pallets</th>
                </tr>
            </thead><tbody>${htmlTable}</tbody>`;
        }

        let allBUsArray = Array.from(buNamesSet).sort();
        let chartBUsArray = window.selectedBUs.includes('ALL') ? allBUsArray : window.selectedBUs.filter(b => allBUsArray.includes(b));
        
        let pMap = {};
        validChartDates.forEach(dStr => {
            let pLabel = getPeriodLabel(safeParseDate(dStr), period);
            if(!pMap[pLabel]) pMap[pLabel] = { req:0, alloc:0, ship:0, ordTotal:0, ordFull:0, buReq:{} };
            
            let dData = chartDataMap[dStr];
            pMap[pLabel].req += dData.req || 0;
            pMap[pLabel].alloc += dData.alloc || 0;
            pMap[pLabel].ship += dData.ship || 0;
            pMap[pLabel].ordTotal += dData.ordTotal || 0;
            pMap[pLabel].ordFull += dData.ordFull || 0;

            chartBUsArray.forEach(bu => pMap[pLabel].buReq[bu] = (pMap[pLabel].buReq[bu]||0) + (dData.buReq[bu] || 0));
        });

        let pLabels = Object.keys(pMap);
        let latestPLabel = pLabels.length > 0 ? pLabels[pLabels.length - 1] : null;
        let prevPLabel = pLabels.length > 1 ? pLabels[pLabels.length - 2] : null;
        let curPData = latestPLabel ? pMap[latestPLabel] : null;
        let prvPData = prevPLabel ? pMap[prevPLabel] : null;

        let aTotal = curPData ? curPData.ordTotal : 0;
        let aReq = curPData ? curPData.req : 0;
        let prevTotal = prvPData ? prvPData.ordTotal : 0;
        
        if (document.getElementById('ffm-orders-shipped')) {
            document.getElementById('ffm-orders-shipped').innerText = fmtN(aTotal);
            document.getElementById('ffm-target-text').innerText = `Target: ${fmtN(aReq)}`;
            document.getElementById('ffm-orders-trend-box').innerHTML = generateTrendHtml(aTotal, prevTotal, false, false);
            document.getElementById('ffm-orders-update').innerText = `Updated: ${latestPLabel || '--'}`;
        }

        // 🌟 แก้ไข: วนหาข้อมูล FFM Rate ของวันล่าสุดที่มีการส่งของจริงๆ (Ship > 0)
        let latestShipDateStr = null, prevShipDateStr = null;
        let revDates = [...validChartDates].reverse();
        for (let d of revDates) {
            let s = chartDataMap[d]?.ship || 0;
            if (s > 0) { 
                if (!latestShipDateStr) latestShipDateStr = d; 
                else if (!prevShipDateStr) { prevShipDateStr = d; break; } 
            }
        }
        
        if (latestShipDateStr && document.getElementById('ffm-rate-val')) {
            let curD = chartDataMap[latestShipDateStr];
            let prvd = prevShipDateStr ? chartDataMap[prevShipDateStr] : null;
            
            let currentFfm = curD.req > 0 ? (curD.ship / curD.req) * 100 : 0;
            let currentEtaFfm = curD.alloc > 0 ? Math.min(100, (curD.ship / curD.alloc) * 100) : 0;
            let prevFfm = (prvd && prvd.req > 0) ? (prvd.ship / prvd.req) * 100 : 0;
            
            document.getElementById('ffm-rate-val').innerText = `${currentFfm.toFixed(2)}%`;
            document.getElementById('ffm-rate-eta').innerText = `DC SLA: ${currentEtaFfm.toFixed(2)}%`;
            document.getElementById('ffm-rate-trend-box').innerHTML = generateTrendHtml(currentFfm, prevFfm, false, true);
            document.getElementById('ffm-rate-update').innerText = `Updated: ${formatShortDate(latestShipDateStr)}`;
        } else if (document.getElementById('ffm-rate-val')) {
            document.getElementById('ffm-rate-val').innerText = `0.00%`;
            document.getElementById('ffm-rate-eta').innerText = `DC SLA: 0.00%`;
            document.getElementById('ffm-rate-trend-box').innerHTML = `<span class="trend-badge trend-neutral">-</span>`;
            document.getElementById('ffm-rate-update').innerText = `Updated: --`;
        }

        try {
            if (typeof ffmTrendChartInstance !== 'undefined' && ffmTrendChartInstance && validChartDates.length > 0) {
                let tpDatasets = chartBUsArray.map((bu) => {
                    let colorObj = getBuColor(bu);
                    return {
                        label: bu,
                        data: pLabels.map(p => pMap[p].buReq[bu] || 0), 
                        backgroundColor: (context) => {
                            const chart = context.chart;
                            const {ctx, chartArea} = chart;
                            if (!chartArea) return colorObj.s;
                            return getGradient(ctx, chartArea, colorObj.s, colorObj.e);
                        },
                        borderRadius: 4
                    };
                });
                ffmTrendChartInstance.config.type = 'bar';
                ffmTrendChartInstance.data.labels = pLabels;
                ffmTrendChartInstance.data.datasets = tpDatasets;
                ffmTrendChartInstance.update();
            }

            if (typeof ffmVolumeChartInstance !== 'undefined' && ffmVolumeChartInstance && validChartDates.length > 0) {
                let mixLabels = []; let mixData = [];
                let totalOrdByBu = {};
                
                validChartDates.forEach(d => {
                    chartBUsArray.forEach(bu => {
                        totalOrdByBu[bu] = (totalOrdByBu[bu] || 0) + (chartDataMap[d]?.buOrd?.[bu] || 0);
                    });
                });
                
                chartBUsArray.forEach((bu) => {
                    if (totalOrdByBu[bu] > 0) { mixLabels.push(bu); mixData.push(totalOrdByBu[bu]); }
                });

                ffmVolumeChartInstance.data.labels = mixLabels;
                ffmVolumeChartInstance.data.datasets = [{
                    data: mixData,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return mixLabels.map(bu => getBuColor(bu).s);
                        return mixLabels.map(bu => getGradient(ctx, chartArea, getBuColor(bu).s, getBuColor(bu).e));
                    },
                    borderWidth: 0
                }];
                ffmVolumeChartInstance.update();
            } 
        } catch(chartErr) { }

        const utilTableEl = document.getElementById('utilization-table');
        if (utilTableEl && validChartDates.length > 0) {
            let targetD = validChartDates[validChartDates.length - 1]; 
            let tbody = "<tbody>";
            let utilData = [];

            chartBUsArray.forEach(bu => {
                let vol = chartDataMap[targetD]?.buReq?.[bu] || 0;
                let cap = getEffectiveCap(targetD, bu);

                if (vol > 0 || hasEffectiveCap(targetD, bu)) {
                    let utilPct = cap > 0 ? (vol / cap) * 100 : 0;
                    utilData.push({ bu: bu, vol: vol, cap: cap, utilPct: utilPct });
                }
            });

            utilData.sort((a, b) => b.utilPct - a.utilPct); 

            if (utilData.length === 0) {
                tbody += `<tr><td colspan="4" class="text-center text-muted">ไม่มีข้อมูล Volume</td></tr>`;
            } else {
                utilData.forEach(item => {
                    let utilDisp = Math.min(100, item.utilPct).toFixed(1);
                    let barWidth = Math.min(100, item.utilPct);
                    
                    let statusObj = { text: "Available", color: "#047857", bg: "#dcfce7", barClass: "grad-fill-blue" }; 
                    if (item.utilPct >= 100) { statusObj = { text: "Overloaded", color: "#991b1b", bg: "#fee2e2", barClass: "grad-fill-red" }; } 
                    else if (item.utilPct >= 90) { statusObj = { text: "Near cap.", color: "#92400e", bg: "#fef3c7", barClass: "grad-fill-orange" }; } 
                    else if (item.utilPct >= 70) { statusObj = { text: "Optimal", color: "#047857", bg: "#dcfce7", barClass: "grad-fill-green" }; }

                    tbody += `
                    <tr>
                        <td class="font-bold">${item.bu}</td>
                        <td class="text-right font-bold">${fmtN(item.vol)}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="modern-bar-bg">
                                    <div class="${statusObj.barClass}" style="width:${barWidth}%;"></div>
                                </div>
                                <span style="font-size:11px; font-weight:700; width:45px; text-align:right; color:var(--text-dark);">${utilDisp}%</span>
                            </div>
                        </td>
                        <td class="text-center">
                            <span style="padding:4px 10px; border-radius:6px; font-size:10px; font-weight:700; display:inline-block; width:80px; background:${statusObj.bg}; color:${statusObj.color};">${statusObj.text}</span>
                        </td>
                    </tr>`;
                });
            }
            tbody += "</tbody>";
            const theadEl = utilTableEl.querySelector('thead');
            utilTableEl.innerHTML = (theadEl ? theadEl.outerHTML : '') + tbody;
        }
        
        let aComp = 0, aLate = 0, aDelay = 0; let worstBU = ""; 
        if (validChartDates.length > 0) {
            let latestD = validChartDates[validChartDates.length - 1];
            let dailyTotal = 0;
            
            allBUsArray.forEach(bu => {
                let bData = getBestOrderData(unifiedDatesMap[latestD]?.bq?.[bu], unifiedDatesMap[latestD]?.wave?.[bu], unifiedDatesMap[latestD]?.ffm?.[bu]);
                let ordTotal = bData.tot; let ordFull = bData.full;
                let late = parseFloat(unifiedDatesMap[latestD]?.wave?.[bu]?.late_orders || 0);
                let delay = parseFloat(unifiedDatesMap[latestD]?.wave?.[bu]?.total_delay_mins || 0);

                dailyTotal += ordTotal; aComp += ordFull; aLate += late;
                if (delay > aDelay) { aDelay = delay; worstBU = bu; }
            });
            
            let diffDays = 0; let activeDateStr = "--";
            if (latestD) { 
                let dObj = safeParseDate(latestD);
                activeDateStr = isNaN(dObj.getTime()) ? latestD : `${String(dObj.getDate()).padStart(2, '0')} ${shortMonths[dObj.getMonth()]}`; 
                let todayD = new Date(); todayD.setHours(0,0,0,0); 
                let workDMid = safeParseDate(latestD); workDMid.setHours(0,0,0,0); 
                diffDays = Math.floor((todayD - workDMid) / (1000 * 60 * 60 * 24)); 
            }

            if (document.getElementById('wave-total')) {
                document.getElementById('wave-total').innerText = dailyTotal > 0 ? fmtN(dailyTotal) : "0";
                document.getElementById('wave-completed').innerText = aComp > 0 ? fmtN(aComp) : "0";
                document.getElementById('wave-late').innerText = aLate > 0 ? fmtN(aLate) : "0";
                let delayEl = document.getElementById('wave-delay');
                if (delayEl) {
                    if (aDelay > 0) delayEl.innerText = `${Math.floor(aDelay / 60)}h ${aDelay % 60}m`;
                    else delayEl.innerText = `0h 0m`;
                }
                
                let waveStats = { total_orders: 0, late_pick_orders: 0, late_load_orders: 0, max_pick_delay_mins: 0, max_load_delay_mins: 0, min_pick_early_mins: null, min_load_early_mins: null, picked_orders: 0, shipped_orders: 0 };
                try {
                    let queryDate = latestD ? safeParseDate(latestD).toISOString().split('T')[0] : "";
                    const waveResp = await fetch("https://dc-ordermonitoring-backend.onrender.com/api/run", {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: 'apiGetWaveMonitoring', args: [queryDate, queryDate] })
                    });
                    if (waveResp.ok) {
                        const waveJson = await waveResp.json();
                        if (waveJson.success && waveJson.data && waveJson.data.length > 0) {
                            waveStats = waveJson.data[0];
                        }
                    }
                } catch (err) {}

                let isApiSuccess = (parseInt(waveStats.total_orders) > 0);
                let latePick = isApiSuccess ? (parseInt(waveStats.late_pick_orders) || 0) : 0;
                let lateLoad = isApiSuccess ? (parseInt(waveStats.late_load_orders) || 0) : aLate;
                let totalLate = Math.max(latePick + lateLoad, (aLate || 0));

                let maxPickDelay = isApiSuccess ? (parseInt(waveStats.max_pick_delay_mins) || 0) : 0;
                let maxLoadDelay = isApiSuccess ? (parseInt(waveStats.max_load_delay_mins) || 0) : (aDelay > 0 ? aDelay : 0);
                let maxOverallDelay = Math.max(maxPickDelay, maxLoadDelay, (aDelay || 0));
                let pEarly = isApiSuccess ? parseInt(waveStats.min_pick_early_mins) : null;
                let lEarly = isApiSuccess ? parseInt(waveStats.min_load_early_mins) : null;
                const formatTime = (mins) => `${Math.floor(mins/60)}h ${mins%60}m`;

                if (document.getElementById('wave-late')) {
                    document.getElementById('wave-late').innerText = totalLate > 0 ? fmtN(totalLate) : "0";
                    let info3 = document.getElementById('wave-active-info-3');
                    if (info3) {
                        if (totalLate > 0) {
                            if (isApiSuccess && (latePick + lateLoad) > 0) {
                                info3.innerHTML = `<span class="trend-badge">หลุด SLA: Pick ${fmtN(latePick)} | Load ${fmtN(lateLoad)}</span>`;
                            } else {
                                info3.innerHTML = `<span class="trend-badge">หลุด SLA: ${fmtN(totalLate)} บิล</span>`;
                            }
                        } else {
                            info3.innerHTML = `<span class="trend-badge" style="background:rgba(0,0,0,0.15);">On-time ทุกบิล</span>`;
                        }
                    }
                }

                if (document.getElementById('wave-delay')) {
                    let pStr = "Done", lStr = "Done", overallMainText = "0h 0m";
                    if (isApiSuccess) {
                        if (maxPickDelay > 0) { pStr = `Delay ${formatTime(maxPickDelay)}`; overallMainText = formatTime(maxOverallDelay); }
                        else if (!isNaN(pEarly) && pEarly !== null) { pStr = `Early ${formatTime(pEarly)}`; }

                        if (maxLoadDelay > 0) { lStr = `Delay ${formatTime(maxLoadDelay)}`; overallMainText = formatTime(maxOverallDelay); }
                        else if (!isNaN(lEarly) && lEarly !== null) { lStr = `Early ${formatTime(lEarly)}`; }
                        
                        document.getElementById('wave-active-info-4').innerHTML = `<span style="font-size:0.75rem; color:rgba(255,255,255,0.9);">Pick: ${pStr} &bull; Load: ${lStr}</span>`;
                    } else {
                        if (aDelay > 0) {
                            overallMainText = formatTime(aDelay);
                            document.getElementById('wave-active-info-4').innerHTML = `<span class="trend-badge">ดีเลย์ช้าสุด: ${worstBU}</span>`;
                        } else {
                            document.getElementById('wave-active-info-4').innerHTML = `<span class="trend-badge" style="background:rgba(0,0,0,0.15);">เวลาปกติ</span>`;
                        }
                    }
                    if (maxOverallDelay > 0) overallMainText = formatTime(maxOverallDelay);
                    document.getElementById('wave-delay').innerText = overallMainText;
                }

                if (document.getElementById('stage-pick-pct')) {
                    let fTotal = dailyTotal > 0 ? dailyTotal : (parseInt(waveStats.total_orders) || 0);
                    let isDataIncomplete = (isApiSuccess === false);
                    let fPicked = isDataIncomplete ? aComp : (parseInt(waveStats.picked_orders) || 0);
                    let fShipped = isDataIncomplete ? aComp : (parseInt(waveStats.shipped_orders) || 0);
                    let fQcDone = isDataIncomplete ? fShipped : (parseInt(waveStats.qc_orders) || 0);

                    fPicked = Math.min(fPicked, fTotal);
                    fQcDone = Math.min(fQcDone, fPicked); 
                    fShipped = Math.min(fShipped, fQcDone); 
                    let fQcPending = Math.max(0, fPicked - fQcDone);

                    let pctPick = fTotal > 0 ? ((fPicked / fTotal) * 100).toFixed(1) : 0;
                    document.getElementById('stage-pick-pct').innerText = pctPick + '%';
                    document.getElementById('stage-pick-done').innerText = fmtN(fPicked);
                    document.getElementById('stage-pick-total').innerText = fmtN(fTotal);
                    if(document.getElementById('stage-pick-bar')) document.getElementById('stage-pick-bar').style.width = pctPick + '%';
                    document.getElementById('stage-pick-text').innerHTML = `⏳ รอดำเนินการหยิบ: <b>${fmtN(fTotal - fPicked)}</b> บิล`;

                    let pctQc = fTotal > 0 ? ((fQcDone / fTotal) * 100).toFixed(1) : 0;
                    document.getElementById('stage-qc-pct').innerText = pctQc + '%';
                    document.getElementById('stage-qc-done').innerText = fmtN(fQcDone); 
                    document.getElementById('stage-qc-pending').innerText = fmtN(fQcPending);
                    if(document.getElementById('stage-qc-bar')) document.getElementById('stage-qc-bar').style.width = pctQc + '%';
                    document.getElementById('stage-qc-text').innerHTML = `🔍 ค้างตรวจ/รอแพ็ค: <b>${fmtN(fQcPending)}</b> บิล`;

                    let pctShip = fTotal > 0 ? ((fShipped / fTotal) * 100).toFixed(1) : 0;
                    let pendingShip = Math.max(0, fTotal - fShipped);
                    document.getElementById('stage-ship-pct').innerText = pctShip + '%';
                    document.getElementById('stage-ship-done').innerText = fmtN(fShipped);
                    if(document.getElementById('stage-ship-pending')) document.getElementById('stage-ship-pending').innerText = fmtN(pendingShip);
                    if(document.getElementById('stage-ship-bar')) document.getElementById('stage-ship-bar').style.width = pctShip + '%';
                    document.getElementById('stage-ship-text').innerHTML = `📦 คงเหลือยังไม่ส่งออก: <b>${fmtN(pendingShip)}</b> บิล`;
                }
                
                let targetWaveDate = latestD;
                if (targetWaveDate) {
                    let dispDate = getDisplayDate(targetWaveDate);
                    ['1','2','3','4'].forEach(n => { let el = document.getElementById(`wave-date-${n}`); if(el) el.innerText = `Updated: ${dispDate}`; });
                    ['pick','qc','ship'].forEach(s => { let el = document.getElementById(`stage-${s}-date`); if(el) el.innerText = `Updated: ${dispDate}`; });
                }
                
                generateExecutiveAlerts(targetEnd, latestD, totalLate, maxOverallDelay, diffDays, worstBU);

                // --- กู้คืน WAVE PLAN SUMMARY ---
                const waveSummaryTable = document.getElementById('wave-summary-table');
                if (waveSummaryTable) {
                    if (validChartDates.length === 0 || allBUsArray.length === 0) {
                        waveSummaryTable.innerHTML = `<thead><tr><th class='text-center text-muted'>ไม่มีข้อมูลออเดอร์</th></tr></thead>`;
                    } else {
                        let thead = `<thead><tr><th class="text-center" style="position:sticky; left:0; z-index:20;">Planned Date</th>${allBUsArray.map(bu => `<th class="text-center">${bu}</th>`).join('')}<th class="text-center">Total (เสร็จ/ทั้งหมด)</th><th class="text-center">% Completed</th></tr></thead>`;
                        let tbody = "<tbody>";
                        
                        [...validChartDates].reverse().forEach(dStr => {
                            let dObj = safeParseDate(dStr);
                            let dispDate = isNaN(dObj.getTime()) ? dStr : `${String(dObj.getDate()).padStart(2, '0')} ${shortMonths[dObj.getMonth()]}`;
                            
                            let tr = `<tr><td class="text-center font-bold" style="position:sticky; left:0; background:var(--bg-card); z-index:10;">${dispDate}</td>`;
                            let dayTot = 0, dayComp = 0;
                            
                            allBUsArray.forEach(bu => {
                                let bData = getBestOrderData(unifiedDatesMap[dStr]?.bq?.[bu], unifiedDatesMap[dStr]?.wave?.[bu], unifiedDatesMap[dStr]?.ffm?.[bu]);
                                let ordTotal = bData.tot; let ordFull = bData.full;
                                dayTot += ordTotal; dayComp += ordFull;
                                if (ordTotal === 0) { tr += `<td class="text-center text-muted">-</td>`; } 
                                else {
                                    let color = (ordFull === ordTotal) ? 'var(--brand-green)' : (ordFull > 0 ? 'var(--brand-yellow)' : 'var(--brand-red)');
                                    tr += `<td class="text-center"><span style="color:${color}; font-weight:700;">${fmtN(ordFull)}</span> <span class="text-xs text-muted">/ ${fmtN(ordTotal)}</span></td>`;
                                }
                            });
                            
                            let grandColor = (dayComp === dayTot && dayTot > 0) ? 'var(--brand-green)' : (dayComp > 0 ? 'var(--brand-yellow)' : 'var(--brand-red)');
                            tr += `<td class="text-center"><span style="color:${grandColor}; font-weight:700;">${fmtN(dayComp)}</span> <span class="text-xs text-muted">/ ${fmtN(dayTot)}</span></td>`;
                            
                            let pct = dayTot > 0 ? Math.min(100, (dayComp / dayTot) * 100).toFixed(2) : 0;
                            let pctBg = pct >= 100 ? '#dcfce7' : (pct > 0 ? '#fef3c7' : '#fee2e2');
                            let pctColor = pct >= 100 ? '#10B981' : (pct > 0 ? '#F59E0B' : '#EF4444');
                            tr += `<td class="text-center"><span style="background:${pctBg}; color:${pctColor}; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">${pct}%</span></td></tr>`;
                            tbody += tr;
                        });
                        waveSummaryTable.innerHTML = thead + tbody + "</tbody>";
                    }
                }
            }
        }

    } catch (err) {}
}

// ----------------------------------------------------
// WORKFORCE 
// ----------------------------------------------------
function updateWorkforceUI() {
    const totalEl = document.getElementById('headcount-total');
    const updEl = document.getElementById('headcount-update');
    const trendBox = document.getElementById('hc-trend-box');

    if (!globalData.workforce || Object.keys(globalData.workforce).length === 0) {
        if(totalEl) totalEl.innerText = "0";
        if(updEl) updEl.innerText = "Updated: --";
        return;
    }
    
    // 🌟 ดึง Date ด้วยการใช้ฟังก์ชัน safeParseDate ที่กันบัค Timezone แล้ว 🌟
    const targetStartObj = safeParseDate(document.getElementById('date-start').value);
    const targetEndObj = safeParseDate(document.getElementById('date-end').value);
    const targetStart = targetStartObj.setHours(0, 0, 0, 0);
    const targetEnd = targetEndObj.setHours(23, 59, 59, 999);
    
    let wfKeys = Object.keys(globalData.workforce).sort((a,b) => safeParseDate(a).getTime() - safeParseDate(b).getTime());
    let validKeys = wfKeys.filter(k => { let t = safeParseDate(k).getTime(); return t >= targetStart && t <= targetEnd; });
    
    let displayKey = validKeys.length > 0 ? validKeys[validKeys.length-1] : wfKeys.find(k => safeParseDate(k).getTime() <= targetEnd);
    let prevKey = wfKeys[wfKeys.indexOf(displayKey) - 1]; 

    const calcTotal = (dObj) => {
        if (!dObj) return 0;
        let sum = 0;
        Object.keys(dObj.matrix || {}).forEach(aff => {
            if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(aff)) {
                Object.keys(dObj.matrix[aff]).forEach(r => Object.values(dObj.matrix[aff][r]).forEach(val => sum += val));
            }
        });
        return sum;
    };

    if (displayKey) {
        let opsTotal = calcTotal(globalData.workforce[displayKey]);
        let prevTotal = prevKey ? calcTotal(globalData.workforce[prevKey]) : null;

        if (totalEl) totalEl.innerText = fmtN(opsTotal);
        if (updEl) updEl.innerText = `Updated: ${getDisplayDate(displayKey)}`;
        if (trendBox) trendBox.innerHTML = generateTrendHtml(opsTotal, prevTotal, false, false);

        if (globalData.workforce[displayKey].nationality) {
            let nT = 0, nF = 0;
            Object.keys(globalData.workforce[displayKey].nat_by_aff || {}).forEach(aff => {
                if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(aff)) {
                    nT += (globalData.workforce[displayKey].nat_by_aff[aff].thai || 0); nF += (globalData.workforce[displayKey].nat_by_aff[aff].foreign || 0);
                }
            });
            if (document.getElementById('wf-thai')) document.getElementById('wf-thai').innerText = fmtN(nT);
            if (document.getElementById('wf-foreign')) document.getElementById('wf-foreign').innerText = fmtN(nF);
        }
    } else {
        if(totalEl) totalEl.innerText = "0";
        if(updEl) updEl.innerText = "Updated: --";
    }

    let dynamicTeamsSet = new Set();
    Object.values(globalData.workforce).forEach(day => {
        Object.values(day.matrix || {}).forEach(aff => {
            Object.values(aff).forEach(roleObj => { Object.keys(roleObj).forEach(t => dynamicTeamsSet.add(t)); });
        });
    });
    let dynamicTeams = Array.from(dynamicTeamsSet).filter(t => t && t !== "N/A").sort();
    if (dynamicTeams.length === 0) dynamicTeams = ["A", "B", "C"]; 

    if (validKeys.length > 0) {
        let chartKeys = validKeys.slice(-7);
        let affSet = new Set();
        chartKeys.forEach(k => Object.keys(globalData.workforce[k]?.matrix || {}).forEach(aff => {
            if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(aff)) affSet.add(aff);
        }));
        let affList = Array.from(affSet).sort();
        let period = document.getElementById('global-period').value;

        let pMap = {};
        chartKeys.forEach(k => {
            let pLabel = getPeriodLabel(safeParseDate(k), period);
            if(!pMap[pLabel]) pMap[pLabel] = {};
            affList.forEach(aff => {
                let m = globalData.workforce[k]?.matrix?.[aff]; 
                let sum=0; if(m) Object.keys(m).forEach(r => Object.values(m[r]).forEach(v => sum+=v));
                pMap[pLabel][aff] = Math.max(pMap[pLabel][aff]||0, sum);
            });
        });
        
        let pLabels = Object.keys(pMap);
        let datasets = affList.map((aff) => {
            let colorObj = getBuColor(aff);
            return {
                label: aff, data: pLabels.map(p => pMap[p][aff] || 0),
                backgroundColor: (ctx) => (!ctx.chart.chartArea) ? colorObj.s : getGradient(ctx.chart.ctx, ctx.chart.chartArea, colorObj.s, colorObj.e),
                borderRadius: 4, stack: 'hc'
            };
        });

        if(workforceChartInstance) {
            workforceChartInstance.data.labels = pLabels;
            workforceChartInstance.data.datasets = datasets;
            workforceChartInstance.update();
        }

        const matrixTable = document.getElementById('wf-matrix-table');
        if (matrixTable && displayKey) {
            let d = globalData.workforce[displayKey];
            let opsTotal = calcTotal(d);
            let affiliations = Object.keys(d.matrix || {}).sort();
            if (!window.selectedBUs.includes('ALL')) affiliations = affiliations.filter(a => window.selectedBUs.includes(a));
            
            let rolesSet = new Set();
            affiliations.forEach(aff => { if(d.matrix[aff]) Object.keys(d.matrix[aff]).forEach(r => rolesSet.add(r)); });
            const roles = Array.from(rolesSet);

            if (affiliations.length === 0) {
                matrixTable.innerHTML = `<thead><tr><th class='text-center text-muted'>ไม่มีข้อมูล MATRIX ของวันที่เลือก</th></tr></thead>`;
            } else {
                let natData = { thai: 0, foreign: 0 };
                Object.keys(d.nat_by_aff || {}).forEach(aff => {
                    if (affiliations.includes(aff)) {
                        natData.thai += d.nat_by_aff[aff].thai || 0;
                        natData.foreign += d.nat_by_aff[aff].foreign || 0;
                    }
                });

                let headerHtml = `<thead>
                    <tr>
                        <th rowspan="2" style="position:sticky; left:0; top:0; z-index:20; background:var(--bg-card);">Role / หน้าที่</th>`;
                affiliations.forEach(aff => { headerHtml += `<th colspan="${dynamicTeams.length + 1}" class="text-center matrix-border-left" style="position:sticky; top:0; z-index:15; background:var(--bg-card);">${aff}</th>`; });
                
                headerHtml += `<th rowspan="2" class="text-center matrix-border-left matrix-total-col" style="position:sticky; top:0; z-index:15;">Grand Total</th>
                               <th colspan="2" class="text-center text-blue matrix-border-left" style="position:sticky; top:0; z-index:15; background:var(--bg-card);">สัญชาติ (Nat.)</th>
                               <th rowspan="2" class="text-center matrix-border-left" style="position:sticky; top:0; z-index:15; background:var(--bg-card);">% Ratio</th>
                    </tr><tr>`;
                
                affiliations.forEach(() => { 
                    dynamicTeams.forEach((t, idx) => { let bClass = idx === 0 ? 'matrix-border-left' : ''; headerHtml += `<th class="text-center ${bClass}" style="position:sticky; top:36px; z-index:15; background:var(--bg-card);">${t}</th>`; }); 
                    headerHtml += `<th class="text-center matrix-total-col" style="position:sticky; top:36px; z-index:15;">Total</th>`; 
                });
                
                headerHtml += `<th class="text-center text-muted matrix-border-left" style="position:sticky; top:36px; z-index:15; background:var(--bg-card);">🇹🇭 ไทย</th>
                               <th class="text-center text-muted" style="position:sticky; top:36px; z-index:15; background:var(--bg-card);">🌐 ต่างชาติ</th>
                    </tr></thead>`;

                let bodyHtml = "<tbody>";
                let grandTotalAll = 0; let colSums = {};

                roles.forEach(role => {
                    let roleGrandTotal = 0; 
                    let roleRowHtml = `<td style="position:sticky; left:0; z-index:10; font-weight:700; background:var(--bg-card);">${role}</td>`;
                    
                    let roleThai = 0, roleForeign = 0;
                    if(d.foreign_staff) d.foreign_staff.forEach(staff => { if(staff.role === role && affiliations.includes(staff.aff)) roleForeign++; });

                    affiliations.forEach(aff => {
                        let affRoleTotal = 0;
                        dynamicTeams.forEach((team, idx) => {
                            let count = d.matrix[aff]?.[role]?.[team] || 0;
                            affRoleTotal += count; 
                            colSums[`${aff}_${team}`] = (colSums[`${aff}_${team}`] || 0) + count;
                            let bClass = idx === 0 ? 'matrix-border-left' : '';
                            roleRowHtml += `<td class="text-center ${bClass}">${count > 0 ? count : '-'}</td>`;
                        });
                        roleGrandTotal += affRoleTotal;
                        colSums[`${aff}_Total`] = (colSums[`${aff}_Total`] || 0) + affRoleTotal;
                        roleRowHtml += `<td class="text-center matrix-total-col">${affRoleTotal > 0 ? affRoleTotal : '-'}</td>`;
                    });
                    
                    roleThai = Math.max(0, roleGrandTotal - roleForeign);
                    let grandPct = opsTotal > 0 ? ((roleGrandTotal / opsTotal) * 100).toFixed(1) + "%" : "0%";
                    grandTotalAll += roleGrandTotal;
                    
                    bodyHtml += `<tr>
                        ${roleRowHtml}
                        <td class="text-center matrix-border-left matrix-total-col" style="color:var(--brand-blue) !important;">${roleGrandTotal > 0 ? roleGrandTotal : '-'}</td>
                        <td class="text-center text-green font-bold matrix-border-left">${roleThai > 0 ? roleThai : '-'}</td>
                        <td class="text-center text-blue font-bold">${roleForeign > 0 ? roleForeign : '-'}</td>
                        <td class="text-center text-muted matrix-border-left">${roleGrandTotal > 0 ? grandPct : '-'}</td>
                    </tr>`;
                });
                
                let footerHtml = `<tr><td style="position:sticky; left:0; z-index:10; background:var(--bg-card); font-weight:800; border-top:2px solid var(--border-color);">OVERALL</td>`;
                affiliations.forEach(aff => {
                    dynamicTeams.forEach((team, idx) => {
                        let count = colSums[`${aff}_${team}`] || 0;
                        let bClass = idx === 0 ? 'matrix-border-left' : '';
                        footerHtml += `<td class="text-center ${bClass}" style="font-weight:700; border-top:2px solid var(--border-color);">${count > 0 ? count : '-'}</td>`;
                    });
                    let affTot = colSums[`${aff}_Total`] || 0;
                    footerHtml += `<td class="text-center matrix-total-col" style="border-top:2px solid var(--border-color);">${affTot > 0 ? affTot : '-'}</td>`;
                });
                footerHtml += `<td class="text-center matrix-border-left matrix-total-col" style="font-size:1rem; color:var(--brand-blue) !important; border-top:2px solid var(--border-color);">${grandTotalAll > 0 ? grandTotalAll : '-'}</td>
                             <td class="text-center text-green matrix-border-left" style="font-weight:800; border-top:2px solid var(--border-color);">${natData.thai > 0 ? natData.thai : '-'}</td>
                             <td class="text-center text-blue" style="font-weight:800; border-top:2px solid var(--border-color);">${natData.foreign > 0 ? natData.foreign : '-'}</td>
                             <td class="text-center text-muted matrix-border-left" style="border-top:2px solid var(--border-color);">100%</td>
                </tr>`;

                matrixTable.innerHTML = headerHtml + bodyHtml + footerHtml + "</tbody>";
            }
        }

        const attBody = document.getElementById('daily-attendance-body');
        const attHead = document.getElementById('daily-attendance-head');
        if (attHead) {
            let h = `<tr>
                <th rowspan="2" style="position:sticky; left:0; top:0; z-index:25; background:var(--bg-card); min-width:120px; box-shadow:inset -1px 0 0 var(--border-color);">DATE / DEPT.</th>
                <th rowspan="2" style="position:sticky; top:0; z-index:15; background:var(--bg-card);">TARGET</th>
                <th rowspan="2" style="position:sticky; top:0; z-index:15; background:var(--bg-card);">ACTUAL</th>
                <th rowspan="2" style="position:sticky; top:0; z-index:15; background:var(--bg-card);">ABSENT</th>
                <th rowspan="2" style="position:sticky; top:0; z-index:15; background:var(--bg-card); border-right:2px solid var(--border-color);">RATE</th>`;
            dynamicTeams.forEach(t => { h += `<th colspan="4" class="team-divider" style="position:sticky; top:0; z-index:15; background:var(--bg-card);">Team ${t}</th>`; });
            h += `</tr><tr>`;
            dynamicTeams.forEach(() => { 
                h += `<th class="team-divider" style="position:sticky; top:36px; z-index:15; background:var(--bg-card);">TRG</th>
                      <th style="position:sticky; top:36px; z-index:15; background:var(--bg-card);">ACT</th>
                      <th style="position:sticky; top:36px; z-index:15; background:var(--bg-card);">ABS</th>
                      <th style="position:sticky; top:36px; z-index:15; background:var(--bg-card);">%</th>`; 
            });
            h += `</tr>`;
            attHead.innerHTML = h;
        }
        
        let excelHtml = "";
        const tableRows = [ { key: 'Pick', label: 'Pick' }, { key: 'RT', label: 'RT' }, { key: 'QCQA', label: 'QC / QA' }, { key: 'Grouping', label: 'Grouping' }, { key: 'Putaway', label: 'Put-away' }, { key: 'Receive', label: 'Receive' } ];
        
        validKeys.slice(0, 14).forEach(dateKey => {
            const data = globalData.workforce[dateKey];
            excelHtml += `<tr><td colspan="${5 + (dynamicTeams.length * 4)}" style="background:var(--bg-body); font-weight:700;">Date: ${getDisplayDate(dateKey)}</td></tr>`;
            
            tableRows.forEach(r => {
                let act = 0, trgTot = 0;
                if (r.key === 'QCQA') { act = (data.roles?.QC || 0) + (data.roles?.QA || 0); trgTot = (data.targets?.QC || 0) + (data.targets?.QA || 0); } 
                else { act = data.roles?.[r.key] || 0; trgTot = data.targets?.[r.key] || 0; }

                const calcAbs = (a, t) => (t===0&&a===0) ? '-' : (a-t<0 ? `<span class="text-red font-bold">${a-t}</span>` : a-t);
                const calcRate = (a, t) => t===0 ? '-' : `<span class="${(a/t*100)<95?'text-red':'text-green'} font-bold">${(a/t*100).toFixed(2)}%</span>`;

                let rowHtml = `<tr>
                    <td style="position:sticky; left:0; background:var(--bg-card); z-index:10; font-weight:600;">${r.label}</td>
                    <td class="text-center">${trgTot>0?trgTot:'-'}</td><td class="text-center">${act>0?act:'-'}</td><td class="text-center">${calcAbs(act, trgTot)}</td><td class="text-center">${calcRate(act, trgTot)}</td>`;
                
                dynamicTeams.forEach(t => {
                    let tTrg = 0, tAct = 0;
                    if (r.key === 'QCQA') { tAct = (data.roleByTeam?.QC?.[t] || 0) + (data.roleByTeam?.QA?.[t] || 0); tTrg = (data.targetByTeam?.QC?.[t] || 0) + (data.targetByTeam?.QA?.[t] || 0); } 
                    else { tAct = data.roleByTeam?.[r.key]?.[t] || 0; tTrg = data.targetByTeam?.[r.key]?.[t] || 0; }
                    rowHtml += `<td class="text-center team-divider">${tTrg>0?tTrg:'-'}</td><td class="text-center">${tAct>0?tAct:'-'}</td><td class="text-center">${calcAbs(tAct, tTrg)}</td><td class="text-center">${calcRate(tAct, tTrg)}</td>`;
                });
                excelHtml += rowHtml + `</tr>`;
            });
        });
        if(attBody) attBody.innerHTML = excelHtml !== "" ? excelHtml : `<tr><td colspan="100%" class="text-center text-muted">ไม่มีข้อมูลในช่วงที่เลือก</td></tr>`;

    } else {
        const matrixTable = document.getElementById('wf-matrix-table');
        if (matrixTable) matrixTable.innerHTML = `<thead><tr><th class='text-center text-muted'>ไม่มีข้อมูลในช่วงที่เลือก</th></tr></thead>`;
        if(workforceChartInstance) { workforceChartInstance.data.labels = []; workforceChartInstance.update(); }
    }
}

// ----------------------------------------------------
// ON-TIME DELIVERY (MTD Logic)
// ----------------------------------------------------
function updateOnTimeUI() {
    const valEl = document.getElementById('ontime-val');
    const updEl = document.getElementById('ontime-update');
    let otSummary = document.getElementById('ontime-summary-box');

    if (!globalData.ontime || Object.keys(globalData.ontime).length === 0) {
        if(valEl) valEl.innerText = "-";
        if(updEl) updEl.innerText = "Updated: --";
        if(otSummary) { otSummary.innerHTML = "💡 ไม่มีข้อมูล On-Time ในช่วงที่เลือก"; otSummary.className = 'info-alert alert-yellow'; }
        return;
    }
    
    // 🌟 ดึง Date ด้วยการใช้ฟังก์ชัน safeParseDate ที่กันบัค Timezone แล้ว 🌟
    const targetEndObj = safeParseDate(document.getElementById('date-end').value);
    const targetEnd = targetEndObj.setHours(23, 59, 59, 999);
    const targetStartMTD = new Date(targetEndObj.getFullYear(), targetEndObj.getMonth(), 1).setHours(0, 0, 0, 0);
    
    let otArray = Object.keys(globalData.ontime || {}).map(k => ({
        dateObj: new Date(getStandardDate(k)), 
        ptglg: globalData.ontime[k], 
        hub: globalData.ontime_hub?.[k] || null
    })).filter(i => !isNaN(i.dateObj.getTime()) && i.dateObj.getTime() >= targetStartMTD && i.dateObj.getTime() <= targetEnd).sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (otArray.length > 0) {
        let mtdSum = 0; let mtdCount = 0;
        otArray.forEach(i => {
            let over = (i.ptglg !== null && i.hub !== null) ? (i.ptglg+i.hub)/2 : i.ptglg;
            if (over !== null) { mtdSum += over; mtdCount++; }
        });
        let curOver = mtdCount > 0 ? (mtdSum / mtdCount) : 0;
        
        if(valEl) valEl.innerText = `${curOver.toFixed(2)}%`;
        if(updEl) updEl.innerText = `Updated: ${getDisplayDate(otArray[otArray.length-1].dateObj)}`;
        
        let trendBox = document.getElementById('ontime-trend-box');
        if (trendBox) trendBox.innerHTML = generateTrendHtml(curOver, 0, false, true); 

        if (otSummary) {
            otSummary.innerHTML = `💡 <b>ภาพรวม MTD ล่าสุด:</b> อัตราการจัดส่งตรงเวลาอยู่ที่ <b>${curOver.toFixed(2)}%</b>`;
            otSummary.className = curOver >= 98 ? 'info-alert alert-green' : 'info-alert alert-red';
        }

        let pLabels = []; let plotData = []; let ptglgData = []; let hubData = [];
        otArray.forEach(i => {
            let lbl = formatShortDate(i.dateObj);
            pLabels.push(lbl);
            let v = (i.ptglg !== null && i.hub !== null) ? (i.ptglg+i.hub)/2 : i.ptglg;
            plotData.push(v !== null ? parseFloat(v.toFixed(2)) : null);
            ptglgData.push(i.ptglg !== null ? parseFloat(i.ptglg.toFixed(2)) : null);
            hubData.push(i.hub !== null ? parseFloat(i.hub.toFixed(2)) : null);
        });

        if(ontimeChartInstance) {
            ontimeChartInstance.data.labels = pLabels;
            let newDatasets = [];
            let showOverall = document.getElementById('cb-ot-overall')?.checked;
            let showPTGLG = document.getElementById('cb-ot-ptglg')?.checked;
            let showHUB = document.getElementById('cb-ot-hub')?.checked;
            if(!showOverall && !showPTGLG && !showHUB) showOverall = true;

            if(showOverall) {
                newDatasets.push({
                    label: 'ภาพรวม (Overall)', data: plotData, borderColor: '#10B981', 
                    backgroundColor: (ctx) => (!ctx.chart.chartArea) ? 'rgba(16, 185, 129, 0.4)' : getGradient(ctx.chart.ctx, ctx.chart.chartArea, 'rgba(16, 185, 129, 0.4)', 'rgba(16, 185, 129, 0.01)'),
                    borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4, isOverall: true
                });
            }
            if(showPTGLG) {
                newDatasets.push({
                    label: 'PTGLG', data: ptglgData, borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2, fill: false, tension: 0.4, pointRadius: 4, borderDash: [5, 5]
                });
            }
            if(showHUB) {
                newDatasets.push({
                    label: 'HUB', data: hubData, borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2, fill: false, tension: 0.4, pointRadius: 4, borderDash: [5, 5]
                });
            }
            ontimeChartInstance.data.datasets = newDatasets;
            ontimeChartInstance.update();
        }

        const otTable = document.getElementById('ontime-detail-table');
        if (otTable) {
            let thead = `<thead><tr><th style="text-align:center; position:sticky; top:0; left:0; z-index:20;">Date</th><th class="text-center">ภาพรวม</th><th class="text-center">PTGLG</th><th class="text-center">HUB</th></tr></thead>`;
            let tbody = "<tbody>" + pLabels.slice().reverse().map((p, idx) => {
                let revIdx = pLabels.length - 1 - idx;
                let _o = plotData[revIdx], pAvg = ptglgData[revIdx], hAvg = hubData[revIdx];
                const formatPct = (v) => {
                    if (v === null || v === undefined) return '<span class="text-muted">-</span>';
                    let clr = v >= 99 ? 'var(--brand-green)' : (v >= 95 ? 'var(--brand-yellow)' : 'var(--brand-red)');
                    return `<span style="color:${clr}; font-weight:700;">${v.toFixed(2)}%</span>`;
                };
                return `<tr><td style="text-align:center; position:sticky; left:0; background:var(--bg-card); z-index:10; font-weight:600;">${p}</td><td class="text-center">${formatPct(_o)}</td><td class="text-center">${formatPct(pAvg)}</td><td class="text-center">${formatPct(hAvg)}</td></tr>`;
            }).join('') + "</tbody>";
            otTable.innerHTML = thead + tbody;
        }
    } else {
        if(valEl) valEl.innerText = "-";
        if(updEl) updEl.innerText = "Updated: --";
        if (otSummary) { otSummary.innerHTML = "💡 ไม่มีข้อมูล On-Time MTD ในช่วงที่เลือก"; otSummary.className = 'info-alert alert-yellow'; }
        const otTable = document.getElementById('ontime-detail-table');
        if (otTable) otTable.innerHTML = `<thead><tr><th class="text-center text-muted">ไม่มีข้อมูลในช่วงที่เลือก</th></tr></thead>`;
        if(ontimeChartInstance) { ontimeChartInstance.data.labels = []; ontimeChartInstance.update(); }
    }
}

// ----------------------------------------------------
// CLAIM COST (MTD Logic + Owner Table FIXED)
// ----------------------------------------------------
function updateClaimUI() {
    const valEl = document.getElementById('claim-val');
    const updEl = document.getElementById('claim-update');
    const accumText = document.getElementById('claim-accum-text');
    const trendBox = document.getElementById('claim-trend-box');
    let claimSummary = document.getElementById('claim-summary-box');

    if (!globalData.claims || Object.keys(globalData.claims).length === 0) {
        if(valEl) valEl.innerText = "0";
        if(accumText) accumText.innerText = "YTD Accumulate: 0 ฿";
        if(claimSummary) { claimSummary.innerHTML = "💡 ไม่มียอดเคลม (0 บาท)"; claimSummary.className = 'info-alert alert-green'; }
        return;
    }

    // 🌟 ดึง Date ด้วยการใช้ฟังก์ชัน safeParseDate ที่กันบัค Timezone แล้ว 🌟
    const targetEndObj = safeParseDate(document.getElementById('date-end').value);
    const targetEnd = targetEndObj.setHours(23, 59, 59, 999);
    const targetStartMTD = new Date(targetEndObj.getFullYear(), targetEndObj.getMonth(), 1).setHours(0, 0, 0, 0);
    const targetMonth = targetEndObj.getMonth();
    const targetYear = targetEndObj.getFullYear();
    
    let allDatesData = [];
    let tableRecords = []; 
    
    Object.keys(globalData.claims).forEach(dKey => {
        let dObj = new Date(getStandardDate(dKey));
        if (!isNaN(dObj.getTime()) && dObj.getTime() <= targetEnd) { 
            let cTotalCost = 0; let cTotalQty = 0;
            let buDataMap = globalData.claims[dKey]?.bu_data || {};
            Object.keys(buDataMap).forEach(bu => {
                if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) {
                    let buData = buDataMap[bu];
                    let _cost = typeof buData === 'object' ? (buData.cost||0) : (buData||0);
                    let _qty = typeof buData === 'object' ? (buData.qty||0) : 0;
                    cTotalCost += _cost;
                    cTotalQty += _qty;
                    // 🌟 FIX: ใช้ dKey แทน dStr เพื่อป้องกัน Error
                    if(dObj.getTime() >= targetStartMTD && (_cost > 0 || _qty > 0)) {
                        tableRecords.push({ date: formatShortDate(dKey), owner: bu, cost: _cost, qty: _qty, ts: dObj.getTime() });
                    }
                }
            });
            if(cTotalCost>0 || cTotalQty>0) allDatesData.push({ dateObj: dObj, cost: cTotalCost, qty: cTotalQty });
        }
    });

    allDatesData.sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());
    tableRecords.sort((a,b) => a.ts - b.ts);

    let runningCost = 0; let currentMonthCost = 0; let prevMonthCost = 0;
    allDatesData.forEach(i => {
        runningCost += i.cost;
        i.accumCost = runningCost;
        let m = i.dateObj.getMonth(); let y = i.dateObj.getFullYear();
        if (m === targetMonth && y === targetYear) currentMonthCost += i.cost;
        let prevM = targetMonth === 0 ? 11 : targetMonth - 1; let prevY = targetMonth === 0 ? targetYear - 1 : targetYear;
        if (m === prevM && y === prevY) prevMonthCost += i.cost;
    });

    let mtdData = allDatesData.filter(i => i.dateObj.getTime() >= targetStartMTD);
    let latestAvailable = allDatesData.length > 0 ? allDatesData[allDatesData.length-1] : null;

    if (latestAvailable) {
        if(valEl) valEl.innerText = fmtN(parseFloat(currentMonthCost.toFixed(2))); 
        if(updEl) updEl.innerText = `Updated: ${getDisplayDate(latestAvailable.dateObj)}`;
        if(accumText) accumText.innerText = `YTD Accumulate: ${fmtN(parseFloat(latestAvailable.accumCost.toFixed(2)))} ฿`;
        if(trendBox) trendBox.innerHTML = generateTrendHtml(currentMonthCost, prevMonthCost, true, false);

        if (claimSummary) {
            claimSummary.innerHTML = `💡 <b>ภาพรวมเคลม MTD:</b> มียอดเคลมรวม <b>${fmtN(currentMonthCost)} ฿</b> (ยอดสะสมตั้งแต่ต้น: <b>${fmtN(latestAvailable.accumCost)} ฿</b>)`;
            claimSummary.className = currentMonthCost > 0 ? 'info-alert alert-red' : 'info-alert alert-green';
        }
    }

    if (mtdData.length > 0) {
        let pLabels = mtdData.map(i => formatShortDate(i.dateObj));
        if(claimChart2Instance) {
            claimChart2Instance.data.labels = pLabels;
            claimChart2Instance.data.datasets[0].data = mtdData.map(p => parseFloat(p.cost.toFixed(2)));
            claimChart2Instance.data.datasets[1].data = mtdData.map(p => p.qty);
            claimChart2Instance.data.datasets[0].backgroundColor = (ctx) => (!ctx.chart.chartArea) ? '#F59E0B' : getGradient(ctx.chart.ctx, ctx.chart.chartArea, '#F59E0B', '#D97706');
            claimChart2Instance.update();
        }

        const tableEl = document.getElementById('claim-detail-table');
        if (tableEl) {
            let thead = `<thead><tr><th style="position:sticky; top:0; left:0; z-index:20;">Date</th><th class="text-center">Owner</th><th class="text-center">มูลค่าเคลม (฿)</th><th class="text-center">จำนวนชิ้น</th></tr></thead>`;
            let tbody = "<tbody>" + tableRecords.slice().reverse().map(p => {
                return `<tr>
                    <td style="position:sticky; left:0; background:var(--bg-card); z-index:10; font-weight:600;">${p.date}</td>
                    <td class="text-center font-bold text-dark">${p.owner}</td>
                    <td class="text-center text-red font-bold">${fmtN(parseFloat(p.cost.toFixed(2)))}</td>
                    <td class="text-center">${fmtN(p.qty)}</td>
                </tr>`;
            }).join('') + "</tbody>";
            tableEl.innerHTML = thead + tbody;
        }
    } else {
        const tableEl = document.getElementById('claim-detail-table');
        if (tableEl) tableEl.innerHTML = `<thead><tr><th class="text-center text-muted">ไม่มีข้อมูลเคลม MTD</th></tr></thead>`;
        if(claimChart2Instance) { claimChart2Instance.data.labels = []; claimChart2Instance.update(); }
    }
}

// ----------------------------------------------------
// INVENTORY ACCURACY (MTD Logic + Filter)
// ----------------------------------------------------
function updateInventoryUI() {
    const valEl = document.getElementById('inv-val');
    const updEl = document.getElementById('inv-update');
    let invSummary = document.getElementById('inv-summary-box');

    if (!globalData.inventory_daily || Object.keys(globalData.inventory_daily).length === 0) {
        if(valEl) valEl.innerText = "-";
        if(updEl) updEl.innerText = "Updated: --";
        if(invSummary) invSummary.innerHTML = "💡 ไม่มีข้อมูล Inventory Accuracy";
        return;
    }

    // 🌟 ดึง Date ด้วยการใช้ฟังก์ชัน safeParseDate ที่กันบัค Timezone แล้ว 🌟
    const targetEndObj = safeParseDate(document.getElementById('date-end').value);
    const targetEnd = targetEndObj.setHours(23, 59, 59, 999);
    const targetStartMTD = new Date(targetEndObj.getFullYear(), targetEndObj.getMonth(), 1).setHours(0, 0, 0, 0);
    const ownerFilter = document.getElementById('inv-owner-filter')?.value || 'ALL';
    
    let allData = [];
    Object.keys(globalData.inventory_daily).forEach(dKey => {
        let dObj = new Date(getStandardDate(dKey));
        if(dObj.getTime() <= targetEnd) { 
            let dayGroup = globalData.inventory_daily[dKey] || {};
            let sumOnhand = 0, sumDiff = 0, count = 0;
            let buDataMap = dayGroup.bu_data || {};
            Object.keys(buDataMap).forEach(bu => {
                if ((window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) && (ownerFilter === 'ALL' || ownerFilter === bu)) {
                    sumOnhand += buDataMap[bu].onhand || 0; 
                    sumDiff += buDataMap[bu].diff || 0;     
                    count += buDataMap[bu].count || 0; 
                }
            });
            let pct = count > 0 ? (sumOnhand > 0 ? Math.max(0, (1 - (sumDiff/sumOnhand))*100) : 0) : null;
            allData.push({ dateStr: formatShortDate(dObj), dateObj: dObj, pct: pct, sumOnhand: sumOnhand, sumDiff: sumDiff });
        }
    });

    allData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    let runningInvOnhand = 0; let runningInvDiff = 0;
    allData.forEach(item => {
        runningInvOnhand += item.sumOnhand; runningInvDiff += item.sumDiff;
        item.accumPct = runningInvOnhand > 0 ? Math.max(0, (1 - (runningInvDiff / runningInvOnhand)) * 100) : null;
    });

    let mtdData = allData.filter(i => i.dateObj.getTime() >= targetStartMTD);
    let latestAvailable = mtdData.length > 0 ? mtdData[mtdData.length-1] : (allData.length > 0 ? allData[allData.length-1] : null);

    if (latestAvailable) {
        if(valEl) valEl.innerText = latestAvailable.pct !== null ? `${latestAvailable.pct.toFixed(2)}%` : "-";
        if(updEl) updEl.innerText = `Updated: ${latestAvailable.dateStr}`;
        
        let accumText = document.getElementById('inv-accum-text');
        if (accumText) accumText.innerText = `YTD Accumulate: ${latestAvailable.accumPct !== null ? latestAvailable.accumPct.toFixed(2) : 0}%`;

        if (invSummary) {
            invSummary.innerHTML = `💡 <b>ความแม่นยำสต็อกล่าสุด (${latestAvailable.dateStr}):</b> อยู่ที่ <b>${latestAvailable.pct !== null ? latestAvailable.pct.toFixed(2) : 0}%</b> (สะสม YTD: ${latestAvailable.accumPct !== null ? latestAvailable.accumPct.toFixed(2) : 0}%)`;
            invSummary.className = latestAvailable.pct >= 99 ? 'info-alert alert-green mt-10 text-sm' : 'info-alert alert-red mt-10 text-sm';
        }
    } else {
        if(valEl) valEl.innerText = "-";
        if(updEl) updEl.innerText = "Updated: --";
        if (invSummary) { invSummary.innerHTML = "💡 ไม่มีข้อมูล Inventory Accuracy"; invSummary.className = 'info-alert alert-yellow mt-10 text-sm'; }
    }

    if (mtdData.length > 0) {
        if(inventoryChartInstance) {
            inventoryChartInstance.data.labels = mtdData.map(i => i.dateStr);
            inventoryChartInstance.data.datasets[0] = {
                label: 'Accuracy %',
                data: mtdData.map(i => i.pct !== null ? parseFloat(i.pct.toFixed(2)) : null),
                borderColor: '#06B6D4',
                backgroundColor: (context) => {
                    if(!context.chart.chartArea) return 'rgba(6, 182, 212, 0.4)';
                    return getGradient(context.chart.ctx, context.chart.chartArea, 'rgba(6, 182, 212, 0.4)', 'rgba(6, 182, 212, 0.01)');
                },
                borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4
            };
            inventoryChartInstance.update();
        }

        const tableEl = document.getElementById('inv-detail-table');
        if (tableEl) {
            let thead = `<thead><tr><th style="text-align:center; position:sticky; top:0; left:0; z-index:20;">Date</th><th class="text-center">% Daily Acc.</th><th class="text-center">% Accumulate (YTD)</th></tr></thead>`;
            let tbody = "<tbody>" + mtdData.slice().reverse().map(i => {
                let clr = i.pct >= 99 ? 'var(--brand-green)' : 'var(--brand-red)';
                let accumClr = (i.accumPct && i.accumPct >= 99) ? 'var(--brand-green)' : 'var(--brand-red)';
                return `<tr>
                    <td style="text-align:center; position:sticky; left:0; background:var(--bg-card); z-index:10; font-weight:600;">${i.dateStr}</td>
                    <td class="text-center font-bold" style="color:${clr};">${i.pct !== null ? i.pct.toFixed(2)+'%' : '-'}</td>
                    <td class="text-center font-bold" style="color:${accumClr};">${i.accumPct !== null ? i.accumPct.toFixed(2)+'%' : '-'}</td>
                </tr>`;
            }).join('') + "</tbody>";
            tableEl.innerHTML = thead + tbody;
        }
    } else {
        const tableEl = document.getElementById('inv-detail-table');
        if (tableEl) tableEl.innerHTML = `<thead><tr><th class="text-center text-muted">ไม่มีข้อมูล MTD ในช่วงที่เลือก</th></tr></thead>`;
        if(inventoryChartInstance) { inventoryChartInstance.data.labels = []; inventoryChartInstance.update(); }
    }
}

// ----------------------------------------------------
// LOCATION ACCURACY (MTD Logic + Comparison Table Style)
// ----------------------------------------------------
function renderLocationAccuracy() {
    const locTableEl = document.getElementById('loc-accuracy-table');
    const locBoxEl = document.getElementById('loc-analysis-box');
    if(!locTableEl || !locBoxEl || !globalData.inventory || Object.keys(globalData.inventory).length === 0) return;

    // 🌟 ดึง Date ด้วยการใช้ฟังก์ชัน safeParseDate ที่กันบัค Timezone แล้ว 🌟
    const targetEndObj = safeParseDate(document.getElementById('date-end').value);
    let targetM = targetEndObj.getMonth();
    let targetY = targetEndObj.getFullYear().toString().substring(2);
    let mLabelReq = shortMonths[targetM] + "-" + targetY; // e.g., "Aug-26"
    
    let locStats = globalData.inventory[mLabelReq]?.loc_stats || {};

    if (!locStats || locStats.total === 0) {
        locTableEl.innerHTML = `<thead><tr><th class="text-center text-muted">ไม่มีข้อมูลตรวจ Location ในเดือน ${mLabelReq}</th></tr></thead>`;
        locBoxEl.innerHTML = `💡 ไม่มีข้อมูลสินค้าวางผิด Location ในเดือน ${mLabelReq}`;
    } else {
        let rawDetailsArr = [];
        Object.keys(locStats.details || {}).forEach(bu => {
            Object.keys(locStats.details[bu] || {}).forEach(tz => {
                let d = locStats.details[bu][tz];
                let parts = tz.split(" | ");
                let lType = parts[0]; let zone = parts[1];
                let acc = d.total > 0 ? ((d.total - d.wrong) / d.total) * 100 : 0;
                rawDetailsArr.push({ bu: bu, type: lType, zone: zone, checked: d.total, wrong: d.wrong, acc: acc });
            });
        });

        let filteredArr = rawDetailsArr.filter(item => {
            let passBU = window.locFilters ? (window.locFilters.bu.includes('ALL') || window.locFilters.bu.includes(item.bu)) : true;
            let passType = window.locFilters ? (window.locFilters.type.includes('ALL') || window.locFilters.type.includes(item.type)) : true;
            let passZone = window.locFilters ? (window.locFilters.zone.includes('ALL') || window.locFilters.zone.includes(item.zone)) : true;
            let passMasterBU = window.selectedBUs.includes('ALL') || window.selectedBUs.includes(item.bu);
            return passBU && passType && passZone && passMasterBU;
        });

        filteredArr.sort((a, b) => b.wrong - a.wrong);

        let thead = `<thead><tr>
            <th style="position:sticky; left:0; z-index:20;">BU</th>
            <th class="text-center">Location Type</th>
            <th class="text-center">Zone</th>
            <th class="text-center">Locations Checked</th>
            <th class="text-center">Wrong Location</th>
            <th class="text-center">Accuracy %</th>
        </tr></thead>`;

        let tbody = "<tbody>";
        let worstZone = null;

        if (filteredArr.length === 0) {
             tbody += `<tr><td colspan="6" class="text-center text-muted" style="padding:20px;">ไม่พบข้อมูลตามเงื่อนไขที่กรอง</td></tr>`;
        } else {
            filteredArr.forEach((item, idx) => {
                if (idx === 0 && item.wrong > 0) worstZone = item;
                let accClr = item.acc >= 99 ? 'var(--brand-green)' : 'var(--brand-red)';
                let accBg = item.acc >= 99 ? '#dcfce7' : '#fee2e2';
                
                tbody += `<tr>
                    <td class="font-bold" style="position:sticky; left:0; background:var(--bg-card); z-index:10;">${item.bu}</td>
                    <td class="text-center text-muted">${item.type}</td>
                    <td class="text-center font-bold">${item.zone}</td>
                    <td class="text-center">${fmtN(item.checked)}</td>
                    <td class="text-center font-bold" style="color:${item.wrong>0?'var(--brand-red)':'inherit'};">${fmtN(item.wrong)}</td>
                    <td class="text-center"><span style="background:${accBg}; color:${accClr}; padding:4px 10px; border-radius:4px; font-weight:700;">${item.acc.toFixed(2)}%</span></td>
                </tr>`;
            });
        }
        locTableEl.innerHTML = thead + tbody + "</tbody>";

        let filteredChecked = filteredArr.reduce((s, i) => s + i.checked, 0);
        let filteredWrong = filteredArr.reduce((s, i) => s + i.wrong, 0);
        let filteredAcc = filteredChecked > 0 ? ((filteredChecked - filteredWrong) / filteredChecked) * 100 : 0;
        
        let analysisHtml = `<b>📊 วิเคราะห์ความแม่นยำ Location (เดือน ${mLabelReq}):</b> ภาพรวมความแม่นยำอยู่ที่ <b style="color:${filteredAcc>=99?'var(--brand-green)':'var(--brand-red)'};">${filteredAcc.toFixed(2)}%</b> (ตรวจ ${fmtN(filteredChecked)} จุด พบผิด ${fmtN(filteredWrong)} จุด)`;
        if (worstZone) analysisHtml += `<br>🚨 <b>จุดเฝ้าระวัง:</b> BU: <b>${worstZone.bu}</b> โซน <b>${worstZone.zone}</b> พบผิด Location สูงสุด <b>${fmtN(worstZone.wrong)} จุด</b> แนะนำให้ตรวจสอบด่วน`;
        
        locBoxEl.innerHTML = analysisHtml;
    }
}

// ----------------------------------------------------
// TRANSPORT PERFORMANCE (FIX DATE RANGE BUG)
// ----------------------------------------------------
function updateTransportUI() {
    let tbody = document.querySelector('#new-transport-table tbody');
    let dailyTbody = document.querySelector('#daily-transport-table tbody');
    
    if (!globalData.transport || Object.keys(globalData.transport).length === 0) {
        if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:20px;">กำลังรอข้อมูลขนส่งเข้าระบบ...</td></tr>`;
        if(dailyTbody) dailyTbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:20px;">กำลังรอข้อมูลขนส่งเข้าระบบ...</td></tr>`;
        return;
    }
    
    // 🌟 ดึง Date ด้วยการใช้ฟังก์ชัน safeParseDate ที่กันบัค Timezone แล้ว 🌟
    const targetStartObj = safeParseDate(document.getElementById('date-start').value);
    const targetEndObj = safeParseDate(document.getElementById('date-end').value);
    const targetStart = targetStartObj.setHours(0, 0, 0, 0);
    const targetEnd = targetEndObj.setHours(23, 59, 59, 999);
    const period = document.getElementById('global-period').value;
    
    let validDates = Object.keys(globalData.transport).filter(k => {
        let dTime = safeParseDate(k).getTime(); return !isNaN(dTime) && dTime >= targetStart && dTime <= targetEnd;
    }).sort((a,b) => safeParseDate(b).getTime() - safeParseDate(a).getTime());

    if (validDates.length === 0) {
        document.getElementById('tp-kpi-total').innerText = "0"; document.getElementById('tp-kpi-success').innerText = "0"; document.getElementById('tp-kpi-sla').innerText = "0"; document.getElementById('tp-kpi-cost').innerText = "0";
        document.getElementById('carrier-update-time').innerText = `ช่วงเวลาที่เลือกไม่มีข้อมูล`;
        if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:20px;">ไม่พบข้อมูลขนส่ง ในช่วงเวลาที่เลือก</td></tr>`;
        if(dailyTbody) dailyTbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:20px;">ไม่พบข้อมูลรายละเอียด</td></tr>`;
        
        let tcTable = document.getElementById('transport-comparison-table');
        if(tcTable) tcTable.querySelector('tbody').innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:20px;">ไม่พบข้อมูลเปรียบเทียบย้อนหลัง</td></tr>`;
        return;
    }

    let aggData = { total_orders: 0, success_orders: 0, sla_hit: 0, total_cost: 0, carriers: {} };
    let groupedByPeriod = {};
    
    validDates.forEach(dateKey => {
        let dObj = safeParseDate(dateKey);
        let pLabel = getPeriodLabel(dObj, period);
        let dayData = globalData.transport[dateKey];
        
        aggData.total_orders += dayData.total_orders; aggData.success_orders += dayData.success_orders; aggData.sla_hit += dayData.sla_hit; aggData.total_cost += dayData.total_cost;
        Object.keys(dayData.carriers || {}).forEach(cName => {
            if (!aggData.carriers[cName]) aggData.carriers[cName] = { total_orders: 0, success_orders: 0, sla_hit: 0, total_cost: 0 };
            aggData.carriers[cName].total_orders += dayData.carriers[cName].total_orders; aggData.carriers[cName].success_orders += dayData.carriers[cName].success_orders; aggData.carriers[cName].sla_hit += dayData.carriers[cName].sla_hit; aggData.carriers[cName].total_cost += dayData.carriers[cName].total_cost;
        });

        if (!groupedByPeriod[pLabel]) groupedByPeriod[pLabel] = { label: pLabel, time: dObj.getTime(), total_orders: 0, success_orders: 0, sla_hit: 0, total_cost: 0, details: [] };
        groupedByPeriod[pLabel].total_orders += dayData.total_orders; groupedByPeriod[pLabel].success_orders += dayData.success_orders; groupedByPeriod[pLabel].sla_hit += dayData.sla_hit; groupedByPeriod[pLabel].total_cost += dayData.total_cost;
        if (dayData.details) Object.values(dayData.details).forEach(d => groupedByPeriod[pLabel].details.push(d));
    });
    
    let startDisp = getDisplayDate(new Date(targetStart)); let endDisp = getDisplayDate(new Date(targetEnd));
    document.getElementById('carrier-update-time').innerText = `ข้อมูล: ${startDisp} - ${endDisp}`;
    document.getElementById('tp-kpi-total').innerText = fmtN(aggData.total_orders); document.getElementById('tp-kpi-success').innerText = fmtN(aggData.success_orders); document.getElementById('tp-kpi-sla').innerText = fmtN(aggData.sla_hit); document.getElementById('tp-kpi-cost').innerText = fmtN(aggData.total_cost);

    if(tbody) {
        let html = "";
        let carriers = Object.keys(aggData.carriers).sort((a,b) => aggData.carriers[b].total_orders - aggData.carriers[a].total_orders);
        carriers.forEach(c => {
            let cd = aggData.carriers[c];
            let succPct = cd.total_orders > 0 ? (cd.success_orders / cd.total_orders) * 100 : 0; let slaPct = cd.success_orders > 0 ? (cd.sla_hit / cd.success_orders) * 100 : 0;
            let bar = (pct, clr) => `<div style="display:flex; align-items:center; gap:8px;"><div class="modern-bar-bg" style="height:6px;"><div class="${clr}" style="width:${pct}%;"></div></div><span style="font-size:10px; font-weight:700; width:35px; text-align:right;">${pct.toFixed(1)}%</span></div>`;
            html += `<tr><td style="font-weight:700;">${c}</td><td class="text-center font-bold">${fmtN(cd.total_orders)}</td><td>${bar(succPct, 'grad-fill-green')}</td><td>${bar(slaPct, 'grad-fill-blue')}</td><td class="text-center text-red font-bold">${fmtN(cd.total_cost)}</td></tr>`;
        });
        tbody.innerHTML = html;
    }

    let chronPeriods = Object.values(groupedByPeriod).sort((a,b) => a.time - b.time); 
    let htmlHead = `<tr><th style="position:sticky; top:0; left:0; z-index:40; background:var(--bg-card);">วันที่ / Period</th>`;
    let htmlOrders = `<tr><td class="text-dark font-bold">Orders</td>`;
    let htmlVehicles = `<tr><td class="text-dark font-bold">จำนวนรถ</td>`;
    let htmlSucc = `<tr><td class="text-dark font-bold">Succ.%</td>`;
    let htmlSla = `<tr><td class="text-dark font-bold">SLA Adherence %</td>`;
    let htmlCost = `<tr><td class="text-dark font-bold">Cost (฿)</td>`;
    let htmlAccum = `<tr><td class="text-dark font-bold">Accumulate Cost (฿)</td>`;

    let accumCost = 0;
    let prevP = null;

    chronPeriods.forEach((p, idx) => {
        let uniquePlates = new Set();
        p.details.forEach(d => { Object.keys(d.plates).forEach(pl => uniquePlates.add(pl)); });
        let vCount = uniquePlates.size;

        let succPct = p.total_orders > 0 ? (p.success_orders / p.total_orders * 100) : 0;
        let slaPct = p.success_orders > 0 ? (p.sla_hit / p.success_orders * 100) : 0;
        accumCost += p.total_cost; 

        htmlHead += `<th style="position:sticky; top:0; z-index:30; background:var(--bg-card);">${p.label}</th>`;
        htmlOrders += `<td class="font-bold text-dark">${fmtN(p.total_orders)}</td>`;
        htmlVehicles += `<td>${fmtN(vCount)}</td>`;
        htmlSucc += `<td>${succPct.toFixed(1)}%</td>`;
        htmlSla += `<td>${slaPct.toFixed(1)}%</td>`;
        htmlCost += `<td class="text-red font-bold">${fmtN(p.total_cost)}</td>`;
        htmlAccum += `<td class="font-bold text-blue">${fmtN(accumCost)}</td>`;

        if (idx > 0) {
            htmlHead += `<th class="diff-col text-muted" style="position:sticky; top:0; z-index:20;">เทียบก่อนหน้า</th>`;
            
            let diffOrd = p.total_orders - prevP.orders;
            let diffVeh = vCount - prevP.vehicles;
            let diffSucc = succPct - prevP.succ;
            let diffSla = slaPct - prevP.sla;
            let diffCost = p.total_cost - prevP.cost;

            const fmtDiff = (v, isGoodPositive, isPct = false) => {
                if (v === 0) return `<td class="diff-col text-right"><span style="background:#f1f5f9; color:#64748b; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 0.7rem; display: inline-block;">- 0</span></td>`;
                let isGood = isGoodPositive ? (v > 0) : (v < 0);
                let arrow = v > 0 ? '▲' : '▼';
                let sign = v > 0 ? '+' : '-';
                let absVal = Math.abs(v);
                let valStr = isPct ? absVal.toFixed(1) + '%' : fmtN(absVal);
                let bgClr = isGood ? '#dcfce7' : '#fee2e2';
                let txtClr = isGood ? '#10B981' : '#EF4444';
                return `<td class="diff-col text-right"><span style="background:${bgClr}; color:${txtClr}; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 0.7rem; display: inline-block;">${arrow} ${sign}${valStr}</span></td>`;
            };

            htmlOrders += fmtDiff(diffOrd, true); htmlVehicles += fmtDiff(diffVeh, false); htmlSucc += fmtDiff(diffSucc, true, true);
            htmlSla += fmtDiff(diffSla, true, true); htmlCost += fmtDiff(diffCost, false); htmlAccum += `<td class="diff-col"></td>`; 
        }
        prevP = { orders: p.total_orders, vehicles: vCount, succ: succPct, sla: slaPct, cost: p.total_cost };
    });

    htmlHead += `</tr>`; htmlOrders += `</tr>`; htmlVehicles += `</tr>`; 
    htmlSucc += `</tr>`; htmlSla += `</tr>`; htmlCost += `</tr>`; htmlAccum += `</tr>`;

    let tcTable = document.getElementById('transport-comparison-table');
    if(tcTable) {
        let thead = tcTable.querySelector('thead');
        let tbody = tcTable.querySelector('tbody');
        if(thead) thead.innerHTML = htmlHead;
        if(tbody) tbody.innerHTML = htmlOrders + htmlVehicles + htmlSucc + htmlSla + htmlCost + htmlAccum;
    }

    setTimeout(() => {
        let scroller = document.getElementById('comparison-scroll-container');
        if(scroller) scroller.scrollLeft = scroller.scrollWidth;
    }, 400);

    let dailyHtml = "";
    let sortedPeriods = Object.values(groupedByPeriod).sort((a,b) => b.time - a.time);
    
    sortedPeriods.forEach(p => {
        let succPct = p.total_orders > 0 ? (p.success_orders / p.total_orders * 100).toFixed(1) : 0;
        let slaPct = p.success_orders > 0 ? (p.sla_hit / p.success_orders * 100).toFixed(1) : 0;

        dailyHtml += `<tr class="summary-row">
            <td colspan="2" class="font-bold text-dark text-sm">📅 ${p.label} - SUMMARY</td>
            <td class="text-center font-bold text-sm">-</td>
            <td class="text-center font-bold text-sm">${fmtN(p.total_orders)}</td>
            <td><span class="text-green font-bold text-sm">${succPct}%</span></td>
            <td><span class="text-blue font-bold text-sm">${slaPct}%</span></td>
            <td class="text-center font-bold text-red text-sm">${fmtN(p.total_cost)} ฿</td>
        </tr>`;

        let mergedDetails = {};
        p.details.forEach(d => {
            let k = d.carrier + '|' + d.vType;
            if(!mergedDetails[k]) mergedDetails[k] = { carrier: d.carrier, vType: d.vType, total_orders: 0, success_orders: 0, sla_hit: 0, total_cost: 0, plates: {} };
            let md = mergedDetails[k];
            md.total_orders += d.total_orders; md.success_orders += d.success_orders; md.sla_hit += d.sla_hit; md.total_cost += d.total_cost;
            Object.keys(d.plates).forEach(pl => md.plates[pl] = true);
        });

        Object.values(mergedDetails).sort((a,b) => b.total_orders - a.total_orders).forEach(d => {
            let vehCount = Object.keys(d.plates).length;
            let dSucc = d.total_orders > 0 ? (d.success_orders / d.total_orders) * 100 : 0;
            let dSla = d.success_orders > 0 ? (d.sla_hit / d.success_orders) * 100 : 0;
            let bar = (pct, clr) => `<div style="display:flex; align-items:center; gap:8px;"><div class="modern-bar-bg" style="height:6px;"><div class="${clr}" style="width:${pct}%;"></div></div><span style="font-size:10px; font-weight:700; width:35px; text-align:right;">${pct.toFixed(1)}%</span></div>`;
            dailyHtml += `<tr>
                <td class="text-muted" style="padding-left:20px;">${p.label}</td>
                <td><b class="text-dark">${d.carrier}</b><br><span class="text-xs text-muted">${d.vType}</span></td>
                <td class="text-center font-bold text-purple">${vehCount}</td>
                <td class="text-center font-bold">${fmtN(d.total_orders)}</td>
                <td>${bar(dSucc, 'grad-fill-green')}</td>
                <td>${bar(dSla, 'grad-fill-blue')}</td>
                <td class="text-center text-red font-bold">${fmtN(d.total_cost)}</td>
            </tr>`;
        });
    });
    if(dailyTbody) dailyTbody.innerHTML = dailyHtml;

    let chartLabels = []; let costData = []; let slaData = []; let targetData = [];
    let chartPeriods = [...sortedPeriods].reverse(); 
    
    chartPeriods.forEach(p => {
        chartLabels.push(p.label);
        costData.push(p.total_cost);
        let sPct = p.success_orders > 0 ? (p.sla_hit / p.success_orders) * 100 : 0;
        slaData.push(parseFloat(sPct.toFixed(2)));
        targetData.push(98); 
    });

    if (typeof transportTrendChartInstance !== 'undefined' && transportTrendChartInstance) {
        let tpMetric = document.getElementById('tp-metric-filter')?.value || 'BOTH';
        let datasets = [];

        if (tpMetric === 'BOTH' || tpMetric === 'SLA') {
            datasets.push({
                type: 'line', label: 'SLA Target (98%)', data: targetData, borderColor: '#F59E0B', borderDash: [5, 5], borderWidth: 2, pointRadius: 0, yAxisID: 'y', fill: false, order: 1
            });
            datasets.push({
                type: 'bar', label: 'SLA Adherence (%)', data: slaData,
                backgroundColor: (ctx) => {
                    if (!ctx.chart.chartArea) return '#10B981';
                    return ctx.raw >= 98 ? getGradient(ctx.chart.ctx, ctx.chart.chartArea, '#10B981', '#6EE7B7') : getGradient(ctx.chart.ctx, ctx.chart.chartArea, '#EF4444', '#FCA5A5');
                },
                borderRadius: 6, borderSkipped: false, barThickness: 16, yAxisID: 'y', order: 3
            });
        }
        if (tpMetric === 'BOTH' || tpMetric === 'COST') {
            datasets.push({
                type: 'line', label: 'Cost (฿)', data: costData,
                borderColor: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderWidth: 3, pointRadius: 5, tension: 0.4, yAxisID: 'y1', fill: true, order: 2
            });
        }

        transportTrendChartInstance.data.labels = chartLabels;
        transportTrendChartInstance.data.datasets = datasets;
        transportTrendChartInstance.options.scales.y.display = (tpMetric === 'BOTH' || tpMetric === 'SLA');
        transportTrendChartInstance.options.scales.y1.display = (tpMetric === 'BOTH' || tpMetric === 'COST');
        transportTrendChartInstance.update();
    }

    let trendSummaryBox = document.getElementById('tp-trend-summary');
    if (trendSummaryBox && chartPeriods.length > 0) {
        let latestCost = costData[costData.length - 1] || 0;
        let prevCost = costData.length > 1 ? costData[costData.length - 2] : 0;
        let latestSla = slaData[slaData.length - 1] || 0;
        
        let diff = latestCost - prevCost;
        let diffPct = prevCost > 0 ? (diff / prevCost) * 100 : 0;
        let diffHtml = "";
        
        if (chartPeriods.length === 1 || prevCost === 0) diffHtml = `<div class="stock-change stock-neutral">- 0.00%</div>`;
        else if (diff > 0) diffHtml = `<div class="stock-change stock-up">▲ +${fmtN(diff)} ฿ (+${diffPct.toFixed(1)}%)</div>`;
        else if (diff < 0) diffHtml = `<div class="stock-change stock-down">▼ ${fmtN(Math.abs(diff))} ฿ (${diffPct.toFixed(1)}%)</div>`;
        else diffHtml = `<div class="stock-change stock-neutral">- 0.00%</div>`;
        
        let slaStatus = latestSla >= 98 ? `<span class="text-green font-bold">🎯 SLA: ${latestSla.toFixed(1)}% (Pass)</span>` : `<span class="text-red font-bold">⚠️ SLA: ${latestSla.toFixed(1)}% (Fail)</span>`;
        
        trendSummaryBox.innerHTML = `
            <div class="stock-val-wrap">
                <span class="stock-label">Total Cost (Latest)</span>
                <span class="stock-price">฿ ${fmtN(latestCost)}</span>
                <div class="mt-10">${slaStatus}</div>
            </div>
            <div>${diffHtml}</div>
        `;
    }
}

// ----------------------------------------------------
// PRODUCTIVITY (Overlay Chart + Area Table)
// ----------------------------------------------------
function renderProductivitySection() {
    try {
        let pUsers = globalData.productivity || {};
        let pAreas = globalData.prod_area || {};
        let pZones = globalData.prod_zone || {};
        let uMap = globalData.prod_users_map || {};

        if (Object.keys(pUsers).length === 0) {
            let msg = `<tr><td colspan="100%" class="text-center text-muted" style="padding:30px;">ไม่มีข้อมูล Productivity ในระบบ</td></tr>`;
            if(document.getElementById('prod-area-table')) document.getElementById('prod-area-table').innerHTML = msg;
            if(document.getElementById('prod-user-table')) document.getElementById('prod-user-table').innerHTML = msg;
            if(document.getElementById('prod-overall-table')) document.getElementById('prod-overall-table').innerHTML = msg;
            return;
        }

        // 🌟 ดึง Date ด้วยการใช้ฟังก์ชัน safeParseDate ที่กันบัค Timezone แล้ว 🌟
        const targetStartObj = safeParseDate(document.getElementById('date-start').value);
        const targetEndObj = safeParseDate(document.getElementById('date-end').value);
        const targetStart = targetStartObj.setHours(0, 0, 0, 0);
        const targetEnd = targetEndObj.setHours(23, 59, 59, 999);
        
        let areaFilterEl = document.getElementById('prod-area-filter');
        let selectedArea = areaFilterEl ? areaFilterEl.value : 'ALL';
        let period = document.getElementById('global-period').value;

        if (areaFilterEl && !areaFilterEl.hasAttribute('data-bound')) {
            areaFilterEl.addEventListener('change', renderProductivitySection);
            areaFilterEl.setAttribute('data-bound', 'true');
        }

        let grouped = {};
        let allAreasList = new Set();
        let activeDates = new Set([...Object.keys(pUsers), ...Object.keys(pAreas), ...Object.keys(pZones)]);

        let validDates = Array.from(activeDates)
            .map(dKey => {
                let d = safeParseDate(dKey);
                return { key: dKey, time: d.getTime(), dObj: d };
            })
            .filter(item => !isNaN(item.time) && item.time >= targetStart && item.time <= targetEnd)
            .sort((a,b) => a.time - b.time);

        if(validDates.length === 0) {
            let msg = `<tr><td colspan="100%" class="text-center text-muted" style="padding:30px;">ไม่มีข้อมูลในช่วงเวลาที่เลือก</td></tr>`;
            if(document.getElementById('prod-area-table')) document.getElementById('prod-area-table').innerHTML = `<thead><tr><th class="text-center text-muted">ไม่มีข้อมูล</th></tr></thead><tbody>${msg}</tbody>`;
            if(document.getElementById('prod-user-table')) document.getElementById('prod-user-table').innerHTML = `<thead><tr><th class="text-center text-muted">ไม่มีข้อมูล</th></tr></thead><tbody>${msg}</tbody>`;
            if(document.getElementById('prod-overall-table')) document.getElementById('prod-overall-table').innerHTML = `<thead><tr><th class="text-center text-muted">ไม่มีข้อมูล</th></tr></thead><tbody>${msg}</tbody>`;
            if(productivityChartInstance) { productivityChartInstance.data.labels = []; productivityChartInstance.update(); }
            const summaryEl = document.getElementById('prod-summary-box');
            if(summaryEl) { summaryEl.innerHTML = '💡 ไม่มีข้อมูลในช่วงเวลาที่เลือก'; summaryEl.className = 'info-alert alert-yellow mb-20 mt-10'; }
            return;
        }

        validDates.forEach(item => {
            let dKey = item.key; let dObj = item.dObj;
            let groupKey = getPeriodLabel(dObj, period);
            
            if (!grouped[groupKey]) grouped[groupKey] = { label: groupKey, time: item.time, user_picks: 0, user_hours: 0, areas: {}, zones: {}, users: {}, activePickers: new Set() };

            if (pZones[dKey]) {
                Object.keys(pZones[dKey]?.zones || {}).forEach(zName => {
                    let z = pZones[dKey].zones[zName];
                    if (!grouped[groupKey].zones[zName]) grouped[groupKey].zones[zName] = { sumProd: 0, cnt: 0, area: z.area || 'N/A' };
                    grouped[groupKey].zones[zName].sumProd += (z.sumProd || 0);
                    grouped[groupKey].zones[zName].cnt += (z.cnt || 0);
                    if (z.area && z.area !== 'N/A') grouped[groupKey].zones[zName].area = z.area;
                });
            }

            if (pAreas[dKey]) {
                Object.keys(pAreas[dKey]?.areas || {}).forEach(aName => {
                    if(aName && aName !== "N/A" && aName !== "") allAreasList.add(aName);
                    if (!grouped[groupKey].areas[aName]) grouped[groupKey].areas[aName] = { picks: 0, hours: 0 };
                    let aData = pAreas[dKey].areas[aName];
                    let aSec = aData.time_sec || aData.time || 0; 
                    grouped[groupKey].areas[aName].picks += (aData.picks || 0);
                    grouped[groupKey].areas[aName].hours += (aSec / 3600);
                });
            }

            if (pUsers[dKey]) {
                grouped[groupKey].user_picks += (pUsers[dKey].total_qty || 0);
                grouped[groupKey].user_hours += ((pUsers[dKey].total_time || 0) / 3600);
                
                Object.keys(pUsers[dKey]?.users || {}).forEach(uID => {
                    let uData = pUsers[dKey].users[uID];
                    let userArea = uData.area || "N/A";
                    if (userArea !== "N/A" && userArea !== "") allAreasList.add(userArea);
                    grouped[groupKey].activePickers.add(uID);
                    
                    if (!grouped[groupKey].users[uID]) grouped[groupKey].users[uID] = { picks: 0, hours: 0, team: uData.team, zone: uData.zone, area: userArea };
                    grouped[groupKey].users[uID].picks += uData.qty;
                    grouped[groupKey].users[uID].hours += (uData.time / 3600);
                });
            }
        });

        if (areaFilterEl && areaFilterEl.options.length <= 1) {
            Array.from(allAreasList).sort().forEach(a => areaFilterEl.appendChild(new Option(a, a)));
        }

        let sortedGroups = Object.values(grouped).sort((a,b) => a.time - b.time);
        let chartSlice = sortedGroups;
        let latest = sortedGroups[sortedGroups.length - 1];
        
        const groupDateStr = (g) => { let d = new Date(g.time); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
        let latestDateStr = groupDateStr(latest);
        let currentTarget = getTarget(selectedArea, latestDateStr);

        const isBulkUser = (u) => { let h = u.hours || 0; return h < 0.08 || (h > 0 && ((u.picks || 0) / h) > 600); };
        const nonBulkTotals = (g) => {
            let p = 0, h = 0;
            Object.values(g.users || {}).forEach(u => { if (!isBulkUser(u)) { p += (u.picks || 0); h += (u.hours || 0); } });
            return { picks: p, hours: h };
        };

        if (productivityChartInstance) {
            let labels = [], dataActual = [], dataTarget = [];

            chartSlice.forEach(g => {
                labels.push(g.label);
                let uph = 0;
                let gt = getTarget(selectedArea, groupDateStr(g)); 

                if (selectedArea === 'ALL') { let nb = nonBulkTotals(g); uph = nb.hours > 0 ? Math.round(nb.picks / nb.hours) : 0; } 
                else if (g.areas[selectedArea]) { uph = g.areas[selectedArea].hours > 0 ? Math.round(g.areas[selectedArea].picks / g.areas[selectedArea].hours) : 0; }

                dataActual.push(uph); 
                dataTarget.push(gt); 
            });

            productivityChartInstance.data.labels = labels;
            productivityChartInstance.data.datasets = [
                {
                    type: 'bar', label: 'Target', data: dataTarget,
                    backgroundColor: 'rgba(226, 232, 240, 0.8)',
                    barPercentage: 0.6, categoryPercentage: 0.8
                },
                {
                    type: 'bar', label: 'Actual UPH', data: dataActual,
                    backgroundColor: (ctx) => {
                        let actual = ctx.raw;
                        let target = dataTarget[ctx.dataIndex];
                        return actual >= target ? '#10B981' : '#EF4444'; 
                    },
                    barPercentage: 0.6, categoryPercentage: 0.8
                }
            ];
            productivityChartInstance.update();
        }

        const hourlyRateFor = (dateStr) => { let e = getEffectiveUphCost(dateStr); return e.cost_days > 0 ? (e.cost_salary / e.cost_days / 8) : 0; };
        let hourlyRate = hourlyRateFor(latestDateStr);

        const summaryEl = document.getElementById('prod-summary-box');
        if (summaryEl) {
            let uph = 0, pks = 0, hrs = 0;
            if (selectedArea === 'ALL') { let nb = nonBulkTotals(latest); uph = nb.hours > 0 ? Math.round(nb.picks / nb.hours) : 0; pks = nb.picks; hrs = nb.hours; } 
            else if (latest.areas[selectedArea]) { uph = latest.areas[selectedArea].hours > 0 ? Math.round(latest.areas[selectedArea].picks / latest.areas[selectedArea].hours) : 0; pks = latest.areas[selectedArea].picks; hrs = latest.areas[selectedArea].hours; }
            
            let gap = uph - currentTarget;
            let statusHtml = gap >= 0 ? `<span class="text-green font-bold">(สูงกว่าเป้า +${gap})</span>` : `<span class="text-red font-bold">(ต่ำกว่าเป้า ${Math.abs(gap)})</span>`;
            let costPerPick = uph > 0 ? (hourlyRate / uph) : 0;
            
            summaryEl.innerHTML = `💡 <b>ภาพรวมล่าสุด (${latest.label}):</b> พื้นที่ ${selectedArea} ความเร็วเฉลี่ย <b class="text-dark" style="font-size:1.1em;">${uph} UPH</b> ${statusHtml} <br><span class="text-muted text-xs">(หยิบ ${fmtN(Math.round(pks))} รายการ / ${hrs.toFixed(1)} ชม.)</span> <span style="margin-left:15px; padding-left:15px; border-left:1px solid var(--border-color); color:var(--text-dark);">💰 <b>Cost per Pick: <span class="text-blue text-lg">${costPerPick.toFixed(2)} ฿</span></b></span>`;
            summaryEl.className = uph >= currentTarget ? 'info-alert alert-green mb-20 mt-10' : 'info-alert alert-red mb-20 mt-10';
        }

        const areaTableEl = document.getElementById('prod-area-table');
        if (areaTableEl) {
            let zoneObj = latest.zones || {};
            let zoneNames = Object.keys(zoneObj).sort((a, b) => {
                let pa = zoneObj[a].cnt > 0 ? zoneObj[a].sumProd / zoneObj[a].cnt : 0;
                let pb = zoneObj[b].cnt > 0 ? zoneObj[b].sumProd / zoneObj[b].cnt : 0;
                return pb - pa;
            });

            let html = `<thead><tr>
                <th style="position:sticky; left:0; z-index:20; background:var(--bg-card); width:20%;">Picking Zone</th>
                <th class="text-center" style="width:20%;">Area</th>
                <th class="text-center" style="width:20%;">Productivity (UPH)</th>
                <th class="text-center" style="width:20%;">Gap</th>
                <th class="text-center text-blue" style="width:20%;">Cost/Pick (฿)</th>
            </tr></thead><tbody>`;

            if(zoneNames.length === 0) { html += `<tr><td colspan="5" class="text-center text-muted">ไม่มีข้อมูล Zone ในช่วงที่เลือก</td></tr>`; } 
            else {
                zoneNames.forEach(z => {
                    let zd = zoneObj[z];
                    let prod = zd.cnt > 0 ? Math.round(zd.sumProd / zd.cnt) : 0;
                    let trg = getTarget(zd.area, latestDateStr);
                    let gap = prod - trg; let cost = prod > 0 ? (hourlyRate / prod) : 0;

                    html += `<tr>
                        <td class="font-bold text-dark" style="position:sticky; left:0; background:var(--bg-card); z-index:10;">${z}</td>
                        <td class="text-center text-muted">${zd.area || '-'}</td>
                        <td class="text-center"><span style="background:${prod>=trg?'#dcfce7':'#fee2e2'}; color:${prod>=trg?'#166534':'#991b1b'}; padding:4px 10px; border-radius:4px; font-weight:700;">${prod}</span></td>
                        <td class="text-center font-bold" style="color:${gap>=0?'var(--brand-green)':'var(--brand-red)'}">${gap > 0 ? '+'+gap : gap}</td>
                        <td class="text-center font-bold text-blue">${cost.toFixed(2)}</td>
                    </tr>`;
                });
            }
            areaTableEl.innerHTML = html + "</tbody>";
        }

        const userTableEl = document.getElementById('prod-user-table');
        if (userTableEl) {
            let users = Object.keys(latest.users || {}).sort((a, b) => {
                let uphA = latest.users[a].hours > 0 ? latest.users[a].picks / latest.users[a].hours : 0;
                let uphB = latest.users[b].hours > 0 ? latest.users[b].picks / latest.users[b].hours : 0;
                return uphB - uphA;
            });

            let html = `<thead><tr>
                <th style="position:sticky; left:0; z-index:20;">Name (ID)</th><th class="text-center">Picks</th><th class="text-center">Hours</th><th class="text-center">UPH</th><th class="text-center text-blue">Cost/Pick (฿)</th>
            </tr></thead><tbody>`;
            
            if(users.length === 0) { html += `<tr><td colspan="5" class="text-center text-muted">ไม่มีข้อมูลพนักงาน</td></tr>`; } 
            else {
                users.forEach(u => {
                    let d = latest.users[u];
                    let uph = d.hours > 0 ? Math.round(d.picks / d.hours) : 0;
                    let isBulk = d.hours < 0.08 || uph > 600;
                    let userTrg = getTarget(d.area, latestDateStr);
                    let fullName = uMap[u] || u;
                    let cost = uph > 0 ? (hourlyRate / uph) : 0;

                    html += `<tr style="${isBulk ? 'opacity:0.5' : ''}">
                        <td style="position:sticky; left:0; background:var(--bg-card); z-index:10;"><b class="text-dark">${fullName}</b><br><span class="text-xs text-muted">ID: ${u}</span></td>
                        <td class="text-center font-bold">${fmtN(Math.round(d.picks))}</td>
                        <td class="text-center text-muted">${d.hours.toFixed(2)}</td>
                        <td class="text-center font-bold" style="color:${uph >= userTrg ? 'var(--brand-green)' : 'var(--brand-red)'}">${isBulk ? '<span class="text-xs text-muted">Bulk/Error</span>' : uph}</td>
                        <td class="text-center font-bold text-blue">${isBulk ? '-' : cost.toFixed(2)}</td>
                    </tr>`;
                });
            }
            userTableEl.innerHTML = html + "</tbody>";
        }

        const overallTableEl = document.getElementById('prod-overall-table');
        if (overallTableEl) {
            let html = `<thead><tr>
                <th style="position:sticky; left:0; z-index:20;">Date</th><th class="text-center">Active Pickers</th><th class="text-center">Total Picks</th><th class="text-center">Overall UPH</th><th class="text-center text-blue">Avg Cost/Pick (฿)</th>
            </tr></thead><tbody>`;
            
            sortedGroups.slice().reverse().forEach(item => {
                let nb = nonBulkTotals(item); 
                let uph = nb.hours > 0 ? Math.round(nb.picks / nb.hours) : 0;
                let _ds = groupDateStr(item); let trg = getTarget(selectedArea, _ds);
                let cost = uph > 0 ? (hourlyRateFor(_ds) / uph) : 0;

                html += `<tr>
                    <td class="font-bold" style="position:sticky; left:0; background:var(--bg-card); z-index:10;">${item.label}</td>
                    <td class="text-center"><span class="badge-glass" style="background:#F1F5F9; color:#475569;">${item.activePickers.size} คน</span></td>
                    <td class="text-center font-bold">${fmtN(Math.round(nb.picks))}</td>
                    <td class="text-center font-bold" style="color:${uph >= trg ? 'var(--brand-green)' : 'var(--brand-red)'}">${uph}</td>
                    <td class="text-center font-bold text-blue">${cost.toFixed(2)}</td>
                </tr>`;
            });
            overallTableEl.innerHTML = html + "</tbody>";
        }

    } catch (e) { console.error("Productivity Render Error:", e); }
}
// เพิ่มโค้ดนี้ไว้บรรทัดล่างสุดของ script.js
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});
