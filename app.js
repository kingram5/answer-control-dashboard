// Dashboard App - Real-time data from localStorage and API

// Store data
const DB = {
    tasks: JSON.parse(localStorage.getItem('dashboard_tasks') || '[]'),
    emails: JSON.parse(localStorage.getItem('dashboard_emails') || '[]'),
    oneThing: localStorage.getItem('dashboard_onething') || "Research BOX API"
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadOneThing();
    loadTasks();
    loadEmailFeedback();
    startPolling();
});

// Today's One Thing
function loadOneThing() {
    const oneThingText = localStorage.getItem('kyle_today_onething') || DB.oneThing;
    document.getElementById('one-thing-text').textContent = oneThingText;
}

function editOneThing() {
    const current = document.getElementById('one-thing-text').textContent;
    const updated = prompt('Today\'s One Thing:', current);
    if (updated) {
        document.getElementById('one-thing-text').textContent = updated;
        localStorage.setItem('kyle_today_onething', updated);
        // Send to backend
        sendToAPI('one_thing', updated);
    }
}

// Tasks
function loadTasks() {
    const tasks = DB.tasks.length ? DB.tasks : getDefaultTasks();
    renderTasks(tasks);
}

function getDefaultTasks() {
    return [
        { id: 1, title: "Research BOX API", priority: "high", source: "Personal", done: false },
        { id: 2, title: "Confirm NXT Lvl meeting", priority: "urgent", source: "Gmail", done: false },
        { id: 3, title: "Schedule structural engineer", priority: "medium", source: "Personal", done: false }
    ];
}

function renderTasks(tasks) {
    const container = document.getElementById('task-list');
    container.innerHTML = tasks.map(task => `
        <div class="task-item priority-${task.priority}" data-id="${task.id}">
            <input type="checkbox" class="task-checkbox" ${task.done ? 'checked' : ''} 
                   onchange="toggleTask(${task.id})">
            <div class="task-content">
                <div class="task-title ${task.done ? 'done' : ''}">${task.title}</div>
                <div class="task-meta">
                    <span class="task-source">${task.source}</span>
                    • ${task.priority}
                </div>
            </div>
            <button class="task-delete" onclick="deleteTask(${task.id})">🗑️</button>
        </div>
    `).join('');
}

function toggleTask(id) {
    const task = DB.tasks.find(t => t.id === id);
    if (task) {
        task.done = !task.done;
        localStorage.setItem('dashboard_tasks', JSON.stringify(DB.tasks));
        renderTasks(DB.tasks);
        sendToAPI('task_complete', { id, done: task.done });
    }
}

function deleteTask(id) {
    DB.tasks = DB.tasks.filter(t => t.id !== id);
    localStorage.setItem('dashboard_tasks', JSON.stringify(DB.tasks));
    renderTasks(DB.tasks);
}

