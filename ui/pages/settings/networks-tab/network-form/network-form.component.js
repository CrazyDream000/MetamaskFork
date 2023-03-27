import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import validUrl from 'valid-url';
import log from 'loglevel';
import TextField from '../../../../components/ui/text-field';
import Button from '../../../../components/ui/button';
import Tooltip from '../../../../components/ui/tooltip';
import {
  isPrefixedFormattedHexString,
  isSafeChainId,
} from '../../../../../shared/modules/network.utils';
import { jsonRpcRequest } from '../../../../../shared/modules/rpc.utils';
import { decimalToHex } from '../../../../helpers/utils/conversions.util';

const FORM_STATE_KEYS = [
  'rpcUrl',
  'chainId',
  'ticker',
  'networkName',
  'blockExplorerUrl',
];

export default class NetworkForm extends PureComponent {
  static contextTypes = {
    t: PropTypes.func.isRequired,
    metricsEvent: PropTypes.func.isRequired,
  };

  static propTypes = {
    editRpc: PropTypes.func.isRequired,
    showConfirmDeleteNetworkModal: PropTypes.func.isRequired,
    rpcUrl: PropTypes.string,
    chainId: PropTypes.string,
    ticker: PropTypes.string,
    viewOnly: PropTypes.bool,
    networkName: PropTypes.string,
    onClear: PropTypes.func.isRequired,
    setRpcTarget: PropTypes.func.isRequired,
    networksTabIsInAddMode: PropTypes.bool,
    isCurrentRpcTarget: PropTypes.bool,
    blockExplorerUrl: PropTypes.string,
    rpcPrefs: PropTypes.object,
    networksToRender: PropTypes.array,
    onAddNetwork: PropTypes.func.isRequired,
  };

  static defaultProps = {
    rpcUrl: '',
    chainId: '',
    ticker: '',
    networkName: '',
    blockExplorerUrl: '',
  };

  state = {
    rpcUrl: this.props.rpcUrl,
    chainId: this.getDisplayChainId(this.props.chainId),
    ticker: this.props.ticker,
    networkName: this.props.networkName,
    blockExplorerUrl: this.props.blockExplorerUrl,
    errors: {},
    isSubmitting: false,
  };

  componentDidUpdate(prevProps) {
    const { networksTabIsInAddMode: prevAddMode } = prevProps;
    const { networksTabIsInAddMode } = this.props;

    if (!prevAddMode && networksTabIsInAddMode) {
      this.setState({
        rpcUrl: '',
        chainId: '',
        ticker: '',
        networkName: '',
        blockExplorerUrl: '',
        errors: {},
        isSubmitting: false,
      });
    } else {
      for (const key of FORM_STATE_KEYS) {
        if (prevProps[key] !== this.props[key]) {
          this.resetForm();
          break;
        }
      }
    }
  }

  componentWillUnmount() {
    this.setState({
      rpcUrl: '',
      chainId: '',
      ticker: '',
      networkName: '',
      blockExplorerUrl: '',
      errors: {},
    });

    // onClear will push the network settings route unless was pass false.
    // Since we call onClear to cause this component to be unmounted, the
    // route will already have been updated, and we avoid setting it twice.
    this.props.onClear(false);
  }

  resetForm() {
    const {
      rpcUrl,
      chainId,
      ticker,
      networkName,
      blockExplorerUrl,
    } = this.props;

    this.setState({
      rpcUrl,
      chainId: this.getDisplayChainId(chainId),
      ticker,
      networkName,
      blockExplorerUrl,
      errors: {},
      isSubmitting: false,
    });
  }

  /**
   * Attempts to convert the given chainId to a decimal string, for display
   * purposes.
   *
   * Should be called with the props chainId whenever it is used to set the
   * component's state.
   *
   * @param {unknown} chainId - The chainId to convert.
   * @returns {string} The props chainId in decimal, or the original value if
   * it can't be converted.
   */
  getDisplayChainId(chainId) {
    if (!chainId || typeof chainId !== 'string' || !chainId.startsWith('0x')) {
      return chainId;
    }
    return parseInt(chainId, 16).toString(10);
  }

  /**
   * Prefixes a given id with '0x' if the prefix does not exist
   *
   * @param {string} chainId - The chainId to prefix
   * @returns {string} The chainId, prefixed with '0x'
   */
  prefixChainId(chainId) {
    let prefixedChainId = chainId;
    if (!chainId.startsWith('0x')) {
      prefixedChainId = `0x${parseInt(chainId, 10).toString(16)}`;
    }
    return prefixedChainId;
  }

