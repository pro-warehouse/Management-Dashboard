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
        data: { labels: [], datasets: [{ label: 'จำนวนกำลังพล (คน)', data: [], backgroundColor: '#3B82F6', borderRadius: 6 }] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, border: { display: false } } }, layout: { padding: { top: 20 } } }, 
        plugins: [dataLabelPlugin]
    });
}

let ffmTrendChartInstance = null;
const ffmTrendCtx = document.getElementById('ffmTrendChart')?.getContext('2d');
if (ffmTrendCtx) {
    ffmTrendChartInstance = new Chart(ffmTrendCtx, { 
        type: 'line', 
        data: { labels: [], datasets: [{ label: 'Fulfillment %', data: [], borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#FFFFFF', pointBorderColor: '#10B981' }] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { border: { display: false }, beginAtZero: true, max: 100 } } },
        plugins: [lineDataLabelPlugin]
    });
}

let ffmVolumeChartInstance = null;
const ffmVolCtx = document.getElementById('ffmVolumeChart')?.getContext('2d');
if (ffmVolCtx) {
    ffmVolumeChartInstance = new Chart(ffmVolCtx, { 
        type: 'bar', 
        data: { labels: [], datasets: [ { label: 'Completed (เสร็จ)', data: [], backgroundColor: '#10B981', borderRadius: 4 }, { label: 'Pending (ค้าง)', data: [], backgroundColor: '#EF4444', borderRadius: 4 } ] }, 
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, border: { display: false } } }, plugins: { legend: { position: 'top' } } }
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
        data: { labels: [], datasets: [ { label: 'มูลค่าเคลม (฿)', data: [], backgroundColor: '#EF4444', borderRadius: 4, yAxisID: 'y' }, { label: 'จำนวนชิ้น (Pcs)', data: [], borderColor: '#3B82F6', backgroundColor: '#3B82F6', type: 'line', tension: 0.4, yAxisID: 'y1', pointRadius: 2 } ] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins:{legend:{display:false}}, scales: { x: {grid:{display:false}}, y: {position: 'left', beginAtZero: true}, y1: {position: 'right', beginAtZero: true, grid: {display:false}, display: false} }, layout: { padding: { top: 10 } } }, 
        plugins: [dataLabelPlugin] 
    });
}

