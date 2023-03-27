import React from 'react';
import InfoTooltip from '../../ui/info-tooltip/info-tooltip';
import GasTiming from '../gas-timing/gas-timing.component';
import TransactionDetailItem from '.';

export default {
  title: 'Transaction Detail Item',
};

export const basic = () => {
  return (
    <div style={{ width: '400px' }}>
      <TransactionDetailItem
        detailTitle={
          <>
            <strong>Estimated gas fee</strong>
            <InfoTooltip contentText="This is the tooltip text" position="top">
              <i className="fa fa-info-circle" />
            </InfoTooltip>
          </>
        }
        detailText="16565.30"
        detailTotal="0.0089 ETH"
        subTitle={<GasTiming maxPriorityFeePerGas="1" />}
        subText={
          <>
            From <strong>$16565 - $19000</strong>
          </>
        }
      />
    </div>
  );
};
