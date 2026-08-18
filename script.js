let globalCapacities = {};
const DEFAULT_CAPACITY = 10000;
let globalUphCost = {};
let _toastTimer = null;

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

// ==========================================
// 🎨 CHART.JS GRADIENTS HELPER
// ==========================================
function getGradient(ctx, chartArea, colorStart, colorEnd) {
    if (!chartArea) return colorStart;
    let gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
}

const gradPalettes = [
    { s: '#3B82F6', e: '#60A5FA' }, // Blue
    { s: '#10B981', e: '#34D399' }, // Green
    { s: '#F59E0B', e: '#FCD34D' }, // Orange
    { s: '#8B5CF6', e: '#A78BFA' }, // Purple
    { s: '#EF4444', e: '#F87171' }, // Red
    { s: '#06B6D4', e: '#22D3EE' }  // Teal
];

// ==========================================
// 🌟 INITIALIZE CHARTS
// ==========================================
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#A3AED0';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17, 28, 68, 0.9)';
Chart.defaults.plugins.tooltip.titleFont = { size: 13, family: 'Inter', weight: 'bold' };

const fmtN = (v) => (v || 0).toLocaleString();

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
                if(data > 0){
                    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#FFF' : '#2B3674';
                    ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                    let val = (chart.canvas.id.includes('claim')) ? fmtN(data) : (data%1!==0 ? data.toFixed(1)+'%' : fmtN(data));
                    ctx.fillText(val, bar.x, bar.y - 5);
                }
            });
        });
        
        if (chart.canvas.id === 'ffmTrendChart' || chart.canvas.id === 'workforceChart') {
            let totals = []; let xCoords = [];
            chart.data.datasets.forEach((dataset, i) => {
                if (!chart.isDatasetVisible(i) || dataset.type === 'line') return;
                const meta = chart.getDatasetMeta(i);
                dataset.data.forEach((val, index) => { totals[index] = (totals[index] || 0) + (val || 0); if (meta.data[index]) xCoords[index] = meta.data[index].x; });
            });
            const yScale = chart.scales.y; 
            chart.data.labels.forEach((_, index) => {
                if (totals[index] > 0 && xCoords[index] && yScale) {
                    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#FFF' : '#2B3674';
                    ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                    ctx.fillText(fmtN(Math.round(totals[index])), xCoords[index], yScale.getPixelForValue(totals[index]) - 5);
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
        const _otManyLines = (chart.canvas.id === 'ontimeChart2' && chart.data.datasets.length > 3);
        chart.data.datasets.forEach((dataset, i) => {
            if (!chart.isDatasetVisible(i)) return;
            if (_otManyLines && !dataset.isOverall) return;
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((point, index) => {
                const data = dataset.data[index];
                if(data !== null && data !== undefined && data !== 0 && data !== "0.00"){
                    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#FFF' : '#2B3674';
                    ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = i === 0 ? 'bottom' : 'top'; 
                    let yOffset = i === 0 ? -8 : 8;
                    ctx.fillText(Number(data).toFixed(2) + '%', point.x, point.y + yOffset);
                }
            });
        });
    }
};

let ffmTrendChartInstance = new Chart(document.getElementById('ffmTrendChart'), { 
    type: 'bar', data: { labels: [], datasets: [] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, border: { display: false }, grace: '15%' } } }, plugins: [dataLabelPlugin] 
});

let ffmVolumeChartInstance = new Chart(document.getElementById('ffmVolumeChart'), { 
    type: 'doughnut', data: { labels: [], datasets: [] }, 
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } } 
});

let workforceChartInstance = new Chart(document.getElementById('workforceChart'), { 
    type: 'bar', data: { labels: [], datasets: [] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, border: { display: false }, grace: '15%' } } }, plugins: [dataLabelPlugin] 
});

let ontimeChartInstance = new Chart(document.getElementById('ontimeChart2'), { 
    type: 'line', data: { labels: [], datasets: [] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { border: { display: false }, max: 105 } } }, plugins: [lineDataLabelPlugin]
});

let claimChart2Instance = new Chart(document.getElementById('claimChart2'), { 
    type: 'bar', data: { labels: [], datasets: [ { label: 'มูลค่าเคลม (฿)', data: [], yAxisID: 'y' }, { label: 'จำนวนชิ้น', data: [], type: 'line', yAxisID: 'y1', pointRadius: 4, borderWidth: 2, borderColor: '#3B82F6', backgroundColor: '#3B82F6' } ] }, 
    options: { responsive: true, maintainAspectRatio: false, scales: { x: {grid:{display:false}}, y: {position: 'left', grace: '15%'}, y1: {position: 'right', display:false} } }, plugins: [dataLabelPlugin] 
});

