export const TOP_ASSETS_GET_RESPONSE = [
  {
    symbol: 'LINK',
    address: '0x514910771af9ca656af840dff83e8264ecf986ca',
  },
  {
    symbol: 'UMA',
    address: '0x04fa0d235c4abf4bcf4787af4cf447de572ef828',
  },
  {
    symbol: 'YFI',
    address: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
  },
  {
    symbol: 'LEND',
    address: '0x80fb784b7ed66730e8b1dbd9820afd29931aab03',
  },
  {
    symbol: 'SNX',
    address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
  },
];

export const REFRESH_TIME_GET_RESPONSE = {
  seconds: 3600,
};

export const AGGREGATOR_METADATA_GET_RESPONSE = {};

export const GAS_PRICES_GET_RESPONSE = {
  SafeGasPrice: '10',
  ProposeGasPrice: '20',
  FastGasPrice: '30',
};

export const TOKENS_GET_RESPONSE = [
  {
    erc20: true,
    symbol: 'META',
    decimals: 18,
    address: '0x617b3f8050a0BD94b6b1da02B4384eE5B4DF13F4',
  },
  {
    erc20: true,
    symbol: 'ZRX',
    decimals: 18,
    address: '0xE41d2489571d322189246DaFA5ebDe1F4699F498',
  },
  {
    erc20: true,
    symbol: 'AST',
    decimals: 4,
    address: '0x27054b13b1B798B345b591a4d22e6562d47eA75a',
  },
  {
    erc20: true,
    symbol: 'BAT',
    decimals: 18,
    address: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
  },
];

export const createFeatureFlagsResponse = () => {
  return {
    bsc: {
      mobile_active: false,
      extension_active: true,
      fallback_to_v1: true,
    },
    ethereum: {
      mobile_active: false,
      extension_active: true,
      fallback_to_v1: true,
    },
    polygon: {
      mobile_active: false,
      extension_active: true,
      fallback_to_v1: false,
    },
  };
};

export const createGasFeeEstimatesForFeeMarket = () => {
  return {
    low: {
      minWaitTimeEstimate: 180000,
      maxWaitTimeEstimate: 300000,
      suggestedMaxPriorityFeePerGas: '3',
      suggestedMaxFeePerGas: '53',
    },
    medium: {
      minWaitTimeEstimate: 15000,
      maxWaitTimeEstimate: 60000,
      suggestedMaxPriorityFeePerGas: '7',
      suggestedMaxFeePerGas: '70',
    },
    high: {
      minWaitTimeEstimate: 0,
      maxWaitTimeEstimate: 15000,
      suggestedMaxPriorityFeePerGas: '10',
      suggestedMaxFeePerGas: '100',
    },
    estimatedBaseFee: '50',
  };
};
