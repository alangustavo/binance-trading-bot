// tests/binance/BinanceClient.test.ts

import { Spot } from '@binance/connector-typescript';
import BinanceClient from '../../src/binance/BinanceClient';

// Mock the dotenv config
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

// Mock the Spot class
jest.mock('@binance/connector-typescript', () => {
    return {
        Spot: jest.fn().mockImplementation((apiKey, apiSecret) => ({
            apiKey,
            apiSecret
        }))
    };
});

describe('BinanceClient', () => {
    // Store original environment variables
    const originalEnv = process.env;
    let spotMock: jest.Mock;

    beforeEach(() => {
        // Get the mocked Spot constructor
        spotMock = (Spot as unknown) as jest.Mock;

        // Reset all mocks before each test
        jest.clearAllMocks();

        // Reset the singleton instance before each test
        // @ts-ignore - Accessing private static property for testing
        BinanceClient.instance = undefined;

        // Setup clean environment variables for each test
        process.env = {
            ...originalEnv,
            BINANCE_API_KEY: 'test-api-key',
            BINANCE_SECRET_KEY: 'test-secret-key'
        };
    });

    afterEach(() => {
        // Restore original environment variables
        process.env = originalEnv;
    });

    describe('getInstance', () => {
        it('should create a new instance when called for the first time', () => {
            const instance = BinanceClient.getInstance();

            expect(instance).toBeInstanceOf(BinanceClient);
            expect(spotMock).toHaveBeenCalledTimes(1);
            expect(spotMock).toHaveBeenCalledWith('test-api-key', 'test-secret-key');
        });

        it('should return the same instance on subsequent calls', () => {
            const firstInstance = BinanceClient.getInstance();
            const secondInstance = BinanceClient.getInstance();

            expect(firstInstance).toBe(secondInstance);
            expect(spotMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('constructor', () => {
        it('should throw error when BINANCE_API_KEY is missing', () => {
            delete process.env.BINANCE_API_KEY;

            expect(() => {
                BinanceClient.getInstance();
            }).toThrow('Binance API keys not found in environment variables.');
        });

        it('should throw error when BINANCE_SECRET_KEY is missing', () => {
            delete process.env.BINANCE_SECRET_KEY;

            expect(() => {
                BinanceClient.getInstance();
            }).toThrow('Binance API keys not found in environment variables.');
        });
    });

    describe('getClient', () => {
        it('should return the Spot client instance with correct configuration', () => {
            const instance = BinanceClient.getInstance();
            const client = instance.getClient();

            expect(client).toBeDefined();
            expect(client.apiKey).toBe('test-api-key');
            expect(client.apiSecret).toBe('test-secret-key');
        });
    });
});