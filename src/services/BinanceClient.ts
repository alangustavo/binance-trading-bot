// src/services/BinanceClient.ts
import Binance from 'binance-api-node';
import { BinanceError } from '../core/errors/BinanceError';
import { IBinanceClient, IBinanceCredentials } from '../interfaces/IBinanceClient';
import { config } from 'dotenv';

// Carrega as variáveis de ambiente
config();

export class BinanceClient implements IBinanceClient {
    private static instance: BinanceClient | null = null;
    private readonly client: ReturnType<typeof Binance>;

    private constructor() {
        const credentials = this.getCredentials();
        this.validateCredentials(credentials);

        try {
            this.client = Binance({
                apiKey: credentials.apiKey!,
                apiSecret: credentials.secretKey!,
            });
        } catch (error) {
            throw new BinanceError('Failed to initialize Binance client', error);
        }
    }

    private getCredentials(): IBinanceCredentials {
        return {
            apiKey: process.env.BINANCE_API_KEY,
            secretKey: process.env.BINANCE_SECRET_KEY
        };
    }

    private validateCredentials(credentials: IBinanceCredentials): void {
        const { apiKey, secretKey } = credentials;

        if (!apiKey || !secretKey) {
            throw new BinanceError(
                'Missing Binance API credentials. Please check your environment variables: ' +
                'BINANCE_API_KEY and BINANCE_SECRET_KEY'
            );
        }
    }

    public static getInstance(): BinanceClient {
        if (!BinanceClient.instance) {
            BinanceClient.instance = new BinanceClient();
        }
        return BinanceClient.instance;
    }

    public getClient(): ReturnType<typeof Binance> {
        return this.client;
    }

    // Método para testes - não use em produção
    public static resetInstance(): void {
        BinanceClient.instance = null;
    }
}