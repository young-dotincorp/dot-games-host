import { useState, useEffect, useCallback, useRef } from "react";
import { IconCheck, IconX, IconExternalLink, IconEye, IconEyeOff } from "@tabler/icons-react";
import { adminListCommunityGames, adminReviewCommunityGame } from "../lib/communityGames.js";
import { useConfirm } from "../lib/confirm.jsx";
import { useT } from "../lib/i18n.jsx";
import SegTabs from "../components/ui/SegTabs.jsx";

// ============================================================
// AdminCommunityGames — 커뮤니티 게임 제출 검수
//   상태 필터(대기/공개/거절) + 제출 목록 + 승인/거절.
//   데이터 접근은 lib/communityGames.js 경유. 권한은 DB RPC(app_admins)가 강제.
//   기존 AdminGames 의 .agm-* 스타일을 재사용해 일체감 유지.
// ============================================================

const STATUSES = ["pending", "published", "rejected"];

export default function AdminCommunityGames() {
  const t = useT();
  const confirm = useConfirm();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState(null); // null = 로딩
  const [busyId, setBusyId] = useState(null);

  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef(null);
  const toast = useCallback((m) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2400);
  }, []);

  const load = useCallback(async () => {
    setRows(null);
    const { rows: r, error } = await adminListCommunityGames(status);
    if (error) { toast(t("admin.communityGames.loadFail")); setRows([]); return; }
    setRows(r);
  }, [status, t, toast]);

  useEffect(() => { load(); }, [load]);

  const doReview = useCallback(async (row, action) => {
    const publish = action === "publish";
    const ok = await confirm({
      title: publish ? t("admin.communityGames.confirmPublishTitle") : t("admin.communityGames.confirmRejectTitle"),
      message: (publish ? t("admin.communityGames.confirmPublish", { name: row.title })
                        : t("admin.communityGames.confirmReject", { name: row.title })),
      confirmLabel: publish ? t("admin.communityGames.approve") : t("admin.communityGames.reject"),
      danger: !publish,
    });
    if (!ok) return;
    setBusyId(row.id);
    const { ok: done, error } = await adminReviewCommunityGame(row.id, action, null);
    setBusyId(null);
    if (done) {
      toast(publish ? t("admin.communityGames.published") : t("admin.communityGames.rejected"));
      load();
    } else {
      toast(t("admin.communityGames.failPrefix") + (error?.message || ""));
    }
  }, [confirm, t, toast, load]);

  // 결정된 게임의 노출/비노출 전환 — 커뮤니티 게임은 상태 자체가 노출 여부(published=노출, rejected=비노출).
  //   show=true → publish(공개 목록에 노출), show=false → reject(공개 목록에서 숨김).
  const doVisibility = useCallback(async (row, show) => {
    const ok = await confirm({
      title: show ? t("admin.communityGames.confirmShowTitle") : t("admin.communityGames.confirmHideTitle"),
      message: show ? t("admin.communityGames.confirmShow", { name: row.title })
                    : t("admin.communityGames.confirmHide", { name: row.title }),
      confirmLabel: show ? t("admin.communityGames.show") : t("admin.communityGames.hide"),
      danger: !show,
    });
    if (!ok) return;
    setBusyId(row.id);
    const { ok: done, error } = await adminReviewCommunityGame(row.id, show ? "publish" : "reject", null);
    setBusyId(null);
    if (done) {
      toast(show ? t("admin.communityGames.shown") : t("admin.communityGames.hidden"));
      load();
    } else {
      toast(t("admin.communityGames.failPrefix") + (error?.message || ""));
    }
  }, [confirm, t, toast, load]);

  return (
    <>
      <div className="agm-top">
        <p className="agm-count">{rows ? t("admin.communityGames.count", { n: rows.length }) : ""}</p>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <SegTabs
          value={status}
          onChange={setStatus}
          ariaLabel={t("admin.communityGames.filterLabel")}
          tabs={STATUSES.map((s) => ({ key: s, label: t("admin.communityGames.status_" + s) }))}
        />
      </div>

      {rows === null
        ? <div className="msg">{t("admin.communityGames.loading")}</div>
        : rows.length === 0
          ? <div className="msg"><b>{t("admin.communityGames.empty")}</b>{t("admin.communityGames.emptySub_" + status)}</div>
          : <div className="agm-list card">
              {rows.map((g, i) => (
                <div className="agm-row" key={g.id}>
                  <span className="agm-no">{i + 1}</span>
                  <div className="agm-th">
                    {g.thumbnail ? <img src={g.thumbnail} alt="" /> : null}
                  </div>
                  <div className="agm-info">
                    <div className="agm-name">{g.title || t("admin.communityGames.untitled")}</div>
                    <div className="agm-meta">
                      <span className="agm-slug">{g.slug}</span>
                      {g.category ? <span>{g.category}</span> : null}
                      {Array.isArray(g.resolutions) && g.resolutions.length ? <span>{g.resolutions.join(" · ")}</span> : null}
                    </div>
                    <a
                      href={g.embed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "12px", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "5px", wordBreak: "break-all" }}
                    >
                      <IconExternalLink size={13} aria-hidden="true" /> {g.embed_url}
                    </a>
                  </div>
                  <div className="agm-act">
                    {status === "pending" ? (
                      <>
                        <button className="btn btn-sm btn-accent" disabled={busyId === g.id} onClick={() => doReview(g, "publish")}>
                          <IconCheck size={15} /> {t("admin.communityGames.approve")}
                        </button>
                        <button className="btn btn-sm btn-danger" disabled={busyId === g.id} onClick={() => doReview(g, "reject")} aria-label={t("admin.communityGames.reject")}>
                          <IconX size={15} />
                        </button>
                      </>
                    ) : status === "published" ? (
                      <>
                        <span className="tag">{t("admin.communityGames.status_" + g.status)}</span>
                        <button className="btn btn-sm" disabled={busyId === g.id} onClick={() => doVisibility(g, false)}>
                          <IconEyeOff size={15} /> {t("admin.communityGames.hide")}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="tag">{t("admin.communityGames.status_" + g.status)}</span>
                        <button className="btn btn-sm btn-accent" disabled={busyId === g.id} onClick={() => doVisibility(g, true)}>
                          <IconEye size={15} /> {t("admin.communityGames.show")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>}

      <div className={"toast" + (toastMsg ? " on" : "")} role="status">{toastMsg}</div>
    </>
  );
}
