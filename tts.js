/* ============================================================
 * TW_TTS v2 — Dot Games 공용 음성(TTS) 모듈  (한국어/영어 이중언어)
 *  로보77의 검증된 고급 TTS 로직을 일반화한 표준 모듈.
 *
 *  핵심:
 *   • /api/tts?q=..&tl=ko|en  서버 음성을 조각내 순서대로 재생(언어별)
 *   • 한 번에 하나만(토큰) — 새로 말하면 이전 것 자동 중지
 *   • 실패 시 1회 재시도 → 그래도 실패면: iframe/브라우저음성 불가 시 다음 조각으로,
 *     최상위 창에선 브라우저 음성(언어별 voice)으로 폴백
 *   • 완료 콜백(onEnd) 지원 / 화면 숨김·닫힘 시 자동 정지
 *
 *  사용법:
 *    <script src="/tts.js"></script>
 *    TW_TTS.setLang('ko'|'en');            // 게임 언어에 맞춰 (기본 ko)
 *    TW_TTS.setEnabled(soundOn);           // 소리 on/off
 *    TW_TTS.speak("문구");                  // 말하기 (현재 언어)
 *    TW_TTS.speak("Hello", {lang:'en', onEnd:fn});   // 언어/콜백 지정
 *    TW_TTS.speak("문구", fn);              // (text, onEnd) 형태도 허용
 *    TW_TTS.stop();
 * ============================================================ */
