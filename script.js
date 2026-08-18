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

// ชุดสีไล่ระดับสำหรับแท่งกราฟ / โดนัท
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
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;

const fmtN = (v) => (v || 0).toLocaleString();

// Data Label Plugin (โชว์เลขบนแท่ง)
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
        
        // วาดผลรวม (Grand Total) บนกราฟ Stacked Bar
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
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { border: { display: false }, max: 105 } } } 
});

let claimChart2Instance = new Chart(document.getElementById('claimChart2'), { 
    type: 'bar', data: { labels: [], datasets: [ { label: 'มูลค่าเคลม (฿)', data: [], yAxisID: 'y' }, { label: 'จำนวนชิ้น', data: [], type: 'line', yAxisID: 'y1', pointRadius: 4, borderWidth: 2 } ] }, 
    options: { responsive: true, maintainAspectRatio: false, scales: { x: {grid:{display:false}}, y: {position: 'left', grace: '15%'}, y1: {position: 'right', display:false} } }, plugins: [dataLabelPlugin] 
});

let inventoryChartInstance = new Chart(document.getElementById('inventoryChart'), { 
    type: 'line', data: { labels: [], datasets: [{ label: 'Accuracy %', data: [], fill: true }] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { border: { display: false } } } } 
});

let productivityChartInstance = new Chart(document.getElementById('productivityChart'), { 
    type: 'bar', data: { labels: [], datasets: [{type:'bar'}, {type:'bar'}, {type:'line'}] }, 
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { display: false, grace: '25%' } } } 
});

// ==========================================
// DATA FETCHING & PROCESSING (จากโค้ดเดิมของคุณที่ทำงานได้สมบูรณ์)
// ==========================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxB0bNU1P9qrG_6aHoeiKyHMXT0_k76VlL0aq1I9xxHVpPDQK9qcd3FJMip4Jk9o6RY/exec';
let globalData = { workforce:{}, fulfillment:{}, wave_ops:{}, ontime:{}, ontime_hub:{}, ontime_by_aff:{}, claims:{}, inventory:{}, inventory_daily:{}, transport:{}, productivity:{}, prod_area:{}, prod_zone:{}, prod_users_map:{} };
window.selectedBUs = ['ALL'];

