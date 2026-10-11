import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { del, get, post } from "../api/client";
import { useApp } from "../context/AppProvider";
import inputOkIcon from "../assets/input-ok.svg";
import Modal from "./Modal";
import "./booking.css";

function money(value) {
  const number = Number(value || 0);
  const text = Number.isInteger(number) ? String(number) : number.toFixed(2);
  return `₾ ${text}`;
}

function longDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function shortDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function seatTotal(seats, types, price) {
  return seats.reduce((sum, seat) => {
    const ratio = types.find((type) => type.slug === seat.ticketType)?.priceRatio ?? 1;
    return sum + Number(price || 0) * ratio;
  }, 0);
}

function ratioLabel(ratio) {
  return `${Math.round(Number(ratio || 0) * 100)}%`;
}

function ticketCounts(items) {
  const counts = new Map();
  items.forEach((item) => {
    const name = item.ticketType?.name || item.ticketType || "Ticket";
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts.entries()].map(([name, count]) => `${count} x ${name}`).join(", ");
}

function sessionLine(session, { short = false } = {}) {
  const date = short ? shortDate(session.date) : longDate(session.date);
  return [
    session.venue?.name,
    session.hall?.name ? `Hall ${session.hall.name}` : null,
    date,
    session.time,
    session.format?.name,
    session.language?.name,
  ]
    .filter(Boolean)
    .join(" · ");
}

function validateCheckout(name, value) {
  const text = String(value ?? "").trim();
  if (!text) return "This field is required";
  if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Enter a valid email";
  if (name === "fullName" && text.length < 3) return "Use at least 3 characters";
  if (name === "fullName" && text.length > 50) return "Use 50 characters or fewer";
  if (name === "mobileNumber" && !/^5\d{8}$/.test(text.replace(/\s/g, ""))) {
    return "Enter 9 digits starting with 5";
  }
  if (name === "cardNumber" && !/^\d{16}$/.test(text.replace(/\s/g, ""))) {
    return "Card number must be 16 digits";
  }
  if (name === "cvv" && !/^\d{3}$/.test(text)) return "CVV must be 3 digits";
  if (name === "expiry") {
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(text)) return "Use the MM/YY format";
    const [month, year] = text.split("/").map(Number);
    if (new Date(2000 + year, month, 1) <= new Date()) return "This card has expired";
  }
  return "";
}

const CHECKOUT_FIELDS = ["fullName", "email", "mobileNumber", "cardNumber", "expiry", "cvv"];

