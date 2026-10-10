import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { get } from "../api/client";
import SectionState from "../components/SectionState";
import { useApp } from "../context/AppProvider";

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
  const search = overrides.search === undefined ? current.get("search") || "" : overrides.search;
  const page = resetPage ? 1 : Number(overrides.page ?? current.get("page") ?? 1);

  const next = new URLSearchParams();
  next.set("date", date);
  venues.forEach((value) => next.append("venues[]", value));
  formats.forEach((value) => next.append("formats[]", value));
  languages.forEach((value) => next.append("languages[]", value));
  bands.forEach((value) => next.append("bands[]", value));
  if (sort) next.set("sort", sort);
  if (search) next.set("search", search);
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
  const search = params.get("search");
  if (search) query.set("search", search);
  query.set("page", String(Number(params.get("page")) || 1));
  return query.toString();
}

function SessionsSkeleton() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="skeleton" key={index} />
      ))}
    </div>
  );
}

function monthLabel(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { month: "short" });
}

export default function SessionsPage() {
  const { filterOptions, requireProfile, setNotice } = useApp();
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
  const [filmSearch, setFilmSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    setFilmSearch(searchParams.get("search") || "");
  }, [searchParams]);
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

  async function openSession(movie, session) {
    if (session.isSoldOut) return;
    const nextUser = await requireProfile();
    if (!nextUser) return;
    if (movie.ageRating?.minAge >= 16 && nextUser.age < movie.ageRating.minAge) {
      setNotice(`This film is only for ages ${movie.ageRating.minAge} and over.`);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, String(session.id));
    navigate(`/movies/${movie.slug}?session=${session.id}`, { state: { session } });
  }

  const activeFilters = venues.length + formats.length + languages.length + bands.length;

  return (
    <div className="container page sessions-page">
      <h1>Sessions</h1>
      <p className="muted">Choose a film, a time, and your seat</p>
      <div className="sessions-layout">
        <aside className="filters">
          <h2>
            <FilterIcon />
            Filters
          </h2>
          <FilterGroup
            label="Venue"
            options={filterOptions?.venues}
            selected={venues}
            getValue={(item) => item.slug}
            getLabel={(item) => item.name}
            getDetail={(item) => item.city}
            onToggle={changeVenues}
          />
          <fieldset>
            <legend>Date</legend>
            <div className="dates" role="group" aria-label="Date">
              {dates.map((iso) => (
                <button
                  type="button"
                  key={iso}
                  className={iso === date ? "active" : ""}
                  aria-pressed={iso === date}
                  onClick={() => update({ date: iso }, { resetPage: true })}
                >
                  <span>{iso === todayIso() ? "Today" : weekdayLabel(iso)}</span>
                  <strong>{Number(iso.slice(-2))}</strong>
                  <small>{monthLabel(iso)}</small>
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
            className="btn outline full"
            onClick={() =>
              update({ venues: [], formats: [], languages: [], bands: [], sort: "", search: "" }, { resetPage: true })
            }
          >
            Clear filters
          </button>
          <small className="filter-count">
            {activeFilters} active {activeFilters === 1 ? "filter" : "filters"}
          </small>
        </aside>

        <section className="sessions-results">
          <div className="results-bar">
            <span className="muted">{meta ? `${meta.totalSessions} sessions` : "Loading sessions…"}</span>
            <form
              className="session-search"
              onSubmit={(event) => {
                event.preventDefault();
                update({ search: filmSearch }, { resetPage: true });
              }}
            >
              <SearchIcon />
              <input
                aria-label="Search films in sessions"
                placeholder="Search films"
                value={filmSearch}
                onChange={(event) => setFilmSearch(event.target.value)}
              />
              <button className="btn text-btn" type="submit">
                Search
              </button>
            </form>
            <label className="sort">
              <span>Sort:</span>
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
              groups.map((group) => (
                <article className="session-group" key={group.movie.id}>
                  <Link className="session-film" to={`/movies/${group.movie.slug}`}>
                    <img src={group.movie.posterUrl} alt="" />
                    <div>
                      <h2>
                        {group.movie.title} <span className="age">{group.movie.ageRating?.code}</span>
                      </h2>
                      <p>
                        {group.movie.runtimeMinutes} min
                        {group.movie.genres?.length ? ` · ${group.movie.genres.map((genre) => genre.name).join(" · ")}` : ""}
                      </p>
                    </div>
                  </Link>
                  <div className="session-grid">
                    {group.sessions.map((session) => (
                      <button
                        type="button"
                        key={session.id}
                        className={session.isSoldOut ? "session-card disabled" : "session-card"}
                        disabled={session.isSoldOut}
                        onClick={() => openSession(group.movie, session)}
                      >
                        <div className="session-top">
                          <strong>{session.time}</strong>
                          <span className="badge">{session.format?.name}</span>
                        </div>
                        <div className="session-middle">
                          <span>
                            {session.language?.code} · Hall {session.hall?.name}
                          </span>
                          <small className={session.isSoldOut ? "sold" : "available"}>
                            {session.isSoldOut ? "Sold out" : `${session.seatsLeft} seats`}
                          </small>
                        </div>
                        <div className="session-bottom">
                          <small>{session.venue?.name}</small>
                          {session.isSoldOut ? null : <strong>{session.price} ₾</strong>}
                        </div>
                      </button>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty">
                <p>No sessions found for these filters.</p>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => update({ venues: [], formats: [], languages: [], bands: [], search: "" }, { resetPage: true })}
                >
                  Clear filters
                </button>
              </div>
            )}
            {meta?.lastPage > 1 ? (
              <nav className="pagination" aria-label="Pages">
                <button type="button" className="icon-btn" disabled={page <= 1} aria-label="Previous page" onClick={() => update({ page: page - 1 })}>
                  ‹
                </button>
                {Array.from({ length: meta.lastPage }, (_, index) => index + 1).map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={item === page ? "active" : ""}
                    aria-current={item === page ? "page" : undefined}
                    onClick={() => update({ page: item })}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  className="icon-btn"
                  disabled={page >= meta.lastPage}
                  aria-label="Next page"
                  onClick={() => update({ page: page + 1 })}
                >
                  ›
                </button>
                <small>
                  {meta.currentPage} / {meta.lastPage}
                </small>
              </nav>
            ) : null}
          </SectionState>
        </section>
      </div>
    </div>
  );
}

function FilterGroup({ label, options, selected, getValue, getLabel, getDetail, onToggle }) {
  return (
    <fieldset>
      <legend>{label}</legend>
      {options ? (
        options.map((item) => {
          const value = getValue(item);
          const detail = getDetail?.(item);
          return (
            <label className="checkbox" key={value}>
              <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
              <span>
                {getLabel(item)}
                {detail ? <small>{detail}</small> : null}
              </span>
            </label>
          );
        })
      ) : (
        <div className="skeleton" />
      )}
    </fieldset>
  );
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 4.5h12l-4.5 5.2V14l-3 1.2V9.7L3 4.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.2 10.2 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
