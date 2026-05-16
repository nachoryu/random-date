'use strict';

// ── DATA ──────────────────────────────────────────────────────────────────────
const CATEGORIES = {
  subway: {
    id: 'subway',
    emoji: '🚇',
    name: '위치',
    slots: [
      { label: '호선', items: ['1호선','2호선','3호선','4호선','5호선','6호선','7호선','8호선'] },
      { label: '역 번호', items: Array.from({length:30}, (_,i) => `${i+1}번째 역`) },
      { label: '방향', items: ['왼쪽에서','오른쪽에서'] },
    ],
  },
  meal: {
    id: 'meal',
    emoji: '🍽️',
    name: '식사',
    slots: [
      { label: '메뉴', items: ['떡볶이','돈까스','초밥','마라탕','파스타','피자','라멘','삼겹살','치킨','한식 백반','쌀국수','커리','햄버거','곱창/막창'] },
    ],
  },
  dessert: {
    id: 'dessert',
    emoji: '🍰',
    name: '후식',
    slots: [
      { label: '디저트', items: ['쿠키','케이크','과일','아이스크림','빙수','타르트','마카롱','와플','크레페','도넛','버블티','소프트아이스크림'] },
    ],
  },
  activity: {
    id: 'activity',
    emoji: '🎮',
    name: '놀거리',
    slots: [
      { label: '활동', items: ['가챠 뽑기','영화','한강 피크닉','보드게임 카페','방탈출','노래방','볼링','전시회/박물관','쇼핑','카페 투어','공원 산책','동물원/아쿠아리움'] },
    ],
  },
};

const CONFETTI_COLORS = ['#faff69','#e6eb52','#ffffff','#faff69','#cccccc','#faff69','#e6eb52'];

// ── STATE ─────────────────────────────────────────────────────────────────────
const state = {
  results: { subway: null, meal: null, dessert: null, activity: null },
  modal: { catId: null, spinning: false },
  slotInstances: [],
};

// ── SLOT MACHINE ──────────────────────────────────────────────────────────────
class Slot {
  constructor(items, drumEl) {
    this.items = items;
    this.drum = drumEl;
    this.REPEATS = 6;
    this.H = 56; // --slot-item-h
    this.result = null;
    this._build();
  }

  _build() {
    const list = this.drum.querySelector('.slot-list');
    const all = Array.from({length: this.REPEATS}, () => this.items).flat();
    list.textContent = '';
    all.forEach(t => {
      const div = document.createElement('div');
      div.className = 'slot-item';
      div.textContent = t;
      list.appendChild(div);
    });
    const startIdx = this.items.length;
    this._setY(this._yForIdx(startIdx), false);
  }

  // translateY so that item at `idx` is centred in the 3-item window
  _yForIdx(idx) {
    return -((idx - 1) * this.H);
  }

  _setY(y, animated) {
    const list = this.drum.querySelector('.slot-list');
    if (animated) {
      list.style.transition = 'transform 2.8s cubic-bezier(0.17, 0.67, 0.08, 1)';
    } else {
      list.style.transition = 'none';
    }
    list.style.transform = `translateY(${y}px)`;
  }

  spin() {
    return new Promise(resolve => {
      const resultIdx = Math.floor(Math.random() * this.items.length);
      // land in the 4th repetition (indices: 3*len … 4*len-1)
      const targetIdx = this.items.length * 3 + resultIdx;
      this.result = this.items[resultIdx];

      const list = this.drum.querySelector('.slot-list');
      // force reflow so transition fires even if value same
      list.style.transition = 'none';
      list.getBoundingClientRect();

      this._setY(this._yForIdx(targetIdx), true);

      list.addEventListener('transitionend', () => {
        // snap back to 2nd rep same item so it's re-spinnable
        const snapIdx = this.items.length + resultIdx;
        this._setY(this._yForIdx(snapIdx), false);
        resolve(this.result);
      }, { once: true });
    });
  }
}

// ── DOM BUILDERS ──────────────────────────────────────────────────────────────
function buildSlotDrum() {
  const drum = document.createElement('div');
  drum.className = 'slot-drum';
  const highlight = document.createElement('div');
  highlight.className = 'slot-highlight';
  const list = document.createElement('div');
  list.className = 'slot-list';
  drum.append(highlight, list);
  return drum;
}

