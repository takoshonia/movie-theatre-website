import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { get } from "../api/client";
import SectionState from "../components/SectionState";
import { useApp } from "../context/AppProvider";
import seatsOkIcon from "../assets/seats-ok.png";
import "./sessions.css";

const SESSION_KEY = "selectedSessionId";

function todayIso() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function nextDates(count = 7) {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  });
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function weekdayLabel(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { weekday: "short" });
}

function pageList(current, last) {
  if (last <= 5) return Array.from({ length: last }, (_, index) => index + 1);
  const items = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);
  if (start > 2) items.push("gap");
  for (let number = start; number <= end; number += 1) items.push(number);
  if (end < last - 1) items.push("gap");
  items.push(last);
  return items;
}

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function allowedFormatSlugs(filterOptions, venues) {
  if (!venues.length) return null;
  const selected = filterOptions.venues.filter((venue) => venues.includes(venue.slug));
  return new Set(selected.flatMap((venue) => venue.formats.map((format) => format.slug)));
}

function buildSearch(current, overrides = {}, { resetPage = false } = {}) {
  const date = overrides.date ?? (isIsoDate(current.get("date")) ? current.get("date") : todayIso());
  const venues = overrides.venues ?? current.getAll("venues[]");
  const formats = overrides.formats ?? current.getAll("formats[]");
  const languages = overrides.languages ?? current.getAll("languages[]");
  const bands = overrides.bands ?? current.getAll("bands[]");
  const sort = overrides.sort === undefined ? current.get("sort") : overrides.sort;
  const page = resetPage ? 1 : Number(overrides.page ?? current.get("page") ?? 1);

  const next = new URLSearchParams();
  next.set("date", date);
  venues.forEach((value) => next.append("venues[]", value));
  formats.forEach((value) => next.append("formats[]", value));
  languages.forEach((value) => next.append("languages[]", value));
  bands.forEach((value) => next.append("bands[]", value));
  if (sort) next.set("sort", sort);
  if (page > 1) next.set("page", String(page));
  return next;
}

function apiQuery(params) {
  const date = isIsoDate(params.get("date")) ? params.get("date") : todayIso();
  const query = new URLSearchParams();
  query.set("date", date);
  params.getAll("venues[]").forEach((value) => query.append("venues[]", value));
  params.getAll("formats[]").forEach((value) => query.append("formats[]", value));
  params.getAll("languages[]").forEach((value) => query.append("languages[]", value));
  params.getAll("bands[]").forEach((value) => query.append("bands[]", value));
  const sort = params.get("sort");
  if (sort) query.set("sort", sort);
  query.set("page", String(Number(params.get("page")) || 1));
  return query.toString();
}

function SessionsSkeleton() {
  return (
    <div className="session-list" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="skeleton session-skeleton" key={index} />
      ))}
    </div>
  );
}

