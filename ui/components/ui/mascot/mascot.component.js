import PropTypes from 'prop-types';
import React, { Component } from 'react';

export default class Mascot extends Component {
  static propTypes = {
    width: PropTypes.string,
    height: PropTypes.string,
  };

  static defaultProps = {
    width: '200',
    height: '200',
  };

  render() {
    return (
      <img
        src="/images/logo/icon-512.png"
        width={this.props.width}
        height={this.props.height}
      />
    );
  }
}
