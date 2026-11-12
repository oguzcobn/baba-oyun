"use strict";
/* Dil: Türkçe (varsayılan) ya da İngilizce (British). T('türkçe', 'english') o anki dile göre seçer. */
const I18N = (() => {
  let lang = 'tr'; try { lang = localStorage.getItem('baba_lang') === 'en' ? 'en' : 'tr'; } catch (e) {}
  const subs = [];
  document.documentElement.lang = lang;
  return {
    get lang() { return lang; }, get locale() { return lang === 'en' ? 'en-GB' : 'tr-TR'; },
    set(l) { l = l === 'en' ? 'en' : 'tr'; if (l === lang) return; lang = l; try { localStorage.setItem('baba_lang', l); } catch (e) {} document.documentElement.lang = l; subs.forEach(f => { try { f(l); } catch (e) { console.error(e); } }); },
    on(f) { subs.push(f); }
  };
})();
const T = (tr, en) => I18N.lang === 'en' ? en : tr;
/* Ses ve konfeti — küçük yardımcılar */
const Snd = (() => {
  let ctx = null, on = true; try { on = localStorage.getItem('snd') !== '0'; } catch (e) {}
  const ac = () => { if (!ctx) try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
  function note(f, d = .1, type = 'sine', v = .05, when = 0) {
    if (!on) return; const a = ac(); if (!a) return; const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .02);
  }
  return {
    note, click: () => note(1200, .04, 'sine', .03), win: () => [523, 659, 784, 1047].forEach((f, i) => note(f, .25, 'triangle', .06, i * .12)),
    toggle() { on = !on; try { localStorage.setItem('snd', on ? '1' : '0'); } catch (e) {} return on; }, get on() { return on; }
  };
})();
const AdvAudio = { note: (f, d, t, v) => Snd.note(f, d, t, v) };   // draft oyunu için
function confetti() {
  const cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv);
  const g = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, C = ['#111', '#ff4d00', '#ffd54a', '#2b59ff', '#00b37e'];
  const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4, r: Math.random() * 6, c: C[Math.floor(Math.random() * C.length)], a: Math.random() * 6 }));
  let t = 0; (function f() { g.clearRect(0, 0, W, H); ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.a += .1; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-4, -2, 8, 4); g.restore(); }); if (++t < 180) requestAnimationFrame(f); else cv.remove(); })();
}