export default function SessionsPage() {
  const { filterOptions } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [groups, setGroups] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();

  const dates = useMemo(() => nextDates(), []);
  const date = isIsoDate(searchParams.get("date")) ? searchParams.get("date") : todayIso();
  const venues = searchParams.getAll("venues[]");
  const formats = searchParams.getAll("formats[]");
  const languages = searchParams.getAll("languages[]");
  const bands = searchParams.getAll("bands[]");
  const sort = searchParams.get("sort") || "";
  const page = Number(searchParams.get("page")) || 1;
  const query = apiQuery(searchParams);

  const visibleFormats = useMemo(() => {
    if (!filterOptions) return null;
    const allowed = allowedFormatSlugs(filterOptions, venues);
    if (!allowed) return filterOptions.formats;
    return filterOptions.formats.filter((format) => allowed.has(format.slug));
  }, [filterOptions, venues]);

  useEffect(() => {
    if (!filterOptions) return;
    const selectedVenues = searchParams.getAll("venues[]");
    if (!selectedVenues.length) return;
    const allowed = allowedFormatSlugs(filterOptions, selectedVenues);
    const selectedFormats = searchParams.getAll("formats[]");
    if (selectedFormats.every((slug) => allowed.has(slug))) return;
    setSearchParams(
      buildSearch(
        searchParams,
        { formats: selectedFormats.filter((slug) => allowed.has(slug)) },
        { resetPage: true },
      ),
      { replace: true },
    );
  }, [filterOptions, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");

    get(`/sessions?${query}`, { includeMeta: true })
      .then((result) => {
        if (cancelled) return;
        setGroups(result.data || []);
        setMeta(result.meta);
        setStatus("ready");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setGroups([]);
        setMeta(null);
        setError(requestError.message || "Could not load sessions");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [query, attempt]);

  function update(overrides, options) {
    setSearchParams(buildSearch(searchParams, overrides, options));
  }

  function changeVenues(slug) {
    const nextVenues = toggleValue(venues, slug);
    const allowed = filterOptions ? allowedFormatSlugs(filterOptions, nextVenues) : null;
    const nextFormats = allowed ? formats.filter((item) => allowed.has(item)) : formats;
    update({ venues: nextVenues, formats: nextFormats }, { resetPage: true });
  }

  function openSession(movie, session) {
    if (session.isSoldOut) return;
    sessionStorage.setItem(SESSION_KEY, String(session.id));
    navigate(`/movies/${movie.slug}?session=${session.id}`, { state: { session } });
  }

  const activeFilters = venues.length + formats.length + languages.length + bands.length;

  return (
    <section className="sessions">
      <header className="sessions-intro">
        <h1>Sessions</h1>
        <p>Browse showtimes across all venues</p>
      </header>

      <div className="sessions-layout">
        <aside className="filters-panel">
          <h2>Filters</h2>
          <FilterGroup
            label="Venue"
            options={filterOptions?.venues}
            selected={venues}
            getValue={(item) => item.slug}
            getLabel={(item) => item.name}
            getDetail={(item) => item.city}
            onToggle={changeVenues}
          />
          <fieldset className="filter-group">
            <legend>Date</legend>
            <div className="date-strip" role="group" aria-label="Date">
              {dates.map((iso) => (
                <button
                  type="button"
                  key={iso}
                  className={iso === date ? "date-cell is-selected" : "date-cell"}
                  aria-pressed={iso === date}
                  onClick={() => update({ date: iso }, { resetPage: true })}
                >
                  <span>{weekdayLabel(iso)}</span>
                  <strong>{Number(iso.slice(-2))}</strong>
                </button>
              ))}
            </div>
          </fieldset>
          <FilterGroup
            label="Format"
            options={visibleFormats}
            selected={formats}
            getValue={(item) => item.slug}
            getLabel={(item) => item.name}
            onToggle={(slug) => update({ formats: toggleValue(formats, slug) }, { resetPage: true })}
          />
          <FilterGroup
            label="Language"
            options={filterOptions?.languages}
            selected={languages}
            getValue={(item) => item.slug}
            getLabel={(item) => item.name}
            onToggle={(slug) => update({ languages: toggleValue(languages, slug) }, { resetPage: true })}
          />
          <FilterGroup
            label="Time of day"
            options={filterOptions?.timeBands}
            selected={bands}
            getValue={(item) => item.id}
            getLabel={(item) => item.label}
            onToggle={(id) => update({ bands: toggleValue(bands, id) }, { resetPage: true })}
          />
          <button
            type="button"
            className="clear-filters"
            onClick={() => update({ venues: [], formats: [], languages: [], bands: [], sort: "" }, { resetPage: true })}
          >
            Clear filters
          </button>
          <p className="filter-count">
            {activeFilters} {activeFilters === 1 ? "filter" : "filters"} active
          </p>
        </aside>

        <div className="sessions-results">
          <div className="results-toolbar">
            {meta ? <p>Showing {meta.totalSessions} sessions</p> : <p />}
            <label className="sort-control">
              <span>Sort</span>
              <select
                value={sort || filterOptions?.sorts?.[0]?.id || ""}
                onChange={(event) => update({ sort: event.target.value }, { resetPage: true })}
                disabled={!filterOptions}
              >
                {(filterOptions?.sorts || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <SectionState
            status={status}
            error={error}
            onRetry={() => setAttempt((value) => value + 1)}
            skeleton={<SessionsSkeleton />}
          >
            {groups.length ? (
              <div className="session-list">
                {groups.map((group) => (
                  <article className="session-group" key={group.movie.id}>
                    <header className="session-heading">
                      <img className="session-poster" src={group.movie.posterUrl} alt="" />
                      <div>
                        <div className="session-title">
                          <h2>{group.movie.title}</h2>
                          <span className="session-age">{group.movie.ageRating?.code}</span>
                        </div>
                        <p className="session-meta">{group.movie.runtimeMinutes} min</p>
                      </div>
                    </header>
                    <div className="session-times">
                      {group.sessions.map((session) => (
                        <button
                          type="button"
                          key={session.id}
                          className="showtime"
                          disabled={session.isSoldOut}
                          onClick={() => openSession(group.movie, session)}
                        >
                          <span className="showtime-top">
                            <strong>{session.time}</strong>
                            <span className="showtime-format">{session.format?.name}</span>
                          </span>
                          <span className="showtime-mid">
                            <span className="showtime-language">{session.language?.name}</span>
                            <span className={session.isSoldOut || session.seatsLeft <= 8 ? "seats-low" : "seats-ok"}>
                              {session.isSoldOut ? (
                                "Sold out"
                              ) : (
                                <>
                                  {session.seatsLeft > 8 ? (
                                    <img src={seatsOkIcon} width="14" height="14" alt="" />
                                  ) : null}
                                  {session.seatsLeft} left
                                </>
                              )}
                            </span>
                          </span>
                          <span className="showtime-bottom">
                            <span className="showtime-place">
                              {session.venue?.name}
                              {session.hall?.name ? ` · Hall ${session.hall.name}` : ""}
                            </span>
                            {session.isSoldOut ? null : <span className="showtime-price">₾{session.price}</span>}
                          </span>
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-copy">No sessions found.</p>
            )}
            {meta?.lastPage > 1 ? (
              <nav className="session-pages" aria-label="Pages">
                <button type="button" className="page-button" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
                  ‹
                </button>
                {pageList(page, meta.lastPage).map((item, index) =>
                  item === "gap" ? (
                    <span className="page-gap" key={`gap-${index}`}>
                      …
                    </span>
                  ) : (
                    <button
                      type="button"
                      key={item}
                      className={item === page ? "page-button is-selected" : "page-button"}
                      aria-current={item === page ? "page" : undefined}
                      onClick={() => update({ page: item })}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className="page-button"
                  disabled={page >= meta.lastPage}
                  onClick={() => update({ page: page + 1 })}
                >
                  ›
                </button>
              </nav>
            ) : null}
          </SectionState>
        </div>
      </div>

      <footer className="sessions-footer">
        <p>
          Kino <span>XII</span>
        </p>
        <p>© {new Date().getFullYear()} Kino XII. All rights reserved.</p>
      </footer>
    </section>
  );
}

function FilterGroup({ label, options, selected, getValue, getLabel, getDetail, onToggle }) {
  return (
    <fieldset className="filter-group">
      <legend>{label}</legend>
      <div className="filter-options">
        {options ? (
          options.map((item) => {
            const value = getValue(item);
            const detail = getDetail?.(item);
            return (
              <label className="filter-check" key={value}>
                <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
                <span>
                  {getLabel(item)}
                  {detail ? <small> · {detail}</small> : null}
                </span>
              </label>
            );
          })
        ) : (
          <span className="skeleton filter-skeleton" />
        )}
      </div>
    </fieldset>
  );
}
