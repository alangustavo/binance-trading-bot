// tests/setupTests.ts
import { jest } from '@jest/globals';

beforeAll(() => {
    jest.setTimeout(10000);
});

afterAll(() => {
    jest.clearAllTimers();
});