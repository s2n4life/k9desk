'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../UI/Modal';
import { Share, PlusSquare, Download, Smartphone, CheckCircle2, BellRing, Map, Zap } from 'lucide-react';
import { isIOS, permanentlyDismissPrompt } from '@/lib/pwa-utils';

interface InstallPwaPromptProps {
    isOpen: boolean;
    onClose: () => void;
}

export const InstallPwaPrompt: React.FC<InstallPwaPromptProps> = ({ isOpen, onClose }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
        onClose();
    };

    const renderInstructions = () => {
        if (isIOS()) {
            return (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-6 relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Installation Guide</h4>
                    <ol className="space-y-4 pl-5 list-decimal text-sm font-medium text-slate-700 marker:text-slate-400 marker:font-bold">
                        <li className="pl-2">
                            Tap the <span className="font-bold inline-flex items-center gap-1 text-slate-900 border border-slate-200 px-1 rounded shadow-sm bg-white">Share <Share size={14} className="text-blue-500" /></span> icon <br/><span className="text-xs text-slate-500 font-normal leading-tight block mt-0.5">At the bottom of Safari</span>
                        </li>
                        <li className="pl-2">
                            Scroll down and select <br/><span className="font-bold text-slate-900 inline-flex items-center gap-1 mt-1 border border-slate-200 px-1 rounded shadow-sm bg-white">"Add to Home Screen" <PlusSquare size={14} className="text-slate-500"/></span>
                        </li>
                        <li className="pl-2">
                            Tap <span className="font-bold text-blue-600 bg-blue-50 px-1 rounded">"Add"</span> in the top right corner.
                        </li>
                    </ol>
                </div>
            );
        }

        if (deferredPrompt) {
            return (
                <div className="mt-8">
                    <button
                        onClick={handleInstallClick}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 text-lg border-2 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                    >
                        <Download size={22} className="animate-bounce" />
                        Install App Now
                    </button>
                </div>
            );
        }

        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-6 relative overflow-hidden shadow-inner">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">How to install</h4>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    Open your browser's menu and select <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">"Add to Home Screen"</span> or <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">"Install App"</span> to finish.
                </p>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            footer={
                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm active:scale-95 duration-100"
                    >
                        Maybe Later
                    </button>
                    <button
                        onClick={() => {
                            permanentlyDismissPrompt();
                            onClose();
                        }}
                        className="w-full bg-transparent border-none text-slate-400 text-xs cursor-pointer flex items-center justify-center gap-1.5 hover:text-slate-600 transition-colors py-2"
                    >
                        <CheckCircle2 size={14} /> I've already added it (Don't show again)
                    </button>
                </div>
            }
        >
            <div className="py-2">
                {/* Hero Icon */}
                <div className="flex justify-center mb-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-4 rounded-2xl shadow-xl shadow-indigo-200 ring-4 ring-indigo-50 relative">
                        <Smartphone size={40} className="text-white" strokeWidth={1.5} />
                        <div className="absolute -top-2 -right-2 bg-pink-500 rounded-full p-1 border-2 border-white animate-pulse">
                            <BellRing size={12} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* The Strong WHY */}
                <div className="text-center mb-2 px-2">
                    <h3 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Level Up K9Desk</h3>
                    <p className="text-slate-600 font-medium text-[15px] leading-snug">
                        Install the app to your Home Screen to unlock native features:
                    </p>
                </div>

                {/* Feature Pills */}
                <div className="flex flex-wrap justify-center gap-2 px-4 mt-5">
                    <div className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <BellRing size={14} /> Push Alerts
                    </div>
                    <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <Map size={14} /> Live GPS
                    </div>
                    <div className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <Zap size={14} /> Fullscreen
                    </div>
                </div>

                {renderInstructions()}
            </div>
        </Modal>
    );
};
