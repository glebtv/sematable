import isString from 'lodash-es/isString';
import find from 'lodash-es/find';
import keyBy from 'lodash-es/keyBy';
import indexOf from 'lodash-es/indexOf';
import get from 'lodash-es/get';
import has from 'lodash-es/has';

import { handleActions } from 'redux-actions';
import {
  TABLE_INITIALIZE,
  TABLE_NEW_DATA,
  TABLE_PAGE_CHANGED,
  TABLE_PAGE_SIZE_CHANGED,
  TABLE_SORT_CHANGED,
  TABLE_FILTER_CHANGED,
  TABLE_FILTER_TEXT_CHANGED,
  TABLE_SELECT_ALL_CHANGED,
  TABLE_ROW_CHECKED_CHANGED,
  TABLE_DESTROY_STATE,
  TABLE_SET_FILTER,
} from './actions';
import { createTextFilter, createValueFilter } from './common';

import { PAGE_SIZE_ALL_VALUE } from './PageSize';

const defaultState = (configs = {}) => ({
  page: 0,
  pageSize: configs.defaultPageSize || 5,
  pageSizes: configs.defaultPageSizes || [5, 10, 15, 20, 50, 100, PAGE_SIZE_ALL_VALUE],
  filter: [],
  filterText: null,
  sortKey: configs.sortKey,
  direction: configs.sortDirection || 'asc',
  selectAll: false,
  userSelection: [],
  configs,
});

const filterValueToFilter = (filterValue = [], columnMap) => filterValue.map(f => {
  if (isString(f)) {
    return createTextFilter(f);
  }
  const column = columnMap[f.key];
  return createValueFilter(column, f.value);
});

const behaviours = {
  [TABLE_INITIALIZE]: (state = {}, { payload }) => {
    const nextState = {
      ...defaultState(payload.configs),
      ...state,
      ...payload,
    };
    const primaryKeyCol = find(nextState.columns, 'primaryKey');
    const columnMap = keyBy(nextState.columns, 'key');
    const filter = payload.filterValue ?
      filterValueToFilter(payload.filterValue, columnMap) :
      nextState.filter;

    if (!primaryKeyCol) {
      const msg = 'One column must be marked as primary with "primaryKey" for' +
                  ` data table ${nextState.tableName}.`;
      throw new Error(msg);
    }

    return {
      ...nextState,
      filter,
      primaryKey: primaryKeyCol.key,
    };
  },
  [TABLE_NEW_DATA]: (state, { payload }) => ({
    ...state,
    initialData: payload.data,
  }),
  [TABLE_SET_FILTER]: (state, { payload }) => {
    const columnMap = keyBy(state.columns, 'key');
    const filter = filterValueToFilter(payload.filterValue, columnMap);
    return {
      ...state,
      filter,
    };
  },
  [TABLE_PAGE_CHANGED]: (state, { payload }) => ({
    ...state,
    page: payload.page,
  }),
  [TABLE_PAGE_SIZE_CHANGED]: (state, { payload }) => ({
    ...state,
    page: 0,
    pageSize: payload.pageSize,
  }),
  [TABLE_SORT_CHANGED]: (state, { payload }) => {
    const { sortKey, direction } = state;
    if (sortKey === payload.sortKey) {
      return {
        ...state,
        direction: direction === 'asc' ? 'desc' : 'asc',
      };
    }
    return {
      ...state,
      sortKey: payload.sortKey,
      direction: 'asc',
    };
  },
  [TABLE_FILTER_CHANGED]: (state, { payload }) => ({
    ...state,
    page: 0,
    filter: payload.filter,
    filterText: null,
  }),
  [TABLE_FILTER_TEXT_CHANGED]: (state, { payload }) => ({
    ...state,
    page: 0,
    filterText: payload.filterText,
  }),
  [TABLE_SELECT_ALL_CHANGED]: (state) => ({
    ...state,
    selectAll: !state.selectAll,
    userSelection: [],
  }),
  [TABLE_ROW_CHECKED_CHANGED]: (state, { payload }) => {
    const {
      userSelection,
      primaryKey,
    } = state;
    const { row } = payload;
    const idx = indexOf(userSelection, get(row, primaryKey));

    if (idx !== -1) {
      return {
        ...state,
        userSelection: [
          ...userSelection.slice(0, idx),
          ...userSelection.slice(idx + 1),
        ],
      };
    }
    return {
      ...state,
      userSelection: [
        ...userSelection,
        get(row, primaryKey),
      ],
    };
  },
  [TABLE_DESTROY_STATE]: (state) => {
    if (!state) {
      return state;
    }

    return {
      ...state,
      ...defaultState(state.configs),
    };
  },
};

const tableReducer = handleActions(behaviours, defaultState());

export default (state, action) => {
  if (!state) {
    return {};
  }

  if (has(behaviours, action.type)) {
    const { tableName } = action.payload;
    return {
      ...state,
      [tableName]: tableReducer(state[tableName], action),
    };
  }

  return state;
};
