import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
import { SapParserService } from '../services/sapParserService';
import { useAuth } from '../hooks/useAuth';
import type { SAPTransactionData } from '../types';
import { cn } from '../utils/cn';

type TransactionType = 'FBL1N' | 'ME5K' | 'ME2K' | 'KSB1' | 'ME5A';

interface FileQueueItem {
    id: string;
    file: File;
    type: TransactionType | 'unknown';
    status: 'pending' | 'processing' | 'success' | 'error';
    message?: string;
}

export function FileUploadPage() {
    const { t } = useTranslation();
    const { user } = useAuth();

    const TRANSACTION_TYPES: { value: TransactionType; label: string; description: string }[] = [
        { value: 'FBL1N', label: t('files.types.FBL1N.label'), description: t('files.types.FBL1N.desc') },
        { value: 'ME5K', label: t('files.types.ME5K.label'), description: t('files.types.ME5K.desc') },
        { value: 'ME2K', label: t('files.types.ME2K.label'), description: t('files.types.ME2K.desc') },
        { value: 'KSB1', label: t('files.types.KSB1.label'), description: t('files.types.KSB1.desc') },
        { value: 'ME5A', label: t('files.types.ME5A.label'), description: t('files.types.ME5A.desc') },
    ];

    const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
    const [isProcessingAll, setIsProcessingAll] = useState(false);
    const [uploads, setUploads] = useState<SAPTransactionData[]>([]);
    const [showConfirmClear, setShowConfirmClear] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Safer ID generation
    const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    useEffect(() => {
        loadUploads();
    }, []);

    const loadUploads = async () => {
        try {
            const data = await SapParserService.getUploads();
            setUploads(data as any);
        } catch (error) {
            console.error("Error loading uploads metadata", error);
        }
    };

    const guessType = (filename: string): TransactionType | 'unknown' => {
        const upper = filename.toUpperCase();
        if (upper.includes('FBL1N')) return 'FBL1N';
        if (upper.includes('ME5K')) return 'ME5K';
        if (upper.includes('ME2K')) return 'ME2K';
        if (upper.includes('KSB1')) return 'KSB1';
        if (upper.includes('ME5A')) return 'ME5A';
        return 'unknown';
    };

    const addFilesToQueue = (files: FileList | File[]) => {
        const fileList = Array.from(files);
        const newFiles = fileList.map(file => ({
            id: generateId(),
            file,
            type: guessType(file.name),
            status: 'pending' as const
        }));
        setFileQueue(prev => [...prev, ...newFiles]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFilesToQueue(e.target.files);
            // Reset input so the same file can be selected again
            e.target.value = '';
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            addFilesToQueue(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const removeFile = (id: string) => {
        setFileQueue(prev => prev.filter(f => f.id !== id));
    };

    const updateFileType = (id: string, type: TransactionType) => {
        setFileQueue(prev => prev.map(f => f.id === id ? { ...f, type } : f));
    };

    const processFile = async (
        item: FileQueueItem
    ): Promise<boolean> => {
        if (item.type === 'unknown' || !user) return false;

        setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'processing' } : f));

        try {
            const result = await SapParserService.parseFile(
                item.file,
                item.type as TransactionType,
                user.username
            );
            setFileQueue(prev => prev.map(f => f.id === item.id
                ? { ...f, status: 'success', message: `${result.upload.data.length} registros.` }
                : f
            ));
            loadUploads();
            return true;
        } catch (error: any) {
            setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', message: error.message } : f));
            return false;
        }
    };

    const processAll = async () => {
        const pending = fileQueue.filter(f => f.status === 'pending' || f.status === 'error');
        if (pending.length === 0) return;

        setIsProcessingAll(true);

        for (const item of pending) {
            await processFile(item);
        }

        setIsProcessingAll(false);
    };


    const handleClearAll = async () => {
        setIsProcessingAll(true);
        try {
            await SapParserService.clearAllUploads();
            setFileQueue([]);
            setUploads([]);
        } finally {
            setIsProcessingAll(false);
            setShowConfirmClear(false);
        }
    };

    const handleDeleteUpload = async (id: string) => {
        try {
            await SapParserService.deleteUpload(id);
            await loadUploads();
        } catch (error) {
            console.error("Error deleting", error);
        }
    };

    const getMissingReports = () => {
        const required = ['FBL1N', 'ME5K', 'ME2K'];
        const present = new Set(uploads.map(u => u.transaction_type));
        return required.filter(r => !present.has(r as any));
    };

    const missing = getMissingReports();
    const isReady = missing.length === 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('files.title')}</h1>
                <p className="text-muted-foreground">{t('files.subtitle')}</p>
            </div>

            {/* Status Summary */}
            <div className={cn(
                "p-4 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-4",
                isReady ? "bg-green-50 border-green-200 dark:bg-green-900/10" : "bg-orange-50 border-orange-200 dark:bg-orange-900/10"
            )}>
                <div className="flex items-center gap-3">
                    {isReady ? <CheckCircle className="w-6 h-6 text-green-600" /> : <AlertCircle className="w-6 h-6 text-orange-600" />}
                    <div>
                        <h3 className="font-bold text-sm">
                            {isReady ? t('files.status.title_ready') : t('files.status.title_missing')}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {isReady ? t('files.status.desc_ready') : t('files.status.desc_missing', { missing: missing.join(', ') })}
                        </p>
                    </div>
                </div>
                {isReady && (
                    <a href="/tracking" className="px-4 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
                        {t('files.status.view_tracking')}
                    </a>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* File Dropzone & Queue */}
                <div className="lg:col-span-2 space-y-4">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                            "bg-card rounded-lg border-2 border-dashed p-10 flex flex-col items-center justify-center text-center transition-all",
                            isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-input hover:bg-accent/50"
                        )}
                    >
                        <UploadCloud className={cn("w-12 h-12 mb-4 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
                        <input
                            type="file"
                            multiple
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                            id="bulk-upload"
                        />
                        <label htmlFor="bulk-upload" className="cursor-pointer">
                            <span className="text-primary font-bold hover:underline">{t('files.dropzone.label')}</span>
                        </label>
                        <p className="text-xs text-muted-foreground mt-2 font-medium">{t('files.dropzone.formats')}</p>
                    </div>

                    {fileQueue.length > 0 && (
                        <div className="bg-card rounded-lg border shadow-sm divide-y">
                            <div className="p-4 flex items-center justify-between bg-muted/30">
                                <h3 className="font-bold text-sm">{t('files.queue.title', { count: fileQueue.length })}</h3>
                                <button
                                    onClick={processAll}
                                    disabled={isProcessingAll || fileQueue.every(f => f.status === 'success')}
                                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-bold flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isProcessingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    {t('files.queue.process_all')}
                                </button>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {fileQueue.map((item) => (
                                    <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-muted/10 transition-colors">
                                        <div className="p-2 bg-muted rounded-md tracking-tighter shrink-0">
                                            <FileSpreadsheet className={cn("w-5 h-5", item.status === 'success' ? "text-green-500" : "text-muted-foreground")} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate">{item.file.name}</span>
                                                {item.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                                {item.status === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <select
                                                    value={item.type}
                                                    onChange={(e) => updateFileType(item.id, e.target.value as TransactionType)}
                                                    className={cn(
                                                        "text-[10px] px-2 py-0.5 rounded border bg-background font-bold outline-none",
                                                        item.type === 'unknown' ? "border-red-300 text-red-600" : "border-input text-primary"
                                                    )}
                                                    disabled={item.status === 'processing' || item.status === 'success'}
                                                >
                                                    <option value="unknown">{t('files.queue.unknown_type')}</option>
                                                    {TRANSACTION_TYPES.map(t => (
                                                        <option key={t.value} value={t.value}>{t.value}</option>
                                                    ))}
                                                </select>
                                                {item.message && <span className="text-[10px] text-muted-foreground truncate italic">{item.message}</span>}
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            {item.status === 'pending' || item.status === 'error' ? (
                                                <button onClick={() => removeFile(item.id)} className="p-1 hover:bg-red-50 text-red-400 rounded transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            ) : null}
                                            {item.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Database State Sidebar */}
                <div className="space-y-4">
                    <div className="bg-card rounded-lg border shadow-sm p-5">
                        <h3 className="text-sm font-bold mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-primary" />
                                {t('files.db.title')}
                            </span>
                            {uploads.length > 0 && (
                                <button
                                    onClick={() => setShowConfirmClear(true)}
                                    className="text-[10px] text-red-500 hover:text-red-600 hover:underline font-bold transition-colors"
                                >
                                    {t('files.db.clear_all')}
                                </button>
                            )}
                        </h3>
                        <div className="space-y-3">
                            {TRANSACTION_TYPES.map(type => {
                                const upload = uploads.find(u => u.transaction_type === type.value);
                                return (
                                    <div key={type.value} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                upload ? "bg-green-500" : "bg-muted"
                                            )} />
                                            <span className="text-xs font-medium">{type.value}</span>
                                        </div>
                                        {upload ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-muted-foreground">{t('files.db.records', { count: (upload as any).record_count ?? 0 })}</span>
                                                <button
                                                    onClick={() => handleDeleteUpload(upload.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground">{t('files.db.missing')}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-5 bg-primary/5 rounded-lg border border-primary/10">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">{t('files.db.note_title')}</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t('files.db.note_desc').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </div>
                </div>
            </div>

            {/* Premium Confirmation Modal */}
            {showConfirmClear && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowConfirmClear(false)}
                    />
                    <div className="relative bg-card border shadow-2xl rounded-2xl w-full max-w-md p-6 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="absolute top-0 right-0 p-4">
                            <button
                                onClick={() => setShowConfirmClear(false)}
                                className="p-1 hover:bg-muted rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-10 h-10 text-red-600" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-bold tracking-tight">{t('files.modal.title')}</h3>
                                <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('files.modal.desc') }} />
                            </div>

                            <div className="flex items-center gap-3 w-full pt-4">
                                <button
                                    onClick={() => setShowConfirmClear(false)}
                                    className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground font-bold rounded-xl transition-all"
                                >
                                    {t('files.modal.cancel')}
                                </button>
                                <button
                                    onClick={handleClearAll}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all hover:-translate-y-0.5"
                                >
                                    {t('files.modal.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

