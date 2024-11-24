// tests/binance/ExchangeInfoManager.test.ts

import { Spot } from '@binance/connector-typescript';
import { ExchangeInfoManager } from '../../src/binance/ExchangeInfoManager';
import { mockExchangeInfo, expectedTradingRules } from '../mocks/exchangeInfo.mock';

// Spy no console.error
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

// Mock da classe Spot
jest.mock('@binance/connector-typescript', () => ({
    Spot: jest.fn().mockImplementation(() => ({
        exchangeInformation: jest.fn()
    }))
}));

describe('ExchangeInfoManager', () => {
    let manager: ExchangeInfoManager;
    let spotClient: jest.Mocked<Spot>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Reset instance
        // @ts-ignore - Accessing private static property for testing
        ExchangeInfoManager.instance = undefined;

        consoleErrorSpy.mockClear();

        spotClient = new Spot() as jest.Mocked<Spot>;
        spotClient.exchangeInformation = jest.fn().mockResolvedValue(mockExchangeInfo);
        manager = ExchangeInfoManager.getInstance(spotClient);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('getInstance', () => {
        it('should create a singleton instance', () => {
            const instance1 = ExchangeInfoManager.getInstance(spotClient);
            const instance2 = ExchangeInfoManager.getInstance(spotClient);
            expect(instance1).toBe(instance2);
        });
    });

    describe('getTradingRules', () => {
        it('should return trading rules for valid trading symbol', async () => {
            const rules = await manager.getTradingRules('BTCUSDT');
            expect(rules).toEqual(expectedTradingRules);
        });

        it('should return null for non-existent symbol', async () => {
            const rules = await manager.getTradingRules('INVALIDPAIR');
            expect(rules).toBeNull();
        });

        it('should return null for non-trading symbol', async () => {
            const rules = await manager.getTradingRules('ETHUSDT');
            expect(rules).toBeNull();
        });

        it('should use cached data within TTL', async () => {
            await manager.getTradingRules('BTCUSDT');
            await manager.getTradingRules('BTCUSDT');
            expect(spotClient.exchangeInformation).toHaveBeenCalledTimes(1);
        });

        it('should update cache after TTL expires', async () => {
            await manager.getTradingRules('BTCUSDT');

            // Advance time past cache TTL
            jest.advanceTimersByTime(1000 * 60 * 6); // 6 minutes

            await manager.getTradingRules('BTCUSDT');
            expect(spotClient.exchangeInformation).toHaveBeenCalledTimes(2);
        });
    });

    describe('resilience', () => {
        it('should continue using stale cache when update fails', async () => {
            // First successful call to populate cache
            await manager.getTradingRules('BTCUSDT');

            // Mock API failure
            spotClient.exchangeInformation.mockRejectedValueOnce(new Error('API Error'));

            // Advance time past cache TTL to force update attempt
            jest.advanceTimersByTime(1000 * 60 * 6); // 6 minutes

            // Should still return data from cache
            const rules = await manager.getTradingRules('BTCUSDT');
            expect(rules).toEqual(expectedTradingRules);

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(consoleErrorSpy.mock.calls[0][0]).toBe('Failed to update exchange info, using cached data if available:');
            expect(consoleErrorSpy.mock.calls[0][1]).toBeInstanceOf(Error);
        });

        it('should respect retry interval after failure', async () => {
            // First successful call to populate cache
            await manager.getTradingRules('BTCUSDT');

            // Mock API failure
            spotClient.exchangeInformation.mockRejectedValueOnce(new Error('API Error'));

            // Advance time past cache TTL
            jest.advanceTimersByTime(1000 * 60 * 6);

            // First attempt after TTL expires
            await manager.getTradingRules('BTCUSDT');

            // Immediate retry should not call API
            await manager.getTradingRules('BTCUSDT');

            expect(spotClient.exchangeInformation).toHaveBeenCalledTimes(2); // Initial call + one failed attempt
        });

        it('should retry after retry interval', async () => {
            // First successful call to populate cache
            await manager.getTradingRules('BTCUSDT');

            // Mock API failure
            spotClient.exchangeInformation.mockRejectedValueOnce(new Error('API Error'));

            // Advance time past cache TTL
            jest.advanceTimersByTime(1000 * 60 * 6);

            // First attempt after TTL expires
            await manager.getTradingRules('BTCUSDT');

            // Advance time past retry interval
            jest.advanceTimersByTime(31000);

            // Should try again
            await manager.getTradingRules('BTCUSDT');
            expect(spotClient.exchangeInformation).toHaveBeenCalledTimes(3); // Initial call + failed attempt + retry
        });

        it('should return null when no cache and update fails', async () => {
            // Ensure no cache exists
            // @ts-ignore - Accessing private property for testing
            manager.tradingRules = new Map();

            spotClient.exchangeInformation.mockRejectedValueOnce(new Error('API Error'));

            const rules = await manager.getTradingRules('BTCUSDT');
            expect(rules).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });
});