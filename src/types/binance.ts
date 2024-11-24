// src/types/binance.ts

export type rateLimitType = 'REQUEST_WEIGHT' | 'ORDERS' | 'RAW_REQUESTS';
export type intervalType = 'SECOND' | 'MINUTE' | 'DAY';

export interface IExchangeInformationRateLimits {
    rateLimitType: rateLimitType;
    interval: intervalType;
    intervalNum: number;
    limit: number;
}

export interface IExchangeFilters {
    filterType: string;
    maxNumOrders: number;
}

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
    notional: string;
    applyToMarket: boolean;
    avgPriceMins: number;
}

export interface IMarketLotSizeFilter {
    filterType: 'MARKET_LOT_SIZE';
    minQty: string;
    maxQty: string;
    stepSize: string;
}

export interface IMaxNumOrdersFilter {
    filterType: 'MAX_NUM_ORDERS';
    limit: number;
}

export interface IMaxNumAlgoOrdersFilter {
    filterType: 'MAX_NUM_ALGO_ORDERS';
    limit: number;
}

export interface IPercentPriceFilter {
    filterType: 'PERCENT_PRICE';
    multiplierUp: string;
    multiplierDown: string;
    multiplierDecimal: number;
}

export type Filters =
    | IPriceFilter
    | ILotSizeFilter
    | IMinNotionalFilter
    | IMarketLotSizeFilter
    | IMaxNumOrdersFilter
    | IMaxNumAlgoOrdersFilter
    | IPercentPriceFilter;

export interface IExchangeInformationSymbols {
    symbol: string;
    status: string;
    baseAsset: string;
    baseAssetPrecision: number;
    quoteAsset: string;
    quoteAssetPrecision: number;
    baseCommissionPrecision: number;
    quoteCommissionPrecision: number;
    orderTypes: string[];
    icebergAllowed: boolean;
    ocoAllowed: boolean;
    otoAllowed: boolean;
    quoteOrderQtyMarketAllowed: boolean;
    allowTrailingStop: boolean;
    cancelReplaceAllowed: boolean;
    isSpotTradingAllowed: boolean;
    isMarginTradingAllowed: boolean;
    filters: Filters[];
    permissions: string[];
    permissionSets: string[][];
    defaultSelfTradePreventionMode: string;
    allowedSelfTradePreventionModes: string[];
}

export interface IExchangeInformationResponse {
    timezone: string;
    serverTime: number;
    rateLimits: IExchangeInformationRateLimits[];
    exchangeFilters: IExchangeFilters[];
    symbols: IExchangeInformationSymbols[];
}

export interface ITradingPrecision {
    tickSize: string;
    stepSize: string;
    minNotional: string;
}

export interface ITradingLimits {
    minPrice: string;
    maxPrice: string;
    minQty: string;
    maxQty: string;
    minNotional: string;
}