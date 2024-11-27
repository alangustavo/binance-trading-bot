// src/types/balance.ts

export interface IAssetBalance {
    asset: string;
    free: string;
    locked: string;
}

export interface IBalanceManager {
    getBalances(): Promise<IAssetBalance[]>;
    subscribeToBalanceUpdates(callback: (balances: IAssetBalance[]) => void): Promise<void>;
    unsubscribeFromBalanceUpdates(callback: (balances: IAssetBalance[]) => void): Promise<void>;
}

export interface BinanceBalance {
    asset: string;
    free: string;
    locked: string;
    freeze: string;
    withdrawing: string;
    ipoable: string;
    btcValuation: string;
}