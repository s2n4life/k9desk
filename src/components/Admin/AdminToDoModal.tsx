'use client';

import { useState, useEffect } from 'react';
import { X, Plus, CheckSquare, Square, Calendar, Trash2, Save } from 'lucide-react';
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

interface AdminToDoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdate?: () => void;
}

export default function AdminToDoModal({ isOpen, onClose, onTaskUpdate }: AdminToDoModalProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editedTask, setEditedTask] = useState<Partial<Task>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTasks();
        }
    }, [isOpen]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/tasks');
            const data = await response.json();
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('[AdminToDoModal] Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setEditedTask(task);
        setIsCreating(false);
    };

    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedTask(null);
        setEditedTask({
            headline: '',
            notes: '',
            priority: 'warm',
            due_date: null,
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (isCreating) {
                // Create new task
                const response = await fetch('/api/admin/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editedTask),
                });
                if (response.ok) {
                    await fetchTasks();
                    setIsCreating(false);
                    setEditedTask({});
                    onTaskUpdate?.();
                }
            } else if (selectedTask) {
                // Update existing task
                const response = await fetch(`/api/admin/tasks/${selectedTask.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editedTask),
                });
                if (response.ok) {
                    await fetchTasks();
                    setSelectedTask(null);
                    onTaskUpdate?.();
                }
            }
        } catch (error) {
            console.error('[AdminToDoModal] Error saving task:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async (taskId: string) => {
        try {
            await fetch(`/api/admin/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: true }),
            });
            await fetchTasks();
            setSelectedTask(null);
            onTaskUpdate?.();
        } catch (error) {
            console.error('[AdminToDoModal] Error completing task:', error);
        }
    };

    const handleDelete = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            await fetch(`/api/admin/tasks/${taskId}`, {
                method: 'DELETE',
            });
            await fetchTasks();
            setSelectedTask(null);
            onTaskUpdate?.();
        } catch (error) {
            console.error('[AdminToDoModal] Error deleting task:', error);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'hot': return '#ef4444';
            case 'warm': return '#f59e0b';
            case 'cold': return '#3b82f6';
            default: return '#64748b';
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '1000px',
                maxHeight: '85vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid #334155',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Admin ToDo List</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={handleCreateNew}
                            className="btn-admin-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={18} />
                            Add Task
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px',
                            }}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Task List */}
                    <div style={{
                        width: selectedTask || isCreating ? '40%' : '100%',
                        borderRight: selectedTask || isCreating ? '1px solid #334155' : 'none',
                        overflowY: 'auto',
                        padding: '24px',
                    }}>
                        {loading ? (
                            <p style={{ color: '#94a3b8', textAlign: 'center' }}>Loading...</p>
                        ) : tasks.length === 0 ? (
                            <p style={{ color: '#94a3b8', textAlign: 'center' }}>No tasks yet</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleTaskClick(task)}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '8px',
                                            backgroundColor: selectedTask?.id === task.id ? '#6c5ce720' : '#0f172a',
                                            border: `1px solid ${selectedTask?.id === task.id ? '#6c5ce7' : '#334155'}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleComplete(task.id);
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    color: '#94a3b8',
                                                }}
                                            >
                                                <Square size={20} />
                                            </button>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: '0 0 4px 0' }}>
                                                    {task.headline}
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem' }}>
                                                    <span style={{ color: getPriorityColor(task.priority), fontWeight: 600 }}>
                                                        {task.priority.toUpperCase()}
                                                    </span>
                                                    {task.due_date && (
                                                        <span style={{ color: '#64748b' }}>
                                                            {format(new Date(task.due_date), 'MMM d, yyyy')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Task Detail */}
                    {(selectedTask || isCreating) && (
                        <div style={{
                            width: '60%',
                            overflowY: 'auto',
                            padding: '24px',
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Headline */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px', color: '#94a3b8' }}>
                                        Headline
                                    </label>
                                    <input
                                        type="text"
                                        value={editedTask.headline || ''}
                                        onChange={(e) => setEditedTask({ ...editedTask, headline: e.target.value })}
                                        placeholder="Task headline..."
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #334155',
                                            backgroundColor: '#0f172a',
                                            color: 'white',
                                            fontSize: '0.875rem',
                                        }}
                                    />
                                </div>

                                {/* Priority */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px', color: '#94a3b8' }}>
                                        Priority
                                    </label>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {(['hot', 'warm', 'cold'] as const).map((priority) => (
                                            <button
                                                key={priority}
                                                onClick={() => setEditedTask({ ...editedTask, priority })}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: `2px solid ${editedTask.priority === priority ? getPriorityColor(priority) : '#334155'}`,
                                                    backgroundColor: editedTask.priority === priority ? `${getPriorityColor(priority)}20` : '#0f172a',
                                                    color: editedTask.priority === priority ? getPriorityColor(priority) : '#94a3b8',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {priority}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Due Date */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px', color: '#94a3b8' }}>
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editedTask.due_date || ''}
                                        onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #334155',
                                            backgroundColor: '#0f172a',
                                            color: 'white',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            colorScheme: 'dark',
                                        }}
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px', color: '#94a3b8' }}>
                                        Notes
                                    </label>
                                    <textarea
                                        value={editedTask.notes || ''}
                                        onChange={(e) => setEditedTask({ ...editedTask, notes: e.target.value })}
                                        placeholder="Add detailed notes..."
                                        rows={8}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #334155',
                                            backgroundColor: '#0f172a',
                                            color: 'white',
                                            fontSize: '0.875rem',
                                            fontFamily: 'inherit',
                                            resize: 'vertical',
                                        }}
                                    />
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || !editedTask.headline}
                                        className="btn-admin-primary"
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            opacity: saving || !editedTask.headline ? 0.5 : 1,
                                        }}
                                    >
                                        <Save size={18} />
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    {!isCreating && selectedTask && (
                                        <>
                                            <button
                                                onClick={() => handleComplete(selectedTask.id)}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #10b981',
                                                    backgroundColor: '#10b98120',
                                                    color: '#10b981',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                }}
                                            >
                                                <CheckSquare size={18} />
                                                Complete
                                            </button>
                                            <button
                                                onClick={() => handleDelete(selectedTask.id)}
                                                style={{
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #ef4444',
                                                    backgroundColor: '#ef444420',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
