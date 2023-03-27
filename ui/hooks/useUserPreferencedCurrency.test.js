import { renderHook } from '@testing-library/react-hooks';
import * as reactRedux from 'react-redux';
import sinon from 'sinon';
import {
  getCurrentCurrency,
  getPreferences,
  getShouldShowFiat,
} from '../selectors';
import { useUserPreferencedCurrency } from './useUserPreferencedCurrency';

const tests = [
  {
    state: {
      useNativeCurrencyAsPrimaryCurrency: true,
      nativeCurrency: 'ETH',
      showFiat: true,
    },
    params: {
      type: 'PRIMARY',
    },
    result: {
      currency: 'ETH',
      numberOfDecimals: 6,
    },
  },
  {
    state: {
      useNativeCurrencyAsPrimaryCurrency: false,
      nativeCurrency: 'ETH',
      showFiat: true,
      currentCurrency: 'usd',
    },
    params: {
      type: 'PRIMARY',
    },
    result: {
      currency: 'usd',
      numberOfDecimals: 2,
    },
  },
  {
    state: {
      useNativeCurrencyAsPrimaryCurrency: true,
      nativeCurrency: 'ETH',
      showFiat: true,
    },
    params: {
      type: 'SECONDARY',
      fiatNumberOfDecimals: 4,
      fiatPrefix: '-',
    },
    result: {
      currency: undefined,
      numberOfDecimals: 4,
    },
  },
  {
    state: {
      useNativeCurrencyAsPrimaryCurrency: false,
      nativeCurrency: 'ETH',
      showFiat: true,
    },
    params: {
      type: 'SECONDARY',
      fiatNumberOfDecimals: 4,
      numberOfDecimals: 3,
      fiatPrefix: 'a',
    },
    result: {
      currency: 'ETH',
      numberOfDecimals: 3,
    },
  },
  {
    state: {
      useNativeCurrencyAsPrimaryCurrency: false,
      nativeCurrency: 'ETH',
      showFiat: false,
    },
    params: {
      type: 'PRIMARY',
    },
    result: {
      currency: 'ETH',
      numberOfDecimals: 6,
    },
  },
  {
    state: {
      useNativeCurrencyAsPrimaryCurrency: false,
      nativeCurrency: 'ETH',
      showFiat: true,
    },
    params: {
      type: 'PRIMARY',
    },
    result: {
      currency: undefined,
      numberOfDecimals: 2,
    },
  },
  {
    state: {
      useNativeCurrencyAsPrimaryCurrency: false,
      nativeCurrency: 'ETH',
      showFiat: true,
    },
    params: {
      type: 'PRIMARY',
    },
    result: {
      currency: undefined,
      numberOfDecimals: 2,
    },
  },
];

function getFakeUseSelector(state) {
  return (selector) => {
    if (selector === getPreferences) {
      return state;
    } else if (selector === getShouldShowFiat) {
      return state.showFiat;
    } else if (selector === getCurrentCurrency) {
      return state.currentCurrency;
    }
    return state.nativeCurrency;
  };
}

describe('useUserPreferencedCurrency', () => {
  tests.forEach(({ params: { type, ...otherParams }, state, result }) => {
    describe(`when showFiat is ${state.showFiat}, useNativeCurrencyAsPrimary is ${state.useNativeCurrencyAsPrimaryCurrency} and type is ${type}`, () => {
      const stub = sinon.stub(reactRedux, 'useSelector');
      stub.callsFake(getFakeUseSelector(state));

      const { result: hookResult } = renderHook(() =>
        useUserPreferencedCurrency(type, otherParams),
      );
      stub.restore();
      it(`should return currency as ${
        result.currency || 'not modified by user preferences'
      }`, () => {
        expect(hookResult.current.currency).toStrictEqual(result.currency);
      });
      it(`should return decimals as ${
        result.numberOfDecimals || 'not modified by user preferences'
      }`, () => {
        expect(hookResult.current.numberOfDecimals).toStrictEqual(
          result.numberOfDecimals,
        );
      });
    });
  });
});
