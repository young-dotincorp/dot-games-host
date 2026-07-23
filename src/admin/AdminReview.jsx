import { useEffect, useState, useCallback, useRef, useSyncExternalStore, useMemo } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconX, IconRefresh, IconStar, IconStarFilled, IconBraille, IconBluetooth, IconPlugConnectedX, IconClipboardCheck } from "@tabler/icons-react";
import PinGraphic from "../components/PinGraphic.jsx";
import DP from "../lib/dotpad.js";
import SegTabs from "../components/ui/SegTabs.jsx";
import { listPendingPage, listRejectedPage, reviewGraphic, setTrusted, listPendingIdsByCreator, bulkApproveGraphics, bulkRejectGraphics, requeueGraphic, findPublishedDupes } from "../lib/review.js";
import { useModalDismiss } from "../lib/useModalDismiss.js";
import { useFocusTrap } from "../lib/useFocusTrap.js";
import { useConfirm } from "../lib/confirm.jsx";
import { useT } from "../lib/i18n.jsx";

// ============================================================
// AdminReview — 데모 admin-review.html 워크플로 이식(관리자 셸 안).
//   핀 미리보기 + 3기준 체크(모두 통과해야 승인) + 반려 사유 + 신뢰 창작자 지정
//   + 닷패드 출력. 감사 추적 RPC(review_graphic/set_trusted) 사용. 서버 페이지네이션.
// ============================================================

const PAGE_SIZE = 10;
const CRITERIA = ["admin.review.crit1", "admin.review.crit2", "admin.review.crit3"];
// v = 저장용 한글 canonical(감사 기록 일관성) / k = 표시용 i18n 키
const REASONS = [
  { v: "촉각으로 안 읽힘", k: "notReadable" },
  { v: "점자 오류", k: "brailleError" },
  { v: "중복", k: "duplicate" },
  { v: "해상도 부적합", k: "resolution" },
  { v: "부적절한 내용", k: "inappropriate" },
];

const firstHex = (items) => {
  try { if (Array.isArray(items) && items[0]?.data) return items[0].data; } catch { /* noop */ }
  return "";
};

