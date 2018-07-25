import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLongArrowAltUp as longArrowAltUp } from '@fortawesome/free-solid-svg-icons/faLongArrowAltUp'
import { faLongArrowAltDown as longArrowAltDown } from '@fortawesome/free-solid-svg-icons/faLongArrowAltDown'

const propTypes = {
  sortKey: PropTypes.string.isRequired,
  name: PropTypes.node.isRequired,
  handleClick: PropTypes.func.isRequired,
  sorted: PropTypes.string,
  title: PropTypes.string,
};

class SortableHeader extends Component {
  render() {
    const {
      sortKey,
      name,
      sorted,
      title,
      handleClick,
    } = this.props;
    return (
      <th
        data-key={sortKey}
        data-toggle={title ? 'tooltip' : ''}
        style={{
          cursor: 'pointer',
        }}
        title={title}
        onClick={() => handleClick(sortKey)}
      >
        <span style={{ marginRight: '5px' }}>
          {name}
        </span>
        {sorted === 'asc' && <FontAwesomeIcon icon={longArrowAltUp} />}
        {sorted === 'desc' && <FontAwesomeIcon icon={longArrowAltDown} />}
        {sorted === null && <i
          className="fa fa-arrows-v"
          style={{ color: '#ccc' }}
        />}
      </th>
    );
  }
}

SortableHeader.propTypes = propTypes;
export default SortableHeader;
