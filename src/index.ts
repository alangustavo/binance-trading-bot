import { BalanceManager } from "./binance/BalanceManager";

async function run() {
    // Exemplo de uso
    const balanceManager = new BalanceManager();

    // Obter saldos atuais
    const balances = await balanceManager.getBalances();

    // Subscrever para atualizações
    balanceManager.subscribeToBalanceUpdates((updatedBalances) => {
        console.log('Novos saldos:', updatedBalances);
    });
}

run();