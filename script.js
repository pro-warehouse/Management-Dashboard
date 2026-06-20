// === Setup Base & Theme ===
const themeToggleBtn = document.getElementById('theme-toggle');
themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggleBtn.innerText = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
    Chart.defaults.color = isDark ? '#9CA3AF' : '#6B7280';
    Object.values(Chart.instances).forEach(chart => chart.update());
});

Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#6B7280';

const accentGreen = '#10B981';
const accentOrange = '#F59E0B';
const dangerRed = '#EF4444';

const fmtN = (v) => (v || 0).toLocaleString();

// ==========================================
// 🌟 1. Custom Plugins 🌟
// ==========================================
const dataLabelPlugin = {
    id: 'dataLabelPlugin',
    afterDatasetsDraw(chart) {
        if(chart.config.type !== 'bar' || chart.canvas.id === 'productivityChart') return;
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            if (dataset.type === 'line') return;
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((bar, index) => {
                const data = dataset.data[index];
                if(data > 0){
                    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#F9FAFB' : '#111827';
                    ctx.font = 'bold 12px Inter';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    
                    let displayVal;
                    if (chart.canvas.id === 'claimChart' || chart.canvas.id === 'claimChart2') {
                        displayVal = fmtN(data); 
                    } else {
                        displayVal = data % 1 !== 0 ? data.toFixed(2) + '%' : fmtN(data);
                    }
                    ctx.fillText(displayVal, bar.x, bar.y - 6);
                }
            });
        });
    }
};

const lineDataLabelPlugin = {
    id: 'lineDataLabelPlugin',
    afterDatasetsDraw(chart) {
        if (!['ontimeChart', 'claimChart', 'ontimeChart2', 'claimChart2', 'inventoryChart'].includes(chart.canvas.id)) return;
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            if (!chart.isDatasetVisible(i)) return;
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((point, index) => {
                const data = dataset.data[index];
                if(data !== null && data !== undefined && data !== 0 && data !== "0.00"){
                    ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#F9FAFB' : '#111827';
                    ctx.font = 'bold 10px Inter';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = i === 0 ? 'bottom' : 'top'; 
                    let yOffset = i === 0 ? -8 : 8;
                    ctx.fillText(Number(data).toFixed(2) + '%', point.x, point.y + yOffset);
                }
            });
        });
    }
};

