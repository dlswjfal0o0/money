// ── 상수 ──────────────────────────────────────────────
const STORAGE_KEY = 'budget_entries_v1';

const EXPENSE_CATS = [
  '식료품비', '외식비', '화장품+잡화', '생필품',
  '구독', '교통비', '유흥', '선물', '기타 비용'
];
const INCOME_CATS = [
  '아르바이트', '금융/체크할인', '생활비', '구독비', '기타 수입'
];
const EXP_COLORS = [
  '#1D9E75','#D85A30','#7F77DD','#378ADD',
  '#BA7517','#D4537E','#639922','#5DCAA5','#888780'
];
const INC_COLORS = ['#1D9E75','#378ADD','#BA7517','#7F77DD','#888780'];

// ── 상태 ──────────────────────────────────────────────
let entries     = [];
let currentType = 'expense';
let periodMode  = 'week';
let periodOffset = 0;
let customFrom  = '';
let customTo    = '';
let activePage  = 'list';
let statView    = 'expense';
let editingId   = null;

// ── 초기화 ─────────────────────────────────────────────
(function init() {
  loadFromStorage();
  const today = new Date();
  document.getElementById('f-date').value = toYMD(today);
  updateCatOptions();
  updatePeriodLabel();
  renderList();
})();

// ── 저장 / 불러오기 ────────────────────────────────────
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      entries = JSON.parse(raw);
      entries.sort((a, b) => a.datetime.localeCompare(b.datetime));
    }
  } catch (e) {
    console.warn('데이터 불러오기 실패:', e);
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('데이터 저장 실패:', e);
  }
}

// ── 유틸 ──────────────────────────────────────────────
function fmt(n) {
  return '₩' + Math.round(Math.abs(n)).toLocaleString('ko-KR');
}

