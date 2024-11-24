// tests/core/BinanceError.test.ts
import { BinanceError } from '../../src/core/errors/BinanceError';

describe('BinanceError', () => {
    it('should create error with message', () => {
        const error = new BinanceError('Test error');
        expect(error.message).toBe('Test error');
        expect(error.name).toBe('BinanceError');
    });

    it('should create error from unknown error', () => {
        const error = BinanceError.from('string error');
        expect(error).toBeInstanceOf(BinanceError);
        expect(error.message).toBe('Unknown error occurred');
    });

    it('should create error from Error instance', () => {
        const originalError = new Error('Original error');
        const error = BinanceError.from(originalError);
        expect(error).toBeInstanceOf(BinanceError);
        expect(error.message).toBe('Original error');
        expect(error.originalError).toBe(originalError);
    });

    it('should return same instance if error is already BinanceError', () => {
        const originalError = new BinanceError('Original BinanceError');
        const error = BinanceError.from(originalError);
        expect(error).toBe(originalError);
        expect(error.message).toBe('Original BinanceError');
    });
});