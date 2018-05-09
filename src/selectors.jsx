import { createSelector } from 'reselect';
import { createValueFilter } from './common';

import includes from "lodash-es/includes";
import lfilter from "lodash-es/filter";
import reject from "lodash-es/reject";
import keyBy from "lodash-es/keyBy";
import some from "lodash-es/some";
import every from "lodash-es/every";
import get from "lodash-es/get";
import groupBy from "lodash-es/groupBy";
import forOwn from "lodash-es/forOwn";
import isEmpty from "lodash-es/isEmpty";

import { PAGE_SIZE_ALL_VALUE } from './PageSize';

function paginate(rows, { page, pageSize }) {
  if (pageSize < 1) {
    return rows.slice(0);
  }
  const start = page * pageSize;
  return rows.slice(start, start + pageSize);
}

/**
 * rows - original data
 * filters - list of selected filters
 * filterText - currently entered text in filter input
 * columns - column definitions
 */
function filter(rows = [], filters = [], filterText, columns) {
  let filteredRows = rows.slice(0);
  if (filters.length === 0 && !filterText) {
    return filteredRows;
  }

  const textFilters = [
    ...(filterText ? [filterText.toLowerCase()] : []),
    ...filters.filter(f => f.textFilter).map(f => f.value),
  ];

  const valueFilters = lfilter(filters, f => f.valueFilter);

  // apply text filters across all columns
  if (textFilters.length > 0) {
    filteredRows = lfilter(rows, row => some(columns, (column) => {
      if (!column.searchable) {
        return false;
      }
      const normalized = String(get(row, column.key)).toLowerCase();
      return every(textFilters, f => normalized.indexOf(f) > -1);
    }));
  }

  // apply value filters on filterable columns
  if (valueFilters.length > 0) {
    const groups = groupBy(valueFilters, 'key');
    filteredRows = lfilter(filteredRows, row => every(
      groups,
      (groupFilters, groupKey) => {
        const value = get(row, groupKey);
        return some(groupFilters, f => f.value === value);
      },
    ));
  }

  return filteredRows;
}

function sort(rows, { sortKey, direction }) {
  const cloned = rows.slice(0);
  if (!sortKey) {
    return cloned;
  }

  return cloned.sort((a, b) => {
    let sortVal = 0;
    const valueA = get(a, sortKey);
    const valueB = get(b, sortKey);

    if (valueA > valueB || valueB === undefined) {
      sortVal = 1;
    } else if (valueA < valueB || valueA === undefined) {
      sortVal = -1;
    }

    if (direction === 'desc') {
      sortVal *= -1;
    }

    return sortVal;
  });
}

const selectors = {};

// wrapped in function as we use the same selectors for multiple tables
// if we don't wrap selectors like this, they would never memoize/cache results
// as we use it for multiple tables (each table has different state)
export default (tableName) => {
  if (selectors[tableName]) {
    return selectors[tableName];
  }

  const tableProp = (state, prop) => state.sematable[tableName] ?
    get(state.sematable[tableName], prop) : undefined;

  const getIsInitialized = (state) => state.sematable[tableName] !== undefined;
  const getInitialData = (state) => tableProp(state, 'initialData');
  const getFilter = (state) => tableProp(state, 'filter');
  const getFilterText = (state) => tableProp(state, 'filterText');
  const getColumns = (state) => tableProp(state, 'columns');
  const getPage = (state) => tableProp(state, 'page');
  const getPrimaryKey = (state) => tableProp(state, 'primaryKey');
  const getPageSize = (state) => tableProp(state, 'pageSize');
  const getPageSizes = (state) => tableProp(state, 'pageSizes');
  const getUserSelection = (state) => tableProp(state, 'userSelection');
  const getSelectAll = (state) => tableProp(state, 'selectAll');
  const getSortInfo = (state) => ({
    sortKey: tableProp(state, 'sortKey'),
    direction: tableProp(state, 'direction'),
  });
  const getSelectEnabled = (state) => tableProp(state, 'configs.selectEnabled');

  const getFiltered = createSelector(
    getInitialData,
    getFilter,
    getFilterText,
    getColumns,
    (initialData, filters, filterText, columns) => filter(
      initialData, filters, filterText, columns
    )
  );

  const getFilterOptions = createSelector(
    getInitialData,
    getColumns,
    (initialData, columns) => {
      const options = [];
      const columnMap = keyBy(columns, 'key');
      const values = {};

      // set predefined values
      columns.forEach((column) => {
        if (column.filterable && column.filterValues) {
          values[column.key] = column.filterValues;
        }
      });

      // collect values for columns that don't have predefined values
      initialData.forEach((row) => {
        columns.forEach(column => {
          if (!column.filterable || column.filterValues) {
            return;
          }
          if (!values[column.key]) {
            values[column.key] = [];
          }
          const columnValues = values[column.key];
          const value = get(row, column.key);
          if (!columnValues.includes(value)) {
            columnValues.push(value);
          }
        });
      });

      forOwn(values, (columnValues, key) => {
        columnValues.forEach((value) => {
          const column = columnMap[key];
          options.push(createValueFilter(column, value));
        });
      });

      return options;
    },
  );

  const getPageInfo = createSelector(
    getPage,
    getPageSize,
    getFiltered,
    getPageSizes,
    (page, pageSize, filtered, pageSizes) => {
      if (pageSize === PAGE_SIZE_ALL_VALUE) {
        // we are showing all rows
        return {
          page,
          pageSize,
          pageSizes,
          pageCount: 1,
        };
      }
      const pageCount = Math.ceil(filtered.length / pageSize);
      // When initial data changes (and therefore filtered data), we might have
      // less data than before. If that's the case the current page value might
      // be invalid. We fix that by setting it to last page.
      let validPage = page;
      if (page > pageCount - 1) {
        validPage = pageCount - 1;
      }
      return {
        page: validPage,
        pageSize,
        pageSizes,
        pageCount,
      };
    }
  );

  const getSorted = createSelector(
    getFiltered,
    getSortInfo,
    (filtered, sortInfo) => sort(filtered, sortInfo)
  );

  const getVisible = createSelector(
    getSorted,
    getPageInfo,
    (sorted, pageInfo) => paginate(sorted, pageInfo)
  );

  const getSelectedRows = createSelector(
    getFiltered,
    getColumns,
    getUserSelection,
    getSelectAll,
    getPrimaryKey,
    getSelectEnabled,
    (filtered, columns, userSelection, selectAll, primaryKey, selectEnabled) => {
      const includesKey = (row) => includes(userSelection, get(row, primaryKey));

      if (selectAll) {
        let selectable = filtered;
        // if not all rows are selectable, apply selectEnabled function to filter selectable
        if (selectEnabled) {
          selectable = lfilter(selectable, selectEnabled);
        }
        if (isEmpty(userSelection)) {
          return selectable;
        }
        // when select all is enabled, userSelection acts as "not selected" rows
        return reject(selectable, includesKey);
      }

      // when select all is not enabled, userSelection acts as "selected" rows
      return lfilter(filtered, includesKey);
    }
  );

  selectors[tableName] = {
    getInitialData,
    getIsInitialized,
    getFilter,
    getColumns,
    getSortInfo,
    getPageInfo,
    getVisible,
    getSelectedRows,
    getSelectAll,
    getPrimaryKey,
    getFilterOptions,
    getFiltered,
  };

  return selectors[tableName];
};
