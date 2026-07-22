import { useEffect, useRef, useMemo, useState, memo } from "react";
import { parseSpec } from "../lib/pins.js";
import { useT } from "../lib/i18n.jsx";

// ★데모 원본 셀 매핑(EA) — 열 우선: 왼쪽 열 위→아래(bit0..3), 오른쪽 열 위→아래(bit4..7).
//   (이전의 '표준 8점 점자' 순서는 bit3~6이 달라 획 경계가 지글거리는 원인이었음 — 실데이터 '가'로 검증)
const CELL = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3]];
const CW = 2, CH = 4;

/**
 * data 문자열 → 핀 비트 배열(row-major). 자동 감지:
 *  - 0/1만 → 이진(문자=핀 1개, 행우선)
 *  - hex   → 닷패드 점자셀(셀=1바이트=2 hex, 셀 행우선, 8점 매핑)
 */
export function decodePins(data, cols, rows) {
  const total = cols * rows;
  const bits = new Uint8Array(total);
  const str = (data || "").trim();
  if (!str) return bits;
  if (/^[01]+$/.test(str)) {
    for (let i = 0; i < total && i < str.length; i++) bits[i] = str[i] === "1" ? 1 : 0;
    return bits;
  }
  const ccols = Math.floor(cols / CW), crows = Math.floor(rows / CH);
  for (let i = 0; i < ccols * crows; i++) {
    const pair = str.substr(2 * i, 2);
    if (pair.length < 1) break;
    const byte = parseInt(pair.padEnd(2, "0"), 16);
    if (Number.isNaN(byte)) continue;
    const cc = i % ccols, cr = Math.floor(i / ccols);
    for (let b = 0; b < 8; b++) {
      if ((byte >> b) & 1) {
        const x = cc * CW + CELL[b][0], y = cr * CH + CELL[b][1];
        if (x < cols && y < rows) bits[y * cols + x] = 1;
      }
    }
  }
  return bits;
}

export function pinsHaveInk(data, spec) {
  const [c, r] = parseSpec(spec);
  return decodePins(data, c, r).some((b) => b === 1);
}

/**
 * 촉각 핀 그래픽 렌더러 — 데모(tib-preview)의 Ra 함수를 그대로 이식 + 반응형 업그레이드.
 *
 * ★데모 원본 공식 (index.html 번들 함수 Ra에서 추출)★
 *  variant="thumb" (카드 썸네일):
 *    pad = cell×0.4 · ON = #16150F, r = cell×0.34 · OFF = rgba(180,170,150,.45), r = 0.34×0.55
 *  variant="pins" (히어로/상세, 입체 핀):
 *    pad = cell×0.5 · ON = 그림자(y+0.5, rgba(0,0,0,.16)) + 본체(#16150F, r=cell×0.4)
 *                       + 하이라이트(−0.28E, r=0.35E, rgba(255,255,255,.32))
 *    OFF = 외곽선 원(r=0.7E, #DAD2BF, lineWidth 1)
 *  표시: 캔버스를 CSS로 늘리지 않고 **natural size(px 고정) 1:1** + devicePixelRatio 스케일.
 *        → 어떤 화면(dpr 1/1.25/2)에서도 점이 뭉개지지 않음. (선명함의 핵심)
 *
 * 업그레이드: 데모는 cell이 고정값(카드 5.4/3.6)이지만, 여기선 컨테이너 폭을 측정해
 * cell을 자동 산출(fit) → 반응형 그리드에서도 항상 1:1 렌더. cell prop을 주면 고정(fit 해제).
 */