export default function BookingModal({ open, sessionId, movie, initialSession, onClose }) {
  const { user, filterOptions, requireProfile, setNotice, authMode, profileOpen } = useApp();
  const navigate = useNavigate();
  const options = filterOptions;
  const types = [...(options?.ticketTypes || [])].sort((a, b) => {
    const order = { child: 0, student: 1, adult: 2 };
    return (order[a.slug] ?? 9) - (order[b.slug] ?? 9);
  });

  const [session, setSession] = useState(initialSession || null);
  const [sections, setSections] = useState([]);
  const [mapStatus, setMapStatus] = useState("loading");
  const [mapError, setMapError] = useState("");
  const [mapAttempt, setMapAttempt] = useState(0);
  const [selected, setSelected] = useState([]);
  const [hold, setHold] = useState(null);
  const [step, setStep] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [lost, setLost] = useState([]);
  const [checkout, setCheckout] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });
  const [checkoutErrors, setCheckoutErrors] = useState({});
  const [checkoutError, setCheckoutError] = useState("");

  const lock = useRef(false);
  const holdRef = useRef(null);
  const closed = useRef(false);
  const expiryHandled = useRef(false);

  const film = session?.movie || movie;
  const allSeats = sections.flatMap((section) => section.rows.flatMap((row) => row.seats));
  const maxSeats = options?.maxSeatsPerOrder ?? 3;

  useEffect(() => {
    if (!open) return;
    closed.current = false;
    setSelected([]);
    setHold(null);
    setStep(1);
    setSeconds(0);
    setBusy(false);
    setError("");
    setConfirmation(null);
    setLost([]);
    setCheckout({
      fullName: user?.fullName || "",
      email: user?.email || "",
      mobileNumber: user?.mobileNumber || "",
      cardNumber: "",
      expiry: "",
      cvv: "",
    });
    setCheckoutErrors({});
    setCheckoutError("");
    setSession(initialSession || null);
    setMapAttempt(0);
  }, [open, sessionId]);

  useEffect(() => {
    if (!open || !sessionId) return undefined;
    let cancelled = false;
    get(`/sessions/${sessionId}`)
      .then((result) => {
        if (!cancelled && result) setSession(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  useEffect(() => {
    if (!open || !sessionId) return undefined;
    let cancelled = false;
    setMapStatus("loading");
    setMapError("");
    get(`/sessions/${sessionId}/seats`)
      .then((result) => {
        if (cancelled) return;
        setSections(result?.sections || []);
        setMapStatus("ready");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setSections([]);
        setMapError(requestError.message || "Could not load seats");
        setMapStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open, sessionId, mapAttempt]);

  useEffect(() => {
    if (!open || step !== 1 || mapStatus !== "ready") return;
    setSelected((current) =>
      current.filter((seat) => allSeats.some((item) => item.id === seat.id && (item.state === "available" || item.isMine))),
    );
  }, [sections, open, step, mapStatus]);

  useEffect(() => {
    holdRef.current = hold;
    if (!hold) return undefined;
    expiryHandled.current = false;
    const duration = (options?.holdMinutes ?? 8) * 60;
    const expiresAt = Date.parse(hold.expiresAt);
    const startedAt = Date.now();
    setSeconds(duration);

    function tick() {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      let remaining = Math.max(0, duration - elapsed);
      if (Number.isFinite(expiresAt) && Date.now() >= expiresAt) remaining = 0;
      setSeconds(remaining);
      if (remaining === 0 && !expiryHandled.current) {
        expiryHandled.current = true;
        setHold(null);
        setSelected([]);
        setStep(1);
        setMapAttempt((value) => value + 1);
        setError("Your hold expired. Please choose seats again.");
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hold, options?.holdMinutes]);

  async function close() {
    if (lock.current) return;
    closed.current = true;
    const currentHold = holdRef.current;
    onClose();
    if (currentHold) {
      del(`/holds/${currentHold.holdId}`).catch(() => {
        setNotice("Could not release the hold. Seats free automatically when the timer ends.");
      });
    }
  }

  function select(seat) {
    if (!options || !types.length) {
      setError("Booking options are still loading. Try again.");
      return;
    }
    if (selected.some((item) => item.id === seat.id)) {
      setSelected((current) => current.filter((item) => item.id !== seat.id));
      setError("");
      return;
    }
    if (selected.length >= maxSeats) {
      setError(`You can choose up to ${maxSeats} seats per order.`);
      return;
    }
    setSelected((current) => [
      ...current,
      {
        ...seat,
        ticketType: types.find((type) => type.priceRatio === 1)?.slug || types[0].slug,
      },
    ]);
    setError("");
  }

  async function reconcile(requestError) {
    const codes = (requestError.contested || []).map((item) => (typeof item === "string" ? item : item.code || item.seatCode));
    setLost(codes);
    setSelected((current) => current.filter((seat) => !codes.includes(seat.code)));
    setError(
      codes.length
        ? `These seats are no longer free: ${codes.join(", ")}. Your other choices are still selected.`
        : requestError.message,
    );
    setHold(null);
    setStep(1);
    setMapAttempt((value) => value + 1);
  }

  async function next() {
    if (lock.current || !selected.length || invalid) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const nextUser = await requireProfile();
      if (!nextUser) return;
      const minAge = film?.ageRating?.minAge;
      if (minAge != null && nextUser.age < minAge) {
        setError(`This film is only for ages ${minAge} and over.`);
        return;
      }
      const result = await post(`/sessions/${sessionId}/holds`, {
        seats: selected.map((seat) => ({ seatId: seat.id, ticketType: seat.ticketType })),
      });
      if (result && !closed.current) {
        setHold(result);
        setSeconds((options?.holdMinutes ?? 8) * 60);
        setStep(2);
      }
    } catch (requestError) {
      if (requestError.status === 409) await reconcile(requestError);
      else {
        setError(requestError.message || "Could not hold these seats");
        if (requestError.status === 422) setMapAttempt((value) => value + 1);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function back() {
    if (lock.current || step !== 2) return;
    lock.current = true;
    setBusy(true);
    try {
      if (hold) {
        await del(`/holds/${hold.holdId}`);
        setHold(null);
      }
      setStep(1);
      setMapAttempt((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message || "Could not return to seats");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function changeCheckout(name, value) {
    setCheckout((current) => ({ ...current, [name]: value }));
    setCheckoutErrors((current) => ({ ...current, [name]: "" }));
    setCheckoutError("");
    setError("");
  }

  async function pay(event) {
    event.preventDefault();
    if (lock.current || !hold) return;
    const nextErrors = Object.fromEntries(CHECKOUT_FIELDS.map((name) => [name, validateCheckout(name, checkout[name])]));
    setCheckoutErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    lock.current = true;
    setBusy(true);
    setError("");
    setCheckoutError("");
    try {
      const result = await post("/orders", {
        ...checkout,
        mobileNumber: checkout.mobileNumber.replace(/\s/g, ""),
        holdId: hold.holdId,
      });
      if (result) {
        setConfirmation(result);
        setHold(null);
      }
    } catch (requestError) {
      if (requestError.status === 409) {
        await reconcile(requestError);
      } else if (requestError.status === 422) {
        const fieldErrors = requestError.errors || {};
        setCheckoutErrors((current) => ({
          ...current,
          ...Object.fromEntries(
            Object.entries(fieldErrors).map(([key, value]) => [key, Array.isArray(value) ? value.join(" ") : String(value)]),
          ),
        }));
        setCheckoutError(
          Object.keys(fieldErrors).length ? "Check the highlighted fields" : requestError.message || "Payment failed",
        );
        setError(Object.keys(fieldErrors).length ? "" : requestError.message || "Payment failed");
        if (/expir/i.test(requestError.message || "")) {
          setHold(null);
          setSelected([]);
          setStep(1);
          setMapAttempt((value) => value + 1);
        }
      } else {
        setCheckoutError(requestError.message || "Payment failed");
        setError(requestError.message || "Payment failed");
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!open || authMode || profileOpen) return null;

  if (!sessionId || !session || !film) {
    return (
      <Modal open title="Buy ticket" plain onClose={onClose}>
        <div className="booking-shell booking-loading">
          <div className="skeleton" />
        </div>
      </Modal>
    );
  }

  const subtotal = seatTotal(selected, types, session.price);
  const invalid = selected.some((seat) => {
    const type = types.find((item) => item.slug === seat.ticketType);
    return type?.blockedFromRatingAge != null && film.ageRating?.minAge >= type.blockedFromRatingAge;
  });
  const timerText = hold
    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
    : null;

  return (
    <Modal open title={confirmation ? "Booking confirmed" : "Buy ticket"} plain onClose={close}>
      <div className="booking-shell">
        {confirmation ? (
          <Confirmation
            confirmation={confirmation}
            film={film}
            session={session}
            onTickets={() => {
              close();
              navigate("/profile?tab=tickets");
            }}
            onHome={() => {
              close();
              navigate("/");
            }}
          />
        ) : (
          <>
            <div className="booking-top">
              <div>
                <h2>{film.title}</h2>
                <p className="booking-meta">{sessionLine(session)}</p>
              </div>
              {timerText ? (
                <div className={seconds < 60 ? "booking-timer urgent" : "booking-timer"} role="timer">
                  <span>Seats held</span>
                  <strong>{timerText}</strong>
                </div>
              ) : null}
            </div>

            <div className="booking-body">
              <div className="booking-main">
                <div className="booking-tabs">
                  <button type="button" className={step === 1 ? "active" : ""} disabled={busy} onClick={back}>
                    Seats
                  </button>
                  <button
                    type="button"
                    className={step === 2 ? "active" : ""}
                    disabled={busy || (!hold && !selected.length)}
                    onClick={() => {
                      if (step === 1) next();
                    }}
                  >
                    Checkout
                  </button>
                </div>

                {error ? (
                  <p className="booking-error" role="alert">
                    {error}
                  </p>
                ) : null}

                {step === 1 ? (
                  <section className="booking-map">
                    <div className="booking-screen">Screen</div>
                    {mapStatus === "loading" ? (
                      <div className="skeleton" />
                    ) : mapStatus === "error" ? (
                      <div className="error-box" role="alert">
                        <p>{mapError}</p>
                        <button type="button" className="btn secondary" onClick={() => setMapAttempt((value) => value + 1)}>
                          Retry
                        </button>
                      </div>
                    ) : (
                      sections.map((section) => {
                        const rows = section.rows.map((row) => row.label).filter(Boolean);
                        const rowRange = rows.length > 1 ? `${rows[0]}-${rows[rows.length - 1]}` : rows[0] || "";
                        return (
                          <div className="booking-section" key={section.name}>
                            <p className="booking-section-label">
                              {section.name}
                              {rowRange ? ` · Rows ${rowRange}` : ""}
                            </p>
                            {section.rows.map((row) => (
                              <div className="booking-row" key={row.label}>
                                <span className="booking-row-label">{row.label}</span>
                                {row.seats.map((seat) => (
                                  <Fragment key={seat.id}>
                                    <button
                                      type="button"
                                      className={`booking-seat is-${
                                        selected.some((item) => item.id === seat.id)
                                          ? "selected"
                                          : lost.includes(seat.code)
                                            ? "sold"
                                            : seat.state
                                      }`}
                                      disabled={lost.includes(seat.code) || (seat.state !== "available" && !seat.isMine)}
                                      onClick={() => select(seat)}
                                      aria-pressed={selected.some((item) => item.id === seat.id)}
                                      aria-label={`Seat ${seat.code}`}
                                      title={seat.code}
                                    >
                                      {seat.label}
                                    </button>
                                    {seat.aisleAfter ? <span className="booking-aisle" /> : null}
                                  </Fragment>
                                ))}
                              </div>
                            ))}
                          </div>
                        );
                      })
                    )}
                    <div className="booking-legend">
                      <span>
                        <i className="is-available" />
                        Available
                      </span>
                      <span>
                        <i className="is-selected" />
                        Selected
                      </span>
                      <span>
                        <i className="is-sold" />
                        Sold
                      </span>
                      <span>
                        <i className="is-held" />
                        Held by another user
                      </span>
                    </div>
                  </section>
                ) : hold ? (
                  <CheckoutForm
                    values={checkout}
                    errors={checkoutErrors}
                    formError={checkoutError}
                    busy={busy}
                    onChange={changeCheckout}
                    onPay={pay}
                  />
                ) : null}
              </div>

              <div className="booking-divider" aria-hidden="true" />

              {step === 1 ? (
                <aside className="booking-side">
                  <h3>Your seats · Max {maxSeats}</h3>
                  <p className="hint">Pick up to {maxSeats} seats from the map. Each seat can carry its own ticket type.</p>
                  <div className="booking-seat-list">
                    {selected.map((seat) => {
                      const ratio = types.find((type) => type.slug === seat.ticketType)?.priceRatio || 1;
                      return (
                        <div className="booking-seat-card" key={seat.id}>
                          <div className="booking-seat-card-top">
                            <strong>Seat {seat.code}</strong>
                            <strong className="price">{money(session.price * ratio)}</strong>
                            <button type="button" aria-label={`Remove seat ${seat.code}`} onClick={() => select(seat)}>
                              ×
                            </button>
                          </div>
                          <div className="booking-type-pills">
                            {types.map((type) => {
                              const blocked =
                                type.blockedFromRatingAge != null && film.ageRating?.minAge >= type.blockedFromRatingAge;
                              return (
                                <button
                                  type="button"
                                  key={type.slug}
                                  className={seat.ticketType === type.slug ? "active" : ""}
                                  disabled={blocked}
                                  onClick={() =>
                                    setSelected((current) =>
                                      current.map((item) => (item.id === seat.id ? { ...item, ticketType: type.slug } : item)),
                                    )
                                  }
                                >
                                  {type.name} {ratioLabel(type.priceRatio)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {invalid ? <p className="booking-error">Child tickets are not available for this age rating</p> : null}
                  <div className="booking-side-footer">
                    <div className="booking-subtotal">
                      <span>Subtotal</span>
                      <strong>{money(subtotal)}</strong>
                    </div>
                    <button
                      type="button"
                      className="booking-cta"
                      disabled={!selected.length || invalid || busy || mapStatus === "loading" || !options}
                      onClick={next}
                    >
                      {busy ? "Please wait…" : "Next: Checkout"}
                    </button>
                  </div>
                </aside>
              ) : hold ? (
                <CheckoutSummary session={session} film={film} hold={hold} busy={busy} />
              ) : null}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function CheckoutForm({ values, errors, formError, busy, onChange, onPay }) {
  return (
    <form id="booking-checkout" className="booking-form" noValidate onSubmit={onPay}>
      <Field
        name="fullName"
        label="Full name"
        value={values.fullName}
        error={errors.fullName}
        disabled={busy}
        autoComplete="name"
        onChange={onChange}
      />
      <div className="booking-form-grid">
        <Field
          name="email"
          label="Email"
          type="email"
          value={values.email}
          error={errors.email}
          disabled={busy}
          autoComplete="email"
          onChange={onChange}
        />
        <Field
          name="mobileNumber"
          label="Mobile number"
          type="tel"
          value={values.mobileNumber}
          error={errors.mobileNumber}
          disabled={busy}
          autoComplete="tel"
          onChange={onChange}
        />
      </div>
      <Field
        name="cardNumber"
        label="Card number"
        placeholder="e.g. 1234 4567 8901 2345"
        value={values.cardNumber}
        error={errors.cardNumber}
        disabled={busy}
        inputMode="numeric"
        autoComplete="off"
        maxLength={19}
        onChange={onChange}
      />
      <div className="booking-form-grid">
        <Field
          name="expiry"
          label="Expiry"
          placeholder="e.g. 12/34"
          value={values.expiry}
          error={errors.expiry}
          disabled={busy}
          autoComplete="off"
          maxLength={5}
          onChange={onChange}
        />
        <Field
          name="cvv"
          label="CVV"
          type="password"
          placeholder="e.g. 123"
          value={values.cvv}
          error={errors.cvv}
          disabled={busy}
          inputMode="numeric"
          autoComplete="off"
          maxLength={3}
          onChange={onChange}
        />
      </div>
      {formError ? (
        <p className="booking-error" role="alert">
          {formError}
        </p>
      ) : null}
    </form>
  );
}

function CheckoutSummary({ session, film, hold, busy }) {
  const seats = hold.seats.map((seat) => seat.code).join(", ");
  const tickets = ticketCounts(hold.seats);

  return (
    <aside className="booking-side">
      <h3>Summary</h3>
      <div className="booking-summary-card">
        <h4>{film.title}</h4>
        <p className="meta">
          Hall {session.hall?.name} · {shortDate(session.date)} · {session.time}
        </p>
        <div className="booking-summary-row">
          <span>Seats</span>
          <span>{seats}</span>
        </div>
        <div className="booking-summary-row">
          <span>Tickets</span>
          <span>{tickets}</span>
        </div>
      </div>
      <div className="booking-side-footer">
        <div className="booking-subtotal">
          <span>Subtotal</span>
          <strong>{money(hold.subtotal)}</strong>
        </div>
        <button type="submit" form="booking-checkout" className="booking-cta" disabled={busy}>
          {busy ? "Please wait…" : "Pay: Complete order"}
        </button>
      </div>
    </aside>
  );
}

function Confirmation({ confirmation, film, session, onTickets, onHome }) {
  const movie = confirmation.session?.movie || film;
  const seats = (confirmation.tickets || []).map((ticket) => ticket.seatCode).join(", ");
  const tickets = ticketCounts(
    (confirmation.tickets || []).map((ticket) => ({
      ticketType: ticket.ticketType?.name || ticket.ticketType,
    })),
  );
  const venue = confirmation.session?.venue?.name || session.venue?.name;
  const hall = confirmation.session?.hall?.name || session.hall?.name;
  const date = confirmation.session?.date || session.date;
  const time = confirmation.session?.time || session.time;

  return (
    <div className="booking-confirm">
      <div className="booking-confirm-icon">
        <CheckIcon />
      </div>
      <h2>Booking confirmed!</h2>
      <p>Your tickets are ready. We&apos;ve sent the confirmation to your email.</p>
      <div className="booking-order-badge">ORDER #{confirmation.reference}</div>
      <div className="booking-confirm-card">
        <div className="booking-confirm-film">
          <img src={movie.posterUrl || film.posterUrl} alt="" />
          <div>
            <h3>{movie.title || film.title}</h3>
            <p>
              {[venue, hall ? `Hall ${hall}` : null, shortDate(date), time].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="booking-summary-row">
          <span>Seats</span>
          <span>{seats}</span>
        </div>
        <div className="booking-summary-row">
          <span>Tickets</span>
          <span>{tickets}</span>
        </div>
        <div className="booking-summary-row total">
          <span>Total paid</span>
          <strong>{money(confirmation.totalPrice)}</strong>
        </div>
      </div>
      <div className="booking-confirm-actions">
        <button type="button" className="booking-cta" onClick={onTickets}>
          View my tickets
        </button>
        <button type="button" className="booking-cta ghost" onClick={onHome}>
          Back to home
        </button>
      </div>
    </div>
  );
}

function Field({ name, label, type = "text", value, error, onChange, ...props }) {
  const valid = Boolean(value) && !validateCheckout(name, value) && !error;
  return (
    <label className={error ? "field invalid" : valid ? "field valid" : "field"} htmlFor={name}>
      <span>{label}</span>
      <span className="booking-input-wrap">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          onChange={(event) => onChange(name, event.target.value)}
          {...props}
        />
        {valid ? (
          <span className="ok" aria-hidden="true">
            <img src={inputOkIcon} alt="" width="13" height="10" />
          </span>
        ) : null}
      </span>
      {error ? (
        <small id={`${name}-error`} className="field-error">
          {error}
        </small>
      ) : null}
    </label>
  );
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M7 14.5 12 19.5 21 9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
