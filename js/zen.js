/**
 * zen.js - Zen mode functions
 * Handles distraction-free browsing with clock display, greeting, daily focus,
 * ambient animations, and search.
 */

// ============================================================
// Greeting System
// ============================================================

const ZEN_GREETINGS = {
    en: [
        { start: 5, end: 12, text: 'Good morning' },
        { start: 12, end: 17, text: 'Good afternoon' },
        { start: 17, end: 21, text: 'Good evening' },
        { start: 21, end: 5, text: 'Good night' }
    ],
    sv: [
        { start: 5, end: 12, text: 'God morgon' },
        { start: 12, end: 17, text: 'God eftermiddag' },
        { start: 17, end: 21, text: 'God kväll' },
        { start: 21, end: 5, text: 'God natt' }
    ],
    de: [
        { start: 5, end: 12, text: 'Guten Morgen' },
        { start: 12, end: 17, text: 'Guten Tag' },
        { start: 17, end: 21, text: 'Guten Abend' },
        { start: 21, end: 5, text: 'Gute Nacht' }
    ],
    fr: [
        { start: 5, end: 12, text: 'Bonjour' },
        { start: 12, end: 17, text: 'Bon après-midi' },
        { start: 17, end: 21, text: 'Bonsoir' },
        { start: 21, end: 5, text: 'Bonne nuit' }
    ],
    es: [
        { start: 5, end: 12, text: 'Buenos días' },
        { start: 12, end: 17, text: 'Buenas tardes' },
        { start: 17, end: 21, text: 'Buenas tardes' },
        { start: 21, end: 5, text: 'Buenas noches' }
    ],
    no: [
        { start: 5, end: 12, text: 'God morgen' },
        { start: 12, end: 17, text: 'God ettermiddag' },
        { start: 17, end: 21, text: 'God kveld' },
        { start: 21, end: 5, text: 'God natt' }
    ],
    da: [
        { start: 5, end: 12, text: 'God morgen' },
        { start: 12, end: 17, text: 'God eftermiddag' },
        { start: 17, end: 21, text: 'God aften' },
        { start: 21, end: 5, text: 'God nat' }
    ],
    fi: [
        { start: 5, end: 12, text: 'Hyvää huomenta' },
        { start: 12, end: 17, text: 'Hyvää iltapäivää' },
        { start: 17, end: 21, text: 'Hyvää iltaa' },
        { start: 21, end: 5, text: 'Hyvää yötä' }
    ],
    pt: [
        { start: 5, end: 12, text: 'Bom dia' },
        { start: 12, end: 17, text: 'Boa tarde' },
        { start: 17, end: 21, text: 'Boa noite' },
        { start: 21, end: 5, text: 'Boa noite' }
    ],
    it: [
        { start: 5, end: 12, text: 'Buongiorno' },
        { start: 12, end: 17, text: 'Buon pomeriggio' },
        { start: 17, end: 21, text: 'Buonasera' },
        { start: 21, end: 5, text: 'Buonanotte' }
    ],
    nl: [
        { start: 5, end: 12, text: 'Goedemorgen' },
        { start: 12, end: 17, text: 'Goedemiddag' },
        { start: 17, end: 21, text: 'Goedenavond' },
        { start: 21, end: 5, text: 'Goedenacht' }
    ],
    pl: [
        { start: 5, end: 12, text: 'Dzień dobry' },
        { start: 12, end: 17, text: 'Dzień dobry' },
        { start: 17, end: 21, text: 'Dobry wieczór' },
        { start: 21, end: 5, text: 'Dobranoc' }
    ],
    ru: [
        { start: 5, end: 12, text: 'Доброе утро' },
        { start: 12, end: 17, text: 'Добрый день' },
        { start: 17, end: 21, text: 'Добрый вечер' },
        { start: 21, end: 5, text: 'Доброй ночи' }
    ],
    uk: [
        { start: 5, end: 12, text: 'Доброго ранку' },
        { start: 12, end: 17, text: 'Добрий день' },
        { start: 17, end: 21, text: 'Добрий вечір' },
        { start: 21, end: 5, text: 'Доброї ночі' }
    ],
    ja: [
        { start: 5, end: 12, text: 'おはようございます' },
        { start: 12, end: 17, text: 'こんにちは' },
        { start: 17, end: 21, text: 'こんばんは' },
        { start: 21, end: 5, text: 'おやすみなさい' }
    ],
    zh: [
        { start: 5, end: 12, text: '早上好' },
        { start: 12, end: 17, text: '下午好' },
        { start: 17, end: 21, text: '晚上好' },
        { start: 21, end: 5, text: '晚安' }
    ],
    ko: [
        { start: 5, end: 12, text: '좋은 아침이에요' },
        { start: 12, end: 17, text: '좋은 오후에요' },
        { start: 17, end: 21, text: '좋은 저녁이에요' },
        { start: 21, end: 5, text: '좋은 밤이에요' }
    ],
    ar: [
        { start: 5, end: 12, text: 'صباح الخير' },
        { start: 12, end: 17, text: 'مساء الخير' },
        { start: 17, end: 21, text: 'مساء الخير' },
        { start: 21, end: 5, text: 'تصبح على خير' }
    ],
    hi: [
        { start: 5, end: 12, text: 'सुप्रभात' },
        { start: 12, end: 17, text: 'नमस्ते' },
        { start: 17, end: 21, text: 'शुभ संध्या' },
        { start: 21, end: 5, text: 'शुभ रात्रि' }
    ],
    bn: [
        { start: 5, end: 12, text: 'সুপ্রভাত' },
        { start: 12, end: 17, text: 'শুভ অপরাহ্ন' },
        { start: 17, end: 21, text: 'শুভ সন্ধ্যা' },
        { start: 21, end: 5, text: 'শুভ রাত্রি' }
    ],
    tr: [
        { start: 5, end: 12, text: 'Günaydın' },
        { start: 12, end: 17, text: 'İyi günler' },
        { start: 17, end: 21, text: 'İyi akşamlar' },
        { start: 21, end: 5, text: 'İyi geceler' }
    ],
    vi: [
        { start: 5, end: 12, text: 'Chào buổi sáng' },
        { start: 12, end: 17, text: 'Chào buổi chiều' },
        { start: 17, end: 21, text: 'Chào buổi tối' },
        { start: 21, end: 5, text: 'Chúc ngủ ngon' }
    ],
    th: [
        { start: 5, end: 12, text: 'สวัสดีตอนเช้า' },
        { start: 12, end: 17, text: 'สวัสดีตอนบ่าย' },
        { start: 17, end: 21, text: 'สวัสดีตอนเย็น' },
        { start: 21, end: 5, text: 'ราตรีสวัสดิ์' }
    ],
    id: [
        { start: 5, end: 12, text: 'Selamat pagi' },
        { start: 12, end: 17, text: 'Selamat siang' },
        { start: 17, end: 21, text: 'Selamat sore' },
        { start: 21, end: 5, text: 'Selamat malam' }
    ],
    ms: [
        { start: 5, end: 12, text: 'Selamat pagi' },
        { start: 12, end: 17, text: 'Selamat tengah hari' },
        { start: 17, end: 21, text: 'Selamat petang' },
        { start: 21, end: 5, text: 'Selamat malam' }
    ],
    tl: [
        { start: 5, end: 12, text: 'Magandang umaga' },
        { start: 12, end: 17, text: 'Magandang hapon' },
        { start: 17, end: 21, text: 'Magandang gabi' },
        { start: 21, end: 5, text: 'Magandang gabi' }
    ],
    cs: [
        { start: 5, end: 12, text: 'Dobré ráno' },
        { start: 12, end: 17, text: 'Dobré odpoledne' },
        { start: 17, end: 21, text: 'Dobrý večer' },
        { start: 21, end: 5, text: 'Dobrou noc' }
    ],
    sk: [
        { start: 5, end: 12, text: 'Dobré ráno' },
        { start: 12, end: 17, text: 'Dobré popoludnie' },
        { start: 17, end: 21, text: 'Dobrý večer' },
        { start: 21, end: 5, text: 'Dobrú noc' }
    ],
    hu: [
        { start: 5, end: 12, text: 'Jó reggelt' },
        { start: 12, end: 17, text: 'Jó napot' },
        { start: 17, end: 21, text: 'Jó estét' },
        { start: 21, end: 5, text: 'Jó éjszakát' }
    ],
    ro: [
        { start: 5, end: 12, text: 'Bună dimineața' },
        { start: 12, end: 17, text: 'Bună ziua' },
        { start: 17, end: 21, text: 'Bună seara' },
        { start: 21, end: 5, text: 'Noapte bună' }
    ],
    bg: [
        { start: 5, end: 12, text: 'Добро утро' },
        { start: 12, end: 17, text: 'Добър ден' },
        { start: 17, end: 21, text: 'Добър вечер' },
        { start: 21, end: 5, text: 'Лека нощ' }
    ],
    hr: [
        { start: 5, end: 12, text: 'Dobro jutro' },
        { start: 12, end: 17, text: 'Dobar dan' },
        { start: 17, end: 21, text: 'Dobra večer' },
        { start: 21, end: 5, text: 'Laku noć' }
    ],
    sr: [
        { start: 5, end: 12, text: 'Добро јутро' },
        { start: 12, end: 17, text: 'Добар дан' },
        { start: 17, end: 21, text: 'Добро вече' },
        { start: 21, end: 5, text: 'Лаку ноћ' }
    ],
    sl: [
        { start: 5, end: 12, text: 'Dobro jutro' },
        { start: 12, end: 17, text: 'Dober dan' },
        { start: 17, end: 21, text: 'Dober večer' },
        { start: 21, end: 5, text: 'Lahko noč' }
    ],
    el: [
        { start: 5, end: 12, text: 'Καλημέρα' },
        { start: 12, end: 17, text: 'Καλό απόγευμα' },
        { start: 17, end: 21, text: 'Καλησπέρα' },
        { start: 21, end: 5, text: 'Καληνύχτα' }
    ],
    he: [
        { start: 5, end: 12, text: 'בוקר טוב' },
        { start: 12, end: 17, text: 'צהריים טובים' },
        { start: 17, end: 21, text: 'ערב טוב' },
        { start: 21, end: 5, text: 'לילה טוב' }
    ],
    fa: [
        { start: 5, end: 12, text: 'صبح بخیر' },
        { start: 12, end: 17, text: 'بعدازظهر بخیر' },
        { start: 17, end: 21, text: 'عصر بخیر' },
        { start: 21, end: 5, text: 'شب بخیر' }
    ],
    sw: [
        { start: 5, end: 12, text: 'Habari za asubuhi' },
        { start: 12, end: 17, text: 'Habari za mchana' },
        { start: 17, end: 21, text: 'Habari za jioni' },
        { start: 21, end: 5, text: 'Usiku mwema' }
    ],
    ca: [
        { start: 5, end: 12, text: 'Bon dia' },
        { start: 12, end: 17, text: 'Bona tarda' },
        { start: 17, end: 21, text: 'Bona nit' },
        { start: 21, end: 5, text: 'Bona nit' }
    ],
    et: [
        { start: 5, end: 12, text: 'Tere hommikust' },
        { start: 12, end: 17, text: 'Tere päevast' },
        { start: 17, end: 21, text: 'Tere õhtust' },
        { start: 21, end: 5, text: 'Head ööd' }
    ],
    lv: [
        { start: 5, end: 12, text: 'Labrīt' },
        { start: 12, end: 17, text: 'Labdien' },
        { start: 17, end: 21, text: 'Labvakar' },
        { start: 21, end: 5, text: 'Ar labu nakti' }
    ],
    lt: [
        { start: 5, end: 12, text: 'Labas rytas' },
        { start: 12, end: 17, text: 'Laba diena' },
        { start: 17, end: 21, text: 'Labas vakaras' },
        { start: 21, end: 5, text: 'Labos nakties' }
    ],
    is: [
        { start: 5, end: 12, text: 'Góðan daginn' },
        { start: 12, end: 17, text: 'Góðan daginn' },
        { start: 17, end: 21, text: 'Gott kvöld' },
        { start: 21, end: 5, text: 'Góða nótt' }
    ]
};

