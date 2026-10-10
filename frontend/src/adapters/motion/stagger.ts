/**
 * Staggered scroll-in for list children via IntersectionObserver —
 * dependency-free (no animation library) and intended for in-app lists.
 * Returned function disconnects the observer.
 */
export interface StaggerOptions {
  /** Child selector; defaults to direct element children. */
  selector?: string;
  /** Delay between siblings in ms. */
  staggerMs?: number;
  /** Initial vertical offset in px. */
  y?: number;
  /** Reveal each element only once (default true). */
  once?: boolean;
}

export function createStagger(listEl: HTMLElement, opts: StaggerOptions = {}): () => void {
  const { selector, staggerMs = 45, y = 10, once = true } = opts;
  const children = selector
    ? Array.from(listEl.querySelectorAll<HTMLElement>(selector))
    : Array.from(listEl.children).filter((el): el is HTMLElement => el instanceof HTMLElement);

  children.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = `translateY(${y}px)`;
    el.style.transition = `opacity 0.4s ease-out ${i * staggerMs}ms, transform 0.4s ease-out ${i * staggerMs}ms`;
  });

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      el.style.opacity = '1';
      el.style.transform = 'none';
      if (once) observer.unobserve(el);
    }
  });
  children.forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}
