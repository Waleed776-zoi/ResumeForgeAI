"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_TEMPLATE,
  isTemplateId,
  type TemplateId,
} from "@/generators/templates";

const STORAGE_KEY = "resumeforge:template";

/**
 * The chosen template, shared across every download control on the page.
 *
 * It lives in localStorage rather than in a parent's state because the
 * controls that need it are not siblings: the picker sits in one panel and
 * the cover letter's buttons sit in another, and threading a provider through
 * a Server Component page to join them would be a lot of plumbing for one
 * string. The consequence to accept is that the two only converge on mount —
 * which is fine, because both read the same key and neither renders a
 * download until then.
 *
 * The stored value is read AFTER mount, never during render: the server has
 * no localStorage, and reading it during render makes the first paint
 * disagree with the server's HTML.
 */
export function useTemplatePreference() {
  const [selected, setSelected] = useState<TemplateId>(DEFAULT_TEMPLATE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isTemplateId(stored)) setSelected(stored);

    // Keep panels in step when the picker writes a new choice — including
    // in another tab, which is what the native `storage` event covers.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && isTemplateId(event.newValue)) {
        setSelected(event.newValue);
      }
    };

    window.addEventListener(STORAGE_KEY, syncFromStorage as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(STORAGE_KEY, syncFromStorage as EventListener);
      window.removeEventListener("storage", onStorage);
    };

    function syncFromStorage() {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (isTemplateId(value)) setSelected(value);
    }
  }, []);

  function choose(id: TemplateId) {
    setSelected(id);
    window.localStorage.setItem(STORAGE_KEY, id);
    // `storage` only fires in OTHER tabs, so this is how the cover letter
    // panel hears about a choice made in the picker beside it.
    window.dispatchEvent(new Event(STORAGE_KEY));
  }

  return { selected, choose };
}
