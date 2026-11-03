(() => {
'use strict';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const NS = 'http://www.w3.org/2000/svg';
const STORY = window.STORY;

/* ===================== САМОПРОВЕРКА И ОШИБКИ НА ЭКРАНЕ ===================== */
// Если файлы игры из разных версий (например, старый story.js), это видно сразу, а не «просто не открывается».
const VERSION = 3;
function showProblem(msg) {
    let b = document.getElementById('problem');
    if (!b) {
        b = document.createElement('div');
        b.id = 'problem';
        b.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;padding:10px 16px;background:#b3123f;color:#fff;' +
            'font:14px/1.4 system-ui,sans-serif;text-align:center;cursor:pointer;white-space:pre-wrap';
        b.addEventListener('click', () => { b.style.display = 'none'; });
        document.body.appendChild(b);
    }
    const have = b.textContent ? b.textContent.split('\n\n') : [];
    if (!have.includes(msg)) have.push(msg);   // сообщения копятся, а не затирают друг друга
    b.textContent = have.join('\n\n');
    b.style.display = 'block';
}
const storyOk = () => !!(STORY && STORY.scenes && STORY.text && STORY.names);
function selfCheck() {
    const bad = [];
    const meta = document.querySelector('meta[name="melody-version"]');
    if (!meta || +meta.content !== VERSION) bad.push('index.html');
    if (!storyOk() || +STORY.version !== VERSION) bad.push('story.js');
    const cssV = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ver'), 10);
    if (cssV !== VERSION) bad.push('style.css');
    if (bad.length) {
        showProblem('Файлы игры из разных версий. Замените на свежие из чата: ' + bad.join(', ') +
            '\nПотом обновите страницу (Ctrl+F5). Нажмите на это сообщение, чтобы скрыть.');
    }
}
window.addEventListener('error', (e) => {
    showProblem('Ошибка в игре: ' + e.message + ' (' + String(e.filename || '').split('/').pop() + ':' + e.lineno + ')');
});

/* ===================== РЕСУРСЫ ===================== */
const ASSETS = {
    idle: 'assets/idel.png',
    poses: ['assets/posa_1.png', 'assets/posa_2.png', 'assets/posa_3.png', 'assets/posa_4.png', 'assets/posa_5.png'],
    // Необязательно: если файлов нет, покажется силуэт-заглушка
    enemies: ['assets/enemy_1.png', 'assets/enemy_2.png', 'assets/enemy_3.png']
};
const POSE_RESET_MS = 2000;     // режим 'lane': через сколько Мелоди возвращается в idle
const POSE_MODE = 'situation';  // 'situation': позы по ходу игры, 'lane': поза по нажатой дорожке

[ASSETS.idle, ...ASSETS.poses].forEach(src => { const im = new Image(); im.src = src; });

/* ===================== ПАРАМЕТРЫ УРОВНЕЙ ===================== */
// hold: шанс длинного лепестка (с долей битов после шага holdFrom)
// sway: на сколько пикселей сцены дорожки уходят вбок (около 1-2 мм на телефоне)
const LEVELS = [
    { bpm: 96,  steps: 112, fall: 1900, pOn: 0.85, pOff: 0.12, dbl: 0,    hold: 0.10, holdFrom: 16, sway: 7,  hpLoss: 8, seed: 11, bg: 'corridor' },
    { bpm: 108, steps: 128, fall: 1700, pOn: 0.92, pOff: 0.40, dbl: 0.05, hold: 0.14, holdFrom: 12, sway: 10, hpLoss: 8, seed: 22, bg: 'yard' },
    { bpm: 120, steps: 160, fall: 1500, pOn: 0.95, pOff: 0.60, dbl: 0.12, hold: 0.18, holdFrom: 10, sway: 13, hpLoss: 7, seed: 33, bg: 'stage' }
];

const LANE_W = 84;
const HIT_Y = 350;          // Y линии попадания внутри поля
const NOTE_R = 28;          // половина размера сакуры
const PERFECT = 80;         // окна попадания, мс
const GOOD = 150;
const EARLY = 210;
const HOLD_SLACK = 180;     // длинный лепесток можно отпустить за столько мс до конца
const SWAY_P1 = 3400, SWAY_P2 = 1900;
const GLYPHS = ['n1', 'n2', 'n3', 'n2', 'n1'];

/* ===================== ИНТЕРФЕЙС: ЯЗЫКИ ===================== */
const I18N = {
    ru: {
        ui: {
            subtitle: 'ДНИ В ШКОЛЕ', play: 'ИГРАТЬ', settings: 'НАСТРОЙКИ', selectLevel: 'ВЫБОР БАТТЛА',
            back: 'НАЗАД', settingsTitle: 'НАСТРОЙКИ', language: 'Язык / Jazyk', sound: 'Звук', voice: 'Озвучка',
            vibration: 'Вибрация', on: 'ВКЛ', off: 'ВЫКЛ', level: 'Уровень', vs: 'Противник', pause: 'ПАУЗА',
            resume: 'ПРОДОЛЖИТЬ', quit: 'В МЕНЮ', skip: 'Пропустить ▶▶', score: 'Счёт', combo: 'КОМБО',
            win: 'ПОБЕДА!', lose: 'ПОРАЖЕНИЕ', winSub: 'Ритм за тобой, школа тоже!',
            loseSub: 'Не сдавайся, поймай ритм ещё раз!', accuracy: 'Точность', maxCombo: 'Макс. комбо',
            perfect: 'ИДЕАЛЬНО', good: 'ХОРОШО', miss: 'МИМО', retry: 'ЕЩЁ РАЗ', toLevels: 'К УРОВНЯМ',
            next: 'ДАЛЬШЕ', rotate: 'Поверни телефон горизонтально',
            record: 'Рекорд', fullscreen: 'Полный экран', enterFs: 'ВКЛЮЧИТЬ', exitFs: 'ВЫКЛЮЧИТЬ',
            fsHint: 'Чтобы игра открывалась как приложение: в меню браузера выбери «Добавить на главный экран».',
            fsHintIos: 'На iPhone: «Поделиться» → «На экран Домой», так игра откроется без панелей браузера.',
            progress: 'Прогресс', reset: 'СБРОСИТЬ', resetSure: 'ТОЧНО СБРОСИТЬ?',
            holdHint: 'Длинный лепесток: зажми и держи, пока он не дойдёт до кольца'
        },
        levels: [
            { title: 'Коридор', desc: 'Макарон, задира' },
            { title: 'Двор', desc: 'Позёр из параллели' },
            { title: 'Сцена', desc: 'Снежный Барс' }
        ]
    },
    cz: {
        ui: {
            subtitle: 'ŠKOLNÍ DNY', play: 'HRÁT', settings: 'NASTAVENÍ', selectLevel: 'VÝBĚR SOUBOJE',
            back: 'ZPĚT', settingsTitle: 'NASTAVENÍ', language: 'Jazyk', sound: 'Zvuk', voice: 'Namluvení',
            vibration: 'Vibrace', on: 'ZAP', off: 'VYP', level: 'Úroveň', vs: 'Soupeř', pause: 'PAUZA',
            resume: 'POKRAČOVAT', quit: 'DO MENU', skip: 'Přeskočit ▶▶', score: 'Skóre', combo: 'KOMBO',
            win: 'VÍTĚZSTVÍ!', lose: 'PORÁŽKA', winSub: 'Rytmus je tvůj, škola taky!',
            loseSub: 'Nevzdávej to, chyť rytmus znovu!', accuracy: 'Přesnost', maxCombo: 'Max. kombo',
            perfect: 'PERFEKTNÍ', good: 'DOBRÉ', miss: 'MIMO', retry: 'ZNOVU', toLevels: 'K ÚROVNÍM',
            next: 'DÁL', rotate: 'Otoč telefon na šířku',
            record: 'Rekord', fullscreen: 'Celá obrazovka', enterFs: 'ZAPNOUT', exitFs: 'VYPNOUT',
            fsHint: 'Aby se hra otevírala jako aplikace: v nabídce prohlížeče zvol „Přidat na plochu“.',
            fsHintIos: 'Na iPhonu: „Sdílet“ → „Přidat na plochu“, hra se pak otevře bez lišt prohlížeče.',
            progress: 'Postup', reset: 'RESETOVAT', resetSure: 'OPRAVDU RESETOVAT?',
            holdHint: 'Dlouhý lístek: drž prst, dokud nedojede ke kroužku'
        },
        levels: [
            { title: 'Chodba', desc: 'Makaron, tyran' },
            { title: 'Nádvoří', desc: 'Pozér z paralelky' },
            { title: 'Scéna', desc: 'Sněžný levhart' }
        ]
    }
};

/* ===================== СОХРАНЕНИЯ ===================== */
const STORE_KEY = 'melodyRiot_v2';
const store = { lang: 'ru', sound: true, voice: true, vibe: true, unlocked: 1, best: {}, seen: {} };

function loadStore() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
            const d = JSON.parse(raw) || {};
            if (d.lang === 'ru' || d.lang === 'cz') store.lang = d.lang;
            ['sound', 'voice', 'vibe'].forEach((k) => { if (typeof d[k] === 'boolean') store[k] = d[k]; });
            store.unlocked = clamp(parseInt(d.unlocked, 10) || 1, 1, LEVELS.length);
            if (d.seen && typeof d.seen === 'object') store.seen = d.seen;
            if (d.best && typeof d.best === 'object') {
                Object.keys(d.best).forEach((k) => {
                    const v = d.best[k];
                    if (typeof v === 'string') store.best[k] = { rank: v, score: 0 };
                    else if (v && typeof v === 'object') store.best[k] = { rank: String(v.rank || 'C'), score: +v.score || 0 };
                });
            }
        } else {
            const old = parseInt(localStorage.getItem('melodyRiot_maxLevel'), 10);
            if (old) store.unlocked = clamp(old, 1, 3);
        }
    } catch (e) { /* ignore */ }
}
function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
}

