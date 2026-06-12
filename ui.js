/* ui.js — All DOM rendering functions */
const UI = (() => {

  function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`;
  }

  function fmtDur(mins) {
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function fmtDate(ds) {
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function setEl(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function showEl(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function hideEl(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  function renderTodayPage() {
    const today = State.todayStr();
    const d = new Date();
    document.getElementById('today-weekday').textContent = d.toLocaleDateString('en-US', { weekday: 'long' });
    document.getElementById('today-full-date').textContent = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Check-in status badge
    const checkin = State.getCheckin(today);
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    if (checkin === 'busy') {
      statusDot.className = 'status-dot red';
      statusText.textContent = 'Busy day';
      showEl('busy-badge');
    } else if (checkin === 'moderate') {
      statusDot.className = 'status-dot yellow';
      statusText.textContent = 'Moderate day';
      showEl('busy-badge');
    } else {
      statusDot.className = 'status-dot green';
      statusText.textContent = 'Full schedule';
      hideEl('busy-badge');
    }

    // Progress
    const log = State.getLog(today) || { completions: {} };
    const schedule = State.getScheduleForDay(today);
    const total = schedule.length;
    const done = total ? schedule.filter(t => log.completions && log.completions[t.id]).length : 0;
    const pct = total ? Math.round(done / total * 100) : 0;

    document.getElementById('today-fraction').textContent = `${done} / ${total} tasks`;
    document.getElementById('today-progress-pct') && (document.getElementById('today-progress-pct').textContent = pct + '%');
    document.getElementById('circle-pct').textContent = pct + '%';
    const offset = 157 - (157 * pct / 100);
    document.getElementById('circle-arc').setAttribute('stroke-dashoffset', offset.toFixed(1));
    document.getElementById('circle-arc').setAttribute('stroke', pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#7c6cfc');

    const bar = document.getElementById('today-bar');
    bar.style.width = pct + '%';
    bar.className = 'progress-fill' + (pct >= 80 ? ' good' : pct >= 50 ? ' warn' : '');

    // Countdown
    const { startDate, endDate } = State.data;
    if (endDate) {
      const end = new Date(endDate + 'T00:00:00');
      const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
      document.getElementById('days-left').textContent = Math.max(0, diff);
      const start = startDate ? new Date(startDate + 'T00:00:00') : new Date();
      const totalDays = (end - start) / (1000 * 60 * 60 * 24);
      const elapsed = (new Date() - start) / (1000 * 60 * 60 * 24);
      const timePct = Math.min(100, Math.max(0, Math.round(elapsed / totalDays * 100)));
      document.getElementById('time-fill').style.width = timePct + '%';
      document.getElementById('time-pct-label').textContent = timePct + '% elapsed';
    }

    // Timeline
    const tl = document.getElementById('today-timeline');
    const empty = document.getElementById('today-empty');
    if (!schedule.length) {
      tl.innerHTML = '';
      showEl('today-empty');
    } else {
      hideEl('today-empty');
      tl.innerHTML = schedule.map(t => {
        const isDone = !!(log.completions && log.completions[t.id]);
        return `
        <div class="timeline-item" onclick="App.toggleTask('${t.id}')">
          <div class="tl-check ${isDone ? 'done' : ''}"></div>
          <div class="priority-dot ${t.priority || 'medium'}"></div>
          <div class="tl-body">
            <div class="tl-name ${isDone ? 'done' : ''}">${t.name}</div>
            <div class="tl-meta">${fmtTime(t.time)} · ${fmtDur(t.duration)}</div>
          </div>
          <span class="tl-badge ${t.category || 'work'}">${catLabel(t.category)}</span>
        </div>`;
      }).join('');
    }

    // Milestones
    const { milestones } = State.data;
    const mStrip = document.getElementById('milestone-strip');
    if (!milestones.length) {
      mStrip.innerHTML = '<div style="font-size:13px;color:var(--text3)">No milestones set yet.</div>';
    } else {
      mStrip.innerHTML = milestones.map(m => `
        <div class="mile-item">
          <div class="mile-check ${m.done ? 'done' : ''}" onclick="App.toggleMile('${m.id}')"></div>
          <span class="mile-week">Week ${m.week}</span>
          <span class="mile-text ${m.done ? 'done' : ''}">${m.text}</span>
        </div>`).join('');
    }

    // Streak
    document.getElementById('sidebar-streak').textContent = State.getStreak();
  }

  function catLabel(cat) {
    const map = { work: '💼', health: '💪', learning: '📚', admin: '📋', personal: '🌟' };
    return map[cat] || '💼';
  }

  function renderGoalsPage() {
    const { goal, startDate, endDate, tasks, milestones } = State.data;
    document.getElementById('main-goal').value = goal || '';
    document.getElementById('start-date').value = startDate || State.todayStr();
    if (!document.getElementById('end-date').value) {
      document.getElementById('end-date').value = endDate || '';
    }

    // Task list
    const taskEl = document.getElementById('schedule-list');
    if (!tasks.length) {
      taskEl.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">No tasks added yet. Click + Add task to begin.</div>';
    } else {
      taskEl.innerHTML = tasks.map(t => `
        <div class="task-item">
          <span class="task-time">${fmtTime(t.time)}</span>
          <span class="tl-badge ${t.category || 'work'}" style="margin-right:4px">${catLabel(t.category)}</span>
          <span class="task-name">${t.name}</span>
          <span class="task-dur">${fmtDur(t.duration)}</span>
          <span class="p-chip ${t.priority || 'medium'}" style="font-size:11px;padding:2px 7px">${t.priority || 'medium'}</span>
          <button class="task-del" onclick="App.removeTask('${t.id}')" title="Remove">🗑</button>
        </div>`).join('');
    }

    // Milestones
    const mileEl = document.getElementById('milestones-list');
    if (!milestones.length) {
      mileEl.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">No milestones yet. Add weekly targets.</div>';
    } else {
      mileEl.innerHTML = milestones.map(m => `
        <div class="task-item">
          <span class="task-time" style="color:var(--accent2)">Wk ${m.week}</span>
          <span class="task-name ${m.done ? 'done' : ''}" style="${m.done ? 'text-decoration:line-through;color:var(--text3)' : ''}">${m.text}</span>
          <div class="mile-check ${m.done ? 'done' : ''}" style="margin:0 4px" onclick="App.toggleMile('${m.id}')"></div>
          <button class="task-del" onclick="App.removeMile('${m.id}')">🗑</button>
        </div>`).join('');
    }
  }

  function renderLogPage() {
    const today = State.todayStr();
    const dateInput = document.getElementById('log-date');
    if (!dateInput.value) dateInput.value = today;

    const tasks = State.data.tasks;
    const existing = State.getLog(dateInput.value) || { completions: {} };

    const checksEl = document.getElementById('log-task-checks');
    if (!tasks.length) {
      checksEl.innerHTML = '<div style="font-size:13px;color:var(--text3)">No tasks set yet.</div>';
    } else {
      checksEl.innerHTML = tasks.map(t => `
        <label class="log-check-item">
          <input type="checkbox" id="lc-${t.id}" ${existing.completions[t.id] ? 'checked' : ''}>
          <span>${t.name}</span>
          <span class="log-time">${fmtTime(t.time)}</span>
        </label>`).join('');
    }

    if (existing.notes) document.getElementById('log-notes').value = existing.notes;

    // History
    const logs = State.getAllLogs().slice(0, 10);
    const histEl = document.getElementById('log-history');
    if (!logs.length) {
      histEl.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">No logs yet.</div>';
    } else {
      const total = tasks.length;
      histEl.innerHTML = logs.map(l => {
        const done = total ? Math.round(Object.values(l.completions || {}).filter(Boolean).length / total * 100) : 0;
        const cls = done >= 80 ? 'done' : done >= 50 ? 'partial' : 'low';
        const label = done >= 80 ? 'Great' : done >= 50 ? 'Partial' : 'Low';
        return `
        <div class="log-entry">
          <div class="log-entry-date">${fmtDate(l.date)}<br>${l.date}</div>
          <div class="log-entry-info">
            <div class="log-entry-note">${l.notes || 'No notes'}</div>
            <div class="log-entry-tags">
              <span class="tag ${cls}">${done}% ${label}</span>
              <span class="tag" style="background:var(--bg3);color:var(--text3)">⭐ ${l.rating || 3}</span>
            </div>
          </div>
        </div>`;
      }).join('');
    }
  }

  function renderReportPage(weekOffset = 0) {
    const weekDays = State.getWeekLogs(weekOffset);
    const tasks = State.data.tasks;
    const total = tasks.length;

    // Week label
    const first = weekDays[0].date;
    const last = weekDays[6].date;
    document.getElementById('week-label').textContent =
      weekOffset === 0 ? 'This week' :
      weekOffset === -1 ? 'Last week' :
      `${fmtDate(first)} – ${fmtDate(last)}`;

    // Metrics
    const logsWithData = weekDays.filter(d => d.log);
    const avgCompletion = logsWithData.length
      ? Math.round(logsWithData.reduce((s, d) => {
          const done = total ? Object.values(d.log.completions || {}).filter(Boolean).length : 0;
          return s + (total ? done / total * 100 : 0);
        }, 0) / logsWithData.length)
      : 0;
    const avgRating = logsWithData.length
      ? (logsWithData.reduce((s, d) => s + (d.log.rating || 3), 0) / logsWithData.length).toFixed(1)
      : '—';
    const daysLogged = logsWithData.length;
    const mileDone = State.data.milestones.filter(m => m.done).length;

    const mClass = avgCompletion >= 80 ? 'good' : avgCompletion >= 50 ? 'warn' : 'bad';
    document.getElementById('report-metrics').innerHTML = `
      <div class="metric-card"><div class="metric-label">Avg completion</div><div class="metric-value ${mClass}">${avgCompletion}%</div><div class="metric-sub">this week</div></div>
      <div class="metric-card"><div class="metric-label">Avg rating</div><div class="metric-value accent">${avgRating}⭐</div><div class="metric-sub">daily mood</div></div>
      <div class="metric-card"><div class="metric-label">Days logged</div><div class="metric-value">${daysLogged}<span style="font-size:1rem;color:var(--text3)">/7</span></div><div class="metric-sub">this week</div></div>
      <div class="metric-card"><div class="metric-label">Milestones</div><div class="metric-value good">${mileDone}<span style="font-size:1rem;color:var(--text3)">/${State.data.milestones.length}</span></div><div class="metric-sub">completed</div></div>`;

    // Bar chart
    const maxPct = Math.max(1, ...weekDays.map(d => {
      if (!d.log || !total) return 0;
      return Math.round(Object.values(d.log.completions || {}).filter(Boolean).length / total * 100);
    }));
    document.getElementById('week-bar-chart').innerHTML = weekDays.map(d => {
      const pct = d.log && total ? Math.round(Object.values(d.log.completions || {}).filter(Boolean).length / total * 100) : 0;
      const h = Math.round(pct / 100 * 90);
      const c = pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : pct > 0 ? '#ef4444' : 'rgba(255,255,255,0.08)';
      return `<div class="bc-col">
        <div class="bc-val">${pct > 0 ? pct + '%' : ''}</div>
        <div class="bc-bar-wrap"><div class="bc-bar" style="height:${h}px;background:${c}"></div></div>
        <div class="bc-label">${d.day}</div>
      </div>`;
    }).join('');

    // Mood chart
    document.getElementById('mood-chart').innerHTML = weekDays.map(d => {
      const r = d.log ? (d.log.rating || 3) : null;
      const emojis = ['', '😞', '😕', '😐', '😊', '🤩'];
      const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#7c6cfc'];
      return `<div class="mood-col">
        <div class="mood-dot" style="background:${r ? colors[r] + '22' : 'var(--bg3)'};font-size:${r ? '16px' : '12px'}">${r ? emojis[r] : '·'}</div>
        <div class="mood-date">${d.day}</div>
      </div>`;
    }).join('');

    // Progress vs plan
    const { startDate, endDate, milestones } = State.data;
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      const totalDays = (end - start) / (1000 * 60 * 60 * 24);
      const elapsed = Math.max(0, (new Date() - start) / (1000 * 60 * 60 * 24));
      const timePct = Math.min(100, Math.round(elapsed / totalDays * 100));
      const mPct = milestones.length ? Math.round(mileDone / milestones.length * 100) : 0;
      const taskPct = avgCompletion;
      const diff = mPct - timePct;
      const statusCls = diff > 5 ? 'good' : diff > -10 ? 'warn' : 'bad';
      const statusMsg = diff > 5
        ? `✅ You are ahead of schedule by ${Math.abs(diff)}% — keep it up!`
        : diff > -10
        ? `⚠️ You are roughly on track. Stay consistent this week.`
        : `🔴 You are behind by ${Math.abs(diff)}%. Use the AI Coach to build a recovery plan.`;

      document.getElementById('progress-vs-plan').innerHTML = `
        <div class="progress-comparison">
          <div class="pc-row">
            <div class="pc-label"><span>Time elapsed</span><span>${timePct}%</span></div>
            <div class="pc-bar"><div class="pc-fill time" style="width:${timePct}%"></div></div>
          </div>
          <div class="pc-row">
            <div class="pc-label"><span>Milestones completed</span><span>${mPct}%</span></div>
            <div class="pc-bar"><div class="pc-fill mile" style="width:${mPct}%"></div></div>
          </div>
          <div class="pc-row">
            <div class="pc-label"><span>Avg daily task completion</span><span>${taskPct}%</span></div>
            <div class="pc-bar"><div class="pc-fill tasks" style="width:${taskPct}%"></div></div>
          </div>
          <div class="pc-status ${statusCls}">${statusMsg}</div>
        </div>`;
    } else {
      document.getElementById('progress-vs-plan').innerHTML = '<div style="font-size:13px;color:var(--text3)">Set your goal dates to see progress comparison.</div>';
    }

    // Task breakdown
    const allLogs = State.getAllLogs();
    if (tasks.length && allLogs.length) {
      const taskStats = tasks.map(t => {
        const doneCount = allLogs.filter(l => l.completions && l.completions[t.id]).length;
        const pct = Math.round(doneCount / allLogs.length * 100);
        return { name: t.name, pct, cat: t.category || 'work' };
      }).sort((a,b) => b.pct - a.pct);

      document.getElementById('task-breakdown').innerHTML = taskStats.map(t => `
        <div class="tb-row">
          <div class="tb-name">${t.name}</div>
          <div class="tb-bar-wrap"><div class="tb-fill" style="width:${t.pct}%;background:${t.pct>=80?'#22c55e':t.pct>=50?'#eab308':'#7c6cfc'}"></div></div>
          <div class="tb-pct">${t.pct}%</div>
        </div>`).join('');
    } else {
      document.getElementById('task-breakdown').innerHTML = '<div style="font-size:13px;color:var(--text3)">Log some days to see task stats.</div>';
    }
  }

  function refreshLogChecks() {
    const dateStr = document.getElementById('log-date').value;
    const tasks = State.data.tasks;
    const existing = State.getLog(dateStr) || { completions: {} };
    tasks.forEach(t => {
      const el = document.getElementById('lc-' + t.id);
      if (el) el.checked = !!(existing.completions && existing.completions[t.id]);
    });
    const notesEl = document.getElementById('log-notes');
    if (notesEl && existing.notes) notesEl.value = existing.notes;
  }

  return {
    renderTodayPage, renderGoalsPage, renderLogPage, renderReportPage,
    refreshLogChecks, fmtTime, fmtDur,
    setEl, showEl, hideEl
  };
})();