function PinGraphic({
  data,
  spec,
  variant = "thumb",
  cell,               // 지정 시 데모처럼 고정 셀 크기 (미지정 시 컨테이너 폭에 맞춤)
  className,
  alt,
  lazy = false,       // 그리드 카드용: 뷰포트 근처에 들어올 때만 캔버스를 그림(초기 로딩 최적화)
  // ▼ 구버전 호환 props (동작은 variant가 대체) — 전달돼도 무해
  dotColor, offColor, showOff,
}) {
  const t = useT();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [cols, rows] = parseSpec(spec);
  const bits = useMemo(() => decodePins(data, cols, rows), [data, cols, rows]);
  const hasInk = useMemo(() => bits.some((b) => b === 1), [bits]);
  const [fitW, setFitW] = useState(0);
  // 지연 렌더(Dribbble/Behance식): lazy면 뷰포트 근처(300px)에 들어올 때까지 캔버스 그리기를 미룸.
  //   화면 밖 수십~수백 장의 촉각 그래픽을 미리 그리지 않아 최초 진입이 크게 빨라짐.
  const [inView, setInView] = useState(!lazy);
  useEffect(() => {
    if (!lazy || inView) return;
    const el = wrapRef.current;
    if (!el) return; // 래퍼가 아직 없으면 다음 렌더에서 재시도
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { setInView(true); io.disconnect(); break; }
    }, { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [lazy, inView, hasInk]);

  // 컨테이너 폭 측정 (cell 미지정 시)
  useEffect(() => {
    if (cell) return;
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setFitW(el.clientWidth || 0);
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [cell]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk || !inView) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const PADR = variant === "pins" ? 0.5 : 0.4;
    // cell 산출: 고정값 또는 컨테이너 폭에서 역산 (W = cols·c + 2·PADR·c)
    const c = cell || (fitW > 0 ? fitW / (cols + PADR * 2) : 0);
    if (!c) return;

    const p = c * PADR;
    const W = Math.round(cols * c + p * 2);
    const H = Math.round(rows * c + p * 2);
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;

    // ★natural size 1:1 (데모 동일): backing=dpr배, 표시는 정확히 W×H px — CSS 확대/축소 없음
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // ★렌더 튜닝: 점이 촘촘해 진해 보이지 않도록 thumb 점을 0.40으로(여백↑, 가벼운 인상).
    //   pins는 데모 원본 0.4 유지(입체 하이라이트와 균형).
    const E = c * (variant === "pins" ? 0.4 : 0.40);
    const TAU = Math.PI * 2;
    // ★ON 핀 색 — 캔버스는 CSS 변수를 못 읽으므로 리터럴 hex. 검정(#16150F)에서
    //   따뜻한 다크그레이로 톤다운(저시력 미리보기 대비는 유지). 여기 한 곳만 바꾸면 전역 반영.
    const INK_ON = "#5C574E";

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = p + x * c + c / 2;
        const cy = p + y * c + c / 2;
        const on = bits[y * cols + x] === 1;
        if (variant === "pins") {
          if (on) {
            ctx.beginPath(); ctx.arc(cx, cy + 0.5, E, 0, TAU); ctx.fillStyle = "rgba(0,0,0,.16)"; ctx.fill();
            ctx.beginPath(); ctx.arc(cx, cy, E, 0, TAU); ctx.fillStyle = INK_ON; ctx.fill();
            ctx.beginPath(); ctx.arc(cx - E * 0.28, cy - E * 0.28, E * 0.35, 0, TAU); ctx.fillStyle = "rgba(255,255,255,.32)"; ctx.fill();
          } else {
            ctx.beginPath(); ctx.arc(cx, cy, E * 0.55, 0, TAU); ctx.strokeStyle = "#EAE4D6"; ctx.lineWidth = 1; ctx.stroke();
          }
        } else {
          // thumb: OFF 격자는 아주 작고 옅게 — 이미지가 solid하게 읽히고 배경이 정돈됨
          ctx.beginPath(); ctx.arc(cx, cy, on ? E : c * 0.14, 0, TAU);
          ctx.fillStyle = on ? INK_ON : "rgba(196,188,172,.30)";
          ctx.fill();
        }
      }
    }
  }, [bits, cols, rows, cell, fitW, variant, hasInk, inView]);

  if (!hasInk) return null;
  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ width: "100%", minWidth: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt || t("pin.alt")}
        style={{ display: "block", maxWidth: "100%", maxHeight: "100%" }}
      />
    </div>
  );
}

// props가 전부 원시값이라 얕은 비교(memo)가 정확·안전 — 부모(Browse) 재렌더
// (히어로 캐러셀 자동회전·통계 카운트업·검색 타이핑) 시 불필요한 카드 재렌더를 막는다.
export default memo(PinGraphic);