const ZEN_FOCUS_PLACEHOLDERS = {
    en: 'What is your focus today?',
    sv: 'Vad är ditt fokus idag?',
    de: 'Was ist dein Fokus heute?',
    fr: 'Quel est votre objectif aujourd\u2019hui\u00a0?',
    es: '\u00bfCuál es tu enfoque hoy?',
    no: 'Hva er ditt fokus i dag?',
    da: 'Hvad er dit fokus i dag?',
    fi: 'Mikä on fokuksesi tänään?',
    pt: 'Qual é o seu foco hoje?',
    it: 'Qual è il tuo obiettivo oggi?',
    nl: 'Waar ligt je focus vandaag?',
    pl: 'Na czym się dziś skupiasz?',
    ru: 'На чём ваш фокус сегодня?',
    uk: 'На чому ваш фокус сьогодні?',
    ja: '今日の目標は？',
    zh: '今天的重点是什么？',
    ko: '오늘의 집중 목표는?',
    ar: 'ما هو تركيزك اليوم؟',
    hi: 'आज आपका ध्यान किस पर है?',
    bn: 'আজ আপনার লক্ষ্য কী?',
    tr: 'Bugünkü odağın ne?',
    vi: 'Hôm nay bạn tập trung vào gì?',
    th: 'วันนี้คุณโฟกัสอะไร?',
    id: 'Apa fokus Anda hari ini?',
    ms: 'Apakah fokus anda hari ini?',
    tl: 'Ano ang pokus mo ngayon?',
    cs: 'Na co se dnes zaměříte?',
    sk: 'Na čo sa dnes zameriavate?',
    hu: 'Mi a mai célod?',
    ro: 'Care este focusul tău azi?',
    bg: 'Какъв е фокусът ви днес?',
    hr: 'Koji je tvoj fokus danas?',
    sr: 'Који је ваш фокус данас?',
    sl: 'Kaj je vaš fokus danes?',
    el: 'Ποιος είναι ο στόχος σου σήμερα;',
    he: 'מה המיקוד שלך היום?',
    fa: 'تمرکز شما امروز چیست؟',
    sw: 'Lengo lako la leo ni nini?',
    ca: 'Quin és el teu focus avui?',
    et: 'Mis on sinu tänane fookus?',
    lv: 'Kas ir tavs fokuss šodien?',
    lt: 'Koks jūsų tikslas šiandien?',
    is: 'Hver er áherslan þín í dag?'
};