const tr = (k) => I18N[store.lang].ui[k];

/* ===================== МАСШТАБ СЦЕНЫ ===================== */
function fit() {
    const s = Math.min(window.innerWidth / 960, window.innerHeight / 540);
    document.documentElement.style.setProperty('--s', s.toFixed(4));
}

/* ===================== ЭКРАНЫ, ТЕМА, ФОН ===================== */
const stage = $('stage');
const bgImg = document.querySelector('.bg-img');
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}
function setTheme(t) { stage.dataset.theme = String(t); }
// Порядок: свой рисунок assets/bg_<имя>.png, потом готовая сцена assets/scene_<имя>.svg, потом bg_menu.png
const SCENE_ART = { gate: 'gate', corridor: 'hall', yard: 'gate', stage: 'stage' };
function setBg(key, inGame) {
    const list = [];
    if (key) {
        list.push(`url('assets/bg_${key}.png')`);
        if (inGame) list.push("url('assets/bg_game.png')");   // свой фон игрового экрана, если он есть
        if (SCENE_ART[key]) list.push(`url('assets/scene_${SCENE_ART[key]}.svg')`);
    }
    list.push("url('assets/bg_menu.png')", 'linear-gradient(135deg, #1c0b2b, #0b0b12)');
    bgImg.style.backgroundImage = list.join(', ');
    bgImg.classList.toggle('scene', !!key);
}
const activeScreen = () => { const a = document.querySelector('.screen.active'); return a ? a.id : ''; };

/* ===================== ЛЕПЕСТКИ НА ФОНЕ ===================== */
function buildPetals() {
    const wrap = $('petals');
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.className = 'petal';
        p.style.left = (Math.random() * 100) + '%';
        p.style.setProperty('--sz', (8 + Math.random() * 12).toFixed(1) + 'px');
        p.style.setProperty('--dur', (9 + Math.random() * 9).toFixed(1) + 's');
        p.style.setProperty('--delay', (-Math.random() * 16).toFixed(1) + 's');
        p.style.setProperty('--drift', (-120 + Math.random() * 240).toFixed(0) + 'px');
        wrap.appendChild(p);
    }
}

