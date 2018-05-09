import React from 'react';
import PropTypes from 'prop-types';

const YesNo = ({ children }) => (
  <span>{children ? 'Yes' : 'No'}</span>
);

YesNo.propTypes = {
  children: PropTypes.bool.isRequired,
};
export default YesNo;
