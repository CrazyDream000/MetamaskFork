import { strict as assert } from 'assert';
import sinon from 'sinon';
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from '../../../../shared/constants/transaction';
import {
  KOVAN_CHAIN_ID,
  MAINNET_CHAIN_ID,
  RINKEBY_CHAIN_ID,
  KOVAN_NETWORK_ID,
} from '../../../../shared/constants/network';
import { GAS_LIMITS } from '../../../../shared/constants/gas';
import TxStateManager from './tx-state-manager';
import { snapshotFromTxMeta } from './lib/tx-state-history-helpers';

const VALID_ADDRESS = '0x0000000000000000000000000000000000000000';
const VALID_ADDRESS_TWO = '0x0000000000000000000000000000000000000001';

function generateTransactions(
  numToGen,
  {
    chainId,
    to,
    from,
    status,
    type = TRANSACTION_TYPES.SENT_ETHER,
    nonce = (i) => `${i}`,
  },
) {
  const txs = [];
  for (let i = 0; i < numToGen; i++) {
    const tx = {
      id: i,
      time: new Date() * i,
      status: typeof status === 'function' ? status(i) : status,
      chainId: typeof chainId === 'function' ? chainId(i) : chainId,
      txParams: {
        nonce: nonce(i),
        to,
        from,
      },
      type: typeof type === 'function' ? type(i) : type,
    };
    txs.push(tx);
  }
  return txs;
}
describe('TransactionStateManager', function () {
  let txStateManager;
  const currentNetworkId = KOVAN_NETWORK_ID;
  const currentChainId = KOVAN_CHAIN_ID;
  const otherNetworkId = '2';

  beforeEach(function () {
    txStateManager = new TxStateManager({
      initState: {
        transactions: {},
      },
      txHistoryLimit: 10,
      getNetwork: () => currentNetworkId,
      getCurrentChainId: () => currentChainId,
    });
  });

  describe('#setTxStatusSigned', function () {
    it('sets the tx status to signed', function () {
      const tx = {
        id: 1,
        status: TRANSACTION_STATUSES.UNAPPROVED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      };
      txStateManager.addTransaction(tx);
      txStateManager.setTxStatusSigned(1);
      const result = txStateManager.getTransactions();
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 1);
      assert.equal(result[0].status, TRANSACTION_STATUSES.SIGNED);
    });

    it('should emit a signed event to signal the execution of callback', function () {
      const tx = {
        id: 1,
        status: TRANSACTION_STATUSES.UNAPPROVED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      };
      const clock = sinon.useFakeTimers();
      const onSigned = sinon.spy();

      txStateManager.addTransaction(tx);
      txStateManager.on('1:signed', onSigned);
      txStateManager.setTxStatusSigned(1);
      clock.runAll();
      clock.restore();

      assert.ok(onSigned.calledOnce);
    });
  });

  describe('#setTxStatusRejected', function () {
    it('sets the tx status to rejected and removes it from history', function () {
      const tx = {
        id: 1,
        status: TRANSACTION_STATUSES.UNAPPROVED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      };
      txStateManager.addTransaction(tx);
      txStateManager.setTxStatusRejected(1);
      const result = txStateManager.getTransactions();
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 0);
    });

    it('should emit a rejected event to signal the execution of callback', function () {
      const tx = {
        id: 1,
        status: TRANSACTION_STATUSES.UNAPPROVED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      };
      const clock = sinon.useFakeTimers();
      const onSigned = sinon.spy();

      txStateManager.addTransaction(tx);
      txStateManager.on('1:rejected', onSigned);
      txStateManager.setTxStatusRejected(1);
      clock.runAll();
      clock.restore();

      assert.ok(onSigned.calledOnce);
    });
  });

  describe('#getTransactions', function () {
    it('when new should return empty array', function () {
      const result = txStateManager.getTransactions();
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 0);
    });

    it('should return a full list of transactions', function () {
      const submittedTx = {
        id: 0,
        metamaskNetworkId: currentNetworkId,
        time: 0,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x0',
        },
        status: TRANSACTION_STATUSES.SUBMITTED,
      };

      const confirmedTx = {
        id: 3,
        metamaskNetworkId: currentNetworkId,
        time: 3,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x3',
        },
        status: TRANSACTION_STATUSES.CONFIRMED,
      };

      const txm = new TxStateManager({
        initState: {
          transactions: {
            [submittedTx.id]: submittedTx,
            [confirmedTx.id]: confirmedTx,
          },
        },
        getNetwork: () => currentNetworkId,
        getCurrentChainId: () => currentChainId,
      });

      assert.deepEqual(txm.getTransactions(), [submittedTx, confirmedTx]);
    });

    it('should return a list of transactions, limited by N unique nonces when there are NO duplicates', function () {
      const submittedTx0 = {
        id: 0,
        metamaskNetworkId: currentNetworkId,
        time: 0,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x0',
        },
        status: TRANSACTION_STATUSES.SUBMITTED,
      };

      const unapprovedTx1 = {
        id: 1,
        metamaskNetworkId: currentNetworkId,
        time: 1,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x1',
        },
        status: TRANSACTION_STATUSES.UNAPPROVED,
      };

      const approvedTx2 = {
        id: 2,
        metamaskNetworkId: currentNetworkId,
        time: 2,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x2',
        },
        status: TRANSACTION_STATUSES.APPROVED,
      };

      const confirmedTx3 = {
        id: 3,
        metamaskNetworkId: currentNetworkId,
        time: 3,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x3',
        },
        status: TRANSACTION_STATUSES.CONFIRMED,
      };

      const txm = new TxStateManager({
        initState: {
          transactions: {
            [submittedTx0.id]: submittedTx0,
            [unapprovedTx1.id]: unapprovedTx1,
            [approvedTx2.id]: approvedTx2,
            [confirmedTx3.id]: confirmedTx3,
          },
        },
        getNetwork: () => currentNetworkId,
        getCurrentChainId: () => currentChainId,
      });

      assert.deepEqual(txm.getTransactions({ limit: 2 }), [
        approvedTx2,
        confirmedTx3,
      ]);
    });

    it('should return a list of transactions, limited by N unique nonces when there ARE duplicates', function () {
      const submittedTx0 = {
        id: 0,
        metamaskNetworkId: currentNetworkId,
        time: 0,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x0',
        },
        status: TRANSACTION_STATUSES.SUBMITTED,
      };
      const submittedTx0Dupe = {
        id: 1,
        metamaskNetworkId: currentNetworkId,
        time: 0,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x0',
        },
        status: TRANSACTION_STATUSES.SUBMITTED,
      };

      const unapprovedTx1 = {
        id: 2,
        metamaskNetworkId: currentNetworkId,
        chainId: currentChainId,
        time: 1,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x1',
        },
        status: TRANSACTION_STATUSES.UNAPPROVED,
      };

      const approvedTx2 = {
        id: 3,
        metamaskNetworkId: currentNetworkId,
        time: 2,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x2',
        },
        status: TRANSACTION_STATUSES.APPROVED,
      };
      const approvedTx2Dupe = {
        id: 4,
        metamaskNetworkId: currentNetworkId,
        chainId: currentChainId,
        time: 2,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x2',
        },
        status: TRANSACTION_STATUSES.APPROVED,
      };

      const failedTx3 = {
        id: 5,
        metamaskNetworkId: currentNetworkId,
        time: 3,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x3',
        },
        status: TRANSACTION_STATUSES.FAILED,
      };
      const failedTx3Dupe = {
        id: 6,
        metamaskNetworkId: currentNetworkId,
        chainId: currentChainId,
        time: 3,
        txParams: {
          from: '0xAddress',
          to: '0xRecipient',
          nonce: '0x3',
        },
        status: TRANSACTION_STATUSES.FAILED,
      };

      const txm = new TxStateManager({
        initState: {
          transactions: {
            [submittedTx0.id]: submittedTx0,
            [submittedTx0Dupe.id]: submittedTx0Dupe,

            [unapprovedTx1.id]: unapprovedTx1,
            [approvedTx2.id]: approvedTx2,
            [approvedTx2Dupe.id]: approvedTx2Dupe,

            [failedTx3.id]: failedTx3,
            [failedTx3Dupe.id]: failedTx3Dupe,
          },
        },
        getNetwork: () => currentNetworkId,
        getCurrentChainId: () => currentChainId,
      });

      assert.deepEqual(txm.getTransactions({ limit: 2 }), [
        approvedTx2,
        approvedTx2Dupe,
        failedTx3,
        failedTx3Dupe,
      ]);
    });

    it('returns a tx with the requested data', function () {
      const txMetas = [
        {
          id: 0,
          status: TRANSACTION_STATUSES.UNAPPROVED,
          txParams: { from: VALID_ADDRESS, to: VALID_ADDRESS_TWO },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 1,
          status: TRANSACTION_STATUSES.UNAPPROVED,
          txParams: { from: VALID_ADDRESS, to: VALID_ADDRESS_TWO },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 2,
          status: TRANSACTION_STATUSES.UNAPPROVED,
          txParams: { from: VALID_ADDRESS, to: VALID_ADDRESS_TWO },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 3,
          status: TRANSACTION_STATUSES.UNAPPROVED,
          txParams: { from: VALID_ADDRESS_TWO, to: VALID_ADDRESS },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 4,
          status: TRANSACTION_STATUSES.UNAPPROVED,
          txParams: { from: VALID_ADDRESS_TWO, to: VALID_ADDRESS },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 5,
          status: TRANSACTION_STATUSES.CONFIRMED,
          txParams: { from: VALID_ADDRESS, to: VALID_ADDRESS_TWO },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 6,
          status: TRANSACTION_STATUSES.CONFIRMED,
          txParams: { from: VALID_ADDRESS, to: VALID_ADDRESS_TWO },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 7,
          status: TRANSACTION_STATUSES.CONFIRMED,
          txParams: { from: VALID_ADDRESS_TWO, to: VALID_ADDRESS },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 8,
          status: TRANSACTION_STATUSES.CONFIRMED,
          txParams: { from: VALID_ADDRESS_TWO, to: VALID_ADDRESS },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 9,
          status: TRANSACTION_STATUSES.CONFIRMED,
          txParams: { from: VALID_ADDRESS_TWO, to: VALID_ADDRESS },
          metamaskNetworkId: currentNetworkId,
        },
      ];
      txMetas.forEach((txMeta) => txStateManager.addTransaction(txMeta));
      let searchCriteria;

      searchCriteria = {
        status: TRANSACTION_STATUSES.UNAPPROVED,
        from: VALID_ADDRESS,
      };
      assert.equal(
        txStateManager.getTransactions({ searchCriteria }).length,
        3,
        `getTransactions - ${JSON.stringify(searchCriteria)}`,
      );
      searchCriteria = {
        status: TRANSACTION_STATUSES.UNAPPROVED,
        to: VALID_ADDRESS,
      };
      assert.equal(
        txStateManager.getTransactions({ searchCriteria }).length,
        2,
        `getTransactions - ${JSON.stringify(searchCriteria)}`,
      );
      searchCriteria = {
        status: TRANSACTION_STATUSES.CONFIRMED,
        from: VALID_ADDRESS_TWO,
      };
      assert.equal(
        txStateManager.getTransactions({ searchCriteria }).length,
        3,
        `getTransactions - ${JSON.stringify(searchCriteria)}`,
      );
      searchCriteria = { status: TRANSACTION_STATUSES.CONFIRMED };
      assert.equal(
        txStateManager.getTransactions({ searchCriteria }).length,
        5,
        `getTransactions - ${JSON.stringify(searchCriteria)}`,
      );
      searchCriteria = { from: VALID_ADDRESS };
      assert.equal(
        txStateManager.getTransactions({ searchCriteria }).length,
        5,
        `getTransactions - ${JSON.stringify(searchCriteria)}`,
      );
      searchCriteria = { to: VALID_ADDRESS };
      assert.equal(
        txStateManager.getTransactions({ searchCriteria }).length,
        5,
        `getTransactions - ${JSON.stringify(searchCriteria)}`,
      );
      searchCriteria = {
        status: (status) => status !== TRANSACTION_STATUSES.CONFIRMED,
      };
      assert.equal(
        txStateManager.getTransactions({ searchCriteria }).length,
        5,
        `getTransactions - ${JSON.stringify(searchCriteria)}`,
      );
    });
  });

  describe('#addTransaction', function () {
    it('adds a tx returned in getTransactions', function () {
      const tx = {
        id: 1,
        status: TRANSACTION_STATUSES.CONFIRMED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      };
      txStateManager.addTransaction(tx);
      const result = txStateManager.getTransactions();
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 1);
    });

    it('throws error and does not add tx if txParams are invalid', function () {
      const validTxParams = {
        from: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
        to: '0x0039f22efb07a647557c7c5d17854cfd6d489ef3',
        nonce: '0x3',
        gas: '0x77359400',
        gasPrice: '0x77359400',
        value: '0x0',
        data: '0x0',
      };
      const invalidValues = [1, true, {}, Symbol('1')];

      Object.keys(validTxParams).forEach((key) => {
        for (const value of invalidValues) {
          const tx = {
            id: 1,
            status: TRANSACTION_STATUSES.UNAPPROVED,
            metamaskNetworkId: currentNetworkId,
            txParams: {
              ...validTxParams,
              [key]: value,
            },
          };
          assert.throws(
            txStateManager.addTransaction.bind(txStateManager, tx),
            'addTransaction should throw error',
          );
          const result = txStateManager.getTransactions();
          assert.ok(Array.isArray(result), 'txList should be an array');
          assert.equal(result.length, 0, 'txList should be empty');
        }
      });
    });

    it('does not override txs from other networks', function () {
      const tx = {
        id: 1,
        status: TRANSACTION_STATUSES.CONFIRMED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      };
      const tx2 = {
        id: 2,
        status: TRANSACTION_STATUSES.CONFIRMED,
        metamaskNetworkId: otherNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      };
      txStateManager.addTransaction(tx);
      txStateManager.addTransaction(tx2);
      const result = txStateManager.getTransactions({
        filterToCurrentNetwork: false,
      });
      const result2 = txStateManager.getTransactions();
      assert.equal(result.length, 2, 'txs were deleted');
      assert.equal(result2.length, 1, 'incorrect number of txs on network.');
    });

    it('cuts off early txs beyond a limit', function () {
      const limit = txStateManager.txHistoryLimit;
      const txs = generateTransactions(limit + 1, {
        chainId: currentChainId,
        to: VALID_ADDRESS,
        from: VALID_ADDRESS_TWO,
        status: TRANSACTION_STATUSES.CONFIRMED,
      });
      txs.forEach((tx) => txStateManager.addTransaction(tx));
      const result = txStateManager.getTransactions();
      assert.equal(result.length, limit, `limit of ${limit} txs enforced`);
      assert.equal(result[0].id, 1, 'early txs truncated');
    });

    it('cuts off early txs beyond a limit whether or not it is confirmed or rejected', function () {
      const limit = txStateManager.txHistoryLimit;
      const txs = generateTransactions(limit + 1, {
        chainId: currentChainId,
        to: VALID_ADDRESS,
        from: VALID_ADDRESS_TWO,
        status: TRANSACTION_STATUSES.REJECTED,
      });
      txs.forEach((tx) => txStateManager.addTransaction(tx));
      const result = txStateManager.getTransactions();
      assert.equal(result.length, limit, `limit of ${limit} txs enforced`);
      assert.equal(result[0].id, 1, 'early txs truncated');
    });

    it('cuts off early txs beyond a limit but does not cut unapproved txs', function () {
      const limit = txStateManager.txHistoryLimit;
      const txs = generateTransactions(
        // we add two transactions over limit here to first insert the must be always present
        // unapproved tx, then another to force the original logic of adding
        // one more beyond the first additional.
        limit + 2,
        {
          chainId: currentChainId,
          to: VALID_ADDRESS,
          from: VALID_ADDRESS_TWO,
          status: (i) =>
            i === 0
              ? TRANSACTION_STATUSES.UNAPPROVED
              : TRANSACTION_STATUSES.CONFIRMED,
        },
      );
      txs.forEach((tx) => txStateManager.addTransaction(tx));
      const result = txStateManager.getTransactions();
      assert.equal(
        result.length,
        limit + 1,
        `limit of ${limit} + 1 for the unapproved tx is enforced`,
      );
      assert.equal(result[0].id, 0, 'first tx should still be there');
      assert.equal(
        result[0].status,
        TRANSACTION_STATUSES.UNAPPROVED,
        'first tx should be unapproved',
      );
      assert.equal(result[1].id, 2, 'early txs truncated');
    });

    it('cuts off entire groups of transactions by nonce when adding new transaction', function () {
      const limit = txStateManager.txHistoryLimit;
      // In this test case the earliest two transactions are a dropped attempted ether send and a
      // following cancel transaction with the same nonce. these two transactions should be dropped
      // together as soon as the 11th unique nonce is attempted to be added. We use limit + 2 to
      // first get into the state where we are over the "limit" of transactions because of a set
      // of transactions with a unique nonce/network combo, then add an additional new transaction
      // to trigger the removal of one group of nonces.
      const txs = generateTransactions(limit + 2, {
        chainId: currentChainId,
        to: VALID_ADDRESS,
        from: VALID_ADDRESS_TWO,
        nonce: (i) => (i === 1 ? `0` : `${i}`),
        status: (i) =>
          i === 0
            ? TRANSACTION_STATUSES.DROPPED
            : TRANSACTION_STATUSES.CONFIRMED,
        type: (i) =>
          i === 1 ? TRANSACTION_TYPES.CANCEL : TRANSACTION_STATUSES.SENT_ETHER,
      });
      txs.forEach((tx) => txStateManager.addTransaction(tx));
      const result = txStateManager.getTransactions();
      assert.equal(result.length, limit, `limit of ${limit} is enforced`);
      assert.notEqual(result[0].id, 0, 'first tx should be removed');
      assert.equal(
        result.some(
          (tx) =>
            tx.status === TRANSACTION_STATUSES.DROPPED ||
            tx.status === TRANSACTION_TYPES.CANCEL,
        ),
        false,
        'the cancel and dropped transactions should not be present in the result',
      );
    });

    it('cuts off entire groups of transactions by nonce + network when adding new transaction', function () {
      const limit = txStateManager.txHistoryLimit;
      // In this test case the earliest two transactions are a dropped attempted ether send and a
      // following cancel transaction with the same nonce. Then, a bit later the same scenario on a
      // different network. The first two transactions should be dropped after adding even another
      // single transaction but the other shouldn't be dropped until adding the fifth additional
      // transaction
      const txs = generateTransactions(limit + 5, {
        chainId: (i) => {
          if (i === 0 || i === 1) return MAINNET_CHAIN_ID;
          else if (i === 4 || i === 5) return RINKEBY_CHAIN_ID;
          return currentChainId;
        },
        to: VALID_ADDRESS,
        from: VALID_ADDRESS_TWO,
        nonce: (i) => ([0, 1, 4, 5].includes(i) ? '0' : `${i}`),
        status: (i) =>
          i === 0 || i === 4
            ? TRANSACTION_STATUSES.DROPPED
            : TRANSACTION_STATUSES.CONFIRMED,
        type: (i) =>
          i === 1 || i === 5
            ? TRANSACTION_TYPES.CANCEL
            : TRANSACTION_STATUSES.SENT_ETHER,
      });
      txs.forEach((tx) => txStateManager.addTransaction(tx));
      const result = txStateManager.getTransactions({
        filterToCurrentNetwork: false,
      });

      assert.equal(
        result.length,
        limit + 1,
        `limit of ${limit} + 1 for the grouped transactions is enforced`,
      );
      // The first group of transactions on mainnet should be removed
      assert.equal(
        result.some(
          (tx) =>
            tx.chainId === MAINNET_CHAIN_ID && tx.txParams.nonce === '0x0',
        ),
        false,
        'the mainnet transactions with nonce 0x0 should not be present in the result',
      );
    });

    it('does not cut off entire groups of transactions when adding new transaction when under limit', function () {
      // In this test case the earliest two transactions are a dropped attempted ether send and a
      // following cancel transaction with the same nonce. Then, a bit later the same scenario on a
      // different network. None of these should be dropped because we haven't yet reached the limit
      const limit = txStateManager.txHistoryLimit;
      const txs = generateTransactions(limit - 1, {
        chainId: (i) => ([0, 1, 4, 5].includes(i) ? currentChainId : '0x1'),
        to: VALID_ADDRESS,
        from: VALID_ADDRESS_TWO,
        nonce: (i) => {
          if (i === 1) return '0';
          else if (i === 5) return '4';
          return `${i}`;
        },
        status: (i) =>
          i === 0 || i === 4
            ? TRANSACTION_STATUSES.DROPPED
            : TRANSACTION_STATUSES.CONFIRMED,
        type: (i) =>
          i === 1 || i === 5
            ? TRANSACTION_TYPES.CANCEL
            : TRANSACTION_STATUSES.SENT_ETHER,
      });
      txs.forEach((tx) => txStateManager.addTransaction(tx));
      const result = txStateManager.getTransactions({
        filterToCurrentNetwork: false,
      });
      assert.equal(result.length, 9, `all nine transactions should be present`);
      assert.equal(result[0].id, 0, 'first tx should be present');
    });
  });

  describe('#updateTransaction', function () {
    it('replaces the tx with the same id', function () {
      txStateManager.addTransaction({
        id: '1',
        status: TRANSACTION_STATUSES.UNAPPROVED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      });
      txStateManager.addTransaction({
        id: '2',
        status: TRANSACTION_STATUSES.CONFIRMED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      });
      const txMeta = txStateManager.getTransaction('1');
      txMeta.hash = 'foo';
      txStateManager.updateTransaction(txMeta);
      const result = txStateManager.getTransaction('1');
      assert.equal(result.hash, 'foo');
    });

    it('throws error and does not update tx if txParams are invalid', function () {
      const validTxParams = {
        from: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
        to: '0x0039f22efb07a647557c7c5d17854cfd6d489ef3',
        nonce: '0x3',
        gas: '0x77359400',
        gasPrice: '0x77359400',
        value: '0x0',
        data: '0x0',
      };
      const invalidValues = [1, true, {}, Symbol('1')];

      txStateManager.addTransaction({
        id: 1,
        status: TRANSACTION_STATUSES.UNAPPROVED,
        metamaskNetworkId: currentNetworkId,
        txParams: validTxParams,
      });

      Object.keys(validTxParams).forEach((key) => {
        for (const value of invalidValues) {
          const originalTx = txStateManager.getTransaction(1);
          const newTx = {
            ...originalTx,
            txParams: {
              ...originalTx.txParams,
              [key]: value,
            },
          };
          assert.throws(
            txStateManager.updateTransaction.bind(txStateManager, newTx),
            'updateTransaction should throw an error',
          );
          const result = txStateManager.getTransaction(1);
          assert.deepEqual(result, originalTx, 'tx should not be updated');
        }
      });
    });

    it('updates gas price and adds history items', function () {
      const originalGasPrice = '0x01';
      const desiredGasPrice = '0x02';

      const txMeta = {
        id: '1',
        status: TRANSACTION_STATUSES.UNAPPROVED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          from: VALID_ADDRESS_TWO,
          to: VALID_ADDRESS,
          gasPrice: originalGasPrice,
        },
      };

      txStateManager.addTransaction(txMeta);
      const updatedTx = txStateManager.getTransaction('1');
      // verify tx was initialized correctly
      assert.equal(updatedTx.history.length, 1, 'one history item (initial)');
      assert.equal(
        Array.isArray(updatedTx.history[0]),
        false,
        'first history item is initial state',
      );
      assert.deepEqual(
        updatedTx.history[0],
        snapshotFromTxMeta(updatedTx),
        'first history item is initial state',
      );
      // modify value and updateTransaction
      updatedTx.txParams.gasPrice = desiredGasPrice;
      const before = new Date().getTime();
      txStateManager.updateTransaction(updatedTx);
      const after = new Date().getTime();
      // check updated value
      const result = txStateManager.getTransaction('1');
      assert.equal(
        result.txParams.gasPrice,
        desiredGasPrice,
        'gas price updated',
      );
      // validate history was updated
      assert.equal(
        result.history.length,
        2,
        'two history items (initial + diff)',
      );
      assert.equal(
        result.history[1].length,
        1,
        'two history state items (initial + diff)',
      );

      const expectedEntry = {
        op: 'replace',
        path: '/txParams/gasPrice',
        value: desiredGasPrice,
      };
      assert.deepEqual(
        result.history[1][0].op,
        expectedEntry.op,
        'two history items (initial + diff) operation',
      );
      assert.deepEqual(
        result.history[1][0].path,
        expectedEntry.path,
        'two history items (initial + diff) path',
      );
      assert.deepEqual(
        result.history[1][0].value,
        expectedEntry.value,
        'two history items (initial + diff) value',
      );
      assert.ok(
        result.history[1][0].timestamp >= before &&
          result.history[1][0].timestamp <= after,
      );
    });

    it('does NOT add empty history items', function () {
      const txMeta = {
        id: '1',
        status: TRANSACTION_STATUSES.UNAPPROVED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          from: VALID_ADDRESS_TWO,
          to: VALID_ADDRESS,
          gasPrice: '0x01',
        },
      };

      txStateManager.addTransaction(txMeta);
      txStateManager.updateTransaction(txMeta);

      const { history } = txStateManager.getTransaction('1');
      assert.equal(history.length, 1, 'two history items (initial + diff)');
    });
  });

  describe('#getUnapprovedTxList', function () {
    it('returns unapproved txs in a hash', function () {
      txStateManager.addTransaction({
        id: '1',
        status: TRANSACTION_STATUSES.UNAPPROVED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      });
      txStateManager.addTransaction({
        id: '2',
        status: TRANSACTION_STATUSES.CONFIRMED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      });
      const result = txStateManager.getUnapprovedTxList();
      assert.equal(typeof result, 'object');
      assert.equal(result['1'].status, TRANSACTION_STATUSES.UNAPPROVED);
      assert.equal(result['2'], undefined);
    });
  });

  describe('#getTransaction', function () {
    it('returns a tx with the requested id', function () {
      txStateManager.addTransaction({
        id: '1',
        status: TRANSACTION_STATUSES.UNAPPROVED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      });
      txStateManager.addTransaction({
        id: '2',
        status: TRANSACTION_STATUSES.CONFIRMED,
        metamaskNetworkId: currentNetworkId,
        txParams: {
          to: VALID_ADDRESS,
          from: VALID_ADDRESS,
        },
      });
      assert.equal(
        txStateManager.getTransaction('1').status,
        TRANSACTION_STATUSES.UNAPPROVED,
      );
      assert.equal(
        txStateManager.getTransaction('2').status,
        TRANSACTION_STATUSES.CONFIRMED,
      );
    });
  });

  describe('#wipeTransactions', function () {
    const specificAddress = VALID_ADDRESS;
    const otherAddress = VALID_ADDRESS_TWO;

    it('should remove only the transactions from a specific address', function () {
      const txMetas = [
        {
          id: 0,
          status: TRANSACTION_STATUSES.UNAPPROVED,
          txParams: { from: specificAddress, to: otherAddress },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 1,
          status: TRANSACTION_STATUSES.CONFIRMED,
          txParams: { from: otherAddress, to: specificAddress },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 2,
          status: TRANSACTION_STATUSES.CONFIRMED,
          txParams: { from: otherAddress, to: specificAddress },
          metamaskNetworkId: currentNetworkId,
        },
      ];
      txMetas.forEach((txMeta) => txStateManager.addTransaction(txMeta));

      txStateManager.wipeTransactions(specificAddress);

      const transactionsFromCurrentAddress = txStateManager
        .getTransactions()
        .filter((txMeta) => txMeta.txParams.from === specificAddress);
      const transactionsFromOtherAddresses = txStateManager
        .getTransactions()
        .filter((txMeta) => txMeta.txParams.from !== specificAddress);

      assert.equal(transactionsFromCurrentAddress.length, 0);
      assert.equal(transactionsFromOtherAddresses.length, 2);
    });

    it('should not remove the transactions from other networks', function () {
      const txMetas = [
        {
          id: 0,
          status: TRANSACTION_STATUSES.UNAPPROVED,
          txParams: { from: specificAddress, to: otherAddress },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 1,
          status: TRANSACTION_STATUSES.CONFIRMED,
          txParams: { from: specificAddress, to: otherAddress },
          metamaskNetworkId: otherNetworkId,
        },
        {
          id: 2,
          status: TRANSACTION_STATUSES.CONFIRMED,
          txParams: { from: specificAddress, to: otherAddress },
          metamaskNetworkId: otherNetworkId,
        },
      ];

      txMetas.forEach((txMeta) => txStateManager.addTransaction(txMeta));

      txStateManager.wipeTransactions(specificAddress);

      const txsFromCurrentNetworkAndAddress = txStateManager
        .getTransactions()
        .filter((txMeta) => txMeta.txParams.from === specificAddress);
      const txFromOtherNetworks = txStateManager
        .getTransactions({ filterToCurrentNetwork: false })
        .filter((txMeta) => txMeta.metamaskNetworkId === otherNetworkId);

      assert.equal(txsFromCurrentNetworkAndAddress.length, 0);
      assert.equal(txFromOtherNetworks.length, 2);
    });
  });

  describe('#_deleteTransaction', function () {
    it('should remove the transaction from the storage', function () {
      txStateManager.addTransaction({ id: 1 });
      txStateManager._deleteTransaction(1);
      assert.ok(
        !txStateManager.getTransactions({ filterToCurrentNetwork: false })
          .length,
        'txList should be empty',
      );
    });

    it('should only remove the transaction with ID 1 from the storage', function () {
      txStateManager.store.updateState({
        transactions: { 1: { id: 1 }, 2: { id: 2 } },
      });
      txStateManager._deleteTransaction(1);
      assert.equal(
        txStateManager.getTransactions({
          filterToCurrentNetwork: false,
        })[0].id,
        2,
        'txList should have a id of 2',
      );
    });
  });

  describe('#generateTxMeta', function () {
    it('generates a txMeta object when supplied no parameters', function () {
      // There are currently not safety checks for missing 'opts' but we should
      // at least enforce txParams. This is done in the transaction controller
      // before *calling* this method, but we should perhaps ensure that
      // txParams is provided and validated in this method.
      // TODO: this test should fail.
      const generatedTransaction = txStateManager.generateTxMeta();
      assert.ok(generatedTransaction);
    });

    it('generates a txMeta object with txParams specified', function () {
      const txParams = {
        gas: GAS_LIMITS.SIMPLE,
        from: '0x0000',
        to: '0x000',
        value: '0x0',
        gasPrice: '0x0',
      };
      const generatedTransaction = txStateManager.generateTxMeta({
        txParams,
      });
      assert.ok(generatedTransaction);
      assert.strictEqual(generatedTransaction.txParams, txParams);
    });

    it('generates a txMeta object with txParams specified using EIP-1559 fields', function () {
      const txParams = {
        gas: GAS_LIMITS.SIMPLE,
        from: '0x0000',
        to: '0x000',
        value: '0x0',
        maxFeePerGas: '0x0',
        maxPriorityFeePerGas: '0x0',
      };
      const generatedTransaction = txStateManager.generateTxMeta({
        txParams,
      });
      assert.ok(generatedTransaction);
      assert.strictEqual(generatedTransaction.txParams, txParams);
    });

    it('records dappSuggestedGasFees when origin is provided and is not "metamask"', function () {
      const eip1559GasFeeFields = {
        maxFeePerGas: '0x0',
        maxPriorityFeePerGas: '0x0',
        gas: GAS_LIMITS.SIMPLE,
      };

      const legacyGasFeeFields = {
        gasPrice: '0x0',
        gas: GAS_LIMITS.SIMPLE,
      };

      const eip1559TxParams = {
        from: '0x0000',
        to: '0x000',
        value: '0x0',
        ...eip1559GasFeeFields,
      };

      const legacyTxParams = {
        from: '0x0000',
        to: '0x000',
        value: '0x0',
        ...legacyGasFeeFields,
      };
      const eip1559GeneratedTransaction = txStateManager.generateTxMeta({
        txParams: eip1559TxParams,
        origin: 'adappt.com',
      });
      const legacyGeneratedTransaction = txStateManager.generateTxMeta({
        txParams: legacyTxParams,
        origin: 'adappt.com',
      });
      assert.ok(
        eip1559GeneratedTransaction,
        'generated EIP1559 transaction should be truthy',
      );
      assert.deepStrictEqual(
        eip1559GeneratedTransaction.dappSuggestedGasFees,
        eip1559GasFeeFields,
        'generated EIP1559 transaction should have appropriate dappSuggestedGasFees',
      );

      assert.ok(
        legacyGeneratedTransaction,
        'generated legacy transaction should be truthy',
      );
      assert.deepStrictEqual(
        legacyGeneratedTransaction.dappSuggestedGasFees,
        legacyGasFeeFields,
        'generated legacy transaction should have appropriate dappSuggestedGasFees',
      );
    });

    it('does not record dappSuggestedGasFees when transaction origin is "metamask"', function () {
      const txParams = {
        gas: GAS_LIMITS.SIMPLE,
        from: '0x0000',
        to: '0x000',
        value: '0x0',
        maxFeePerGas: '0x0',
        maxPriorityFeePerGas: '0x0',
      };
      const generatedTransaction = txStateManager.generateTxMeta({
        txParams,
        origin: 'metamask',
      });
      assert.ok(generatedTransaction);
      assert.strictEqual(generatedTransaction.dappSuggestedGasFees, null);
    });

    it('does not record dappSuggestedGasFees when transaction origin is not provided', function () {
      const txParams = {
        gas: GAS_LIMITS.SIMPLE,
        from: '0x0000',
        to: '0x000',
        value: '0x0',
        maxFeePerGas: '0x0',
        maxPriorityFeePerGas: '0x0',
      };
      const generatedTransaction = txStateManager.generateTxMeta({
        txParams,
      });
      assert.ok(generatedTransaction);
      assert.strictEqual(generatedTransaction.dappSuggestedGasFees, null);
    });
  });

  describe('#clearUnapprovedTxs', function () {
    it('removes unapproved transactions', function () {
      const txMetas = [
        {
          id: 0,
          status: TRANSACTION_STATUSES.UNAPPROVED,
          txParams: { from: VALID_ADDRESS, to: VALID_ADDRESS_TWO },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 1,
          status: TRANSACTION_STATUSES.UNAPPROVED,
          txParams: { from: VALID_ADDRESS, to: VALID_ADDRESS_TWO },
          metamaskNetworkId: currentNetworkId,
        },
        {
          id: 2,
          status: TRANSACTION_STATUSES.CONFIRMED,
          txParams: { from: VALID_ADDRESS, to: VALID_ADDRESS_TWO },
          metamaskNetworkId: otherNetworkId,
        },
        {
          id: 3,
          status: TRANSACTION_STATUSES.CONFIRMED,
          txParams: { from: VALID_ADDRESS, to: VALID_ADDRESS_TWO },
          metamaskNetworkId: otherNetworkId,
        },
      ];

      txMetas.forEach((txMeta) => txStateManager.addTransaction(txMeta));

      txStateManager.clearUnapprovedTxs();

      const unapprovedTxList = txStateManager
        .getTransactions({ filterToCurrentNetwork: false })
        .filter((tx) => tx.status === TRANSACTION_STATUSES.UNAPPROVED);

      assert.equal(unapprovedTxList.length, 0);
    });
  });
});
