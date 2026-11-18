import Link from "next/link";
import { AccountState } from "@/components/account/AccountShell";
import styles from "@/components/account/Account.module.css";

export function AdminState({ ar, error, retry }: { ar: boolean; error?: string; retry: () => void }) {
  if (!error) return <AccountState loading title={ar ? "جارٍ التحميل…" : "Loading…"} />;
  if (error === "access") return <AccountState title={ar ? "هذه الصفحة مخصصة للمسؤولين" : "Administrator access required"}>
    <Link href="/" className={styles.textLink}>{ar ? "العودة إلى اللعبة" : "Return to game"}</Link>
  </AccountState>;
  return <AccountState error title={ar ? "تعذّر تحميل البيانات" : "Couldn’t load the data"}>
    <button className={styles.secondary} onClick={retry}>{ar ? "إعادة المحاولة" : "Try again"}</button>
  </AccountState>;
}
