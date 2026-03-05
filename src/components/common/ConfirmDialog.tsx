import { Modal } from './Modal';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger'
}: ConfirmDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    {message}
                </p>
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-colors ${variant === 'danger' ? 'bg-destructive hover:bg-destructive/90' :
                                variant === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                    'bg-primary hover:bg-primary/90'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
