import { API_URL } from '../config';

// Keys for storing local task data in localStorage
const LOCAL_UPDATES_KEY = 'local_task_updates';
const LOCAL_CREATED_TASKS_KEY = 'local_created_tasks';

// Helper to calculate the next deadline based on frequency
const calculateNextDeadline = (currentDeadlineStr, type) => {
  let baseDate = new Date();
  if (currentDeadlineStr) {
    try {
      baseDate = new Date(currentDeadlineStr);
    } catch (e) {}
  }
  if (type === 'Daily') {
    baseDate.setDate(baseDate.getDate() + 1);
  } else if (type === 'Weekly') {
    baseDate.setDate(baseDate.getDate() + 7);
  } else if (type === 'Biweekly') {
    baseDate.setDate(baseDate.getDate() + 14);
  } else if (type === 'Monthly') {
    baseDate.setMonth(baseDate.getMonth() + 1); // Next month (same day)
  } else {
    return currentDeadlineStr;
  }
  const yyyy = baseDate.getFullYear();
  const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
  const dd = String(baseDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const taskService = {
  /**
   * Fetches task lists, applies local updates, and appends locally created recurring tasks.
   */
  getMergedTasks: async (employeeName) => {
    try {
      const res = await fetch(`${API_URL}?name=${employeeName}`);
      const data = await res.json();
      
      let fetchedTasks = [];
      if (data.status === 'success' && data.data) {
        fetchedTasks = data.data.map(task => {
          let recurrence = 'None';
          // Check for recurrenceType or backwards compatible isMonthlyRecurring
          const recVal = task.recurrenceType || task.isMonthlyRecurring;
          if (recVal === true || recVal === 'true' || recVal === 'Monthly') {
            recurrence = 'Monthly';
          } else if (recVal && recVal !== 'false' && recVal !== 'FALSE' && recVal !== false && recVal !== 'None') {
            recurrence = String(recVal);
          }
          return {
            ...task,
            isMonthlyRecurring: recurrence !== 'None',
            recurrenceType: recurrence,
            parentRecurringTaskId: task.parentRecurringTaskId || ''
          };
        });
      }

      // Fetch and clean up redundant locally created tasks from localStorage
      const createdStr = localStorage.getItem(LOCAL_CREATED_TASKS_KEY);
      let allLocalCreated = [];
      try {
        allLocalCreated = createdStr ? JSON.parse(createdStr) : [];
      } catch (e) {
        console.error("Error parsing local created tasks", e);
      }

      let updatedLocalCreated = [];
      let hasChanges = false;

      allLocalCreated.forEach(localTask => {
        // If this task belongs to a different employee, preserve it
        if (localTask.employeeName !== employeeName) {
          updatedLocalCreated.push(localTask);
          return;
        }

        // Deduplicate speculative local tasks that have now successfully fetched from the database
        let isRedundant = false;
        if (localTask.parentRecurringTaskId) {
          isRedundant = fetchedTasks.some(ft => 
            String(ft.parentRecurringTaskId) === String(localTask.parentRecurringTaskId) &&
            String(ft.employeeName) === String(localTask.employeeName)
          );
        } else {
          isRedundant = fetchedTasks.some(ft => 
            (ft.workName || "").trim().toLowerCase() === (localTask.workName || "").trim().toLowerCase() &&
            (ft.client || "").trim().toLowerCase() === (localTask.client || "").trim().toLowerCase() &&
            (ft.employeeName || "").trim().toLowerCase() === (localTask.employeeName || "").trim().toLowerCase() &&
            (ft.deadline || "").trim() === (localTask.deadline || "").trim() &&
            (ft.recurrenceType || "None") === (localTask.recurrenceType || "None")
          );
        }

        if (isRedundant) {
          hasChanges = true; // Exclude it from local storage, as it is now in the database
        } else {
          updatedLocalCreated.push(localTask);
        }
      });

      if (hasChanges) {
        try {
          localStorage.setItem(LOCAL_CREATED_TASKS_KEY, JSON.stringify(updatedLocalCreated));
        } catch (e) {
          console.error("Failed to update local created tasks cache:", e);
        }
      }

      // Filter remaining local created tasks for the current employee
      const localCreated = updatedLocalCreated.filter(task => task.employeeName === employeeName);
      let combined = [...fetchedTasks, ...localCreated];

      // Remove any duplicate taskIds that might exist in both fetched and local arrays
      const uniqueMap = {};
      combined.forEach(task => {
        uniqueMap[task.taskId] = task;
      });
      combined = Object.values(uniqueMap);

      // Merge local overrides (updates to status, time, comments)
      const localUpdates = taskService.getLocalUpdates();
      return combined.map(task => {
        const update = localUpdates[task.taskId];
        if (update) {
          return {
            ...task,
            status: update.status,
            actualTime: update.actualTime,
            comment: update.comment,
            updatedAt: update.updatedAt
          };
        }
        return task;
      });
    } catch (err) {
      console.error("Error in getMergedTasks:", err);
      // Fallback: load strictly from local storage cache if network is down
      const localCreated = taskService.getLocalCreatedTasks(employeeName);
      const localUpdates = taskService.getLocalUpdates();
      const combined = [...localCreated].map(task => {
        const update = localUpdates[task.taskId];
        return update ? { ...task, ...update } : task;
      });
      return combined;
    }
  },

  /**
   * Updates task status, actual time, and comments in the Google Sheet.
   * If a recurring task is marked Completed, automatically triggers the next occurrence.
   */
  updateTask: async (taskId, employeeName, status, actualTime, comment) => {
    // 1. Fetch current task detail to check its prior values and recurrence state
    let taskToUpdate = null;
    try {
      const currentTasks = await taskService.getMergedTasks(employeeName);
      taskToUpdate = currentTasks.find(t => t.taskId === taskId);
    } catch (e) {
      console.warn("Could not retrieve current task details:", e);
    }

    const recurrenceType = taskToUpdate ? (taskToUpdate.recurrenceType || 'None') : 'None';
    const oldStatus = taskToUpdate ? taskToUpdate.status : 'Pending';

    // 2. Prepare API payload
    const payload = {
      action: 'updateTask',
      taskId,
      employeeName,
      status,
      actualTime: parseFloat(actualTime) || 0,
      comment
    };

    // 3. Perform the API call to Google Apps Script
    let apiSuccess = false;
    let apiError = null;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          apiSuccess = true;
        } else {
          apiError = data.message;
        }
      } else {
        apiError = `HTTP ${response.status}`;
      }
    } catch (err) {
      apiError = err.message;
      console.warn("API request failed, falling back to local persistence:", err);
    }

    // 4. Save updates to localStorage override cache
    const updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    taskService.saveLocalUpdate(taskId, {
      status,
      actualTime: parseFloat(actualTime) || 0,
      comment,
      updatedAt
    });

    // 5. AUTO-RECURRENCE TRIGGERS (Completion event logic)
    // Trigger if status is transitioning to Completed and it is a recurring task
    if (status === 'Completed' && oldStatus !== 'Completed' && recurrenceType !== 'None') {
      // Deduplicate: check if a child occurrence has already been generated
      let alreadyCreated = false;
      try {
        const currentTasks = await taskService.getMergedTasks(employeeName);
        alreadyCreated = currentTasks.some(t => t.parentRecurringTaskId === taskId);
      } catch (e) {
        console.warn("Failed checking for duplicate children:", e);
      }

      if (!alreadyCreated) {
        // Automatically generate next occurrence
        const nextDeadline = calculateNextDeadline(taskToUpdate.deadline || new Date().toISOString().substring(0, 10), recurrenceType);
        
        const timestamp = new Date().getTime();
        const prefix = (taskToUpdate.workName || "TASK").substring(0, 3).toUpperCase();
        const nextTaskId = `${prefix}-REC-${timestamp}`;

        const nextTaskOccurrence = {
          taskId: nextTaskId,
          client: taskToUpdate.client || "",
          workName: taskToUpdate.workName || "",
          workType: taskToUpdate.workType || "",
          employeeName: employeeName,
          priority: taskToUpdate.priority || "Normal",
          deadline: nextDeadline,
          estTime: taskToUpdate.estTime || "",
          actualTime: 0,
          status: 'Pending',
          comment: '',
          createdAt: updatedAt,
          updatedAt: '',
          isMonthlyRecurring: true,
          recurrenceType: recurrenceType,
          parentRecurringTaskId: taskId
        };

        // Save locally to display immediately on front-end
        taskService.saveLocalCreatedTask(nextTaskOccurrence);

        // Speculatively call backend assign API for the next task
        try {
          const assignParams = new URLSearchParams({
            action: 'assign',
            name: employeeName,
            workName: taskToUpdate.workName || "",
            workType: taskToUpdate.workType || "",
            priority: taskToUpdate.priority || "Normal",
            deadline: nextDeadline,
            estTime: taskToUpdate.estTime || "",
            client: taskToUpdate.client || "",
            recurrenceType: recurrenceType,
            isMonthlyRecurring: String(recurrenceType === 'Monthly'),
            parentRecurringTaskId: taskId
          });
          fetch(`${API_URL}?${assignParams.toString()}`, { mode: 'no-cors' });
        } catch (e) {
          console.warn("Could not speculatively create next task occurrence on backend:", e);
        }
      }
    }

    return {
      status: 'success',
      apiSuccess,
      apiError,
      message: apiSuccess ? "Task updated in database" : `Task updated locally (API note: ${apiError})`
    };
  },

  // --- LOCAL FALLBACK STORAGE HELPERS ---
  getLocalUpdates: () => {
    try {
      const updatesStr = localStorage.getItem(LOCAL_UPDATES_KEY);
      return updatesStr ? JSON.parse(updatesStr) : {};
    } catch (e) {
      console.error("Error reading local task updates", e);
      return {};
    }
  },

  saveLocalUpdate: (taskId, updateData) => {
    try {
      const updates = taskService.getLocalUpdates();
      updates[taskId] = updateData;
      localStorage.setItem(LOCAL_UPDATES_KEY, JSON.stringify(updates));
    } catch (e) {
      console.error("Error saving local task update", e);
    }
  },

  getLocalCreatedTasks: (employeeName) => {
    try {
      const createdStr = localStorage.getItem(LOCAL_CREATED_TASKS_KEY);
      const allCreated = createdStr ? JSON.parse(createdStr) : [];
      // Filter by employeeName to match database behavior
      return allCreated.filter(task => task.employeeName === employeeName);
    } catch (e) {
      console.error("Error reading local created tasks", e);
      return [];
    }
  },

  saveLocalCreatedTask: (newTask) => {
    try {
      const createdStr = localStorage.getItem(LOCAL_CREATED_TASKS_KEY);
      const allCreated = createdStr ? JSON.parse(createdStr) : [];
      allCreated.push(newTask);
      localStorage.setItem(LOCAL_CREATED_TASKS_KEY, JSON.stringify(allCreated));
    } catch (e) {
      console.error("Error saving local created task", e);
    }
  }
};
