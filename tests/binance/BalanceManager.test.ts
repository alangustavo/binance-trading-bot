import { jest } from '@jest/globals';
import { WebsocketAPI } from '@binance/connector-typescript';
import { BalanceManager } from '../../src/binance/BalanceManager';
import BinanceClient from '../../src/binance/BinanceClient';

jest.mock('@binance/connector-typescript', () => ({
    WebsocketAPI: jest.fn(),
    Spot: jest.fn()
}));

describe('BalanceManager', () => {
    let balanceManager: BalanceManager;
    let mockSpotClient: any;
    let mockBinanceClient: any;
    let mockWebsocketAPI: any;
    let wsCallbacks: any;

    beforeEach(() => {
        // Setup process.env
        process.env.BINANCE_API_KEY = 'test-api-key';
        process.env.BINANCE_SECRET_KEY = 'test-secret-key';

        // Capture WebsocketAPI callbacks
        (WebsocketAPI as jest.MockedClass<typeof WebsocketAPI>).mockImplementation((apiKey, apiSecret, options) => {
            if (options) {
                wsCallbacks = options.callbacks;
            }
            mockWebsocketAPI = {
                disconnect: jest.fn(),
                account: jest.fn()
            };
            return mockWebsocketAPI;
        });

        // Mock Spot client
        mockSpotClient = {
            userAsset: jest.fn()
        };

        // Mock BinanceClient
        mockBinanceClient = {
            getClient: jest.fn().mockReturnValue(mockSpotClient)
        };

        // Mock BinanceClient.getInstance
        jest.spyOn(BinanceClient, 'getInstance').mockReturnValue(mockBinanceClient);

        balanceManager = new BalanceManager();
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.BINANCE_API_KEY;
        delete process.env.BINANCE_SECRET_KEY;
    });

    describe('constructor', () => {
        it('should initialize with default BinanceClient', () => {
            expect(BinanceClient.getInstance).toHaveBeenCalled();
            expect(mockBinanceClient.getClient).toHaveBeenCalled();
        });

        it('should accept custom BinanceClient', () => {
            const customBinanceClient = {
                getClient: jest.fn().mockReturnValue(mockSpotClient)
            };
            new BalanceManager(customBinanceClient as any);
            expect(customBinanceClient.getClient).toHaveBeenCalled();
        });
    });

    describe('getBalances', () => {
        it('should return only non-zero balances', async () => {
            const mockBalances = [
                { asset: 'BTC', free: '1.0', locked: '0.0', freeze: '0.0', withdrawing: '0.0', ipoable: '0.0', btcValuation: '1.0' },
                { asset: 'ETH', free: '0.0', locked: '0.0', freeze: '0.0', withdrawing: '0.0', ipoable: '0.0', btcValuation: '0.0' },
                { asset: 'USDT', free: '100.0', locked: '50.0', freeze: '0.0', withdrawing: '0.0', ipoable: '0.0', btcValuation: '0.1' }
            ];

            mockSpotClient.userAsset.mockResolvedValue(mockBalances);

            const result = await balanceManager.getBalances();

            expect(result).toHaveLength(2);
            expect(result).toContainEqual({
                asset: 'BTC',
                free: '1.0',
                locked: '0.0'
            });
            expect(result).toContainEqual({
                asset: 'USDT',
                free: '100.0',
                locked: '50.0'
            });
        });

        it('should handle API errors', async () => {
            mockSpotClient.userAsset.mockRejectedValue(new Error('API Error'));

            await expect(balanceManager.getBalances()).rejects.toThrow('Failed to fetch account balances');
        });
    });

    describe('WebSocket functionality', () => {
        let mockCallback: jest.Mock;

        beforeEach(() => {
            mockCallback = jest.fn();
        });

        it('should initialize WebSocket connection on subscribe', async () => {
            await balanceManager.subscribeToBalanceUpdates(mockCallback);

            expect(WebsocketAPI).toHaveBeenCalledWith(
                'test-api-key',
                'test-secret-key',
                expect.any(Object)
            );
        });

        it('should handle WebSocket open event', async () => {
            await balanceManager.subscribeToBalanceUpdates(mockCallback);
            wsCallbacks.open(mockWebsocketAPI);

            expect(mockWebsocketAPI.account).toHaveBeenCalledWith({
                recvWindow: 5000
            });
        });

        it('should handle balance updates through WebSocket', async () => {
            await balanceManager.subscribeToBalanceUpdates(mockCallback);

            const mockMessage = JSON.stringify({
                e: 'outboundAccountPosition',
                B: [
                    { asset: 'BTC', free: '1.0', locked: '0.0' },
                    { asset: 'ETH', free: '0.0', locked: '0.0' }
                ]
            });

            wsCallbacks.message(mockMessage);

            expect(mockCallback).toHaveBeenCalledWith([
                { asset: 'BTC', free: '1.0', locked: '0.0' }
            ]);
        });

        it('should handle multiple subscribers', async () => {
            const mockCallback2 = jest.fn();
            await balanceManager.subscribeToBalanceUpdates(mockCallback);
            await balanceManager.subscribeToBalanceUpdates(mockCallback2);

            const mockMessage = JSON.stringify({
                e: 'outboundAccountPosition',
                B: [
                    { asset: 'BTC', free: '1.0', locked: '0.0' }
                ]
            });

            wsCallbacks.message(mockMessage);

            expect(mockCallback).toHaveBeenCalled();
            expect(mockCallback2).toHaveBeenCalled();
        });

        it('should handle unsubscribe correctly', async () => {
            await balanceManager.subscribeToBalanceUpdates(mockCallback);
            await balanceManager.unsubscribeFromBalanceUpdates(mockCallback);

            const mockMessage = JSON.stringify({
                e: 'outboundAccountPosition',
                B: [
                    { asset: 'BTC', free: '1.0', locked: '0.0' }
                ]
            });

            wsCallbacks.message(mockMessage);

            expect(mockCallback).not.toHaveBeenCalled();
            expect(mockWebsocketAPI.disconnect).toHaveBeenCalled();
        });

        it('should handle WebSocket message parsing errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            await balanceManager.subscribeToBalanceUpdates(mockCallback);

            wsCallbacks.message('invalid json');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to process WebSocket message:',
                expect.any(Error)
            );
            expect(mockCallback).not.toHaveBeenCalled();
        });

        it('should handle WebSocket errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            await balanceManager.subscribeToBalanceUpdates(mockCallback);

            wsCallbacks.error();

            expect(consoleSpy).toHaveBeenCalledWith('WebSocket error occurred');
        });
        it('should handle WebSocket close', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            await balanceManager.subscribeToBalanceUpdates(mockCallback);

            wsCallbacks.close();

            expect(consoleSpy).toHaveBeenCalledWith('Disconnected from Binance WebSocket');
        });

        it('should throw error if API credentials are missing', async () => {
            delete process.env.BINANCE_API_KEY;
            delete process.env.BINANCE_SECRET_KEY;

            await expect(balanceManager.subscribeToBalanceUpdates(mockCallback))
                .rejects.toThrow('Binance API credentials not found in environment variables');
        });

        it('should not initialize WebSocket twice for multiple subscribers', async () => {
            await balanceManager.subscribeToBalanceUpdates(mockCallback);
            await balanceManager.subscribeToBalanceUpdates(jest.fn());

            expect(WebsocketAPI).toHaveBeenCalledTimes(1);
        });
    });
});