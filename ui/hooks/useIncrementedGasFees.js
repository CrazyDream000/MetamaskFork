import BigNumber from 'bignumber.js';
import { addHexPrefix } from 'ethereumjs-util';
import { useMemo } from 'react';
import { multiplyCurrencies } from '../../shared/modules/conversion.utils';
import { isEIP1559Transaction } from '../../shared/modules/transaction.utils';
import { decGWEIToHexWEI } from '../helpers/utils/conversions.util';
import { useGasFeeEstimates } from './useGasFeeEstimates';

/**
 * Simple helper to save on duplication to multiply the supplied wei hex string
 * by 1.10 to get bare minimum new gas fee.
 *
 * @param {string} hexStringValue - hex value in wei to be incremented
 * @returns {string} - hex value in WEI 10% higher than the param.
 */
function addTenPercent(hexStringValue) {
  return addHexPrefix(
    multiplyCurrencies(hexStringValue, 1.1, {
      toNumericBase: 'hex',
      multiplicandBase: 16,
      multiplierBase: 10,
    }),
  );
}

/**
 * Helper that returns the higher of two options for a new gas fee:
 * The original fee + 10% or
 * the current medium suggested fee from our gas estimation api
 *
 * @param {string} originalFee - hexWei vale of the original fee (maxFee or maxPriority)
 * @param {string} currentEstimate - decGwei value of the current medium gasFee estimate (maxFee or maxPriorityfee)
 * @returns {string} - hexWei value of the higher of the two inputs.
 */
function getHighestIncrementedFee(originalFee, currentEstimate) {
  const buffedOriginalHexWei = addTenPercent(originalFee);
  const currentEstimateHexWei = decGWEIToHexWEI(currentEstimate);

  return new BigNumber(buffedOriginalHexWei, 16).greaterThan(
    new BigNumber(currentEstimateHexWei, 16),
  )
    ? buffedOriginalHexWei
    : currentEstimateHexWei;
}

/**
 * When initializing cancellations or speed ups we need to set the baseline
 * gas fees to be 10% higher, which is the bare minimum that the network will
 * accept for transactions of the same nonce. Anything lower than this will be
 * discarded by the network to avoid DoS attacks. This hook returns an object
 * that either has gasPrice or maxFeePerGas/maxPriorityFeePerGas specified. In
 * addition the gasLimit will also be included.
 * @param {} transactionGroup
 * @returns {import(
 *   '../../app/scripts/controllers/transactions'
 * ).CustomGasSettings} - Gas settings for cancellations/speed ups
 */
export function useIncrementedGasFees(transactionGroup) {
  const { primaryTransaction } = transactionGroup;

  const { gasFeeEstimates = {} } = useGasFeeEstimates();

  // We memoize this value so that it can be relied upon in other hooks.
  const customGasSettings = useMemo(() => {
    // This hook is called indiscriminantly on all transactions appearing in
    // the activity list. This includes transitional items such as signature
    // requests. These types of "transactions" are not really transactions and
    // do not have txParams. This is why we use optional chaining on the
    // txParams object in this hook.
    const temporaryGasSettings = {
      gasLimit: primaryTransaction.txParams?.gas,
      gas: primaryTransaction.txParams?.gas,
    };

    const suggestedMaxFeePerGas =
      gasFeeEstimates?.medium?.suggestedMaxFeePerGas ?? '0';
    const suggestedMaxPriorityFeePerGas =
      gasFeeEstimates?.medium?.suggestedMaxPriorityFeePerGas ?? '0';

    if (isEIP1559Transaction(primaryTransaction)) {
      const transactionMaxFeePerGas = primaryTransaction.txParams?.maxFeePerGas;
      const transactionMaxPriorityFeePerGas =
        primaryTransaction.txParams?.maxPriorityFeePerGas;

      temporaryGasSettings.maxFeePerGas =
        transactionMaxFeePerGas === undefined ||
        transactionMaxFeePerGas.startsWith('-')
          ? '0x0'
          : getHighestIncrementedFee(
              transactionMaxFeePerGas,
              suggestedMaxFeePerGas,
            );
      temporaryGasSettings.maxPriorityFeePerGas =
        transactionMaxPriorityFeePerGas === undefined ||
        transactionMaxPriorityFeePerGas.startsWith('-')
          ? '0x0'
          : getHighestIncrementedFee(
              transactionMaxPriorityFeePerGas,
              suggestedMaxPriorityFeePerGas,
            );
    } else {
      const transactionGasPrice = primaryTransaction.txParams?.gasPrice;
      temporaryGasSettings.gasPrice =
        transactionGasPrice === undefined || transactionGasPrice.startsWith('-')
          ? '0x0'
          : getHighestIncrementedFee(
              transactionGasPrice,
              suggestedMaxFeePerGas,
            );
    }
    return temporaryGasSettings;
  }, [primaryTransaction, gasFeeEstimates]);

  return customGasSettings;
}
