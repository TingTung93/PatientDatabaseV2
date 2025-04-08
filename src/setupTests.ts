/// <reference types="jest" />
/// <reference types="node" />

import '@testing-library/jest-dom';
import type { IntersectionObserverCallback, IntersectionObserverInit } from './types/dom';

declare global {
  interface Window {
    matchMedia: jest.Mock;
    IntersectionObserver: {
      new (callback: IntersectionObserverCallback, options?: IntersectionObserverInit): IntersectionObserver;
    };
    ResizeObserver: {
      new (callback: ResizeObserverCallback): ResizeObserver;
    };
  }
}

// Mock window.matchMedia
window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

// Mock IntersectionObserver
class MockIntersectionObserver implements Partial<IntersectionObserver> {
  constructor(private readonly callback: IntersectionObserverCallback, private readonly options?: IntersectionObserverInit) {}

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  root: Element | null = null;
  rootMargin: string = '0px';
  thresholds: readonly number[] = [0];
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
class MockResizeObserver implements Partial<ResizeObserver> {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Suppress console errors during tests
const originalError = console.error;

beforeAll(() => {
  console.error = (...args: unknown[]): void => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
}); 