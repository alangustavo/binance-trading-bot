// tests/services/BinanceClient.test.ts
import { BinanceClient } from '../../src/services/BinanceClient';
import { BinanceError } from '../../src/core/errors/BinanceError';
import { config } from 'dotenv';
import Binance from 'binance-api-node';

// Cria um tipo mais específico para o WebSocket da Binance
type BinanceWebSocket = ReturnType<typeof Binance>['ws'];

// Mock do WebSocket
const createMockWebSocket = (): Partial<BinanceWebSocket> => ({
    depth: jest.fn(),
    candles: jest.fn(),
    trades: jest.fn(),
    aggTrades: jest.fn(),
    user: jest.fn(),
    ticker: jest.fn(),
    allTickers: jest.fn(),
    miniTicker: jest.fn(),
    allMiniTickers: jest.fn(),
    customSubStream: jest.fn()
});

// Mock do cliente Binance
const createMockBinanceClient = (): Partial<ReturnType<typeof Binance>> => ({
    time: jest.fn(),
    exchangeInfo: jest.fn(),
    accountInfo: jest.fn(),
    prices: jest.fn(),
    candles: jest.fn(),
    allBookTickers: jest.fn(),
    trades: jest.fn(),
    ws: createMockWebSocket() as BinanceWebSocket
});

// Mock do módulo binance-api-node
jest.mock('binance-api-node', () => {
    return jest.fn().mockImplementation(() => createMockBinanceClient());
});

// Garante que o dotenv está carregado para os testes
config();

describe('BinanceClient', () => {
    const mockBinance = Binance as jest.MockedFunction<typeof Binance>;

    beforeEach(() => {
        // Limpa a instância singleton entre os testes
        BinanceClient.resetInstance();
        // Limpa os mocks
        jest.clearAllMocks();
        // Reseta a implementação padrão do mock
        mockBinance.mockImplementation(() => createMockBinanceClient() as ReturnType<typeof Binance>);
    });

    it('should create instance with environment variables', () => {
        const client = BinanceClient.getInstance();
        expect(client).toBeInstanceOf(BinanceClient);
        expect(client.getClient()).toBeDefined();
    });

    it('should return same instance when getInstance is called multiple times', () => {
        const instance1 = BinanceClient.getInstance();
        const instance2 = BinanceClient.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should throw error when environment variables are not set', () => {
        // Backup das variáveis de ambiente
        const apiKey = process.env.BINANCE_API_KEY;
        const secretKey = process.env.BINANCE_SECRET_KEY;

        // Remove as variáveis de ambiente
        delete process.env.BINANCE_API_KEY;
        delete process.env.BINANCE_SECRET_KEY;

        expect(() => BinanceClient.getInstance()).toThrow(BinanceError);

        // Restaura as variáveis de ambiente
        process.env.BINANCE_API_KEY = apiKey;
        process.env.BINANCE_SECRET_KEY = secretKey;
    });

    it('should provide access to binance api client', () => {
        const client = BinanceClient.getInstance();
        const apiClient = client.getClient();
        expect(apiClient).toBeDefined();

        // Verifica se o cliente tem os métodos principais da API da Binance
        const methods = ['time', 'exchangeInfo', 'accountInfo', 'ws'];
        methods.forEach(method => {
            expect(apiClient).toHaveProperty(method);
        });

        // Verifica se os métodos do WebSocket estão presentes
        const wsClient = apiClient.ws;
        expect(wsClient).toBeDefined();
        const wsMethods = ['depth', 'candles', 'trades', 'user', 'ticker', 'allTickers'];
        wsMethods.forEach(method => {
            expect(wsClient).toHaveProperty(method);
        });
    });

    it('should throw BinanceError when client initialization fails', () => {
        // Limpa a instância singleton antes do teste
        BinanceClient.resetInstance();

        // Simula um erro na inicialização do cliente Binance
        mockBinance.mockImplementationOnce(() => {
            throw new Error('API initialization failed');
        });

        try {
            BinanceClient.getInstance();
            fail('Should have thrown an error');
        } catch (error) {
            if (error instanceof BinanceError) {
                expect(error.message).toBe('Failed to initialize Binance client');
            } else {
                fail('Error should be instance of BinanceError');
            }
        }
    });
});