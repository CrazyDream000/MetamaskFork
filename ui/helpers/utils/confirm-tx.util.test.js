import { GAS_LIMITS } from '../../../shared/constants/gas';
import * as utils from './confirm-tx.util';

describe('Confirm Transaction utils', () => {
  describe('increaseLastGasPrice', () => {
    it('should increase the gasPrice by 10%', () => {
      const increasedGasPrice = utils.increaseLastGasPrice('0xa');
      expect(increasedGasPrice).toStrictEqual('0xb');
    });

    it('should prefix the result with 0x', () => {
      const increasedGasPrice = utils.increaseLastGasPrice('a');
      expect(increasedGasPrice).toStrictEqual('0xb');
    });
  });

  describe('hexGreaterThan', () => {
    it('should return true if the first value is greater than the second value', () => {
      expect(utils.hexGreaterThan('0xb', '0xa')).toStrictEqual(true);
    });

    it('should return false if the first value is less than the second value', () => {
      expect(utils.hexGreaterThan('0xa', '0xb')).toStrictEqual(false);
    });

    it('should return false if the first value is equal to the second value', () => {
      expect(utils.hexGreaterThan('0xa', '0xa')).toStrictEqual(false);
    });

    it('should correctly compare prefixed and non-prefixed hex values', () => {
      expect(utils.hexGreaterThan('0xb', 'a')).toStrictEqual(true);
    });
  });

  describe('getHexGasTotal', () => {
    it('should multiply the hex gasLimit and hex gasPrice values together', () => {
      expect(
        utils.getHexGasTotal({
          gasLimit: GAS_LIMITS.SIMPLE,
          gasPrice: '0x3b9aca00',
        }),
      ).toStrictEqual('0x1319718a5000');
    });

    it('should prefix the result with 0x', () => {
      expect(
        utils.getHexGasTotal({ gasLimit: '5208', gasPrice: '3b9aca00' }),
      ).toStrictEqual('0x1319718a5000');
    });
  });

  describe('addEth', () => {
    it('should add two values together rounding to 6 decimal places', () => {
      expect(utils.addEth('0.12345678', '0')).toStrictEqual('0.123457');
    });

    it('should add any number of values together rounding to 6 decimal places', () => {
      expect(
        utils.addEth(
          '0.1',
          '0.02',
          '0.003',
          '0.0004',
          '0.00005',
          '0.000006',
          '0.0000007',
        ),
      ).toStrictEqual('0.123457');
    });
  });

  describe('addFiat', () => {
    it('should add two values together rounding to 2 decimal places', () => {
      expect(utils.addFiat('0.12345678', '0')).toStrictEqual('0.12');
    });

    it('should add any number of values together rounding to 2 decimal places', () => {
      expect(
        utils.addFiat(
          '0.1',
          '0.02',
          '0.003',
          '0.0004',
          '0.00005',
          '0.000006',
          '0.0000007',
        ),
      ).toStrictEqual('0.12');
    });
  });

  describe('getValueFromWeiHex', () => {
    it('should get the transaction amount in ETH', () => {
      const ethTransactionAmount = utils.getValueFromWeiHex({
        value: '0xde0b6b3a7640000',
        toCurrency: 'ETH',
        conversionRate: 468.58,
        numberOfDecimals: 6,
      });

      expect(ethTransactionAmount).toStrictEqual('1');
    });

    it('should get the transaction amount in fiat', () => {
      const fiatTransactionAmount = utils.getValueFromWeiHex({
        value: '0xde0b6b3a7640000',
        toCurrency: 'usd',
        conversionRate: 468.58,
        numberOfDecimals: 2,
      });

      expect(fiatTransactionAmount).toStrictEqual('468.58');
    });
  });

  describe('getTransactionFee', () => {
    it('should get the transaction fee in ETH', () => {
      const ethTransactionFee = utils.getTransactionFee({
        value: '0x1319718a5000',
        toCurrency: 'ETH',
        conversionRate: 468.58,
        numberOfDecimals: 6,
      });

      expect(ethTransactionFee).toStrictEqual('0.000021');
    });

    it('should get the transaction fee in fiat', () => {
      const fiatTransactionFee = utils.getTransactionFee({
        value: '0x1319718a5000',
        toCurrency: 'usd',
        conversionRate: 468.58,
        numberOfDecimals: 2,
      });

      expect(fiatTransactionFee).toStrictEqual('0.01');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD values', () => {
      const value = utils.formatCurrency('123.45', 'usd');
      expect(value).toStrictEqual('$123.45');
    });
  });
});
