import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage service prepared for future DB integration.
// Provides async CRUD-like helpers with in-memory fallback when AsyncStorage is unavailable.

const MEMORY = new Map();

async function safeGetItem(key) {
  try {
    if (AsyncStorage?.getItem) return await AsyncStorage.getItem(key);
  } catch {}
  return MEMORY.get(key) ?? null;
}

async function safeSetItem(key, value) {
  try {
    if (AsyncStorage?.setItem) return await AsyncStorage.setItem(key, value);
  } catch {}
  MEMORY.set(key, value);
}

async function safeRemoveItem(key) {
  try {
    if (AsyncStorage?.removeItem) return await AsyncStorage.removeItem(key);
  } catch {}
  MEMORY.delete(key);
}

export const StorageKeys = {
  THEME: 'app.theme',
  BUDGET: 'app.budget',
  EXPENSES: 'app.expenses',
  AUTH: 'app.auth',
};

export async function loadAppState() {
  const [themeRaw, budgetRaw, expensesRaw, authRaw] = await Promise.all([
    safeGetItem(StorageKeys.THEME),
    safeGetItem(StorageKeys.BUDGET),
    safeGetItem(StorageKeys.EXPENSES),
    safeGetItem(StorageKeys.AUTH),
  ]);

  return {
    isDarkMode: themeRaw ? themeRaw === 'dark' : null,
    budget: budgetRaw ? parseFloat(budgetRaw) : null,
    expenses: expensesRaw ? JSON.parse(expensesRaw) : null,
    isAuthenticated: authRaw ? authRaw === '1' : null,
  };
}

export async function persistTheme(isDarkMode) {
  await safeSetItem(StorageKeys.THEME, isDarkMode ? 'dark' : 'light');
}

export async function persistBudget(budget) {
  await safeSetItem(StorageKeys.BUDGET, String(budget));
}

export async function persistExpenses(expenses) {
  await safeSetItem(StorageKeys.EXPENSES, JSON.stringify(expenses));
}

export async function persistAuth(isAuthenticated) {
  await safeSetItem(StorageKeys.AUTH, isAuthenticated ? '1' : '0');
}

export async function clearAll() {
  await Promise.all([
    safeRemoveItem(StorageKeys.THEME),
    safeRemoveItem(StorageKeys.BUDGET),
    safeRemoveItem(StorageKeys.EXPENSES),
    safeRemoveItem(StorageKeys.AUTH),
  ]);
}
