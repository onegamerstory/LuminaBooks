import { useState } from 'react';

interface ConfirmationModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void | Promise<void>;
  isDangerous?: boolean;
}

export function useConfirmation(lang: 'en' | 'ru') {
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => {},
  });

  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    isDangerous: boolean = false
  ) => {
    setConfirmationModal({
      isOpen: true,
      title,
      message,
      confirmText: lang === 'ru' ? 'Удалить' : 'Delete',
      cancelText: lang === 'ru' ? 'Отмена' : 'Cancel',
      onConfirm,
      isDangerous,
    });
  };

  const closeConfirmation = () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
  };

  return { confirmationModal, showConfirmation, closeConfirmation };
}