function getZenLocale() {
    const config = bookmarkManagerData.zenConfig || {};
    let locale = config.greetingLocale || 'auto';
    if (locale === 'auto') {
        const browserLang = (navigator.language || 'en').substring(0, 2).toLowerCase();
        locale = ZEN_GREETINGS[browserLang] ? browserLang : 'en';
    }
    return locale;
}

function getZenGreeting() {
    const locale = getZenLocale();
    const greetings = ZEN_GREETINGS[locale] || ZEN_GREETINGS['en'];
    const hour = new Date().getHours();

    for (const g of greetings) {
        if (g.start < g.end) {
            if (hour >= g.start && hour < g.end) return g.text;
        } else {
            // Wraps around midnight (e.g., 21-5)
            if (hour >= g.start || hour < g.end) return g.text;
        }
    }
    return greetings[0].text;
}

// ============================================================
// Daily Focus
// ============================================================

function loadZenDailyFocus() {
    try {
        const stored = localStorage.getItem('zenDailyFocus');
        if (!stored) return '';
        const data = JSON.parse(stored);
        const today = new Date().toISOString().substring(0, 10);
        if (data.date === today) return data.text || '';
        return '';
    } catch {
        return '';
    }
}

function saveZenDailyFocus(text) {
    const today = new Date().toISOString().substring(0, 10);
    localStorage.setItem('zenDailyFocus', JSON.stringify({ text, date: today }));
}

