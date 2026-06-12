/* state.js — All data logic and localStorage persistence */
const State = (() => {

  const KEY = 'smart_sched_v2';

  function defaultState() {
    const today = todayStr();
    const end = new Date();
    end.setDate(end.getDate() + 60);
    return {
      goal: '',
      startDate: today,
      endDate: end.toISOString().slice(0,10),
      milestones: [],
      tasks: [],
      logs: {},
      checkins: {},
      currentRating: 3
    };
  }

  function todayStr() {
    return new Date().toISOString().slice(0,10);
  }

  let data = (() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) return { ...defaultState(), ...JSON.parse(saved) };
    } catch(e) {}
    return defaultState();
  })();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {}
  }

  function getToday() { return data.logs[todayStr()] || null; }

  function getLog(dateStr) { return data.logs[dateStr] || null; }

  function saveLog(dateStr, logObj) {
    data.logs[dateStr] = { ...data.logs[dateStr], ...logObj };
    save();
  }

  function setCheckin(dateStr, type) {
    data.checkins[dateStr] = type;
    save();
  }

  function getCheckin(dateStr) { return data.checkins[dateStr] || null; }

  function addTask(task) {
    task.id = 'task_' + Date.now();
    data.tasks.push(task);
    data.tasks.sort((a,b) => a.time.localeCompare(b.time));
    save();
    return task;
  }

  function removeTask(id) {
    data.tasks = data.tasks.filter(t => t.id !== id);
    save();
  }

  function addMilestone(mile) {
    mile.id = 'mile_' + Date.now();
    data.milestones.push(mile);
    data.milestones.sort((a,b) => a.week - b.week);
    save();
    return mile;
  }

  function removeMilestone(id) {
    data.milestones = data.milestones.filter(m => m.id !== id);
    save();
  }

  function toggleMilestone(id) {
    const m = data.milestones.find(m => m.id === id);
    if (m) { m.done = !m.done; save(); }
  }

  function updateGoal(goal, startDate, endDate) {
    data.goal = goal;
    data.startDate = startDate;
    data.endDate = endDate;
    save();
  }

  function checkTask(dateStr, taskId, checked) {
    if (!data.logs[dateStr]) data.logs[dateStr] = { completions: {}, notes: '', rating: 3 };
    if (!data.logs[dateStr].completions) data.logs[dateStr].completions = {};
    data.logs[dateStr].completions[taskId] = checked;
    save();
  }

  function getCompletionRate(dateStr) {
    const log = data.logs[dateStr];
    if (!log || !data.tasks.length) return 0;
    const done = Object.values(log.completions || {}).filter(Boolean).length;
    return Math.round(done / data.tasks.length * 100);
  }

  function getWeekLogs(weekOffset = 0) {
    const now = new Date();
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1) + weekOffset * 7);
    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const ds = d.toISOString().slice(0,10);
      result.push({ date: ds, day: d.toLocaleDateString('en-US', { weekday: 'short' }), log: data.logs[ds] || null });
    }
    return result;
  }

  function getStreak() {
    let streak = 0;
    const d = new Date();
    d.setDate(d.getDate() - 1); // start from yesterday
    while (true) {
      const ds = d.toISOString().slice(0,10);
      const log = data.logs[ds];
      if (!log) break;
      const done = Object.values(log.completions || {}).filter(Boolean).length;
      if (data.tasks.length > 0 && done / data.tasks.length >= 0.5) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    // Also count today if already logged
    const todayLog = data.logs[todayStr()];
    if (todayLog) {
      const done = Object.values(todayLog.completions || {}).filter(Boolean).length;
      if (data.tasks.length > 0 && done / data.tasks.length >= 0.5) streak++;
    }
    return streak;
  }

  function getScheduleForDay(dateStr) {
    const checkin = data.checkins[dateStr];
    if (checkin === 'busy') return data.tasks.filter((_, i) => data.tasks[i].priority === 'high' || i % 2 === 0);
    if (checkin === 'moderate') return data.tasks.filter((_, i) => data.tasks[i].priority !== 'low' || i % 3 !== 2);
    return data.tasks;
  }

  function getAllLogs() {
    return Object.entries(data.logs).map(([date, log]) => ({ date, ...log })).sort((a,b) => b.date.localeCompare(a.date));
  }

  function buildAIContext() {
    const logs = getAllLogs().slice(0, 14);
    const total = data.tasks.length;
    const summaries = logs.map(l => {
      const done = total ? Math.round(Object.values(l.completions || {}).filter(Boolean).length / total * 100) : 0;
      return `${l.date}: ${done}% tasks done, rating ${l.rating || 3}/5${l.notes ? ', note: ' + l.notes.slice(0,80) : ''}`;
    }).join('\n');
    const mileDone = data.milestones.filter(m => m.done).length;
    const start = data.startDate ? new Date(data.startDate) : new Date();
    const end = data.endDate ? new Date(data.endDate) : new Date(start.getTime() + 60 * 86400000);
    const elapsed = Math.max(0, (new Date() - start) / (1000 * 60 * 60 * 24));
    const totalDays = (end - start) / (1000 * 60 * 60 * 24);
    const daysLeft = Math.max(0, Math.round(totalDays - elapsed));
    const timeElapsed = Math.min(100, Math.round(elapsed / totalDays * 100));
    const milePct = data.milestones.length ? Math.round(mileDone / data.milestones.length * 100) : 0;
    return {
      goal: data.goal || 'Not set',
      tasks: data.tasks.map(t => `${t.time} ${t.name} (${t.duration}min)`).join(', ') || 'None set',
      milestones: `${mileDone}/${data.milestones.length} done`,
      daysLeft,
      timeElapsed: `${timeElapsed}%`,
      milestonePct: `${milePct}%`,
      recentLogs: summaries || 'No logs yet'
    };
  }

  return {
    get data() { return data; },
    save, todayStr, getToday, getLog, saveLog,
    setCheckin, getCheckin,
    addTask, removeTask,
    addMilestone, removeMilestone, toggleMilestone,
    updateGoal, checkTask,
    getCompletionRate, getWeekLogs, getStreak,
    getScheduleForDay, getAllLogs, buildAIContext
  };
})();