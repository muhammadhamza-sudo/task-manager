import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/tasks/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(data);
      setError('');
    } catch (err) {
      setError(`Failed to load tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const body = { title: title.trim(), description: description.trim(), priority };

    try {
      let res;
      if (editingId) {
        res = await fetch(`${API_URL}/tasks/${editingId}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${API_URL}/tasks/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setEditingId(null);
      setError('');
      fetchTasks();
    } catch (err) {
      setError(`Failed to save task: ${err.message}`);
    }
  };

  const handleEdit = (task) => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'medium');
    setEditingId(task.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      const res = await fetch(`${API_URL}/tasks/${id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fetchTasks();
    } catch (err) {
      setError(`Failed to delete task: ${err.message}`);
    }
  };

  const toggleDone = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await fetch(`${API_URL}/tasks/${task.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch (err) {
      setError(`Failed to update task: ${err.message}`);
    }
  };

  const cancelEdit = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setEditingId(null);
  };

  const priorityColor = (p) => {
    if (p === 'high') return '#dc3545';
    if (p === 'low') return '#28a745';
    return '#ffc107';
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#1F4E79', marginBottom: 5 }}>Task Manager</h1>
      <p style={{ textAlign: 'center', color: '#888', marginTop: 0, fontSize: 14 }}>
        ASE Foundations — CI/CD Exercise
      </p>

      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px 15px', borderRadius: 6, marginBottom: 15 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', fontSize: 16, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }}
            required
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={{ padding: '8px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 6 }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button
            type="submit"
            style={{ padding: '8px 20px', fontSize: 14, background: '#1F4E79', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            {editingId ? 'Update Task' : 'Add Task'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              style={{ padding: '8px 16px', fontSize: 14, background: '#6c757d', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#888' }}>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888' }}>No tasks yet. Add one above!</p>
      ) : (
        <div>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 15px',
                borderBottom: '1px solid #eee', opacity: task.status === 'done' ? 0.6 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={() => toggleDone(task)}
                style={{ marginTop: 4, cursor: 'pointer', width: 18, height: 18 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontWeight: 600,
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    fontSize: 15,
                  }}>
                    {task.title}
                  </span>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: priorityColor(task.priority),
                  }} />
                </div>
                {task.description && (
                  <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>{task.description}</p>
                )}
              </div>
              <button
                onClick={() => handleEdit(task)}
                style={{ padding: '4px 10px', fontSize: 12, background: '#e9ecef', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                style={{ padding: '4px 10px', fontSize: 12, background: '#f8d7da', color: '#721c24', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          ))}
          <p style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 15 }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {tasks.filter(t => t.status === 'done').length} completed
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