function initZenFocus() {
    // Clean up previous listeners first
    cleanupZenFocusListeners();

    const input = document.getElementById('zenFocusInput');
    const clearBtn = document.getElementById('zenFocusClear');
    if (!input) return;

    // Set localized placeholder
    const locale = getZenLocale();
    input.placeholder = ZEN_FOCUS_PLACEHOLDERS[locale] || ZEN_FOCUS_PLACEHOLDERS['en'];

    const savedFocus = loadZenDailyFocus();
    if (savedFocus) {
        input.value = savedFocus;
        input.classList.add('committed');
        input.readOnly = true;
        if (clearBtn) clearBtn.style.display = 'block';
    } else {
        input.value = '';
        input.classList.remove('committed');
        input.readOnly = false;
        if (clearBtn) clearBtn.style.display = 'none';
    }

    function commitFocus() {
        const text = input.value.trim();
        if (text) {
            input.classList.add('committed');
            input.readOnly = true;
            if (clearBtn) clearBtn.style.display = 'block';
            saveZenDailyFocus(text);
        }
    }

    // Commit on Enter
    zenFocusKeydownListener = function(e) {
        e.stopPropagation(); // Prevent zen keyboard handler from stealing input
        if (e.key === 'Enter') {
            e.preventDefault();
            commitFocus();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            input.blur();
            const zenSearchBox = document.getElementById('zenSearchBox');
            if (zenSearchBox) zenSearchBox.focus();
        }
    };
    input.addEventListener('keydown', zenFocusKeydownListener);

    // Commit on blur
    zenFocusBlurListener = function() {
        if (input.value.trim()) {
            commitFocus();
        }
    };
    input.addEventListener('blur', zenFocusBlurListener);

    // Click on committed focus to re-edit
    zenFocusClickListener = function() {
        if (input.classList.contains('committed')) {
            input.classList.remove('committed');
            input.readOnly = false;
            input.focus();
        }
    };
    input.addEventListener('click', zenFocusClickListener);

    // Clear button
    if (clearBtn) {
        zenFocusClearClickListener = function(e) {
            e.stopPropagation();
            input.value = '';
            input.classList.remove('committed');
            input.readOnly = false;
            clearBtn.style.display = 'none';
            saveZenDailyFocus('');
            input.focus();
        };
        clearBtn.addEventListener('click', zenFocusClearClickListener);
    }
}