/* ===================== ПРОТИВНИК ===================== */
function loadEnemyArt(lvl) {
    const src = ASSETS.enemies[lvl];
    const boxes = document.querySelectorAll('.enemy-box');
    boxes.forEach(b => b.classList.remove('has-img'));
    const im = new Image();
    im.onload = () => boxes.forEach(b => {
        b.querySelector('.enemy-art').style.backgroundImage = `url('${src}')`;
        b.classList.add('has-img');
    });
    im.onerror = () => boxes.forEach(b => {
        b.querySelector('.enemy-art').style.backgroundImage = 'none';
    });
    im.src = src;
}

/* ===================== ВИБРАЦИЯ И ЭКРАН НЕ ГАСНЕТ ===================== */
function buzz(ms) {
    try { if (store.vibe && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ }
}
let wake = null;
async function keepAwake(on) {
    try {
        if (on) {
            if (!wake && navigator.wakeLock) {
                wake = await navigator.wakeLock.request('screen');
                wake.addEventListener('release', () => { wake = null; });
            }
        } else if (wake) {
            const w = wake; wake = null; await w.release();
        }
    } catch (e) { /* ignore */ }
}

/* ===================== ЗВУК (синтез, без файлов) ===================== */
let actx = null, master = null, noiseBuf = null;
function initAudio() {
    if (!store.sound) return;
    if (!actx) {
        try {
            actx = new (window.AudioContext || window.webkitAudioContext)();
            master = actx.createGain();
            master.gain.value = 0.6;
            master.connect(actx.destination);
            noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.1, actx.sampleRate);
            const d = noiseBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        } catch (e) { actx = null; }
    }
    if (actx && actx.state === 'suspended') actx.resume();
}
function tone(freq, dur, type, vol) {
    if (!actx || !store.sound) return;
    const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
}
function kick() {
    if (!actx || !store.sound) return;
    const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.2);
}
function hat() {
    if (!actx || !store.sound) return;
    const t = actx.currentTime;
    const src = actx.createBufferSource(); src.buffer = noiseBuf;
    const f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + 0.06);
}
const LANE_FREQ = [523.25, 587.33, 659.25, 783.99, 880];   // до ре ми соль ля
const BASS = [130.81, 110, 130.81, 98];
function sfxHit(lane, perfect) {
    tone(LANE_FREQ[lane], 0.28, 'triangle', perfect ? 0.35 : 0.22);
    if (perfect) tone(LANE_FREQ[lane] * 2, 0.18, 'sine', 0.12);
}
function sfxMiss() { tone(110, 0.18, 'sawtooth', 0.1); }
function playStep(k) {
    const m = ((k % 32) + 32) % 32;
    if ((m & 1) === 0) kick(); else hat();
    const p = m & 7;
    if (p === 0 || p === 3 || p === 6) tone(BASS[m >> 3], 0.22, 'triangle', 0.28);
}
// тянущийся звук, пока держишь длинный лепесток
function startHoldTone(lane) {
    if (!actx || !store.sound) return null;
    const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = LANE_FREQ[lane];
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.06);
    o.connect(g); g.connect(master);
    o.start(t);
    return { o, g };
}
function stopHoldTone(n) {
    const h = n.tone;
    n.tone = null;
    if (!h || !actx) return;
    const t = actx.currentTime;
    try {
        h.g.gain.cancelScheduledValues(t);
        h.g.gain.setValueAtTime(Math.max(h.g.gain.value, 0.0002), t);
        h.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        h.o.stop(t + 0.15);
    } catch (e) { /* ignore */ }
}

/* ===================== ПОЗЫ МЕЛОДИ (в игре) ===================== */
const sprite = { a: $('poseA'), b: $('poseB'), front: 'a', cur: ASSETS.idle };
let poseTimer = null;
function setPose(src) {
    if (sprite.cur !== src) {
        const back = sprite.front === 'a' ? sprite.b : sprite.a;
        const front = sprite.front === 'a' ? sprite.a : sprite.b;
        back.style.backgroundImage = `url('${src}')`;
        back.classList.add('on');
        front.classList.remove('on');
        sprite.front = sprite.front === 'a' ? 'b' : 'a';
        sprite.cur = src;
    }
    clearTimeout(poseTimer);
    if (POSE_MODE === 'lane' && src !== ASSETS.idle) poseTimer = setTimeout(() => setPose(ASSETS.idle), POSE_RESET_MS);
}
function bump(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 320);
}

/* Позы по ситуации: испугана при низком HP, злится после промаха, поёт на зажиме и комбо, радуется на большом комбо */
let holdUntil = 0;
function refreshPose() {
    if (POSE_MODE !== 'situation') return;
    let src = ASSETS.idle;
    if (G.hp < 30) src = ASSETS.poses[3];
    else if (performance.now() < holdUntil) src = ASSETS.poses[2];
    else if (G.holding.some(Boolean)) src = ASSETS.poses[0];
    else if (G.combo >= 20) src = ASSETS.poses[1];
    else if (G.combo >= 8) src = ASSETS.poses[0];
    setPose(src);
}
function beatPulse() {
    bump($('melodyHero'), 'beat');
    bump($('gameEnemy'), 'beat');
}

/* ===================== ПОЛЕ, ДОРОЖКИ, «ДОРОГА» ===================== */
const board = $('board');
const LANES = [];
const RINGS = [];
const ROAD = { w: [], l: [] };
const KEY_LABELS = ['D', 'F', '␣', 'J', 'K'];

// Смещение дорожки вбок в момент времени T (мс по ходу песни). Дорожки плавно «гуляют»,
// у каждой своя фаза, первые секунды песни ровные, чтобы привыкнуть.
function swayX(lane, T) {
    const a = G.cfg ? G.cfg.sway : 0;
    if (!a) return 0;
    const ramp = clamp((T - 3000) / 5000, 0, 1);
    return ramp * a * (Math.sin(T / SWAY_P1 * 6.2832 + lane * 0.55) + 0.35 * Math.sin(T / SWAY_P2 * 6.2832 + lane * 1.1 + 1));
}

