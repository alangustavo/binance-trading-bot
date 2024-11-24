// src/binance/binanceClient.ts

import { Spot } from '@binance/connector-typescript';
import dotenv from 'dotenv';

dotenv.config();

class BinanceClient {
    private static instance: BinanceClient;
    private client: Spot;

    /**
     * Private constructor to create a new instance of BinanceClient.
     * Retrieves the API key and secret key from environment variables.
     * Throws an error if the API keys are not found.
     */
    private constructor() {
        const apiKey = process.env.BINANCE_API_KEY;
        const secretKey = process.env.BINANCE_SECRET_KEY;

        if (!apiKey || !secretKey) {
            throw new Error('Binance API keys not found in environment variables.');
        }

        this.client = new Spot(apiKey, secretKey);
    }

    /**
     * Static method to get the singleton instance of BinanceClient.
     * Creates a new instance if one does not exist.
     * @returns {BinanceClient} The singleton instance of BinanceClient.
     */
    public static getInstance(): BinanceClient {
        if (!BinanceClient.instance) {
            BinanceClient.instance = new BinanceClient();
        }
        return BinanceClient.instance;
    }

    /**
     * Public method to get the Spot client instance.
     * @returns {Spot} The Spot client instance.
     */
    public getClient(): Spot {
        return this.client;
    }
}

export default BinanceClient;