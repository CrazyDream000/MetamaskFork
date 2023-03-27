import React from 'react';
import configureMockStore from 'redux-mock-store';

import {
  renderWithProvider,
  createSwapsMockStore,
} from '../../../../test/jest';
import LoadingSwapsQuotes from '.';

const createProps = (customProps = {}) => {
  return {
    loadingComplete: true,
    onDone: jest.fn(),
    aggregatorMetadata: {
      agg1: {
        color: '#283B4C',
        title: 'agg1',
        icon: 'data:image/png;base64,iVBORw0KGgoAAA',
      },
      agg2: {
        color: '#283B4C',
        title: 'agg2',
        icon: 'data:image/png;base64,iVBORw0KGgoAAA',
      },
    },
    ...customProps,
  };
};

describe('LoadingSwapsQuotes', () => {
  it('renders the component with initial props', () => {
    const store = configureMockStore()(createSwapsMockStore());
    const { getByText } = renderWithProvider(
      <LoadingSwapsQuotes {...createProps()} />,
      store,
    );
    expect(getByText('Quote 1 of 2')).toBeInTheDocument();
    expect(getByText('Checking agg', { exact: false })).toBeInTheDocument();
    expect(getByText('Back')).toBeInTheDocument();
  });
});
