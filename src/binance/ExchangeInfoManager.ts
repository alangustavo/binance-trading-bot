// src/binance/ExchangeInfoManager.ts
import { Spot } from '@binance/connector-typescript';
import { ISymbolTradingRules, OrderType } from '../types/trading';

export class ExchangeInfoManager {
    private tradingRules: Map<string, ISymbolTradingRules>;
    private lastUpdate: number = 0;
    private lastUpdateAttempt: number = 0;

    constructor(
        private readonly provider: Spot,
        private readonly cacheTTL: number = 1000 * 60 * 5,
        private readonly updateRetryInterval: number = 1000 * 30
    ) {
        this.tradingRules = new Map();
    }

    public async getTradingRules(symbol: string): Promise<ISymbolTradingRules | null> {
        await this.updateCacheIfNeeded();
        return this.tradingRules.get(symbol) || null;
    }

    public getAllTradingRules(): Map<string, ISymbolTradingRules> {
        return new Map(this.tradingRules);
    }

    public async forceUpdate(): Promise<boolean> {
        return await this.updateCache(Date.now());
    }

    private async updateCacheIfNeeded(): Promise<boolean> {
        const now = Date.now();

        if (this.tradingRules.size > 0 && now - this.lastUpdate <= this.cacheTTL) {
            return true;
        }

        if (now - this.lastUpdateAttempt < this.updateRetryInterval) {
            return this.tradingRules.size > 0;
        }

        return await this.updateCache(now);
    }

    private async updateCache(now: number): Promise<boolean> {
        this.lastUpdateAttempt = now;

        try {
            const response = await this.provider.exchangeInformation();
            this.tradingRules.clear();

            for (const symbol of response.symbols) {
                const rules = this.parseSymbolRules(symbol);
                if (rules) {
                    this.tradingRules.set(symbol.symbol, rules);
                }
            }

            this.lastUpdate = now;
            return true;
        } catch (error) {
            console.error('Failed to update exchange info:', error);
            return this.tradingRules.size > 0;
        }
    }

    private parseSymbolRules(symbol: any): ISymbolTradingRules | null {
        // Verifica apenas os campos que precisamos
        if (symbol.status !== 'TRADING' || !Array.isArray(symbol.filters) || !Array.isArray(symbol.orderTypes)) {
            return null;
        }

        const priceFilter = symbol.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
        const lotSizeFilter = symbol.filters.find((f: any) => f.filterType === 'LOT_SIZE');
        const minNotionalFilter = symbol.filters.find((f: any) => f.filterType === 'MIN_NOTIONAL');

        if (!this.isValidFilter(priceFilter, ['tickSize', 'minPrice', 'maxPrice']) ||
            !this.isValidFilter(lotSizeFilter, ['stepSize', 'minQty', 'maxQty']) ||
            !this.isValidFilter(minNotionalFilter, ['minNotional'])) {
            return null;
        }

        return {
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
            allowedOrderTypes: symbol.orderTypes.filter((type: string) => this.isValidOrderType(type)) as OrderType[]
        };
    }

    private isValidFilter(filter: any, requiredProps: string[]): boolean {
        if (!filter) return false;
        return requiredProps.every(prop => typeof filter[prop] === 'string');
    }

    private isValidOrderType(type: string): type is OrderType {
        const validTypes: OrderType[] = [
            'LIMIT', 'MARKET', 'STOP_LIMIT', 'STOP_MARKET',
            'OCO', 'TRAILING_STOP_MARKET'
        ];
        return validTypes.includes(type as OrderType);
    }
}