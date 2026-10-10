import { useEffect, useState } from "react";
import Modal from "./Modal";
import { useApp } from "../context/AppProvider";

const EMPTY = {
  username: "",
  email: "",
  password: "",
  password_confirmation: "",
};

function validate(name, value, values) {
  const text = String(value ?? "").trim();
  if (!text) return "This field is required";
  if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Enter a valid email";
  if ((name === "username" || name === "password") && text.length < 3) return "Use at least 3 characters";
  if (name === "password_confirmation" && text !== values.password) return "Passwords do not match";
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

export default function AuthModal() {
  const { authMode, closeAuth, openAuth } = useApp();
  if (!authMode) return null;

  return (
    <Modal open title={authMode === "signup" ? "Sign up" : "Log in"} onClose={closeAuth}>
      <AuthForm key={authMode} mode={authMode} onSwitch={() => openAuth(authMode === "signup" ? "login" : "signup")} />
    </Modal>
  );
}

function AuthForm({ mode, onSwitch }) {
  const { login, register } = useApp();
  const signup = mode === "signup";
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [avatarError, setAvatarError] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!avatar) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(avatar);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  function change(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
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
    if (busy) return;

    const names = signup ? ["username", "email", "password", "password_confirmation"] : ["email", "password"];
    const nextErrors = Object.fromEntries(names.map((name) => [name, validate(name, values[name], values)]));
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || avatarError) return;

    setBusy(true);
    setFormError("");
    try {
      if (signup) {
        await register(
          {
            username: values.username.trim(),
            email: values.email.trim(),
            password: values.password,
            password_confirmation: values.password_confirmation,
          },
          avatar,
        );
      } else {
        await login(values.email.trim(), values.password);
      }
    } catch (requestError) {
      const fieldErrors = requestError.errors || {};
      setErrors((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, serverField(value)])),
      }));
      setFormError(
        requestError.status === 422 && Object.keys(fieldErrors).length
          ? "Check the highlighted fields"
          : requestError.message || "Could not sign in. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      {signup ? (
        <>
          <label className="avatar-upload">
            <span className="avatar">
              {preview ? <img src={preview} alt="" /> : <UserIcon />}
            </span>
            <span>
              Upload photo
              <small>Optional · JPG, PNG, WebP · 2 MB</small>
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseAvatar}
              disabled={busy}
              aria-label="Upload photo"
            />
          </label>
          {avatarError ? <p className="field-error">{avatarError}</p> : null}
          <Field
            name="username"
            label="Username"
            value={values.username}
            error={errors.username}
            disabled={busy}
            autoComplete="username"
            onChange={change}
          />
        </>
      ) : null}
      <Field
        name="email"
        label="Email"
        type="email"
        value={values.email}
        error={errors.email}
        disabled={busy}
        autoComplete="email"
        onChange={change}
      />
      <div className={signup ? "form-grid" : undefined}>
        <Field
          name="password"
          label="Password"
          type="password"
          value={values.password}
          error={errors.password}
          disabled={busy}
          autoComplete={signup ? "new-password" : "current-password"}
          onChange={change}
        />
        {signup ? (
          <Field
            name="password_confirmation"
            label="Confirm password"
            type="password"
            value={values.password_confirmation}
            error={errors.password_confirmation}
            disabled={busy}
            autoComplete="new-password"
            onChange={change}
          />
        ) : null}
      </div>
      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}
      <button type="submit" className="btn primary full" disabled={busy || Boolean(avatarError)}>
        {busy ? "Please wait…" : signup ? "Sign up" : "Log in"}
      </button>
      <p className="form-switch">
        {signup ? "Already have an account?" : "No account yet?"}{" "}
        <button type="button" onClick={onSwitch} disabled={busy}>
          {signup ? "Log in" : "Sign up"}
        </button>
      </p>
    </form>
  );
}

function Field({ name, label, type = "text", value, error, onChange, ...props }) {
  return (
    <label className={error ? "field invalid" : "field"} htmlFor={name}>
      <span>{label}</span>
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
      {error ? (
        <small id={`${name}-error`} className="field-error">
          {error}
        </small>
      ) : null}
    </label>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 15.2a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
