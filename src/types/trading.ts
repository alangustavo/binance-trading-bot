// src/types/trading.ts

export type OrderType =
    | 'LIMIT'
    | 'MARKET'
    | 'STOP_LIMIT'
    | 'STOP_MARKET'
    | 'OCO'
    | 'TRAILING_STOP_MARKET';

// Tipos específicos para os filtros da Binance
export interface IPriceFilter {
    filterType: 'PRICE_FILTER';
    minPrice: string;
    maxPrice: string;
    tickSize: string;
}

export interface ILotSizeFilter {
    filterType: 'LOT_SIZE';
    minQty: string;
    maxQty: string;
    stepSize: string;
}

export interface IMinNotionalFilter {
    filterType: 'MIN_NOTIONAL';
    minNotional: string;
    applyToMarket: boolean;
    avgPriceMins: number;
}

export interface ISymbolTradingRules {
    symbol: string;
    priceRules: {
        tickSize: string;
        minPrice: string;
        maxPrice: string;
    };
    quantityRules: {
        stepSize: string;
        minQty: string;
        maxQty: string;
    };
    minNotional: string;
    allowedOrderTypes: OrderType[];
}