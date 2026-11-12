import { useEffect, useRef, useState } from "react";
import { ApiError, fetchAccount, getOrder, saveAccount, setAuthToken } from "@/lib/api";
import { needsHydrating, savedOrderFields, toAccountBody } from "@/lib/account-sync";
import { useMe } from "@/state/me";

// Keeps a signed-in phone and its account in step, quietly:
//  - sends the token with account calls and orders,
//  - on open, brings in what changed on another device,
//  - sends changes after a short pause (details, vibes, wishlist, orders),
//  - fills in order totals and status for orders that arrived as links only.
// Signed out, it does nothing and nothing leaves the phone.

const PAUSE_MS = 1500;

export function AccountSync() {
  const me = useMe();
  const { account, ready, details, taste, orders } = me;
  const { signOut, mergeFromAccount, updateOrder } = me;
  const asked = useRef<string | null>(null);
  // The token we last pulled for. Nothing is sent before that, so a phone with
  // old data can't overwrite newer changes made elsewhere.
  const [synced, setSynced] = useState<string | null>(null);
  const pushed = useRef("");

  // The token, and its end date.
  useEffect(() => {
    if (account && new Date(account.expiresAt).getTime() <= Date.now()) {
      setAuthToken(null);
      signOut();
      return;
    }
    setAuthToken(account?.token ?? null);
  }, [account, signOut]);

  // Once per open: pull what changed elsewhere.
  useEffect(() => {
    if (!ready || !account || asked.current === account.token) return;
    const token = account.token;
    asked.current = token;
    fetchAccount()
      .then((a) => {
        mergeFromAccount(a);
        setSynced(token);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) signOut();
        else asked.current = null; // offline: ask again next time the app opens
      });
  }, [ready, account, mergeFromAccount, signOut]);

  // Push changes after a pause.
  useEffect(() => {
    if (!ready || !account || synced !== account.token) return;
    const body = toAccountBody({ details, taste, orders }, account.name || details.name.trim().split(/\s+/)[0] || "");
    const sig = JSON.stringify(body);
    if (sig === pushed.current) return;
    const timer = setTimeout(() => {
      saveAccount(body)
        .then(() => {
          pushed.current = sig;
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) signOut();
          // Anything else: try again at the next change or app open.
        });
    }, PAUSE_MS);
    return () => clearTimeout(timer);
  }, [ready, account, synced, details, taste, orders, signOut]);

  // Orders that came from the account have only a number and key: fetch the rest.
  const todo = orders.filter(needsHydrating).map((o) => `${o.number}:${o.key}`).join(",");
  useEffect(() => {
    if (!account || !todo) return;
    let live = true;
    for (const pair of todo.split(",").slice(0, 20)) {
      const [number, key] = pair.split(":");
      getOrder(number!, key!)
        .then((o) => live && updateOrder(number!, savedOrderFields(o)))
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, [account, todo, updateOrder]);

  return null;
}
