/* app.js — Main application controller */
const App = (() => {

  let currentWeekOffset = 0;
  let selectedRating = 3;

  /* ===== INIT ===== */
  function init() {
    const today = State.todayStr();

    // Splash sequence
    setTimeout(() => {
      document.getElementById('splash').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      UI.renderTodayPage();

      // Show checkin modal if not done for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0,10);
      const checkinDone = State.getCheckin(tomorrowStr);
      if (!checkinDone && new Date().getHours() >= 18) {
        showCheckinModal(tomorrowStr);
      }
    }, 1400);

    // Set up log date change listener
    const logDate = document.getElementById('log-date');
    if (logDate) {
      logDate.addEventListener('change', () => UI.refreshLogChecks());
    }

    // Rating picker default
    setRating(3);
  }

  /* ===== PAGE NAVIGATION ===== */
  function showPage(page) {
    document.querySelectorAll('.page').forEach(p => {
      p.classList.add('hidden');
      p.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById('page-' + page);
    const navEl = document.querySelector(`[data-page="${page}"]`);
    if (pageEl) { pageEl.classList.remove('hidden'); pageEl.classList.add('active'); }
    if (navEl) navEl.classList.add('active');

    if (page === 'today') UI.renderTodayPage();
    if (page === 'goals') UI.renderGoalsPage();
    if (page === 'log') UI.renderLogPage();
    if (page === 'report') UI.renderReportPage(currentWeekOffset);
  }

  /* ===== MODALS ===== */
  function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
  }

  function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  }

  function showCheckinModal(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('checkin-date-text').textContent = `How is ${label} looking?`;
    document.getElementById('checkin-modal').classList.remove('hidden');
  }

  function setCheckin(type) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const ds = tomorrow.toISOString().slice(0,10);
    State.setCheckin(ds, type);
    closeModal('checkin-modal');
    UI.renderTodayPage();
    showToast(type === 'busy' ? '🔴 Busy day noted — schedule will be reduced tomorrow' :
              type === 'moderate' ? '🟡 Moderate day noted — partial schedule set' :
              '🟢 All clear — full schedule tomorrow');
  }

  function dismissCheckin() {
    closeModal('checkin-modal');
  }

  /* ===== TASKS ===== */
  function saveTask() {
    const time = document.getElementById('modal-time').value;
    const name = document.getElementById('modal-task').value.trim();
    const duration = parseInt(document.getElementById('modal-dur').value);
    const category = document.getElementById('modal-cat').value;
    const priority = document.querySelector('input[name="modal-priority"]:checked')?.value || 'medium';

    if (!time || !name) { showToast('Please enter a time and task name', 'warn'); return; }

    State.addTask({ time, name, duration, category, priority });
    closeModal('task-modal');
    document.getElementById('modal-time').value = '';
    document.getElementById('modal-task').value = '';
    UI.renderGoalsPage();
    showToast('Task added ✓');
  }

  function removeTask(id) {
    State.removeTask(id);
    UI.renderGoalsPage();
  }

  function toggleTask(taskId) {
    const today = State.todayStr();
    const log = State.getLog(today) || { completions: {} };
    const current = !!(log.completions && log.completions[taskId]);
    State.checkTask(today, taskId, !current);
    UI.renderTodayPage();
  }

  /* ===== MILESTONES ===== */
  function saveMilestone() {
    const week = parseInt(document.getElementById('mile-week').value);
    const text = document.getElementById('mile-text').value.trim();
    if (!text) { showToast('Please enter a milestone', 'warn'); return; }
    State.addMilestone({ week, text, done: false });
    closeModal('mile-modal');
    document.getElementById('mile-text').value = '';
    UI.renderGoalsPage();
    showToast('Milestone added ✓');
  }

  function toggleMile(id) {
    State.toggleMilestone(id);
    UI.renderTodayPage();
    UI.renderGoalsPage();
  }

  function removeMile(id) {
    State.removeMilestone(id);
    UI.renderGoalsPage();
  }

  /* ===== GOALS ===== */
  function saveSetup() {
    const goal = document.getElementById('main-goal').value.trim();
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    if (!goal) { showToast('Please enter your main goal', 'warn'); return; }
    if (!startDate || !endDate) { showToast('Please set start and end dates', 'warn'); return; }
    if (endDate <= startDate) { showToast('End date must be after start date', 'warn'); return; }
    State.updateGoal(goal, startDate, endDate);
    showToast('Plan saved ✓');
    setTimeout(() => showPage('today'), 700);
  }

  /* ===== LOG ===== */
  function setRating(val) {
    selectedRating = val;
    document.querySelectorAll('.rating-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.val) === val);
    });
  }

  function saveLog() {
    const dateStr = document.getElementById('log-date').value;
    const notes = document.getElementById('log-notes').value.trim();
    const tasks = State.data.tasks;
    const completions = {};
    tasks.forEach(t => {
      const el = document.getElementById('lc-' + t.id);
      if (el) completions[t.id] = el.checked;
    });
    State.saveLog(dateStr, { completions, notes, rating: selectedRating });
    showToast('Log saved ✓');
    UI.renderLogPage();
  }

  /* ===== REPORT NAVIGATION ===== */
  function changeWeek(dir) {
    currentWeekOffset += dir;
    UI.renderReportPage(currentWeekOffset);
  }

  /* ===== AI COACH ===== */
  function setAiQ(text) {
    document.getElementById('ai-input').value = text;
    document.getElementById('ai-input').focus();
  }

  async function askAI() {
    const input = document.getElementById('ai-input').value.trim();
    if (!input) { showToast('Please enter a question', 'warn'); return; }

    const btn = document.getElementById('ai-ask-btn');
    btn.disabled = true;
    btn.querySelector('.btn-inner').classList.add('hidden');
    btn.querySelector('.btn-loading').classList.remove('hidden');

    const ctx = State.buildAIContext();
    const systemPrompt = `You are a focused, practical productivity coach helping someone stay on track with a 2-month goal. 
Analyse their real progress data and give specific, actionable advice. 
Be honest, warm, and concise. Max 280 words. 
Use section headers with emojis. Give concrete steps, not vague advice.
Format as readable paragraphs, not a bullet list wall.`;

    const userMsg = `My goal context:
- Goal: ${ctx.goal}
- Daily tasks: ${ctx.tasks}
- Milestones: ${ctx.milestones}
- Days left: ${ctx.daysLeft}
- Time elapsed: ${ctx.timeElapsed} of plan period
- Milestone progress: ${ctx.milestonePct} of milestones done
- Recent 14-day log:
${ctx.recentLogs}

My question: ${input}`;

    const responseArea = document.getElementById('ai-response-area');
    responseArea.innerHTML = `<div class="ai-response-card">
      <div class="ai-response-header">🤖 AI Coach is thinking...</div>
      <div class="thinking-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
    </div>`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMsg }]
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.map(c => c.text || '').join('') || 'No response received.';

      responseArea.innerHTML = `<div class="ai-response-card">
        <div class="ai-response-header">🤖 AI Coach response</div>
        <div class="ai-response-body">${escapeHtml(text)}</div>
      </div>`;
    } catch (e) {
      responseArea.innerHTML = `<div class="ai-response-card">
        <div class="ai-response-header" style="color:var(--red)">⚠️ Error</div>
        <div class="ai-response-body" style="color:var(--text2)">Could not connect to AI. Check your internet connection and try again.\n\n${e.message}</div>
      </div>`;
    }

    btn.disabled = false;
    btn.querySelector('.btn-inner').classList.remove('hidden');
    btn.querySelector('.btn-loading').classList.add('hidden');
  }

  /* ===== HELPERS ===== */
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  let toastTimer;
  function showToast(msg, type = 'ok') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.style.cssText = `
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);
        background:#1e1e23;border:0.5px solid rgba(255,255,255,0.12);
        color:#f4f4f5;padding:10px 20px;border-radius:8px;font-size:14px;
        z-index:9999;transition:transform 0.3s ease;white-space:nowrap;
        box-shadow:0 4px 24px rgba(0,0,0,0.5);
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.borderColor = type === 'warn' ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.12)';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(80px)';
    }, 2800);
  }

  /* ===== STARTUP ===== */
  document.addEventListener('DOMContentLoaded', init);

  return {
    init, showPage,
    openModal, closeModal,
    setCheckin, dismissCheckin,
    saveTask, removeTask, toggleTask,
    saveMilestone, toggleMile, removeMile,
    saveSetup,
    setRating, saveLog,
    changeWeek,
    setAiQ, askAI
  };
})();