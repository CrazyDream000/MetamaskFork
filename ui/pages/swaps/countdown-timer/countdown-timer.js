import React, { useState, useEffect, useContext, useRef } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Duration } from 'luxon';
import { I18nContext } from '../../../contexts/i18n';
import InfoTooltip from '../../../components/ui/info-tooltip';
import { getSwapsQuoteRefreshTime } from '../../../ducks/swaps/swaps';
import { SECOND } from '../../../../shared/constants/time';

// Return the mm:ss start time of the countdown timer.
// If time has elapsed between `timeStarted` the time current time,
// then that elapsed time will be subtracted from the timer before
// rendering
function getNewTimer(currentTime, timeStarted, timeBaseStart) {
  const timeAlreadyElapsed = currentTime - timeStarted;
  return timeBaseStart - timeAlreadyElapsed;
}

function decreaseTimerByOne(timer) {
  return Math.max(timer - SECOND, 0);
}

function timeBelowWarningTime(timer, warningTime) {
  const [warningTimeMinutes, warningTimeSeconds] = warningTime.split(':');
  return (
    timer <=
    (Number(warningTimeMinutes) * 60 + Number(warningTimeSeconds)) * SECOND
  );
}

export default function CountdownTimer({
  timeStarted,
  timeOnly,
  timerBase,
  warningTime,
  labelKey,
  infoTooltipLabelKey,
}) {
  const t = useContext(I18nContext);
  const intervalRef = useRef();
  const initialTimeStartedRef = useRef();

  const swapsQuoteRefreshTime = useSelector(getSwapsQuoteRefreshTime);
  const timerStart = Number(timerBase) || swapsQuoteRefreshTime;

  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [timer, setTimer] = useState(() =>
    getNewTimer(currentTime, timeStarted, timerStart),
  );

  useEffect(() => {
    if (intervalRef.current === undefined) {
      intervalRef.current = setInterval(() => {
        setTimer(decreaseTimerByOne);
      }, SECOND);
    }

    return function cleanup() {
      clearInterval(intervalRef.current);
    };
  }, []);

  // Reset the timer that timer has hit '0:00' and the timeStarted prop has changed
  useEffect(() => {
    if (!initialTimeStartedRef.current) {
      initialTimeStartedRef.current = timeStarted || Date.now();
    }

    if (timer === 0 && timeStarted !== initialTimeStartedRef.current) {
      initialTimeStartedRef.current = timeStarted;
      const newCurrentTime = Date.now();
      setCurrentTime(newCurrentTime);
      setTimer(getNewTimer(newCurrentTime, timeStarted, timerStart));

      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setTimer(decreaseTimerByOne);
      }, SECOND);
    }
  }, [timeStarted, timer, timerStart]);

  const formattedTimer = Duration.fromMillis(timer).toFormat('m:ss');
  let time;
  if (timeOnly) {
    time = <div className="countdown-timer__time">{formattedTimer}</div>;
  } else if (labelKey) {
    time = t(labelKey, [
      <div key="countdown-time-1" className="countdown-timer__time">
        {formattedTimer}
      </div>,
    ]);
  }

  return (
    <div className="countdown-timer">
      <div
        data-testid="countdown-timer__timer-container"
        className={classnames('countdown-timer__timer-container', {
          'countdown-timer__timer-container--warning':
            warningTime && timeBelowWarningTime(timer, warningTime),
        })}
      >
        {time}
      </div>
      {!timeOnly && infoTooltipLabelKey ? (
        <InfoTooltip position="bottom" contentText={t(infoTooltipLabelKey)} />
      ) : null}
    </div>
  );
}

CountdownTimer.propTypes = {
  timeStarted: PropTypes.number,
  timeOnly: PropTypes.bool,
  timerBase: PropTypes.number,
  warningTime: PropTypes.string,
  labelKey: PropTypes.string,
  infoTooltipLabelKey: PropTypes.string,
};