function filterTasks(filter) {
    document.querySelectorAll('.priority-tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    let filtered = DB.tasks;
    if (filter !== 'all') {
        filtered = DB.tasks.filter(t => t.priority === filter || (filter === 'personal' && t.source === 'Personal'));
    }
    renderTasks(filtered);
}

// Email Feedback
function loadEmailFeedback() {
    const saved = localStorage.getItem('kyleEmailFeedback');
    if (saved) {
        const data = JSON.parse(saved);
        renderEmailFeedback(data.emails || []);
        updateEmailStats(data.stats || { for_kyle: 0, maybe: 0, skipped: 31 });
    } else {
        // Sample data
        renderEmailFeedback([
            { id: '1', subject: 'FW: Simplicity Solar Statement', time: '11:02', confidence: 0, action: 'skipped', reviewed: false },
            { id: '2', subject: 'FW: Credit Updates 2026', time: '11:02', confidence: 0, action: 'skipped', reviewed: false }
        ]);
    }
}

function renderEmailFeedback(emails) {
    const container = document.getElementById('email-feedback-list');
    const pending = emails.filter(e => !e.reviewed);
    
    if (pending.length === 0) {
        container.innerHTML = '<div class="no-items">✅ All caught up! No pending reviews.</div>';
        return;
    }
    
    container.innerHTML = pending.slice(0, 10).map(email => `
        <div class="email-item" id="email-${email.id}" style="margin-bottom: 10px; padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #6c757d;">
            <div style="font-weight: 500; margin-bottom: 4px;">${email.subject}</div>
            <div style="font-size: 0.75rem; color: #666; margin-bottom: 8px;">${email.time} • Confidence: ${email.confidence}%</div>
            <div style="display: flex; gap: 8px;">
                <button style="flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 6px;" 
                        onclick="markEmailCorrect('${email.id}')">✅ Correct</button>
                <button style="flex: 1; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 6px;"
                        onclick="markEmailWrong('${email.id}')">❌ Wrong</button>
            </div>
        </div>
    `).join('');
}

function markEmailCorrect(id) {
    let data = JSON.parse(localStorage.getItem('kyleEmailFeedback') || '{}');
    const email = data.emails?.find(e => e.id === id);
    if (email) {
        email.reviewed = true;
        email.userFeedback = 'correct';
        localStorage.setItem('kyleEmailFeedback', JSON.stringify(data));
        document.getElementById(`email-${id}`).style.display = 'none';
        sendToAPI('email_feedback', { id, feedback: 'correct' });
    }
}

function markEmailWrong(id) {
    let data = JSON.parse(localStorage.getItem('kyleEmailFeedback') || '{}');
    const email = data.emails?.find(e => e.id === id);
    if (email) {
        email.reviewed = true;
        email.userFeedback = 'wrong';
        localStorage.setItem('kyleEmailFeedback', JSON.stringify(data));
        document.getElementById(`email-${id}`).style.display = 'none';
        sendToAPI('email_feedback', { id, feedback: 'wrong' });
    }
}

function markAllCorrect() {
    let data = JSON.parse(localStorage.getItem('kyleEmailFeedback') || '{}');
    if (data.emails) {
        data.emails.forEach(e => {
            if (!e.reviewed) {
                e.reviewed = true;
                e.userFeedback = 'correct';
            }
        });
        localStorage.setItem('kyleEmailFeedback', JSON.stringify(data));
        loadEmailFeedback();
        sendToAPI('email_feedback_all', { feedback: 'all_correct' });
    }
}

function refreshEmailData() {
    fetchFromAPI('email_latest').then(data => {
        localStorage.setItem('kyleEmailFeedback', JSON.stringify(data));
        loadEmailFeedback();
    });
}

function updateEmailStats(stats) {
    document.getElementById('email-action').textContent = stats.for_kyle || 0;
    document.getElementById('email-maybe').textContent = stats.maybe || 0;
    document.getElementById('email-skip').textContent = stats.skipped || 0;
    document.getElementById('stat-emails').textContent = (stats.for_kyle || 0) + (stats.maybe || 0) + (stats.skipped || 0);
}

// API Communication
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://api.kingram5.github.io';

function sendToAPI(endpoint, data) {
    fetch(`${API_BASE}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).catch(err => console.log('API error:', err));
}

function fetchFromAPI(endpoint) {
    return fetch(`${API_BASE}/api/${endpoint}`)
        .then(r => r.json())
        .catch(err => {
            console.log('API error:', err);
            return {};
        });
}
// Polling for updates
function startPolling() {
    setInterval(() => {
        fetchFromAPI('ping').then(data => {
            if (data.refresh_needed) {
                refreshEmailData();
            }
        });
    }, 30000); // Check every 30 seconds
}

// Expose functions globally
window.editOneThing = editOneThing;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.filterTasks = filterTasks;
window.markEmailCorrect = markEmailCorrect;
window.markEmailWrong = markEmailWrong;
window.markAllCorrect = markAllCorrect;
window.refreshEmailData = refreshEmailData;
