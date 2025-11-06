/* Luna Tracker — Tasks with Category, Due Date, Calendar & Daily Goals */
/* Replace your current JS with this file. Uses localStorage keys "luna_tasks" and "luna_settings" */

(() => {
  // DOM elements (some may be optional depending on page)
  const taskInput = document.getElementById('taskInput');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const taskList = document.getElementById('taskList');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');
  const taskCounter = document.getElementById('taskCounter');

  const categorySelect = document.getElementById('categorySelect');
  const dueDateInput = document.getElementById('dueDateInput');

  const filterCategory = document.getElementById('filterCategory');
  const calendarDate = document.getElementById('calendarDate');
  const showAllBtn = document.getElementById('showAllBtn');

  const dailyGoalInput = document.getElementById('dailyGoalInput');
  const todayCompletedEl = document.getElementById('today-completed');
  const dailyGoalBar = document.getElementById('daily-goal-bar');

  // Storage keys
  const TASKS_KEY = 'luna_tasks';
  const SETTINGS_KEY = 'luna_settings';

  // App state
  let tasks = []; // each: {id, text, completed, category, dueDate, updatedAt}
  let settings = {
    dailyGoal: 0,
    completedTodayIds: [] // track which task IDs were marked completed today
  };

  // Utilities
  const saveTasks = () => localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  const loadTasks = () => {
    const raw = localStorage.getItem(TASKS_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  };

  const saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  const loadSettings = () => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const loadedSettings = raw ? JSON.parse(raw) : {};
    settings = { ...settings, ...loadedSettings };
  };

  const uid = () => 't' + Date.now() + Math.floor(Math.random() * 1000);

  // Date helpers
  const asISODate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toISOString().slice(0, 10); // yyyy-mm-dd
  };

  // Rendering
  function renderTasks({ categoryFilter = 'All', dateFilter = null } = {}) {
    if (!taskList) return;
    taskList.innerHTML = '';

    const filtered = tasks.filter(t => {
      if (categoryFilter && categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      if (dateFilter && dateFilter !== '' && t.dueDate !== dateFilter) return false;
      return true;
    });

    // sort - incomplete first, then by dueDate (soon first), then by updatedAt
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed - b.completed; // incomplete (false=0) first
      if (a.dueDate && b.dueDate) {
        if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
      } else if (a.dueDate) return -1;
      else if (b.dueDate) return 1;
      return a.updatedAt - b.updatedAt;
    });

    for (const t of filtered) {
      const li = document.createElement('li');
      li.dataset.id = t.id;
      li.className = t.completed ? 'completed' : '';

      // left area: checkbox + badge + text
      const left = document.createElement('div');
      left.className = 'left';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!t.completed;
      cb.setAttribute('aria-label', 'Mark complete');
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleComplete(t.id, cb.checked);
      });

      const badge = document.createElement('span');
      badge.className = 'category-badge';
      badge.textContent = t.category || 'General';

      const span = document.createElement('span');
      span.className = 'task-text';
      span.textContent = t.text;
      span.title = 'Double click to edit';
      span.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        startEdit(t.id, span);
      });

      left.appendChild(cb);
      left.appendChild(badge);
      left.appendChild(span);

      // right area: meta + due + delete
      const right = document.createElement('div');
      right.className = 'meta';

      if (t.dueDate) {
        const due = document.createElement('span');
        due.className = 'due-date';
        due.textContent = `due: ${t.dueDate}`;
        right.appendChild(due);
      }

      const del = document.createElement('i');
      del.className = 'fa-solid fa-trash delete-icon';
      del.title = 'Delete task';
      del.style.marginLeft = '10px';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Delete this task?')) return;
        deleteTask(t.id);
      });

      right.appendChild(del);

      li.appendChild(left);
      li.appendChild(right);

      // li click toggles unless the click was on checkbox, delete icon, or edit-input
      li.addEventListener('click', (e) => {
        const target = e.target;
        if (target === del || target.tagName === 'INPUT' || target.classList.contains('edit-input')) return;
        cb.checked = !cb.checked;
        toggleComplete(t.id, cb.checked);
      });

      taskList.appendChild(li);
    }

    updateTaskCounter();
    updateProgress();
    updateDailyGoalUI();
  } // end renderTasks

  // Add a task
  function addTask() {
    if (!taskInput) return;
    const text = taskInput.value.trim();
    if (!text) {
      alert('Please enter a task.');
      return;
    }
    const category = (categorySelect && categorySelect.value) || 'General';
    const dueDate = (dueDateInput && dueDateInput.value) ? asISODate(dueDateInput.value) : '';

    const newTask = {
      id: uid(),
      text,
      completed: false,
      category,
      dueDate,
      updatedAt: Date.now()
    };
    tasks.push(newTask);
    saveTasks();
    renderTasks({ categoryFilter: (filterCategory && filterCategory.value) || 'All', dateFilter: (calendarDate && calendarDate.value) || '' });
    taskInput.value = '';
    if (dueDateInput) dueDateInput.value = '';
    if (categorySelect) categorySelect.value = 'General';
  }

  // Toggle complete
  function toggleComplete(id, completed) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.completed = !!completed;
    t.updatedAt = Date.now();

    if (completed) {
      if (!settings.completedTodayIds.includes(id)) settings.completedTodayIds.push(id);
    } else {
      settings.completedTodayIds = settings.completedTodayIds.filter(x => x !== id);
    }

    saveTasks();
    saveSettings();
    renderTasks({ categoryFilter: (filterCategory && filterCategory.value) || 'All', dateFilter: (calendarDate && calendarDate.value) || '' });
  }

  // Delete task
  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    settings.completedTodayIds = settings.completedTodayIds.filter(x => x !== id);
    saveTasks();
    saveSettings();
    renderTasks({ categoryFilter: (filterCategory && filterCategory.value) || 'All', dateFilter: (calendarDate && calendarDate.value) || '' });
  }

  // Edit flow
  function startEdit(id, spanElement) {
    const t = tasks.find(x => x.id === id);
    if (!t || !spanElement) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = t.text;
    input.className = 'edit-input';
    input.style.padding = '6px';
    input.style.borderRadius = '6px';
    input.style.width = '280px';

    spanElement.replaceWith(input);
    input.focus();

    function finish() {
      if (!input.parentNode) return;
      const newText = input.value.trim() || t.text;
      t.text = newText;
      t.updatedAt = Date.now();
      saveTasks();
      renderTasks({ categoryFilter: (filterCategory && filterCategory.value) || 'All', dateFilter: (calendarDate && calendarDate.value) || '' });
    }

    function cancelEdit() {
      if (!input.parentNode) return;
      renderTasks({ categoryFilter: (filterCategory && filterCategory.value) || 'All', dateFilter: (calendarDate && calendarDate.value) || '' });
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish();
      if (e.key === 'Escape') cancelEdit();
    });

    input.addEventListener('blur', finish);
  }

  // Show counts
  function updateTaskCounter() {
    const remaining = tasks.filter(t => !t.completed).length;
    if (taskCounter) taskCounter.textContent = remaining;
  }

  // Progress (percent of completed tasks overall)
  function updateProgress() {
    const tasksAll = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;
    const percent = tasksAll ? Math.round((completedCount / tasksAll) * 100) : 0;

    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    if (progressText) progressText.innerText = `Progress: ${percent}%`;
    if (progressBar) progressBar.style.width = percent + '%';

    const msg = document.getElementById('motivation-message');
    if (msg) {
      if (percent === 0) msg.textContent = "A fresh start ✨ Let's go!";
      else if (percent < 40) msg.textContent = "Good steps. Keep going 💛";
      else if (percent < 80) msg.textContent = "You’re doing amazing 🏆";
      else if (percent < 100) msg.textContent = "Almost there! Push a little more 🚀";
      else msg.textContent = "🎉 All tasks completed! Well done 🎉";
    }
  }

  // Clear only completed tasks
  function clearCompleted() {
    const done = tasks.filter(t => t.completed);
    if (done.length === 0) {
      alert('No completed tasks to clear!');
      return;
    }

    if (!confirm(`Clear ${done.length} completed task(s)?`)) return;

    const doneIds = new Set(done.map(d => d.id));
    tasks = tasks.filter(t => !doneIds.has(t.id));

    // also remove from today's completed list
    settings.completedTodayIds = settings.completedTodayIds.filter(id => !doneIds.has(id));
    saveTasks();
    saveSettings();
    renderTasks({ categoryFilter: (filterCategory && filterCategory.value) || 'All', dateFilter: (calendarDate && calendarDate.value) || '' });
  }

  // Filter / calendar handlers (only add listeners if elements exist)
  if (filterCategory) {
    filterCategory.addEventListener('change', () => {
      renderTasks({ categoryFilter: filterCategory.value, dateFilter: (calendarDate && calendarDate.value) || '' });
    });
  }

  if (calendarDate) {
    calendarDate.addEventListener('change', () => {
      renderTasks({ categoryFilter: (filterCategory && filterCategory.value) || 'All', dateFilter: calendarDate.value });
    });
  }

  if (showAllBtn) {
    showAllBtn.addEventListener('click', () => {
      if (filterCategory) filterCategory.value = 'All';
      if (calendarDate) calendarDate.value = '';
      renderTasks({ categoryFilter: 'All', dateFilter: '' });
    });
  }

  // Daily goal UI and logic
  function updateDailyGoalUI() {
    // Count completed today by checking settings.completedTodayIds that still exist in tasks
    const todaySet = new Set(settings.completedTodayIds || []);
    const existingCompletedToday = tasks.filter(t => todaySet.has(t.id) && t.completed).length;

    const setGoal = settings.dailyGoal || 0;
    if (todayCompletedEl) todayCompletedEl.innerText = `Done today: ${existingCompletedToday}`;

    const pct = setGoal > 0 ? Math.min(100, Math.round((existingCompletedToday / setGoal) * 100)) : 0;
    if (dailyGoalBar) dailyGoalBar.style.width = pct + '%';
  }

  if (dailyGoalInput) {
    dailyGoalInput.addEventListener('change', () => {
      const v = parseInt(dailyGoalInput.value, 10);
      settings.dailyGoal = isNaN(v) ? 0 : Math.max(0, v);
      saveSettings();
      updateDailyGoalUI();
    });
  }

  // initial load
  loadTasks();
  loadSettings();

  // populate dailyGoalInput if previous set
  if (dailyGoalInput && settings.dailyGoal) dailyGoalInput.value = settings.dailyGoal;

  // Add and clear listeners
  if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);
  if (taskInput) taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

  if (clearCompletedBtn) clearCompletedBtn.addEventListener('click', clearCompleted);

  // Initial render
  renderTasks({ categoryFilter: (filterCategory && filterCategory.value) || 'All', dateFilter: (calendarDate && calendarDate.value) || '' });

  // Periodic housekeeping: if day changed, clear settings.completedTodayIds (so counts reflect new day)
  (function dailyResetCheck() {
    const LAST_DAY_KEY = 'luna_last_day';
    const last = localStorage.getItem(LAST_DAY_KEY);
    const today = new Date().toISOString().slice(0, 10);
    if (last !== today) {
      // new day — reset completedTodayIds
      settings.completedTodayIds = [];
      saveSettings();
      localStorage.setItem(LAST_DAY_KEY, today);
      updateDailyGoalUI();
    }
    // check again after an hour
    setTimeout(dailyResetCheck, 1000 * 60 * 60);
  })();
  // Mobile menu toggle
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");
  const overlay = document.getElementById("menu-overlay");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("active");
      if (overlay) overlay.classList.toggle("show");
    });
  }

  if (overlay && navMenu) {
    overlay.addEventListener("click", () => {
      navMenu.classList.remove("active");
      overlay.classList.remove("show");
    });
  }

})(); // end IIFE