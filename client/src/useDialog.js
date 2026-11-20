import { useEffect, useRef } from "react";

// Trap focus and restore it to the opener when a modal closes.
export function useDialog(onEscape) {
  const ref = useRef(null);
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;
  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = ref.current;
    const controls = () => [
      ...panel.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), [contenteditable="true"], [tabindex="0"]',
      ),
    ];
    (
      controls().find((el) => el.matches("input")) ||
      controls()[0] ||
      panel
    ).focus();
    const onKey = (event) => {
      if ([...document.querySelectorAll('[aria-modal="true"]')].at(-1) !== panel) return;
      if (event.key === "Escape") {
        event.preventDefault();
        escapeRef.current?.();
      }
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0],
        last = items.at(-1);
      if (!items.length) {
        event.preventDefault();
        panel.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);
  return ref;
}
