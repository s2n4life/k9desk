'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface ToastProps {
    message: string;
    subMessage?: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, subMessage, isVisible, onClose, duration = 4000 }: ToastProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
                setTimeout(onClose, 300); // Wait for exit animation
            }, duration);
            return () => clearTimeout(timer);
        } else {
            setShow(false);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible && !show) return null;

    return (
        <div
            className={`toast-container ${show ? 'show' : ''}`}
            onClick={onClose}
        >
            <div className="toast-content">
                <div className="toast-icon">🎉</div>
                <div className="toast-text">
                    <div className="toast-title">{message}</div>
                    {subMessage && <div className="toast-subtitle">{subMessage}</div>}
                </div>
                <button className="toast-close">
                    <X size={16} />
                </button>
            </div>

            <style jsx>{`
                .toast-container {
                    position: fixed;
                    top: 16px;
                    left: 50%;
                    transform: translateX(-50%) translateY(-100px);
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 10000;
                    width: 90%;
                    max-width: 400px;
                    cursor: pointer;
                    transition: all 0.5s cubic-bezier(0.32, 0.72, 0, 1);
                    opacity: 0;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .toast-container.show {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }

                .toast-content {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    gap: 12px;
                }

                .toast-icon {
                    font-size: 20px;
                }

                .toast-text {
                    flex: 1;
                }

                .toast-title {
                    font-weight: 600;
                    font-size: 14px;
                    line-height: 1.2;
                }

                .toast-subtitle {
                    font-size: 12px;
                    opacity: 0.8;
                    margin-top: 2px;
                }

                .toast-close {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.5);
                    cursor: pointer;
                    padding: 4px;
                }
            `}</style>
        </div>
    );
}