function buildRoad() {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'road');
    svg.setAttribute('viewBox', '0 0 420 440');
    for (let i = 0; i < 5; i++) {
        const w = document.createElementNS(NS, 'path');
        w.setAttribute('class', `road-w l${i}`);
        const l = document.createElementNS(NS, 'path');
        l.setAttribute('class', 'road-l');
        svg.appendChild(w); svg.appendChild(l);
        ROAD.w.push(w); ROAD.l.push(l);
    }
    board.insertBefore(svg, board.firstChild);
}
function drawRoad() {
    if (!G.cfg) return;
    const fall = G.cfg.fall;
    for (let i = 0; i < 5; i++) {
        let d = '';
        for (let y = -12; y <= 452; y += 22) {
            const T = G.songTime + (HIT_Y - y) / HIT_Y * fall;
            d += (y === -12 ? 'M' : 'L') + (i * LANE_W + LANE_W / 2 + swayX(i, T)).toFixed(1) + ' ' + y + ' ';
        }
        ROAD.w[i].setAttribute('d', d);
        ROAD.l[i].setAttribute('d', d);
        RINGS[i].style.setProperty('--dx', swayX(i, G.songTime).toFixed(1) + 'px');
    }
}

function buildLanes() {
    buildRoad();
    for (let i = 0; i < 5; i++) {
        const lane = document.createElement('div');
        lane.className = `lane l${i}`;
        lane.innerHTML = `<div class="ring"></div><div class="key">${KEY_LABELS[i]}</div>`;
        board.insertBefore(lane, board.querySelector('.hitline'));
        lane.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            try { lane.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            setDown(i, true);
            pressLane(i);
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev =>
            lane.addEventListener(ev, () => releaseLane(i)));
        LANES.push(lane);
        RINGS.push(lane.querySelector('.ring'));
    }
}
function setDown(i, on) { LANES[i].classList.toggle('down', on); }

/* ===================== ЧАРТ ===================== */
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function buildChart(cfg) {
    const rng = mulberry32(cfg.seed);
    const stepMs = 60000 / cfg.bpm / 2;
    const start = cfg.fall + 700;
    const chart = [];
    const busy = [-1, -1, -1, -1, -1];   // дорожка занята длинным лепестком до этого шага
    let holdEnd = -1;                    // не больше одного длинного лепестка одновременно
    let last = -1;
    for (let i = 0; i < cfg.steps; i++) {
        const onBeat = i % 2 === 0;
        const p = i < 4 ? (onBeat ? 1 : 0) : (onBeat ? cfg.pOn : cfg.pOff);
        if (rng() >= p) continue;
        const free = [0, 1, 2, 3, 4].filter(l => busy[l] < i);
        if (!free.length) continue;
        let lane = free[Math.floor(rng() * free.length)];
        if (lane === last && free.length > 1 && rng() < 0.7) lane = free[Math.floor(rng() * free.length)];
        const note = { t: start + i * stepMs, lane };
        let holding = false;
        if (onBeat && i >= cfg.holdFrom && i < cfg.steps - 6 && i > holdEnd && rng() < cfg.hold) {
            const len = 2 + Math.floor(rng() * 3);   // 2..4 шага
            note.dur = len * stepMs;
            busy[lane] = i + len + 1;
            holdEnd = i + len + 1;
            holding = true;
        }
        chart.push(note);
        if (cfg.dbl && onBeat && i > 8 && i > holdEnd && !holding && rng() < cfg.dbl) {
            const rest = free.filter(l => l !== lane);
            if (rest.length) chart.push({ t: note.t, lane: rest[Math.floor(rng() * rest.length)] });
        }
        last = lane;
    }
    return chart;
}

/* ===================== СОСТОЯНИЕ ИГРЫ ===================== */
const G = {
    running: false, paused: false, ended: false, lvl: 0, cfg: null,
    chart: [], live: [], holding: [null, null, null, null, null],
    nextSpawn: 0, songTime: 0, lastTs: 0, raf: 0,
    score: 0, shownScore: -1, combo: 0, maxCombo: 0, hp: 70, counts: { perfect: 0, good: 0, miss: 0 },
    total: 0, end: 0, stepMs: 0, anchor: 0, nextStep: 0
};

const curTime = () => G.paused || !G.running
    ? G.songTime
    : G.songTime + clamp(performance.now() - G.lastTs, 0, 50);

function startGame(lvl) {
    initAudio();
    stopVoice();
    setTheme(lvl);
    setBg(LEVELS[lvl].bg, true);
    loadEnemyArt(lvl);
    const cfg = LEVELS[lvl];

    board.querySelectorAll('.note, .burst').forEach(n => n.remove());
    cancelAnimationFrame(G.raf);

    G.cfg = cfg; G.lvl = lvl; G.paused = false; G.ended = false;
    G.songTime = 0; G.score = 0; G.shownScore = -1; G.combo = 0; G.maxCombo = 0; G.hp = 70;
    G.counts = { perfect: 0, good: 0, miss: 0 };
    G.live = []; G.holding = [null, null, null, null, null]; G.nextSpawn = 0;
    G.chart = buildChart(cfg);
    G.total = G.chart.length;
    G.anchor = G.chart[0].t;
    G.end = Math.max.apply(null, G.chart.map(n => n.t + (n.dur || 0))) + 1600;
    G.stepMs = 60000 / cfg.bpm / 2;
    G.nextStep = -Math.floor(G.anchor / G.stepMs);

    $('songTitle').textContent = `${tr('level')} ${lvl + 1} · ${I18N[store.lang].levels[lvl].title}`;
    $('pauseOverlay').classList.remove('show');
    holdUntil = 0;
    setPose(ASSETS.idle);
    updateHud();
    drawRoad();
    $('progressFill').style.width = '0%';
    showScreen('game');
    keepAwake(true);

    G.running = true;
    G.lastTs = performance.now();
    G.raf = requestAnimationFrame(frame);
}

function frame(ts) {
    if (!G.running) return;
    const dt = Math.min(50, ts - G.lastTs);
    G.lastTs = ts;
    if (!G.paused) {
        G.songTime += dt;
        update();
    }
    if (G.running) G.raf = requestAnimationFrame(frame);
}