function toYMD(d) {
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

function fmtDT(dt) {
  const d  = new Date(dt);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h  = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}.${mo}.${da} ${h}:${mi}`;
}

// ── 기간 ──────────────────────────────────────────────
function getPeriodRange() {
  if (periodMode === 'custom' && customFrom && customTo) {
    return { from: customFrom + 'T00:00:00', to: customTo + 'T23:59:59' };
  }
  const now = new Date();
  if (periodMode === 'week') {
    const d   = new Date(now);
    const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - day + periodOffset * 7);
    const mon = new Date(d);
    const sun = new Date(d);
    sun.setDate(mon.getDate() + 6);
    return { from: toYMD(mon) + 'T00:00:00', to: toYMD(sun) + 'T23:59:59' };
  }
  // month
  const m     = now.getMonth() + periodOffset;
  const first = new Date(now.getFullYear(), m, 1);
  const last  = new Date(now.getFullYear(), m + 1, 0);
  return { from: toYMD(first) + 'T00:00:00', to: toYMD(last) + 'T23:59:59' };
}

function getPeriodLabel() {
  if (periodMode === 'custom' && customFrom && customTo) {
    return customFrom.slice(5).replace('-', '/') + ' ~ ' + customTo.slice(5).replace('-', '/');
  }
  const r  = getPeriodRange();
  const fd = new Date(r.from);
  const td = new Date(r.to);
  if (periodMode === 'week') {
    return `${fd.getMonth() + 1}/${fd.getDate()} ~ ${td.getMonth() + 1}/${td.getDate()}`;
  }
  return `${fd.getFullYear()}년 ${fd.getMonth() + 1}월`;
}

function getFiltered() {
  const r = getPeriodRange();
  return entries.filter(e => e.datetime >= r.from && e.datetime <= r.to);
}

function setPeriodMode(mode) {
  periodMode   = mode;
  periodOffset = 0;
  document.querySelectorAll('.pseg-btn').forEach((el, i) => {
    el.classList.toggle('active', ['week', 'month', 'custom'][i] === mode);
  });
  document.getElementById('nav-group').style.display   = mode === 'custom' ? 'none' : 'flex';
  document.getElementById('custom-group').classList.toggle('show', mode === 'custom');
  updatePeriodLabel();
  if (activePage === 'list')  renderList();
  if (activePage === 'stats') renderStats();
}

function navigate(dir) {
  periodOffset += dir;
  updatePeriodLabel();
  if (activePage === 'list')  renderList();
  if (activePage === 'stats') renderStats();
}

function updatePeriodLabel() {
  if (periodMode !== 'custom') {
    document.getElementById('period-label').textContent = getPeriodLabel();
  }
}

function applyCustom() {
  customFrom = document.getElementById('c-from').value;
  customTo   = document.getElementById('c-to').value;
  if (!customFrom || !customTo) { alert('시작일과 종료일을 선택해주세요.'); return; }
  if (customFrom > customTo)    { alert('시작일이 종료일보다 늦습니다.');   return; }
  document.getElementById('period-label').textContent = getPeriodLabel();
  if (activePage === 'list')  renderList();
  if (activePage === 'stats') renderStats();
}

// ── 페이지 전환 ────────────────────────────────────────
function showPage(page) {
  activePage = page;
  ['list', 'add', 'stats'].forEach((p, i) => {
    document.getElementById('page-' + p).classList.toggle('hidden', p !== page);
    document.getElementById('nav-' + p).classList.toggle('active', p === page);
  });
  const titles = { list: '내역', add: editingId ? '항목 수정' : '새 항목 추가', stats: '통계' };
  document.getElementById('page-title').textContent = titles[page];
  document.getElementById('period-bar').style.display = page === 'add' ? 'none' : '';
  if (page === 'list')  renderList();
  if (page === 'stats') renderStats();
}

// ── 폼 ────────────────────────────────────────────────
function updateCatOptions() {
  const sel  = document.getElementById('f-cat');
  const cats = currentType === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const cur  = sel.value;
  sel.innerHTML = cats.map(c =>
    `<option value="${c}"${c === cur ? ' selected' : ''}>${c}</option>`
  ).join('');
}

function setType(type) {
  currentType = type;
  document.getElementById('btn-expense').className = type === 'expense' ? 'type-btn ae' : 'type-btn';
  document.getElementById('btn-income').className  = type === 'income'  ? 'type-btn ai' : 'type-btn';
  updateCatOptions();
}

function toggleCard() {
  const isCard = document.getElementById('f-pay').value === '카드';
  document.getElementById('card-name-wrap').classList.toggle('hidden', !isCard);
}

function resetForm() {
  editingId = null;
  const today = new Date();
  document.getElementById('f-date').value   = toYMD(today);
  document.getElementById('f-time').value   = '12:00';
  document.getElementById('f-amount').value = '';
  document.getElementById('f-memo').value   = '';
  document.getElementById('f-card').value   = '';
  document.getElementById('f-pay').value    = '현금';
  document.getElementById('card-name-wrap').classList.add('hidden');
  document.getElementById('edit-banner').classList.add('hidden');
  document.getElementById('submit-btn').textContent = '추가하기';
  document.getElementById('cancel-btn').classList.add('hidden');
  setType('expense');
}

function editEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;
  editingId   = id;
  currentType = e.type;
  document.getElementById('btn-expense').className = e.type === 'expense' ? 'type-btn ae' : 'type-btn';
  document.getElementById('btn-income').className  = e.type === 'income'  ? 'type-btn ai' : 'type-btn';
  updateCatOptions();
  document.getElementById('f-date').value   = e.datetime.slice(0, 10);
  document.getElementById('f-time').value   = e.datetime.slice(11, 16);
  document.getElementById('f-cat').value    = e.cat;
  document.getElementById('f-amount').value = e.amount;
  document.getElementById('f-pay').value    = e.pay;
  document.getElementById('f-card').value   = e.card || '';
  document.getElementById('f-memo').value   = e.memo || '';
  document.getElementById('card-name-wrap').classList.toggle('hidden', e.pay !== '카드');
  document.getElementById('edit-banner').classList.remove('hidden');
  document.getElementById('submit-btn').textContent = '수정 완료';
  document.getElementById('cancel-btn').classList.remove('hidden');
  showPage('add');
}

function cancelEdit() {
  resetForm();
  showPage('list');
}

function submitEntry() {
  const date   = document.getElementById('f-date').value;
  const time   = document.getElementById('f-time').value;
  const amount = parseFloat(document.getElementById('f-amount').value);
  const pay    = document.getElementById('f-pay').value;
  const cat    = document.getElementById('f-cat').value;
  const card   = pay === '카드' ? document.getElementById('f-card').value.trim() : '';
  const memo   = document.getElementById('f-memo').value.trim();

  if (!date || !time || !amount || amount <= 0) {
    alert('날짜, 시간, 금액을 입력해주세요.');
    return;
  }

  if (editingId) {
    const idx = entries.findIndex(x => x.id === editingId);
    if (idx > -1) {
      entries[idx] = { id: editingId, datetime: date + 'T' + time, type: currentType, cat, amount, pay, card, memo };
    }
  } else {
    entries.push({ id: Date.now(), datetime: date + 'T' + time, type: currentType, cat, amount, pay, card, memo });
  }

  entries.sort((a, b) => a.datetime.localeCompare(b.datetime));
  saveToStorage();
  resetForm();
  showPage('list');
}

function deleteEntry(id) {
  if (!confirm('이 항목을 삭제할까요?')) return;
  entries = entries.filter(e => e.id !== id);
  saveToStorage();
  renderList();
}

// ── 내역 렌더링 ────────────────────────────────────────
function renderList() {
  const ft = document.getElementById('fil-type').value;
  const fc = document.getElementById('fil-cat').value;
  const fp = document.getElementById('fil-pay').value;

  let filtered = getFiltered().sort((a, b) => b.datetime.localeCompare(a.datetime));
  if (ft !== 'all') filtered = filtered.filter(e => e.type  === ft);
  if (fc !== 'all') filtered = filtered.filter(e => e.cat   === fc);
  if (fp !== 'all') filtered = filtered.filter(e => e.pay   === fp);

  // 요약 계산
  const all = getFiltered();
  const inc = all.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const exp = all.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  document.getElementById('s-income').textContent  = fmt(inc);
  document.getElementById('s-expense').textContent = fmt(exp);
  const bal = inc - exp;
  const bel = document.getElementById('s-balance');
  bel.textContent  = (bal < 0 ? '−' : '') + fmt(bal);
  bel.style.color  = bal >= 0 ? 'var(--green)' : 'var(--red)';

  const tbody = document.getElementById('entry-list');
  const empty = document.getElementById('empty-msg');

  if (!filtered.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = filtered.map(e => `
    <tr>
      <td style="font-size:12px;white-space:nowrap">${fmtDT(e.datetime)}</td>
      <td><span class="badge b-${e.type}">${e.type === 'income' ? '수입' : '지출'}</span></td>
      <td>${e.cat}</td>
      <td style="color:var(--text-muted);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${e.memo || '—'}
      </td>
      <td style="white-space:nowrap">
        <span class="badge ${e.pay === '현금' ? 'b-cash' : 'b-card'}">${e.pay}</span>
        ${e.card ? `<span class="card-sub">${e.card}</span>` : ''}
      </td>
      <td style="text-align:right" class="amt-${e.type}">
        ${e.type === 'income' ? '+' : '−'}${fmt(e.amount)}
      </td>
      <td style="white-space:nowrap">
        <button class="act-btn edit" onclick="editEntry(${e.id})" title="수정">✏️</button>
        <button class="act-btn del"  onclick="deleteEntry(${e.id})" title="삭제">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// ── 통계 렌더링 ────────────────────────────────────────
function setStatView(v) {
  statView = v;
  document.querySelectorAll('.sseg').forEach((el, i) =>
    el.classList.toggle('active', ['expense', 'income'][i] === v)
  );
  document.getElementById('stat-cat-title').textContent =
    v === 'expense' ? '📊 카테고리별 지출' : '📊 카테고리별 수입';
  document.getElementById('payment-card').classList.toggle('hidden', v === 'income');
  renderStats();
}

function renderStats() {
  const filtered = getFiltered();
  const inc = filtered.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const exp = filtered.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  document.getElementById('st-income').textContent  = fmt(inc);
  document.getElementById('st-expense').textContent = fmt(exp);
  const net = inc - exp;
  const nel = document.getElementById('st-net');
  nel.textContent = (net < 0 ? '−' : '') + fmt(net);
  nel.style.color = net >= 0 ? 'var(--green)' : 'var(--red)';

  // 카테고리 차트
  const isIncome = statView === 'income';
  const cats     = isIncome ? INCOME_CATS  : EXPENSE_CATS;
  const colors   = isIncome ? INC_COLORS   : EXP_COLORS;
  const totals   = {};
  cats.forEach(c => (totals[c] = 0));
  filtered
    .filter(e => e.type === statView)
    .forEach(e => { if (totals[e.cat] !== undefined) totals[e.cat] += e.amount; });

  const maxV  = Math.max(...Object.values(totals), 1);
  const nonZ  = cats.filter(c => totals[c] > 0);
  const chart = document.getElementById('cat-chart');
  const emptyMsg = isIncome ? '이 기간에 수입 내역이 없습니다' : '이 기간에 지출 내역이 없습니다';

  chart.innerHTML = nonZ.length
    ? nonZ.map(c => `
      <div class="cat-row">
        <div class="cat-name">${c}</div>
        <div class="cat-bar-bg">
          <div class="cat-bar" style="width:${(totals[c] / maxV * 100).toFixed(1)}%;background:${colors[cats.indexOf(c)]}"></div>
        </div>
        <div class="cat-val">${fmt(totals[c])}</div>
      </div>`).join('')
    : `<div class="no-data">${emptyMsg}</div>`;

  // 결제 수단 (지출 전용)
  if (statView === 'expense') {
    const cashE  = filtered.filter(e => e.type === 'expense' && e.pay === '현금');
    const cardE  = filtered.filter(e => e.type === 'expense' && e.pay === '카드');
    const cashT  = cashE.reduce((s, e) => s + e.amount, 0);
    const cardM  = {};
    cardE.forEach(e => { const k = e.card || '카드'; cardM[k] = (cardM[k] || 0) + e.amount; });

    document.getElementById('pay-cash').innerHTML = cashT > 0
      ? `<div class="pay-row"><span>합계</span><span class="pay-row-val">${fmt(cashT)}</span></div>`
      : '<span class="no-data">내역 없음</span>';

    const cks = Object.keys(cardM);
    if (!cks.length) {
      document.getElementById('pay-card').innerHTML = '<span class="no-data">내역 없음</span>';
    } else {
      const tot = cks.reduce((s, k) => s + cardM[k], 0);
      document.getElementById('pay-card').innerHTML =
        cks.map(k => `<div class="pay-row"><span>${k}</span><span class="pay-row-val">${fmt(cardM[k])}</span></div>`).join('') +
        (cks.length > 1 ? `<div class="pay-row pay-total"><span>합계</span><span class="pay-row-val">${fmt(tot)}</span></div>` : '');
    }
  }
}