  onSubmit = async () => {
    this.setState({
      isSubmitting: true,
    });

    try {
      const {
        setRpcTarget,
        rpcUrl: propsRpcUrl,
        editRpc,
        rpcPrefs = {},
        onAddNetwork,
        networksTabIsInAddMode,
      } = this.props;
      const {
        networkName,
        rpcUrl,
        chainId: stateChainId,
        ticker,
        blockExplorerUrl,
      } = this.state;

      const formChainId = stateChainId.trim().toLowerCase();
      const chainId = this.prefixChainId(formChainId);

      if (!(await this.validateChainIdOnSubmit(formChainId, chainId, rpcUrl))) {
        this.setState({
          isSubmitting: false,
        });
        return;
      }

      // After this point, isSubmitting will be reset in componentDidUpdate
      if (propsRpcUrl && rpcUrl !== propsRpcUrl) {
        await editRpc(propsRpcUrl, rpcUrl, chainId, ticker, networkName, {
          ...rpcPrefs,
          blockExplorerUrl: blockExplorerUrl || rpcPrefs.blockExplorerUrl,
        });
      } else {
        await setRpcTarget(rpcUrl, chainId, ticker, networkName, {
          ...rpcPrefs,
          blockExplorerUrl: blockExplorerUrl || rpcPrefs.blockExplorerUrl,
        });
      }

      if (networksTabIsInAddMode) {
        onAddNetwork();
      }
    } catch (error) {
      this.setState({
        isSubmitting: false,
      });
      throw error;
    }
  };

  onCancel = () => {
    const { networksTabIsInAddMode, onClear } = this.props;

    if (networksTabIsInAddMode) {
      onClear();
    } else {
      this.resetForm();
    }
  };

  onDelete = () => {
    const { showConfirmDeleteNetworkModal, rpcUrl, onClear } = this.props;
    showConfirmDeleteNetworkModal({
      target: rpcUrl,
      onConfirm: () => {
        this.resetForm();
        onClear();
      },
    });
  };

  isSubmitting() {
    return this.state.isSubmitting;
  }

  stateIsUnchanged() {
    const {
      rpcUrl,
      chainId: propsChainId,
      ticker,
      networkName,
      blockExplorerUrl,
    } = this.props;

    const {
      rpcUrl: stateRpcUrl,
      chainId: stateChainId,
      ticker: stateTicker,
      networkName: stateNetworkName,
      blockExplorerUrl: stateBlockExplorerUrl,
    } = this.state;

    // These added conditions are in case the saved chainId is invalid, which
    // was possible in versions <8.1 of the extension.
    // Basically, we always want to be able to overwrite an invalid chain ID.
    const chainIdIsUnchanged =
      typeof propsChainId === 'string' &&
      propsChainId.toLowerCase().startsWith('0x') &&
      stateChainId === this.getDisplayChainId(propsChainId);

    return (
      stateRpcUrl === rpcUrl &&
      chainIdIsUnchanged &&
      stateTicker === ticker &&
      stateNetworkName === networkName &&
      stateBlockExplorerUrl === blockExplorerUrl
    );
  }

  renderFormTextField({
    fieldKey,
    textFieldId,
    onChange,
    value,
    optionalTextFieldKey,
    tooltipText,
    autoFocus = false,
  }) {
    const { errors } = this.state;
    const { viewOnly } = this.props;
    const errorMessage = errors[fieldKey]?.msg || '';

    return (
      <div className="networks-tab__network-form-row">
        <div className="networks-tab__network-form-label">
          <div className="networks-tab__network-form-label-text">
            {this.context.t(optionalTextFieldKey || fieldKey)}
          </div>
          {!viewOnly && tooltipText ? (
            <Tooltip
              position="top"
              title={tooltipText}
              wrapperClassName="networks-tab__network-form-label-tooltip"
            >
              <i className="fa fa-info-circle" />
            </Tooltip>
          ) : null}
        </div>
        <TextField
          type="text"
          id={textFieldId}
          onChange={onChange}
          fullWidth
          margin="dense"
          value={value}
          disabled={viewOnly}
          error={errorMessage}
          autoFocus={autoFocus}
        />
      </div>
    );
  }

  setStateWithValue = (stateKey, validator) => {
    return (e) => {
      validator?.(e.target.value, stateKey);
      this.setState({ [stateKey]: e.target.value });
    };
  };

  setErrorTo = (errorKey, errorVal) => {
    this.setState({
      errors: {
        ...this.state.errors,
        [errorKey]: errorVal,
      },
    });
  };

  setErrorEmpty = (errorKey) => {
    this.setState({
      errors: {
        ...this.state.errors,
        [errorKey]: {
          msg: '',
          key: '',
        },
      },
    });
  };

  hasError = (errorKey, errorKeyVal) => {
    return this.state.errors[errorKey]?.key === errorKeyVal;
  };

