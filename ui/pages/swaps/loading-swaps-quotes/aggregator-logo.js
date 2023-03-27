import React from 'react';
import PropTypes from 'prop-types';

// Inspired by https://stackoverflow.com/a/28056903/4727685
function hexToRGB(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function AggregatorLogo({ name, icon, color }) {
  return (
    <div className="loading-swaps-quotes__logo">
      {icon && color ? (
        <div
          style={{
            background: color,
            boxShadow: `0px 4px 20px ${hexToRGB(color, 0.25)}`,
          }}
        >
          <img src={icon} alt="" />
        </div>
      ) : (
        name && (
          <div>
            <span>{name}</span>
          </div>
        )
      )}
    </div>
  );
}

AggregatorLogo.propTypes = {
  name: PropTypes.string,
  icon: PropTypes.string,
  color: PropTypes.string,
};
