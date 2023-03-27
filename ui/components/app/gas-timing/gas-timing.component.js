import React, { useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import BigNumber from 'bignumber.js';

import { GAS_ESTIMATE_TYPES } from '../../../../shared/constants/gas';

import { usePrevious } from '../../../hooks/usePrevious';
import { I18nContext } from '../../../contexts/i18n';

import {
  getGasEstimateType,
  getGasFeeEstimates,
  getIsGasEstimatesLoading,
} from '../../../ducks/metamask/metamask';

import Typography from '../../ui/typography/typography';
import {
  TYPOGRAPHY,
  FONT_WEIGHT,
} from '../../../helpers/constants/design-system';
import InfoTooltip from '../../ui/info-tooltip/info-tooltip';

import { getGasFeeTimeEstimate } from '../../../store/actions';
import { GAS_FORM_ERRORS } from '../../../helpers/constants/gas';

// Once we reach this second threshold, we switch to minutes as a unit
const SECOND_CUTOFF = 90;

// Shows "seconds" as unit of time if under SECOND_CUTOFF, otherwise "minutes"
const toHumanReadableTime = (milliseconds = 1, t) => {
  const seconds = Math.ceil(milliseconds / 1000);
  if (seconds <= SECOND_CUTOFF) {
    return t('gasTimingSeconds', [seconds]);
  }
  return t('gasTimingMinutes', [Math.ceil(seconds / 60)]);
};
export default function GasTiming({
  maxFeePerGas = 0,
  maxPriorityFeePerGas = 0,
  gasWarnings,
}) {
  const gasEstimateType = useSelector(getGasEstimateType);
  const gasFeeEstimates = useSelector(getGasFeeEstimates);
  const isGasEstimatesLoading = useSelector(getIsGasEstimatesLoading);

  const [customEstimatedTime, setCustomEstimatedTime] = useState(null);
  const t = useContext(I18nContext);

  // If the user has chosen a value lower than the low gas fee estimate,
  // We'll need to use the useEffect hook below to make a call to calculate
  // the time to show
  const isUnknownLow =
    gasFeeEstimates?.low &&
    Number(maxPriorityFeePerGas) <
      Number(gasFeeEstimates.low.suggestedMaxPriorityFeePerGas);

  const previousMaxFeePerGas = usePrevious(maxFeePerGas);
  const previousMaxPriorityFeePerGas = usePrevious(maxPriorityFeePerGas);
  const previousIsUnknownLow = usePrevious(isUnknownLow);

  useEffect(() => {
    const priority = maxPriorityFeePerGas;
    const fee = maxFeePerGas;

    if (
      isUnknownLow ||
      (priority && priority !== previousMaxPriorityFeePerGas) ||
      (fee && fee !== previousMaxFeePerGas)
    ) {
      // getGasFeeTimeEstimate requires parameters in string format
      getGasFeeTimeEstimate(
        new BigNumber(priority).toString(10),
        new BigNumber(fee).toString(10),
      ).then((result) => {
        if (maxFeePerGas === fee && maxPriorityFeePerGas === priority) {
          setCustomEstimatedTime(result);
        }
      });
    }

    if (isUnknownLow !== false && previousIsUnknownLow === true) {
      setCustomEstimatedTime(null);
    }
  }, [
    maxPriorityFeePerGas,
    maxFeePerGas,
    isUnknownLow,
    previousMaxFeePerGas,
    previousMaxPriorityFeePerGas,
    previousIsUnknownLow,
  ]);

  const unknownProcessingTimeText = (
    <>
      {t('editGasTooLow')}{' '}
      <InfoTooltip position="top" contentText={t('editGasTooLowTooltip')} />
    </>
  );

  if (
    gasWarnings?.maxPriorityFee === GAS_FORM_ERRORS.MAX_PRIORITY_FEE_TOO_LOW ||
    gasWarnings?.maxFee === GAS_FORM_ERRORS.MAX_FEE_TOO_LOW
  ) {
    return (
      <Typography
        variant={TYPOGRAPHY.H7}
        fontWeight={FONT_WEIGHT.BOLD}
        className={classNames('gas-timing', 'gas-timing--negative')}
      >
        {unknownProcessingTimeText}
      </Typography>
    );
  }

  // Don't show anything if we don't have enough information
  if (
    isGasEstimatesLoading ||
    gasEstimateType !== GAS_ESTIMATE_TYPES.FEE_MARKET
  ) {
    return null;
  }

  const { low = {}, medium = {}, high = {} } = gasFeeEstimates;

  let text = '';
  let attitude = 'positive';

  // Anything medium or faster is positive
  if (
    Number(maxPriorityFeePerGas) >= Number(medium.suggestedMaxPriorityFeePerGas)
  ) {
    // High+ is very likely, medium is likely
    if (
      Number(maxPriorityFeePerGas) < Number(high.suggestedMaxPriorityFeePerGas)
    ) {
      // Medium
      text = t('gasTimingPositive', [
        toHumanReadableTime(low.maxWaitTimeEstimate, t),
      ]);
    } else {
      // High
      text = t('gasTimingVeryPositive', [
        toHumanReadableTime(high.minWaitTimeEstimate, t),
      ]);
    }
  } else {
    attitude = 'negative';

    // If the user has chosen a value less than our low estimate,
    // calculate a potential wait time
    if (isUnknownLow) {
      // If we didn't get any useful information, show the
      // "unknown processing time" message
      if (
        !customEstimatedTime ||
        customEstimatedTime === 'unknown' ||
        customEstimatedTime?.upperTimeBound === 'unknown'
      ) {
        text = unknownProcessingTimeText;
      } else {
        text = t('gasTimingNegative', [
          toHumanReadableTime(Number(customEstimatedTime?.upperTimeBound), t),
        ]);
      }
    } else {
      text = (
        <>
          {t('gasTimingNegative', [
            toHumanReadableTime(low.maxWaitTimeEstimate, t),
          ])}
          <InfoTooltip
            position="top"
            contentText={t('editGasTooLowWarningTooltip')}
          />
        </>
      );
    }
  }

  return (
    <Typography
      variant={TYPOGRAPHY.H7}
      className={classNames('gas-timing', {
        [`gas-timing--${attitude}`]: attitude,
      })}
    >
      {text}
    </Typography>
  );
}

GasTiming.propTypes = {
  maxPriorityFeePerGas: PropTypes.string,
  maxFeePerGas: PropTypes.string,
  gasWarnings: PropTypes.object,
};
