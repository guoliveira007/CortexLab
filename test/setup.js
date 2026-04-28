import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// Evita travamento causado por window.confirm() no jsdom
window.confirm = vi.fn(() => true);
