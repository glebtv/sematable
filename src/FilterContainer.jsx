import React from 'react';
import { connect } from 'react-redux';
import some from 'lodash-es/some';
import {
  tableFilterChanged,
  tableFilterTextChanged,
} from './actions';
import makeSelectors from './selectors';
import Filter from './Filter';

const mapStateToProps = (state, { tableName }) => {
  const selectors = makeSelectors(tableName);
  const isInitialized = selectors.getIsInitialized(state);

  if (!isInitialized) {
    return {
      isInitialized,
    };
  }

  return {
    isInitialized,
    value: selectors.getFilter(state),
    options: selectors.getFilterOptions(state),
    columns: selectors.getColumns(state),
  };
};

const mapDispatchToProps = (dispatch, { tableName }) => ({
  onChange: (filter) => dispatch(tableFilterChanged(tableName, filter)),
  onTextChange: (filterText) => dispatch(tableFilterTextChanged(tableName, filterText)),
});

export default connect(mapStateToProps, mapDispatchToProps)(({
  columns,
  isInitialized,
  ...otherProps
}) => {
  const hasFilterable = some(columns, 'filterable');
  if (!isInitialized) { return null; }
  return <Filter {...otherProps} hasFilterable={hasFilterable} />;
});
