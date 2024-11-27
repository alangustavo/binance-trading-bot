// src/binance/BinanceClient.ts

import { Spot } from '@binance/connector-typescript';
import dotenv from 'dotenv';

dotenv.config();

export class BinanceClient {
    private static instance: BinanceClient;
    private client: Spot;

    private constructor() {
        const apiKey = process.env.BINANCE_API_KEY;
        const apiSecret = process.env.BINANCE_SECRET_KEY;

        if (!apiKey || !apiSecret) {
            throw new Error('Binance API keys not found in environment variables.');
        }

        this.client = new Spot(apiKey, apiSecret);
    }

    public static getInstance(): BinanceClient {
        if (!BinanceClient.instance) {
            BinanceClient.instance = new BinanceClient();
        }
        return BinanceClient.instance;
    }

    public getClient(): Spot {
        return this.client;
    }
}

export default BinanceClient;