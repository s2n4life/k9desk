'use client';

import Link from 'next/link';
import { Settings as SettingsIcon, HelpCircle } from 'lucide-react';
import styles from './Header.module.css';
import { useState } from 'react';
import { HelpDrawer } from './HelpDrawer';

interface HeaderProps {
    title: string;
    label?: string;
    subtitle?: string;
    showHelp?: boolean;
    showSettings?: boolean;
    actionNode?: React.ReactNode;
}

export function Header({
    title,
    label,
    subtitle,
    showHelp = true,
    showSettings = true,
    actionNode
}: HeaderProps) {
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    return (
        <>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    {label && <div className={styles.label}>{label}</div>}
                    <h1 className={`text-h1 ${styles.title}`}>{title}</h1>
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>

                <div className={styles.actions}>
                    {actionNode}
                    {showHelp && (
                        <button
                            className={`${styles.iconBtn} ${styles.helpBtn}`}
                            onClick={() => setIsHelpOpen(true)}
                            title="Help & Support"
                        >
                            <HelpCircle size={20} />
                        </button>
                    )}

                    {showSettings && (
                        <Link href="/settings" className={styles.iconBtn} title="Settings">
                            <SettingsIcon size={20} />
                        </Link>
                    )}
                </div>
            </header>

            <HelpDrawer
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />
        </>
    );
}
