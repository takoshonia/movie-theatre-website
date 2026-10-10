import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { get, post } from "../api/client";
import Modal from "../components/Modal";
import ProfileForm from "../components/ProfileForm";
import { useApp } from "../context/AppProvider";

function money(value) {
  const number = Number(value || 0);
  const text = Number.isInteger(number) ? String(number) : number.toFixed(2);
  return `${text} ₾`;
}

function dateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

function nameOf(value) {
  if (!value) return "";
  const text = typeof value === "string" ? value : value.name || value.label || "";
  return text.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ProfilePage() {
  const { user, ready, requireUser, setNotice } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const section = params.get("tab") === "tickets" ? "tickets" : "profile";
  const filter = params.get("filter") === "past" ? "past" : "upcoming";
  const [tickets, setTickets] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [refunding, setRefunding] = useState(null);
  const [busy, setBusy] = useState(false);
  const refundLock = useRef(false);

  useEffect(() => {
    if (!ready || user) return undefined;
    let cancelled = false;
    requireUser().then((nextUser) => {
      if (!cancelled && !nextUser) navigate("/");
    });
    return () => {
      cancelled = true;
    };
  }, [ready, user, requireUser, navigate]);

  useEffect(() => {
    if (!user || section !== "tickets") return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    get(`/tickets?filter=${filter}`)
      .then((result) => {
        if (!cancelled) setTickets(result || []);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || "Could not load tickets");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, section, filter, reload]);

  async function refund() {
    if (refundLock.current || !refunding) return;
    refundLock.current = true;
    setBusy(true);
    try {
      await post(`/orders/${encodeURIComponent(refunding.reference)}/refund`);
      setRefunding(null);
      setReload((value) => value + 1);
      setNotice("Refund complete");
    } catch (requestError) {
      setNotice(requestError.message || "Could not refund this order");
      setReload((value) => value + 1);
    } finally {
      refundLock.current = false;
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="container page">
        <div className="skeleton-stack">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="container page profile-page">
      <h1>My profile</h1>
      <div className="tabs">
        <button type="button" className={section === "profile" ? "active" : ""} onClick={() => setParams({ tab: "profile" })}>
          <UserIcon />
          Personal information <span className={user.profileComplete ? "status-dot complete" : "status-dot"} />
        </button>
        <button
          type="button"
          className={section === "tickets" ? "active" : ""}
          onClick={() => setParams({ tab: "tickets", filter })}
        >
          <TicketIcon />
          My tickets
        </button>
      </div>
      {section === "profile" ? (
        <section className="profile-panel">
          <h2>Personal information</h2>
          <p className="muted">Add your details so booking stays simple</p>
          <ProfileForm key={user.id} />
        </section>
      ) : (
        <section className="tickets-section">
          <div className="subtabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={filter === "upcoming"}
              className={filter === "upcoming" ? "active" : ""}
              onClick={() => setParams({ tab: "tickets", filter: "upcoming" })}
            >
              Upcoming
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "past"}
              className={filter === "past" ? "active" : ""}
              onClick={() => setParams({ tab: "tickets", filter: "past" })}
            >
              Past
            </button>
          </div>
          {loading ? (
            <div className="skeleton" />
          ) : error ? (
            <div className="error-box" role="alert">
              <p>{error}</p>
              <button type="button" className="btn secondary" onClick={() => setReload((value) => value + 1)}>
                Retry
              </button>
            </div>
          ) : tickets?.length ? (
            tickets.map((order) => (
              <article className="ticket-card" key={order.id}>
                <img src={order.session?.movie?.posterUrl} alt={order.session?.movie?.title || ""} />
                <div className="ticket-info">
                  <span className="eyebrow">
                    {order.reference} · {order.status === "refunded" ? "Refunded" : "Order confirmed"}
                  </span>
                  <h2>{order.session?.movie?.title}</h2>
                  <p>
                    {nameOf(order.session?.venue)} · Hall {order.session?.hall?.name}
                  </p>
                  <p>
                    {dateLabel(order.session?.date)} · {order.session?.time} · {nameOf(order.session?.format)} · {nameOf(order.session?.language)}
                  </p>
                  <div className="ticket-seats">
                    {(order.tickets || []).map((ticket) => (
                      <span key={ticket.id}>
                        {ticket.seatCode} · {nameOf(ticket.ticketType)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ticket-action">
                  <strong>{money(order.totalPrice)}</strong>
                  {filter === "upcoming" ? (
                    <>
                      <button type="button" className="btn outline" disabled={!order.isRefundable} onClick={() => setRefunding(order)}>
                        Refund
                      </button>
                      {order.isRefundable ? null : <small>Refunds are available until 2 hours before the session</small>}
                    </>
                  ) : (
                    <span className="muted small">{order.status === "refunded" ? "Refunded" : "Finished"}</span>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="empty">
              <TicketIcon />
              <p>{filter === "upcoming" ? "You have no upcoming tickets yet" : "You have no past tickets yet"}</p>
              <button type="button" className="btn secondary" onClick={() => navigate("/sessions")}>
                Browse sessions
              </button>
            </div>
          )}
        </section>
      )}
      <Modal
        open={Boolean(refunding)}
        title="Refund"
        onClose={() => {
          if (!busy) setRefunding(null);
        }}
      >
        {refunding ? (
          <>
            <p>
              Cancel order {refunding.reference} and refund {money(refunding.totalPrice)}?
            </p>
            <p className="muted">Every ticket in this order will be cancelled.</p>
            <div className="form-actions">
              <button type="button" className="btn secondary" disabled={busy} onClick={() => setRefunding(null)}>
                Back
              </button>
              <button type="button" className="btn primary" disabled={busy} onClick={refund}>
                {busy ? "Please wait…" : "Confirm refund"}
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="5.2" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.2 13.2a4.8 4.8 0 0 1 9.6 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        d="M2.5 4.5h11v2.2a1.4 1.4 0 0 0 0 2.6v2.2h-11V9.3a1.4 1.4 0 0 0 0-2.6V4.5Z"
      />
    </svg>
  );
}
