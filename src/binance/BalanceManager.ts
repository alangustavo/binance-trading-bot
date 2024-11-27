// src/binance/BalanceManager.ts

import { Spot, WebsocketAPI } from '@binance/connector-typescript';
import { IAssetBalance, IBalanceManager, BinanceBalance } from '../types/balance';
import BinanceClient from './BinanceClient';

export class BalanceManager implements IBalanceManager {
    private balanceCallbacks: Set<(balances: IAssetBalance[]) => void>;
    private readonly spotClient: Spot;
    private wsClient: WebsocketAPI | null = null;

    constructor(
        private readonly binanceClient: BinanceClient = BinanceClient.getInstance()
    ) {
        this.spotClient = binanceClient.getClient();
        this.balanceCallbacks = new Set();
    }

    /**
     * Retrieves current account balances with non-zero amounts
     * @returns Promise<IAssetBalance[]> Array of balances with non-zero amounts
     */
    public async getBalances(): Promise<IAssetBalance[]> {
        try {
            const balances = await this.spotClient.userAsset();
            return this.filterNonZeroBalances(balances);
        } catch (error) {
            console.error('Failed to fetch balances:', error);
            throw new Error('Failed to fetch account balances');
        }
    }

    /**
     * Subscribe to real-time balance updates
     * @param callback Function to be called when balances are updated
     */
    public async subscribeToBalanceUpdates(callback: (balances: IAssetBalance[]) => void): Promise<void> {
        this.balanceCallbacks.add(callback);

        if (!this.wsClient) {
            await this.initializeWebSocket();
        }
    }

    /**
     * Unsubscribe from balance updates
     * @param callback Function to be removed from update notifications
     */
    public async unsubscribeFromBalanceUpdates(callback: (balances: IAssetBalance[]) => void): Promise<void> {
        this.balanceCallbacks.delete(callback);

        if (this.balanceCallbacks.size === 0) {
            await this.cleanup();
        }
    }

    /**
         * Initializes WebSocket connection for real-time balance updates
         */
    private async initializeWebSocket(): Promise<void> {
        const apiKey = process.env.BINANCE_API_KEY;
        const apiSecret = process.env.BINANCE_SECRET_KEY;

        if (!apiKey || !apiSecret) {
            throw new Error('Binance API credentials not found in environment variables');
        }

        try {
            const wsOptions = {
                callbacks: {
                    open: (api: WebsocketAPI): void => {
                        console.log('Connected to Binance WebSocket');
                        api.account({
                            recvWindow: 5000
                        });
                    },
                    message: (data: string): void => {
                        try {
                            const parsedData = JSON.parse(data);

                            if (parsedData.e === 'outboundAccountPosition') {
                                const balances: BinanceBalance[] = parsedData.B;
                                const updatedBalances = this.filterNonZeroBalances(balances);
                                this.notifyBalanceUpdates(updatedBalances);
                            }
                        } catch (error) {
                            console.error('Failed to process WebSocket message:', error);
                        }
                    },
                    close: (): void => {
                        console.log('Disconnected from Binance WebSocket');
                    },
                    error: (): void => {
                        console.error('WebSocket error occurred');
                    }
                }
            };

            this.wsClient = new WebsocketAPI(apiKey, apiSecret, wsOptions);

        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            throw new Error('Failed to initialize WebSocket connection');
        }
    }

    /**
     * Cleans up WebSocket connection
     */
    private async cleanup(): Promise<void> {
        if (this.wsClient) {
            this.wsClient.disconnect();
            this.wsClient = null;
        }
    }

    /**
     * Filters out zero balances from balance array
     * @param balances Array of all account balances
     * @returns IAssetBalance[] Array of non-zero balances
     */
    private filterNonZeroBalances(balances: BinanceBalance[]): IAssetBalance[] {
        return balances.filter(balance => {
            const free = parseFloat(balance.free);
            const locked = parseFloat(balance.locked);
            return free > 0 || locked > 0;
        }).map(balance => ({
            asset: balance.asset,
            free: balance.free,
            locked: balance.locked
        }));
    }

    /**
     * Notifies all subscribers of balance updates
     * @param balances Updated balance information
     */
    private notifyBalanceUpdates(balances: IAssetBalance[]): void {
        this.balanceCallbacks.forEach(callback => {
            callback(balances);
        });
    }
}