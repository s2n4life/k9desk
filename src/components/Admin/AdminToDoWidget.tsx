'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Square, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface Task {
    id: string;
    headline: string;
    notes: string | null;
    priority: 'hot' | 'warm' | 'cold';
    due_date: string | null;
    completed: boolean;
    created_at: string;
    updated_at: string;
}

interface AdminToDoWidgetProps {
    onOpenModal: () => void;
}

export default function AdminToDoWidget({ onOpenModal }: AdminToDoWidgetProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await fetch('/api/admin/tasks');
            const data = await response.json();
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('[AdminToDoWidget] Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleComplete = async (taskId: string, currentStatus: boolean) => {
        // Optimistic update
        setTasks(prev => prev.filter(t => t.id !== taskId));

        try {
            await fetch(`/api/admin/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !currentStatus }),
            });
        } catch (error) {
            console.error('[AdminToDoWidget] Error updating task:', error);
            // Refetch on error
            fetchTasks();
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'hot':
                return '#ef4444';
            case 'warm':
                return '#f59e0b';
            case 'cold':
                return '#3b82f6';
            default:
                return '#64748b';
        }
    };

    const getPriorityLabel = (priority: string) => {
        return priority.charAt(0).toUpperCase() + priority.slice(1);
    };

    return (
        <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>ToDo List</h3>
                <button
                    onClick={onOpenModal}
                    style={{
                        color: '#6c5ce7',
                        fontSize: '0.875rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    View All
                    <ChevronRight size={16} />
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loading ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>Loading tasks...</p>
                ) : tasks.length === 0 ? (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>No active tasks</p>
                ) : (
                    tasks.slice(0, 5).map((task) => (
                        <div
                            key={task.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                borderRadius: '8px',
                                backgroundColor: '#0f172a',
                                border: '1px solid #334155',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onClick={() => onOpenModal()}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#6c5ce7';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#334155';
                            }}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleComplete(task.id, task.completed);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    color: '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                {task.completed ? <CheckSquare size={20} color="#10b981" /> : <Square size={20} />}
                            </button>

                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: '0 0 4px 0' }}>
                                    {task.headline}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem' }}>
                                    <span
                                        style={{
                                            color: getPriorityColor(task.priority),
                                            fontWeight: 600,
                                        }}
                                    >
                                        {getPriorityLabel(task.priority)}
                                    </span>
                                    {task.due_date && (
                                        <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={12} />
                                            {format(new Date(task.due_date), 'MMM d, yyyy')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
