// tests/mocks/exchangeInfo.mock.ts

export const mockExchangeInfo = {
    timezone: 'UTC',
    serverTime: 1621825456000,
    rateLimits: [
        {
            rateLimitType: 'REQUEST_WEIGHT',
            interval: 'MINUTE',
            intervalNum: 1,
            limit: 1200
        }
    ],
    exchangeFilters: [],
    symbols: [
        {
            symbol: 'BTCUSDT',
            status: 'TRADING',
            baseAsset: 'BTC',
            quoteAsset: 'USDT',
            orderTypes: ['LIMIT', 'MARKET', 'STOP_LIMIT', 'OCO'],
            filters: [
                {
                    filterType: 'PRICE_FILTER',
                    minPrice: '0.01000000',
                    maxPrice: '1000000.00000000',
                    tickSize: '0.01000000'
                },
                {
                    filterType: 'LOT_SIZE',
                    minQty: '0.00001000',
                    maxQty: '9000.00000000',
                    stepSize: '0.00001000'
                },
                {
                    filterType: 'MIN_NOTIONAL',
                    minNotional: '10.00000000',
                    applyToMarket: true,
                    avgPriceMins: 5
                }
            ]
        },
        {
            symbol: 'ETHUSDT',
            status: 'BREAK', // Símbolo não disponível para trading
            baseAsset: 'ETH',
            quoteAsset: 'USDT',
            orderTypes: ['LIMIT', 'MARKET'],
            filters: []
        }
    ]
};

export const expectedTradingRules = {
    symbol: 'BTCUSDT',
    priceRules: {
        tickSize: '0.01000000',
        minPrice: '0.01000000',
        maxPrice: '1000000.00000000'
    },
    quantityRules: {
        stepSize: '0.00001000',
        minQty: '0.00001000',
        maxQty: '9000.00000000'
    },
    minNotional: '10.00000000',
    allowedOrderTypes: ['LIMIT', 'MARKET', 'STOP_LIMIT', 'OCO']
};