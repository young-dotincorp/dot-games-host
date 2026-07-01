/* ============================================================
 * TW_TTS — Dot Games 공용 음성(TTS) 모듈  (표준: 틱택토 패턴)
 *  • /api/tts 서버 오디오를 조각내 순서대로 재생
 *  • 토큰으로 '한 번에 하나만' 보장(새로 말하면 이전 것 자동 중지)
 *  • 오디오 실패 시 speechSynthesis 폴백 — 단, iframe(임베드)에선 기본 차단
 *  • 화면 숨김/닫힘 시 자동 정지
 *
 *  사용법(게임 쪽):
 *    <script src="/tts.js"></script>            // dot-games-host 루트에 두기
 *    TW_TTS.setEnabled(soundOn);                 // 소리 on/off 상태 전달
 *    TW_TTS.speak("안내 문구");                    // 말하기
 *    TW_TTS.stop();                              // 즉시 멈추기
 *  ※ 게임의 기존 speak(t)는 → function speak(t){ if(soundOn) TW_TTS.speak(t); } 로 얇게 감싸면 됩니다.
 * ============================================================ */
(function () {
  "use strict";
  if (window.TW_TTS) return;

  var CFG = {
    endpoint: "/api/tts",
    maxLen: 190,
    rate: 1.05,
    pitch: 1.0,
    lang: "ko-KR",
    // iframe(임베드) 안에서는 브라우저가 speechSynthesis를 막는 경우가 많아 기본 차단.
    // 최상위 창(직접 접속)에서는 폴백 허용.
    allowSpeechFallback: (window.self === window.top)
  };

  var enabled = true;
  var koVoice = null;
  var _a = null;    // 현재 재생 중인 Audio
  var _tok = 0;     // 중복 재생 차단용 토큰

  var NOV = ['Eddy','Flo','Grandma','Grandpa','Reed','Rocko','Sandy','Shelley','Bubbles','Jester','Superstar','Trinoids','Bells','Boing','Bahh','Wobble','Cellos','Organ','Zarvox','Whisper','Albert','Bad News','Good News','Junior','Kathy','Ralph'];
  function isNov(v){ return NOV.some(function(x){ return v.name && v.name.indexOf(x) > -1; }); }
  function isKo(v){ return v.lang && v.lang.toLowerCase().indexOf('ko') === 0; }

  function pickVoice(){
    if (!('speechSynthesis' in window)) return;
    var vs = speechSynthesis.getVoices();
    if (!vs || !vs.length) return;
    var v = vs.find(function(x){ return isKo(x) && ['Yuna','유나','Heami','SunHi'].some(function(n){ return x.name && x.name.indexOf(n) > -1; }); })
         || vs.find(function(x){ return isKo(x) && x.localService && !isNov(x); })
         || vs.find(function(x){ return isKo(x) && x.name && x.name.indexOf('Google 한국') > -1; })
         || vs.find(function(x){ return isKo(x) && !isNov(x); })
         || vs.find(isKo);
    if (v) koVoice = v;
  }
  if ('speechSynthesis' in window) {
    try {
      pickVoice();
      speechSynthesis.onvoiceschanged = pickVoice;
      var _vt = 0, _vi = setInterval(function(){ pickVoice(); if (koVoice || ++_vt > 40) clearInterval(_vi); }, 120);
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
    return out.filter(function(x){ return x; });
  }

  function fallback(text, tok){
    if (tok !== _tok) return;
    if (!CFG.allowSpeechFallback) return;         // iframe 임베드 등에선 폴백 안 함
    if (!('speechSynthesis' in window)) return;
    try {
      if (!koVoice) pickVoice();
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = CFG.lang; u.rate = CFG.rate; u.pitch = CFG.pitch;
      if (koVoice) u.voice = koVoice;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  function play(q, tok){
    if (tok !== _tok) return;
    if (!q.length) { _a = null; return; }
    var seg = q.shift();
    var a = new Audio(CFG.endpoint + '?q=' + encodeURIComponent(seg));
    _a = a;
    var failed = false;
    var onFail = function(){ if (failed || tok !== _tok) return; failed = true; fallback([seg].concat(q).join(' '), tok); };
    a.onended = function(){ if (tok === _tok) play(q, tok); };
    a.onerror = onFail;
    a.play().catch(onFail);
  }

  function stop(){
    _tok++;
    if (_a) { try { _a.pause(); } catch (e) {} _a = null; }
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
  }

  function speak(text){
    if (!enabled || !text) return;
    _tok++;
    var tok = _tok;
    if (_a) { try { _a.pause(); } catch (e) {} _a = null; }
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
    play(split(String(text), CFG.maxLen).slice(), tok);
  }

  // 화면이 숨겨지거나 닫힐 때 자동 정지 (임베드 안전)
  try {
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', function(){ if (document.hidden) stop(); });
  } catch (e) {}

  window.TW_TTS = {
    speak: speak,
    stop: stop,
    setEnabled: function(on){ enabled = !!on; if (!enabled) stop(); },
    isEnabled: function(){ return enabled; },
    config: function(opts){ if (opts) for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) CFG[k] = opts[k]; return CFG; }
  };
})();