// ==========================================
// 🌟 2. Setup Chart Instances 🌟
// ==========================================
const throughputCtx = document.getElementById('throughputChart')?.getContext('2d');
if (throughputCtx) {
    new Chart(throughputCtx, { type: 'bar', data: { labels: ['Mon','Tue','Wed','Thu','Fri'], datasets: [{ label: 'Inbound', data: [45, 38, 52, 48, 50], backgroundColor: accentOrange, borderRadius: 6 }, { label: 'Outbound', data: [48, 42, 55, 50, 54], backgroundColor: accentGreen, borderRadius: 6 }]}, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { x: {grid:{display:false}}, y: {border:{display:false}} } } });
}
const orderMixCtx = document.getElementById('orderMixChart')?.getContext('2d');
if (orderMixCtx) {
    new Chart(orderMixCtx, { type: 'doughnut', data: { labels: ['E-com', 'B2B', '3PL'], datasets: [{ data: [55, 30, 15], backgroundColor: [accentGreen, accentOrange, '#3B82F6'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins:{legend:{position: 'bottom'}} } });
}
let workforceChartInstance = null;
const wfCtx = document.getElementById('workforceChart')?.getContext('2d');
if (wfCtx) {
    workforceChartInstance = new Chart(wfCtx, { 
        type: 'bar', 
        data: { 
            labels: [], 
            datasets: [{ 
                label: 'จำนวนกำลังพล (คน)', 
                data: [], 
                backgroundColor: '#3B82F6',
                borderRadius: 6 
            }] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { 
                x: { grid: { display: false } }, 
                y: { beginAtZero: true, border: { display: false } } 
            }, 
            layout: { padding: { top: 20 } } 
        }, 
        plugins: [dataLabelPlugin]
    });
}

let ontimeChart1Instance = null;
const ot1Ctx = document.getElementById('ontimeChart')?.getContext('2d');
if (ot1Ctx) {
    ontimeChart1Instance = new Chart(ot1Ctx, { type: 'line', data: { labels: [], datasets: [{ label: 'On-Time %', data: [], borderColor: accentGreen, backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#FFFFFF', pointBorderColor: accentGreen, spanGaps: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins:{legend:{display:false}}, scales: { x: {grid:{display:false}}, y: {border:{display:false}} }, layout: { padding: { top: 40 } } }, plugins: [lineDataLabelPlugin] });
}

let claimChart1Instance = null;
const claim1Ctx = document.getElementById('claimChart')?.getContext('2d');
if (claim1Ctx) {
    claimChart1Instance = new Chart(claim1Ctx, { 
        type: 'bar', 
        data: { 
            labels: [], 
            datasets: [
                { label: 'มูลค่าเคลม (฿)', data: [], backgroundColor: '#EF4444', borderRadius: 4, yAxisID: 'y' },
                { label: 'จำนวนชิ้น (Pcs)', data: [], borderColor: '#3B82F6', backgroundColor: '#3B82F6', type: 'line', tension: 0.4, yAxisID: 'y1', pointRadius: 2 }
            ] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins:{legend:{display:false}}, 
            scales: { 
                x: {grid:{display:false}}, 
                y: {position: 'left', beginAtZero: true},
                y1: {position: 'right', beginAtZero: true, grid: {display:false}, display: false} 
            }, 
            layout: { padding: { top: 10 } } 
        }, 
        plugins: [dataLabelPlugin] 
    });
}

let ffmTrendChartInstance = null;
const ffmTrendCtx = document.getElementById('ffmTrendChart')?.getContext('2d');
if (ffmTrendCtx) {
    ffmTrendChartInstance = new Chart(ffmTrendCtx, { 
        type: 'line', 
        data: { 
            labels: [], 
            datasets: [{ 
                label: 'Fulfillment %', 
                data: [], 
                borderColor: '#10B981', 
                backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                fill: true, 
                tension: 0.4,
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: '#10B981',
            }] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { border: { display: false }, beginAtZero: true, max: 100 } }
        },
        plugins: [lineDataLabelPlugin]
    });
}

let ffmVolumeChartInstance = null;
const ffmVolCtx = document.getElementById('ffmVolumeChart')?.getContext('2d');
if (ffmVolCtx) {
    ffmVolumeChartInstance = new Chart(ffmVolCtx, { 
        type: 'bar', 
        data: { 
            labels: [], 
            datasets: [
                { label: 'Completed (เสร็จ)', data: [], backgroundColor: '#10B981', borderRadius: 4 },
                { label: 'Pending (ค้าง)', data: [], backgroundColor: '#EF4444', borderRadius: 4 }
            ]
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, border: { display: false } } },
            plugins: { legend: { position: 'top' } }
        }
    });
}

let claimChart2Instance = null;
const claim2Ctx = document.getElementById('claimChart2')?.getContext('2d');
if (claim2Ctx) {
    claimChart2Instance = new Chart(claim2Ctx, { 
        type: 'bar', 
        data: { 
            labels: [], 
            datasets: [
                { label: 'มูลค่าเคลม (฿)', data: [], backgroundColor: '#EF4444', borderRadius: 6, yAxisID: 'y' },
                { label: 'จำนวนชิ้น (Pcs)', data: [], borderColor: '#3B82F6', backgroundColor: '#3B82F6', type: 'line', tension: 0.4, yAxisID: 'y1', pointRadius: 4, borderWidth: 2 }
            ] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins:{
                legend:{
                    display:true, 
                    position: 'top',
                    labels: { padding: 20, boxWidth: 12, font: {size: 11} } 
                }
            }, 
            scales: { 
                x: {grid:{display:false}}, 
                y: {position: 'left', beginAtZero: true, grace: '25%', title: {display: true, text: 'มูลค่ารวม (บาท)', font: {size: 10}}}, 
                y1: {position: 'right', beginAtZero: true, grace: '25%', grid: {display:false}, title: {display: true, text: 'จำนวนสินค้า (ชิ้น)', font: {size: 10}}} 
            }, 
            layout: { padding: { top: 10, left: 10, right: 10 } } 
        }, 
        plugins: [dataLabelPlugin] 
    });
}

let ontimeChartInstance = null;
const otChartEl = document.getElementById('ontimeChart2');
if (otChartEl) {
    ontimeChartInstance = new Chart(otChartEl.getContext('2d'), { 
        type: 'line', 
        data: { labels: [], datasets: [ { label: 'PTGLG %', data: [], borderColor: accentGreen, backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#FFFFFF', pointBorderColor: accentGreen, pointRadius: 4, spanGaps: true }, { label: 'HUB %', data: [], borderColor: '#3B82F6', backgroundColor: 'transparent', fill: false, tension: 0.4, pointBackgroundColor: '#FFFFFF', pointBorderColor: '#3B82F6', borderDash: [5, 5], pointRadius: 4, spanGaps: true } ] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins:{legend:{display:true, position: 'bottom'}}, scales: { x: {grid:{display:false}}, y: { border:{display:false} } }, layout: { padding: { top: 40 } } },
        plugins: [lineDataLabelPlugin]
    });
}

let inventoryChartInstance = null;
const invCtx = document.getElementById('inventoryChart')?.getContext('2d');
if (invCtx) {
    inventoryChartInstance = new Chart(invCtx, { type: 'line', data: { labels: [], datasets: [{ label: 'Accuracy %', data: [], borderColor: accentGreen, backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#FFFFFF', pointBorderColor: accentGreen, spanGaps: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins:{legend:{display:false}}, scales: { x: {grid:{display:false}}, y: {border:{display:false}} }, layout: { padding: { top: 40 } } }, plugins: [lineDataLabelPlugin] });
}

let productivityChartInstance = null;
const prodCtx = document.getElementById('productivityChart')?.getContext('2d');
if (prodCtx) {
    productivityChartInstance = new Chart(prodCtx, { 
        type: 'bar', 
        data: { 
            labels: [], 
            datasets: [
                { type: 'bar', label: 'Background', data: [], backgroundColor: [], borderRadius: 6, barPercentage: 0.6, categoryPercentage: 0.8, grouped: false },
                { type: 'bar', label: 'Actual UPH', data: [], backgroundColor: [], borderRadius: 6, barPercentage: 0.6, categoryPercentage: 0.8, grouped: false },
                { type: 'line', label: 'Target Line', data: [], borderColor: '#F59E0B', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, fill: false }
            ] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { 
                x: { grid: { display: false }, stacked: false }, 
                y: { border: { display: false }, display: false, beginAtZero: true, grace: '25%' } 
            }, 
            layout: { padding: { top: 30 } } 
        }, 
        plugins: [{
            id: 'customBarLabel',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                if(chart.data.datasets.length > 1 && chart.getDatasetMeta(1)) {
                    const meta = chart.getDatasetMeta(1);
                    if (!meta.hidden && meta.data) {
                        meta.data.forEach((bar, index) => {
                            const uphVal = chart.data.datasets[1].data[index];
                            const picksVal = chart.data.datasets[1].customPicks ? chart.data.datasets[1].customPicks[index] : 0;
                            if(uphVal > 0){
                                ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? '#F9FAFB' : '#111827';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';
                                ctx.font = 'bold 11px Inter';
                                ctx.fillText(uphVal, bar.x, bar.y - 14);
                                let displayPicks = picksVal >= 10000 ? (picksVal / 1000).toFixed(1) + 'k' : fmtN(picksVal);
                                ctx.fillStyle = '#6B7280';
                                ctx.font = 'normal 9px Inter';
                                ctx.fillText(`(${displayPicks})`, bar.x, bar.y - 4);
                            }
                        });
                    }
                }
            }
        }]
    });
}

// ==========================================
// 🌟 3. Data Config & Setup 🌟
// ==========================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxB0bNU1P9qrG_6aHoeiKyHMXT0_k76VlL0aq1I9xxHVpPDQK9qcd3FJMip4Jk9o6RY/exec';

let globalData = {};
let isFirstLoad = true;
window.selectedBUs = ['ALL'];
window.locFilters = { bu: ['ALL'], type: ['ALL'], zone: ['ALL'] };

function standardizeBU(buName) {
    if (!buName) return "N/A";
    return buName.toString().trim().toUpperCase();
}

function toggleLoader(show) {
    const loader = document.getElementById('loader') || document.querySelector('.loader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ========================================================
// 🌟 FULFILLMENT LIVE DATA BINDING (SSE) 🌟
// ========================================================
function initFulfillmentRealtime() {
    const tableEl = document.getElementById('ffm-detail-table');
    const rawUrl = "https://dc-ordermonitoring-backend.onrender.com/api/run";
    const SSE_URL = rawUrl.trim();

    console.log("⚡ กำลังเชื่อมต่อท่อส่งข้อมูล Fulfillment Real-time (SSE)... URL:", SSE_URL);
    
    try {
        const eventSource = new EventSource(SSE_URL);

        eventSource.onmessage = function(event) {
            try {
                const result = JSON.parse(event.data);
                console.log("🔥 Node API Live Data:", result);

                let trendLabels = [];
                let trendValues = [];
                let buNames = [];
                let completedCounts = [];
                let pendingCounts = [];

                let tableHtml = `<thead>
                    <tr>
                        <th style="padding:12px; text-align:center; position:sticky; top:0; background:var(--bg-card); z-index:10;">วันที่บันทึก</th>
                        <th style="padding:12px; text-align:center; position:sticky; top:0; background:var(--bg-card); z-index:10;">หน่วยธุรกิจ (BU)</th>
                        <th style="padding:12px; text-align:center; position:sticky; top:0; background:var(--bg-card); z-index:10;">ออเดอร์ทั้งหมด</th>
                        <th style="padding:12px; text-align:center; position:sticky; top:0; background:var(--bg-card); z-index:10;">จัดเสร็จสิ้น (Completed)</th>
                        <th style="padding:12px; text-align:center; position:sticky; top:0; background:var(--bg-card); z-index:10;">คงค้าง (Pending)</th>
                        <th style="padding:12px; text-align:center; position:sticky; top:0; background:var(--bg-card); z-index:10;">Fulfillment Rate</th>
                    </tr>
                </thead><tbody>`;

                const dataArray = Array.isArray(result) ? result : [result];

                if (dataArray.length > 0 && dataArray[0] !== null) {
                    dataArray.forEach(item => {
                        const dateStr = item.date || item.Date || item.record_date || "N/A";
                        const buStr = item.bu || item.BU || item.business_unit || "Unknown";
                        const total = parseInt(item.total_orders || item.Total || item.qty_order || 0);
                        const completed = parseInt(item.completed_orders || item.Completed || item.qty_completed || 0);
                        
                        const pending = total - completed > 0 ? total - completed : 0;
                        const rate = total > 0 ? parseFloat(((completed / total) * 100).toFixed(2)) : 0;

                        tableHtml += `<tr>
                            <td style="padding:10px; font-weight:600; text-align:center;">${dateStr}</td>
                            <td style="padding:10px; text-align:center;"><span class="badge info" style="font-weight:700;">${buStr}</span></td>
                            <td style="padding:10px; text-align:center; font-weight:600;">${fmtN(total)}</td>
                            <td style="padding:10px; text-align:center; color:#10B981; font-weight:700;">${fmtN(completed)}</td>
                            <td style="padding:10px; text-align:center; color:${pending > 0 ? '#EF4444' : 'inherit'}; font-weight:700;">${pending > 0 ? fmtN(pending) : '-'}</td>
                            <td style="padding:10px; text-align:center;">
                                <span style="display:inline-block; background:${rate >= 95 ? '#dcfce7' : '#fee2e2'}; color:${rate >= 95 ? '#166534' : '#991b1b'}; padding:2px 8px; border-radius:12px; font-weight:700;">${rate}%</span>
                            </td>
                        </tr>`;

                        if (!trendLabels.includes(dateStr)) {
                            trendLabels.push(dateStr);
                            trendValues.push(rate);
                        }

                        if (!buNames.includes(buStr)) {
                            buNames.push(buStr);
                            completedCounts.push(completed);
                            pendingCounts.push(pending);
                        } else {
                            let idx = buNames.indexOf(buStr);
                            completedCounts[idx] += completed;
                            pendingCounts[idx] += pending;
                        }
                    });
                    tableHtml += `</tbody>`;
                } else {
                    tableHtml = `<tr><td colspan="6" class="text-center" style="padding: 30px; color: var(--text-muted);">ไม่มีข้อมูลสตรีมส่งมาในขณะนี้</td></tr>`;
                }

                if (tableEl) tableEl.innerHTML = tableHtml;

                if (typeof ffmTrendChartInstance !== 'undefined' && ffmTrendChartInstance) {
                    ffmTrendChartInstance.data.labels = trendLabels;
                    ffmTrendChartInstance.data.datasets[0].data = trendValues;
                    ffmTrendChartInstance.update();
                }

                if (typeof ffmVolumeChartInstance !== 'undefined' && ffmVolumeChartInstance) {
                    ffmVolumeChartInstance.data.labels = buNames;
                    ffmVolumeChartInstance.data.datasets[0].data = completedCounts;
                    ffmVolumeChartInstance.data.datasets[1].data = pendingCounts;
                    ffmVolumeChartInstance.update();
                }

            } catch (e) {
                console.error("❌ เกิดข้อผิดพลาดในการถอดรหัสข้อมูลสตรีม:", e);
            }
        };

        eventSource.onerror = function(error) {
            console.error("❌ SSE Connection Error:", error);
            if (tableEl && tableEl.innerHTML.includes("กำลังเรียกขอข้อมูล")) {
                tableEl.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 30px; color: var(--danger); font-weight:bold;">⚠️ ระบบกำลังเปิดท่อรอรับข้อมูล Real-time จากเซิร์ฟเวอร์หลังบ้าน...</td></tr>`;
            }
        };
        
    } catch (err) {
        console.error("❌ สร้างการเชื่อมต่อ EventSource ไม่สำเร็จ (ตรวจสอบ URL):", err);
    }
}

function cleanDataBeforeLoad() {
    ['fulfillment', 'wave_ops', 'claims', 'inventory', 'inventory_daily', 'transport'].forEach(module => {
        if (globalData[module]) {
            Object.keys(globalData[module]).forEach(dateKey => {
                let oldBuData = globalData[module][dateKey].bu_data;
                if (oldBuData) {
                    let newBuData = {};
                    Object.keys(oldBuData).forEach(bu => {
                        let mBu = standardizeBU(bu);
                        if (!newBuData[mBu]) {
                            newBuData[mBu] = typeof oldBuData[bu] === 'object' ? { ...oldBuData[bu] } : oldBuData[bu];
                        } else {
                            if (typeof oldBuData[bu] === 'object') {
                                Object.keys(oldBuData[bu]).forEach(k => {
                                    newBuData[mBu][k] = (newBuData[mBu][k] || 0) + oldBuData[bu][k];
                                });
                            } else {
                                newBuData[mBu] += oldBuData[bu];
                            }
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
                    if (!newMatrix[mBu]) {
                        newMatrix[mBu] = dayData.matrix[aff];
                    } else {
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

function setupLocDropdown(prefix, filterKey) {
    const selectBtn = document.getElementById(`loc-${prefix}-select`);
    const menu = document.getElementById(`loc-${prefix}-menu`);
    const selectAll = document.getElementById(`loc-${prefix}-all`);
    const list = document.getElementById(`loc-${prefix}-list`);
    const applyBtn = document.getElementById(`loc-${prefix}-apply`);
    const textSpan = document.getElementById(`loc-${prefix}-text`);
    
    if(!selectBtn || !menu) return;

    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ['bu', 'type', 'zone'].forEach(p => {
            if(p !== prefix) {
                let m = document.getElementById(`loc-${p}-menu`);
                if(m) m.style.display = 'none';
            }
        });
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    selectAll.addEventListener('change', (e) => {
        const cbs = list.querySelectorAll('input[type="checkbox"]');
        cbs.forEach(cb => cb.checked = e.target.checked);
    });

    list.addEventListener('change', (e) => {
        if (e.target.tagName === 'INPUT') {
            const cbs = list.querySelectorAll('input[type="checkbox"]');
            const allChecked = Array.from(cbs).every(cb => cb.checked);
            selectAll.checked = allChecked;
        }
    });

    applyBtn.addEventListener('click', () => {
        menu.style.display = 'none';
        const cbs = list.querySelectorAll('input[type="checkbox"]');
        if (selectAll.checked) {
            window.locFilters[filterKey] = ['ALL'];
            textSpan.innerText = prefix === 'bu' ? 'BU: All' : (prefix === 'type' ? 'Type: All' : 'Zone: All');
        } else {
            const checkedVals = Array.from(cbs).filter(cb => cb.checked).map(cb => cb.value);
            window.locFilters[filterKey] = checkedVals.length > 0 ? checkedVals : [];
            let label = checkedVals.length > 0 ? (checkedVals.length <= 1 ? checkedVals[0] : `${checkedVals.length} Selected`) : 'None';
            textSpan.innerText = prefix === 'bu' ? `BU: ${label}` : (prefix === 'type' ? `Type: ${label}` : `Zone: ${label}`);
        }
        renderLocationAccuracy(); 
    });

    document.addEventListener('click', (e) => {
        if (!selectBtn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
}
setupLocDropdown('bu', 'bu');
setupLocDropdown('type', 'type');
setupLocDropdown('zone', 'zone');

function populateLocFilterOptions(dataArray) {
    let bus = new Set();
    let types = new Set();
    let zones = new Set();

    dataArray.forEach(item => {
        bus.add(item.bu);
        types.add(item.type);
        zones.add(item.zone);
    });

    const populateList = (prefix, set) => {
        const list = document.getElementById(`loc-${prefix}-list`);
        if(!list) return;
        list.innerHTML = '';
        let sorted = Array.from(set).sort();
        sorted.forEach(val => {
            let isChecked = window.locFilters[prefix].includes('ALL') || window.locFilters[prefix].includes(val);
            let label = document.createElement('label');
            label.style.cssText = "display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--text-main); font-size: 0.75rem;";
            label.innerHTML = `<input type="checkbox" value="${val}" ${isChecked ? 'checked' : ''}> ${val}`;
            list.appendChild(label);
        });
        const selectAll = document.getElementById(`loc-${prefix}-all`);
        if(selectAll) selectAll.checked = window.locFilters[prefix].includes('ALL');
    };

    populateList('bu', bus);
    populateList('type', types);
    populateList('zone', zones);
}

function populateGlobalBUFilters() {
    let buSet = new Set();
    if(globalData.fulfillment) Object.values(globalData.fulfillment).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    if(globalData.claims) Object.values(globalData.claims).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    if(globalData.inventory) Object.values(globalData.inventory).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    if(globalData.transport) Object.values(globalData.transport).forEach(d => Object.keys(d.bu_data || {}).forEach(bu => buSet.add(bu)));
    
    let sortedBUs = Array.from(buSet).sort();
    
    const cbList = document.getElementById('bu-checkbox-list');
    const selectAllCb = document.getElementById('bu-select-all');
    const multiText = document.getElementById('bu-multi-text');
    const menu = document.getElementById('bu-dropdown-menu');
    const toggleBtn = document.getElementById('bu-multi-select');
    const applyBtn = document.getElementById('bu-apply-btn');
    
    if (cbList && cbList.innerHTML === '') {
        sortedBUs.forEach(bu => {
            const label = document.createElement('label');
            label.style.cssText = "display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--text-main); font-size: 0.85rem;";
            label.innerHTML = `<input type="checkbox" class="bu-item-cb" value="${bu}" checked> ${bu}`;
            cbList.appendChild(label);
        });

        const itemCbs = document.querySelectorAll('.bu-item-cb');
        
        selectAllCb.addEventListener('change', (e) => {
            itemCbs.forEach(cb => cb.checked = e.target.checked);
        });
        
        itemCbs.forEach(cb => {
            cb.addEventListener('change', () => {
                const allChecked = Array.from(itemCbs).every(c => c.checked);
                selectAllCb.checked = allChecked;
            });
        });

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', (e) => {
            if (!toggleBtn.contains(e.target) && !menu.contains(e.target)) {
                menu.style.display = 'none';
            }
        });

        applyBtn.addEventListener('click', () => {
            menu.style.display = 'none';
            if (selectAllCb.checked) {
                window.selectedBUs = ['ALL'];
                multiText.innerText = 'All BUs';
            } else {
                const checkedVals = Array.from(itemCbs).filter(c => c.checked).map(c => c.value);
                window.selectedBUs = checkedVals.length > 0 ? checkedVals : [];
                multiText.innerText = checkedVals.length > 0 ? (checkedVals.length <= 2 ? checkedVals.join(', ') : `${checkedVals.length} BUs Selected`) : 'No Selection';
            }
            const dp = document.getElementById('date-picker');
            let dStr = dp ? dp.value : new Date().toISOString().split('T')[0];
            
            updateDashboardData(dStr);
            renderOnTimeSection();
            renderClaimSection();
            renderLocationAccuracy();
            renderInventorySection();
            renderTransportSection();
            renderProductivitySection();
        });
    }

    const invBuSelect = document.getElementById('inv-bu-filter');
    if (invBuSelect && invBuSelect.options.length <= 1) {
        sortedBUs.forEach(bu => invBuSelect.appendChild(new Option(bu, bu)));
        invBuSelect.addEventListener('change', renderInventorySection);
    }
}

function resetTrendRoleFilter() {
    const roleFilterEl = document.getElementById('trend-role-filter');
    if (roleFilterEl && roleFilterEl.options.length <= 1) {
        roleFilterEl.innerHTML = `
            <option value="All">All Ops (รวม)</option>
            <option value="Pick">Pick</option>
            <option value="RT">RT</option>
            <option value="QCQA">QC & QA</option>
            <option value="Grouping">Grouping</option>
            <option value="Putaway">Put-away</option>
            <option value="Receive">Receive</option>
        `;
    }
}

async function fetchSection(sectionName) {
    try {
        const response = await fetch(`${GAS_URL}?section=${sectionName}`);
        const result = await response.json();
        if (result.status === "success") {
            Object.assign(globalData, result.data);
            cleanDataBeforeLoad();
            if (['executive', 'claims', 'inventory', 'transport'].includes(sectionName)) {
                populateGlobalBUFilters();
            }
            refreshUIBySection(sectionName);
        }
    } catch (e) { console.error(`Error loading ${sectionName}:`, e); }
}

function refreshUIBySection(section) {
    const dp = document.getElementById('date-picker');
    const dateStr = dp ? dp.value : new Date().toISOString().split('T')[0];
    
    if (section === 'executive') updateDashboardData(dateStr); 
    if (section === 'workforce') updateDashboardData(dateStr); 
    if (section === 'ontime_claims') { renderOnTimeSection(); renderClaimSection(); }
    if (section === 'inventory') { renderInventorySection(); renderLocationAccuracy(); }
    if (section === 'transport') renderTransportSection();
    if (section === 'productivity') renderProductivitySection();
}

async function initDashboard() {
    toggleLoader(true);
    const sections = ['executive', 'workforce', 'ontime_claims', 'inventory', 'transport', 'productivity'];
    resetTrendRoleFilter();
    const dp = document.getElementById('date-picker');
    if (dp && isFirstLoad) {
        let today = new Date();
        dp.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        dp.addEventListener('change', (e) => {
            let dStr = e.target.value;
            updateDashboardData(dStr);
            renderOnTimeSection();
            renderClaimSection();
            renderLocationAccuracy();
            renderInventorySection();
            renderTransportSection();
            renderProductivitySection();
        });
        isFirstLoad = false;
    }
    
    // 1. ดึงสถิติตามรอบปกติจาก Google Apps Script
    await Promise.all(sections.map(s => fetchSection(s)));
    
    // 2. เรียกเปิดท่อ Real-time สำหรับ Fulfillment
    initFulfillmentRealtime();
    
    toggleLoader(false);
}

document.getElementById('trend-role-filter')?.addEventListener('change', () => {
    const dp = document.getElementById('date-picker');
    if (dp) updateTrendChart(dp.value);
});

document.getElementById('ontime-filter')?.addEventListener('change', renderOnTimeSection);
document.getElementById('ontime-period-filter')?.addEventListener('change', renderOnTimeSection);
document.getElementById('claim-period-filter')?.addEventListener('change', renderClaimSection);

// ==========================================
// 🌟 4. Render Logic (1 - 5) 🌟
// ==========================================
function updateDashboardData(selectedDateStr) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const targetTimestamp = new Date(selectedDateStr).setHours(23, 59, 59, 999);
    
    const getDisplayDate = (dateString) => {
        if (!dateString) return "--";
        const dObj = new Date(dateString);
        return `${String(dObj.getDate()).padStart(2, '0')} ${months[dObj.getMonth()]} ${dObj.getFullYear()}`;
    };
    const getShortDate = (dateString) => {
        if (!dateString) return "--";
        const dObj = new Date(dateString);
        return `${String(dObj.getDate()).padStart(2, '0')} ${months[dObj.getMonth()]}`;
    };
    
    // --- Workforce ---
    try {
        if(Object.keys(globalData.workforce || {}).length > 0) {
            let wfData = globalData.workforce;
            let wfKeys = Object.keys(wfData).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
            let targetWfKey = null; let opsTotal = 0;
            let prevWfKey = null; let opsYesterday = 0;

            let dynamicTeamsSet = new Set();
            Object.values(wfData).forEach(day => {
                Object.values(day.matrix || {}).forEach(aff => {
                    Object.values(aff).forEach(roleObj => {
                        Object.keys(roleObj).forEach(t => dynamicTeamsSet.add(t));
                    });
                });
            });
            let dynamicTeams = Array.from(dynamicTeamsSet).filter(t => t && t !== "N/A").sort();
            if (dynamicTeams.length === 0) dynamicTeams = ["A", "B", "C"]; 

            const getFilteredOpsTotal = (data) => {
                if (!data.matrix) return 0;
                let sum = 0;
                Object.keys(data.matrix).forEach(aff => {
                    if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(aff)) {
                        ["Pick", "RT", "QC", "QA", "Grouping", "Putaway", "Receive"].forEach(r => {
                            if(data.matrix[aff][r]) {
                                Object.values(data.matrix[aff][r]).forEach(val => sum += val);
                            }
                        });
                    }
                });
                return sum;
            };

            for (let k of wfKeys) {
                if (new Date(k).getTime() <= targetTimestamp) {
                    let ops = getFilteredOpsTotal(wfData[k]);
                    if (ops > 0 || !window.selectedBUs.includes('ALL')) {
                        if (!targetWfKey) { targetWfKey = k; opsTotal = ops; } 
                        else if (!prevWfKey) { prevWfKey = k; opsYesterday = ops; break; }
                    }
                }
            }

            const todayWf = targetWfKey ? wfData[targetWfKey] : { roles:{}, matrix:{}, nationality: {thai:0, foreign:0} };

            const thaiEl = document.getElementById('wf-thai');
            const foreignEl = document.getElementById('wf-foreign');
            if(thaiEl) thaiEl.innerText = fmtN(todayWf.nationality?.thai || 0);
            if(foreignEl) foreignEl.innerText = fmtN(todayWf.nationality?.foreign || 0);

            const hcTotalEl = document.getElementById('headcount-total');
            if(hcTotalEl){
                hcTotalEl.innerText = opsTotal > 0 ? fmtN(opsTotal) : "0";
                const trendEl = document.getElementById('headcount-trend');
                const noteEl = document.getElementById('headcount-note');
                const diff = opsTotal - opsYesterday;
                let vsText = prevWfKey ? `vs ${getShortDate(prevWfKey)}` : "ไม่มีข้อมูลเทียบ";

                if (trendEl && noteEl) {
                    if (opsTotal === 0 && opsYesterday === 0) {
                        trendEl.className = "badge info"; trendEl.innerText = `-`; noteEl.innerText = "ไม่มีข้อมูล";
                    } else if (diff > 0) { 
                        trendEl.className = "badge up"; trendEl.innerText = `↗ +${diff}`; noteEl.innerText = vsText; 
                    } else if (diff < 0) { 
                        trendEl.className = "badge down"; trendEl.innerText = `↘ ${Math.abs(diff)}`; noteEl.innerText = vsText; 
                    } else { 
                        trendEl.className = "badge info"; trendEl.innerText = `0`; noteEl.innerText = vsText; 
                    }
                }
                let hcUpdateEl = hcTotalEl.parentElement.nextElementSibling;
                if(hcUpdateEl && targetWfKey) hcUpdateEl.innerText = `Updated: ${getDisplayDate(targetWfKey)}`;
                document.querySelectorAll('#monitoring .updated-time').forEach(el => el.innerText = `(ข้อมูลล่าสุด: ${getDisplayDate(targetWfKey)})`);
            }
            
            const roles = ["Pick", "RT", "QC", "QA", "Grouping", "Putaway", "Receive"];
            const matrixTable = document.getElementById('wf-matrix-table');
            let affiliations = Object.keys(todayWf.matrix || {}).sort();
            if (!window.selectedBUs.includes('ALL')) {
                affiliations = affiliations.filter(a => window.selectedBUs.includes(a));
            }

            if (affiliations.length === 0) {
                if(matrixTable) matrixTable.innerHTML = `<thead><tr><th class='text-center' style='padding:30px; color:var(--text-muted);'>ไม่มีข้อมูล MATRIX ของวันที่เลือก</th></tr></thead>`;
            } else {
                let headerHtml = `<thead><tr><th rowspan="2" class="role-cell" style="position:sticky; left:0; z-index:15; background:var(--bg-card);">Role / หน้าที่</th>`;
                affiliations.forEach(aff => {
                    headerHtml += `<th colspan="${dynamicTeams.length + 1}" class="aff-header">${aff}</th>`;
                });
                headerHtml += `<th rowspan="2" class="total-cell">Grand Total</th><th rowspan="2" class="total-cell">% Ratio</th></tr><tr>`;
                
                affiliations.forEach(() => {
                    dynamicTeams.forEach(t => { headerHtml += `<th>${t}</th>`; });
                    headerHtml += `<th class="total-cell">Total</th>`;
                });
                headerHtml += `</tr></thead>`;

                let bodyHtml = "<tbody>";
                roles.forEach(role => {
                    let roleGrandTotal = 0; let roleRowHtml = `<td class="role-cell" style="position:sticky; left:0; z-index:5; background:var(--bg-card);">${role}</td>`;
                    affiliations.forEach(aff => {
                        let affRoleTotal = 0; let teamCells = "";
                        dynamicTeams.forEach(team => {
                            let count = todayWf.matrix[aff]?.[role]?.[team] || 0;
                            affRoleTotal += count; teamCells += `<td>${count > 0 ? count : '-'}</td>`;
                        });
                        roleGrandTotal += affRoleTotal;
                        roleRowHtml += teamCells + `<td class="total-cell">${affRoleTotal > 0 ? affRoleTotal : '-'}</td>`;
                    });
                    let grandPct = opsTotal > 0 ? ((roleGrandTotal / opsTotal) * 100).toFixed(1) + "%" : "0%";
                    bodyHtml += `<tr>${roleRowHtml}<td class="total-cell">${roleGrandTotal > 0 ? roleGrandTotal : '-'}</td><td class="pct-cell">${roleGrandTotal > 0 ? grandPct : '-'}</td></tr>`;
                });

                let footerHtml = `<tfoot><tr><td class="role-cell" style="position:sticky; left:0; z-index:15; background:var(--bg-card);">TOTAL BY AFF.</td>`;
                affiliations.forEach(aff => {
                    let affTotal = 0;
                    dynamicTeams.forEach(t => {
                        let colTot = 0;
                        roles.forEach(r => colTot += (todayWf.matrix[aff]?.[r]?.[t] || 0));
                        footerHtml += `<td>-</td>`;
                    });
                    roles.forEach(r => dynamicTeams.forEach(t => affTotal += (todayWf.matrix[aff]?.[r]?.[t] || 0)));
                    footerHtml += `<td class="total-cell">${affTotal}</td>`;
                });
                footerHtml += `<td class="total-cell">${opsTotal}</td><td class="total-cell">100%</td></tr></tfoot>`;
                if(matrixTable) matrixTable.innerHTML = headerHtml + bodyHtml + footerHtml;
            }

            const attHeadEl = document.getElementById('daily-attendance-head');
            if (attHeadEl) {
                let attHead = `
                    <tr class="header-row-1">
                        <th rowspan="2" style="min-width: 150px; text-align: left; padding-left: 15px; position: sticky; left: 0; z-index: 15; background: var(--bg-card);">DATE / DEPT.</th>
                        <th rowspan="2">TARGET</th>
                        <th rowspan="2">ACTUAL</th>
                        <th rowspan="2">ABSENT</th>
                        <th rowspan="2">RATE</th>`;
                dynamicTeams.forEach(t => { attHead += `<th colspan="4" class="team-divider">Team ${t}</th>`; });
                attHead += `</tr><tr class="header-row-2">`;
                dynamicTeams.forEach(() => { attHead += `<th class="team-divider">TRG</th><th>ACT</th><th>ABS</th><th>%</th>`; });
                attHead += `</tr>`;
                attHeadEl.innerHTML = attHead;
            }

            let excelHtml = "";
            const tableRows = [ { key: 'Pick', label: 'Pick' }, { key: 'RT', label: 'RT' }, { key: 'QCQA', label: 'QC / QA' }, { key: 'Grouping', label: 'Grouping' }, { key: 'Putaway', label: 'Put-away' }, { key: 'Receive', label: 'Receive' } ];
            
            let pastValidWfKeys = wfKeys.filter(k => new Date(k).getTime() <= targetTimestamp); 
            const calcAbs = (a, t) => (t===0&&a===0) ? '-' : (a-t<0 ? `<span class="text-red">${a-t}</span>` : a-t);
            const calcRate = (a, t) => t===0 ? '-' : `<span class="${(a/t*100)<95?'text-red':'text-green'}">${(a/t*100).toFixed(1)}%</span>`;

            pastValidWfKeys.forEach(dateKey => {
                const data = wfData[dateKey];
                excelHtml += `<tr><td colspan="${5 + (dynamicTeams.length * 4)}" class="date-header" style="background:#f8fafc; font-weight:600; padding:12px 15px;">Date: ${getDisplayDate(dateKey)}</td></tr>`;
                
                tableRows.forEach(r => {
                    let act = 0, trgTot = 0;
                    if (r.key === 'QCQA') {
                        act = (data.roles?.QC || 0) + (data.roles?.QA || 0);
                        trgTot = (data.targets?.QC || 0) + (data.targets?.QA || 0);
                    } else {
                        act = data.roles?.[r.key] || 0;
                        trgTot = data.targets?.[r.key] || 0;
                    }

                    let rowHtml = `<tr>
                        <td class="dept-cell">${r.label}</td>
                        <td>${trgTot>0?trgTot:'-'}</td><td>${act>0?act:'-'}</td><td>${calcAbs(act, trgTot)}</td><td>${calcRate(act, trgTot)}</td>`;
                    
                    dynamicTeams.forEach(t => {
                        let tTrg = 0, tAct = 0;
                        if (r.key === 'QCQA') {
                            tAct = (data.roleByTeam?.QC?.[t] || 0) + (data.roleByTeam?.QA?.[t] || 0);
                            tTrg = (data.targetByTeam?.QC?.[t] || 0) + (data.targetByTeam?.QA?.[t] || 0);
                        } else {
                            tAct = data.roleByTeam?.[r.key]?.[t] || 0;
                            tTrg = data.targetByTeam?.[r.key]?.[t] || 0;
                        }
                        rowHtml += `<td class="team-divider">${tTrg>0?tTrg:'-'}</td><td>${tAct>0?tAct:'-'}</td><td>${calcAbs(tAct, tTrg)}</td><td>${calcRate(tAct, tTrg)}</td>`;
                    });
                    
                    rowHtml += `</tr>`;
                    excelHtml += rowHtml;
                });
            });

            const attBody = document.getElementById('daily-attendance-body');
            if(attBody) attBody.innerHTML = excelHtml !== "" ? excelHtml : `<tr><td colspan="100%" class="text-center text-muted" style="padding: 30px;">ไม่มีข้อมูลของวันที่เลือก</td></tr>`;
            
            const hcSummaryTable = document.getElementById('hc-summary-table');
            if (hcSummaryTable && todayWf.hc_summary_list) {
                let hcHtml = `<thead><tr>
                    <th class="role-cell" style="position:sticky; top:0; z-index:10; background:var(--bg-card);">HC Type (Lv3)</th>
                    <th class="role-cell" style="position:sticky; top:0; z-index:10; background:var(--bg-card);">Detail (Lv4)</th>
                    <th class="text-center" style="position:sticky; top:0; z-index:10; background:var(--bg-card);">Target</th>
                    <th class="text-center" style="position:sticky; top:0; z-index:10; background:var(--bg-card);">Actual</th>
                    <th class="text-center" style="position:sticky; top:0; z-index:10; background:var(--bg-card);">Absent</th>
                    <th class="text-center" style="position:sticky; top:0; z-index:10; background:var(--bg-card);">% Rate</th>
                </tr></thead><tbody>`;
                
                let groupedHC = {};
                todayWf.hc_summary_list.forEach(item => {
                    let key = `${item.lv3}|${item.lv4}`;
                    if (!groupedHC[key]) groupedHC[key] = { target: 0, actual: 0, lv3: item.lv3, lv4: item.lv4 };
                    if (item.status !== "" && item.status !== "H") groupedHC[key].target++;
                    if (["R","C","V"].includes(item.status)) groupedHC[key].actual++;
                });

                let hcKeys = Object.keys(groupedHC).sort();
                let totalTrg = 0, totalAct = 0;
                
                if (hcKeys.length === 0) {
                    hcHtml += `<tr><td colspan="6" class="text-center text-muted" style="padding:30px;">ไม่มีข้อมูลพนักงานที่เริ่มงานแล้วในวันที่เลือก</td></tr>`;
                } else {
                    hcKeys.forEach(k => {
                        let g = groupedHC[k];
                        let abs = g.target > g.actual ? g.target - g.actual : 0;
                        let rate = g.target === 0 ? '-' : `<span class="${(g.actual/g.target*100)<95?'text-red':'text-green'}" style="font-weight:700;">${(g.actual/g.target*100).toFixed(1)}%</span>`;
                        totalTrg += g.target; totalAct += g.actual;
                        hcHtml += `<tr>
                            <td class="role-cell" style="font-size: 0.85em;">${g.lv3}</td>
                            <td class="role-cell" style="font-weight:500;">${g.lv4}</td>
                            <td class="text-center">${g.target>0?g.target:'-'}</td>
                            <td class="text-center">${g.actual>0?g.actual:'-'}</td>
                            <td class="text-center">${abs>0?abs:'-'}</td>
                            <td class="text-center">${rate}</td>
                        </tr>`;
                    });
                    let totAbs = totalTrg > totalAct ? totalTrg - totalAct : 0;
                    let totRate = totalTrg === 0 ? '-' : `<span class="${(totalAct/totalTrg*100)<95?'text-red':'text-green'}" style="font-weight:700;">${(totalAct/totalTrg*100).toFixed(1)}%</span>`;
                    hcHtml += `</tbody><tfoot><tr><td colspan="2" class="role-cell text-right">GRAND TOTAL</td><td class="total-cell text-center">${totalTrg}</td><td class="total-cell text-center">${totalAct}</td><td class="total-cell text-center">${totAbs}</td><td class="total-cell text-center">${totRate}</td></tr></tfoot>`;
                }
                hcSummaryTable.innerHTML = hcHtml;
            }

            const resignedTable = document.getElementById('resigned-table');
            if (resignedTable) {
                let resHtml = `<thead><tr>
                    <th style="position:sticky; top:0; z-index:10; background:var(--bg-card); text-align:left; padding-left:15px; font-size:10px;">ชื่อ-นามสกุล</th>
                    <th style="position:sticky; top:0; z-index:10; background:var(--bg-card); text-align:left; font-size:10px;">ตำแหน่ง (Lv3)</th>
                    <th style="position:sticky; top:0; z-index:10; background:var(--bg-card); text-align:left; font-size:10px;">รายละเอียด (Lv4)</th>
                    <th style="position:sticky; top:0; z-index:10; background:var(--bg-card); text-align:center; font-size:10px;">สังกัด</th>
                    <th style="position:sticky; top:0; z-index:10; background:var(--bg-card); text-align:center; font-size:10px;">วันที่สิ้นสุด</th>
                </tr></thead><tbody>`;
                
                let resignedList = todayWf.resigned || [];
                if (resignedList.length === 0) {
                    resHtml += `<tr><td colspan="5" class="text-center text-muted" style="padding:30px; font-size:10px;">ไม่พบประวัติพนักงานลาออกในวันนี้</td></tr>`;
                } else {
                    resignedList.sort((a, b) => (b.resignTs || 0) - (a.resignTs || 0));

                    resignedList.forEach(emp => {
                        resHtml += `<tr>
                            <td style="text-align:left; padding-left:15px; font-size:10px;"><b>${emp.name}</b> <span style="color:var(--text-muted); font-size:0.85em;">(${emp.nickname})</span></td>
                            <td style="text-align:left; font-size:10px; color:var(--text-muted);">${emp.lv3}</td>
                            <td style="text-align:left; font-weight:500; font-size:10px;">${emp.lv4}</td>
                            <td class="text-center"><span class="badge info" style="font-size:9px;">${emp.bu}</span></td>
                            <td class="text-center" style="font-weight:700; color:var(--danger); font-size:10px;">${emp.resignDateStr || '-'}</td>
                        </tr>`;
                    });
                }
                resHtml += `</tbody>`;
                resignedTable.innerHTML = resHtml;
            }

            updateTrendChart(selectedDateStr);
        }
    } catch(e) { console.error("Workforce Update Error:", e); }

    // --- Wave Ops ---
    try {
        if(Object.keys(globalData.wave_ops || {}).length > 0) {
            let waveDataForFFM = globalData.wave_ops;
            let wKeysFFM = Object.keys(waveDataForFFM).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
            
            let targetWaveFfmKey = null; let totalOrdersToday = 0;
            let prevWaveKey = null; let totalOrdersYesterday = 0;

            for (let k of wKeysFFM) {
                if (new Date(k).getTime() <= targetTimestamp) {
                    let tot = 0;
                    Object.keys(waveDataForFFM[k].bu_data || {}).forEach(bu => {
                        if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) tot += waveDataForFFM[k].bu_data[bu].total_orders || 0;
                    });
                    if (tot > 0 || !window.selectedBUs.includes('ALL')) {
                        if (!targetWaveFfmKey) { targetWaveFfmKey = k; totalOrdersToday = tot; } 
                        else if (!prevWaveKey) { prevWaveKey = k; totalOrdersYesterday = tot; break; }
                    }
                }
            }

            const ordersEl = document.getElementById('ffm-orders-shipped');
            if (ordersEl) {
                ordersEl.innerText = totalOrdersToday > 0 ? fmtN(totalOrdersToday) : "0";
                const trendEl = document.getElementById('ffm-orders-trend');
                const trendTextEl = document.getElementById('ffm-orders-note');
                
                if (trendEl) {
                    if (totalOrdersYesterday === 0 && totalOrdersToday === 0) {
                        trendEl.className = "badge info"; trendEl.innerText = "-"; if(trendTextEl) trendTextEl.innerText = "ไม่มีข้อมูลเปรียบเทียบ";
                    } else if (totalOrdersYesterday === 0) {
                        trendEl.className = "badge up"; trendEl.innerText = "↗ 100%"; if(trendTextEl) trendTextEl.innerText = "vs previous";
                    } else {
                        let pctDiff = ((totalOrdersToday - totalOrdersYesterday) / totalOrdersYesterday) * 100;
                        if (pctDiff > 0) { trendEl.className = "badge up"; trendEl.innerText = `↗ +${pctDiff.toFixed(1)}%`; } 
                        else if (pctDiff < 0) { trendEl.className = "badge down"; trendEl.innerText = `↘ ${Math.abs(pctDiff).toFixed(1)}%`; } 
                        else { trendEl.className = "badge info"; trendEl.innerText = `0%`; }
                        if(trendTextEl && prevWaveKey) { trendTextEl.innerText = `vs ${getShortDate(prevWaveKey)}`; }
                    }
                }
                let ordersUpdateEl = ordersEl.parentElement.nextElementSibling;
                if (ordersUpdateEl && targetWaveFfmKey) ordersUpdateEl.innerText = `Updated: ${getDisplayDate(targetWaveFfmKey)}`;
            }
            
            let ffmData = globalData.fulfillment || {};
            let ffmKeys = Object.keys(ffmData).sort((a,b)=>new Date(b).getTime() - new Date(a).getTime());
            let targetFfmKey = null; let avgOrderFFM = "0";

            for (let k of ffmKeys) {
                if (new Date(k).getTime() <= targetTimestamp) {
                    let buList = [];
                    Object.keys(ffmData[k].bu_data || {}).forEach(bu => {
                        if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) buList.push(ffmData[k].bu_data[bu]);
                    });
                    if (buList.length > 0) {
                        targetFfmKey = k;
                        avgOrderFFM = (buList.reduce((s, i) => s + (i.item_ffm || 0), 0) / buList.length).toFixed(1);
                        break;
                    }
                }
            }
            const rateEl = document.getElementById('ffm-order-rate');
            if (rateEl) {
                rateEl.innerText = avgOrderFFM > 0 ? avgOrderFFM + "%" : "...";
                let rateUpdateEl = rateEl.parentElement.nextElementSibling;
                if (rateUpdateEl && targetFfmKey) rateUpdateEl.innerText = `Updated: ${getDisplayDate(targetFfmKey)}`;
            }
            
            const waveSummaryTable = document.getElementById('wave-summary-table');
            if (waveSummaryTable) {
                let allBUs = new Set();
                wKeysFFM.forEach(k => Object.keys(waveDataForFFM[k].bu_data || {}).forEach(bu => {
                    if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) allBUs.add(bu);
                }));
                let sortedBUs = Array.from(allBUs).sort();

                if (wKeysFFM.length === 0 || sortedBUs.length === 0) {
                    waveSummaryTable.innerHTML = `<thead><tr><th class='text-center' style='padding:30px; color:var(--text-muted);'>ไม่มีข้อมูลออเดอร์</th></tr></thead>`;
                } else {
                    let thead = `<thead><tr><th class="role-cell" style="text-align:center; min-width: 120px;">Planned Date</th>${sortedBUs.map(bu => `<th class="aff-header">${bu}</th>`).join('')}<th class="total-cell">Total (เสร็จ / ทั้งหมด)</th><th class="total-cell" style="text-align:center;">% Completed</th></tr></thead>`;
                    let tbody = "<tbody>";
                    
                    let validWaveKeys = wKeysFFM.filter(k => new Date(k).getTime() <= targetTimestamp + (3 * 24 * 60 * 60 * 1000)).slice(0, 7);
                    
                    validWaveKeys.forEach(dKey => {
                        let tr = `<tr><td class="role-cell" style="text-align:center;">${getShortDate(dKey)}</td>`;
                        let dayTot = 0, dayComp = 0;
                        sortedBUs.forEach(bu => {
                            let buData = waveDataForFFM[dKey].bu_data[bu] || { total_orders: 0, completed_orders: 0 };
                            dayTot += buData.total_orders; dayComp += buData.completed_orders;
                            if (buData.total_orders === 0) { tr += `<td>-</td>`; } 
                            else {
                                let color = (buData.completed_orders === buData.total_orders) ? 'var(--accent-primary)' : (buData.completed_orders > 0 ? 'var(--accent-secondary)' : 'var(--danger)');
                                tr += `<td><span style="color:${color}; font-weight:800; font-size:0.9rem;">${fmtN(buData.completed_orders)}</span> <span style="color:var(--text-muted); font-size:0.75rem;">/ ${fmtN(buData.total_orders)}</span></td>`;
                            }
                        });
                        
                        let grandColor = (dayComp === dayTot && dayTot > 0) ? 'var(--accent-primary)' : (dayComp > 0 ? 'var(--accent-secondary)' : 'var(--danger)');
                        tr += `<td class="total-cell"><span style="color:${grandColor}; font-weight:800; font-size:0.95rem;">${fmtN(dayComp)}</span> <span style="color:var(--text-muted); font-size:0.75rem;">/ ${fmtN(dayTot)}</span></td>`;
                        
                        let pct = dayTot > 0 ? ((dayComp / dayTot) * 100).toFixed(1) : 0;
                        let pctBg = pct >= 100 ? '#dcfce7' : (pct > 0 ? '#fef3c7' : '#fee2e2');
                        let pctColor = pct >= 100 ? '#166534' : (pct > 0 ? '#92400e' : '#991b1b');
                        tr += `<td class="total-cell" style="text-align:center;"><span class="pct-pill" style="background:${pctBg}; color:${pctColor}; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:600;">${pct}%</span></td></tr>`;
                        tbody += tr;
                    });
                    waveSummaryTable.innerHTML = thead + tbody + "</tbody>";
                }
            }
            
            let activeWaveKey = null; let pendingFutureOrders = 0; let wKeysAsc = [...wKeysFFM].reverse(); 
            
            if (wKeysAsc.length > 0) {
                for (let key of wKeysAsc) {
                    let dTot = 0; let dComp = 0;
                    Object.keys(waveDataForFFM[key].bu_data).forEach(bu => {
                        if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) {
                            dTot += waveDataForFFM[key].bu_data[bu].total_orders || 0;
                            dComp += waveDataForFFM[key].bu_data[bu].completed_orders || 0;
                        }
                    });
                    if (dTot > 0 && dComp < dTot) { if (dComp === 0 && dTot <= 5) continue; activeWaveKey = key; break; }
                }
                if (!activeWaveKey) activeWaveKey = wKeysFFM[0]; 
                
                let activeTime = activeWaveKey ? new Date(activeWaveKey).getTime() : 0;
                for (let key of wKeysAsc) { 
                    if (new Date(key).getTime() > activeTime) { 
                        let dTot = 0; let dComp = 0;
                        Object.keys(waveDataForFFM[key].bu_data).forEach(bu => {
                            if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) {
                                dTot += waveDataForFFM[key].bu_data[bu].total_orders || 0;
                                dComp += waveDataForFFM[key].bu_data[bu].completed_orders || 0;
                            }
                        });
                        pendingFutureOrders += (dTot - dComp); 
                    } 
                }
            }

            const aD = activeWaveKey ? waveDataForFFM[activeWaveKey].bu_data : {};
            let aTotal = 0, aComp = 0, aLate = 0, aDelay = 0;
            let worstBU = ""; 

            Object.keys(aD).forEach(bu => {
                if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) {
                    aTotal += aD[bu].total_orders || 0;
                    aComp += aD[bu].completed_orders || 0;
                    aLate += aD[bu].late_orders || 0;
                    if ((aD[bu].total_delay_mins || 0) > aDelay) {
                        aDelay = aD[bu].total_delay_mins;
                        worstBU = bu;
                    }
                }
            });

            let diffDays = 0, activeDateStr = "--";
            if (activeWaveKey) { activeDateStr = getShortDate(activeWaveKey); let todayD = new Date(); todayD.setHours(0,0,0,0); let workDMid = new Date(activeWaveKey); workDMid.setHours(0,0,0,0); diffDays = Math.floor((todayD - workDMid) / (1000 * 60 * 60 * 24)); }

            if (document.getElementById('wave-total')) {
                document.getElementById('wave-total').innerText = aTotal > 0 ? fmtN(aTotal) : "0";
                document.getElementById('wave-completed').innerText = aComp > 0 ? fmtN(aComp) : "0";
                document.getElementById('wave-late').innerText = aLate > 0 ? fmtN(aLate) : "0";
                let delayEl = document.getElementById('wave-delay');
                if (delayEl) {
                    if (aDelay > 0) { delayEl.innerText = `${Math.floor(aDelay / 60)}h ${aDelay % 60}m`; delayEl.style.color = dangerRed; } 
                    else { delayEl.innerText = `0h 0m`; delayEl.style.color = accentGreen; }
                }
                if(document.getElementById('wave-active-info-1')) document.getElementById('wave-active-info-1').innerHTML = `<span class="badge info">${activeDateStr}</span> ${pendingFutureOrders > 0 ? `รอ ${fmtN(pendingFutureOrders)} บิล` : `แผนล่าสุด`}${diffDays > 0 ? ` <span class="badge down">ดีเลย์ ${diffDays} วัน</span>` : ''}`;
                let aCompPct = aTotal > 0 ? ((aComp / aTotal) * 100).toFixed(1) : 0;
                if(document.getElementById('wave-active-info-2')) document.getElementById('wave-active-info-2').innerHTML = `<span class="badge up" style="background:${aCompPct>=100?'#dcfce7':'#fef3c7'}">${aCompPct}%</span> เสร็จ ${fmtN(aComp)} / ${fmtN(aTotal)}`;
                if(document.getElementById('wave-active-info-3')) document.getElementById('wave-active-info-3').innerHTML = `<span class="badge down">หลุด SLA</span> แผน ${activeDateStr} &bull; ${fmtN(aLate)} บิล`;
                if(document.getElementById('wave-active-info-4')) {
                    if (aDelay > 0) {
                        document.getElementById('wave-active-info-4').innerHTML = `<span class="badge down">ดีเลย์อยู่</span> ช้าสุดที่: <b>${worstBU}</b>`;
                    } else {
                        document.getElementById('wave-active-info-4').innerHTML = `<span class="badge up">ปกติ</span> ทำงานทันตามแผน`;
                    }
                }
                [1, 2, 3, 4].forEach(i => { let el = document.getElementById(`wave-date-${i}`); if (el) el.innerText = `Updated: ข้อมูลแผน (${activeWaveKey ? getDisplayDate(activeWaveKey) : "--"})`; });
            }
            
            if (typeof generateExecutiveAlerts === "function") {
                generateExecutiveAlerts(targetTimestamp, activeWaveKey, aLate, aDelay, diffDays, worstBU);
            }
        }
    } catch(e) { console.error("Wave Ops Update Error:", e); }
}

function updateTrendChart(baseDateStr) {
    if (!workforceChartInstance) return;
    const targetTimestamp = new Date(baseDateStr).setHours(23, 59, 59, 999);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let labels = [], dataPoints = [];
    let wfKeys = Object.keys(globalData.workforce || {}).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).filter(k => new Date(k).getTime() <= targetTimestamp).slice(0, 7).reverse();
    const roleF = document.getElementById('trend-role-filter')?.value || 'All';

    wfKeys.forEach(k => {
        let dObj = new Date(k); labels.push(`${String(dObj.getDate()).padStart(2,'0')} ${months[dObj.getMonth()]}`);
        let dayD = globalData.workforce[k];
        let val = 0;
        Object.keys(dayD.matrix || {}).forEach(aff => {
            if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(aff)) {
                if (roleF === 'All') {
                    ["Pick","RT","QC","QA","Grouping","Putaway","Receive"].forEach(r => { 
                        if(dayD.matrix[aff][r]) Object.values(dayD.matrix[aff][r]).forEach(v => val += v); 
                    });
                } else if (roleF === 'QCQA') {
                    ["QC","QA"].forEach(r => { 
                        if(dayD.matrix[aff][r]) Object.values(dayD.matrix[aff][r]).forEach(v => val += v); 
                    });
                } else {
                    if(dayD.matrix[aff][roleF]) Object.values(dayD.matrix[aff][roleF]).forEach(v => val += v);
                }
            }
        });
        dataPoints.push(val);
    });
    workforceChartInstance.data.labels = labels; workforceChartInstance.data.datasets[0].data = dataPoints; workforceChartInstance.update();
}

function renderOnTimeSection() {
    if(!globalData.ontime) return;
    if(Object.keys(globalData.ontime).length === 0) return;
    const dpVal = document.getElementById('date-picker')?.value;
    const targetTimestamp = new Date(dpVal).setHours(23, 59, 59, 999);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const getDisplayDate = (d) => `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    
    let otArray = [];
    Object.keys(globalData.ontime).forEach(key => {
        let dObj = new Date(key);
        if(!isNaN(dObj.getTime())) otArray.push({ dateObj: dObj, ptglg: globalData.ontime[key], hub: globalData.ontime_hub[key] || null });
    });
    otArray.sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime()); 
    let validOtArray = otArray.filter(i => i.dateObj.getTime() <= targetTimestamp);

    const otType = document.getElementById('ontime-filter')?.value || 'Overview';
    const otPeriod = document.getElementById('ontime-period-filter')?.value || 'Daily';

    let grouped = {}; 
    validOtArray.forEach(item => {
        let pd = item.dateObj; let groupKey = (otPeriod === 'Daily') ? `${String(pd.getDate()).padStart(2,'0')} ${months[pd.getMonth()]}` : (otPeriod === 'Monthly' ? `${months[pd.getMonth()]} ${pd.getFullYear()}` : `${pd.getFullYear()}`);
        if(!grouped[groupKey]) grouped[groupKey] = { sumPt:0, cntPt:0, sumHub:0, cntHub:0, time: pd.getTime() };
        if(item.ptglg !== null) { grouped[groupKey].sumPt += item.ptglg; grouped[groupKey].cntPt++; }
        if(item.hub !== null) { grouped[groupKey].sumHub += item.hub; grouped[groupKey].cntHub++; }
    });
    let sortedG = Object.keys(grouped).map(k => ({ label: k, ...grouped[k] })).sort((a,b) => a.time - b.time);
    let chartSlice = (otPeriod === 'Daily') ? sortedG.slice(-14) : sortedG;

    if (ontimeChartInstance) {
        let labels = [], d0 = [], d1 = [];
        chartSlice.forEach(g => {
            labels.push(g.label);
            let avgP = g.cntPt > 0 ? g.sumPt / g.cntPt : null, avgH = g.cntHub > 0 ? g.sumHub / g.cntHub : null;
            let over = (avgP !== null && avgH !== null) ? (avgP+avgH)/2 : (avgP !== null ? avgP : (avgH !== null ? avgH : null));
            if(otType === 'Overview') { d0.push(over!==null?parseFloat(over.toFixed(2)):null); d1.push(null); } 
            else if (otType === 'PTGLG') { d0.push(avgP!==null?parseFloat(avgP.toFixed(2)):null); d1.push(null); } 
            else { d0.push(null); d1.push(avgH!==null?parseFloat(avgH.toFixed(2)):null); }
        });
        ontimeChartInstance.data.labels = labels; ontimeChartInstance.data.datasets[0].data = d0; ontimeChartInstance.data.datasets[1].data = d1;
        ontimeChartInstance.data.datasets[0].label = otType + ' %'; ontimeChartInstance.data.datasets[0].borderColor = otType === 'HUB' ? '#3B82F6' : accentGreen;
        ontimeChartInstance.data.datasets[0].backgroundColor = otType === 'HUB' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)';
        ontimeChartInstance.update();
    }
    
    if (ontimeChart1Instance) {
        let labels1 = [], data1 = [];
        let slice1 = sortedG.slice(-14);
        slice1.forEach(g => {
            labels1.push(g.label.split(' ')[0]);
            let avgP = g.cntPt > 0 ? g.sumPt / g.cntPt : null, avgH = g.cntHub > 0 ? g.sumHub / g.cntHub : null;
            let over = (avgP !== null && avgH !== null) ? (avgP+avgH)/2 : (avgP !== null ? avgP : (avgH !== null ? avgH : null));
            data1.push(over!==null?parseFloat(over.toFixed(2)):null);
        });
        ontimeChart1Instance.data.labels = labels1;
        ontimeChart1Instance.data.datasets[0].data = data1;
        ontimeChart1Instance.update();
    }

    const summaryEl = document.getElementById('ontime-summary-box');
    if (summaryEl && sortedG.length > 0) {
        let curr = sortedG[sortedG.length - 1], prev = sortedG[sortedG.length - 2] || null;
        const getV = (o, isH) => isH ? (o.cntHub>0?o.sumHub/o.cntHub:null) : (o.cntPt>0?o.sumPt/o.cntPt:null);
        let vPt = getV(curr, false), vHub = getV(curr, true);
        
        let t1 = `<b>PTGLG:</b> <span style="color:${vPt>=99?'#10B981':(vPt>=95?'#F59E0B':'#EF4444')}; font-weight:700;">${vPt!==null?vPt.toFixed(2)+'%':'-'}</span>`;
        let t2 = `<b>HUB:</b> <span style="color:${vHub>=99?'#10B981':(vHub>=95?'#F59E0B':'#EF4444')}; font-weight:700;">${vHub!==null?vHub.toFixed(2)+'%':'-'}</span>`;
        let timeWord = otPeriod === 'Daily' ? 'ช่วงที่ผ่านมา' : (otPeriod === 'Monthly' ? 'เดือนที่แล้ว' : 'ปีที่แล้ว');
        
        if(otType === 'Overview') {
            summaryEl.innerHTML = `💡 <b>ล่าสุด (${curr.label}):</b> ${t1} &nbsp;&nbsp;|&nbsp;&nbsp; ${t2} <span style="color:var(--text-muted); font-size:0.85em; margin-left:10px;">${timeWord}</span>`;
        } else if (otType === 'PTGLG') {
            summaryEl.innerHTML = `💡 <b>ล่าสุด (${curr.label}):</b> ${t1} <span style="color:var(--text-muted); font-size:0.85em; margin-left:10px;">${timeWord}</span>`;
        } else {
            summaryEl.innerHTML = `💡 <b>ล่าสุด (${curr.label}):</b> ${t2} <span style="color:var(--text-muted); font-size:0.85em; margin-left:10px;">${timeWord}</span>`;
        }
    }

    const otTable = document.getElementById('ontime-detail-table');
    if (otTable) {
        let thead = `<thead><tr><th class="role-cell" style="text-align:center; position:sticky; top:0; left:0; z-index:20; background:var(--bg-card); white-space:nowrap; padding: 12px 6px;">Date</th><th class="total-cell" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); padding: 12px 6px;">ภาพรวม</th><th class="total-cell" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); padding: 12px 6px;">PTGLG</th><th class="total-cell" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); padding: 12px 6px;">HUB</th></tr></thead>`;
        let tbody = "<tbody>" + validOtArray.slice().reverse().map(i => {
            let over = (i.ptglg !== null && i.hub !== null) ? (i.ptglg+i.hub)/2 : (i.ptglg !== null ? i.ptglg : (i.hub !== null ? i.hub : null));
            const p = (v) => {
                if (v === null || v === undefined) return '<span style="color:var(--text-muted); font-size:11px;">-</span>';
                let bg = v >= 99 ? '#dcfce7' : (v >= 95 ? '#fef3c7' : '#fee2e2');
                let clr = v >= 99 ? '#166534' : (v >= 95 ? '#92400e' : '#991b1b');
                return `<span style="display:inline-block; background:${bg}; color:${clr}; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;">${v.toFixed(2)}%</span>`;
            };
            return `<tr><td class="role-cell" style="text-align:center; position:sticky; left:0; z-index:10; background:var(--bg-card); white-space:nowrap; font-size: 11px;">${getDisplayDate(i.dateObj)}</td><td class="total-cell" style="text-align:center;">${p(over)}</td><td class="total-cell" style="text-align:center;">${p(i.ptglg)}</td><td class="total-cell" style="text-align:center;">${p(i.hub)}</td></tr>`;
        }).join('') + "</tbody>";
        otTable.innerHTML = thead + tbody;
    }

    let currentOverVal = null; let prevOverVal = null; let prevOtDateStr = null; let targetOtDateStr = null;
    for (let i = validOtArray.length - 1; i >= 0; i--) {
        let pVal = validOtArray[i].ptglg; let hVal = validOtArray[i].hub;
        let overVal = (pVal !== null && hVal !== null) ? (pVal + hVal) / 2 : (pVal !== null ? pVal : (hVal !== null ? hVal : null));

        if (overVal !== null) {
            if (targetOtDateStr === null) { currentOverVal = overVal; targetOtDateStr = validOtArray[i].dateObj; } 
            else if (prevOtDateStr === null) { prevOverVal = overVal; let pd = validOtArray[i].dateObj; prevOtDateStr = `${String(pd.getDate()).padStart(2, '0')} ${months[pd.getMonth()]}`; break; }
        }
    }

    const ontimeEl = document.getElementById('ontime-val');
    if (ontimeEl) {
        ontimeEl.innerText = targetOtDateStr !== null ? currentOverVal.toFixed(2) + "%" : "0.00%";
        let trendEl = document.getElementById('ontime-trend'); let noteEl = document.getElementById('ontime-note');
        if (trendEl && noteEl) {
            if (targetOtDateStr === null) { trendEl.className = "badge info"; trendEl.innerText = "-"; noteEl.innerText = "ไม่มีข้อมูล"; } 
            else if (prevOtDateStr === null) { trendEl.className = "badge info"; trendEl.innerText = "-"; noteEl.innerText = "ไม่มีข้อมูลเปรียบเทียบ"; } 
            else {
                let diff = currentOverVal - prevOverVal; 
                if (diff > 0) { trendEl.className = "badge up"; trendEl.innerText = `↗ +${diff.toFixed(2)} pp`; } 
                else if (diff < 0) { trendEl.className = "badge down"; trendEl.innerText = `↘ ${Math.abs(diff).toFixed(2)} pp`; } 
                else { trendEl.className = "badge info"; trendEl.innerText = `0 pp`; }
                noteEl.innerText = `vs ${prevOtDateStr}`;
            }
        }
        if (ontimeEl.parentElement.nextElementSibling && targetOtDateStr) { ontimeEl.parentElement.nextElementSibling.innerText = `Updated: ${getDisplayDate(targetOtDateStr)}`; }
    }
}

function renderClaimSection() {
    try {
        if (!globalData.claims || Object.keys(globalData.claims).length === 0) return;
        
        const dpVal = document.getElementById('date-picker')?.value || new Date().toISOString().split('T')[0];
        const targetTimestamp = new Date(dpVal).setHours(23, 59, 59, 999);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        let claimsData = globalData.claims || {};
        let period = document.getElementById('claim-period-filter')?.value || 'Monthly'; 

        let combinedData = [];
        let allBUs = new Set();
        
        // 1. กวาดข้อมูลและแยกระหว่าง Cost กับ Qty
        Object.keys(claimsData).forEach(dKey => {
            let dObj = new Date(dKey);
            if (!isNaN(dObj.getTime()) && dObj.getTime() <= targetTimestamp) {
                let cData = claimsData[dKey].bu_data || {}; 

                let cTotalCost = 0;
                let cTotalQty = 0;
                Object.keys(cData).forEach(bu => { 
                    if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) {
                        allBUs.add(bu); 
                        let buCost = typeof cData[bu] === 'object' ? (cData[bu].cost || 0) : (cData[bu] || 0);
                        let buQty = typeof cData[bu] === 'object' ? (cData[bu].qty || 0) : (cData[bu] || 0);
                        cTotalCost += buCost;
                        cTotalQty += buQty;
                    }
                });
                
                if (cTotalCost > 0 || cTotalQty > 0 || allBUs.size > 0) {
                    combinedData.push({ dateObj: dObj, cost: cTotalCost, qty: cTotalQty, cData: cData });
                }
            }
        });

        let sortedBUs = Array.from(allBUs).sort();
        let grouped = {};

        // 2. จัดกลุ่มรายวัน หรือ รายเดือน
        combinedData.forEach(item => {
            let pd = item.dateObj;
            let groupKey = (period === 'Daily') ? `${String(pd.getDate()).padStart(2,'0')} ${months[pd.getMonth()]}` : `${months[pd.getMonth()]} ${pd.getFullYear()}`;
            let sortTime = (period === 'Daily') ? pd.getTime() : new Date(pd.getFullYear(), pd.getMonth(), 1).getTime();

            if(!grouped[groupKey]) {
                grouped[groupKey] = { cost: 0, qty: 0, time: sortTime, rawDate: pd, bu: {} };
                sortedBUs.forEach(bu => grouped[groupKey].bu[bu] = { cost: 0, qty: 0 });
            }
            
            grouped[groupKey].cost += item.cost;
            grouped[groupKey].qty += item.qty;
            
            sortedBUs.forEach(bu => {
                let buCost = typeof item.cData[bu] === 'object' ? (item.cData[bu].cost || 0) : (item.cData[bu] || 0);
                let buQty = typeof item.cData[bu] === 'object' ? (item.cData[bu].qty || 0) : (item.cData[bu] || 0);
                grouped[groupKey].bu[bu].cost += buCost;
                grouped[groupKey].bu[bu].qty += buQty;
            });
        });

        let sortedG = Object.keys(grouped).map(k => ({ label: k, ...grouped[k] })).sort((a,b) => a.time - b.time);
        
        const summaryBox = document.getElementById('claim-summary-box');
        if (summaryBox && sortedG.length > 0) {
            let currM = sortedG[sortedG.length - 1]; 
            let prevM = sortedG.length > 1 ? sortedG[sortedG.length - 2] : null; 
            
            let html = `💡 <b>สรุปยอดล่าสุด (${currM.label}):</b> มูลค่าเคลมรวม <b style="color:var(--danger); font-size:1.15em;">${fmtN(currM.cost)} ฿</b> <span style="color:var(--text-muted); font-size:0.85em;">(${fmtN(currM.qty)} ชิ้น)</span>`;
            
            if (prevM) {
                let diffCost = currM.cost - prevM.cost;
                let diffQty = currM.qty - prevM.qty;
                let periodText = period === 'Daily' ? 'เมื่อวาน' : `เดือน ${prevM.label}`;
                
                if (diffCost > 0) {
                    html += `<br><span style="margin-top:6px; display:inline-block;">📈 เทียบกับ${periodText}: <span style="color:var(--danger); font-weight:700;">แย่ลง (ยอดเคลมพุ่งขึ้น +${fmtN(diffCost)} ฿)</span> <span style="color:var(--text-muted); font-size:0.85em; margin-left:8px;">จำนวนชิ้น ${diffQty > 0 ? '+' : ''}${fmtN(diffQty)} ชิ้น</span></span>`;
                    summaryBox.style.borderLeftColor = '#EF4444';
                    summaryBox.style.background = 'rgba(239, 68, 68, 0.05)';
                } else if (diffCost < 0) {
                    html += `<br><span style="margin-top:6px; display:inline-block;">📉 เทียบกับ${periodText}: <span style="color:#10B981; font-weight:700;">ดีขึ้น (ยอดเคลมลดลง ${fmtN(Math.abs(diffCost))} ฿)</span> <span style="color:var(--text-muted); font-size:0.85em; margin-left:8px;">จำนวนชิ้น ${diffQty > 0 ? '+' : ''}${fmtN(diffQty)} ชิ้น</span></span>`;
                    summaryBox.style.borderLeftColor = '#10B981';
                    summaryBox.style.background = 'rgba(16, 185, 129, 0.05)';
                } else {
                    html += `<br><span style="margin-top:6px; display:inline-block;">➖ เทียบกับ${periodText}: <span style="color:var(--text-muted); font-weight:700;">เท่าเดิม (ไม่เปลี่ยนแปลง)</span></span>`;
                    summaryBox.style.borderLeftColor = '#F59E0B';
                    summaryBox.style.background = 'rgba(245, 158, 11, 0.05)';
                }
            } else {
                html += `<br><span style="margin-top:6px; display:inline-block; color:var(--text-muted); font-size:0.85em;">ไม่มีข้อมูลก่อนหน้าเพื่อนำมาเปรียบเทียบ</span>`;
            }
            summaryBox.innerHTML = html;
        }

        // 3. วาดกราฟ Claim Trend 
        if (claimChart2Instance) {
            let chartSlice = (period === 'Daily') ? sortedG.slice(-14) : sortedG.slice(-12);
            let labels = [], dataCost = [], dataQty = [];
            
            chartSlice.forEach(g => {
                labels.push(g.label);
                dataCost.push(g.cost); 
                dataQty.push(g.qty);   
            });
            
            claimChart2Instance.data.labels = labels;
            claimChart2Instance.data.datasets[0].data = dataCost;
            claimChart2Instance.data.datasets[1].data = dataQty; 
            claimChart2Instance.update();
        }

        // กราฟอันเล็กหน้า Overview Executive
        if (claimChart1Instance) {
            let overviewSlice = sortedG.slice(-6); 
            let labels = [], dataCost = [], dataQty = [];
            
            overviewSlice.forEach(g => {
                labels.push(g.label.split(' ')[0]); 
                dataCost.push(g.cost);
                dataQty.push(g.qty);
            });
            
            claimChart1Instance.data.labels = labels;
            claimChart1Instance.data.datasets[0].data = dataCost;
            if (claimChart1Instance.data.datasets[1]) {
                claimChart1Instance.data.datasets[1].data = dataQty;
            }
            claimChart1Instance.update();
        }

        // 4. สร้างตาราง Daily / Monthly Claim Record
        const tableEl = document.getElementById('claim-detail-table');
        if (tableEl) {
            tableEl.parentElement.style.display = 'block';
            tableEl.parentElement.style.maxWidth = '100%';
            tableEl.parentElement.style.overflowX = 'auto';
            tableEl.parentElement.style.width = '100%';

            let thead = `<thead><tr>
                <th class="role-cell" style="text-align:center; position:sticky; top:0; left:0; z-index:20; background:var(--bg-card); min-width: 60px; white-space:nowrap; border-right: 1px solid var(--border-color); padding: 8px 4px; font-size: 10px;">Date / Month</th>`;
            
            sortedBUs.forEach(bu => {
                thead += `<th class="aff-header" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); min-width: 45px; white-space:nowrap; padding: 8px 4px; font-size: 10px;">${bu}</th>`;
            });
            
            thead += `<th class="total-cell" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); min-width: 65px; white-space:nowrap; padding: 8px 4px; font-size: 10px;">มูลค่ารวม (฿)</th>
                      <th class="total-cell" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); min-width: 65px; white-space:nowrap; padding: 8px 4px; font-size: 10px;">เทียบเดือนก่อน</th>
            </tr></thead>`;
            
            let tbody = "<tbody>";

            if (sortedG.length === 0) {
                tbody += `<tr><td colspan="${sortedBUs.length + 3}" class="text-center" style="color:var(--text-muted); padding:20px; font-size: 10px;">ไม่มีข้อมูล</td></tr>`;
            } else {
                let tableItems = sortedG.slice().reverse();
                tableItems.forEach((item, index) => {
                    let tr = `<tr><td class="role-cell" style="text-align:center; position:sticky; left:0; z-index:10; background:var(--bg-card); border-right: 1px solid var(--border-color); white-space:nowrap; font-weight:600; font-size:10px; padding: 8px 4px;">${item.label}</td>`;
                    
                    sortedBUs.forEach(bu => {
                        let buCost = item.bu[bu].cost;
                        if (buCost === 0) {
                            tr += `<td style="text-align:center; color:var(--text-muted); white-space:nowrap; font-size:10px; padding: 8px 4px;">-</td>`;
                        } else {
                            tr += `<td style="text-align:center; white-space:nowrap; vertical-align:middle; padding: 8px 4px; font-weight:700; color:var(--danger);">${fmtN(buCost)}</td>`;
                        }
                    });

                    let prevItem = tableItems[index + 1]; 
                    let diffHtml = '';
                    if (prevItem) {
                        let diff = item.cost - prevItem.cost;
                        if (diff > 0) {
                            diffHtml = `<span style="color:var(--danger); font-size:10px; font-weight:800;">↗ +${fmtN(diff)}</span>`;
                        } else if (diff < 0) {
                            diffHtml = `<span style="color:#10B981; font-size:10px; font-weight:800;">↘ ${fmtN(diff)}</span>`;
                        } else {
                            diffHtml = `<span style="color:var(--text-muted); font-size:10px; font-weight:600;">➖ 0</span>`;
                        }
                    } else {
                        diffHtml = `<span style="color:var(--text-muted); font-size:10px;">-</span>`;
                    }

                    tr += `<td class="total-cell" style="text-align:center; white-space:nowrap; font-size:11px; padding: 8px 4px; color:var(--danger); font-weight:700;">${fmtN(item.cost)}</td>
                           <td class="total-cell" style="text-align:center; white-space:nowrap; padding: 8px 4px; background-color:#F8FAFC;">${diffHtml}</td>
                    </tr>`;
                    
                    tbody += tr;
                });
            }
            tableEl.innerHTML = thead + tbody + "</tbody>";
        }

        if (sortedG.length > 0) {
            let currM = sortedG[sortedG.length - 1];
            let prevM = sortedG.length > 1 ? sortedG[sortedG.length - 2] : null;

            let currCost = currM.cost;
            let prevCost = prevM ? prevM.cost : null;

            const valEl = document.getElementById('claim-val');
            const trendEl = document.getElementById('claim-trend');
            const noteEl = document.getElementById('claim-note');
            const upEl = document.getElementById('claim-update');

            if (valEl) {
                valEl.innerText = fmtN(currCost);
                valEl.style.color = currCost > 0 ? "var(--danger)" : "var(--text-main)";
            }
            
            if (trendEl && noteEl) {
                if (prevCost === null) {
                    trendEl.className = "badge info"; trendEl.innerText = "-"; noteEl.innerText = "vs prev";
                } else {
                    let diff = currCost - prevCost;
                    if (diff > 0) {
                        trendEl.className = "badge down"; trendEl.innerText = `↗ +${fmtN(diff)}`; noteEl.innerText = `vs ${prevM.label}`;
                    } else if (diff < 0) {
                        trendEl.className = "badge up"; trendEl.innerText = `↘ ${fmtN(Math.abs(diff))}`; noteEl.innerText = `vs ${prevM.label}`;
                    } else {
                        trendEl.className = "badge info"; trendEl.innerText = `0`; noteEl.innerText = `vs ${prevM.label}`;
                    }
                }
            }
            if (upEl) {
                upEl.innerText = `Updated: ข้อมูล ${period === 'Daily' ? 'วัน' : 'เดือน'} ${currM.label}`;
            }
        }
    } catch (e) {
        console.error("Claim Render Error:", e);
    }
}

function renderLocationAccuracy() {
    const locTableEl = document.getElementById('loc-accuracy-table');
    const locBoxEl = document.getElementById('loc-analysis-box');
    if(!locTableEl || !locBoxEl || !globalData.inventory || Object.keys(globalData.inventory).length === 0) return;

    const dpVal = document.getElementById('date-picker')?.value || new Date().toISOString().split('T')[0];
    const targetTimestamp = new Date(dpVal).setHours(23, 59, 59, 999);
    
    let parsedData = [];
    Object.keys(globalData.inventory).forEach(mLabel => {
        let parts = mLabel.split('-');
        if (parts.length === 2) {
            let dObj = new Date(`${parts[0]} 1, 20${parts[1]}`);
            parsedData.push({ label: mLabel, dateObj: dObj });
        }
    });
    parsedData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    let validData = parsedData.filter(i => i.dateObj.getTime() <= targetTimestamp);

    if(validData.length === 0) return;

    let currM = validData[validData.length - 1]; 
    let mLabel = currM.label;
    let locStats = globalData.inventory[mLabel]?.loc_stats;

    if (!locStats || locStats.total === 0) {
        locTableEl.innerHTML = `<tr><td class="text-center" style="padding:20px; color:var(--text-muted);">ไม่มีข้อมูลตรวจ Location ในเดือน ${mLabel}</td></tr>`;
        locBoxEl.innerHTML = `💡 ไม่มีข้อมูลสินค้าวางผิด Location ในเดือน ${mLabel}`;
    } else {
        let rawDetailsArr = [];
        Object.keys(locStats.details).forEach(bu => {
            Object.keys(locStats.details[bu]).forEach(tz => {
                let d = locStats.details[bu][tz];
                let parts = tz.split(" | ");
                let lType = parts[0];
                let zone = parts[1];
                let acc = d.total > 0 ? ((d.total - d.wrong) / d.total) * 100 : 0;
                rawDetailsArr.push({ bu: bu, type: lType, zone: zone, checked: d.total, wrong: d.wrong, acc: acc });
            });
        });

        populateLocFilterOptions(rawDetailsArr);

        let filteredArr = rawDetailsArr.filter(item => {
            let passBU = window.locFilters.bu.includes('ALL') || window.locFilters.bu.includes(item.bu);
            let passType = window.locFilters.type.includes('ALL') || window.locFilters.type.includes(item.type);
            let passZone = window.locFilters.zone.includes('ALL') || window.locFilters.zone.includes(item.zone);
            return passBU && passType && passZone;
        });

        filteredArr.sort((a, b) => b.wrong - a.wrong);

        let thead = `<thead><tr>
            <th style="position:sticky; top:0; z-index:10; background:var(--bg-card); padding:10px; font-size:11px;">BU</th>
            <th style="position:sticky; top:0; z-index:10; background:var(--bg-card); padding:10px; font-size:11px;">Location Type</th>
            <th style="position:sticky; top:0; z-index:10; background:var(--bg-card); padding:10px; font-size:11px;">Zone</th>
            <th style="position:sticky; top:0; z-index:10; background:var(--bg-card); padding:10px; font-size:11px; text-align:center;">Locations Checked</th>
            <th style="position:sticky; top:0; z-index:10; background:var(--bg-card); padding:10px; font-size:11px; text-align:center;">Wrong Location</th>
            <th style="position:sticky; top:0; z-index:10; background:var(--bg-card); padding:10px; font-size:11px; text-align:center;">Accuracy %</th>
        </tr></thead>`;

        let tbody = "<tbody>";
        let worstZone = null;

        if (filteredArr.length === 0) {
             tbody += `<tr><td colspan="6" class="text-center" style="padding:20px; color:var(--text-muted); font-size: 11px;">ไม่พบข้อมูลตามเงื่อนไขที่กรอง</td></tr>`;
        } else {
            filteredArr.forEach((item, idx) => {
                if (idx === 0 && item.wrong > 0) worstZone = item;
                
                let accClr = item.acc >= 99 ? '#166534' : '#991b1b';
                let accBg = item.acc >= 99 ? '#dcfce7' : '#fee2e2';
                
                tbody += `<tr>
                    <td style="padding:10px; font-size:11px; font-weight:600;">${item.bu}</td>
                    <td style="padding:10px; font-size:11px; color:var(--text-muted);">${item.type}</td>
                    <td style="padding:10px; font-size:11px; font-weight:700;">${item.zone}</td>
                    <td style="padding:10px; font-size:11px; text-align:center;">${fmtN(item.checked)}</td>
                    <td style="padding:10px; font-size:11px; text-align:center; color:${item.wrong>0?dangerRed:'inherit'}; font-weight:${item.wrong>0?'700':'400'};">${fmtN(item.wrong)}</td>
                    <td style="padding:10px; font-size:11px; text-align:center;">
                        <span style="display:inline-block; background:${accBg}; color:${accClr}; padding:2px 8px; border-radius:12px; font-weight:700;">${item.acc.toFixed(2)}%</span>
                    </td>
                </tr>`;
            });
        }
        tbody += "</tbody>";
        locTableEl.innerHTML = thead + tbody;

        let filteredChecked = filteredArr.reduce((s, i) => s + i.checked, 0);
        let filteredWrong = filteredArr.reduce((s, i) => s + i.wrong, 0);
        let filteredAcc = filteredChecked > 0 ? ((filteredChecked - filteredWrong) / filteredChecked) * 100 : 0;
        
        let analysisHtml = `<b>📊 วิเคราะห์ความแม่นยำ Location (เดือน ${mLabel}):</b> ภาพรวมความแม่นยำอยู่ที่ <b style="color:${filteredAcc>=99?'#10B981':'#EF4444'};">${filteredAcc.toFixed(2)}%</b> (ตรวจ ${fmtN(filteredChecked)} จุด พบผิด ${fmtN(filteredWrong)} จุด)`;
        
        if (worstZone) {
            analysisHtml += `<br>🚨 <b>จุดเฝ้าระวัง (Hotspot):</b> BU: <b>${worstZone.bu}</b> โซน <b>${worstZone.zone}</b> (ประเภท ${worstZone.type}) พบสินค้าวางผิด Location สูงสุด <b>${fmtN(worstZone.wrong)} จุด</b> แนะนำให้ตรวจสอบด่วน`;
        } else if (filteredChecked > 0) {
            analysisHtml += `<br>✅ <b>ยอดเยี่ยม:</b> ไม่พบปัญหาสินค้าวางผิด Location ในขอบเขตที่เลือก`;
        } else {
            analysisHtml = `💡 ไม่พบข้อมูลตามเงื่อนไขที่เลือก`;
        }
        
        locBoxEl.innerHTML = analysisHtml;
    }
}

function renderInventorySection() {
    try {
        if (!globalData.inventory) return;
        if(Object.keys(globalData.inventory).length === 0) return;
        const invData = globalData.inventory;
        const invFilterBU = document.getElementById('inv-bu-filter')?.value || 'ALL';
        const dpVal = document.getElementById('date-picker')?.value || new Date().toISOString().split('T')[0];
        const targetTimestamp = new Date(dpVal).setHours(23, 59, 59, 999);
        
        let parsedData = [];
        let allBUs = new Set();
        
        Object.keys(invData).forEach(mLabel => {
            let parts = mLabel.split('-');
            if (parts.length === 2) {
                let monthStr = parts[0];
                let yearStr = "20" + parts[1];
                let dObj = new Date(`${monthStr} 1, ${yearStr}`);
                
                let monthGroup = invData[mLabel];
                let sumOnhand = 0;
                let sumDiff = 0;
                let recordCount = 0;
                
                Object.keys(monthGroup.bu_data).forEach(bu => {
                    let cleanBu = bu.toUpperCase();
                    if (cleanBu.includes('TOTAL') || cleanBu.includes('OVERALL')) return; 

                    if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) {
                        allBUs.add(bu);
                        sumOnhand += monthGroup.bu_data[bu].onhand; 
                        sumDiff += monthGroup.bu_data[bu].diff;     
                        recordCount += monthGroup.bu_data[bu].count; 
                    }
                });
                
                let overallPct = null;
                if (recordCount > 0) {
                    overallPct = sumOnhand > 0 ? Math.max(0, (1 - (sumDiff / sumOnhand)) * 100) : (sumDiff === 0 ? 100 : 0);
                }
                
                parsedData.push({
                    label: mLabel,
                    dateObj: dObj,
                    overallPct: overallPct, 
                    bu_data: monthGroup.bu_data
                });
            }
        });
        
        parsedData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        let validData = parsedData.filter(i => i.dateObj.getTime() <= targetTimestamp);
        let sortedBUs = Array.from(allBUs).sort();

        if (inventoryChartInstance) {
            let labels = [], data = [];
            validData.forEach(item => {
                labels.push(item.label);
                if (invFilterBU === 'ALL' || !window.selectedBUs.includes('ALL')) { 
                    data.push(item.overallPct !== null ? parseFloat(item.overallPct.toFixed(2)) : null);
                } else { 
                    let buD = item.bu_data[invFilterBU];
                    let v = null;
                    if (buD && buD.count > 0) {
                        v = buD.onhand > 0 ? Math.max(0, (1 - (buD.diff / buD.onhand)) * 100) : (buD.diff === 0 ? 100 : 0);
                    }
                    data.push(v !== null ? parseFloat(v.toFixed(2)) : null);
                }
            });
            inventoryChartInstance.data.labels = labels;
            inventoryChartInstance.data.datasets[0].data = data;
            inventoryChartInstance.update();
        }

        const tableEl = document.getElementById('inv-detail-table');
        if (tableEl) {
            const tableCardHeader = tableEl.closest('.data-card')?.querySelector('.card-header h3');
            if (tableCardHeader) tableCardHeader.innerText = '% STOCK ACCURACY BY SKU LEVEL (TARGET 99.00%)';

            tableEl.parentElement.style.display = 'block';
            tableEl.parentElement.style.maxWidth = '100%';
            tableEl.parentElement.style.overflowX = 'auto';
            tableEl.parentElement.style.width = '100%';

            let thead = `<thead><tr>
                <th class="role-cell" style="text-align:center; position:sticky; top:0; left:0; z-index:20; background:var(--bg-card); min-width: 60px; white-space:nowrap; border-right: 1px solid var(--border-color); padding: 8px 4px; font-size: 10px;">Month</th>`;
            
            sortedBUs.forEach(bu => {
                thead += `<th class="aff-header" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); min-width: 45px; white-space:nowrap; padding: 8px 4px; font-size: 10px;">${bu}</th>`;
            });
            
            thead += `<th class="total-cell" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); min-width: 60px; white-space:nowrap; padding: 8px 4px; font-size: 10px;">% Overall</th></tr></thead>`;
            
            let tbody = "<tbody>";

            if (validData.length === 0) {
                tbody += `<tr><td colspan="${sortedBUs.length + 2}" class="text-center" style="color:var(--text-muted); padding:20px; font-size: 10px;">ไม่มีข้อมูล</td></tr>`;
            } else {
                let tableItems = validData.slice().reverse(); 
                tableItems.forEach(item => {
                    let pctOverall = item.overallPct;
                    let pctPill = pctOverall !== null 
                        ? `<span style="display:inline-block; background:${pctOverall>=99?'#dcfce7':'#fee2e2'}; color:${pctOverall>=99?'#166534':'#991b1b'}; padding:2px 6px; border-radius:10px; font-size:10px; font-weight:600;">${pctOverall.toFixed(2)}%</span>`
                        : `<span style="color:var(--text-muted); font-size:10px;">-</span>`;

                    let tr = `<tr><td class="role-cell" style="text-align:center; position:sticky; left:0; z-index:10; background:var(--bg-card); border-right: 1px solid var(--border-color); white-space:nowrap; font-weight:600; font-size:10px; padding: 8px 4px;">${item.label}</td>`;
                    
                    sortedBUs.forEach(bu => {
                        let buD = item.bu_data[bu];
                        if (!buD || buD.count === 0) {
                            tr += `<td style="text-align:center; color:var(--text-muted); white-space:nowrap; font-size:10px; padding: 8px 4px;">-</td>`;
                        } else {
                            let buPct = buD.onhand > 0 ? Math.max(0, (1 - (buD.diff / buD.onhand)) * 100) : (buD.diff === 0 ? 100 : 0);
                            let buClr = buPct >= 99 ? '#166534' : '#991b1b';
                            let buBg = buPct >= 99 ? 'transparent' : 'rgba(239, 68, 68, 0.05)'; 
                            
                            tr += `<td style="text-align:center; white-space:nowrap; vertical-align:middle; background-color:${buBg}; padding: 8px 4px;">
                                <span style="display:inline-block; color:${buClr}; font-weight:700; font-size:11px;">${buPct.toFixed(2)}%</span>
                            </td>`;
                        }
                    });

                    tr += `<td class="total-cell" style="text-align:center; white-space:nowrap; padding: 8px 4px;">${pctPill}</td></tr>`;
                    tbody += tr;
                });
            }
            tableEl.innerHTML = thead + tbody + "</tbody>";
        }

        if (validData.length > 0) {
            let currM = validData[validData.length - 1];
            let prevM = validData.length > 1 ? validData[validData.length - 2] : null;

            let currPct = currM.overallPct !== null ? currM.overallPct : null;
            let prevPct = prevM && prevM.overallPct !== null ? prevM.overallPct : null;
            let diff = currPct - prevPct;

            const valEl = document.getElementById('inv-val');
            const trendEl = document.getElementById('inv-trend');
            const noteEl = document.getElementById('inv-note');
            const upEl = document.getElementById('inv-update');

            if (valEl) {
                valEl.innerText = currPct !== null ? currPct.toFixed(2) + "%" : "-";
                valEl.style.color = currPct !== null && currPct < 99 ? dangerRed : 'inherit';
            }
            
            if (trendEl && noteEl) {
                if (currPct === null || prevPct === null) {
                    trendEl.className = "badge info"; trendEl.innerText = "-"; noteEl.innerText = "vs prev";
                } else {
                    if (diff > 0) {
                        trendEl.className = "badge up"; trendEl.innerText = `↗ +${diff.toFixed(2)} pp`; noteEl.innerText = `vs ${prevM.label}`;
                    } else if (diff < 0) {
                        trendEl.className = "badge down"; trendEl.innerText = `↘ ${Math.abs(diff).toFixed(2)} pp`; noteEl.innerText = `vs ${prevM.label}`;
                    } else {
                        trendEl.className = "badge info"; trendEl.innerText = `0 pp`; noteEl.innerText = `vs ${prevM.label}`;
                    }
                }
            }
            if (upEl) {
                upEl.innerText = `Updated: ข้อมูลเดือน ${currM.label}`;
            }
        }

        const dailyTableEl = document.getElementById('inv-daily-table');
        if (dailyTableEl && globalData.inventory_daily) {
            let dailyParsed = [];
            let dailyBUs = new Set();
            
            Object.keys(globalData.inventory_daily).forEach(dKey => {
                let dObj = new Date(dKey);
                if (isNaN(dObj.getTime())) return;
                let dData = globalData.inventory_daily[dKey];
                
                let sumOnhand = 0, sumDiff = 0, recordCount = 0;
                Object.keys(dData.bu_data).forEach(bu => {
                    let cleanBu = bu.toUpperCase();
                    if (cleanBu.includes('TOTAL') || cleanBu.includes('OVERALL')) return; 

                    if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) {
                        dailyBUs.add(bu);
                        sumOnhand += dData.bu_data[bu].onhand;
                        sumDiff += dData.bu_data[bu].diff;
                        recordCount += dData.bu_data[bu].count;
                    }
                });

                let overallPct = null;
                if (recordCount > 0) {
                    overallPct = sumOnhand > 0 ? Math.max(0, (1 - (sumDiff / sumOnhand)) * 100) : (sumDiff === 0 ? 100 : 0);
                }

                dailyParsed.push({
                    dateObj: dObj,
                    overallPct: overallPct,
                    bu_data: dData.bu_data,
                    onhand: sumOnhand,
                    diff: sumDiff
                });
            });

            dailyParsed.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()); 
            let validDailyData = dailyParsed.filter(i => i.dateObj.getTime() <= targetTimestamp).slice(0, 14); 
            let sortedDailyBUs = Array.from(dailyBUs).sort();

            let thead = `<thead><tr>
                <th class="role-cell" style="text-align:center; position:sticky; top:0; left:0; z-index:20; background:var(--bg-card); min-width: 60px; white-space:nowrap; border-right: 1px solid var(--border-color); padding: 8px 4px; font-size: 10px;">Date</th>`;
            
            sortedDailyBUs.forEach(bu => {
                thead += `<th class="aff-header" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); min-width: 45px; white-space:nowrap; padding: 8px 4px; font-size: 10px;">${bu}</th>`;
            });
            
            thead += `<th class="total-cell" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); min-width: 60px; white-space:nowrap; padding: 8px 4px; font-size: 10px;">% Overall</th></tr></thead>`;
            
            let tbody = "<tbody>";
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            
            if (validDailyData.length === 0) {
                tbody += `<tr><td colspan="${sortedDailyBUs.length + 2}" class="text-center" style="color:var(--text-muted); padding:20px; font-size: 10px;">ไม่มีข้อมูลรายวัน</td></tr>`;
            } else {
                validDailyData.forEach(item => {
                    let pctOverall = item.overallPct;
                    let pctPill = pctOverall !== null 
                        ? `<span style="display:inline-block; background:${pctOverall>=99?'#dcfce7':'#fee2e2'}; color:${pctOverall>=99?'#166534':'#991b1b'}; padding:2px 6px; border-radius:10px; font-size:10px; font-weight:600;">${pctOverall.toFixed(2)}%</span>`
                        : `<span style="color:var(--text-muted); font-size:10px;">-</span>`;

                    let dStr = String(item.dateObj.getDate()).padStart(2, '0') + " " + monthNames[item.dateObj.getMonth()];
                    let tr = `<tr><td class="role-cell" style="text-align:center; position:sticky; left:0; z-index:10; background:var(--bg-card); border-right: 1px solid var(--border-color); white-space:nowrap; font-weight:600; font-size:10px; padding: 8px 4px;">${dStr}</td>`;
                    
                    sortedDailyBUs.forEach(bu => {
                        let buD = item.bu_data[bu];
                        if (!buD || buD.count === 0) {
                            tr += `<td style="text-align:center; color:var(--text-muted); white-space:nowrap; font-size:10px; padding: 8px 4px;">-</td>`;
                        } else {
                            let buPct = buD.onhand > 0 ? Math.max(0, (1 - (buD.diff / buD.onhand)) * 100) : (buD.diff === 0 ? 100 : 0);
                            let buClr = buPct >= 99 ? '#166534' : '#991b1b';
                            let buBg = buPct >= 99 ? 'transparent' : 'rgba(239, 68, 68, 0.05)'; 
                            
                            tr += `<td style="text-align:center; white-space:nowrap; vertical-align:middle; background-color:${buBg}; padding: 8px 4px;" title="💡 OnHand: ${fmtN(buD.onhand)} | Diff: ${fmtN(buD.diff)}">
                                <span style="display:inline-block; color:${buClr}; font-weight:700; font-size:11px; cursor:help; border-bottom: 1px dashed ${buClr};">${buPct.toFixed(2)}%</span>
                            </td>`;
                        }
                    });

                    tr += `<td class="total-cell" style="text-align:center; white-space:nowrap; padding: 8px 4px;" title="💡 Total OnHand: ${fmtN(item.onhand)} | Total Diff: ${fmtN(item.diff)}">${pctPill}</td></tr>`;
                    tbody += tr;
                });
            }
            dailyTableEl.innerHTML = thead + tbody + "</tbody>";
        }
    } catch (e) {
        console.error("Inventory Render Error:", e);
    }
}

function renderTransportSection() {
    try {
        if (!globalData.transport) return;
        if(Object.keys(globalData.transport).length === 0) return;
        const transData = globalData.transport;
        const dpVal = document.getElementById('date-picker')?.value || new Date().toISOString().split('T')[0];
        const targetTimestamp = new Date(dpVal).setHours(23, 59, 59, 999);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        const getDisplayDate = (d) => `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
        
        let parsedData = [];
        let allBUs = new Set();
        
        Object.keys(transData).forEach(dKey => {
            let dObj = new Date(dKey);
            if (isNaN(dObj.getTime())) return;
            
            let dayData = transData[dKey];
            let sumTot = 0, sumSucc = 0;
            
            Object.keys(dayData.bu_data).forEach(bu => {
                let cleanBu = bu.toUpperCase();
                if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) {
                    allBUs.add(bu);
                    sumTot += dayData.bu_data[bu].total;
                    sumSucc += dayData.bu_data[bu].success;
                }
            });
            
            let pct = sumTot > 0 ? (sumSucc / sumTot) * 100 : null;
            parsedData.push({ 
                dateObj: dObj, 
                total: sumTot, 
                success: sumSucc, 
                pct: pct, 
                bu_data: dayData.bu_data,
                carrier_data: dayData.carrier_data,
                dateStr: dKey
            });
        });
        
        parsedData.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
        let validData = parsedData.filter(i => i.dateObj.getTime() <= targetTimestamp);
        let sortedBUs = Array.from(allBUs).sort();

        const carrierTableEl = document.getElementById('transport-carrier-table');
        const carrierTimeEl = document.getElementById('carrier-update-time');
        
        if (carrierTableEl && validData.length > 0) {
            let latestDay = validData[0]; 
            if(carrierTimeEl) carrierTimeEl.innerText = `ข้อมูลของวันที่: ${getDisplayDate(latestDay.dateObj)}`;

            let cData = latestDay.carrier_data || {};
            let carriers = Object.keys(cData).sort();
            
            let allStatuses = new Set();
            carriers.forEach(c => {
                Object.keys(cData[c]).forEach(s => allStatuses.add(s));
            });
            let sortedStatuses = Array.from(allStatuses).sort();

            if (carriers.length === 0 || sortedStatuses.length === 0) {
                carrierTableEl.innerHTML = `<tr><td class="text-center" style="padding:20px; color:var(--text-muted); font-size: 10px;">ไม่มีข้อมูลสถานะขนส่ง</td></tr>`;
            } else {
                let thead = `<thead><tr>
                    <th class="role-cell" style="text-align:left; position:sticky; top:0; left:0; z-index:20; background:var(--bg-card); min-width: 100px; white-space:nowrap; border-right: 1px solid var(--border-color); padding: 10px; font-size: 11px;">Carrier (บริษัทขนส่ง)</th>`;
                
                sortedStatuses.forEach(s => {
                    let sColor = "var(--text-main)";
                    if(s.includes("สำเร็จ") || s.includes("แล้ว")) sColor = "#166534";
                    else if(s.includes("ไม่") || s.includes("ยกเลิก") || s.includes("fail")) sColor = "#991b1b";
                    else if(s.includes("ตรวจสอบ")) sColor = "#92400e";

                    thead += `<th class="aff-header" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); min-width: 80px; white-space:nowrap; padding: 10px; font-size: 11px; color: ${sColor};">${s}</th>`;
                });
                thead += `<th class="total-cell" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); min-width: 60px; white-space:nowrap; padding: 10px; font-size: 11px;">Total</th></tr></thead>`;

                let tbody = "<tbody>";
                let grandTotals = { total: 0 };
                sortedStatuses.forEach(s => grandTotals[s] = 0);

                carriers.forEach(c => {
                    let rowTotal = 0;
                    let tr = `<tr><td class="role-cell" style="text-align:left; position:sticky; left:0; z-index:10; background:var(--bg-card); border-right: 1px solid var(--border-color); white-space:nowrap; font-weight:700; font-size:11px; padding: 10px;">${c}</td>`;
                    
                    sortedStatuses.forEach(s => {
                        let count = cData[c][s] || 0;
                        rowTotal += count;
                        grandTotals[s] += count;
                        grandTotals.total += count;

                        let txtColor = count > 0 ? (s.includes("ไม่") || s.includes("ยกเลิก") ? "var(--danger)" : "var(--text-main)") : "var(--text-muted)";
                        let fw = count > 0 ? "700" : "400";
                        tr += `<td style="text-align:center; white-space:nowrap; font-size:11px; padding: 10px; color:${txtColor}; font-weight:${fw};">${count > 0 ? fmtN(count) : '-'}</td>`;
                    });
                    tr += `<td class="total-cell" style="text-align:center; white-space:nowrap; font-size:11px; padding: 10px; font-weight:800; color:var(--accent-primary);">${fmtN(rowTotal)}</td></tr>`;
                    tbody += tr;
                });

                let tfoot = `<tfoot><tr><td class="role-cell" style="text-align:left; position:sticky; bottom:0; left:0; z-index:20; background:var(--bg-card); border-right: 1px solid var(--border-color); white-space:nowrap; font-weight:800; font-size:11px; padding: 10px; border-top: 1px solid var(--border-color);">GRAND TOTAL</td>`;
                sortedStatuses.forEach(s => {
                    tfoot += `<td style="text-align:center; white-space:nowrap; font-size:11px; padding: 10px; font-weight:800; border-top: 1px solid var(--border-color); position:sticky; bottom:0; z-index:10; background:var(--bg-card);">${grandTotals[s] > 0 ? fmtN(grandTotals[s]) : '-'}</td>`;
                });
                tfoot += `<td class="total-cell" style="text-align:center; white-space:nowrap; font-size:12px; padding: 10px; font-weight:800; color:var(--accent-primary); border-top: 1px solid var(--border-color); position:sticky; bottom:0; z-index:10; background:var(--bg-card);">${fmtN(grandTotals.total)}</td></tr></tfoot>`;

                carrierTableEl.innerHTML = thead + tbody + "</tbody>" + tfoot;
            }
        } else if (carrierTableEl) {
            carrierTableEl.innerHTML = `<tr><td class="text-center" style="padding:20px; color:var(--text-muted); font-size: 10px;">ไม่มีข้อมูล</td></tr>`;
        }

        const tableEl = document.getElementById('transport-status-table');
        if (tableEl) {
            let limitData = validData.slice(0, 14);
            let thead = `<thead><tr>
                <th class="role-cell" style="text-align:center; position:sticky; top:0; left:0; z-index:20; background:var(--bg-card); min-width: 60px; white-space:nowrap; border-right: 1px solid var(--border-color); padding: 8px 4px; font-size: 10px;">Date</th>`;
            
            sortedBUs.forEach(bu => {
                thead += `<th class="aff-header" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); min-width: 55px; white-space:nowrap; padding: 8px 4px; font-size: 10px;">${bu}</th>`;
            });
            
            thead += `<th class="total-cell" style="text-align:center; position:sticky; top:0; z-index:10; background:var(--bg-card); min-width: 60px; white-space:nowrap; padding: 8px 4px; font-size: 10px;">% Success</th></tr></thead>`;
            
            let tbody = "<tbody>";
            
            if (limitData.length === 0) {
                tbody += `<tr><td colspan="${sortedBUs.length + 2}" class="text-center" style="color:var(--text-muted); padding:20px; font-size: 10px;">ไม่มีข้อมูลการจัดส่งขนส่ง</td></tr>`;
            } else {
                limitData.forEach(item => {
                    let pctPill = item.pct !== null 
                        ? `<span style="display:inline-block; background:${item.pct>=99?'#dcfce7':(item.pct>=90?'#fef3c7':'#fee2e2')}; color:${item.pct>=99?'#166534':(item.pct>=90?'#92400e':'#991b1b')}; padding:2px 6px; border-radius:10px; font-size:10px; font-weight:600;">${item.pct.toFixed(2)}%</span>`
                        : `<span style="color:var(--text-muted); font-size:10px;">-</span>`;

                    let dStr = String(item.dateObj.getDate()).padStart(2, '0') + " " + months[item.dateObj.getMonth()];
                    let tr = `<tr><td class="role-cell" style="text-align:center; position:sticky; left:0; z-index:10; background:var(--bg-card); border-right: 1px solid var(--border-color); white-space:nowrap; font-weight:600; font-size:10px; padding: 8px 4px;">${dStr}</td>`;
                    
                    sortedBUs.forEach(bu => {
                        let buD = item.bu_data[bu];
                        if (!buD || buD.total === 0) {
                            tr += `<td style="text-align:center; color:var(--text-muted); white-space:nowrap; font-size:10px; padding: 8px 4px;">-</td>`;
                        } else {
                            let buPct = buD.total > 0 ? (buD.success / buD.total) * 100 : 0;
                            let buClr = buPct >= 99 ? '#166534' : (buPct >= 90 ? '#92400e' : '#991b1b');
                            
                            tr += `<td style="text-align:center; white-space:nowrap; vertical-align:middle; padding: 8px 4px;">
                                <span style="display:block; color:${buClr}; font-weight:700; font-size:11px;">${buPct.toFixed(1)}%</span>
                                <span style="font-size:8px; color:var(--text-muted);">${fmtN(buD.success)}/${fmtN(buD.total)}</span>
                            </td>`;
                        }
                    });

                    tr += `<td class="total-cell" style="text-align:center; white-space:nowrap; padding: 8px 4px;" title="💡 Total Success: ${fmtN(item.success)} | Total Orders: ${fmtN(item.total)}">${pctPill}</td></tr>`;
                    tbody += tr;
                });
            }
            tableEl.innerHTML = thead + tbody + "</tbody>";
        }
    } catch (e) { console.error("Transport Render Error:", e); }
}

// ==========================================
// 🌟 หมวดที่ 6: Productivity UI 🌟
// ==========================================
function renderProductivitySection() {
    try {
        let pUsers = globalData.productivity || {};
        let pAreas = globalData.prod_area || {};
        let uMap = globalData.prod_users_map || {};

        if (Object.keys(pUsers).length === 0) {
            let msg = `<tr><td colspan="100%" class="text-center" style="padding:30px; color:var(--text-muted);">ไม่มีข้อมูล Productivity ในระบบ</td></tr>`;
            if(document.getElementById('prod-area-table')) document.getElementById('prod-area-table').innerHTML = msg;
            if(document.getElementById('prod-user-table')) document.getElementById('prod-user-table').innerHTML = msg;
            if(document.getElementById('prod-overall-table')) document.getElementById('prod-overall-table').innerHTML = msg;
            if(document.getElementById('prod-summary-box')) document.getElementById('prod-summary-box').innerHTML = `💡 ไม่พบข้อมูลการทำงานในระบบ`;
            return;
        }

        const dpVal = document.getElementById('date-picker')?.value || new Date().toISOString().split('T')[0];
        const targetTimestamp = new Date(dpVal).setHours(23, 59, 59, 999);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        let areaFilterEl = document.getElementById('prod-area-filter');
        let selectedArea = areaFilterEl ? areaFilterEl.value : 'ALL';
        let period = document.getElementById('prod-period-filter')?.value || 'Daily';

        let grouped = {};
        let allAreasList = new Set();
        let activeDates = new Set([...Object.keys(pUsers), ...Object.keys(pAreas)]);

        let validDates = Array.from(activeDates)
            .map(dKey => {
                let d = new Date(dKey);
                return { key: dKey, time: d.getTime(), dObj: d };
            })
            .filter(item => !isNaN(item.time) && item.time <= targetTimestamp)
            .sort((a,b) => a.time - b.time);

        validDates.forEach(item => {
            let dKey = item.key;
            let dObj = item.dObj;
            
            let mStr = months[dObj.getMonth()];
            let dStr = String(dObj.getDate()).padStart(2, '0');
            let yStr = dObj.getFullYear();
            let groupKey = period === 'Daily' ? `${dStr} ${mStr}` : `${mStr} ${yStr}`;
            
            if (!grouped[groupKey]) {
                grouped[groupKey] = { label: groupKey, time: item.time, user_picks: 0, user_hours: 0, areas: {}, users: {}, activePickers: new Set() };
            }

            if (pAreas[dKey]) {
                Object.keys(pAreas[dKey].areas).forEach(aName => {
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
                
                Object.keys(pUsers[dKey].users).forEach(uID => {
                    let uData = pUsers[dKey].users[uID];
                    let userArea = uData.area || "N/A";
                    if (userArea !== "N/A" && userArea !== "") allAreasList.add(userArea);
                    
                    grouped[groupKey].activePickers.add(uID);
                    
                    if (!grouped[groupKey].users[uID]) {
                        grouped[groupKey].users[uID] = { picks: 0, hours: 0, team: uData.team, zone: uData.zone, area: userArea };
                    }
                    grouped[groupKey].users[uID].picks += uData.qty;
                    grouped[groupKey].users[uID].hours += (uData.time / 3600);
                });
            }
        });

        if (areaFilterEl && areaFilterEl.options.length <= 1) {
            Array.from(allAreasList).sort().forEach(a => {
                areaFilterEl.appendChild(new Option(a, a));
            });
        }

        let sortedGroups = Object.values(grouped).sort((a,b) => a.time - b.time);
        if(sortedGroups.length === 0) return;

        let chartSlice = period === 'Daily' ? sortedGroups.slice(-14) : sortedGroups;
        let latest = sortedGroups[sortedGroups.length - 1];
        let currentTarget = getTarget(selectedArea);

        if (productivityChartInstance) {
            let labels = [], dataActual = [], dataBackground = [], dataTarget = [], bgColorsActual = [], bgColorsBg = [], customPicks = [];
            let maxUPH = 0;
            
            chartSlice.forEach(g => {
                let uph = 0;
                if (selectedArea === 'ALL') {
                    uph = g.user_hours > 0 ? Math.round(g.user_picks / g.user_hours) : 0;
                } else if (g.areas[selectedArea]) {
                    uph = g.areas[selectedArea].hours > 0 ? Math.round(g.areas[selectedArea].picks / g.areas[selectedArea].hours) : 0;
                }
                if (uph > maxUPH) maxUPH = uph;
            });
            let barCeiling = Math.max(maxUPH, currentTarget) + 30; 
            
            chartSlice.forEach(g => {
                labels.push(g.label);
                let uph = 0, picks = 0;
                
                if (selectedArea === 'ALL') {
                    uph = g.user_hours > 0 ? Math.round(g.user_picks / g.user_hours) : 0;
                    picks = Math.round(g.user_picks);
                } else if (g.areas[selectedArea]) {
                    uph = g.areas[selectedArea].hours > 0 ? Math.round(g.areas[selectedArea].picks / g.areas[selectedArea].hours) : 0;
                    picks = Math.round(g.areas[selectedArea].picks);
                }
                
                dataActual.push(uph); dataBackground.push(barCeiling); dataTarget.push(currentTarget); customPicks.push(picks);
                
                if (uph >= currentTarget) { bgColorsActual.push('#10B981'); bgColorsBg.push('rgba(16, 185, 129, 0.15)'); } 
                else { bgColorsActual.push('#EF4444'); bgColorsBg.push('rgba(239, 68, 68, 0.15)'); }
            });

            productivityChartInstance.data.labels = labels;
            if(productivityChartInstance.data.datasets[0]) { productivityChartInstance.data.datasets[0].data = dataBackground; productivityChartInstance.data.datasets[0].backgroundColor = bgColorsBg; }
            if(productivityChartInstance.data.datasets[1]) { productivityChartInstance.data.datasets[1].data = dataActual; productivityChartInstance.data.datasets[1].backgroundColor = bgColorsActual; productivityChartInstance.data.datasets[1].customPicks = customPicks; productivityChartInstance.data.datasets[1].label = `Actual UPH (${selectedArea})`; }
            if(productivityChartInstance.data.datasets[2]) { productivityChartInstance.data.datasets[2].data = dataTarget; }
            productivityChartInstance.update();
        }

        let baseSalary = parseFloat(document.getElementById('cost-salary')?.value || 15000);
        let workDays = parseFloat(document.getElementById('cost-days')?.value || 26);
        let hourlyRate = workDays > 0 ? (baseSalary / workDays / 8) : 0;

        const summaryEl = document.getElementById('prod-summary-box');
        if (summaryEl) {
            let uph = 0, pks = 0, hrs = 0;
            if (selectedArea === 'ALL') {
                uph = latest.user_hours > 0 ? Math.round(latest.user_picks / latest.user_hours) : 0;
                pks = latest.user_picks; hrs = latest.user_hours;
            } else if (latest.areas[selectedArea]) {
                uph = latest.areas[selectedArea].hours > 0 ? Math.round(latest.areas[selectedArea].picks / latest.areas[selectedArea].hours) : 0;
                pks = latest.areas[selectedArea].picks; hrs = latest.areas[selectedArea].hours;
            }
            
            let gap = uph - currentTarget;
            let statusHtml = gap >= 0 ? `<span style="color:#10B981; font-weight:700;">(สูงกว่าเป้า +${gap})</span>` : `<span style="color:var(--danger); font-weight:700;">(ต่ำกว่าเป้า ${Math.abs(gap)})</span>`;
            let costPerPick = uph > 0 ? (hourlyRate / uph) : 0;
            
            summaryEl.innerHTML = `💡 <b>ภาพรวมล่าสุด (${latest.label}):</b> ${selectedArea === 'ALL' ? 'ภาพรวมทั้งหมด' : `พื้นที่ ${selectedArea}`} ทำความเร็วเฉลี่ย <b style="color:var(--text-main); font-size:1.1em;">${uph} UPH</b> ${statusHtml} <br><span style="font-size:0.8em; color:var(--text-muted);">(หยิบ ${fmtN(Math.round(pks))} รายการ / ${hrs.toFixed(1)} ชม.)</span> <span style="margin-left:15px; padding-left:15px; border-left:1px solid var(--border-color); color:var(--text-main); font-size: 0.9em;">💰 <b>Cost per Pick: <span style="color:#3B82F6; font-size:1.1em;">${costPerPick.toFixed(2)} ฿</span></b></span>`;
            summaryEl.style.borderLeftColor = uph >= currentTarget ? '#10B981' : '#EF4444';
            summaryEl.style.background = uph >= currentTarget ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.05)';
        }

        const areaTableEl = document.getElementById('prod-area-table');
        if (areaTableEl) {
            let sortedAreas = Object.keys(latest.areas).sort((a, b) => {
                let uphA = latest.areas[a].hours > 0 ? latest.areas[a].picks / latest.areas[a].hours : 0;
                let uphB = latest.areas[b].hours > 0 ? latest.areas[b].picks / latest.areas[b].hours : 0;
                return uphB - uphA;
            });

            let html = `<thead><tr>
                <th style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; text-align:left; border-bottom: 1px solid var(--border-color);">Area Type</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color);">Picks (รายการ)</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color);">Hours (ชม.)</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color);">Actual UPH</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color);">Gap</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color); color:#3B82F6;">Cost/Pick (฿)</th>
            </tr></thead><tbody>`;
            
            if(sortedAreas.length === 0) {
                html += `<tr><td colspan="6" class="text-center" style="padding:20px; color:var(--text-muted); font-size:11px;">ไม่มีข้อมูล Area ในวันที่เลือก</td></tr>`;
            } else {
                sortedAreas.forEach(a => {
                    if(a === "N/A" || a === "") return;
                    let d = latest.areas[a];
                    let uph = d.hours > 0 ? Math.round(d.picks / d.hours) : 0;
                    let trg = getTarget(a);
                    let gap = uph - trg;
                    let cost = uph > 0 ? (hourlyRate / uph) : 0;
                    
                    html += `<tr>
                        <td style="padding:10px 12px; border-bottom: 1px dashed var(--border-color);"><b style="color:var(--text-main); font-size:11px;">${a}</b></td>
                        <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color); font-size:11px; font-weight:600;">${fmtN(Math.round(d.picks))}</td>
                        <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color); font-size:11px; color:var(--text-muted);">${d.hours.toFixed(2)}</td>
                        <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color);"><span class="badge" style="background:${uph>=trg?'#dcfce7':'#fee2e2'}; color:${uph>=trg?'#166534':'#991b1b'}">${uph}</span></td>
                        <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color); font-size:11px; color:${gap>=0?'#10B981':'#EF4444'}"><b>${gap > 0 ? '+'+gap : gap}</b></td>
                        <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color); font-size:11px; font-weight:700; color:#3B82F6;">${cost.toFixed(2)}</td>
                    </tr>`;
                });
            }
            areaTableEl.innerHTML = html + "</tbody>";
            let titleEl = document.getElementById('prod-area-title');
            if(titleEl) titleEl.innerText = `PERFORMANCE BY AREA (${latest.label})`;
        }

        const userTableEl = document.getElementById('prod-user-table');
        if (userTableEl) {
            let users = Object.keys(latest.users).sort((a, b) => {
                let uphA = latest.users[a].hours > 0 ? latest.users[a].picks / latest.users[a].hours : 0;
                let uphB = latest.users[b].hours > 0 ? latest.users[b].picks / latest.users[b].hours : 0;
                return uphB - uphA;
            });

            let html = `<thead><tr>
                <th style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; text-align:left; border-bottom: 1px solid var(--border-color);">Name (ID)</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color);">Zone</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color);">Picks</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color);">Hours</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color);">UPH</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color); color:#3B82F6;">Cost/Pick (฿)</th>
            </tr></thead><tbody>`;
            
            if(users.length === 0) {
                html += `<tr><td colspan="6" class="text-center" style="padding:20px; color:var(--text-muted); font-size:11px;">ไม่มีข้อมูลพนักงาน</td></tr>`;
            } else {
                users.forEach(u => {
                    let d = latest.users[u];
                    let uph = d.hours > 0 ? Math.round(d.picks / d.hours) : 0;
                    let isBulk = d.hours < 0.08 || uph > 600; 
                    let userTrg = getTarget(d.area); 
                    let fullName = uMap[u] || u; 
                    let zoneText = d.zone ? `<span style="color:var(--text-main); font-size:10px; font-weight:600;">${d.zone}</span>` : '<span style="color:var(--text-muted); font-size:10px;">-</span>';
                    let cost = uph > 0 ? (hourlyRate / uph) : 0;
                    
                    html += `<tr style="${isBulk ? 'opacity:0.5' : ''}">
                        <td style="padding:10px 12px; border-bottom: 1px dashed var(--border-color);">
                            <b style="color:var(--text-main); font-size:11px;">${fullName}</b><br>
                            <span style="font-size:9px; color:var(--text-muted);">ID: ${u}</span>
                        </td>
                        <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color);">${zoneText}</td>
                        <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color); font-size:11px; font-weight:600;">${fmtN(Math.round(d.picks))}</td>
                        <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color); font-size:11px; color:var(--text-muted);">${d.hours.toFixed(2)}</td>
                        <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color); font-size:12px;">
                            <b style="color:${uph >= userTrg ? '#10B981' : '#EF4444'}">${isBulk ? '<span style="font-size:9px; color:var(--text-muted);">Bulk/Error</span>' : uph}</b>
                        </td>
                        <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color); font-size:11px; font-weight:700; color:#3B82F6;">${isBulk ? '-' : cost.toFixed(2)}</td>
                    </tr>`;
                });
            }
            userTableEl.innerHTML = html + "</tbody>";
            let titleEl = document.getElementById('prod-user-title');
            if(titleEl) titleEl.innerText = `PRODUCTIVITY BY USER (${latest.label})`;
        }

        const overallTableEl = document.getElementById('prod-overall-table');
        if (overallTableEl) {
            let html = `<thead><tr>
                <th style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; text-align:left; border-bottom: 1px solid var(--border-color);">Date</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color);">Active Pickers</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color);">Total Picks</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color);">Overall UPH</th>
                <th class="text-center" style="position:sticky; top:0; background:var(--bg-card); padding:12px; font-size:11px; border-bottom: 1px solid var(--border-color); color:#3B82F6;">Avg Cost/Pick (฿)</th>
            </tr></thead><tbody>`;
            
            sortedGroups.slice().reverse().forEach(item => {
                let uph = item.user_hours > 0 ? Math.round(item.user_picks / item.user_hours) : 0;
                let trg = getTarget(selectedArea);
                let uphHtml = uph >= trg ? `<b style="color:#10B981;">${uph}</b>` : `<b style="color:#EF4444;">${uph}</b>`;
                let cost = uph > 0 ? (hourlyRate / uph) : 0;
                
                html += `<tr>
                    <td style="padding:10px 12px; border-bottom: 1px dashed var(--border-color);"><b style="font-size:11px;">${item.label}</b></td>
                    <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color);"><span class="badge info" style="font-size:10px;">${item.activePickers.size} คน</span></td>
                    <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color); font-weight:600; font-size:11px;">${fmtN(Math.round(item.user_picks))}</td>
                    <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color); font-size:12px;">${uphHtml}</td>
                    <td class="text-center" style="padding:10px 12px; border-bottom: 1px dashed var(--border-color); font-size:12px; font-weight:700; color:#3B82F6;">${cost.toFixed(2)}</td>
                </tr>`;
            });
            overallTableEl.innerHTML = html + "</tbody>";
        }

    } catch (e) { console.error("Productivity Render Error:", e); }
}

function generateExecutiveAlerts(targetTimestamp, activeWaveKey, waveLate, waveDelay, delayDays, worstBU) {
    const alertBox = document.getElementById('smart-alerts-container');
    if (!alertBox) return;
    
    alertBox.innerHTML = ''; 
    let alerts = [];

    if (waveDelay > 0) {
        let delayText = delayDays > 0 ? `ดีเลย์ค้างข้ามวัน (${delayDays} วัน)` : `ดีเลย์ ${Math.floor(waveDelay/60)} ชม. ${waveDelay%60} นาที`;
        alerts.push({
            type: 'critical',
            text: `[Wave Ops] พบออเดอร์ค้าง ${fmtN(waveLate)} บิล (${delayText}) <b>ช้าสุดที่สาขา ${worstBU}</b> ต้องเร่งจัดการด่วน`
        });
    } else if (waveLate > 0) {
        alerts.push({
            type: 'warning',
            text: `[Wave Ops] มีออเดอร์ทำงานช้ากว่าแผน (Late) ${fmtN(waveLate)} บิล <b>(พบที่ ${worstBU})</b> แต่ยังอยู่ใน SLA`
        });
    }

    if (globalData.workforce) {
        let wfKeys = Object.keys(globalData.workforce).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
        let latestWfKey = wfKeys.find(k => new Date(k).getTime() <= targetTimestamp);
        
        if (latestWfKey) {
            let dayData = globalData.workforce[latestWfKey];
            let absCount = 0; let trgCount = 0;
            
            ["Pick","RT","QC","QA","Grouping","Putaway","Receive"].forEach(role => {
                let trg = dayData.targets?.[role] || 0;
                let act = dayData.roles?.[role] || 0;
                if (window.selectedBUs.includes('ALL')) {
                    trgCount += trg;
                    if (trg > act) absCount += (trg - act);
                }
            });

            if (absCount > 0 && window.selectedBUs.includes('ALL')) {
                let absPct = ((absCount / trgCount) * 100).toFixed(1);
                alerts.push({
                    type: absPct >= 5 ? 'critical' : 'warning',
                    text: `[Workforce] วันนี้กำลังพล Operation ขาด ${absCount} คน (${absPct}% ของแผน) อาจกระทบความเร็วการจัดส่ง`
                });
            }
        }
    }

    if (globalData.inventory) {
        let invKeys = Object.keys(globalData.inventory);
        let lastInvKey = invKeys[invKeys.length - 1]; 
        if (lastInvKey) {
            let mData = globalData.inventory[lastInvKey];
            let sumOnhand = 0, sumDiff = 0;
            let badBUs = [];
            
            Object.keys(mData.bu_data).forEach(bu => {
                if (window.selectedBUs.includes('ALL') || window.selectedBUs.includes(bu)) {
                    sumOnhand += mData.bu_data[bu].onhand;
                    sumDiff += mData.bu_data[bu].diff;
                    if (mData.bu_data[bu].onhand > 0) {
                        let pct = Math.max(0, (1 - (mData.bu_data[bu].diff / mData.bu_data[bu].onhand)) * 100);
                        if (pct < 99) badBUs.push(bu);
                    }
                }
            });
            
            if (sumOnhand > 0) {
                let accPct = Math.max(0, (1 - (sumDiff / sumOnhand)) * 100);
                if (accPct < 99) {
                    let badText = badBUs.length > 0 ? ` (โดยเฉพาะที่ ${badBUs.slice(0,2).join(', ')}${badBUs.length > 2 ? ' และอื่นๆ' : ''})` : '';
                    alerts.push({
                        type: 'critical',
                        text: `[Inventory] ความแม่นยำสต๊อกเดือน ${lastInvKey} ตกเกณฑ์ 99.00% (ทำได้ ${accPct.toFixed(2)}%)${badText}`
                    });
                }
            }
        }
    }

    if (alerts.length === 0) {
        alertBox.innerHTML = `
            <div style="padding:10px 15px; border-radius:6px; background:#dcfce7; color:#166534; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                สถานการณ์ปกติ ไม่พบความเสี่ยงหรือเหตุขัดข้องที่ต้องแจ้งเตือนในขณะนี้
            </div>`;
    } else {
        alerts.forEach(al => {
            let bg, color, icon;
            if (al.type === 'critical') {
                bg = '#fee2e2'; color = '#991b1b';
                icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
            } else {
                bg = '#fef3c7'; color = '#92400e';
                icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
            }
            alertBox.innerHTML += `
                <div style="padding:10px 15px; border-radius:6px; background:${bg}; color:${color}; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px;">
                    ${icon} <span>${al.text}</span>
                </div>`;
        });
    }
}

initDashboard();
setInterval(() => { initDashboard(); }, 5 * 60 * 1000);

function getTarget(areaName) {
    let areaStr = (areaName || "").toString().toLowerCase();
    if (areaStr === 'all') return parseInt(document.getElementById('trg-all')?.value || 150);
    if (areaStr.includes('full')) return parseInt(document.getElementById('trg-full')?.value || 150);
    if (areaStr.includes('half')) return parseInt(document.getElementById('trg-half')?.value || 150);
    if (areaStr.includes('ea')) return parseInt(document.getElementById('trg-ea')?.value || 150);
    return parseInt(document.getElementById('trg-all')?.value || 150);
}

function saveTargets() {
    renderProductivitySection();
}

document.getElementById('prod-area-filter')?.addEventListener('change', renderProductivitySection);
document.getElementById('prod-period-filter')?.addEventListener('change', renderProductivitySection);
