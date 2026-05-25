/**
 * Status color utilities for catalog components
 */

import { BookStatus } from '../types';

export const getStatusColor = (status: BookStatus): string => {
  switch (status) {
    case BookStatus.READING:
      return 'text-blue-600 bg-blue-50';
    case BookStatus.READ:
      return 'text-emerald-600 bg-emerald-50';
    case BookStatus.WANT_TO_READ:
      return 'text-amber-600 bg-amber-50';
    case BookStatus.ABANDONED:
      return 'text-red-600 bg-red-50';
    case BookStatus.POSTPONED:
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-slate-600 bg-slate-50';
  }
};