(function () {
  "use strict";
  if (window.TW_TTS) return;

  // 이 스크립트가 로드된 origin 을 감지해 서버 음성 엔드포인트를 정한다.
  //   · 같은 도메인에서 로드(내부 게임): 상대경로 "/api/tts" 유지 → 기존과 100% 동일.
  //   · 다른 도메인에서 로드(커뮤니티 게임이 우리 tts.js 를 절대주소로 로드):
  //     그 스크립트 도메인의 "/api/tts" 절대경로 사용 → 제출자 도메인엔 서버가
  //     없어도 우리 음성 서버로 붙어 음성이 정상 동작(우리 /api/tts 는 CORS 허용).
  //   config({endpoint:...}) 로 수동 지정하면 그 값이 우선.
  function _selfBase() {
    try {
      var s = document.currentScript;
      if (!s) {
        var list = document.getElementsByTagName("script");
        for (var i = list.length - 1; i >= 0; i--) {
          if (list[i].src && /(^|\/)tts\.js(\?|$)/.test(list[i].src)) { s = list[i]; break; }
        }
      }
      if (s && s.src) {
        var u = new URL(s.src, window.location.href);
        if (u.origin && u.origin !== window.location.origin) return u.origin;
      }
    } catch (e) {}
    return "";
  }

  var CFG = {
    endpoint: _selfBase() + "/api/tts",
    maxLen: 190,
    rate: 1.05,
    pitch: 1.0,
    serverFirst: true,          // 서버 음성 우선(표준). false면 최상위 창에서 브라우저 음성 우선
    allowSpeechFallback: true,  // 브라우저 음성 폴백 허용(iframe에선 자동 비활성)
    retry: true                 // 서버 오디오 1회 재시도
  };
  var enabled = true;
  var lang = "ko";
  var koVoice = null, enVoice = null;
  var _cur = null, _tok = 0;

  function inFrame(){ try { return window.self !== window.top; } catch (e) { return true; } }
  function hasSS(){ return !!(typeof window.speechSynthesis !== "undefined" && window.speechSynthesis); }
  function voices(){ return (hasSS() ? window.speechSynthesis.getVoices() : []) || []; }
  function nov(v, list){ return list.some(function (x) { return v.name && v.name.indexOf(x) > -1; }); }

  var KO_NOV = ['Eddy','Flo','Grandma','Grandpa','Reed','Rocko','Sandy','Shelley','Bubbles','Jester','Superstar','Trinoids','Bells','Boing','Bahh','Wobble','Cellos','Organ','Zarvox','Whisper','Albert','Bad News','Good News','Junior','Kathy','Ralph'];
  var EN_NOV = ['Novelty','Bad News','Good News','Bubbles','Jester','Trinoids','Whisper','Zarvox','Albert','Wobble','Bahh','Boing','Bells','Cellos','Deranged','Hysterical','Organ','Superstar'];

  function pickKo(){
    var vs = voices(); if (!vs.length) return;
    var ko = function (v) { return v.lang && v.lang.toLowerCase().indexOf('ko') === 0; };
    var v = vs.find(function (x) { return ko(x) && ['Yuna','유나','Heami','SunHi'].some(function (n) { return x.name && x.name.indexOf(n) > -1; }); })
         || vs.find(function (x) { return ko(x) && x.localService && !nov(x, KO_NOV); })
         || vs.find(function (x) { return ko(x) && x.name && x.name.indexOf('Google 한국') > -1; })
         || vs.find(function (x) { return ko(x) && !nov(x, KO_NOV); })
         || vs.find(ko);
    if (v) koVoice = v;
  }
  function pickEn(){
    var vs = voices(); if (!vs.length) return;
    if (enVoice && vs.indexOf(enVoice) !== -1) return;
    var en = function (v) { return v.lang && v.lang.toLowerCase().indexOf('en') === 0; };
    enVoice =
      vs.find(function (v) { return en(v) && ['Samantha','Google US English','Microsoft Aria','Microsoft Jenny','Aria','Jenny'].some(function (x) { return v.name && v.name.indexOf(x) > -1; }); })
      || vs.find(function (v) { return en(v) && v.lang.toLowerCase() === 'en-us' && v.localService && !nov(v, EN_NOV); })
      || vs.find(function (v) { return en(v) && v.localService && !nov(v, EN_NOV); })
      || vs.find(function (v) { return en(v) && !nov(v, EN_NOV); })
      || vs.find(en) || enVoice;
  }
  if (hasSS()) {
    try {
      pickKo(); pickEn();
      window.speechSynthesis.onvoiceschanged = function () { pickKo(); pickEn(); };
      var _vt = 0, _vi = setInterval(function () { pickKo(); pickEn(); if ((koVoice && enVoice) || ++_vt > 40) clearInterval(_vi); }, 120);
    } catch (e) {}
  }

  function split(s, m){
    if (s.length <= m) return [s];
    var out = [], r = s, seps = ['. ','! ','? ','\n',', ',' '];
    while (r.length > m) {
      var cut = m;
      for (var i = 0; i < seps.length; i++) {
        var idx = r.lastIndexOf(seps[i], m);
        if (idx > m * 0.4) { cut = idx + seps[i].length; break; }
      }
      out.push(r.slice(0, cut).trim());
      r = r.slice(cut).trim();
    }
    if (r) out.push(r);
    return out.filter(function (x) { return x; });
  }

  function applyVoice(u, lg){
    if (lg === 'en') { u.lang = 'en-US'; if (!enVoice) pickEn(); if (enVoice) u.voice = enVoice; }
    else { u.lang = 'ko-KR'; if (!koVoice) pickKo(); if (koVoice) u.voice = koVoice; }
    u.rate = CFG.rate; u.pitch = CFG.pitch;
  }

  function speakSpeech(text, lg, onEnd){
    if (!hasSS()) { if (onEnd) onEnd(); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      applyVoice(u, lg);
      if (onEnd) u.onend = onEnd;
      window.speechSynthesis.speak(u);
    } catch (e) { if (onEnd) onEnd(); }
  }

  function playServer(queue, tok, lg, onEnd, isRetry){
    if (tok !== _tok) return;
    if (!queue.length) { if (onEnd) onEnd(); return; }
    var seg = queue[0];
    var url = CFG.endpoint + '?q=' + encodeURIComponent(seg) + '&tl=' + (lg === 'en' ? 'en' : 'ko');
    var a = new Audio(url); _cur = a; var done = false;
    var onFail = function () {
      if (done || tok !== _tok) return; done = true;
      if (CFG.retry && !isRetry) { setTimeout(function () { playServer(queue, tok, lg, onEnd, true); }, 250); return; }
      var rest = queue.slice(1);
      if (inFrame() || !hasSS() || !CFG.allowSpeechFallback) { playServer(rest, tok, lg, onEnd, false); return; }
      speakSpeech([seg].concat(rest).join(' '), lg, onEnd);
    };
    a.onended = function () { if (done || tok !== _tok) return; done = true; playServer(queue.slice(1), tok, lg, onEnd, false); };
    a.onerror = onFail;
    a.play().catch(onFail);
  }

  function stop(){
    _tok++;
    if (_cur) { try { _cur.pause(); _cur.src = ''; } catch (e) {} _cur = null; }
    if (hasSS()) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  }

  function speak(text, opts){
    if (!enabled || !text) return;
    var onEnd;
    if (typeof opts === 'function') { onEnd = opts; opts = {}; }
    else { opts = opts || {}; onEnd = opts.onEnd; }
    var lg = (opts.lang === 'en' || opts.lang === 'ko') ? opts.lang : lang;
    _tok++; var tok = _tok;
    if (_cur) { try { _cur.pause(); _cur.src = ''; } catch (e) {} _cur = null; }
    if (hasSS()) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    if (CFG.serverFirst || inFrame()) {
      playServer(split(String(text), CFG.maxLen).slice(), tok, lg, onEnd, false);
    } else {
      speakSpeech(String(text), lg, onEnd);
    }
  }

  try {
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  } catch (e) {}

  window.TW_TTS = {
    speak: speak,
    stop: stop,
    setLang: function (lg) { if (lg === 'en' || lg === 'ko') lang = lg; },
    getLang: function () { return lang; },
    setEnabled: function (on) { enabled = !!on; if (!enabled) stop(); },
    isEnabled: function () { return enabled; },
    config: function (o) { if (o) for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) CFG[k] = o[k]; return CFG; }
  };
})();