function update() {
    const cfg = G.cfg;
    const now = G.songTime;

    // ритм-секция
    while (now >= G.anchor + G.nextStep * G.stepMs && G.anchor + G.nextStep * G.stepMs < G.end) {
        playStep(G.nextStep);
        if ((G.nextStep & 1) === 0) beatPulse();
        G.nextStep++;
    }

    // появление нот
    while (G.nextSpawn < G.chart.length && G.chart[G.nextSpawn].t - cfg.fall <= now) {
        spawnNote(G.chart[G.nextSpawn]);
        G.nextSpawn++;
    }

    // движение, зажатия и пропуски
    for (let i = G.live.length - 1; i >= 0; i--) {
        const n = G.live[i];
        if (n.state === 'done') {
            if (now >= n.removeAt) { n.el.remove(); G.live.splice(i, 1); }
            else position(n);
            continue;
        }
        if (n.state === 'holding') {
            position(n);
            setTail(n, now, swayX(n.lane, now));
            while (n.nextTick < n.end && now >= n.nextTick) { G.score += 4; n.nextTick += 120; }
            if (now >= n.end) finishHold(n, 'ok');
            continue;
        }
        position(n);
        if (now - n.t > GOOD) judge('miss', n);
    }

    drawRoad();
    if (G.score !== G.shownScore) { G.shownScore = G.score; $('score').textContent = G.score; }
    $('progressFill').style.width = (clamp(now / G.end, 0, 1) * 100).toFixed(1) + '%';

    if (G.hp <= 0 && !G.ended) finish(false);
    else if (now >= G.end && !G.ended) finish(true);
}

/* ===================== НОТЫ-САКУРЫ ===================== */
function spawnNote(info) {
    const el = document.createElement('div');
    el.className = 'note' + (info.dur ? ' hold' : '');
    el.innerHTML =
        `<svg class="sk" viewBox="0 0 100 100"><use href="#sakura"/></svg>` +
        `<svg class="gl" viewBox="0 0 24 24"><use href="#${GLYPHS[info.lane]}"/></svg>`;
    el.firstChild.style.animationDelay = (-Math.random() * 8).toFixed(2) + 's';
    LANES[info.lane].appendChild(el);

    const n = {
        t: info.t, lane: info.lane, el, state: 'idle', removeAt: 0,
        dur: info.dur || 0, end: info.t + (info.dur || 0),
        dx: swayX(info.lane, info.t), tail: [], tone: null, headKind: '', nextTick: 0
    };
    if (n.dur) {
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'tail');
        ['t-w', 't-c'].forEach((c) => {
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('class', c);
            svg.appendChild(p);
            n.tail.push(p);
        });
        el.insertBefore(svg, el.firstChild);
        setTail(n, n.t, n.dx);
        if (!store.seen.hold) {
            store.seen.hold = true; saveStore();
            showToast(tr('holdHint'));
        }
    }
    G.live.push(n);
}

// Хвост длинного лепестка: линия вверх от головы по изгибам дорожки
function setTail(n, refT, refX) {
    if (!n.tail.length) return;
    let d = 'M0 0';
    if (refT < n.end) {
        d = '';
        for (let T = refT, k = 0; ; T += 70, k++) {
            const TT = Math.min(T, n.end);
            d += (k ? 'L' : 'M') + (swayX(n.lane, TT) - refX).toFixed(1) + ' ' + (-(TT - refT) / G.cfg.fall * HIT_Y).toFixed(1) + ' ';
            if (TT >= n.end) break;
        }
    }
    n.tail.forEach(p => p.setAttribute('d', d));
}

function position(n) {
    let y, x;
    if (n.state === 'holding') { y = HIT_Y; x = swayX(n.lane, G.songTime); }
    else { y = HIT_Y - ((n.t - G.songTime) / G.cfg.fall) * HIT_Y; x = n.dx; }
    n.el.style.transform = `translate3d(${x.toFixed(1)}px,${(y - NOTE_R).toFixed(1)}px,0)`;
}

/* ===================== ВВОД ===================== */
function pressLane(i) {
    if (!G.running || G.paused || G.ended) return;
    if (POSE_MODE === 'lane') setPose(ASSETS.poses[i]);
    if (G.holding[i]) return;
    const now = curTime();
    const n = G.live.find(x => x.lane === i && x.state === 'idle');
    if (!n) return;
    const d = n.t - now;
    if (d > EARLY) return;
    const ad = Math.abs(d);
    judge(ad <= PERFECT ? 'perfect' : (ad <= GOOD ? 'good' : 'miss'), n);
}

function releaseLane(i) {
    setDown(i, false);
    const n = G.holding[i];
    if (!n || !G.running) return;
    finishHold(n, curTime() >= n.end - HOLD_SLACK ? 'ok' : 'broken');
}

const KEYMAP = new Map([['d', 0], ['f', 1], [' ', 2], ['j', 3], ['k', 4], ['1', 0], ['2', 1], ['3', 2], ['4', 3], ['5', 4]]);

window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'Escape') {
        if (G.running && !G.paused) pauseGame(); else if (G.running && G.paused) resumeGame();
        return;
    }
    if (activeScreen() === 'dialogue' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); advance(); return; }
    const lane = KEYMAP.get(e.key.toLowerCase());
    if (lane !== undefined && G.running) {
        e.preventDefault();
        setDown(lane, true);
        pressLane(lane);
    }
});
window.addEventListener('keyup', (e) => {
    const lane = KEYMAP.get(e.key.toLowerCase());
    if (lane !== undefined) releaseLane(lane);
});
// долгое нажатие на телефоне не должно открывать меню
window.addEventListener('contextmenu', (e) => e.preventDefault());

/* ===================== ОЦЕНКА ===================== */
function judge(kind, n) {
    const lane = n.lane;

    if (kind === 'miss') {
        n.state = 'done';
        G.combo = 0;
        G.counts.miss++;
        G.hp = clamp(G.hp - G.cfg.hpLoss, 0, 100);
        n.el.classList.add('missed');
        n.removeAt = G.songTime + 400;
        sfxMiss();
        buzz(30);
        bump($('gameEnemy'), 'shake');
        bump($('game'), 'shake');
        holdUntil = performance.now() + 900;
        setTimeout(refreshPose, 950);
    } else {
        G.combo++;
        G.maxCombo = Math.max(G.maxCombo, G.combo);
        G.counts[kind]++;
        G.score += (kind === 'perfect' ? 100 : 60) + Math.min(G.combo, 50) * 2;
        G.hp = clamp(G.hp + (kind === 'perfect' ? 2 : 1), 0, 100);
        sfxHit(lane, kind === 'perfect');
        buzz(kind === 'perfect' ? 10 : 6);
        spawnBurst(lane, kind, n.dx);
        bump($('melodyHero'), 'bump');
        if (G.combo % 10 === 0) bump(board, 'flash');
        if (n.dur) {
            n.state = 'holding';
            n.headKind = kind;
            n.nextTick = G.songTime + 120;
            n.el.classList.add('holding');
            n.tone = startHoldTone(lane);
            G.holding[lane] = n;
        } else {
            n.state = 'done';
            n.el.remove();
            n.removeAt = -1;
        }
    }
    refreshPose();
    showJudge(kind);
    updateHud();
}