let inventoryChartInstance = new Chart(document.getElementById('inventoryChart'), { 
    type: 'line', data: { labels: [], datasets: [{ label: 'Accuracy %', data: [], fill: true }] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { border: { display: false } } } }, plugins: [lineDataLabelPlugin]
});

let productivityChartInstance = new Chart(document.getElementById('productivityChart'), { 
    type: 'bar', data: { labels: [], datasets: [{type:'bar', label:'Background'}, {type:'bar', label:'Actual UPH'}, {type:'line', label:'Target', borderColor:'#F59E0B', borderDash:[5,5]}] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { display: false, grace: '25%' } } } 
});

// ==========================================
// CORE DATA LOGIC & UI UPDATES
// ==========================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxB0bNU1P9qrG_6aHoeiKyHMXT0_k76VlL0aq1I9xxHVpPDQK9qcd3FJMip4Jk9o6RY/exec';
let globalData = { workforce:{}, fulfillment:{}, wave_ops:{}, ontime:{}, ontime_hub:{}, ontime_by_aff:{}, claims:{}, inventory:{}, inventory_daily:{}, transport:{}, productivity:{}, prod_area:{}, prod_zone:{}, prod_users_map:{} };
window.selectedBUs = ['ALL'];
window.locFilters = { bu: ['ALL'], type: ['ALL'], zone: ['ALL'] };

