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
// 🎨 CHART.JS GRADIENTS & COLORS
// ==========================================
function getGradient(ctx, chartArea, colorStart, colorEnd) {
    if (!chartArea) return colorStart;
    let gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
}

const gradPalettes = [
    { s: '#60A5FA', e: '#3B82F6' }, // Blue
    { s: '#34D399', e: '#10B981' }, // Green
    { s: '#FCD34D', e: '#F59E0B' }, // Yellow
    { s: '#A78BFA', e: '#8B5CF6' }, // Purple
    { s: '#F87171', e: '#EF4444' }, // Red
    { s: '#22D3EE', e: '#06B6D4' }  // Teal
];

const solidColors = ['#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F87171', '#22D3EE', '#94A3B8'];

Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#64748B';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
Chart.defaults.plugins.tooltip.titleFont = { size: 13, family: 'Inter', weight: 'bold' };
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;

const fmtN = (v) => (v || 0).toLocaleString();

// 🟢 [FIX] Plugin วาดป้ายตัวเลข: เพิ่มเงื่อนไขตรวจสอบความสูงแท่งกราฟ (bar.height) ป้องกันตัวเลขซ้อนกัน
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
                // เช็คความสูงของแท่งกราฟ ถ้าเตี้ยกว่า 15px ไม่ต้องวาดตัวเลขไว้ข้างใน
                if(data > 0 && bar.height > 15){
                    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#F8FAFC' : '#1E293B';
                    ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                    let val = (chart.canvas.id.includes('claim')) ? fmtN(data) : (data%1!==0 ? data.toFixed(1)+'%' : fmtN(data));
                    ctx.fillText(val, bar.x, bar.y - 4);
                }
            });
        });
        
        // สำหรับ Stacked Bar (วาดเฉพาะผลรวมไว้บนสุดของแท่งเท่านั้น จะได้ไม่รก)
        if (chart.canvas.id === 'ffmTrendChart' || chart.canvas.id === 'workforceChart') {
            let totals = []; let xCoords = []; let topY = [];
            chart.data.datasets.forEach((dataset, i) => {
                if (!chart.isDatasetVisible(i) || dataset.type === 'line') return;
                const meta = chart.getDatasetMeta(i);
                dataset.data.forEach((val, index) => { 
                    totals[index] = (totals[index] || 0) + (val || 0); 
                    if (meta.data[index]) {
                        xCoords[index] = meta.data[index].x;
                        topY[index] = Math.min(topY[index] || 9999, meta.data[index].y);
                    }
                });
            });
            chart.data.labels.forEach((_, index) => {
                if (totals[index] > 0 && xCoords[index] && topY[index]) {
                    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#F8FAFC' : '#1E293B';
                    ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                    ctx.fillText(fmtN(Math.round(totals[index])), xCoords[index], topY[index] - 5);
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
                    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#F8FAFC' : '#1E293B';
                    ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = i === 0 ? 'bottom' : 'top'; 
                    let yOffset = i === 0 ? -8 : 8;
                    ctx.fillText(Number(data).toFixed(1) + '%', point.x, point.y + yOffset);
                }
            });
        });
    }
};

// ==========================================
// 🌟 INITIALIZE CHARTS
// ==========================================
let ffmTrendChartInstance = new Chart(document.getElementById('ffmTrendChart'), { 
    type: 'bar', data: { labels: [], datasets: [] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels:{usePointStyle:true, boxWidth:8} } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, border: { display: false }, grace: '15%' } } }, plugins: [dataLabelPlugin] 
});

let ffmVolumeChartInstance = new Chart(document.getElementById('ffmVolumeChart'), { 
    type: 'doughnut', data: { labels: [], datasets: [] }, 
    options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'right', labels:{usePointStyle:true, boxWidth:8} } } } 
});

let workforceChartInstance = new Chart(document.getElementById('workforceChart'), { 
    type: 'bar', data: { labels: [], datasets: [] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels:{usePointStyle:true, boxWidth:8} } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, border: { display: false }, grace: '15%' } } }, plugins: [dataLabelPlugin] 
});

let ontimeChartInstance = new Chart(document.getElementById('ontimeChart2'), { 
    type: 'line', data: { labels: [], datasets: [] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels:{usePointStyle:true, boxWidth:8} } }, scales: { x: { grid: { display: false } }, y: { border: { display: false }, max: 105 } } }, plugins: [lineDataLabelPlugin]
});

let claimChart2Instance = new Chart(document.getElementById('claimChart2'), { 
    type: 'bar', data: { labels: [], datasets: [ { label: 'มูลค่าเคลม (฿)', data: [], backgroundColor: '#F87171', borderRadius: 4, yAxisID: 'y' }, { label: 'จำนวนชิ้น', data: [], type: 'line', yAxisID: 'y1', pointRadius: 4, borderWidth: 2, borderColor: '#60A5FA', backgroundColor: '#60A5FA' } ] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels:{usePointStyle:true, boxWidth:8} } }, scales: { x: {grid:{display:false}}, y: {position: 'left', grace: '15%', border:{display:false}}, y1: {position: 'right', display:false} } }, plugins: [dataLabelPlugin] 
});

let inventoryChartInstance = new Chart(document.getElementById('inventoryChart'), { 
    type: 'line', data: { labels: [], datasets: [{ label: 'Accuracy %', data: [], fill: true }] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { border: { display: false }, grace: '5%' } } }, plugins: [lineDataLabelPlugin]
});

let productivityChartInstance = new Chart(document.getElementById('productivityChart'), { 
    type: 'bar', data: { labels: [], datasets: [{type:'bar', label:'Background'}, {type:'bar', label:'Actual UPH'}, {type:'line', label:'Target', borderColor:'#F59E0B', borderDash:[5,5]}] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, stacked: false }, y: { display: false, grace: '25%' } } } 
});


