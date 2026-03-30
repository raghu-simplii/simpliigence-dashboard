export interface FinancialSettings {
  exchangeRate: number;       // INR per 1 USD
  cadToUsdRate: number;       // USD per 1 CAD (e.g. 0.73)
  displayCurrency: 'inr' | 'usd';
}
