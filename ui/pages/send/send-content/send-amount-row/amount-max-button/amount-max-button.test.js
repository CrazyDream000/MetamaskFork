import React from 'react';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import { fireEvent } from '@testing-library/react';
import { initialState, SEND_STATUSES } from '../../../../../ducks/send';
import { renderWithProvider } from '../../../../../../test/jest';
import { GAS_ESTIMATE_TYPES } from '../../../../../../shared/constants/gas';
import AmountMaxButton from './amount-max-button';

const middleware = [thunk];

describe('AmountMaxButton Component', () => {
  describe('render', () => {
    it('should render a "Max" button', () => {
      const { getByText } = renderWithProvider(
        <AmountMaxButton />,
        configureMockStore(middleware)({
          metamask: {
            gasEstimateType: GAS_ESTIMATE_TYPES.NONE,
            networkDetails: {
              EIPS: {},
            },
          },
          send: initialState,
        }),
      );
      expect(getByText('Max')).toBeTruthy();
    });

    it('should dispatch action to set mode to MAX', () => {
      const store = configureMockStore(middleware)({
        metamask: {
          gasEstimateType: GAS_ESTIMATE_TYPES.ETH_GASPRICE,
          networkDetails: {
            EIPS: {},
          },
        },
        send: { ...initialState, status: SEND_STATUSES.VALID },
      });
      const { getByText } = renderWithProvider(<AmountMaxButton />, store);

      const expectedActions = [
        { type: 'send/updateAmountMode', payload: 'MAX' },
      ];

      fireEvent.click(getByText('Max'), { bubbles: true });
      const actions = store.getActions();
      expect(actions).toStrictEqual(expectedActions);
    });

    it('should dispatch action to set amount mode to INPUT', () => {
      const store = configureMockStore(middleware)({
        metamask: {
          gasEstimateType: GAS_ESTIMATE_TYPES.ETH_GASPRICE,
          networkDetails: {
            EIPS: {},
          },
        },
        send: {
          ...initialState,
          status: SEND_STATUSES.VALID,
          amount: { ...initialState.amount, mode: 'MAX' },
        },
      });
      const { getByText } = renderWithProvider(<AmountMaxButton />, store);

      const expectedActions = [
        { type: 'send/updateAmountMode', payload: 'INPUT' },
      ];

      fireEvent.click(getByText('Max'), { bubbles: true });
      const actions = store.getActions();
      expect(actions).toStrictEqual(expectedActions);
    });
  });
});
