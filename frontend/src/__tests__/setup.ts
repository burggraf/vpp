import '@testing-library/jest-dom'

// Polyfill ResizeObserver for jsdom (used by Radix UI components)
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as any).ResizeObserver = ResizeObserverMock
}
