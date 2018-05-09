import PropTypes from 'prop-types';
import React, { Component } from 'react';

import isFunction from 'lodash-es/isFunction';
import isObject from 'lodash-es/isObject';
import get from 'lodash-es/get';

import SelectRow from './SelectRow';

const propTypes = {
  selectable: PropTypes.bool,
  selectEnabled: PropTypes.func,
  row: PropTypes.object.isRequired,
  headers: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
  CheckboxComponent: PropTypes.func,
};

const resolveProps = (row, componentProps, tableProps) => {
  if (!componentProps) {
    return {};
  } else if (isFunction(componentProps)) {
    return componentProps(row, tableProps);
  } else if (isObject(componentProps)) {
    return componentProps;
  }
  throw new Error('componentProps should be object or function!');
};

class TableRow extends Component {
  render() {
    const {
      row,
      selectable,
      selectEnabled,
      headers,
      columns,
      CheckboxComponent,
      ...otherProps
    } = this.props;
    const select = headers.select;
    const visibleColumns = columns.filter((c) => !c.hidden);
    let className = '';

    if (selectable && select.isSelected(row)) {
      className = 'table-info';
    }
    return (
      <tr className={className}>
        {selectable &&
          <td key="select" style={{ width: '1%', whiteSpace: 'nowrap' }}>
            <SelectRow
              row={row}
              isEnabled={selectEnabled}
              CheckboxComponent={CheckboxComponent}
              {...select}
            />
          </td>
        }
        {visibleColumns.map((col) =>
          <td key={col.key} className={col.className}>
            {col.Component ?
              <col.Component
                row={row}
                key={col.key}
                {...resolveProps(row, col.componentProps, otherProps)}
              >
                {get(row, col.key)}
              </col.Component> : get(row, col.key)
            }
          </td>
        )}
      </tr>
    );
  }
}
TableRow.propTypes = propTypes;

export default TableRow;
