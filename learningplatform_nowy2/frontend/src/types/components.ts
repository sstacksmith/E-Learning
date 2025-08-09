import { ReactNode } from 'react';

export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

export interface ButtonProps extends BaseProps {
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export interface InputProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password' | 'email' | 'number';
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export interface SelectProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export interface ModalProps extends BaseProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface TooltipProps extends BaseProps {
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

export interface CardProps extends BaseProps {
  title?: string;
  subtitle?: string;
  image?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export interface BadgeProps extends BaseProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  rounded?: boolean;
}

export interface AvatarProps extends BaseProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
}

export interface TabProps extends BaseProps {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  tabs: TabProps[];
}

export interface LoadingProps extends BaseProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  fullscreen?: boolean;
}

export interface ErrorProps extends BaseProps {
  title?: string;
  message?: string;
  retry?: () => void;
}
