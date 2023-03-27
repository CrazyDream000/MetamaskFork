import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { getAddressBookEntry } from '../../../../selectors';
import {
  CONTACT_EDIT_ROUTE,
  CONTACT_LIST_ROUTE,
} from '../../../../helpers/constants/routes';
import { toChecksumHexAddress } from '../../../../../shared/modules/hexstring-utils';
import ViewContact from './view-contact.component';

const mapStateToProps = (state, ownProps) => {
  const { location } = ownProps;
  const { pathname } = location;
  const pathNameTail = pathname.match(/[^/]+$/u)[0];
  const pathNameTailIsAddress = pathNameTail.includes('0x');
  const address = pathNameTailIsAddress
    ? pathNameTail.toLowerCase()
    : ownProps.match.params.id;

  const contact =
    getAddressBookEntry(state, address) || state.metamask.identities[address];
  const { memo, name } = contact || {};

  return {
    name,
    address: contact ? address : null,
    checkSummedAddress: toChecksumHexAddress(address),
    memo,
    editRoute: CONTACT_EDIT_ROUTE,
    listRoute: CONTACT_LIST_ROUTE,
  };
};

export default compose(withRouter, connect(mapStateToProps))(ViewContact);
