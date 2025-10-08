/**
 * Utility functions for date formatting
 */

/**
 * Formats a date to Polish format with slashes (dd/mm/yyyy)
 * @param date - Date object or date string
 * @param options - Additional formatting options
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Nieznana data';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options
    };
    
    return dateObj.toLocaleDateString('pl-PL', defaultOptions).replace(/\./g, '/');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Nieznana data';
  }
};

/**
 * Formats a date with time to Polish format with slashes (dd/mm/yyyy hh:mm)
 * @param date - Date object or date string
 * @param options - Additional formatting options
 * @returns Formatted date and time string
 */
export const formatDateTime = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Nieznana data';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    
    return dateObj.toLocaleDateString('pl-PL', defaultOptions).replace(/\./g, '/');
  } catch (error) {
    console.error('Error formatting date and time:', error);
    return 'Nieznana data';
  }
};

/**
 * Formats a Firestore timestamp to Polish format with slashes
 * @param timestamp - Firestore timestamp object
 * @param options - Additional formatting options
 * @returns Formatted date string
 */
export const formatFirestoreDate = (timestamp: any, options?: Intl.DateTimeFormatOptions): string => {
  try {
    if (!timestamp) {
      return 'Nieznana data';
    }
    
    let date: Date;
    
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      // Firestore Timestamp with seconds
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Regular date
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
      return 'Nieznana data';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options
    };
    
    return date.toLocaleDateString('pl-PL', defaultOptions).replace(/\./g, '/');
  } catch (error) {
    console.error('Error formatting Firestore date:', error);
    return 'Nieznana data';
  }
};

/**
 * Formats a Firestore timestamp with time to Polish format with slashes
 * @param timestamp - Firestore timestamp object
 * @param options - Additional formatting options
 * @returns Formatted date and time string
 */
export const formatFirestoreDateTime = (timestamp: any, options?: Intl.DateTimeFormatOptions): string => {
  try {
    if (!timestamp) {
      return 'Nieznana data';
    }
    
    let date: Date;
    
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      // Firestore Timestamp with seconds
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Regular date
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
      return 'Nieznana data';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    
    return date.toLocaleDateString('pl-PL', defaultOptions).replace(/\./g, '/');
  } catch (error) {
    console.error('Error formatting Firestore date and time:', error);
    return 'Nieznana data';
  }
};