// mode: 'ok' дотянул, 'broken' отпустил рано, 'cancel' отмена (пауза) без штрафа
function finishHold(n, mode) {
    if (G.holding[n.lane] === n) G.holding[n.lane] = null;
    stopHoldTone(n);
    n.state = 'done';
    n.el.classList.remove('holding');
    if (mode === 'ok') {
        G.score += 60 + Math.min(G.combo, 50) * 2;
        n.el.remove();
        n.removeAt = -1;
        spawnBurst(n.lane, 'perfect', swayX(n.lane, G.songTime));
        sfxHit(n.lane, true);
        buzz(14);
        showJudge('perfect');
    } else if (mode === 'broken') {
        G.counts[n.headKind]--;
        G.counts.miss++;
        G.combo = 0;
        G.hp = clamp(G.hp - Math.ceil(G.cfg.hpLoss / 2), 0, 100);
        n.el.classList.add('missed');
        n.removeAt = G.songTime + 400;
        sfxMiss();
        buzz(30);
        bump($('gameEnemy'), 'shake');
        bump($('game'), 'shake');
        holdUntil = performance.now() + 900;
        setTimeout(refreshPose, 950);
        showJudge('miss');
    } else {
        n.el.remove();
        n.removeAt = -1;
    }
    refreshPose();
    updateHud();
}
function cancelHolds() {
    G.holding.slice().forEach(n => { if (n) finishHold(n, 'cancel'); });
}

function spawnBurst(lane, kind, dx) {
    const b = document.createElement('div');
    b.className = `burst ${kind}`;
    b.style.left = (lane * LANE_W + LANE_W / 2 + (dx || 0)) + 'px';
    b.style.setProperty('--c', getComputedStyle(LANES[lane]).getPropertyValue('--c'));
    board.appendChild(b);
    setTimeout(() => b.remove(), 600);
}

function showJudge(kind) {
    const j = $('judge');
    j.className = 'judge ' + kind;
    j.textContent = tr(kind);
    void j.offsetWidth;
    j.classList.add('show');
}

