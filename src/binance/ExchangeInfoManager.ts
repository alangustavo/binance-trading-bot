// src/binance/ExchangeInfoManager.ts

import { Spot } from '@binance/connector-typescript';
import {
    ISymbolTradingRules,
    OrderType,
    IPriceFilter,
    ILotSizeFilter,
    IMinNotionalFilter
} from '../types/trading';

export class ExchangeInfoManager {
    private static instance: ExchangeInfoManager;
    private tradingRules: Map<string, ISymbolTradingRules>;
    private lastUpdate: number = 0;
    private readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache
    private readonly UPDATE_RETRY_INTERVAL = 1000 * 30; // 30 seconds before retry
    private lastUpdateAttempt: number = 0;

    private constructor(private readonly client: Spot) {
        this.tradingRules = new Map();
    }

    public static getInstance(client: Spot): ExchangeInfoManager {
        if (!ExchangeInfoManager.instance) {
            ExchangeInfoManager.instance = new ExchangeInfoManager(client);
        }
        return ExchangeInfoManager.instance;
    }

    /**
     * Gets trading rules for a specific symbol
     * @param symbol Trading pair symbol (e.g., 'BTCUSDT')
     * @returns Trading rules for the symbol or null if not found/available
     */
    public async getTradingRules(symbol: string): Promise<ISymbolTradingRules | null> {
        await this.updateCacheIfNeeded();
        return this.tradingRules.get(symbol) || null;
    }

    private isValidOrderType(type: string): type is OrderType {
        const validTypes: OrderType[] = [
            'LIMIT', 'MARKET', 'STOP_LIMIT', 'STOP_MARKET',
            'OCO', 'TRAILING_STOP_MARKET'
        ];
        return validTypes.includes(type as OrderType);
    }

    private async updateCacheIfNeeded(): Promise<boolean> {
        const now = Date.now();

        // If we have valid cache, use it
        if (this.tradingRules.size > 0 && now - this.lastUpdate <= this.CACHE_TTL) {
            return true;
        }

        // If we recently failed to update, wait before retrying
        if (now - this.lastUpdateAttempt < this.UPDATE_RETRY_INTERVAL) {
            return this.tradingRules.size > 0;
        }

        this.lastUpdateAttempt = now;

        try {
            const response = await this.client.exchangeInformation();

            // Clear existing rules
            this.tradingRules.clear();

            // Process only trading pairs
            for (const symbol of response.symbols) {
                if (symbol.status !== 'TRADING') continue;

                const priceFilter = symbol.filters.find(f => f.filterType === 'PRICE_FILTER') as IPriceFilter;
                const lotSizeFilter = symbol.filters.find(f => f.filterType === 'LOT_SIZE') as ILotSizeFilter;
                const minNotionalFilter = symbol.filters.find(f => f.filterType === 'MIN_NOTIONAL') as IMinNotionalFilter;

                if (!priceFilter || !lotSizeFilter || !minNotionalFilter) continue;

                const rules: ISymbolTradingRules = {
                    symbol: symbol.symbol,
                    priceRules: {
                        tickSize: priceFilter.tickSize,
                        minPrice: priceFilter.minPrice,
                        maxPrice: priceFilter.maxPrice
                    },
                    quantityRules: {
                        stepSize: lotSizeFilter.stepSize,
                        minQty: lotSizeFilter.minQty,
                        maxQty: lotSizeFilter.maxQty
                    },
                    minNotional: minNotionalFilter.minNotional,
                    allowedOrderTypes: symbol.orderTypes.filter(
                        type => this.isValidOrderType(type)
                    ) as OrderType[]
                };

                this.tradingRules.set(symbol.symbol, rules);
            }

            this.lastUpdate = now;
            return true;
        } catch (error) {
            console.error('Failed to update exchange info, using cached data if available:', error);
            return this.tradingRules.size > 0;
        }
    }
}