function cleanupZenFocusListeners() {
    const input = document.getElementById('zenFocusInput');
    const clearBtn = document.getElementById('zenFocusClear');

    if (input) {
        if (zenFocusKeydownListener) {
            input.removeEventListener('keydown', zenFocusKeydownListener);
            zenFocusKeydownListener = null;
        }
        if (zenFocusBlurListener) {
            input.removeEventListener('blur', zenFocusBlurListener);
            zenFocusBlurListener = null;
        }
        if (zenFocusClickListener) {
            input.removeEventListener('click', zenFocusClickListener);
            zenFocusClickListener = null;
        }
    }
    if (clearBtn && zenFocusClearClickListener) {
        clearBtn.removeEventListener('click', zenFocusClearClickListener);
        zenFocusClearClickListener = null;
    }
}

// ============================================================
// Font Application
// ============================================================

const ZEN_FONT_MAP = {
    system: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    serif: "'Playfair Display', 'Georgia', 'Times New Roman', serif",
    handwritten: "'Caveat', 'Segoe Script', cursive"
};

function applyZenClockFont() {
    const config = bookmarkManagerData.zenConfig || {};
    const fontKey = config.clockFont || 'system';
    const fontFamily = ZEN_FONT_MAP[fontKey] || ZEN_FONT_MAP.system;

    const elements = document.querySelectorAll('.zen-time, .zen-date, .zen-greeting');
    elements.forEach(el => {
        el.style.fontFamily = fontFamily;
    });
}

// ============================================================
// Analog Clock
// ============================================================

function drawAnalogClock(canvas, date) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;

    const isDark = document.body.classList.contains('dark-mode');
    const fgColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';
    const fgColorLight = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)';
    const accentColor = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)';

    ctx.clearRect(0, 0, size, size);

    // Hour markers (dots)
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6 - Math.PI / 2;
        const isMain = i % 3 === 0;
        const dotRadius = isMain ? 3 : 1.5;
        const dist = radius - 5;
        ctx.beginPath();
        ctx.arc(
            center + Math.cos(angle) * dist,
            center + Math.sin(angle) * dist,
            dotRadius, 0, Math.PI * 2
        );
        ctx.fillStyle = isMain ? fgColor : fgColorLight;
        ctx.fill();
    }

    const hours = date.getHours() % 12;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    // Hour hand
    const hourAngle = ((hours + minutes / 60) * Math.PI) / 6 - Math.PI / 2;
    drawHand(ctx, center, hourAngle, radius * 0.5, 3, fgColor);

    // Minute hand
    const minuteAngle = ((minutes + seconds / 60) * Math.PI) / 30 - Math.PI / 2;
    drawHand(ctx, center, minuteAngle, radius * 0.75, 2, fgColor);

    // Second hand (if enabled)
    const config = bookmarkManagerData.zenConfig || {};
    if (config.showSeconds) {
        const secondAngle = (seconds * Math.PI) / 30 - Math.PI / 2;
        drawHand(ctx, center, secondAngle, radius * 0.85, 1, accentColor);
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(center, center, 3, 0, Math.PI * 2);
    ctx.fillStyle = fgColor;
    ctx.fill();
}