  hasErrors = () => {
    const { errors } = this.state;
    return Object.keys(errors).some((key) => {
      const error = errors[key];
      // Do not factor in duplicate chain id error for submission disabling
      if (key === 'chainId' && error.key === 'chainIdExistsErrorMsg') {
        return false;
      }
      return error.key && error.msg;
    });
  };

  validateChainIdOnChange = (selfRpcUrl, chainIdArg = '') => {
    const { t } = this.context;
    const { networksToRender } = this.props;
    const chainId = chainIdArg.trim();

    let errorKey = '';
    let errorMessage = '';
    let radix = 10;
    let hexChainId = chainId;

    if (!hexChainId.startsWith('0x')) {
      try {
        hexChainId = `0x${decimalToHex(hexChainId)}`;
      } catch (err) {
        this.setErrorTo('chainId', {
          key: 'invalidHexNumber',
          msg: t('invalidHexNumber'),
        });
        return;
      }
    }

    const [matchingChainId] = networksToRender.filter(
      (e) => e.chainId === hexChainId && e.rpcUrl !== selfRpcUrl,
    );

    if (chainId === '') {
      this.setErrorEmpty('chainId');
      return;
    } else if (matchingChainId) {
      errorKey = 'chainIdExistsErrorMsg';
      errorMessage = t('chainIdExistsErrorMsg', [
        matchingChainId.label ?? matchingChainId.labelKey,
      ]);
    } else if (chainId.startsWith('0x')) {
      radix = 16;
      if (!/^0x[0-9a-f]+$/iu.test(chainId)) {
        errorKey = 'invalidHexNumber';
        errorMessage = t('invalidHexNumber');
      } else if (!isPrefixedFormattedHexString(chainId)) {
        errorMessage = t('invalidHexNumberLeadingZeros');
      }
    } else if (!/^[0-9]+$/u.test(chainId)) {
      errorKey = 'invalidNumber';
      errorMessage = t('invalidNumber');
    } else if (chainId.startsWith('0')) {
      errorKey = 'invalidNumberLeadingZeros';
      errorMessage = t('invalidNumberLeadingZeros');
    } else if (!isSafeChainId(parseInt(chainId, radix))) {
      errorKey = 'invalidChainIdTooBig';
      errorMessage = t('invalidChainIdTooBig');
    }

    this.setErrorTo('chainId', {
      key: errorKey,
      msg: errorMessage,
    });
  };

  /**
   * Validates the chain ID by checking it against the `eth_chainId` return
   * value from the given RPC URL.
   * Assumes that all strings are non-empty and correctly formatted.
   *
   * @param {string} formChainId - Non-empty, hex or decimal number string from
   * the form.
   * @param {string} parsedChainId - The parsed, hex string chain ID.
   * @param {string} rpcUrl - The RPC URL from the form.
   */
  validateChainIdOnSubmit = async (formChainId, parsedChainId, rpcUrl) => {
    const { t } = this.context;
    let errorKey;
    let errorMessage;
    let endpointChainId;
    let providerError;

    try {
      endpointChainId = await jsonRpcRequest(rpcUrl, 'eth_chainId');
    } catch (err) {
      log.warn('Failed to fetch the chainId from the endpoint.', err);
      providerError = err;
    }

    if (providerError || typeof endpointChainId !== 'string') {
      errorKey = 'failedToFetchChainId';
      errorMessage = t('failedToFetchChainId');
    } else if (parsedChainId !== endpointChainId) {
      // Here, we are in an error state. The endpoint should always return a
      // hexadecimal string. If the user entered a decimal string, we attempt
      // to convert the endpoint's return value to decimal before rendering it
      // in an error message in the form.
      if (!formChainId.startsWith('0x')) {
        try {
          endpointChainId = parseInt(endpointChainId, 16).toString(10);
        } catch (err) {
          log.warn(
            'Failed to convert endpoint chain ID to decimal',
            endpointChainId,
          );
        }
      }

      errorKey = 'endpointReturnedDifferentChainId';
      errorMessage = t('endpointReturnedDifferentChainId', [
        endpointChainId.length <= 12
          ? endpointChainId
          : `${endpointChainId.slice(0, 9)}...`,
      ]);
    }

    if (errorKey) {
      this.setErrorTo('chainId', {
        key: errorKey,
        msg: errorMessage,
      });
      return false;
    }

    this.setErrorEmpty('chainId');
    return true;
  };

  isValidWhenAppended = (url) => {
    const appendedRpc = `http://${url}`;
    return validUrl.isWebUri(appendedRpc) && !url.match(/^https?:\/\/$/u);
  };

