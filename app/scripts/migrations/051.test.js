import { strict as assert } from 'assert';
import {
  INFURA_PROVIDER_TYPES,
  NETWORK_TYPE_TO_ID_MAP,
} from '../../../shared/constants/network';
import migration51 from './051';

describe('migration #51', function () {
  it('should update the version metadata', async function () {
    const oldStorage = {
      meta: {
        version: 50,
      },
      data: {},
    };

    const newStorage = await migration51.migrate(oldStorage);
    assert.deepEqual(newStorage.meta, {
      version: 51,
    });
  });

  describe('setting chainId', function () {
    INFURA_PROVIDER_TYPES.forEach(function (type) {
      it(`should correctly set the chainId for the Infura network "${type}", if no chainId is set`, async function () {
        const oldStorage = {
          meta: {},
          data: {
            NetworkController: {
              settings: {
                fizz: 'buzz',
              },
              provider: {
                type,
              },
            },
            foo: 'bar',
          },
        };
        const newStorage = await migration51.migrate(oldStorage);
        assert.deepEqual(newStorage.data, {
          NetworkController: {
            settings: {
              fizz: 'buzz',
            },
            provider: {
              type,
              chainId: NETWORK_TYPE_TO_ID_MAP[type].chainId,
            },
          },
          foo: 'bar',
        });
      });

      it(`should correctly set the chainId for the Infura network "${type}", if an incorrect chainId is set`, async function () {
        const oldStorage = {
          meta: {},
          data: {
            NetworkController: {
              settings: {
                fizz: 'buzz',
              },
              provider: {
                type,
                chainId: 'foo',
              },
            },
            foo: 'bar',
          },
        };
        const newStorage = await migration51.migrate(oldStorage);
        assert.deepEqual(newStorage.data, {
          NetworkController: {
            settings: {
              fizz: 'buzz',
            },
            provider: {
              type,
              chainId: NETWORK_TYPE_TO_ID_MAP[type].chainId,
            },
          },
          foo: 'bar',
        });
      });
    });

    it('should not set the chainId for a non-Infura network that does not have chainId set', async function () {
      const oldStorage = {
        meta: {},
        data: {
          NetworkController: {
            settings: {
              fizz: 'buzz',
            },
            provider: {
              type: 'foo',
            },
          },
        },
      };
      const newStorage = await migration51.migrate(oldStorage);
      assert.deepEqual(newStorage.data, oldStorage.data);
    });

    it('should not set the chainId for a non-Infura network that does have chainId set', async function () {
      const oldStorage = {
        meta: {},
        data: {
          NetworkController: {
            settings: {
              fizz: 'buzz',
            },
            provider: {
              type: 'foo',
              chainId: '0x999',
            },
          },
        },
      };
      const newStorage = await migration51.migrate(oldStorage);
      assert.deepEqual(newStorage.data, oldStorage.data);
    });
  });
});