// ── 개별 검수 카드 ─────────────────────────────────────────
function ReviewCard({ g, onRemove, reload, toast, selected, onToggleSelect, mode = "pending", dupIds = [], publishedDup = false }) {
  const confirm = useConfirm();
  const t = useT();
  const rejected = mode === "rejected";
  const [checks, setChecks] = useState([false, false, false]);
  const [rejecting, setRejecting] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [etcOn, setEtcOn] = useState(false);
  const [etcText, setEtcText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);        // null | "approved" | "rejected"
  const [trusted, setTrustedState] = useState(false);
  const [trustBusy, setTrustBusy] = useState(false);
  const [dotState, setDotState] = useState("idle");   // idle | connecting | outputting | redo
  const [dotBusy, setDotBusy] = useState(false);

  const allChecked = checks.every(Boolean);
  const data = firstHex(g.items);
  const connected = useSyncExternalStore(DP.subscribe, DP.getConnected, () => false);
  const [zoom, setZoom] = useState(false);   // 미리보기 클릭 → 큰 상세 모달
  useModalDismiss(zoom && !done, () => setZoom(false));
  const reviewZoomRef = useRef(null);
  useFocusTrap(zoom && !done, reviewZoomRef); // 원본 확대 모달 포커스 가둠
  const cell = String(g.spec).includes("96") ? 1.7 : 2.6;

  // 처리 완료 시 잠깐 결과 표시 후 목록에서 제거(동일본까지 함께)
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => { onRemove(g.id); (dupIds || []).forEach(onRemove); }, 800);
    return () => clearTimeout(timer);
  }, [done, g.id, onRemove, dupIds]);

  const toggle = (i) => setChecks((prev) => { const a = prev.slice(); a[i] = !a[i]; return a; });

  const approve = async () => {
    if (!allChecked || busy) return;
    setBusy(true);
    const { ok, error } = await reviewGraphic(g.id, "approve", null);
    if (ok) {
      if (dupIds.length) await bulkApproveGraphics(dupIds);   // 완전 동일본도 함께 승인
      toast(t("admin.review.approvedToast")); setDone("approved");
    }
    else { setBusy(false); toast(t("admin.review.failPrefix") + (error?.message || t("admin.review.errorFallback"))); }
  };

  const confirmReject = async () => {
    const parts = [];
    if (chosen) parts.push(chosen);
    const et = etcText.trim(); if (et) parts.push(et);
    if (!parts.length) { toast(t("admin.review.rejectNeedReason")); return; }
    setBusy(true);
    const note = parts.join(" · ");
    const { ok, error } = await reviewGraphic(g.id, "reject", note);
    if (ok) {
      if (dupIds.length) await bulkRejectGraphics(dupIds, note);   // 완전 동일본도 함께 반려
      toast(t("admin.review.rejectedToast")); setDone("rejected");
    }
    else { setBusy(false); toast(t("admin.review.failPrefix") + (error?.message || t("admin.review.errorFallback"))); }
  };

  const trust = async () => {
    if (!g.submitted_by) { toast(t("admin.review.noCreatorInfo")); return; }
    const ok0 = await confirm({ title: t("admin.review.trustTitle"), message: t("admin.review.trustMessage"), confirmLabel: t("admin.review.trustConfirm") });
    if (!ok0) return;
    setTrustBusy(true);
    const { ok, error } = await setTrusted(g.submitted_by, true);
    if (!ok) { setTrustBusy(false); toast(t("admin.review.failPrefix") + (error?.message || t("admin.review.errorFallback"))); return; }
    toast(t("admin.review.trustedToast")); setTrustedState(true);

    // 신뢰 지정 시, 이 창작자의 검수 대기 항목(다른 페이지 포함)을 함께 공개할지 제안 → 일괄 승인.
    //   조용히 자동 공개하지 않고 관리자 확인을 한 번 받음(관리자가 안 본 콘텐츠 방지, 업계 표준).
    const { ids } = await listPendingIdsByCreator(g.submitted_by);
    if (ids.length > 0) {
      const ok1 = await confirm({
        title: t("admin.review.bulkTitle"),
        message: t("admin.review.bulkMessage", { n: ids.length }),
        confirmLabel: t("admin.review.bulkConfirm", { n: ids.length }),
      });
      if (ok1) {
        const { approved, failed } = await bulkApproveGraphics(ids);
        toast(t("admin.review.bulkDone", { n: approved }) + (failed ? t("admin.review.bulkFailSuffix", { n: failed }) : ""));
        setTrustBusy(false);
        reload && reload();   // 목록 새로고침(공개된 카드 제거 + 대기 수 갱신)
        return;
      }
    }
    setTrustBusy(false);
  };

  // 닷패드 연결 — 프론트 상세와 동일한 전역 연결 방식(기기 1대 = 연결 1개).
  const connectDot = async () => {
    if (dotBusy) return;
    if (!DP.hasReal()) { toast(t("admin.review.dotNoBrowser")); return; }
    setDotBusy(true); setDotState("connecting");
    try {
      const c = await DP.connect();
      if (!c) toast(t("admin.review.dotConnectFail"));
    } catch (e) { toast(t("admin.review.errPrefix") + (e?.message || e)); }
    finally { setDotState("idle"); setDotBusy(false); }
  };
  const output = async () => {
    if (dotBusy || !data) return;
    setDotBusy(true); setDotState("outputting");
    try {
      const ok = await DP.output(data);
      toast(ok ? t("admin.review.dotOutputDone") : t("admin.review.dotOutputFail"));
    } catch (e) { toast(t("admin.review.errPrefix") + (e?.message || e)); }
    finally { setDotState("idle"); setDotBusy(false); }
  };
  const disconnectDot = async () => {
    try { await DP.disconnect(); } catch { /* noop */ }
  };

  // 반려됨 → 다시 검수 대기로 복구
  const requeue = async () => {
    setBusy(true);
    const { ok, error } = await requeueGraphic(g.id);
    setBusy(false);
    if (ok) { toast(t("admin.review.requeuedToast")); onRemove(g.id); }
    else { toast(t("admin.review.errPrefix") + (error?.message || "")); }
  };

  return (
    <>
    <div className={"rv-card" + (done ? " done" : "") + (selected && !done && !rejected ? " sel" : "")}>
      {!done && !rejected && (
        <label className="rv-check" title={t("admin.review.selectLabel")}>
          <input type="checkbox" checked={!!selected} onChange={onToggleSelect} aria-label={t("admin.review.selectLabel")} />
        </label>
      )}
      <div className="pv-col">
        <div
          className={"pv" + (data ? " zoomable" : "")}
          onClick={data ? () => setZoom(true) : undefined}
          onKeyDown={data ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setZoom(true); } } : undefined}
          role={data ? "button" : undefined}
          tabIndex={data ? 0 : undefined}
          aria-label={data ? t("admin.review.viewOriginal") : undefined}
        >{data ? <PinGraphic data={data} spec={g.spec} variant="pins" cell={cell} alt={g.title} /> : t("admin.review.noPreview")}</div>
        {!done && !rejected && (
          <div className="pv-dot">
            {connected ? (
              <>
                <button type="button" className="dotb out" disabled={dotBusy} onClick={output}>
                  <IconBraille size={15} /> {dotState === "outputting" ? t("admin.review.dotOutputting") : t("admin.review.dotIdle")}
                </button>
                <button type="button" className="dotb off" disabled={dotBusy} onClick={disconnectDot}>
                  <IconPlugConnectedX size={15} /> {t("admin.review.dotDisconnect")}
                </button>
              </>
            ) : (
              <button type="button" className="dotb con" disabled={dotBusy} onClick={connectDot}>
                <IconBluetooth size={15} /> {dotBusy ? t("admin.review.dotConnecting") : t("admin.review.dotConnect")}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="body">
        <p className="rv-title">{g.title || t("admin.review.noTitle")}</p>
        <p className="su">{g.creator_name || t("admin.review.creatorFallback")} · {g.spec || ""}</p>
        {(dupIds.length > 0 || publishedDup) && !rejected && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "2px 0 4px" }}>
            {dupIds.length > 0 && (
              <span title={t("admin.review.dupTip")} style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "var(--accent-tint,#FFF1EA)", color: "var(--accent-deep,#E04500)" }}>{t("admin.review.dupBadge", { n: dupIds.length })}</span>
            )}
            {publishedDup && (
              <span title={t("admin.review.publishedDupTip")} style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "#FDECEC", color: "#C0392B" }}>{t("admin.review.publishedDupBadge")}</span>
            )}
          </div>
        )}

        {rejected ? (
          <div className="act">
            <span className="result no">{t("admin.review.resultRejected")}</span>
            <button type="button" className="btn btn-sm" disabled={busy} onClick={requeue}><IconRefresh size={15} /> {t("admin.review.requeueBtn")}</button>
          </div>
        ) : done ? (
          <div className="act">
            <span className={"result " + (done === "approved" ? "ok" : "no")}>{done === "approved" ? t("admin.review.resultApproved") : t("admin.review.resultRejected")}</span>
          </div>
        ) : (
          <>
            <div className="chk">
              {CRITERIA.map((c, i) => (
                <label key={i}>
                  <input type="checkbox" checked={checks[i]} onChange={() => toggle(i)} /> {t(c)}
                </label>
              ))}
            </div>

            <div className={"reasons" + (rejecting ? " on" : "")}>
              {REASONS.map((rz) => (
                <button key={rz.v} type="button" className={"rbtn" + (chosen === rz.v ? " sel" : "")}
                  onClick={() => setChosen((c) => (c === rz.v ? null : rz.v))}>{t("admin.review.reason." + rz.k)}</button>
              ))}
              <button type="button" className={"rbtn" + (etcOn ? " sel" : "")} onClick={() => setEtcOn((v) => !v)}>{t("admin.review.etcBtn")}</button>
            </div>
            <textarea className={"retc" + (etcOn ? " on" : "")} aria-label={t("admin.review.etcPlaceholder")} placeholder={t("admin.review.etcPlaceholder")}
              value={etcText} onChange={(e) => setEtcText(e.target.value)} />

            <div className="act">
              {!rejecting ? (
                <>
                  <button className="btn btn-accent" disabled={!allChecked || busy} onClick={approve}><IconCheck size={15} /> {t("admin.review.approveBtn")}</button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => setRejecting(true)}><IconX size={15} /> {t("admin.review.rejectBtn")}</button>
                </>
              ) : (
                <button className="btn btn-ghost" disabled={busy} onClick={confirmReject}>{t("admin.review.rejectConfirmBtn")}</button>
              )}
              <button type="button" className={"btn btn-sm rv-trust" + (trusted ? " on" : "")} disabled={trustBusy || trusted} onClick={trust}>
                {trusted ? <><IconStarFilled size={15} /> {t("admin.review.trustedBtn")}</> : <><IconStar size={15} /> {t("admin.review.trustBtn")}</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    {zoom && !done && createPortal(
      <div className="ovl" onClick={() => setZoom(false)} role="presentation">
        <button className="ovl-x" onClick={() => setZoom(false)} aria-label={t("common.close")} title={t("common.close")}><IconX size={20} /></button>
        <div className="modal review-modal" ref={reviewZoomRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("admin.review.viewOriginal")} onClick={(e) => e.stopPropagation()}>
          <div className="rvm-head">
            <span className="rvm-ic" aria-hidden="true"><IconClipboardCheck size={18} /></span>
            <div className="rvm-head-txt">
              <h2 className="rvm-title">{g.title || t("admin.review.noTitle")}</h2>
              <div className="rvm-meta">{g.creator_name || t("admin.review.creatorFallback")} · {g.spec || ""}</div>
            </div>
          </div>

          <div className="rvm-pv">{data ? <PinGraphic data={data} spec={g.spec} variant="pins" alt={g.title} /> : t("admin.review.noPreview")}</div>

          <div className="rvm-chk">
            {CRITERIA.map((c, i) => (
              <label key={i}><input type="checkbox" checked={checks[i]} onChange={() => toggle(i)} /> {t(c)}</label>
            ))}
          </div>

          <div className={"rvm-reasons" + (rejecting ? " on" : "")}>
            {REASONS.map((rz) => (
              <button key={rz.v} type="button" className={"rbtn" + (chosen === rz.v ? " sel" : "")}
                onClick={() => setChosen((c) => (c === rz.v ? null : rz.v))}>{t("admin.review.reason." + rz.k)}</button>
            ))}
            <button type="button" className={"rbtn" + (etcOn ? " sel" : "")} onClick={() => setEtcOn((v) => !v)}>{t("admin.review.etcBtn")}</button>
          </div>
          <textarea className={"rvm-etc" + (etcOn ? " on" : "")} aria-label={t("admin.review.etcPlaceholder")} placeholder={t("admin.review.etcPlaceholder")}
            value={etcText} onChange={(e) => setEtcText(e.target.value)} />

          <div className="rvm-actions">
            {!rejecting ? (
              <>
                <button className="btn btn-accent" disabled={!allChecked || busy} onClick={approve}><IconCheck size={15} /> {t("admin.review.approveBtn")}</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => setRejecting(true)}><IconX size={15} /> {t("admin.review.rejectBtn")}</button>
              </>
            ) : (
              <button className="btn btn-ghost" disabled={busy} onClick={confirmReject}>{t("admin.review.rejectConfirmBtn")}</button>
            )}
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}

export default function AdminReview() {
  const t = useT();
  const confirm = useConfirm();
  const [page, setPage] = useState(0);
  const [view, setView] = useState("pending"); // "pending" | "rejected"
  const [rows, setRows] = useState(null);   // null=미조회
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef(null);

  const toast = useCallback((m) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2400);
  }, []);

  const load = useCallback(async (p) => {
    setRows(null); setError("");
    const fetchPage = view === "rejected" ? listRejectedPage : listPendingPage;
    const { rows: r, total: tot, error: e } = await fetchPage(p, PAGE_SIZE);
    if (e) { setError(e.message || ""); setRows([]); return; }
    // 마지막 페이지의 마지막 항목을 처리해 빈 페이지가 되면 한 페이지 앞으로
    if (p > 0 && r.length === 0 && tot > 0) { setPage(p - 1); return; }
    setRows(r); setTotal(tot);
  }, [view]);

  useEffect(() => { load(page); }, [page, load]);

  // 일괄 공개 등으로 목록을 다시 불러올 때 사용(현재 페이지 재조회 → 대기 수·카드 갱신)
  const reload = useCallback(() => load(page), [load, page]);

  // ── 완전 동일(content_hash 동일) 그룹핑: 대표 1건만 표시, 나머지는 대표에 '중복'으로 귀속 ──
  const { displayRows, dupMap } = useMemo(() => {
    if (view !== "pending" || !Array.isArray(rows)) return { displayRows: rows, dupMap: {} };
    const seen = new Map(); const dm = {}; const reps = [];
    for (const g of rows) {
      const h = g.content_hash;
      if (h && seen.has(h)) { const rep = seen.get(h); (dm[rep.id] = dm[rep.id] || []).push(g.id); }
      else { if (h) seen.set(h, g); reps.push(g); }
    }
    return { displayRows: reps, dupMap: dm };
  }, [rows, view]);
  const expandIds = useCallback((repIds) => {
    const out = [];
    for (const id of repIds) { out.push(id); if (dupMap[id]) out.push(...dupMap[id]); }
    return out;
  }, [dupMap]);

  // 사이트 전체 중복: 페이지의 해시들 중 '이미 공개된' 것 조회 → 해당 대표에 배지.
  const [publishedDupSet, setPublishedDupSet] = useState(() => new Set());
  useEffect(() => {
    if (view !== "pending" || !Array.isArray(rows) || !rows.length) { setPublishedDupSet(new Set()); return; }
    let alive = true;
    const hashes = [...new Set(rows.map((g) => g.content_hash).filter(Boolean))];
    findPublishedDupes(hashes).then((s) => { if (alive) setPublishedDupSet(s); });
    return () => { alive = false; };
  }, [rows, view]);

  // ── 체크박스 다중 선택 + 일괄 처리 (스팸 대량 유입 시 한 번에 승인/반려) ──
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  useEffect(() => { setSelected(new Set()); }, [page]); // 페이지 바뀌면 선택 초기화(다른 페이지 id 혼입 방지)
  useEffect(() => { setPage(0); setSelected(new Set()); }, [view]); // 탭 전환 시 첫 페이지 + 선택 초기화
  const toggleSelect = useCallback((id) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const allSelected = !!displayRows && displayRows.length > 0 && displayRows.every((g) => selected.has(g.id));
  const toggleSelectAll = useCallback(() => {
    setSelected(() => (allSelected ? new Set() : new Set((displayRows || []).map((g) => g.id))));
  }, [allSelected, displayRows]);

  const bulkApprove = useCallback(async () => {
    const ids = expandIds([...selected]);
    if (!ids.length) return;
    const ok0 = await confirm({ title: t("admin.review.bulkApproveTitle"), message: t("admin.review.bulkApproveMsg", { n: ids.length }), confirmLabel: t("admin.review.bulkApprove") });
    if (!ok0) return;
    setBulkBusy(true);
    const { approved, failed } = await bulkApproveGraphics(ids);
    setBulkBusy(false);
    toast(t("admin.review.bulkDone", { n: approved }) + (failed ? t("admin.review.bulkFailSuffix", { n: failed }) : ""));
    clearSelection();
    load(page);
  }, [selected, expandIds, confirm, t, toast, clearSelection, load, page]);

  const bulkReject = useCallback(async () => {
    const ids = expandIds([...selected]);
    if (!ids.length) return;
    const ok0 = await confirm({ title: t("admin.review.bulkRejectTitle"), message: t("admin.review.bulkRejectMsg", { n: ids.length }), confirmLabel: t("admin.review.bulkReject"), danger: true });
    if (!ok0) return;
    setBulkBusy(true);
    const { rejected, failed } = await bulkRejectGraphics(ids, t("admin.review.bulkRejectReason"));
    setBulkBusy(false);
    toast(t("admin.review.bulkRejectDone", { n: rejected }) + (failed ? t("admin.review.bulkFailSuffix", { n: failed }) : ""));
    clearSelection();
    load(page);
  }, [selected, expandIds, confirm, t, toast, clearSelection, load, page]);

  // 카드 처리 완료 → 목록에서 제거. 페이지가 비면 재조회.
  const removeCard = useCallback((id) => {
    setRows((prev) => {
      const next = (prev || []).filter((g) => g.id !== id);
      if (next.length === 0) load(page);   // 다음 페이지/이전 페이지 재조회
      return next;
    });
    setTotal((t) => Math.max(0, t - 1));
    setSelected((prev) => { if (!prev.has(id)) return prev; const n = new Set(prev); n.delete(id); return n; });
  }, [load, page]);

  const from = page * PAGE_SIZE;
  const pagerText = total ? `${from + 1}–${Math.min(from + PAGE_SIZE, total)} / ${total}` : "";

  return (
    <>
      <div className="guide">{(() => { const p = t("admin.review.guide").split("\uE000"); return <>{p[0]}<b>{p[1]}</b>{p[2]}</>; })()}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div className="rv-tabs">
          <SegTabs
            value={view}
            onChange={setView}
            ariaLabel={t("admin.review.tabsLabel")}
            tabs={[
              { key: "pending", label: t("admin.review.tabPending") },
              { key: "rejected", label: t("admin.review.tabRejected") },
            ]}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={() => (page === 0 ? load(0) : setPage(0))}><IconRefresh size={15} /> {t("admin.review.refresh")}</button>
      </div>

      <div className={"rv-bar" + (view === "pending" && selected.size > 0 ? " selmode" : "")}>
        {view === "pending" && rows && rows.length > 0 && (
          <label style={{ display: "inline-flex", alignItems: "center", marginRight: 4, cursor: "pointer" }} title={t("admin.review.selectAll")}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = selected.size > 0 && !allSelected; }}
              onChange={toggleSelectAll}
              aria-label={t("admin.review.selectAll")}
            />
          </label>
        )}
        {view === "pending" && selected.size > 0 ? (
          <>
            <span className="rv-selcount">{t("admin.review.selectedCount", { n: selected.size })}</span>
            <div className="grow" />
            <button className="btn btn-sm btn-accent" disabled={bulkBusy} onClick={bulkApprove}><IconCheck size={15} /> {t("admin.review.bulkApprove")}</button>
            <button className="btn btn-sm btn-danger" disabled={bulkBusy} onClick={bulkReject}><IconX size={15} /> {t("admin.review.bulkReject")}</button>
            <button className="btn btn-sm" disabled={bulkBusy} onClick={clearSelection}>{t("admin.review.selectClear")}</button>
          </>
        ) : (
          <span className="badge">{view === "rejected" ? t("admin.review.rejectedBadge", { n: total }) : t("admin.review.waitingBadge", { n: total })}</span>
        )}
      </div>

      <div aria-live="polite">
        {rows === null
          ? <div className="msg">{t("common.loading")}</div>
          : error
            ? <div className="msg"><b>{t("admin.review.loadError")}</b>{error}</div>
            : rows.length === 0
              ? <div className="msg"><b>{view === "rejected" ? t("admin.review.rejectedEmptyTitle") : t("admin.review.emptyTitle")}</b>{view === "rejected" ? t("admin.review.rejectedEmptyDesc") : t("admin.review.emptyDesc")}</div>
              : (view === "pending" ? displayRows : rows).map((g) => <ReviewCard key={g.id} g={g} onRemove={removeCard} reload={reload} toast={toast} selected={selected.has(g.id)} onToggleSelect={() => toggleSelect(g.id)} mode={view} dupIds={dupMap[g.id] || []} publishedDup={publishedDupSet.has(g.content_hash)} />)}
      </div>

      <div className="pager">
        <button type="button" className="btn btn-sm" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>{t("admin.review.pagerPrev")}</button>
        <span>{pagerText}</span>
        <button type="button" className="btn btn-sm" disabled={from + PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>{t("admin.review.pagerNext")}</button>
      </div>

      <div className="rv-foot">{t("admin.review.footNote")}</div>

      <div className={"toast" + (toastMsg ? " on" : "")} role="status">{toastMsg}</div>
    </>
  );
}
