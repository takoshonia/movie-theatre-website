import { useEffect, useState } from "react";
import { put } from "../api/client";
import { useApp } from "../context/AppProvider";

const FIELDS = ["fullName", "email", "mobileNumber", "dateOfBirth", "preferredVenueId"];

function todayIso() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function ageFromDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function validate(name, value) {
  const text = String(value ?? "").trim();
  if (name === "preferredVenueId" || name === "email") return "";
  if (!text) return "This field is required";
  if (name === "fullName" && text.length < 3) return "Use at least 3 characters";
  if (name === "fullName" && text.length > 50) return "Use 50 characters or fewer";
  if (name === "mobileNumber" && !/^5\d{8}$/.test(text.replace(/\s/g, ""))) {
    return "Enter 9 digits starting with 5";
  }
  if (name === "dateOfBirth") {
    const age = ageFromDate(text);
    if (!age || text > todayIso() || age < 12) return "You must be at least 12 years old";
  }
  return "";
}

function avatarMessage(file) {
  if (!file) return "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Use a JPG, PNG, or WebP image";
  }
  if (file.size > 2 * 1024 * 1024) return "Image must be 2 MB or smaller";
  return "";
}

function serverField(value) {
  if (!value) return "";
  return Array.isArray(value) ? value.join(" ") : String(value);
}

function startingValues(user) {
  return {
    fullName: user?.fullName || "",
    email: user?.email || "",
    mobileNumber: user?.mobileNumber || "",
    dateOfBirth: user?.dateOfBirth || "",
    preferredVenueId: String(user?.preferredVenue?.id || ""),
  };
}

export default function ProfileForm() {
  const { user, filterOptions, profileSaved } = useApp();
  const [baseline, setBaseline] = useState(() => startingValues(user));
  const [values, setValues] = useState(baseline);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [avatarError, setAvatarError] = useState("");
  const [preview, setPreview] = useState(user?.avatar || "");

  useEffect(() => {
    if (!avatar) {
      setPreview(user?.avatar || "");
      return undefined;
    }
    const url = URL.createObjectURL(avatar);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar, user?.avatar]);

  const changed = FIELDS.some((name) => String(values[name]) !== String(baseline[name])) || Boolean(avatar);
  const valid = FIELDS.every((name) => !validate(name, values[name]));

  function change(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: touched[name] ? validate(name, value) : "" }));
    setFormError("");
  }

  function blur(name) {
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({ ...current, [name]: validate(name, values[name]) }));
  }

  function chooseAvatar(event) {
    const file = event.target.files?.[0];
    const message = avatarMessage(file);
    setAvatarError(message);
    setAvatar(message ? null : file || null);
    event.target.value = "";
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || avatarError) return;

    const nextErrors = Object.fromEntries(FIELDS.map((name) => [name, validate(name, values[name])]));
    setErrors(nextErrors);
    setTouched(Object.fromEntries(FIELDS.map((name) => [name, true])));
    if (Object.values(nextErrors).some(Boolean)) return;

    const body = new FormData();
    FIELDS.forEach((name) => {
      if (name === "email") return;
      const value = name === "mobileNumber" ? values[name].replace(/\s/g, "") : values[name];
      body.append(name, value);
    });
    if (avatar) body.append("avatar", avatar);

    setBusy(true);
    setFormError("");
    try {
      const nextUser = await put("/profile", body);
      const nextValues = startingValues(nextUser);
      setBaseline(nextValues);
      setValues(nextValues);
      setAvatar(null);
      profileSaved(nextUser);
    } catch (requestError) {
      const fieldErrors = requestError.errors || {};
      setErrors((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, serverField(value)])),
      }));
      setFormError(
        requestError.status === 422 && Object.keys(fieldErrors).length
          ? "Check the highlighted fields"
          : requestError.message || "Could not save your profile. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const age = user?.age;
  const venues = filterOptions?.venues || [];

  return (
    <form className="profile-form" noValidate onSubmit={submit}>
      <div className={`profile-status ${user?.profileComplete ? "success" : "warning"}`}>
        {user?.profileComplete ? (
          <>
            <CheckIcon />
            Profile complete
          </>
        ) : (
          <>
            <AlertIcon />
            Complete your profile to buy a ticket
          </>
        )}
      </div>
      <label className="avatar-upload">
        <span className="avatar big-avatar">
          {preview ? <img src={preview} alt="" /> : <UserIcon />}
        </span>
        <span>
          Change photo <UploadIcon />
          <small>JPG, PNG, WebP · max 2 MB</small>
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          aria-label="Change photo"
          onChange={chooseAvatar}
        />
      </label>
      {avatarError ? <p className="field-error">{avatarError}</p> : null}
      <div className="form-grid">
        <Field
          name="fullName"
          label="Full name"
          value={values.fullName}
          error={errors.fullName}
          disabled={busy}
          maxLength={50}
          autoComplete="name"
          onChange={change}
          onBlur={blur}
        />
        <Field
          name="email"
          label="Email"
          type="email"
          value={values.email}
          error={errors.email}
          readOnly
          disabled
          onChange={change}
          onBlur={blur}
        />
        <Field
          name="mobileNumber"
          label="Mobile number"
          type="tel"
          placeholder="5XX XXX XXX"
          value={values.mobileNumber}
          error={errors.mobileNumber}
          disabled={busy}
          autoComplete="tel"
          onChange={change}
          onBlur={blur}
        />
        <Field
          name="dateOfBirth"
          label="Date of birth"
          type="date"
          max={todayIso()}
          value={values.dateOfBirth}
          error={errors.dateOfBirth}
          disabled={busy}
          onChange={change}
          onBlur={blur}
        />
        <label className={errors.preferredVenueId ? "field invalid" : "field"} htmlFor="preferredVenueId">
          <span>Preferred cinema</span>
          <select
            id="preferredVenueId"
            name="preferredVenueId"
            value={values.preferredVenueId}
            disabled={busy}
            onChange={(event) => change("preferredVenueId", event.target.value)}
            onBlur={() => blur("preferredVenueId")}
          >
            <option value="">Choose (optional)</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {age != null ? (
        <p className="eligibility muted">
          You are {age} years old.{" "}
          {age >= 18
            ? "You can buy tickets for every age rating."
            : `You cannot buy tickets for ${age < 16 ? "16+ and 18+" : "18+"} films.`}
        </p>
      ) : null}
      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={!changed || !valid || busy || Boolean(avatarError)}>
          {busy ? "Please wait…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Field({ name, label, error, onChange, onBlur, ...props }) {
  return (
    <label className={error ? "field invalid" : "field"} htmlFor={name}>
      <span>{label}</span>
      <input
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        onChange={(event) => onChange(name, event.target.value)}
        onBlur={() => onBlur(name)}
        {...props}
      />
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
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 9.2 8 11.5 12.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 2.5 16 15H2L9 2.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 7.2v3.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="12.6" r="0.7" fill="currentColor" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 9.5V2.5M4.5 4.5 7 2l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 9.5v2h9v-2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 15.2a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