function buildCategoryCards() {
  const grid = document.getElementById('cards-grid');
  grid.textContent = '';
  Object.values(CATEGORIES).forEach(cat => {
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.dataset.cat = cat.id;

    const emojiEl = document.createElement('div');
    emojiEl.className = 'cat-emoji';
    emojiEl.textContent = cat.emoji;

    const nameEl = document.createElement('div');
    nameEl.className = 'cat-name';
    nameEl.textContent = cat.name;

    const resultEl = document.createElement('div');
    resultEl.className = 'cat-result empty';
    resultEl.id = `result-${cat.id}`;
    resultEl.textContent = '탭해서 뽑기';

    card.append(emojiEl, nameEl, resultEl);
    card.addEventListener('click', () => openModal(cat.id));
    grid.appendChild(card);
  });
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal(catId) {
  const cat = CATEGORIES[catId];
  state.modal.catId = catId;
  state.modal.spinning = false;
  state.slotInstances = [];

  document.getElementById('modal-title').textContent = `${cat.emoji} ${cat.name}`;
  document.getElementById('spin-result-value').className = 'spin-result-value';
  document.getElementById('spin-result-value').textContent = '';
  document.getElementById('btn-spin').disabled = false;
  document.getElementById('btn-spin').classList.remove('spinning');

  // build slot columns
  const slotsWrap = document.getElementById('slots-wrap');
  slotsWrap.textContent = '';

  cat.slots.forEach(slotDef => {
    const colWrap = document.createElement('div');
    colWrap.className = 'slot-col-wrap';

    const labelEl = document.createElement('div');
    labelEl.className = 'slot-label';
    labelEl.textContent = slotDef.label;

    const drum = buildSlotDrum();
    const instance = new Slot(slotDef.items, drum);
    state.slotInstances.push(instance);

    colWrap.appendChild(labelEl);
    colWrap.appendChild(drum);
    slotsWrap.appendChild(colWrap);
  });

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (state.modal.spinning) return;
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  state.modal.catId = null;
}

// ── SPIN LOGIC ────────────────────────────────────────────────────────────────
async function doSpin() {
  if (state.modal.spinning) return;
  state.modal.spinning = true;

  const btn = document.getElementById('btn-spin');
  btn.disabled = true;
  btn.classList.add('spinning');

  const resultEl = document.getElementById('spin-result-value');
  resultEl.classList.remove('show');
  resultEl.textContent = '';

  // spin all slots, stagger stop times slightly
  const results = await Promise.all(
    state.slotInstances.map((slot, i) =>
      new Promise(resolve => setTimeout(() => slot.spin().then(resolve), i * 300))
    )
  );

  // build combined result text
  const catId = state.modal.catId;
  let combined;
  if (catId === 'subway') {
    combined = `${results[0]} · ${results[1]} · ${results[2]}`;
  } else {
    combined = results[0];
  }

  state.results[catId] = combined;

  // show result
  resultEl.textContent = combined;
  setTimeout(() => resultEl.classList.add('show'), 50);

  // update card
  updateCard(catId, combined);

  confetti();

  btn.disabled = false;
  btn.classList.remove('spinning');
  btn.textContent = '다시 뽑기 🎰';
  state.modal.spinning = false;
}

// ── CARD UPDATE ───────────────────────────────────────────────────────────────
function updateCard(catId, text) {
  const resultEl = document.getElementById(`result-${catId}`);
  const card = document.querySelector(`.cat-card[data-cat="${catId}"]`);
  resultEl.textContent = text;
  resultEl.classList.remove('empty');
  card.classList.add('has-result', 'just-drawn');
  card.addEventListener('animationend', () => card.classList.remove('just-drawn'), { once: true });
}

// ── SPIN ALL ──────────────────────────────────────────────────────────────────
async function spinAll() {
  const btn = document.getElementById('btn-all');
  btn.disabled = true;
  btn.textContent = '뽑는 중...';

  for (const catId of Object.keys(CATEGORIES)) {
    const cat = CATEGORIES[catId];
    const results = cat.slots.map(slotDef => {
      const idx = Math.floor(Math.random() * slotDef.items.length);
      return slotDef.items[idx];
    });
    let combined;
    if (catId === 'subway') {
      combined = `${results[0]} · ${results[1]} · ${results[2]}`;
    } else {
      combined = results[0];
    }
    state.results[catId] = combined;

    const resultEl = document.getElementById(`result-${catId}`);
    resultEl.classList.add('spinning-text');
    await animateCounter(resultEl, cat.slots[0].items, 800);
    updateCard(catId, combined);
    resultEl.classList.remove('spinning-text');
    await sleep(100);
  }

  confetti();
  btn.disabled = false;
  btn.textContent = '모두 다시 뽑기 🎰';
}

function animateCounter(el, items, duration) {
  return new Promise(resolve => {
    const end = Date.now() + duration;
    let i = 0;
    const tick = () => {
      el.textContent = items[i % items.length];
      el.classList.remove('empty');
      i++;
      if (Date.now() < end) requestAnimationFrame(tick);
      else resolve();
    };
    tick();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── CONFETTI ──────────────────────────────────────────────────────────────────
function confetti() {
  const container = document.getElementById('confetti-container');
  container.textContent = '';
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const x = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const dur = 1.2 + Math.random() * 1.4;
    const size = 6 + Math.random() * 10;
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    p.style.cssText = `left:${x}%;top:-20px;width:${size}px;height:${size}px;background:${color};animation-duration:${dur}s;animation-delay:${delay}s;border-radius:${Math.random()>0.5?'50%':'2px'}`;
    container.appendChild(p);
  }
  setTimeout(() => { container.textContent = ''; }, 3000);
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function init() {
  buildCategoryCards();

  document.getElementById('btn-all').addEventListener('click', spinAll);
  document.getElementById('btn-spin').addEventListener('click', doSpin);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // swipe down to close
  let startY = 0;
  const sheet = document.querySelector('.modal-sheet');
  sheet.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - startY > 80) closeModal();
  }, { passive: true });

  // PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
