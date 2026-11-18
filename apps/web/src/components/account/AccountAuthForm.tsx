"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { getApiOrigin } from "@/lib/apiOrigin";
import { validateInviteReturnPath } from "@/lib/roomInvites";
import { connectSocket } from "@/lib/socket";
import { AccountShell } from "./AccountShell";
import styles from "./Account.module.css";

export function AccountAuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { language, setAuth, addToast } = useGameStore();
  const ar = language === "ar";
  const register = mode === "register";
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [inviteReturnPath, setInviteReturnPath] = useState<string | null>(null);
  useEffect(() => {
    const destination = typeof window !== "undefined"
      ? validateInviteReturnPath(new URLSearchParams(window.location?.search).get("returnTo")) : null;
    setInviteReturnPath(destination);
    if (destination) useGameStore.getState().setLanguage(new URLSearchParams(destination.slice(2)).get("lang") as "en" | "ar");
    setReady(true);
  }, [mode]);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(null);
    if (register && !/^[a-zA-Z0-9_\u0600-\u06FF]{3,20}$/.test(username.trim())) {
      setError({ field: "username", message: ar ? "استخدم اسماً من ٣ إلى ٢٠ حرفاً عربياً أو إنجليزياً أو رقماً أو شرطة سفلية، دون مسافات." : "Use 3–20 Arabic or English letters, numbers or underscores, without spaces." });
      return;
    }
    if (register && password !== confirmation) {
      setError({ field: "confirmation", message: ar ? "كلمتا المرور غير متطابقتين. أعد كتابة التأكيد." : "Passwords do not match. Check your confirmation." });
      return;
    }
    submitting.current = true;
    setLoading(true);
    try {
      const response = await fetch(`${getApiOrigin()}/api/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, ...(register ? { username: username.trim() } : {}) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = response.status === 429
          ? (ar ? "محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً." : "Too many attempts. Wait a moment and try again.")
          : !register && response.status === 401
          ? (data?.error === "Account locked. Try again later."
            ? (ar ? "الحساب مقفل مؤقتاً. حاول لاحقاً." : "Your account is temporarily locked. Try again later.")
            : (ar ? "تحقق من البريد الإلكتروني وكلمة المرور وحاول مجدداً." : "Check your email and password and try again."))
          : register && response.status === 409
          ? (ar ? "تعذر إنشاء الحساب بهذه البيانات. جرّب اسماً أو بريداً إلكترونياً آخر." : "These details could not be registered. Try another name or email address.")
          : (ar ? "تعذر إكمال الطلب. تحقق من بياناتك وحاول مجدداً." : "We could not complete your request. Check your details and try again.");
        setError({ message });
        return;
      }
      if (typeof data?.userId !== "string" || typeof data?.token !== "string" || typeof data?.username !== "string") throw new Error("Invalid identity response");
      setAuth({ ...data, isGuest: false });
      connectSocket(data.userId, data.username, data.token, false);
      addToast("success", ar ? "أهلاً بك في سيف المعرفة." : "Welcome to Sword of Knowledge.");
      router.push(inviteReturnPath || "/");
    } catch {
      setError({ message: ar ? "تعذر الاتصال بالخادم. تحقق من اتصالك وحاول مجدداً." : "We could not reach the server. Check your connection and try again." });
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  const title = register ? (ar ? "إنشاء حساب" : "Create your account") : (ar ? "مرحباً بعودتك" : "Welcome back");
  return <AccountShell title={title}>
    <div className={styles.authGrid}>
      <section className={styles.panel} aria-label={ar ? "بيانات الحساب" : "Account details"}>
        <form className={styles.form} onSubmit={submit} aria-busy={loading}>
          {error && <div id="auth-error" className={styles.error} role="alert" tabIndex={-1} ref={errorRef}>{error.message}</div>}
          <fieldset disabled={!ready || loading} className={styles.fieldset}>
            <legend className={styles.srOnly}>{register ? (ar ? "إنشاء حساب" : "Create account") : (ar ? "تسجيل الدخول" : "Sign in")}</legend>
            {register && <div className={styles.field}>
              <label htmlFor="account-name">{ar ? "اسم اللاعب" : "Warrior name"}</label>
              <input id="account-name" name="username" autoComplete="username" className={styles.input} value={username}
                onChange={event => setUsername(event.target.value)} required minLength={3} maxLength={20}
                aria-invalid={error?.field === "username" || undefined} aria-describedby={error?.field === "username" ? "auth-error account-name-hint" : "account-name-hint"} />
              <p id="account-name-hint" className={styles.hint}>{ar ? "٣–٢٠ حرفاً أو رقماً أو شرطة سفلية، دون مسافات." : "3–20 letters, numbers or underscores. No spaces."}</p>
            </div>}
            <div className={styles.field}>
              <label htmlFor="account-email">{ar ? "البريد الإلكتروني" : "Email address"}</label>
              <input id="account-email" name="email" type="email" autoComplete={register ? "email" : "username"} inputMode="email" dir="ltr" className={styles.input}
                value={email} onChange={event => setEmail(event.target.value)} required />
            </div>
            <div className={styles.field}>
              <div className={styles.passwordHeader}>
                <label htmlFor="account-password">{ar ? "كلمة المرور" : "Password"}</label>
              </div>
              <input id="account-password" name="password" type={visible ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"}
                className={styles.input} value={password} onChange={event => setPassword(event.target.value)} required minLength={register ? 8 : 1} maxLength={128}
                aria-describedby={register ? "account-password-hint" : undefined} />
                <button type="button" className={styles.passwordToggle} aria-pressed={visible} onClick={() => setVisible(value => !value)}>
                  {visible ? (ar ? "إخفاء كلمة المرور" : "Hide password") : (ar ? "إظهار كلمة المرور" : "Show password")}
                </button>

              {register && <p id="account-password-hint" className={styles.hint}>{ar ? "٨ أحرف على الأقل." : "At least 8 characters."}</p>}
            </div>
            {register && <div className={styles.field}>
              <label htmlFor="account-confirmation">{ar ? "تأكيد كلمة المرور" : "Confirm password"}</label>
              <input id="account-confirmation" name="confirmPassword" type={visible ? "text" : "password"} autoComplete="new-password" className={styles.input}
                value={confirmation} onChange={event => setConfirmation(event.target.value)} required maxLength={128}
                aria-invalid={error?.field === "confirmation" || undefined} aria-describedby={error?.field === "confirmation" ? "auth-error" : undefined} />
            </div>}
            <button className={styles.primary} type="submit">{loading ? (ar ? "جارٍ المتابعة…" : "Please wait…") : register ? (ar ? "إنشاء حساب" : "Create account") : (ar ? "تسجيل الدخول" : "Sign in")}</button>
          </fieldset>
        </form>
        <div className={styles.formFooter}>
          <p>{register ? (ar ? "لديك حساب بالفعل؟" : "Already have an account?") : (ar ? "جديد في سيف المعرفة؟" : "New to Sword of Knowledge?")} {" "}
            <Link href={`${register ? "/login" : "/register"}${inviteReturnPath ? `?returnTo=${encodeURIComponent(inviteReturnPath)}` : ""}`} className={styles.textLink}>{register ? (ar ? "سجّل الدخول" : "Sign in") : (ar ? "أنشئ حساباً" : "Create an account")}</Link>
          </p>
          <Link href={inviteReturnPath || "/"} className={styles.textLink}>{ar ? "المتابعة كضيف" : "Continue as guest"}</Link>
        </div>
      </section>
      <aside className={`${styles.panel} ${styles.paper}`}>
        <h2>{ar ? "نتائجك، محفوظة." : "Your results, saved."}</h2>
        <ul className={styles.benefits}>
          <li>{ar ? "نتائج المعارك المكتملة محفوظة لحسابك." : "Completed results saved for your account."}</li>
          <li>{ar ? "إحصائيات تستند إلى إجاباتك الفعلية." : "Statistics based on your actual answers."}</li>
        </ul>
      </aside>
    </div>
  </AccountShell>;
}
