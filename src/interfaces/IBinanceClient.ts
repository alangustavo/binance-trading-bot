// src/interfaces/IBinanceClient.ts
import Binance from 'binance-api-node';

export interface IBinanceClient {
    getClient(): ReturnType<typeof Binance>;
}

// Tipos úteis que podemos precisar ao lidar com a API da Binance
export interface IBinanceConfig {
    apiKey: string;
    apiSecret: string;
}

export interface IBinanceCredentials {
    apiKey: string | undefined;
    secretKey: string | undefined;
}