// ==========================================
// DATA FETCHING & PROCESSING (Logic เดิม 100%)
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
    Chart.defaults.color = isDark ? '#94A3B8' : '#64748B';
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
        <div class="ms-btn modern-input dropdown-trigger" style="min-width:110px;">
            <span class="ms-text">${label}: All</span><span class="arrow" style="font-size:10px; margin-left:5px;">▼</span>
        </div>
        <div class="ms-menu dropdown-menu">
            <label class="dropdown-option"><input type="checkbox" class="ms-all" checked> All</label>
            <div class="divider"></div>
            <div class="ms-list checkbox-list"></div>
            <button class="ms-apply btn-primary w-full mt-10">Apply</button>
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
            lbl.className = 'dropdown-option';
            lbl.innerHTML = `<input type="checkbox" class="ms-item" value="${v}" ${selected.has(v) ? 'checked' : ''}> ${v}`;
            listEl.appendChild(lbl);
        });
        allCb.checked = isAll();
        refreshText();
    };

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown-menu').forEach(m => { if (m !== menu) m.style.display = 'none'; });
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
    
    if (cbList && cbList.innerHTML === '') {
        sortedBUs.forEach(bu => {
            const label = document.createElement('label');
            label.className = 'dropdown-option';
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
            document.querySelectorAll('.dropdown-menu').forEach(m => { if (m !== menu) m.style.display = 'none'; });
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
    container.innerHTML = '<span class="text-sm text-muted">⏳ กำลังดึงข้อมูล...</span>';
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
        container.innerHTML += `<div style="display:flex; flex-direction:column;"><label class="text-xs text-muted font-bold">${bu}</label><input type="number" id="cap-input-${bu}" value="${currentCap}" data-bu="${bu}" class="modern-input" style="width:75px;"></div>`;
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
        
        const dpVal = document.getElementById('date-picker')?.value || new Date().toISOString().split('T')[0];
        let dObj = new Date(dpVal); dObj.setDate(dObj.getDate() - 90);
        const startDate = dObj.toISOString().split('T')[0];
        const capResp = await fetch("https://dc-ordermonitoring-backend.onrender.com/api/run", {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fn: 'apiGetCapacity', args: [startDate, dpVal] })
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
        let sortedDates = Object.keys(unifiedDatesMap).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

        let htmlTable = ``;
        let buNamesSet = new Set();
        let chartDataMap = {};

        let _mEnd = new Date(document.getElementById('date-picker')?.value || new Date()); _mEnd.setHours(23,59,59,999);
        let _mStart = new Date(_mEnd); _mStart.setHours(0,0,0,0); _mStart.setDate(_mStart.getDate() - 13);
        let matrixRowsEmitted = 0;

        if (sortedDates.length === 0) {
            htmlTable += `<tr><td colspan="14" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
        } else {
            sortedDates.forEach(dateStr => {
                let parts = dateStr.split('-');
                let displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
                let _dts = new Date(dateStr).getTime();
                let inMatrixWindow = _dts >= _mStart.getTime() && _dts <= _mEnd.getTime();

                let bqData = unifiedDatesMap[dateStr].bq || {};
                let wData = unifiedDatesMap[dateStr].wave || {};
                let fData = unifiedDatesMap[dateStr].ffm || {};
                
                let allBUsInDay = new Set([...Object.keys(bqData), ...Object.keys(wData), ...Object.keys(fData)]);
                let sortedOwners = Array.from(allBUsInDay).filter(o => o !== 'UNKNOWN' && o !== '').sort();

                sortedOwners.forEach(bu => {
                    if (window.selectedBUs && !window.selectedBUs.includes('ALL') && !window.selectedBUs.includes(bu)) return;
                    buNamesSet.add(bu);
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

                    if (inMatrixWindow) {
                        matrixRowsEmitted++;
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
                    }

                    if (!chartDataMap[dateStr]) chartDataMap[dateStr] = { req:0, alloc:0, ship:0, ordTotal:0, buShip: {}, buReq: {}, buOrd: {} };
                    chartDataMap[dateStr].req += req; chartDataMap[dateStr].alloc += alloc;
                    chartDataMap[dateStr].ship += ship; chartDataMap[dateStr].ordTotal += ordTotal;
                    chartDataMap[dateStr].buShip[bu] = ship; chartDataMap[dateStr].buReq[bu] = req; chartDataMap[dateStr].buOrd[bu] = ordTotal;
                });
            });
        }
        if (matrixRowsEmitted === 0 && sortedDates.length > 0) {
            htmlTable += `<tr><td colspan="14" class="text-center text-muted">ไม่มีข้อมูลใน 14 วันล่าสุด (นับจากวันที่เลือก)</td></tr>`;
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

        const dpVal = document.getElementById('date-picker')?.value || new Date().toISOString().split('T')[0];
        const targetTimestamp = new Date(dpVal).setHours(23, 59, 59, 999);
        
        let validChartDates = sortedDates.filter(d => new Date(d).getTime() <= targetTimestamp).slice(0, 7).reverse(); 
        let allBUsArray = Array.from(buNamesSet).sort();
        const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const ffmBuFilter = document.getElementById('ffm-bu-filter');
        if (ffmBuFilter && ffmBuFilter.options.length <= 1) {
            allBUsArray.forEach(bu => ffmBuFilter.appendChild(new Option(bu, bu)));
        }
        const ffmBuFilterVal = ffmBuFilter?.value || 'ALL';
        let chartBUsArray = ffmBuFilterVal === 'ALL' ? allBUsArray : [ffmBuFilterVal];

        try {
            // 🌟 กราฟแท่ง FFM เป็นสี Gradient
            if (typeof ffmTrendChartInstance !== 'undefined' && ffmTrendChartInstance && validChartDates.length > 0) {
                let tpLabels = validChartDates.map(dStr => {
                    let parts = dStr.split('-');
                    return parts.length === 3 ? `${parseInt(parts[2])} ${shortMonths[parseInt(parts[1])-1]}` : dStr;
                });
                
                let tpDatasets = chartBUsArray.map((bu, i) => {
                    let colorIndex = allBUsArray.indexOf(bu) !== -1 ? allBUsArray.indexOf(bu) : i; 
                    return {
                        label: bu,
                        data: validChartDates.map(dStr => parseFloat(chartDataMap[dStr]?.buReq?.[bu] || 0)), 
                        backgroundColor: (context) => {
                            const chart = context.chart;
                            const {ctx, chartArea} = chart;
                            if (!chartArea) return gradPalettes[colorIndex % 6].s;
                            return getGradient(ctx, chartArea, gradPalettes[colorIndex % 6].s, gradPalettes[colorIndex % 6].e);
                        },
                        borderRadius: 4
                    };
                });

                let dailyCapData = validChartDates.map(dStr => {
                    let dayTotalCap = 0;
                    chartBUsArray.forEach(bu => dayTotalCap += getEffectiveCap(dStr, bu));
                    return dayTotalCap;
                });

                tpDatasets.push({
                    type: 'line', label: 'Total Capacity', data: dailyCapData, borderColor: '#EF4444', backgroundColor: '#EF4444', borderWidth: 2, borderDash: [5, 5], fill: false, pointRadius: 4, order: 0
                });

                ffmTrendChartInstance.config.type = 'bar';
                ffmTrendChartInstance.data.labels = tpLabels;
                ffmTrendChartInstance.data.datasets = tpDatasets;
                ffmTrendChartInstance.update();
            }

            // 🌟 กราฟโดนัท FFM สี Gradient
            if (typeof ffmVolumeChartInstance !== 'undefined' && ffmVolumeChartInstance && validChartDates.length > 0) {
                let targetD = validChartDates[validChartDates.length - 1]; 
                for (let i = validChartDates.length - 1; i >= 0; i--) {
                    let d = validChartDates[i];
                    let totalOrdForDay = chartBUsArray.reduce((sum, bu) => sum + (chartDataMap[d]?.buOrd?.[bu] || 0), 0);
                    if (totalOrdForDay > 0) { targetD = d; break; }
                }

                let mixLabels = []; let mixData = [];
                chartBUsArray.forEach((bu) => {
                    let ordCnt = chartDataMap[targetD]?.buOrd?.[bu] || 0; 
                    if (ordCnt > 0) { mixLabels.push(bu); mixData.push(ordCnt); }
                });

                ffmVolumeChartInstance.data.labels = mixLabels;
                ffmVolumeChartInstance.data.datasets = [{
                    data: mixData,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return mixLabels.map((_, i) => gradPalettes[i % 6].s);
                        return mixLabels.map((_, i) => getGradient(ctx, chartArea, gradPalettes[i % 6].s, gradPalettes[i % 6].e));
                    },
                    borderWidth: 0
                }];
                ffmVolumeChartInstance.update();
            } 
        } catch(chartErr) { }

        const utilTableEl = document.getElementById('utilization-table');
        if (utilTableEl && sortedDates.length > 0) {
            let targetD = sortedDates[0]; 
            for (let i = 0; i < sortedDates.length; i++) {
                let d = sortedDates[i];
                if (new Date(d).getTime() > targetTimestamp) continue; 
                let totalReqForDay = chartBUsArray.reduce((sum, bu) => sum + (chartDataMap[d]?.buReq?.[bu] || 0), 0);
                if (totalReqForDay > 0) { targetD = d; break; }
            }

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
                    
                    let statusObj = { text: "Available", color: "#166534", bg: "#dcfce7", barColor: "#3B82F6" }; 
                    if (item.utilPct >= 100) { statusObj = { text: "Overloaded", color: "#991b1b", bg: "#fee2e2", barColor: "#EF4444" }; } 
                    else if (item.utilPct >= 90) { statusObj = { text: "Near cap.", color: "#92400e", bg: "#fef3c7", barColor: "#F59E0B" }; } 
                    else if (item.utilPct >= 70) { statusObj = { text: "Optimal", color: "#166534", bg: "#dcfce7", barColor: "#10B981" }; }

                    tbody += `
                    <tr>
                        <td class="font-bold">${item.bu}</td>
                        <td class="text-right font-bold">${fmtN(item.vol)}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <span class="font-bold text-xs" style="width:40px; text-align:right;">${utilDisp}%</span>
                                <div style="flex:1; background:var(--border-color); border-radius:10px; height:8px; overflow:hidden;">
                                    <div style="width:${barWidth}%; background:${statusObj.barColor}; height:100%; border-radius:10px;"></div>
                                </div>
                            </div>
                        </td>
                        <td class="text-center">
                            <span style="padding:4px 10px; border-radius:12px; font-size:11px; font-weight:800; display:inline-block; width:85px; background:${statusObj.bg}; color:${statusObj.color};">${statusObj.text}</span>
                        </td>
                    </tr>`;
                });
            }
            tbody += "</tbody>";
            const theadEl = utilTableEl.querySelector('thead');
            utilTableEl.innerHTML = (theadEl ? theadEl.outerHTML : '') + tbody;
        }
        
        let validWaveKeys = sortedDates.filter(k => new Date(k).getTime() <= targetTimestamp + (3 * 24 * 60 * 60 * 1000)).slice(0, 7);
        let totalOrdersToday = 0, totalOrdersYesterday = 0, activeWaveKey = null, todayKeyStr = null, yesterdayKeyStr = null;

        if (validWaveKeys.length > 0) {
            let todayKey = validWaveKeys.find(k => new Date(k).getTime() <= targetTimestamp);
            if (todayKey) {
                todayKeyStr = todayKey;
                totalOrdersToday = chartDataMap[todayKey]?.ordTotal || 0;
                let yIndex = validWaveKeys.indexOf(todayKey) + 1;
                if (yIndex < validWaveKeys.length) {
                    yesterdayKeyStr = validWaveKeys[yIndex];
                    totalOrdersYesterday = chartDataMap[validWaveKeys[yIndex]]?.ordTotal || 0;
                }
            }
            
            let reversedKeys = [...validWaveKeys].reverse();
            for (let k of reversedKeys) {
                let dayTot = 0, dayComp = 0;
                allBUsArray.forEach(bu => {
                    let bData = getBestOrderData(unifiedDatesMap[k].bq[bu], unifiedDatesMap[k].wave[bu], unifiedDatesMap[k].ffm[bu]);
                    dayTot += bData.tot; dayComp += bData.full;
                });
                if (dayTot > 0 && dayComp < dayTot) { 
                    if (dayComp === 0 && dayTot <= 5) continue;
                    activeWaveKey = k; break; 
                }
            }
            
            if (!activeWaveKey) {
                let dayWithOrders = validWaveKeys.find(k => {
                     let t = 0;
                     allBUsArray.forEach(bu => t += Math.max(parseFloat(unifiedDatesMap[k].bq[bu]?.ordTotal||0), parseFloat(unifiedDatesMap[k].wave[bu]?.ordTotal||0), parseFloat(unifiedDatesMap[k].ffm[bu]?.ordTotal||0)));
                     return t > 0;
                });
                activeWaveKey = dayWithOrders || validWaveKeys[0];
            }
        }

        const formatShortDate = (dStr) => {
            if (!dStr) return ""; let dObj = new Date(dStr);
            return isNaN(dObj.getTime()) ? dStr : `${String(dObj.getDate()).padStart(2, '0')} ${shortMonths[dObj.getMonth()]}`;
        };
        const getDisplayDate = (dStr) => {
             if (!dStr) return ""; let dObj = new Date(dStr);
             return isNaN(dObj.getTime()) ? dStr : `${String(dObj.getDate()).padStart(2, '0')} ${shortMonths[dObj.getMonth()]} ${dObj.getFullYear()}`;
        };

        const ordersEl = document.getElementById('ffm-orders-shipped');
        if (ordersEl) {
            ordersEl.innerText = totalOrdersToday > 0 ? fmtN(totalOrdersToday) : "0";
            const trendEl = document.getElementById('ffm-orders-trend');
            const trendTextEl = document.getElementById('ffm-orders-note');
            
            if (trendEl) {
                let prevDateText = yesterdayKeyStr ? formatShortDate(yesterdayKeyStr) : "วันก่อนหน้า";
                if (totalOrdersYesterday === 0 && totalOrdersToday === 0) {
                    trendEl.innerText = "-"; if(trendTextEl) trendTextEl.innerText = "ไม่มีข้อมูลเปรียบเทียบ";
                } else if (totalOrdersYesterday === 0) {
                    trendEl.innerText = "↗ 100%"; if(trendTextEl) trendTextEl.innerText = `vs ${prevDateText}`;
                } else {
                    let pctDiff = ((totalOrdersToday - totalOrdersYesterday) / totalOrdersYesterday) * 100;
                    if (pctDiff > 0) { trendEl.innerText = `↗ +${pctDiff.toFixed(1)}%`; } 
                    else if (pctDiff < 0) { trendEl.innerText = `↘ ${Math.abs(pctDiff).toFixed(1)}%`; } 
                    else { trendEl.innerText = `0%`; }
                    if(trendTextEl) { trendTextEl.innerText = `vs ${prevDateText}`; }
                }
            }
            let updateSpan = document.getElementById('ffm-orders-update');
            if (updateSpan && todayKeyStr) updateSpan.innerText = `Updated: ${getDisplayDate(todayKeyStr)}`;
        }

        const waveSummaryTable = document.getElementById('wave-summary-table');
        if (waveSummaryTable) {
            if (validWaveKeys.length === 0 || allBUsArray.length === 0) {
                waveSummaryTable.innerHTML = `<thead><tr><th class='text-center text-muted'>ไม่มีข้อมูลออเดอร์</th></tr></thead>`;
            } else {
                let thead = `<thead><tr><th class="text-center">Planned Date</th>${allBUsArray.map(bu => `<th class="text-center">${bu}</th>`).join('')}<th class="text-center">Total (เสร็จ/ทั้งหมด)</th><th class="text-center">% Completed</th></tr></thead>`;
                let tbody = "<tbody>";
                
                validWaveKeys.forEach(dStr => {
                    let dObj = new Date(dStr);
                    let dispDate = isNaN(dObj.getTime()) ? dStr : `${String(dObj.getDate()).padStart(2, '0')} ${shortMonths[dObj.getMonth()]}`;
                    
                    let tr = `<tr><td class="text-center font-bold" style="position:sticky; left:0; background:var(--bg-card); z-index:10;">${dispDate}</td>`;
                    let dayTot = 0, dayComp = 0;
                    
                    allBUsArray.forEach(bu => {
                        let bData = getBestOrderData(unifiedDatesMap[dStr].bq[bu], unifiedDatesMap[dStr].wave[bu], unifiedDatesMap[dStr].ffm[bu]);
                        let ordTotal = bData.tot; let ordFull = bData.full;
                        dayTot += ordTotal; dayComp += ordFull;
                        if (ordTotal === 0) { tr += `<td class="text-center text-muted">-</td>`; } 
                        else {
                            let color = (ordFull === ordTotal) ? 'var(--brand-green)' : (ordFull > 0 ? 'var(--brand-yellow)' : 'var(--brand-red)');
                            tr += `<td class="text-center"><span style="color:${color}; font-weight:800;">${fmtN(ordFull)}</span> <span class="text-xs text-muted">/ ${fmtN(ordTotal)}</span></td>`;
                        }
                    });
                    
                    let grandColor = (dayComp === dayTot && dayTot > 0) ? 'var(--brand-green)' : (dayComp > 0 ? 'var(--brand-yellow)' : 'var(--brand-red)');
                    tr += `<td class="text-center"><span style="color:${grandColor}; font-weight:800;">${fmtN(dayComp)}</span> <span class="text-xs text-muted">/ ${fmtN(dayTot)}</span></td>`;
                    
                    let pct = dayTot > 0 ? Math.min(100, (dayComp / dayTot) * 100).toFixed(1) : 0;
                    let pctBg = pct >= 100 ? '#dcfce7' : (pct > 0 ? '#fef3c7' : '#fee2e2');
                    let pctColor = pct >= 100 ? '#166534' : (pct > 0 ? '#92400e' : '#991b1b');
                    tr += `<td class="text-center"><span style="background:${pctBg}; color:${pctColor}; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:600;">${pct}%</span></td></tr>`;
                    tbody += tr;
                });
                waveSummaryTable.innerHTML = thead + tbody + "</tbody>";
            }

            let latestShipDateStr = null, prevShipDateStr = null;
            for (let d of sortedDates) {
                let s = chartDataMap[d]?.ship || 0;
                if (s > 0) { if (!latestShipDateStr) latestShipDateStr = d; else if (!prevShipDateStr) { prevShipDateStr = d; break; } }
            }

            const rateValEl = document.getElementById('ffm-rate-val');
            const rateEtaEl = document.getElementById('ffm-rate-eta');
            if (rateValEl && latestShipDateStr) {
                let lReq = chartDataMap[latestShipDateStr].req || 0, lAlloc = chartDataMap[latestShipDateStr].alloc || 0, lShip = chartDataMap[latestShipDateStr].ship || 0;
                let pReq = prevShipDateStr ? (chartDataMap[prevShipDateStr].req || 0) : 0, pAlloc = prevShipDateStr ? (chartDataMap[prevShipDateStr].alloc || 0) : 0, pShip = prevShipDateStr ? (chartDataMap[prevShipDateStr].ship || 0) : 0;

                let currentFfm = lReq > 0 ? (lShip / lReq) * 100 : 0;
                let currentEtaFfm = lAlloc > 0 ? Math.min(100, (lShip / lAlloc) * 100) : 0;
                let prevFfm = pReq > 0 ? (pShip / pReq) * 100 : 0;
                let prevEtaFfm = pAlloc > 0 ? Math.min(100, (pShip / pAlloc) * 100) : 0;

                rateValEl.innerText = `${currentFfm.toFixed(1)}%`;
                if (rateEtaEl) rateEtaEl.innerText = `DC SLA: ${currentEtaFfm.toFixed(1)}%`;

                const rateTrendEl = document.getElementById('ffm-rate-trend'), etaTrendEl = document.getElementById('eta-rate-trend'), rateNoteEl = document.getElementById('ffm-rate-note');
                if (rateNoteEl) {
                    if (!prevShipDateStr) {
                        if (rateTrendEl) rateTrendEl.innerText = "-";
                        if (etaTrendEl) etaTrendEl.innerText = "-";
                        rateNoteEl.innerText = "ไม่มีข้อมูลเปรียบเทียบ";
                    } else {
                        if (rateTrendEl) {
                            let diffFfm = currentFfm - prevFfm;
                            if (diffFfm > 0) rateTrendEl.innerText = `↗ +${diffFfm.toFixed(1)}%`;
                            else if (diffFfm < 0) rateTrendEl.innerText = `↘ ${Math.abs(diffFfm).toFixed(1)}%`;
                            else rateTrendEl.innerText = `0%`;
                        }
                        if (etaTrendEl) {
                            let diffEta = currentEtaFfm - prevEtaFfm;
                            if (diffEta > 0) etaTrendEl.innerText = `↗ +${diffEta.toFixed(1)}%`;
                            else if (diffEta < 0) etaTrendEl.innerText = `↘ ${Math.abs(diffEta).toFixed(1)}%`;
                            else etaTrendEl.innerText = `0%`;
                        }
                        rateNoteEl.innerText = `vs ${formatShortDate(prevShipDateStr)}`;
                    }
                }
                let updateSpan = document.getElementById('ffm-rate-update');
                if (updateSpan && latestShipDateStr) updateSpan.innerText = `Updated: ${getDisplayDate(latestShipDateStr)}`;
            }
        }

        // WAVE OPERATIONS UI
        let aTotal = 0, aComp = 0, aLate = 0, aDelay = 0; let worstBU = ""; 
        if (activeWaveKey) {
            allBUsArray.forEach(bu => {
                let bData = getBestOrderData(unifiedDatesMap[activeWaveKey].bq[bu], unifiedDatesMap[activeWaveKey].wave[bu], unifiedDatesMap[activeWaveKey].ffm[bu]);
                let ordTotal = bData.tot; let ordFull = bData.full;
                let late = parseFloat(unifiedDatesMap[activeWaveKey].wave[bu]?.late_orders || 0);
                let delay = parseFloat(unifiedDatesMap[activeWaveKey].wave[bu]?.total_delay_mins || 0);

                aTotal += ordTotal; aComp += ordFull; aLate += late;
                if (delay > aDelay) { aDelay = delay; worstBU = bu; }
            });
            
            let diffDays = 0; let activeDateStr = "--";
            if (activeWaveKey) { 
                let dObj = new Date(activeWaveKey);
                activeDateStr = isNaN(dObj.getTime()) ? activeWaveKey : `${String(dObj.getDate()).padStart(2, '0')} ${shortMonths[dObj.getMonth()]}`; 
                let todayD = new Date(); todayD.setHours(0,0,0,0); 
                let workDMid = new Date(activeWaveKey); workDMid.setHours(0,0,0,0); 
                diffDays = Math.floor((todayD - workDMid) / (1000 * 60 * 60 * 24)); 
            }

            if (document.getElementById('wave-total')) {
                document.getElementById('wave-total').innerText = aTotal > 0 ? fmtN(aTotal) : "0";
                document.getElementById('wave-completed').innerText = aComp > 0 ? fmtN(aComp) : "0";
                document.getElementById('wave-late').innerText = aLate > 0 ? fmtN(aLate) : "0";
                let delayEl = document.getElementById('wave-delay');
                if (delayEl) {
                    if (aDelay > 0) delayEl.innerText = `${Math.floor(aDelay / 60)}h ${aDelay % 60}m`;
                    else delayEl.innerText = `0h 0m`;
                }
                
                let waveStats = { total_orders: 0, late_pick_orders: 0, late_load_orders: 0, max_pick_delay_mins: 0, max_load_delay_mins: 0, min_pick_early_mins: null, min_load_early_mins: null, picked_orders: 0, shipped_orders: 0 };
                try {
                    let queryDate = activeWaveKey ? new Date(activeWaveKey).toISOString().split('T')[0] : "";
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
                    if (isApiSuccess && (latePick + lateLoad) > 0) {
                        document.getElementById('wave-active-info-3').innerHTML = totalLate > 0 ? `<span class="badge-white">หลุด SLA</span> Pick: ${fmtN(latePick)} | Load: ${fmtN(lateLoad)}` : `<span class="badge-white">On-time</span>`;
                    } else {
                        document.getElementById('wave-active-info-3').innerHTML = totalLate > 0 ? `<span class="badge-white">หลุด SLA</span> ${fmtN(totalLate)} บิล` : `<span class="badge-white">On-time</span>`;
                    }
                }

                if (document.getElementById('wave-delay')) {
                    let pStr = "", lStr = "", overallMainText = "0h 0m";
                    if (isApiSuccess) {
                        if (maxPickDelay > 0) { pStr = `Delay ${formatTime(maxPickDelay)}`; overallMainText = formatTime(maxOverallDelay); }
                        else if (!isNaN(pEarly) && pEarly !== null) { pStr = `Early ${formatTime(pEarly)}`; }
                        else { pStr = `Done`; }

                        if (maxLoadDelay > 0) { lStr = `Delay ${formatTime(maxLoadDelay)}`; overallMainText = formatTime(maxOverallDelay); }
                        else if (!isNaN(lEarly) && lEarly !== null) { lStr = `Early ${formatTime(lEarly)}`; }
                        else { lStr = `Done`; }
                        
                        document.getElementById('wave-active-info-4').innerHTML = `Pick: ${pStr} &bull; Load: ${lStr}`;
                    } else {
                        if (aDelay > 0) {
                            overallMainText = formatTime(aDelay);
                            document.getElementById('wave-active-info-4').innerHTML = `<span class="badge-white">ดีเลย์อยู่</span> ช้าสุด: ${worstBU}`;
                        } else {
                            document.getElementById('wave-active-info-4').innerHTML = `<span class="badge-white">ปกติ</span>`;
                        }
                    }
                    if (maxOverallDelay > 0) overallMainText = formatTime(maxOverallDelay);
                    document.getElementById('wave-delay').innerText = overallMainText;
                }

                if (document.getElementById('stage-pick-pct')) {
                    let fTotal = aTotal > 0 ? aTotal : (parseInt(waveStats.total_orders) || 0);
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
                
                let targetWaveDate = activeWaveKey || todayKeyStr;
                if (targetWaveDate) {
                    let dispDate = getDisplayDate(targetWaveDate);
                    ['1','2','3','4'].forEach(n => {
                        let el = document.getElementById(`wave-date-${n}`);
                        if(el) el.innerText = `Updated: ${dispDate}`;
                    });
                    ['pick','qc','ship'].forEach(s => {
                        let el = document.getElementById(`stage-${s}-date`);
                        if(el) el.innerText = `Updated: ${dispDate}`;
                    });
                }
            }
        }

    } catch (err) {}
}

function updateWorkforceUI() {
    if (!globalData.workforce) return;
    const dpVal = document.getElementById('date-picker')?.value || new Date().toISOString().split('T')[0];
    const targetTimestamp = new Date(dpVal).setHours(23, 59, 59, 999);
    let wfKeys = Object.keys(globalData.workforce).sort((a,b) => new Date(getStandardDate(b)).getTime() - new Date(getStandardDate(a)).getTime());
    let validKeys = wfKeys.filter(k => new Date(getStandardDate(k)).getTime() <= targetTimestamp);
    
    if (validKeys.length > 0) {
        let tKey = validKeys[0];
        let d = globalData.workforce[tKey];
        let opsTotal = 0, opsPrev = 0, prevKey = validKeys.length > 1 ? validKeys[1] : null;

        let dynamicTeamsSet = new Set();
        Object.values(globalData.workforce).forEach(day => {
            Object.values(day.matrix || {}).forEach(aff => {
                Object.values(aff).forEach(roleObj => { Object.keys(roleObj).forEach(t => dynamicTeamsSet.add(t)); });
            });
        });
        let dynamicTeams = Array.from(dynamicTeamsSet).filter(t => t && t !== "N/A").sort();
        if (dynamicTeams.length === 0) dynamicTeams = ["A", "B", "C"]; 

        const calcTotal = (dataObj) => {
            let sum = 0;
            Object.keys(dataObj.matrix || {}).forEach(aff => {
                if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(aff)) {
                    Object.keys(dataObj.matrix[aff]).forEach(r => Object.values(dataObj.matrix[aff][r]).forEach(val => sum += val));
                }
            });
            return sum;
        };

        opsTotal = calcTotal(d);
        if (prevKey) opsPrev = calcTotal(globalData.workforce[prevKey]);

        document.getElementById('headcount-total').innerText = fmtN(opsTotal);
        
        let trendEl = document.getElementById('headcount-trend');
        let noteEl = document.getElementById('headcount-note');
        if (trendEl && noteEl) {
            let diff = opsTotal - opsPrev;
            if (opsTotal === 0 && opsPrev === 0) { trendEl.innerText = "-"; noteEl.innerText = "ไม่มีข้อมูล"; }
            else if (!prevKey) { trendEl.innerText = "-"; noteEl.innerText = "ไม่มีข้อมูลเทียบ"; }
            else if (diff > 0) { trendEl.innerText = `↗ +${diff}`; noteEl.innerText = `vs prev`; }
            else if (diff < 0) { trendEl.innerText = `↘ ${Math.abs(diff)}`; noteEl.innerText = `vs prev`; }
            else { trendEl.innerText = "0"; noteEl.innerText = `vs prev`; }
        }
        document.getElementById('headcount-update').innerText = `Updated: ${getDisplayDate(tKey)}`;

        if (d.nationality) {
            let nT = 0, nF = 0;
            Object.keys(d.nat_by_aff || {}).forEach(aff => {
                if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(aff)) {
                    nT += (d.nat_by_aff[aff].thai || 0); nF += (d.nat_by_aff[aff].foreign || 0);
                }
            });
            if (document.getElementById('wf-thai')) document.getElementById('wf-thai').innerText = fmtN(nT);
            if (document.getElementById('wf-foreign')) document.getElementById('wf-foreign').innerText = fmtN(nF);
        }

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
            backgroundColor: (context) => getGradient(context.chart.ctx, context.chart.chartArea, gradPalettes[i%6].s, gradPalettes[i%6].e),
            borderRadius: 4, stack: 'hc'
        }));

        if(workforceChartInstance) {
            workforceChartInstance.data.labels = chartKeys.map(k => { let dp = new Date(getStandardDate(k)); return `${String(dp.getDate()).padStart(2,'0')} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dp.getMonth()]}`; });
            workforceChartInstance.data.datasets = datasets;
            workforceChartInstance.update();
        }

        const matrixTable = document.getElementById('wf-matrix-table');
        if (matrixTable) {
            let affiliations = Object.keys(d.matrix || {}).sort();
            if (!window.selectedBUs.includes('ALL')) affiliations = affiliations.filter(a => window.selectedBUs.includes(a));
            
            let rolesSet = new Set();
            affiliations.forEach(aff => { if(d.matrix[aff]) Object.keys(d.matrix[aff]).forEach(r => rolesSet.add(r)); });
            const roles = Array.from(rolesSet);

            if (affiliations.length === 0) {
                matrixTable.innerHTML = `<thead><tr><th class='text-center text-muted'>ไม่มีข้อมูล MATRIX ของวันที่เลือก</th></tr></thead>`;
            } else {
                let headerHtml = `<thead><tr><th rowspan="2" style="position:sticky; left:0; z-index:16;">Role / หน้าที่</th>`;
                affiliations.forEach(aff => { headerHtml += `<th colspan="${dynamicTeams.length + 1}" style="text-align:center;">${aff}</th>`; });
                headerHtml += `<th rowspan="2" class="text-center">Grand Total</th><th rowspan="2" class="text-center">% Ratio</th></tr><tr>`;
                affiliations.forEach(() => { dynamicTeams.forEach(t => { headerHtml += `<th class="text-center">${t}</th>`; }); headerHtml += `<th class="text-center">Total</th>`; });
                headerHtml += `</tr></thead>`;

                let bodyHtml = "<tbody>";
                roles.forEach(role => {
                    let roleGrandTotal = 0; let roleRowHtml = `<td style="position:sticky; left:0; z-index:5; font-weight:700; background:var(--bg-card);">${role}</td>`;
                    affiliations.forEach(aff => {
                        let affRoleTotal = 0; let teamCells = "";
                        dynamicTeams.forEach(team => {
                            let count = d.matrix[aff]?.[role]?.[team] || 0;
                            affRoleTotal += count; teamCells += `<td class="text-center">${count > 0 ? count : '-'}</td>`;
                        });
                        roleGrandTotal += affRoleTotal;
                        roleRowHtml += teamCells + `<td class="text-center font-bold">${affRoleTotal > 0 ? affRoleTotal : '-'}</td>`;
                    });
                    let grandPct = opsTotal > 0 ? ((roleGrandTotal / opsTotal) * 100).toFixed(1) + "%" : "0%";
                    bodyHtml += `<tr>${roleRowHtml}<td class="text-center font-bold">${roleGrandTotal > 0 ? roleGrandTotal : '-'}</td><td class="text-center text-muted">${roleGrandTotal > 0 ? grandPct : '-'}</td></tr>`;
                });
                matrixTable.innerHTML = headerHtml + bodyHtml + "</tbody>";
            }
        }
    }
}

function updateOnTimeUI() {
    if (!globalData.ontime) return;
    const dpVal = document.getElementById('date-picker')?.value || new Date().toISOString().split('T')[0];
    const targetTimestamp = new Date(dpVal).setHours(23, 59, 59, 999);
    
    let otArray = Object.keys(globalData.ontime).map(k => ({
        dateObj: new Date(getStandardDate(k)), ptglg: globalData.ontime[k], hub: globalData.ontime_hub[k] || null
    })).filter(i => !isNaN(i.dateObj.getTime()) && i.dateObj.getTime() <= targetTimestamp).sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (otArray.length > 0) {
        let curr = otArray[otArray.length-1];
        let prev = otArray.length > 1 ? otArray[otArray.length-2] : null;
        let over = (curr.ptglg !== null && curr.hub !== null) ? (curr.ptglg+curr.hub)/2 : curr.ptglg;
        document.getElementById('ontime-val').innerText = over !== null ? `${over.toFixed(2)}%` : "0.00%";
        
        let trendEl = document.getElementById('ontime-trend');
        let noteEl = document.getElementById('ontime-note');
        if (trendEl && noteEl) {
            if (!prev) { trendEl.innerText = "-"; noteEl.innerText = "ไม่มีข้อมูลเทียบ"; }
            else {
                let pOver = (prev.ptglg !== null && prev.hub !== null) ? (prev.ptglg+prev.hub)/2 : prev.ptglg;
                let diff = over - pOver;
                if (diff > 0) trendEl.innerText = `↗ +${diff.toFixed(2)} pp`;
                else if (diff < 0) trendEl.innerText = `↘ ${Math.abs(diff).toFixed(2)} pp`;
                else trendEl.innerText = "0 pp";
            }
        }
        document.getElementById('ontime-update').innerText = `Updated: ${getDisplayDate(curr.dateObj)}`;
        
        if(ontimeChartInstance) {
            let slice = otArray.slice(-14);
            ontimeChartInstance.data.labels = slice.map(i => `${String(i.dateObj.getDate()).padStart(2,'0')} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i.dateObj.getMonth()]}`);
            ontimeChartInstance.data.datasets = [{
                label: 'On-Time',
                data: slice.map(i => (i.ptglg !== null && i.hub !== null) ? (i.ptglg+i.hub)/2 : i.ptglg),
                borderColor: '#10B981',
                backgroundColor: (context) => getFillGradient(context.chart.ctx, context.chart.chartArea, '16, 185, 129'),
                fill: true, tension: 0.4, pointRadius: 4
            }];
            ontimeChartInstance.update();
        }

        const otTable = document.getElementById('ontime-detail-table');
        if (otTable) {
            let thead = `<thead><tr><th style="text-align:center; position:sticky; top:0; left:0; z-index:20;">Date</th><th class="text-center">ภาพรวม</th><th class="text-center">PTGLG</th><th class="text-center">HUB</th></tr></thead>`;
            let tbody = "<tbody>" + otArray.slice().reverse().slice(0,14).map(i => {
                let _o = (i.ptglg !== null && i.hub !== null) ? (i.ptglg+i.hub)/2 : (i.ptglg !== null ? i.ptglg : (i.hub !== null ? i.hub : null));
                const p = (v) => {
                    if (v === null || v === undefined) return '<span class="text-muted">-</span>';
                    let clr = v >= 99 ? 'var(--brand-green)' : (v >= 95 ? 'var(--brand-yellow)' : 'var(--brand-red)');
                    return `<span style="color:${clr}; font-weight:700;">${v.toFixed(2)}%</span>`;
                };
                let dStr = `${String(i.dateObj.getDate()).padStart(2,'0')} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i.dateObj.getMonth()]} ${i.dateObj.getFullYear()}`;
                return `<tr><td style="text-align:center; position:sticky; left:0; background:var(--bg-card); z-index:10; font-weight:600;">${dStr}</td><td class="text-center">${p(_o)}</td><td class="text-center">${p(i.ptglg)}</td><td class="text-center">${p(i.hub)}</td></tr>`;
            }).join('') + "</tbody>";
            otTable.innerHTML = thead + tbody;
        }
    }
}

function updateClaimUI() {
    if (!globalData.claims) return;
    const dpVal = document.getElementById('date-picker')?.value || new Date().toISOString().split('T')[0];
    const targetTimestamp = new Date(dpVal).setHours(23, 59, 59, 999);
    
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
            if(cTotalCost>0 || cTotalQty>0) combinedData.push({ dateObj: dObj, cost: cTotalCost, qty: cTotalQty });
        }
    });

    combinedData.sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());

    if (combinedData.length > 0) {
        let curr = combinedData[combinedData.length-1];
        let prev = combinedData.length > 1 ? combinedData[combinedData.length-2] : null;
        document.getElementById('claim-val').innerText = fmtN(curr.cost);
        
        let trendEl = document.getElementById('claim-trend');
        let noteEl = document.getElementById('claim-note');
        if (trendEl && noteEl) {
            if (!prev) { trendEl.innerText = "-"; noteEl.innerText = "ไม่มีข้อมูลเทียบ"; }
            else {
                let diff = curr.cost - prev.cost;
                if (diff > 0) trendEl.innerText = `↗ +${fmtN(diff)}`;
                else if (diff < 0) trendEl.innerText = `↘ ${fmtN(Math.abs(diff))}`;
                else trendEl.innerText = "0";
            }
        }
        document.getElementById('claim-update').innerText = `Updated: ${getDisplayDate(curr.dateObj)}`;

        if(claimChart2Instance) {
            let slice = combinedData.slice(-14);
            claimChart2Instance.data.labels = slice.map(i => `${String(i.dateObj.getDate()).padStart(2,'0')} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i.dateObj.getMonth()]}`);
            claimChart2Instance.data.datasets[0].data = slice.map(i => i.cost);
            claimChart2Instance.data.datasets[1].data = slice.map(i => i.qty);
            claimChart2Instance.data.datasets[0].backgroundColor = (ctx) => getGradient(ctx.chart.ctx, ctx.chart.chartArea, '#EF4444', '#F87171');
            claimChart2Instance.update();
        }

        const tableEl = document.getElementById('claim-detail-table');
        if (tableEl) {
            let thead = `<thead><tr><th style="text-align:center; position:sticky; top:0; left:0; z-index:20;">Date</th><th class="text-center">มูลค่ารวม (฿)</th><th class="text-center">จำนวนชิ้น</th></tr></thead>`;
            let tbody = "<tbody>" + combinedData.slice().reverse().slice(0,14).map(i => {
                let dStr = `${String(i.dateObj.getDate()).padStart(2,'0')} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i.dateObj.getMonth()]} ${i.dateObj.getFullYear()}`;
                return `<tr><td style="text-align:center; position:sticky; left:0; background:var(--bg-card); z-index:10; font-weight:600;">${dStr}</td><td class="text-center text-red font-bold">${fmtN(i.cost)}</td><td class="text-center">${fmtN(i.qty)}</td></tr>`;
            }).join('') + "</tbody>";
            tableEl.innerHTML = thead + tbody;
        }
    }
}

function updateInventoryUI() {
    if (!globalData.inventory) return;
    const dpVal = document.getElementById('date-picker')?.value || new Date().toISOString().split('T')[0];
    const targetTimestamp = new Date(dpVal).setHours(23, 59, 59, 999);
    
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
        let prev = parsedData.length > 1 ? parsedData[parsedData.length-2] : null;
        document.getElementById('inv-val').innerText = curr.pct !== null ? `${curr.pct.toFixed(2)}%` : "-";
        
        let trendEl = document.getElementById('inv-trend');
        let noteEl = document.getElementById('inv-note');
        if (trendEl && noteEl) {
            if (!prev) { trendEl.innerText = "-"; noteEl.innerText = "ไม่มีข้อมูลเทียบ"; }
            else {
                let diff = curr.pct - prev.pct;
                if (diff > 0) trendEl.innerText = `↗ +${diff.toFixed(2)} pp`;
                else if (diff < 0) trendEl.innerText = `↘ ${Math.abs(diff).toFixed(2)} pp`;
                else trendEl.innerText = "0 pp";
            }
        }
        document.getElementById('inv-update').innerText = `Updated: ข้อมูลเดือน ${curr.label}`;

        if(inventoryChartInstance) {
            inventoryChartInstance.data.labels = parsedData.map(i => i.label);
            inventoryChartInstance.data.datasets[0] = {
                label: 'Accuracy %',
                data: parsedData.map(i => i.pct),
                borderColor: '#06B6D4',
                backgroundColor: (context) => getFillGradient(context.chart.ctx, context.chart.chartArea, '6, 182, 212'),
                fill: true, tension: 0.4, pointRadius: 4
            };
            inventoryChartInstance.update();
        }

        const tableEl = document.getElementById('inv-detail-table');
        if (tableEl) {
            let thead = `<thead><tr><th style="text-align:center; position:sticky; top:0; left:0; z-index:20;">Month</th><th class="text-center">% Overall</th></tr></thead>`;
            let tbody = "<tbody>" + parsedData.slice().reverse().slice(0,14).map(i => {
                let clr = i.pct >= 99 ? 'var(--brand-green)' : 'var(--brand-red)';
                return `<tr><td style="text-align:center; position:sticky; left:0; background:var(--bg-card); z-index:10; font-weight:600;">${i.label}</td><td class="text-center" style="color:${clr}; font-weight:700;">${i.pct !== null ? i.pct.toFixed(2)+'%' : '-'}</td></tr>`;
            }).join('') + "</tbody>";
            tableEl.innerHTML = thead + tbody;
        }
    }
}

initDashboard();