function drawHand(ctx, center, angle, length, width, color) {
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(
        center + Math.cos(angle) * length,
        center + Math.sin(angle) * length
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
}

// ============================================================
// Ambient Animations
// ============================================================

function startZenAmbient() {
    stopZenAmbient();
    const config = bookmarkManagerData.zenConfig || {};
    const animation = config.ambientAnimation || 'none';
    const container = document.getElementById('zenAmbientCanvas');
    if (!container || animation === 'none') return;

    container.style.display = 'block';

    if (animation === 'gradient') {
        startGradientAnimation(container);
    } else if (animation === 'particles') {
        startParticleAnimation(container);
    }
}

function stopZenAmbient() {
    if (zenAmbientAnimationFrame) {
        cancelAnimationFrame(zenAmbientAnimationFrame);
        zenAmbientAnimationFrame = null;
    }
    if (zenParticleResizeListener) {
        window.removeEventListener('resize', zenParticleResizeListener);
        zenParticleResizeListener = null;
    }
    const container = document.getElementById('zenAmbientCanvas');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

function startGradientAnimation(container) {
    container.innerHTML = '';
    container.style.background = '';

    let hue = Math.random() * 360;

    function animate() {
        const isDark = document.body.classList.contains('dark-mode');
        hue = (hue + 0.15) % 360;
        const opacity = isDark ? 0.25 : 0.18;
        const lightness = isDark ? 30 : 65;
        container.style.background = `linear-gradient(${hue}deg,
            hsla(${hue}, 70%, ${lightness}%, ${opacity}),
            hsla(${(hue + 90) % 360}, 70%, ${lightness}%, ${opacity * 0.7}),
            hsla(${(hue + 180) % 360}, 70%, ${lightness}%, ${opacity}))`;
        zenAmbientAnimationFrame = requestAnimationFrame(animate);
    }
    zenAmbientAnimationFrame = requestAnimationFrame(animate);
}

function startParticleAnimation(container) {
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const particleCount = 30;
    const particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    zenParticleResizeListener = resize;
    window.addEventListener('resize', zenParticleResizeListener);

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 3 + 1.5,
            opacity: Math.random() * 0.25 + 0.08
        });
    }

    function animate() {
        const isDark = document.body.classList.contains('dark-mode');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around edges
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = isDark
                ? `rgba(255, 255, 255, ${p.opacity})`
                : `rgba(0, 0, 0, ${p.opacity})`;
            ctx.fill();
        }

        zenAmbientAnimationFrame = requestAnimationFrame(animate);
    }
    zenAmbientAnimationFrame = requestAnimationFrame(animate);
}

// ============================================================
// Core Zen Mode Functions
// ============================================================

