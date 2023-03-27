import React from 'react';

import { renderWithProvider } from '../../../../test/jest';
import ImportToken from '.';

const createProps = (customProps = {}) => {
  return {
    onImportTokenCloseClick: jest.fn(),
    onImportTokenClick: jest.fn(),
    setIsImportTokenModalOpen: jest.fn(),
    tokenForImport: {
      symbol: 'POS',
      name: 'PoSToken',
      address: '0xee609fe292128cad03b786dbb9bc2634ccdbe7fc',
    },
    ...customProps,
  };
};

describe('ImportToken', () => {
  it('renders the component with initial props', () => {
    const props = createProps();
    const { getByText } = renderWithProvider(<ImportToken {...props} />);
    expect(getByText(props.tokenForImport.name)).toBeInTheDocument();
    expect(getByText(props.tokenForImport.address)).toBeInTheDocument();
  });
});
