'use client';

import { useEffect, useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationProps {
  type: NotificationType;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export default function Notification({
  type = 'info',
  message,
  onClose,
  autoClose = true,
  duration = 5000
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  const close = useCallback(() => {
    setIsVisible(false);
    if (onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    if (autoClose && isVisible) {
      const timer = setTimeout(() => {
        close();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, isVisible, close]);

  if (!isVisible) return null;

  const bgColors = {
    success: 'bg-[#EBF9F1] border-[#34D399]',
    error: 'bg-[#FEF2F2] border-[#F87171]',
    info: 'bg-[#EFF6FF] border-[#4067EC]'
  };

  const textColors = {
    success: 'text-[#065F46]',
    error: 'text-[#991B1B]',
    info: 'text-[#1E40AF]'
  };

  const icons = {
    success: (
      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ),
    error: (
      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ),
    info: (
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    )
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div 
        className={`${bgColors[type]} ${textColors[type]} rounded-lg shadow-md border-l-4 px-6 py-4 flex items-start animate-fadeIn`}
        role="alert"
      >
        <div className="flex-shrink-0 mr-3">
          {icons[type]}
        </div>
        <div className="flex-1">
          <p className="font-medium text-base">{message}</p>
        </div>
        <button 
          type="button"
          className="ml-4 -mt-1 text-gray-400 hover:text-gray-900"
          onClick={close}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

// Komponent kontekstu do zarządzania powiadomieniami w całej aplikacji
export function useNotification() {
  const [notification, setNotification] = useState<{
    type: NotificationType;
    message: string;
    visible: boolean;
  } | null>(null);

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message, visible: true });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showSuccess: (message: string) => showNotification('success', message),
    showError: (message: string) => showNotification('error', message),
    showInfo: (message: string) => showNotification('info', message),
    hideNotification
  };
} 