const getStandardDate = (rawDate) => {
    if (!rawDate) return "";
    let str = String(rawDate).trim();
    if (str.includes('T')) str = str.split('T')[0];
    let dObj = new Date(str);
    if (!isNaN(dObj.getTime())) return `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;
    return str;
};

// ... โค้ดสร้าง MultiSelect เหมือนเดิม (ขอข้ามส่วนที่ซ้ำเพื่อให้เห็นภาพรวมที่เปลี่ยนไป) ...
let ontimeAffMS = null, claimBuMS = null, invLocTypeMS = null;
function createMultiSelect(mountEl, opts) { /* ... โค้ดเดิมที่สร้าง dropdown ... */ return { el: mountEl, getSelected: () => ['ALL'], setOptions: () => {} }; }

// นี่คือฟังก์ชันหลักที่ถูกเรียกเมื่อเปิดหน้า
async function initDashboard() {
    document.getElementById('global-loader').style.display = 'flex';
    const dp = document.getElementById('date-picker');
    if (!dp.value) {
        let today = new Date();
        dp.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    }
    
    dp.addEventListener('change', () => {
        refreshAllSections();
        initFulfillmentRealtime(); // วิ่งไปดึง BigQuery ใหม่อีกรอบ
    });

    try {
        // 1. ดึงข้อมูลจาก GAS
        const response = await fetch(`${GAS_URL}?section=all`);
        const result = await response.json();
        if (result.status === "success") {
            globalData = result.data;
        }
    } catch (e) { console.error("GAS Load Error:", e); }

    // 2. ดึงข้อมูล BigQuery สำหรับ FFM & Wave (ตามโค้ดของคุณ)
    await initFulfillmentRealtime();

    // 3. เริ่มเอาข้อมูลไปแปะหน้าจอ
    refreshAllSections();
    document.getElementById('global-loader').style.display = 'none';
}

function refreshAllSections() {
    let dpVal = document.getElementById('date-picker').value;
    updateTransportUI(dpVal); 
    // อัปเดตส่วนอื่นๆ ที่รับข้อมูลจาก GAS ล้วนๆ
    updateWorkforceUI(dpVal);
    updateOnTimeUI(dpVal);
    updateClaimUI(dpVal);
    updateInventoryUI(dpVal);
}

// ------------------------------------------------------------
// 🚚 1. TRANSPORT PERFORMANCE SECTION 
// ------------------------------------------------------------
function updateTransportUI(dateStr) {
    if (!globalData.transport || Object.keys(globalData.transport).length === 0) return;
    const targetTime = new Date(dateStr).setHours(23,59,59,999);
    
    // หาข้อมูลวันล่าสุดที่ไม่เกินวันที่เลือก
    let availableDates = Object.keys(globalData.transport).filter(k => {
        let d = new Date(getStandardDate(k)).getTime();
        return !isNaN(d) && d <= targetTime;
    }).sort((a,b) => new Date(getStandardDate(b)) - new Date(getStandardDate(a)));

    let tbody = document.querySelector('#new-transport-table tbody');

    if (availableDates.length === 0) {
        document.getElementById('tp-kpi-total').innerText = "0";
        document.getElementById('tp-kpi-success').innerText = "0";
        document.getElementById('tp-kpi-sla').innerText = "0";
        document.getElementById('tp-kpi-cost').innerText = "0";
        if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:20px;">ไม่พบข้อมูลขนส่งในวันที่เลือก</td></tr>`;
        return;
    }

    let todayKey = availableDates[0];
    let data = globalData.transport[todayKey];
    
    let dObj = new Date(getStandardDate(todayKey));
    let displayDate = `${String(dObj.getDate()).padStart(2,'0')} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dObj.getMonth()]} ${dObj.getFullYear()}`;
    document.getElementById('carrier-update-time').innerText = `อัปเดต: ${displayDate}`;

    // Update 4 Cards
    document.getElementById('tp-kpi-total').innerText = fmtN(data.total_orders);
    document.getElementById('tp-kpi-success').innerText = fmtN(data.success_orders);
    document.getElementById('tp-kpi-sla').innerText = fmtN(data.sla_hit);
    document.getElementById('tp-kpi-cost').innerText = fmtN(data.total_cost);

    // Update Table with Progress Bars
    if(tbody) {
        let html = "";
        let carriers = Object.keys(data.carriers || {}).sort((a,b) => data.carriers[b].total_orders - data.carriers[a].total_orders);
        
        carriers.forEach(c => {
            let cd = data.carriers[c];
            let succPct = cd.total_orders > 0 ? (cd.success_orders / cd.total_orders) * 100 : 0;
            let slaPct = cd.success_orders > 0 ? (cd.sla_hit / cd.success_orders) * 100 : 0;

            let bar = (pct, color) => `
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="flex:1; background:var(--border-color); border-radius:10px; height:8px; overflow:hidden;">
                        <div style="width:${pct}%; background:${color}; height:100%; border-radius:10px;"></div>
                    </div>
                    <span style="font-size:11px; font-weight:700; width:35px; text-align:right;">${pct.toFixed(1)}%</span>
                </div>`;

            html += `<tr>
                <td style="font-weight:700;">${c}</td>
                <td class="text-center font-bold">${fmtN(cd.total_orders)}</td>
                <td>${bar(succPct, '#05CD99')}</td>
                <td>${bar(slaPct, '#3B82F6')}</td>
                <td class="text-center" style="font-weight:700; color:#EE5D50;">${fmtN(cd.total_cost)}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    }
}

// ------------------------------------------------------------
// 📊 2. ฟังก์ชันเดิมของคุณที่จะไปดึง BigQuery (แก้ไขให้สีกราฟเป็น Gradient)
// ------------------------------------------------------------
async function initFulfillmentRealtime() {
    // ... [โค้ดเดิมของคุณที่ดึง data จาก BigQuery สำหรับ FFM & Wave] ...
    // เนื่องจากส่วนนี้ยาวและคุณมีโค้ดที่ถูกต้องแล้ว ผมจะขอข้ามไปจุดที่ต้องสั่งวาดกราฟเลยนะครับ
    
    // (สมมติว่าคุณคำนวณ chartDataMap และ sortedDates เสร็จแล้ว)
    
    // 🌟 สั่งวาด FFM Bar Chart แบบไล่สี
    if (typeof ffmTrendChartInstance !== 'undefined' && validChartDates.length > 0) {
        let tpDatasets = chartBUsArray.map((bu, i) => {
            return {
                label: bu,
                data: validChartDates.map(dStr => parseFloat(chartDataMap[dStr]?.buReq?.[bu] || 0)), 
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return gradPalettes[i % 6].s;
                    return getGradient(ctx, chartArea, gradPalettes[i % 6].s, gradPalettes[i % 6].e);
                },
                borderRadius: 4
            };
        });
        ffmTrendChartInstance.data.datasets = tpDatasets;
        ffmTrendChartInstance.update();
    }

    // 🌟 สั่งวาด FFM Doughnut Chart แบบไล่สี
    if (typeof ffmVolumeChartInstance !== 'undefined' && validChartDates.length > 0) {
        let targetD = validChartDates[validChartDates.length - 1]; 
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
}

// ------------------------------------------------------------
// 📈 3. อัปเดตสีกราฟส่วนอื่นๆ
// ------------------------------------------------------------
function updateOnTimeUI(dateStr) {
    if(!globalData.ontime) return;
    const targetTimestamp = new Date(dateStr).setHours(23, 59, 59, 999);
    // ... ดึงข้อมูลตามโค้ดเดิมของคุณ ...
    
    // กราฟ On-Time แบบ Line เติมสีใต้กราฟ (Gradient Fill)
    if (ontimeChartInstance) {
        ontimeChartInstance.data.datasets[0] = {
            label: 'On-Time',
            data: [/* ข้อมูลของคุณ */],
            borderColor: '#05CD99',
            backgroundColor: (context) => {
                const {ctx, chartArea} = context.chart;
                if(!chartArea) return 'transparent';
                let gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                gradient.addColorStop(0, 'rgba(5, 205, 153, 0.01)'); // ข้างล่างจางๆ
                gradient.addColorStop(1, 'rgba(5, 205, 153, 0.4)');  // ข้างบนเข้ม
                return gradient;
            },
            fill: true, tension: 0.4, pointRadius: 4
        };
        ontimeChartInstance.update();
    }
}

// ผูกปุ่ม Theme ให้เปลี่ยนสีข้อความกราฟด้วย
themeToggleBtn.addEventListener('click', () => {
    // ...
    Chart.defaults.color = isDark ? '#9CA3AF' : '#6B7280';
    Object.values(Chart.instances).forEach(chart => chart.update());
});

// รันระบบครั้งแรก
initDashboard();
