export type IntersectionObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver
) => void;

export interface IntersectionObserverInit {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
}

export type ResizeObserverCallback = (
  entries: ResizeObserverEntry[],
  observer: ResizeObserver
) => void; 