  validateBlockExplorerURL = (url, stateKey) => {
    const { t } = this.context;
    if (!validUrl.isWebUri(url) && url !== '') {
      let errorKey;
      let errorMessage;

      if (this.isValidWhenAppended(url)) {
        errorKey = 'urlErrorMsg';
        errorMessage = t('urlErrorMsg');
      } else {
        errorKey = 'invalidBlockExplorerURL';
        errorMessage = t('invalidBlockExplorerURL');
      }

      this.setErrorTo(stateKey, {
        key: errorKey,
        msg: errorMessage,
      });
    } else {
      this.setErrorEmpty(stateKey);
    }
  };

  validateUrlRpcUrl = (url, stateKey) => {
    const { t } = this.context;
    const { networksToRender } = this.props;
    const { chainId: stateChainId } = this.state;
    const isValidUrl = validUrl.isWebUri(url);
    const chainIdFetchFailed = this.hasError('chainId', 'failedToFetchChainId');
    const [matchingRPCUrl] = networksToRender.filter((e) => e.rpcUrl === url);

    if (!isValidUrl && url !== '') {
      let errorKey;
      let errorMessage;
      if (this.isValidWhenAppended(url)) {
        errorKey = 'urlErrorMsg';
        errorMessage = t('urlErrorMsg');
      } else {
        errorKey = 'invalidRPC';
        errorMessage = t('invalidRPC');
      }
      this.setErrorTo(stateKey, {
        key: errorKey,
        msg: errorMessage,
      });
    } else if (matchingRPCUrl) {
      this.setErrorTo(stateKey, {
        key: 'urlExistsErrorMsg',
        msg: t('urlExistsErrorMsg', [
          matchingRPCUrl.label ?? matchingRPCUrl.labelKey,
        ]),
      });
    } else {
      this.setErrorEmpty(stateKey);
    }

    // Re-validate the chain id if it could not be found with previous rpc url
    if (stateChainId && isValidUrl && chainIdFetchFailed) {
      const formChainId = stateChainId.trim().toLowerCase();
      const chainId = this.prefixChainId(formChainId);
      this.validateChainIdOnSubmit(formChainId, chainId, url);
    }
  };

  renderWarning() {
    const { t } = this.context;
    return (
      <div className="networks-tab__network-form-row--warning">
        {t('onlyAddTrustedNetworks')}
      </div>
    );
  }

  render() {
    const { t } = this.context;
    const { viewOnly, isCurrentRpcTarget, networksTabIsInAddMode } = this.props;
    const {
      networkName,
      rpcUrl,
      chainId = '',
      ticker,
      blockExplorerUrl,
    } = this.state;

    const deletable =
      !networksTabIsInAddMode && !isCurrentRpcTarget && !viewOnly;
    const isSubmitDisabled =
      this.hasErrors() ||
      this.isSubmitting() ||
      this.stateIsUnchanged() ||
      !rpcUrl ||
      !chainId;

    return (
      <div className="networks-tab__network-form">
        {viewOnly ? null : this.renderWarning()}
        {this.renderFormTextField({
          fieldKey: 'networkName',
          textFieldId: 'network-name',
          onChange: this.setStateWithValue('networkName'),
          value: networkName,
          autoFocus: networksTabIsInAddMode,
        })}
        {this.renderFormTextField({
          fieldKey: 'rpcUrl',
          textFieldId: 'rpc-url',
          onChange: this.setStateWithValue('rpcUrl', this.validateUrlRpcUrl),
          value: rpcUrl,
        })}
        {this.renderFormTextField({
          fieldKey: 'chainId',
          textFieldId: 'chainId',
          onChange: this.setStateWithValue(
            'chainId',
            this.validateChainIdOnChange.bind(this, rpcUrl),
          ),
          value: chainId,
          tooltipText: viewOnly ? null : t('networkSettingsChainIdDescription'),
        })}
        {this.renderFormTextField({
          fieldKey: 'symbol',
          textFieldId: 'network-ticker',
          onChange: this.setStateWithValue('ticker'),
          value: ticker,
          optionalTextFieldKey: 'optionalCurrencySymbol',
        })}
        {this.renderFormTextField({
          fieldKey: 'blockExplorerUrl',
          textFieldId: 'block-explorer-url',
          onChange: this.setStateWithValue(
            'blockExplorerUrl',
            this.validateBlockExplorerURL,
          ),
          value: blockExplorerUrl,
          optionalTextFieldKey: 'optionalBlockExplorerUrl',
        })}
        <div className="network-form__footer">
          {!viewOnly && (
            <>
              {deletable && (
                <Button type="danger" onClick={this.onDelete}>
                  {t('delete')}
                </Button>
              )}
              <Button
                type="default"
                onClick={this.onCancel}
                disabled={this.stateIsUnchanged()}
              >
                {t('cancel')}
              </Button>
              <Button
                type="secondary"
                disabled={isSubmitDisabled}
                onClick={this.onSubmit}
              >
                {t('save')}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }
}
