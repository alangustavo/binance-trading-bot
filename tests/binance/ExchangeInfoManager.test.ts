// tests/binance/ExchangeInfoManager.test.ts
import { ExchangeInfoManager } from '../../src/binance/ExchangeInfoManager';
import { Spot } from '@binance/connector-typescript';

const createValidSymbol = {
    symbol: 'BTCUSDT',
    status: 'TRADING',
    orderTypes: ['LIMIT', 'MARKET', 'STOP_LIMIT'],
    filters: [
        {
            filterType: 'PRICE_FILTER',
            minPrice: '0.01',
            maxPrice: '100000.00',
            tickSize: '0.01'
        },
        {
            filterType: 'LOT_SIZE',
            minQty: '0.00001000',
            maxQty: '9000.00000000',
            stepSize: '0.00001000'
        },
        {
            filterType: 'MIN_NOTIONAL',
            minNotional: '10.00000000'
        }
    ]
};

jest.mock('@binance/connector-typescript', () => ({
    Spot: jest.fn().mockImplementation(() => ({
        exchangeInformation: jest.fn()
    }))
}));

describe('ExchangeInfoManager', () => {
    let manager: ExchangeInfoManager;
    let mockSpot: jest.Mocked<Spot>;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        mockSpot = new Spot('', '') as jest.Mocked<Spot>;
        mockSpot.exchangeInformation = jest.fn().mockResolvedValue({ symbols: [createValidSymbol] } as any);
        manager = new ExchangeInfoManager(mockSpot, 1000, 500);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe('Constructor', () => {
        it('should initialize timestamp variables with zero', () => {
            const managerInstance = new ExchangeInfoManager(mockSpot);

            // Precisamos acessar as propriedades privadas para teste
            const privateManager = managerInstance as any;
            expect(privateManager.lastUpdate).toBe(0);
            expect(privateManager.lastUpdateAttempt).toBe(0);
        });
        it('should initialize with default values', () => {
            expect(manager.getAllTradingRules().size).toBe(0);
            return manager.getTradingRules('BTCUSDT').then(() => {
                expect(mockSpot.exchangeInformation).toHaveBeenCalledTimes(1);
            });
        });

        it('should use custom cache TTL and retry interval', async () => {
            jest.useFakeTimers();

            const customManager = new ExchangeInfoManager(mockSpot, 100, 50);
            await customManager.getTradingRules('BTCUSDT');
            expect(mockSpot.exchangeInformation).toHaveBeenCalledTimes(1);

            // Avança o tempo para expirar o cache
            jest.advanceTimersByTime(150);

            // Configura um novo valor para o retorno da API
            const newSymbol = { ...createValidSymbol, orderTypes: ['LIMIT'] };
            mockSpot.exchangeInformation.mockResolvedValueOnce({ symbols: [newSymbol] } as any);

            await customManager.getTradingRules('BTCUSDT');
            expect(mockSpot.exchangeInformation).toHaveBeenCalledTimes(2);

            jest.useRealTimers();
        });
    });

    describe('getTradingRules', () => {
        it('should return trading rules for valid symbol', async () => {
            const rules = await manager.getTradingRules('BTCUSDT');
            expect(rules).toBeTruthy();
            expect(rules?.symbol).toBe('BTCUSDT');
            expect(rules?.priceRules.tickSize).toBe('0.01');
        });

        it('should return null for invalid symbol', async () => {
            const rules = await manager.getTradingRules('INVALID');
            expect(rules).toBeNull();
        });

        it('should use cache within TTL', async () => {
            await manager.getTradingRules('BTCUSDT');
            await manager.getTradingRules('BTCUSDT');
            expect(mockSpot.exchangeInformation).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cache and Update Behavior', () => {
        it('should not update cache if retry interval has not passed', async () => {
            mockSpot.exchangeInformation.mockRejectedValueOnce(new Error('API Error'));
            await manager.getTradingRules('BTCUSDT');
            await manager.getTradingRules('BTCUSDT'); // Immediate retry
            expect(mockSpot.exchangeInformation).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should return cached data within retry interval after error', async () => {
            await manager.getTradingRules('BTCUSDT');

            mockSpot.exchangeInformation.mockRejectedValueOnce(new Error('API Error'));
            const rules = await manager.getTradingRules('BTCUSDT');

            expect(rules).toBeTruthy();
            expect(rules?.symbol).toBe('BTCUSDT');
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('should force update even within cache TTL', async () => {
            await manager.getTradingRules('BTCUSDT');

            const newSymbol = { ...createValidSymbol, symbol: 'BTCUSDT', orderTypes: ['LIMIT'] };
            mockSpot.exchangeInformation.mockResolvedValueOnce({ symbols: [newSymbol] } as any);

            await manager.forceUpdate();
            const rules = await manager.getTradingRules('BTCUSDT');

            expect(rules?.allowedOrderTypes).toEqual(['LIMIT']);
            expect(mockSpot.exchangeInformation).toHaveBeenCalledTimes(2);
        });
    });

    describe('Cache and Update Behavior', () => {
        it('should not update cache if retry interval has not passed', async () => {
            mockSpot.exchangeInformation.mockRejectedValueOnce(new Error('API Error'));
            await manager.getTradingRules('BTCUSDT');
            await manager.getTradingRules('BTCUSDT'); // Immediate retry
            expect(mockSpot.exchangeInformation).toHaveBeenCalledTimes(1);
        });

        it('should return cached data within retry interval after error', async () => {
            await manager.getTradingRules('BTCUSDT');

            mockSpot.exchangeInformation.mockRejectedValueOnce(new Error('API Error'));
            const rules = await manager.getTradingRules('BTCUSDT');

            expect(rules).toBeTruthy();
            expect(rules?.symbol).toBe('BTCUSDT');
        });

        it('should force update even within cache TTL', async () => {
            await manager.getTradingRules('BTCUSDT');

            const newSymbol = { ...createValidSymbol, symbol: 'BTCUSDT', orderTypes: ['LIMIT'] };
            mockSpot.exchangeInformation.mockResolvedValueOnce({ symbols: [newSymbol] } as any);

            await manager.forceUpdate();
            const rules = await manager.getTradingRules('BTCUSDT');

            expect(rules?.allowedOrderTypes).toEqual(['LIMIT']);
            expect(mockSpot.exchangeInformation).toHaveBeenCalledTimes(2);
        });
    });

    describe('Error handling', () => {
        it('should handle invalid symbol status', async () => {
            const invalidSymbol = { ...createValidSymbol, status: 'BREAK' };
            mockSpot.exchangeInformation.mockResolvedValueOnce({ symbols: [invalidSymbol] } as any);
            const rules = await manager.getTradingRules('BTCUSDT');
            expect(rules).toBeNull();
        });

        it('should handle missing filters', async () => {
            const invalidSymbol = { ...createValidSymbol, filters: [] };
            mockSpot.exchangeInformation.mockResolvedValueOnce({ symbols: [invalidSymbol] } as any);
            const rules = await manager.getTradingRules('BTCUSDT');
            expect(rules).toBeNull();
        });

        it('should handle invalid order types', async () => {
            const symbolWithInvalidOrders = { ...createValidSymbol, orderTypes: ['INVALID_TYPE'] };
            mockSpot.exchangeInformation.mockResolvedValueOnce({ symbols: [symbolWithInvalidOrders] } as any);
            const rules = await manager.getTradingRules('BTCUSDT');
            expect(rules?.allowedOrderTypes).toEqual([]);
        });

        it('should handle API errors', async () => {
            mockSpot.exchangeInformation.mockRejectedValueOnce(new Error('API Error'));
            const rules = await manager.getTradingRules('BTCUSDT');
            expect(rules).toBeNull();
        });
    });

    describe('getAllTradingRules', () => {
        it('should return all trading rules', async () => {
            await manager.getTradingRules('BTCUSDT');
            const rules = manager.getAllTradingRules();
            expect(rules.size).toBe(1);
            expect(rules.get('BTCUSDT')).toBeTruthy();
        });

        it('should return a copy of trading rules', async () => {
            await manager.getTradingRules('BTCUSDT');
            const rules = manager.getAllTradingRules();
            rules.clear();

            const newRules = manager.getAllTradingRules();
            expect(newRules.size).toBe(1);
        });
    });
});