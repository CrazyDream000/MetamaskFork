import log from 'loglevel';
import BigNumber from 'bignumber.js';
import {
  conversionUtil,
  multiplyCurrencies,
} from '../../../shared/modules/conversion.utils';
import * as util from './util';
import { formatCurrency } from './confirm-tx.util';

const DEFAULT_SYMBOL = '';

async function getSymbolFromContract(tokenAddress) {
  const token = util.getContractAtAddress(tokenAddress);

  try {
    const result = await token.symbol();
    return result[0];
  } catch (error) {
    log.warn(
      `symbol() call for token at address ${tokenAddress} resulted in error:`,
      error,
    );
    return undefined;
  }
}

async function getDecimalsFromContract(tokenAddress) {
  const token = util.getContractAtAddress(tokenAddress);

  try {
    const result = await token.decimals();
    const decimalsBN = result[0];
    return decimalsBN?.toString();
  } catch (error) {
    log.warn(
      `decimals() call for token at address ${tokenAddress} resulted in error:`,
      error,
    );
    return undefined;
  }
}

function getTokenMetadata(tokenAddress, tokenList) {
  const casedTokenList = Object.keys(tokenList).reduce((acc, base) => {
    return {
      ...acc,
      [base.toLowerCase()]: tokenList[base],
    };
  }, {});
  return tokenAddress && casedTokenList[tokenAddress.toLowerCase()];
}

async function getSymbol(tokenAddress, tokenList) {
  let symbol = await getSymbolFromContract(tokenAddress);

  if (!symbol) {
    const contractMetadataInfo = getTokenMetadata(tokenAddress, tokenList);

    if (contractMetadataInfo) {
      symbol = contractMetadataInfo.symbol;
    }
  }

  return symbol;
}

async function getDecimals(tokenAddress, tokenList) {
  let decimals = await getDecimalsFromContract(tokenAddress);

  if (!decimals || decimals === '0') {
    const contractMetadataInfo = getTokenMetadata(tokenAddress, tokenList);

    if (contractMetadataInfo) {
      decimals = contractMetadataInfo.decimals?.toString();
    }
  }

  return decimals;
}

export async function getSymbolAndDecimals(tokenAddress, tokenList) {
  let symbol, decimals;

  try {
    symbol = await getSymbol(tokenAddress, tokenList);
    decimals = await getDecimals(tokenAddress, tokenList);
  } catch (error) {
    log.warn(
      `symbol() and decimal() calls for token at address ${tokenAddress} resulted in error:`,
      error,
    );
  }

  return {
    symbol: symbol || DEFAULT_SYMBOL,
    decimals,
  };
}

export function tokenInfoGetter() {
  const tokens = {};

  return async (address, tokenList) => {
    if (tokens[address]) {
      return tokens[address];
    }

    tokens[address] = await getSymbolAndDecimals(address, tokenList);

    return tokens[address];
  };
}

export function calcTokenAmount(value, decimals) {
  const multiplier = Math.pow(10, Number(decimals || 0));
  return new BigNumber(String(value)).div(multiplier);
}

export function calcTokenValue(value, decimals) {
  const multiplier = Math.pow(10, Number(decimals || 0));
  return new BigNumber(String(value)).times(multiplier);
}

/**
 * Attempts to get the address parameter of the given token transaction data
 * (i.e. function call) per the Human Standard Token ABI, in the following
 * order:
 *   - The '_to' parameter, if present
 *   - The first parameter, if present
 *
 * @param {Object} tokenData - ethers Interface token data.
 * @returns {string | undefined} A lowercase address string.
 */
export function getTokenAddressParam(tokenData = {}) {
  const value = tokenData?.args?._to || tokenData?.args?.[0];
  return value?.toString().toLowerCase();
}

/**
 * Gets the '_value' parameter of the given token transaction data
 * (i.e function call) per the Human Standard Token ABI, if present.
 *
 * @param {Object} tokenData - ethers Interface token data.
 * @returns {string | undefined} A decimal string value.
 */
export function getTokenValueParam(tokenData = {}) {
  return tokenData?.args?._value?.toString();
}

export function getTokenValue(tokenParams = []) {
  const valueData = tokenParams.find((param) => param.name === '_value');
  return valueData && valueData.value;
}

/**
 * Get the token balance converted to fiat and optionally formatted for display
 *
 * @param {number} [contractExchangeRate] - The exchange rate between the current token and the native currency
 * @param {number} conversionRate - The exchange rate between the current fiat currency and the native currency
 * @param {string} currentCurrency - The currency code for the user's chosen fiat currency
 * @param {string} [tokenAmount] - The current token balance
 * @param {string} [tokenSymbol] - The token symbol
 * @param {boolean} [formatted] - Whether the return value should be formatted or not
 * @param {boolean} [hideCurrencySymbol] - excludes the currency symbol in the result if true
 * @returns {string|undefined} The token amount in the user's chosen fiat currency, optionally formatted and localize
 */
export function getTokenFiatAmount(
  contractExchangeRate,
  conversionRate,
  currentCurrency,
  tokenAmount,
  tokenSymbol,
  formatted = true,
  hideCurrencySymbol = false,
) {
  // If the conversionRate is 0 (i.e. unknown) or the contract exchange rate
  // is currently unknown, the fiat amount cannot be calculated so it is not
  // shown to the user
  if (
    conversionRate <= 0 ||
    !contractExchangeRate ||
    tokenAmount === undefined
  ) {
    return undefined;
  }

  const currentTokenToFiatRate = multiplyCurrencies(
    contractExchangeRate,
    conversionRate,
    {
      multiplicandBase: 10,
      multiplierBase: 10,
    },
  );
  const currentTokenInFiat = conversionUtil(tokenAmount, {
    fromNumericBase: 'dec',
    fromCurrency: tokenSymbol,
    toCurrency: currentCurrency.toUpperCase(),
    numberOfDecimals: 2,
    conversionRate: currentTokenToFiatRate,
  });
  let result;
  if (hideCurrencySymbol) {
    result = formatCurrency(currentTokenInFiat, currentCurrency);
  } else if (formatted) {
    result = `${formatCurrency(
      currentTokenInFiat,
      currentCurrency,
    )} ${currentCurrency.toUpperCase()}`;
  } else {
    result = currentTokenInFiat;
  }
  return result;
}
