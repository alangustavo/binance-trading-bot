// src/core/errors/BinanceError.ts
export class BinanceError extends Error {
    constructor(
        public readonly message: string,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = 'BinanceError';
    }

    static from(error: unknown): BinanceError {
        if (error instanceof BinanceError) {
            return error;
        }

        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return new BinanceError(message, error);
    }
}