let toastTimer = 0;
function showToast(text) {
    const t = $('toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function updateHud() {
    $('score').textContent = G.score;
    G.shownScore = G.score;
    $('comboNum').textContent = G.combo;
    const c = $('combo');
    c.classList.toggle('show', G.combo >= 2);
    if (G.combo >= 2) { c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse'); }
    $('hpFill').style.height = G.hp + '%';
    $('hp').classList.toggle('low', G.hp < 30);
    $('melodyHero').classList.toggle('aura', G.combo >= 30);
}

/* ===================== ПАУЗА / ВЫХОД ===================== */
function pauseGame() {
    if (!G.running || G.paused || G.ended) return;
    cancelHolds();
    G.paused = true;
    $('pauseOverlay').classList.add('show');
}
function resumeGame() {
    if (!G.running || !G.paused) return;
    G.paused = false;
    G.lastTs = performance.now();
    $('pauseOverlay').classList.remove('show');
}
function stopGame() {
    cancelHolds();
    G.running = false;
    G.ended = true;
    cancelAnimationFrame(G.raf);
    board.querySelectorAll('.note, .burst').forEach(n => n.remove());
    G.live = [];
    clearTimeout(poseTimer);
    setPose(ASSETS.idle);
    keepAwake(false);
}
function quitToLevels() {
    stopGame();
    $('pauseOverlay').classList.remove('show');
    setTheme('menu');
    setBg(null);
    openLevels();
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
    else if (G.running) keepAwake(true);
});

/* ===================== ФИНАЛ ===================== */
const RANKS = ['D', 'C', 'B', 'A', 'S'];

function finish(won) {
    if (G.ended) return;
    cancelHolds();
    G.ended = true;
    G.running = false;
    cancelAnimationFrame(G.raf);
    keepAwake(false);
    setPose(won ? ASSETS.poses[1] : ASSETS.poses[4]);

    const acc = G.total ? ((G.counts.perfect + G.counts.good * 0.6) / G.total) * 100 : 0;
    let rank = 'D';
    if (won) rank = acc >= 93 ? 'S' : acc >= 80 ? 'A' : acc >= 65 ? 'B' : 'C';

    if (won) {
        store.unlocked = Math.max(store.unlocked, Math.min(3, G.lvl + 2));
        const prev = store.best[G.lvl] || { rank: 'D', score: 0 };
        store.best[G.lvl] = {
            rank: RANKS.indexOf(rank) > RANKS.indexOf(prev.rank) ? rank : prev.rank,
            score: Math.max(prev.score, G.score)
        };
        saveStore();
    }

    const showRes = () => {
        $('resTitle').textContent = tr(won ? 'win' : 'lose');
        $('resSub').textContent = tr(won ? 'winSub' : 'loseSub');
        $('resultPanel').classList.toggle('lose', !won);
        const r = $('resRank');
        r.textContent = rank;
        r.className = 'rank ' + rank;
        $('resScore').textContent = G.score;
        $('resAcc').textContent = Math.round(acc) + '%';
        $('resCombo').textContent = G.maxCombo;
        $('resPerfect').textContent = G.counts.perfect;
        $('resGood').textContent = G.counts.good;
        $('resMiss').textContent = G.counts.miss;
        $('resNext').style.display = (won && G.lvl < LEVELS.length - 1) ? '' : 'none';
        $('resHeroImg').style.backgroundImage = `url('${won ? ASSETS.poses[1] : ASSETS.poses[4]}')`;
        setTheme(G.lvl);
        showScreen('result');
    };

    setTimeout(() => {
        board.querySelectorAll('.note, .burst').forEach(n => n.remove());
        G.live = [];
        const post = won ? `l${G.lvl + 1}_post` : '';
        if (post && storyOk() && STORY.scenes[post]) playScene(post, showRes); else showRes();
    }, 700);
}

/* ===================== ОЗВУЧКА ===================== */
// 1) Если есть файл assets/voice/<язык>/<сцена>_<NN>.mp3, играет он (настоящий ИИ-голос или актёр).
// 2) Иначе, если в браузере есть голос для языка, читает встроенный синтезатор речи.
const VOICE_PROFILE = {
    m:  { pitch: 1.3,  rate: 1.05 },
    b0: { pitch: 0.65, rate: 0.95 },
    b1: { pitch: 0.95, rate: 1.1 },
    b2: { pitch: 0.45, rate: 0.85 }
};
let vToken = 0, curAudio = null;
const voiceMissing = new Set();

function stopVoice() {
    vToken++;
    if (curAudio) { try { curAudio.pause(); } catch (e) { /* ignore */ } curAudio = null; }
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
}
function tts(who, text, tok) {
    try {
        if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
        const lang = store.lang === 'cz' ? 'cs-CZ' : 'ru-RU';
        const voices = window.speechSynthesis.getVoices();
        const pref = lang.slice(0, 2);
        const v = voices.find(x => x.lang && x.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) ||
                  voices.find(x => x.lang && x.lang.toLowerCase().startsWith(pref));
        if (voices.length && !v) return;   // нет голоса для языка: лучше промолчать, чем читать с акцентом
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        if (v) u.voice = v;
        const prof = VOICE_PROFILE[who === 'm' ? 'm' : 'b' + D.lvl] || VOICE_PROFILE.m;
        u.pitch = prof.pitch; u.rate = prof.rate;
        setTimeout(() => { if (tok === vToken) window.speechSynthesis.speak(u); }, 40);
    } catch (e) { /* ignore */ }
}
function speak(who, text) {
    stopVoice();
    if (!store.voice) return;
    const tok = vToken;
    const fallback = () => { if (tok === vToken && who !== 'n') tts(who, text, tok); };
    const file = `assets/voice/${store.lang}/${D.key}_${String(D.i + 1).padStart(2, '0')}.mp3`;
    if (voiceMissing.has(file)) { fallback(); return; }
    const a = new Audio(file);
    curAudio = a;
    a.addEventListener('error', () => {
        voiceMissing.add(file);
        if (curAudio === a) curAudio = null;
        fallback();
    }, { once: true });
    const p = a.play();
    if (p && p.catch) p.catch(() => { /* нет файла или автоплей запрещён: решает событие error */ });
}

/* ===================== ДИАЛОГИ И СЦЕНЫ ===================== */
const D = { key: '', sc: null, lvl: 0, i: 0, text: [], onEnd: null, typing: false, timer: 0, full: '' };
const poseSrc = (n) => (n === undefined || n < 0) ? ASSETS.idle : ASSETS.poses[n];

function setDialogPose(src) {
    const img = $('dMelodyImg');
    if (img.dataset.src === src) return;
    img.dataset.src = src;
    img.style.backgroundImage = `url('${src}')`;
    img.classList.remove('swap');
    void img.offsetWidth;
    img.classList.add('swap');
    setTimeout(() => img.classList.remove('swap'), 320);
}

function playScene(key, onEnd) {
    const sc = STORY.scenes[key];
    D.key = key; D.sc = sc; D.lvl = sc.lvl; D.i = 0; D.onEnd = onEnd || null;
    D.text = STORY.text[store.lang][key];
    initAudio();
    setTheme(sc.theme);
    setBg(sc.bg);
    loadEnemyArt(sc.lvl);
    $('dMelodyImg').dataset.src = '';
    $('dMelody').classList.remove('in');
    $('dEnemy').classList.remove('in');
    showScreen('dialogue');
    showLine();
}

function showLine() {
    const [who, pose] = D.sc.lines[D.i];
    const names = STORY.names[store.lang];
    const isM = who === 'm', isB = who === 'b';
    $('dName').textContent = isM ? names.m : isB ? names.boss[D.lvl] : '';
    $('dBox').dataset.side = isM ? 'melody' : isB ? 'enemy' : 'narrator';
    if (isM) setDialogPose(poseSrc(pose));
    // говорящий выезжает с края экрана, второй уезжает
    $('dMelody').classList.toggle('in', isM);
    $('dEnemy').classList.toggle('in', isB);
    const text = D.text[D.i];
    typeText(text);
    speak(who, text);
}

function typeText(text) {
    clearInterval(D.timer);
    D.full = text; D.typing = true;
    $('dHint').classList.remove('show');
    $('dText').textContent = '';
    let n = 0;
    D.timer = setInterval(() => {
        n++;
        $('dText').textContent = text.slice(0, n);
        if (n >= text.length) {
            clearInterval(D.timer); D.typing = false;
            $('dHint').classList.add('show');
        }
    }, 22);
}

function advance() {
    if (activeScreen() !== 'dialogue') return;
    if (D.typing) {
        clearInterval(D.timer);
        $('dText').textContent = D.full;
        D.typing = false;
        $('dHint').classList.add('show');
    } else {
        D.i++;
        if (D.i >= D.sc.lines.length) endScene(); else showLine();
    }
}

function endScene() {
    clearInterval(D.timer);
    stopVoice();
    $('dMelody').classList.remove('in');
    $('dEnemy').classList.remove('in');
    const cb = D.onEnd;
    D.onEnd = null;
    if (cb) cb();
}

// пролог (один раз) → сцена перед боем → сам бой
function beginLevel(lvl) {
    initAudio();
    if (!storyOk()) { startGame(lvl); return; }   // нет истории: хотя бы запускаем бой
    const seq = [];
    if (lvl === 0 && !store.seen.prologue) seq.push('prologue');
    seq.push(`l${lvl + 1}_pre`);
    const next = () => {
        const k = seq.shift();
        if (!k) { startGame(lvl); return; }
        if (k === 'prologue') { store.seen.prologue = true; saveStore(); }
        playScene(k, next);
    };
    next();
}

/* ===================== УРОВНИ ===================== */
function openLevels() {
    renderLevels();
    showScreen('levels');
}
function renderLevels() {
    const L = I18N[store.lang].levels;
    const wrap = $('levelCards');
    wrap.innerHTML = '';
    L.forEach((lv, i) => {
        const locked = i >= store.unlocked;
        const best = store.best[i];
        const b = document.createElement('button');
        b.className = 'level-card' + (locked ? ' locked' : '');
        b.dataset.theme = i;
        const badge = locked ? '🔒' : (best ? best.rank : '▶');
        b.innerHTML =
            `<span class="lc-num">0${i + 1}</span>` +
            `<span class="lc-body">` +
                `<span class="lc-level">${tr('level')} ${i + 1}</span>` +
                `<div class="lc-title">${lv.title}</div>` +
                `<div class="lc-enemy">${tr('vs')}: ${lv.desc}</div>` +
                (best && best.score ? `<div class="lc-best">${tr('record')}: ${best.score}</div>` : '') +
            `</span>` +
            `<span class="lc-badge">${badge}</span>`;
        if (!locked) b.addEventListener('click', () => beginLevel(i));
        wrap.appendChild(b);
    });
}

/* ===================== ПОЛНЫЙ ЭКРАН ===================== */
const root = document.documentElement;
const fsSupported = !!(root.requestFullscreen || root.webkitRequestFullscreen);
const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const standalone = () =>
    (window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) ||
    navigator.standalone === true;
const ICON_FS_ON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const ICON_FS_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

function lockLandscape() {
    try {
        if (screen.orientation && screen.orientation.lock) {
            const p = screen.orientation.lock('landscape');
            if (p && p.catch) p.catch(() => {});
        }
    } catch (e) { /* ignore */ }
}
function enterFs() {
    if (!fsSupported || isFs()) return;
    try {
        const p = (root.requestFullscreen || root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' });
        if (p && p.then) p.then(lockLandscape).catch(() => {}); else lockLandscape();
    } catch (e) { /* ignore */ }
}
function exitFs() {
    try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* ignore */ }
}
function toggleFs() { if (isFs()) exitFs(); else enterFs(); }

function updateFsUi() {
    const hide = standalone();
    const can = fsSupported && !hide;
    $('btnFs').style.display = can ? '' : 'none';
    $('rowFs').style.display = can ? '' : 'none';
    $('fsHint').style.display = hide ? 'none' : '';
    $('fsHint').dataset.i18n = fsSupported ? 'fsHint' : 'fsHintIos';
    $('btnFsSet').textContent = isFs() ? tr('exitFs') : tr('enterFs');
    $('btnFs').innerHTML = isFs() ? ICON_FS_OFF : ICON_FS_ON;
}
function onFsChange() {
    updateFsUi();
    fit();
    setTimeout(fit, 200);
    if (!isFs() && G.running && !G.paused && activeScreen() === 'game') pauseGame();
}

/* ===================== ЯЗЫК / НАСТРОЙКИ ===================== */
function applyLang() {
    updateFsUi();
    document.documentElement.lang = store.lang === 'cz' ? 'cs' : 'ru';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
    document.querySelectorAll('[data-lang]').forEach(b => {
        b.classList.toggle('ghost', b.dataset.lang !== store.lang);
    });
    $('btnSound').textContent = store.sound ? tr('on') : tr('off');
    $('btnVoice').textContent = store.voice ? tr('on') : tr('off');
    $('btnVibe').textContent = store.vibe ? tr('on') : tr('off');
    $('rowVibe').style.display = navigator.vibrate ? '' : 'none';
    $('btnReset').textContent = tr('reset');
    renderLevels();
}

/* ===================== ПРИВЯЗКА СОБЫТИЙ ===================== */
function bind() {
    $('btnPlay').addEventListener('click', () => { initAudio(); enterFs(); openLevels(); });
    $('btnSettings').addEventListener('click', () => showScreen('settings'));
    $('levelsBack').addEventListener('click', () => { setTheme('menu'); setBg(null); showScreen('menu'); });
    $('settingsBack').addEventListener('click', () => showScreen('menu'));

    document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
        store.lang = b.dataset.lang; saveStore(); applyLang();
    }));
    $('btnSound').addEventListener('click', () => {
        store.sound = !store.sound; saveStore(); applyLang();
        if (store.sound) initAudio();
    });
    $('btnVoice').addEventListener('click', () => {
        store.voice = !store.voice; saveStore(); applyLang();
        if (!store.voice) stopVoice();
    });
    $('btnVibe').addEventListener('click', () => {
        store.vibe = !store.vibe; saveStore(); applyLang();
        if (store.vibe) buzz(40);
    });

    $('dialogue').addEventListener('click', advance);
    $('dSkip').addEventListener('click', (e) => { e.stopPropagation(); if (activeScreen() === 'dialogue') endScene(); });

    $('btnPause').addEventListener('click', pauseGame);
    $('btnResume').addEventListener('click', resumeGame);
    $('btnQuit').addEventListener('click', quitToLevels);

    $('resRetry').addEventListener('click', () => startGame(G.lvl));
    $('resLevels').addEventListener('click', () => { setTheme('menu'); setBg(null); openLevels(); });
    $('resNext').addEventListener('click', () => beginLevel(G.lvl + 1));

    $('btnFs').addEventListener('click', toggleFs);
    $('btnFsSet').addEventListener('click', toggleFs);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    let resetTimer = 0;
    $('btnReset').addEventListener('click', () => {
        if (!resetTimer) {
            $('btnReset').textContent = tr('resetSure');
            resetTimer = setTimeout(() => { resetTimer = 0; $('btnReset').textContent = tr('reset'); }, 3000);
            return;
        }
        clearTimeout(resetTimer); resetTimer = 0;
        store.unlocked = 1; store.best = {}; store.seen = {};
        saveStore(); applyLang();
    });

    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => setTimeout(fit, 150));
}

/* ===================== СТАРТ ===================== */
function init() {
    selfCheck();
    loadStore();
    // просим браузер не стирать сохранения (на телефонах он иногда чистит данные сайтов)
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
    fit();
    buildPetals();
    buildLanes();
    bind();
    applyLang();
    setBg(null);
    loadEnemyArt(0);
    showScreen('menu');
}
init();

})();