const getStandardDate = (rawDate) => {
    if (!rawDate) return "";
    let str = String(rawDate).trim();
    if (str.includes('T')) str = str.split('T')[0];
    let dObj = new Date(str);
    if (!isNaN(dObj.getTime())) return `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;
    return str;
};
const standardizeBU = (bu) => {
    let b = (bu || '').toString().trim().toUpperCase();
    if (b.includes('MART')) return 'DM02';
    if (b.includes('PUN') || b.includes('PUNTHAI')) return 'DP02';
    if (b.includes('GFA') || b.includes('COFFEE')) return 'DG02';
    if (b.includes('LUBE')) return '1115';
    return b;
};

document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('theme-toggle').innerText = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
    Chart.defaults.color = isDark ? '#A3AED0' : '#6B7280';
    Object.values(Chart.instances).forEach(chart => chart.update());
});

let ontimeAffMS = null, claimBuMS = null, invLocTypeMS = null;
function createMultiSelect(mountEl, opts) {
    if (!mountEl) return null;
    opts = opts || {};
    const label = opts.label || 'Filter';
    let options = [];
    let selected = new Set();

    mountEl.style.position = 'relative';
    mountEl.innerHTML = `
        <div class="ms-btn select-filter dropdown-trigger" style="min-width:110px;">
            <span class="ms-text">${label}: All</span><span style="font-size:10px;">▼</span>
        </div>
        <div class="ms-menu dropdown-menu">
            <label class="dropdown-item"><input type="checkbox" class="ms-all" checked> All</label>
            <div class="divider"></div>
            <div class="ms-list" style="display:flex; flex-direction:column; gap:6px;"></div>
            <button class="ms-apply btn-primary" style="margin-top:10px; width:100%;">Apply</button>
        </div>
    `;

    const btn = mountEl.querySelector('.ms-btn');
    const menu = mountEl.querySelector('.ms-menu');
    const textEl = mountEl.querySelector('.ms-text');
    const allCb = mountEl.querySelector('.ms-all');
    const listEl = mountEl.querySelector('.ms-list');
    const applyBtn = mountEl.querySelector('.ms-apply');

    const isAll = () => options.length > 0 && selected.size === options.length;
    const refreshText = () => {
        if (options.length === 0 || isAll()) textEl.innerText = `${label}: All`;
        else if (selected.size === 0) textEl.innerText = `${label}: None`;
        else if (selected.size === 1) textEl.innerText = `${label}: ${Array.from(selected)[0]}`;
        else textEl.innerText = `${label}: ${selected.size} selected`;
    };
    const renderList = () => {
        listEl.innerHTML = '';
        options.forEach(v => {
            const lbl = document.createElement('label');
            lbl.className = 'dropdown-item';
            lbl.innerHTML = `<input type="checkbox" class="ms-item" value="${v}" ${selected.has(v) ? 'checked' : ''}> ${v}`;
            listEl.appendChild(lbl);
        });
        allCb.checked = isAll();
        refreshText();
    };

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.ms-menu').forEach(m => { if (m !== menu) m.style.display = 'none'; });
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
    allCb.addEventListener('change', (e) => { listEl.querySelectorAll('.ms-item').forEach(cb => cb.checked = e.target.checked); });
    listEl.addEventListener('change', () => {
        const cbs = Array.from(listEl.querySelectorAll('.ms-item'));
        allCb.checked = cbs.length > 0 && cbs.every(cb => cb.checked);
    });
    applyBtn.addEventListener('click', () => {
        menu.style.display = 'none';
        const cbs = Array.from(listEl.querySelectorAll('.ms-item'));
        selected = new Set(cbs.filter(cb => cb.checked).map(cb => cb.value));
        refreshText();
        if (typeof opts.onApply === 'function') opts.onApply(getSelected());
    });
    document.addEventListener('click', (e) => { if (!mountEl.contains(e.target)) menu.style.display = 'none'; });

    const getSelected = () => (isAll() || selected.size === 0) ? ['ALL'] : Array.from(selected);

    return {
        el: mountEl,
        getSelected,
        setOptions(arr, keepSelection = true) {
            let newOpts = Array.from(new Set(arr || [])).filter(v => v);
            newOpts.sort();
            let wasAll = isAll() || selected.size === 0;
            options = newOpts;
            if (!keepSelection || wasAll) selected = new Set(options);
            else {
                selected = new Set(Array.from(selected).filter(v => options.includes(v)));
                if (selected.size === 0) selected = new Set(options);
            }
            renderList();
        }
    };
}
ontimeAffMS = createMultiSelect(document.getElementById('ontime-aff-ms'), { label: 'สังกัด', onApply: () => updateOnTimeUI() });
claimBuMS   = createMultiSelect(document.getElementById('claim-bu-ms'),   { label: 'BU',     onApply: () => updateClaimUI() });
invLocTypeMS = createMultiSelect(document.getElementById('inv-loctype-ms'), { label: 'Type',  onApply: () => updateInventoryUI() });

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
}

function populateGlobalBUFilters() {
    let buSet = new Set();
    if(globalData.fulfillment) Object.values(globalData.fulfillment).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    if(globalData.claims) Object.values(globalData.claims).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    if(globalData.inventory) Object.values(globalData.inventory).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    if(globalData.transport) Object.values(globalData.transport).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    
    let sortedBUs = Array.from(buSet).sort();
    const cbList = document.getElementById('bu-checkbox-list');
    
    if (cbList && cbList.innerHTML === '') {
        sortedBUs.forEach(bu => {
            const label = document.createElement('label');
            label.className = 'dropdown-item';
            label.innerHTML = `<input type="checkbox" class="bu-item-cb" value="${bu}" checked> ${bu}`;
            cbList.appendChild(label);
        });

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

        document.getElementById('bu-multi-select').addEventListener('click', (e) => {
            e.stopPropagation();
            let menu = document.getElementById('bu-dropdown-menu');
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', (e) => {
            let btn = document.getElementById('bu-multi-select');
            let menu = document.getElementById('bu-dropdown-menu');
            if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) menu.style.display = 'none';
        });
    }

    const invBuSelect = document.getElementById('inv-bu-filter');
    if (invBuSelect && invBuSelect.options.length <= 1) {
        sortedBUs.forEach(bu => invBuSelect.appendChild(new Option(bu, bu)));
        invBuSelect.addEventListener('change', updateInventoryUI);
    }
}

async function initDashboard() {
    document.getElementById('global-loader').style.display = 'flex';
    const dp = document.getElementById('date-picker');
    if (!dp.value) {
        let today = new Date();
        dp.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    }
    
    dp.addEventListener('change', () => {
        refreshAllSections();
        initFulfillmentRealtime(); 
    });

    try {
        const response = await fetch(`${GAS_URL}?section=all`);
        const result = await response.json();
        if (result.status === "success") {
            globalData = result.data;
            cleanDataBeforeLoad();
            populateGlobalBUFilters();
        }
    } catch (e) { console.error("GAS Load Error:", e); }

    await initFulfillmentRealtime();
    refreshAllSections();
    document.getElementById('global-loader').style.display = 'none';
}

function refreshAllSections() {
    updateTransportUI(); 
    updateWorkforceUI();
    updateOnTimeUI();
    updateClaimUI();
    updateInventoryUI();
}

// ==========================================
// 1. BIGQUERY FULFILLMENT & WAVE 
// ==========================================
function toggleCapSetup() {
    const p = document.getElementById('cap-setup-panel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
    if(p.style.display === 'block') { document.getElementById('cap-target-date').value = document.getElementById('date-picker').value; fetchAndRenderCapInputs(); }
}
async function fetchAndRenderCapInputs() {
    const targetDate = document.getElementById('cap-target-date').value;
    const container = document.getElementById('cap-inputs-container');
    container.innerHTML = '<span style="color:var(--text-muted);">⏳ กำลังดึงข้อมูล...</span>';
    try {
        const capResp = await fetch("https://dc-ordermonitoring-backend.onrender.com/api/run", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: 'apiGetCapacity', args: [targetDate, targetDate] }) });
        const capJson = await capResp.json();
        if (capJson.success && capJson.data) {
            if (!globalCapacities[targetDate]) globalCapacities[targetDate] = {};
            capJson.data.forEach(row => globalCapacities[row.target_date][row.owner] = row.capacity);
        }
    } catch (e) {}
    container.innerHTML = '';
    const allBUs = (window.selectedBUs && window.selectedBUs.includes('ALL')) ? ['DM02', 'DP02', '1115', 'DCWN', 'DG02'] : (window.selectedBUs || ['DM02', 'DP02', '1115', 'DCWN', 'DG02']); 
    allBUs.forEach(bu => {
        let currentCap = globalCapacities[targetDate]?.[bu] || DEFAULT_CAPACITY;
        container.innerHTML += `<div style="display:flex; flex-direction:column;"><label style="font-size:10px; font-weight:700;">${bu}</label><input type="number" id="cap-input-${bu}" value="${currentCap}" data-bu="${bu}" class="select-filter" style="width:70px;"></div>`;
    });
}
async function saveDailyCapacity() {
    const targetDate = document.getElementById('cap-target-date').value;
    const inputs = document.querySelectorAll('#cap-inputs-container input');
    if (inputs.length === 0) return;
    const saveBtn = document.querySelector('#cap-setup-panel button[onclick="saveDailyCapacity()"]');
    let originalBtnHtml = ''; if (saveBtn) { originalBtnHtml = saveBtn.innerHTML; saveBtn.disabled = true; saveBtn.innerHTML = '⏳ กำลังบันทึก...'; }
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
    } catch (error) { showToast('❌ บันทึกไม่สำเร็จ: ' + error.message, 'error'); } 
    finally { if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; } }
}

function hasEffectiveCap(dateStr, bu) {
    if (!bu || !dateStr) return false; let ref = new Date(dateStr).getTime();
    return Object.keys(globalCapacities).some(d => globalCapacities[d] && globalCapacities[d][bu] != null && new Date(d).getTime() <= ref);
}
function getEffectiveCap(dateStr, bu) {
    if (!bu || !dateStr) return DEFAULT_CAPACITY; let ref = new Date(dateStr).getTime();
    let cand = Object.keys(globalCapacities).filter(d => globalCapacities[d] && globalCapacities[d][bu] != null && new Date(d).getTime() <= ref).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
    return cand.length > 0 ? globalCapacities[cand[0]][bu] : DEFAULT_CAPACITY;
}

async function initFulfillmentRealtime() {
    const API_URL = "https://dc-ordermonitoring-backend.onrender.com/api/run";
    let bqDataList = [];
    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: 'apiGetDashboardSummary', args: ["", ""] }) });
        const result = await response.json();
        if (result.success && result.data) bqDataList = result.data;
        
        const dpVal = document.getElementById('date-picker').value || new Date().toISOString().split('T')[0];
        let dObj = new Date(dpVal); dObj.setDate(dObj.getDate() - 90);
        const startDate = dObj.toISOString().split('T')[0];
        const capResp = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: 'apiGetCapacity', args: [startDate, dpVal] }) });
        const capJson = await capResp.json();
        if (capJson.success && capJson.data) capJson.data.forEach(row => { if (!globalCapacities[row.target_date]) globalCapacities[row.target_date] = {}; globalCapacities[row.target_date][row.owner] = row.capacity; });
    } catch (apiErr) {}

    let unifiedDatesMap = {};
    if (globalData.fulfillment) {
        Object.keys(globalData.fulfillment).forEach(k => {
            let sd = getStandardDate(k); 
            if (!unifiedDatesMap[sd]) unifiedDatesMap[sd] = { bq: {}, wave: {}, ffm: {} };
            let fData = globalData.fulfillment[k].bu_data || {};
            Object.keys(fData).forEach(rawBu => {
                let sBu = standardizeBU(rawBu);
                if (!unifiedDatesMap[sd].ffm[sBu]) unifiedDatesMap[sd].ffm[sBu] = { ordTotal: 0, ordFull: 0, req: 0 };
                unifiedDatesMap[sd].ffm[sBu].ordTotal += parseFloat(fData[rawBu].orders || 0);
                unifiedDatesMap[sd].ffm[sBu].ordFull += parseFloat(fData[rawBu].completed || 0);
                unifiedDatesMap[sd].ffm[sBu].req += parseFloat(fData[rawBu].req_qty || 0);
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
                if (!unifiedDatesMap[sd].wave[sBu]) unifiedDatesMap[sd].wave[sBu] = { ordTotal: 0, ordFull: 0, late: 0, delay: 0 };
                unifiedDatesMap[sd].wave[sBu].ordTotal += parseFloat(wData[rawBu].total_orders || 0);
                unifiedDatesMap[sd].wave[sBu].ordFull += parseFloat(wData[rawBu].completed_orders || 0);
                unifiedDatesMap[sd].wave[sBu].late += parseFloat(wData[rawBu].late_orders || 0);
                unifiedDatesMap[sd].wave[sBu].delay = Math.max(unifiedDatesMap[sd].wave[sBu].delay, parseFloat(wData[rawBu].total_delay_mins || 0));
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
                    if (!unifiedDatesMap[sd].bq[sBu]) unifiedDatesMap[sd].bq[sBu] = { req:0, alloc:0, ship:0, ordTotal:0, ordFull:0 };
                    unifiedDatesMap[sd].bq[sBu].ordTotal += parseFloat(rawBq[rawBu].ordTotal || 0);
                    unifiedDatesMap[sd].bq[sBu].ordFull += parseFloat(rawBq[rawBu].perfectOrders || rawBq[rawBu].ordFull || 0);
                    unifiedDatesMap[sd].bq[sBu].req += parseFloat(rawBq[rawBu].req || 0);
                    unifiedDatesMap[sd].bq[sBu].alloc += parseFloat(rawBq[rawBu].alloc || 0);
                    unifiedDatesMap[sd].bq[sBu].ship += parseFloat(rawBq[rawBu].ship || 0);
                }
            });
        } catch(e) {}
    });
    delete unifiedDatesMap[""];
    let sortedDates = Object.keys(unifiedDatesMap).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

    const getBestOrderData = (bItem, wItem, fItem) => {
        let bt = parseFloat(bItem?.ordTotal || 0), bf = parseFloat(bItem?.ordFull || 0);
        let wt = parseFloat(wItem?.ordTotal || 0), wf = parseFloat(wItem?.ordFull || 0);
        let ft = parseFloat(fItem?.ordTotal || 0), ff = parseFloat(fItem?.ordFull || 0);
        let maxTotal = Math.max(bt, wt, ft);
        if (maxTotal === 0) return { tot: 0, full: 0 };
        let valid = [];
        if (bt >= maxTotal * 0.9) valid.push({ tot: bt, full: bf });
        if (wt >= maxTotal * 0.9) valid.push({ tot: wt, full: wf });
        if (ft >= maxTotal * 0.9) valid.push({ tot: ft, full: ff });
        valid.sort((a, b) => b.full - a.full);
        return { tot: valid[0].tot, full: valid[0].full };
    };

    let buNamesSet = new Set();
    let chartDataMap = {};
    let dpVal = document.getElementById('date-picker').value;
    let targetTimestamp = new Date(dpVal).setHours(23,59,59,999);
    let _mStart = new Date(targetTimestamp - (13 * 24 * 60 * 60 * 1000)).getTime();

    let tbodyFfm = "";
    sortedDates.forEach(dateStr => {
        let inWindow = new Date(dateStr).getTime() >= _mStart && new Date(dateStr).getTime() <= targetTimestamp;
        let allBUsInDay = new Set([...Object.keys(unifiedDatesMap[dateStr].bq), ...Object.keys(unifiedDatesMap[dateStr].wave), ...Object.keys(unifiedDatesMap[dateStr].ffm)]);
        let sortedOwners = Array.from(allBUsInDay).filter(o => o !== 'UNKNOWN' && o !== '').sort();

        sortedOwners.forEach(bu => {
            if (!window.selectedBUs.includes('ALL') && !window.selectedBUs.includes(bu)) return;
            buNamesSet.add(bu);
            let b = unifiedDatesMap[dateStr].bq[bu] || {}, w = unifiedDatesMap[dateStr].wave[bu] || {}, f = unifiedDatesMap[dateStr].ffm[bu] || {};
            let bData = getBestOrderData(b, w, f);
            
            let req = Math.max(parseFloat(b.req||0), parseFloat(f.req||0));
            let alloc = parseFloat(b.alloc||0); let ship = parseFloat(b.ship||0);
            
            if (inWindow) {
                let ordSLA = b.ordTotal > 0 ? Math.min(1, b.ordFull / b.ordTotal) : null;
                let dcSLA = alloc > 0 ? Math.min(1, ship / alloc) : null;
                let ffm = req > 0 ? Math.min(1, ship / req) : null;
                const pct = (v) => v === null ? '-' : `<span style="color:${v>=0.99?'#10B981':'#EF4444'}; font-weight:700;">${(v*100).toFixed(1)}%</span>`;
                
                tbodyFfm += `<tr>
                    <td class="font-bold">${dateStr}</td><td class="font-bold">${bu}</td>
                    <td class="text-center">${bData.tot}</td><td class="text-center">${req}</td><td class="text-center">${alloc}</td>
                    <td class="text-center font-bold text-green">${ship}</td>
                    <td class="text-center">${pct(ordSLA)}</td><td class="text-center">${pct(dcSLA)}</td><td class="text-center">${pct(ffm)}</td>
                </tr>`;
            }

            if (!chartDataMap[dateStr]) chartDataMap[dateStr] = { req:0, alloc:0, ship:0, ordTotal:0, buShip:{}, buReq:{}, buOrd:{} };
            chartDataMap[dateStr].req += req; chartDataMap[dateStr].alloc += alloc; chartDataMap[dateStr].ship += ship; chartDataMap[dateStr].ordTotal += bData.tot;
            chartDataMap[dateStr].buShip[bu] = ship; chartDataMap[dateStr].buReq[bu] = req; chartDataMap[dateStr].buOrd[bu] = bData.tot;
        });
    });

    let tblFfm = document.getElementById('ffm-detail-table');
    if (tblFfm) tblFfm.innerHTML = `<thead><tr><th>Date</th><th>Owner</th><th class="text-center">Orders</th><th class="text-center">Req</th><th class="text-center">ETA</th><th class="text-center">Ship</th><th class="text-center">Ord.SLA</th><th class="text-center">DC SLA</th><th class="text-center">FFM%</th></tr></thead><tbody>${tbodyFfm||'<tr><td colspan="9" class="text-center">No Data</td></tr>'}</tbody>`;

    let validChartDates = sortedDates.filter(d => new Date(d).getTime() <= targetTimestamp).slice(0, 7).reverse(); 
    let allBUsArray = Array.from(buNamesSet).sort();
    
    // 🌟 วาดกราฟแท่งไล่สี FFM Trend
    if (ffmTrendChartInstance && validChartDates.length > 0) {
        let tpDatasets = allBUsArray.map((bu, i) => ({
            label: bu,
            data: validChartDates.map(d => parseFloat(chartDataMap[d]?.buReq?.[bu] || 0)), 
            backgroundColor: (ctx) => getGradient(ctx.chart.ctx, ctx.chart.chartArea, gradPalettes[i%6].s, gradPalettes[i%6].e),
            borderRadius: 4
        }));
        ffmTrendChartInstance.data.labels = validChartDates;
        ffmTrendChartInstance.data.datasets = tpDatasets;
        ffmTrendChartInstance.update();
    }

    // 🌟 วาดโดนัทไล่สี FFM Volume
    if (ffmVolumeChartInstance && validChartDates.length > 0) {
        let targetD = validChartDates[validChartDates.length - 1]; 
        let mixLabels = []; let mixData = [];
        allBUsArray.forEach((bu) => {
            let ordCnt = chartDataMap[targetD]?.buOrd?.[bu] || 0; 
            if (ordCnt > 0) { mixLabels.push(bu); mixData.push(ordCnt); }
        });
        ffmVolumeChartInstance.data.labels = mixLabels;
        ffmVolumeChartInstance.data.datasets = [{
            data: mixData,
            backgroundColor: (ctx) => mixLabels.map((_, i) => getGradient(ctx.chart.ctx, ctx.chart.chartArea, gradPalettes[i%6].s, gradPalettes[i%6].e)),
            borderWidth: 0
        }];
        ffmVolumeChartInstance.update();
    }

    // อัปเดต Wave Ops KPI (เหมือนเดิม)
    let waveKey = validChartDates[validChartDates.length - 1];
    let aTotal = 0, aComp = 0, aLate = 0;
    allBUsArray.forEach(bu => {
        let b = getBestOrderData(unifiedDatesMap[waveKey]?.bq[bu], unifiedDatesMap[waveKey]?.wave[bu], unifiedDatesMap[waveKey]?.ffm[bu]);
        aTotal += b.tot; aComp += b.full;
        aLate += parseFloat(unifiedDatesMap[waveKey]?.wave[bu]?.late || 0);
    });

    document.getElementById('wave-total').innerText = fmtN(aTotal);
    document.getElementById('wave-completed').innerText = fmtN(aComp);
    document.getElementById('wave-late').innerText = fmtN(aLate);
    
    // อัปเดต FFM KPI
    document.getElementById('ffm-orders-shipped').innerText = fmtN(chartDataMap[waveKey]?.ordTotal || 0);
    let currFfm = chartDataMap[waveKey]?.req > 0 ? (chartDataMap[waveKey]?.ship / chartDataMap[waveKey]?.req)*100 : 0;
    document.getElementById('ffm-rate-val').innerText = `${currFfm.toFixed(1)}%`;
}

// ------------------------------------------------------------
// 👥 3. WORKFORCE SECTION
// ------------------------------------------------------------
function updateWorkforceUI(dateStr) {
    if (!globalData.workforce) return;
    const targetTimestamp = new Date(dateStr).setHours(23, 59, 59, 999);
    let wfKeys = Object.keys(globalData.workforce).sort((a,b) => new Date(getStandardDate(b)).getTime() - new Date(getStandardDate(a)).getTime());
    let validKeys = wfKeys.filter(k => new Date(getStandardDate(k)).getTime() <= targetTimestamp);
    
    if (validKeys.length > 0) {
        let tKey = validKeys[0];
        let d = globalData.workforce[tKey];
        let opsTotal = 0;
        Object.keys(d.matrix || {}).forEach(aff => {
            if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(aff)) {
                Object.keys(d.matrix[aff]).forEach(r => {
                    Object.values(d.matrix[aff][r]).forEach(val => opsTotal += val);
                });
            }
        });
        document.getElementById('headcount-total').innerText = fmtN(opsTotal);

        // 🌟 กราฟแท่ง Workforce ไล่สี (Stacked)
        let chartKeys = validKeys.slice(0,7).reverse();
        let affSet = new Set();
        chartKeys.forEach(k => Object.keys(globalData.workforce[k].matrix || {}).forEach(aff => {
            if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(aff)) affSet.add(aff);
        }));
        let affList = Array.from(affSet).sort();

        let datasets = affList.map((aff, i) => ({
            label: aff,
            data: chartKeys.map(k => {
                let m = globalData.workforce[k].matrix[aff]; if(!m) return 0;
                let sum=0; Object.keys(m).forEach(r => Object.values(m[r]).forEach(v => sum+=v)); return sum;
            }),
            backgroundColor: (ctx) => getGradient(ctx.chart.ctx, ctx.chart.chartArea, gradPalettes[i%6].s, gradPalettes[i%6].e),
            borderRadius: 4, stack: 'hc'
        }));

        workforceChartInstance.data.labels = chartKeys.map(k => { let dp = new Date(k); return `${String(dp.getDate()).padStart(2,'0')} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dp.getMonth()]}`; });
        workforceChartInstance.data.datasets = datasets;
        workforceChartInstance.update();
    }
}

// ------------------------------------------------------------
// ⏱️ 4. ON-TIME SECTION
// ------------------------------------------------------------
function updateOnTimeUI(dateStr) {
    if (!globalData.ontime) return;
    const targetTimestamp = dateStr ? new Date(dateStr).setHours(23, 59, 59, 999) : new Date().getTime();
    
    let otArray = Object.keys(globalData.ontime).map(k => ({
        dateObj: new Date(getStandardDate(k)), ptglg: globalData.ontime[k], hub: globalData.ontime_hub[k] || null
    })).filter(i => !isNaN(i.dateObj.getTime()) && i.dateObj.getTime() <= targetTimestamp).sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (otArray.length > 0) {
        let curr = otArray[otArray.length-1];
        let over = (curr.ptglg !== null && curr.hub !== null) ? (curr.ptglg+curr.hub)/2 : curr.ptglg;
        document.getElementById('ontime-val').innerText = over !== null ? `${over.toFixed(2)}%` : "0.00%";
        
        // 🌟 กราฟเส้นไล่สี (Fill under line)
        if(ontimeChartInstance) {
            let slice = otArray.slice(-14);
            ontimeChartInstance.data.labels = slice.map(i => `${String(i.dateObj.getDate()).padStart(2,'0')} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i.dateObj.getMonth()]}`);
            ontimeChartInstance.data.datasets = [{
                label: 'On-Time',
                data: slice.map(i => (i.ptglg !== null && i.hub !== null) ? (i.ptglg+i.hub)/2 : i.ptglg),
                borderColor: '#05CD99',
                backgroundColor: (context) => {
                    const {ctx, chartArea} = context.chart;
                    if(!chartArea) return 'transparent';
                    let gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(5, 205, 153, 0.01)'); 
                    gradient.addColorStop(1, 'rgba(5, 205, 153, 0.4)');  
                    return gradient;
                },
                fill: true, tension: 0.4, pointRadius: 4
            }];
            ontimeChartInstance.update();
        }
    }
}

// ------------------------------------------------------------
// 💰 5. CLAIM SECTION
// ------------------------------------------------------------
function updateClaimUI(dateStr) {
    if (!globalData.claims) return;
    const targetTimestamp = dateStr ? new Date(dateStr).setHours(23, 59, 59, 999) : new Date().getTime();
    
    let combinedData = [];
    Object.keys(globalData.claims).forEach(dKey => {
        let dObj = new Date(getStandardDate(dKey));
        if (!isNaN(dObj.getTime()) && dObj.getTime() <= targetTimestamp) {
            let cTotalCost = 0; let cTotalQty = 0;
            Object.keys(globalData.claims[dKey].bu_data || {}).forEach(bu => {
                if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) {
                    let buData = globalData.claims[dKey].bu_data[bu];
                    cTotalCost += typeof buData === 'object' ? (buData.cost||0) : (buData||0);
                    cTotalQty += typeof buData === 'object' ? (buData.qty||0) : 0;
                }
            });
            if(cTotalCost>0) combinedData.push({ dateObj: dObj, cost: cTotalCost, qty: cTotalQty });
        }
    });

    combinedData.sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (combinedData.length > 0) {
        let curr = combinedData[combinedData.length-1];
        document.getElementById('claim-val').innerText = fmtN(curr.cost);
        
        // 🌟 กราฟแท่ง Claim ไล่สีแดง
        if(claimChart2Instance) {
            let slice = combinedData.slice(-14);
            claimChart2Instance.data.labels = slice.map(i => `${String(i.dateObj.getDate()).padStart(2,'0')} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i.dateObj.getMonth()]}`);
            claimChart2Instance.data.datasets[0].data = slice.map(i => i.cost);
            claimChart2Instance.data.datasets[1].data = slice.map(i => i.qty);
            claimChart2Instance.data.datasets[0].backgroundColor = (ctx) => getGradient(ctx.chart.ctx, ctx.chart.chartArea, '#EF4444', '#F87171');
            claimChart2Instance.update();
        }
    }
}

// ------------------------------------------------------------
// 📦 6. INVENTORY SECTION
// ------------------------------------------------------------
function updateInventoryUI(dateStr) {
    if (!globalData.inventory) return;
    const targetTimestamp = dateStr ? new Date(dateStr).setHours(23, 59, 59, 999) : new Date().getTime();
    
    let parsedData = [];
    Object.keys(globalData.inventory).forEach(mLabel => {
        let parts = mLabel.split('-');
        if (parts.length === 2) {
            let dObj = new Date(`${parts[0]} 1, 20${parts[1]}`);
            if(dObj.getTime() <= targetTimestamp) {
                let monthGroup = globalData.inventory[mLabel];
                let sumOnhand = 0, sumDiff = 0, count = 0;
                Object.keys(monthGroup.bu_data).forEach(bu => {
                    if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) {
                        sumOnhand += monthGroup.bu_data[bu].onhand; 
                        sumDiff += monthGroup.bu_data[bu].diff;     
                        count += monthGroup.bu_data[bu].count; 
                    }
                });
                let pct = count > 0 ? (sumOnhand > 0 ? Math.max(0, (1 - (sumDiff/sumOnhand))*100) : 0) : null;
                parsedData.push({ label: mLabel, dateObj: dObj, pct: pct });
            }
        }
    });

    parsedData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (parsedData.length > 0) {
        let curr = parsedData[parsedData.length-1];
        document.getElementById('inv-val').innerText = curr.pct !== null ? `${curr.pct.toFixed(2)}%` : "-";
        
        // 🌟 กราฟเส้น Inventory ไล่สีเขียว Teal
        if(inventoryChartInstance) {
            inventoryChartInstance.data.labels = parsedData.map(i => i.label);
            inventoryChartInstance.data.datasets[0] = {
                label: 'Accuracy %',
                data: parsedData.map(i => i.pct),
                borderColor: '#06B6D4',
                backgroundColor: (context) => {
                    const {ctx, chartArea} = context.chart;
                    if(!chartArea) return 'transparent';
                    let gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.01)'); 
                    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.4)');  
                    return gradient;
                },
                fill: true, tension: 0.4, pointRadius: 4
            };
            inventoryChartInstance.update();
        }
    }
}

// ==========================================
// 🚀 เริ่มทำงาน
// ==========================================
initDashboard();
