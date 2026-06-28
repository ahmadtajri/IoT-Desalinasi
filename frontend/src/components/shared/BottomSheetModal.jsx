// BottomSheetModal - Shared responsive modal component
// Mobile: slides up from bottom (bottom sheet)
// Desktop: appears centered (standard modal)
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';

export default function BottomSheetModal({
    isOpen,
    onClose,
    title,
    children,
    headerColor = 'bg-blue-500',
}) {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Small delay to allow DOM mount before triggering transition
            const t = requestAnimationFrame(() => setAnimated(true));
            return () => cancelAnimationFrame(t);
        } else {
            setAnimated(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setAnimated(false);
        setTimeout(onClose, 320);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${animated ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            />

            {/* ── Mobile: Bottom Sheet ── */}
            <div
                className={`
                    fixed bottom-0 left-0 right-0 z-[51]
                    md:hidden
                    bg-white rounded-t-2xl shadow-2xl
                    flex flex-col max-h-[90vh]
                    transition-transform duration-300 ease-out
                    ${animated ? 'translate-y-0' : 'translate-y-full'}
                `}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-3 flex-shrink-0 ${headerColor}`}>
                    <h2 className="text-base font-bold text-white truncate">{title}</h2>
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 ml-2"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto flex-1">
                    {children}
                </div>
            </div>

            {/* ── Desktop: Center Modal ── */}
            <div
                className={`
                    fixed inset-0 z-[51]
                    hidden md:flex
                    items-center justify-center p-4
                    transition-opacity duration-300
                    ${animated ? 'opacity-100' : 'opacity-0'}
                `}
                onClick={handleClose}
            >
                <div
                    className={`
                        relative bg-white rounded-2xl shadow-2xl
                        w-full max-w-2xl max-h-[90vh]
                        overflow-hidden flex flex-col
                        transition-transform duration-300
                        ${animated ? 'scale-100' : 'scale-95'}
                    `}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between p-5 flex-shrink-0 ${headerColor}`}>
                        <h2 className="text-lg font-bold text-white">{title}</h2>
                        <button
                            onClick={handleClose}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}

BottomSheetModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    headerColor: PropTypes.string,
};
