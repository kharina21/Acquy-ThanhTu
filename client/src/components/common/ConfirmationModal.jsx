import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmationModal - Replaces browser confirm() with a better UX
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to close the modal
 * @param {function} onConfirm - Function to call when confirmed
 * @param {function} onCancel - Optional function to call when cancelled
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {string} confirmText - Text for confirm button (default: "Xác nhận")
 * @param {string} cancelText - Text for cancel button (default: "Hủy")
 * @param {string} variant - "danger" | "warning" | "info" (default: "warning")
 */
const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    onCancel,
    title = 'Xác nhận',
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'warning',
}) => {
    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onClose();
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            handleCancel();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            handleConfirm();
        }
    };

    React.useEffect(() => {
        if (!isOpen) return;

        document.addEventListener('keydown', handleKeyDown);
        // Focus the confirm button when modal opens
        const confirmBtn = document.getElementById('confirm-btn');
        if (confirmBtn) {
            setTimeout(() => confirmBtn.focus(), 100);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const variantClasses = {
        danger: 'bg-error text-error-content',
        warning: 'bg-warning text-warning-content',
        info: 'bg-info text-info-content',
    };

    return createPortal(
        <dialog className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-box max-w-md">
                <div className="flex items-start gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${variantClasses[variant] || variantClasses.warning}`}>
                        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                        <h3 id="modal-title" className="font-bold text-lg mb-2">
                            {title}
                        </h3>
                        <p className="text-base-content/70 mb-4">
                            {message}
                        </p>
                        <div className="modal-action justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="btn btn-ghost focus:outline-none focus:ring-2 focus:ring-offset-2"
                                aria-label={cancelText}
                            >
                                {cancelText}
                            </button>
                            <button
                                id="confirm-btn"
                                type="button"
                                onClick={handleConfirm}
                                className={`btn ${variant === 'danger' ? 'btn-error' : variant === 'warning' ? 'btn-warning' : 'btn-primary'} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                                aria-label={confirmText}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 focus:outline-none focus:ring-2 focus:ring-offset-2"
                        aria-label="Đóng"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={handleCancel}>
                <button type="button" aria-label="Đóng modal">close</button>
            </form>
        </dialog>,
        document.body
    );
};

export default ConfirmationModal;

