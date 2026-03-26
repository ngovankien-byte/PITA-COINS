/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CoinPackage {
  id: number;
  coins: string;
  price: string;
  isCustom?: boolean;
  subtext?: string;
  dealInfo?: {
    type: 'hot' | 'good' | 'stable';
    label: string;
    tooltip: string;
  };
}

const getRate = (coins: number): number => {
  if (coins <= 30000) return 285;
  if (coins <= 50000) return 284;
  if (coins <= 100000) return 283.5;
  if (coins <= 200000) return 283;
  if (coins <= 500000) return 282;
  return 280.5;
};

const INITIAL_PACKAGES: CoinPackage[] = [
  { id: 1, coins: '30', price: '₫8,550' },
  { id: 2, coins: '350', price: '₫99,750' },
  { id: 3, coins: '700', price: '₫199,500' },
  { id: 4, coins: '1,400', price: '₫399,000' },
  { id: 5, coins: '3,500', price: '₫997,500' },
  { id: 6, coins: '7,000', price: '₫1,995,000' },
  { id: 7, coins: '17,500', price: '₫4,987,500' },
  { id: 8, coins: 'Tùy chỉnh', price: '', isCustom: true, subtext: 'Hỗ trợ số lượng lớn' },
];

/**
 * Simulates a real-time price API.
 * In a real app, this would be a fetch() call to a backend.
 */
export async function fetchCoinPrices(): Promise<CoinPackage[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return fixed prices based on tiers, no fluctuations
  return INITIAL_PACKAGES.map(pkg => {
    if (pkg.isCustom) return pkg;

    const coins = parseInt(pkg.coins.replace(/[^\d]/g, ''), 10);
    const baseRate = getRate(coins);
    const fixedPrice = Math.round(coins * baseRate);

    return {
      ...pkg,
      price: `₫${fixedPrice.toLocaleString('vi-VN')}`
    };
  });
}