let claimChart2Instance = null;
const claim2Ctx = document.getElementById('claimChart2')?.getContext('2d');
if (claim2Ctx) {
    claimChart2Instance = new Chart(claim2Ctx, { 
        type: 'bar', 
        data: { labels: [], datasets: [ { label: 'มูลค่าเคลม (฿)', data: [], backgroundColor: '#EF4444', borderRadius: 6, yAxisID: 'y' }, { label: 'จำนวนชิ้น (Pcs)', data: [], borderColor: '#3B82F6', backgroundColor: '#3B82F6', type: 'line', tension: 0.4, yAxisID: 'y1', pointRadius: 4, borderWidth: 2 } ] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins:{ legend:{ display:true, position: 'top', labels: { padding: 20, boxWidth: 12, font: {size: 11} } } }, scales: { x: {grid:{display:false}}, y: {position: 'left', beginAtZero: true, grace: '25%', title: {display: true, text: 'มูลค่ารวม (บาท)', font: {size: 10}}}, y1: {position: 'right', beginAtZero: true, grace: '25%', grid: {display:false}, title: {display: true, text: 'จำนวนสินค้า (ชิ้น)', font: {size: 10}}} }, layout: { padding: { top: 10, left: 10, right: 10 } } }, 
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
        data: { labels: [], datasets: [ { type: 'bar', label: 'Background', data: [], backgroundColor: [], borderRadius: 6, barPercentage: 0.6, categoryPercentage: 0.8, grouped: false }, { type: 'bar', label: 'Actual UPH', data: [], backgroundColor: [], borderRadius: 6, barPercentage: 0.6, categoryPercentage: 0.8, grouped: false }, { type: 'line', label: 'Target Line', data: [], borderColor: '#F59E0B', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, fill: false } ] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, stacked: false }, y: { border: { display: false }, display: false, beginAtZero: true, grace: '25%' } }, layout: { padding: { top: 30 } } }, 
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
                                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = 'bold 11px Inter';
                                ctx.fillText(uphVal, bar.x, bar.y - 14);
                                let displayPicks = picksVal >= 10000 ? (picksVal / 1000).toFixed(1) + 'k' : fmtN(picksVal);
                                ctx.fillStyle = '#6B7280'; ctx.font = 'normal 9px Inter';
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

let globalData = { workforce:{}, fulfillment:{}, wave_ops:{}, ontime:{}, claims:{}, inventory:{}, transport:{}, productivity:{}, prod_area:{}, prod_users_map:{} };
let isFirstLoad = true;

window.selectedBUs = ['ALL'];
window.locFilters = { bu: ['ALL'], type: ['ALL'], zone: ['ALL'] };

function toggleLoader(show) {
    const loader = document.getElementById('global-loader') || document.getElementById('loader') || document.querySelector('.loader');
    if(loader) loader.style.display = show ? 'flex' : 'none';
}

const standardizeBU = (bu) => {
    let b = (bu || '').toString().trim().toUpperCase();
    if (b.includes('MART')) return 'DM02';
    if (b.includes('PUN') || b.includes('PUNTHAI')) return 'DP02';
    if (b.includes('GFA') || b.includes('COFFEE')) return 'DG02';
    if (b.includes('LUBE')) return '1115';
    return b;
};

// ========================================================
// 🌟 FULFILLMENT DATA BINDING (SINGLE DETAILED TABLE) 🌟
// ========================================================
async function initFulfillmentRealtime() {
    let wrapperEl = document.getElementById('fulfillment-v3-wrapper');
    if (!wrapperEl) {
        const tableEl = document.getElementById('ffm-detail-table');
        if (!tableEl) return;
        const targetCard = tableEl.closest('.data-card') || tableEl.parentElement;
        
        wrapperEl = document.createElement('div');
        wrapperEl.id = 'fulfillment-v3-wrapper';
        targetCard.parentNode.insertBefore(wrapperEl, targetCard);
        targetCard.remove();
    }

    const API_URL = "https://dc-ordermonitoring-backend.onrender.com/api/run";
    console.log("🚀 กำลังดึงข้อมูลจาก BigQuery มาแสดงเป็น 1 ตารางรวม...");
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fn: 'apiGetDashboardSummary', args: ["", ""] })
        });

        const result = await response.json();
        if (!result.success || !result.data) throw new Error("Failed to fetch from BigQuery");

        let dbData = result.data; 
        
        // 🔄 เรียงวันที่จากใหม่ไปเก่า (มากไปน้อย)
        dbData.sort((a, b) => new Date(b.date) - new Date(a.date));

        let htmlTable = `<div class="data-card" style="overflow-x: auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 8px;">
            <div class="card-header" style="padding: 15px; border-bottom: 1px solid var(--border-color);"><h3 style="font-size:14px; font-weight:700; color:var(--text-main); margin:0;">📋 DAILY FULFILLMENT MATRIX RECORD</h3></div>
            <table class="data-table" style="width:100%; border-collapse:collapse; font-size:11px; text-align:right;">
            <thead>
                <tr>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center; position:sticky; left:0; z-index:20;">Date</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">Owner</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">Orders</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">Req</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">ETA</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">Ship</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">Est.Short</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">Act.Short</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">Ord.SLA</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">DC SLA</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">FFM%</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">Pcs/Pick</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">Pcs/Ord</th>
                    <th style="padding:8px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center;">Pallets</th>
                </tr>
            </thead><tbody>`;

        let trendLabels = [], trendValues = [];
        let buVolumeCompleted = {}, buVolumePending = {};
        let buNamesSet = new Set();
        
        if (dbData.length === 0) {
            htmlTable += `<tr><td colspan="14" class="text-center" style="padding:30px;">ไม่มีข้อมูล</td></tr>`;
        } else {
            let chartDataMap = {};
            
            // 📝 วนลูปวาดตารางและคำนวณข้อมูล
            dbData.forEach(dayRow => {
                const dateStr = dayRow.date; 
                let dObj = new Date(dateStr);
                let displayDate = isNaN(dObj) ? dateStr : `${dObj.getDate()}/${dObj.getMonth()+1}/${dObj.getFullYear()}`;
                
                let ownerData = {};
                try { ownerData = JSON.parse(dayRow.ownerJson || '{}'); } catch(e) {}
                
                let sortedOwners = Object.keys(ownerData).filter(o => o !== 'UNKNOWN' && o !== '').sort();

                sortedOwners.forEach(bu => {
                    if (window.selectedBUs && !window.selectedBUs.includes('ALL') && !window.selectedBUs.includes(bu)) return;

                    buNamesSet.add(bu);
                    const item = ownerData[bu];
                    
                    const ordTotal = parseFloat(item.ordTotal || 0);
                    const ordFull = parseFloat(item.ordFull || 0);
                    const req = parseFloat(item.req || 0);
                    const alloc = parseFloat(item.alloc || 0);
                    const ship = parseFloat(item.ship || 0);
                    const actShort = parseFloat(item.actShort || 0);
                    const pu = parseFloat(item.pu || 0);
                    const plt = parseFloat(item.plt || 0);

                    const estShort = Math.max(0, req - alloc);

                    // การคำนวณสัดส่วนต่างๆ (SLA / FFM / Averages)
                    const ordSLA = ordTotal > 0 ? (ordFull / ordTotal) : null;
                    const dcSLA = alloc > 0 ? (ship / alloc) : null;
                    const ffm = req > 0 ? (ship / req) : null;
                    const pcsPick = pu > 0 ? (req / pu) : null;
                    const pcsOrd = ordTotal > 0 ? (req / ordTotal) : null;

                    // ฟังก์ชันตกแต่งเปอร์เซ็นต์สีเขียวเหลืองแดง
                    const colorPct = (v) => {
                        if (v === null || v === undefined) return '-';
                        if (v >= 0.99) return `<span style="color:#10B981; font-weight:600;">${(v*100).toFixed(1)}%</span>`;
                        if (v >= 0.95) return `<span style="color:#F59E0B; font-weight:600;">${(v*100).toFixed(1)}%</span>`;
                        return `<span style="color:#EF4444; font-weight:600;">${(v*100).toFixed(1)}%</span>`;
                    };

                    htmlTable += `<tr style="border-bottom: 1px solid var(--border-color); cursor: pointer;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                        <td style="padding:6px; text-align:center; position:sticky; left:0; background:var(--bg-card); border:1px solid var(--border-color);">${displayDate}</td>
                        <td style="padding:6px; text-align:center; border:1px solid var(--border-color); font-weight:600; color:var(--text-main);">${bu}</td>
                        <td style="padding:6px; border:1px solid var(--border-color);">${ordTotal > 0 ? fmtN(ordTotal) : 0}</td>
                        <td style="padding:6px; border:1px solid var(--border-color);">${req > 0 ? fmtN(req) : 0}</td>
                        <td style="padding:6px; border:1px solid var(--border-color);">${alloc > 0 ? fmtN(alloc) : 0}</td>
                        <td style="padding:6px; border:1px solid var(--border-color); color:#10B981; font-weight:600;">${ship > 0 ? fmtN(ship) : 0}</td>
                        <td style="padding:6px; border:1px solid var(--border-color);">${estShort > 0 ? fmtN(estShort) : 0}</td>
                        <td style="padding:6px; border:1px solid var(--border-color); color:${actShort > 0 ? '#EF4444' : 'inherit'};">${actShort > 0 ? fmtN(actShort) : 0}</td>
                        <td style="padding:6px; border:1px solid var(--border-color); text-align:center;">${colorPct(ordSLA)}</td>
                        <td style="padding:6px; border:1px solid var(--border-color); text-align:center;">${colorPct(dcSLA)}</td>
                        <td style="padding:6px; border:1px solid var(--border-color); text-align:center;">${colorPct(ffm)}</td>
                        <td style="padding:6px; border:1px solid var(--border-color);">${pcsPick !== null ? pcsPick.toFixed(1) : '-'}</td>
                        <td style="padding:6px; border:1px solid var(--border-color);">${pcsOrd !== null ? pcsOrd.toFixed(1) : '-'}</td>
                        <td style="padding:6px; border:1px solid var(--border-color);">${plt > 0 ? plt.toFixed(1) : '-'}</td>
                    </tr>`;

                    // สำหรับกราฟเส้น (Trend)
                    if (!chartDataMap[dateStr]) chartDataMap[dateStr] = { req:0, ship:0 };
                    chartDataMap[dateStr].req += req;
                    chartDataMap[dateStr].ship += ship;

                    if (!buVolumeCompleted[bu]) { buVolumeCompleted[bu] = 0; buVolumePending[bu] = 0; }
                });
            });

            // ดึงข้อมูลสำหรับกราฟแท่ง (เฉพาะวันล่าสุด)
            const latestDate = Object.keys(chartDataMap).sort((a,b)=>new Date(b)-new Date(a))[0];
            let ownerDataLatest = {};
            try { ownerDataLatest = JSON.parse(dbData.find(r => r.date === latestDate).ownerJson || '{}'); } catch(e) {}
            
            Object.keys(ownerDataLatest).forEach(bu => {
                if (window.selectedBUs && !window.selectedBUs.includes('ALL') && !window.selectedBUs.includes(bu)) return;
                if (bu !== 'UNKNOWN' && bu !== '') {
                    const req = parseFloat(ownerDataLatest[bu].req || 0);
                    const ship = parseFloat(ownerDataLatest[bu].ship || 0);
                    buVolumeCompleted[bu] += ship;
                    buVolumePending[bu] += Math.max(0, req - ship);
                }
            });

            // สร้างข้อมูลให้กราฟเส้น (เรียงย้อน 14 วันล่าสุดจากเก่าไปใหม่ ให้เส้นวิ่งจากซ้ายไปขวา)
            let sortedChartDates = Object.keys(chartDataMap).sort((a,b)=>new Date(a)-new Date(b)).slice(-14);
            sortedChartDates.forEach(dStr => {
                let dObj = new Date(dStr);
                let disp = isNaN(dObj) ? dStr : `${dObj.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dObj.getMonth()]}`;
                trendLabels.push(disp);
                
                let req = chartDataMap[dStr].req;
                let ship = chartDataMap[dStr].ship;
                let pct = req > 0 ? (ship / req) * 100 : 0;
                trendValues.push(parseFloat(pct.toFixed(1)));
            });
        }
        
        htmlTable += "</tbody></table></div>";
        wrapperEl.innerHTML = htmlTable;

        // อัปเดตกราฟเส้น
        if (typeof ffmTrendChartInstance !== 'undefined' && ffmTrendChartInstance) {
            ffmTrendChartInstance.data.labels = trendLabels;
            ffmTrendChartInstance.data.datasets[0].data = trendValues;
            ffmTrendChartInstance.update();
        }

        // อัปเดตกราฟแท่ง
        if (typeof ffmVolumeChartInstance !== 'undefined' && ffmVolumeChartInstance) {
            let buNames = Array.from(buNamesSet).sort();
            let volComp = buNames.map(b => buVolumeCompleted[b] || 0);
            let volPend = buNames.map(b => buVolumePending[b] || 0);

            ffmVolumeChartInstance.data.labels = buNames;
            ffmVolumeChartInstance.data.datasets[0].data = volComp;
            ffmVolumeChartInstance.data.datasets[1].data = volPend;
            ffmVolumeChartInstance.update();
        }

        // อัปเดตการ์ดตัวเลขสรุปด้านบนสุด
        if (trendValues.length > 0) {
            const currentFfmRate = trendValues[trendValues.length - 1];
            const rateEl = document.getElementById('ffm-order-rate');
            if (rateEl) {
                rateEl.innerText = currentFfmRate.toFixed(1) + "%";
                let rateUpdateEl = rateEl.parentElement.nextElementSibling;
                if (rateUpdateEl) rateUpdateEl.innerText = `Updated: วันที่ ${trendLabels[trendLabels.length - 1]}`;
            }

            const ordersEl = document.getElementById('ffm-orders-shipped');
            if (ordersEl) {
                let totalShipToday = Object.values(buVolumeCompleted).reduce((a,b)=>a+b, 0);
                ordersEl.innerText = fmtN(totalShipToday);
                
                let prevDayPct = trendValues.length > 1 ? trendValues[trendValues.length - 2] : 0;
                let diffPct = currentFfmRate - prevDayPct;

                const trendEl = document.getElementById('ffm-orders-trend');
                const trendTextEl = document.getElementById('ffm-orders-note');
                if (trendEl && trendTextEl) {
                    if (diffPct > 0) {
                        trendEl.className = "badge up"; trendEl.innerText = `↗ +${diffPct.toFixed(1)}%`; trendTextEl.innerText = `vs วันก่อนหน้า`;
                    } else if (diffPct < 0) {
                        trendEl.className = "badge down"; trendEl.innerText = `↘ ${Math.abs(diffPct).toFixed(1)}%`; trendTextEl.innerText = `vs วันก่อนหน้า`;
                    } else {
                        trendEl.className = "badge info"; trendEl.innerText = `0%`; trendTextEl.innerText = `ไม่เปลี่ยนแปลง`;
                    }
                }
                let ordersUpdateEl = ordersEl.parentElement.nextElementSibling;
                if (ordersUpdateEl) ordersUpdateEl.innerText = `มิติหน่วยนับ: จำนวนชิ้น (Pieces)`;
            }
        }

    } catch (err) {
        console.error("❌ BigQuery Fetch Block Error:", err);
        wrapperEl.innerHTML = `<div class="data-card" style="padding:25px; text-align:center; color:var(--danger); font-weight:bold;">⚠️ ดึงรายงานจาก BigQuery ไม่สำเร็จ</div>`;
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
            initFulfillmentRealtime(); 
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
    
    await Promise.all(sections.map(s => fetchSection(s)));
    
    // ดึงฐานข้อมูลของจริงเข้าสู่ระบบ 3 ตารางหลัก
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

initDashboard();
setInterval(() => { initDashboard(); }, 5 * 60 * 1000);