// Start zen mode
function startZenMode() {
    zenUserHasScrolled = false;

    updateZenDateTime();
    zenDateTimeInterval = setInterval(updateZenDateTime, 1000);

    zenScrollListener = debounce(handleZenScroll, 50);
    window.addEventListener('scroll', zenScrollListener, { passive: true });

    zenSearchListener = handleZenSearch;
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('input', zenSearchListener);
    }

    const zenSearchBox = document.getElementById('zenSearchBox');
    if (zenSearchBox) {
        zenSearchBoxInputListener = function(event) {
            const searchValue = event.target.value;
            const mainSearchBox = document.getElementById('searchBox');

            mainSearchBox.value = searchValue;

            if (searchValue.trim().length > 0) {
                document.body.classList.remove('zen-mode');
                stopZenMode();

                mainSearchBox.dispatchEvent(new Event("input", { bubbles: true }));

                setTimeout(() => {
                    mainSearchBox.focus();
                    mainSearchBox.setSelectionRange(searchValue.length, searchValue.length);
                }, 100);
            }
        };
        zenSearchBox.addEventListener('input', zenSearchBoxInputListener);

        zenSearchBoxKeydownListener = function(event) {
            if (event.key === 'Enter') {
                const searchTerm = this.value.trim();
                if (searchTerm.startsWith('?') && searchTerm.length > 1) {
                    const googleQuery = searchTerm.substring(1);
                    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;

                    if (bookmarkManagerData.openInNewTab) {
                        window.open(googleUrl, '_blank');
                    } else {
                        window.location.href = googleUrl;
                    }

                    this.value = '';
                    document.body.classList.remove('zen-mode');
                    stopZenMode();
                    event.preventDefault();
                } else if (searchTerm.startsWith('!') && searchTerm.length > 1) {
                    const chatGptQuery = searchTerm.substring(1);
                    const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(chatGptQuery)}`;

                    if (bookmarkManagerData.openInNewTab) {
                        window.open(chatGptUrl, '_blank');
                    } else {
                        window.location.href = chatGptUrl;
                    }

                    this.value = '';
                    document.body.classList.remove('zen-mode');
                    stopZenMode();
                    event.preventDefault();
                }
            }
        };
        zenSearchBox.addEventListener('keydown', zenSearchBoxKeydownListener);

        setTimeout(() => {
            zenSearchBox.focus();
        }, 200);
    }

    zenKeyboardListener = handleZenKeyboard;
    document.addEventListener('keydown', zenKeyboardListener);

    zenClickListener = handleZenClick;
    document.addEventListener('click', zenClickListener);

    const zenDateTime = document.getElementById('zenDateTime');
    if (zenDateTime) {
        zenDateTime.style.display = 'flex';
    }

    // Initialize new zen features
    applyZenClockFont();
    startZenAmbient();
    initZenFocus();
}

// Stop zen mode
function stopZenMode() {
    zenUserHasScrolled = false;

    if (zenDateTimeInterval) {
        clearInterval(zenDateTimeInterval);
        zenDateTimeInterval = null;
    }

    if (zenScrollListener) {
        window.removeEventListener('scroll', zenScrollListener);
        zenScrollListener = null;
    }

    if (zenSearchListener) {
        const searchBox = document.getElementById('searchBox');
        if (searchBox) {
            searchBox.removeEventListener('input', zenSearchListener);
        }

        zenSearchListener = null;
    }

    const zenSearchBox = document.getElementById('zenSearchBox');
    if (zenSearchBox) {
        if (zenSearchBoxInputListener) {
            zenSearchBox.removeEventListener('input', zenSearchBoxInputListener);
            zenSearchBoxInputListener = null;
        }
        if (zenSearchBoxKeydownListener) {
            zenSearchBox.removeEventListener('keydown', zenSearchBoxKeydownListener);
            zenSearchBoxKeydownListener = null;
        }
    }

    if (zenKeyboardListener) {
        document.removeEventListener('keydown', zenKeyboardListener);
        zenKeyboardListener = null;
    }

    if (zenClickListener) {
        document.removeEventListener('click', zenClickListener);
        zenClickListener = null;
    }

    const zenDateTime = document.getElementById('zenDateTime');
    if (zenDateTime) {
        zenDateTime.style.display = 'none';
    }

    const collections = document.getElementById('collections');
    if (collections) {
        collections.style.marginTop = '';
    }
    document.body.classList.remove('scrolled', 'searching');

    // Stop ambient animation
    stopZenAmbient();

    // Clean up focus input listeners
    cleanupZenFocusListeners();
}

// Update zen mode clock display
function updateZenDateTime() {
    const currentDate = new Date();
    const timeElement = document.querySelector('.zen-time');
    const dateElement = document.querySelector('.zen-date');
    const greetingElement = document.querySelector('.zen-greeting');
    const analogCanvas = document.getElementById('zenAnalogClock');

    if (!timeElement || !dateElement) {
        if (zenDateTimeInterval) {
            clearInterval(zenDateTimeInterval);
            zenDateTimeInterval = null;
        }
        return;
    }

    const config = bookmarkManagerData.zenConfig || {};

    // Greeting
    if (greetingElement) {
        if (config.greetingEnabled !== false) {
            greetingElement.textContent = getZenGreeting();
            greetingElement.style.display = '';
        } else {
            greetingElement.textContent = '';
            greetingElement.style.display = 'none';
        }
    }

    // Clock
    const isAnalog = config.clockStyle === 'analog';

    if (isAnalog) {
        timeElement.style.display = 'none';
        if (analogCanvas) {
            analogCanvas.style.display = 'block';
            drawAnalogClock(analogCanvas, currentDate);
        }
    } else {
        timeElement.style.display = '';
        if (analogCanvas) analogCanvas.style.display = 'none';

        const is12h = config.clockFormat === '12h';
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: is12h
        };
        if (config.showSeconds) {
            timeOptions.second = '2-digit';
        }
        timeElement.textContent = currentDate.toLocaleTimeString(undefined, timeOptions);
    }

    // Date
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    dateElement.textContent = currentDate.toLocaleDateString(undefined, dateOptions);
}

// Handle scroll in zen mode
function handleZenScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const collections = document.getElementById('collections');

    if (scrollPosition > 50) {
        zenUserHasScrolled = true;
        if (collections) {
            collections.style.marginTop = '0';
        }
        document.body.classList.add('scrolled');
    } else {
        const searchBox = document.getElementById('searchBox');
        const isSearching = searchBox && searchBox.value.trim().length > 0;

        if (document.body.classList.contains('zen-mode') && collections && !isSearching && !zenUserHasScrolled) {
            collections.style.marginTop = '100vh';
        }

        if (!zenUserHasScrolled) {
            document.body.classList.remove('scrolled');
        }
    }
}

// Handle search in zen mode
function handleZenSearch(event) {
    const searchValue = event.target.value.trim();
    const collections = document.getElementById('collections');
    const mainSearchBox = document.getElementById('searchBox');

    if (searchValue.length > 0) {
        if (mainSearchBox) {
            mainSearchBox.value = searchValue;
        }

        applyFilter(searchValue);

        if (collections) {
            collections.style.marginTop = '0';
        }
        document.body.classList.add('searching');

        if (mainSearchBox) {
            setTimeout(() => {
                mainSearchBox.focus();
            }, 100);
        }
    } else {
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        document.body.classList.remove('searching');

        if (mainSearchBox) {
            mainSearchBox.value = '';
        }

        applyFilter('');

        if (document.body.classList.contains('zen-mode') && scrollPosition <= 50 && collections && !zenUserHasScrolled) {
            collections.style.marginTop = '100vh';
            document.body.classList.remove('scrolled');
        }
    }
}

// Handle keyboard events in zen mode
function handleZenKeyboard(event) {
    if (!document.body.classList.contains('zen-mode')) return;

    const activeElement = document.activeElement;
    const isInInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
    );

    if (event.key === 'Escape') {
        event.preventDefault();

        const isSearching = document.body.classList.contains('searching');
        const hasScrolled = zenUserHasScrolled;

        if (isSearching || hasScrolled) {
            const mainSearchBox = document.getElementById('searchBox');
            const zenSearchBox = document.getElementById('zenSearchBox');
            if (mainSearchBox) mainSearchBox.value = '';
            if (zenSearchBox) zenSearchBox.value = '';

            document.body.classList.remove('searching');
            zenUserHasScrolled = false;

            const collections = document.getElementById("collections");
            if (collections) {
                collections.style.marginTop = "100vh";
                document.body.classList.remove('scrolled');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => {
                if (zenSearchBox) {
                    zenSearchBox.focus();
                }
            }, 500);
        } else {
            const zenSearchBox = document.getElementById('zenSearchBox');
            if (zenSearchBox) {
                zenSearchBox.value = '';
                zenSearchBox.focus();
                zenSearchBox.dispatchEvent(new Event('input', { bubbles: true }));
            }

            document.body.classList.remove('searching');
        }
        return;
    }

    const isAlphanumeric = /^[a-zA-Z0-9 #%|]$/.test(event.key);
    if (isAlphanumeric && !isInInput) {
        event.preventDefault();
        const searchBox = getActiveZenSearchBox();
        if (searchBox) {
            searchBox.focus();
            searchBox.value = event.key;
            searchBox.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}

// Handle click events in zen mode (auto-refocus search)
function handleZenClick(event) {
    if (!document.body.classList.contains('zen-mode')) return;

    const target = event.target;

    // Don't refocus if clicking on focus input or its clear button
    if (target.closest('.zen-focus-container')) return;

    const interactiveElements = [
        'INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT', 'OPTION'
    ];

    let element = target;
    let isInteractive = false;

    while (element && element !== document.body) {
        if (interactiveElements.includes(element.tagName) ||
            element.isContentEditable ||
            element.classList.contains('pane-toggle') ||
            element.classList.contains('collection-button')) {
            isInteractive = true;
            break;
        }
        element = element.parentElement;
    }

    if (!isInteractive) {
        setTimeout(() => {
            const searchBox = getActiveZenSearchBox();
            if (searchBox) {
                searchBox.focus();
            }
        }, 10);
    }
}

// Get the appropriate search box for current zen state
function getActiveZenSearchBox() {
    const isScrolled = document.body.classList.contains('scrolled') ||
                      document.body.classList.contains('searching');

    if (isScrolled) {
        return document.getElementById('searchBox');
    } else {
        return document.getElementById('zenSearchBox');
    }
}

// Clear zen search and maintain focus
function clearZenSearch() {
    const searchBox = getActiveZenSearchBox();
    if (searchBox) {
        searchBox.value = '';
        searchBox.focus();
        searchBox.dispatchEvent(new Event('input', { bubbles: true }));
    }

    document.body.classList.remove('searching');
}
