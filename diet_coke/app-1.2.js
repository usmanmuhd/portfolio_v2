// Diet Coke Tracker - Main JavaScript
// =============================================================================
// VERSION UPDATE CHECKLIST:
// When bumping version (e.g., 1.0 -> 1.1), update the following:
//   1. Rename files: app-X.X.js, styles-X.X.css, sw-X.X.js
//   2. Update APP_VERSION below
//   3. Update CACHE_NAME in sw-X.X.js
//   4. Update STATIC_ASSETS in sw-X.X.js to reference new file names
//   5. Update index.html:
//      - <link rel="stylesheet" href="styles-X.X.css">
//      - <script src="app-X.X.js"></script>
//      - navigator.serviceWorker.register('./sw-X.X.js')
//   6. git add -A && git commit -m "vX.X: <message>" && git push
// =============================================================================
const APP_VERSION = '1.2';

class DietCokeTracker {
    constructor() {
        // Default drink types
        this.drinkTypes = JSON.parse(localStorage.getItem('drinkTypes')) || [
            { id: 'diet-coke', name: 'Diet Coke', emoji: '🥤', color: '#dc2626' },
            { id: 'coke-zero', name: 'Coke Zero', emoji: '⚫', color: '#1f2937' },
            { id: 'sprite-zero', name: 'Sprite Zero', emoji: '🟢', color: '#22c55e' }
        ];
        
        // Daily logs: { 'YYYY-MM-DD': { 'drink-id': count, ... } }
        this.logs = JSON.parse(localStorage.getItem('drinkLogs')) || {};
        
        // Deleted drinks metadata: { 'drink-id': { name, emoji, color } }
        this.deletedDrinks = JSON.parse(localStorage.getItem('deletedDrinks')) || {};
        
        this.chart = null;
        this.selectedRange = 'week';
        this.customStartDate = null;
        this.customEndDate = null;
        this.confirmCallback = null;
        
        this.init();
    }

    init() {
        this.displayVersion();
        this.updateTodayDate();
        this.renderDrinksGrid();
        this.renderDrinksList();
        this.updateStats();
        this.setupChart();
        this.setupEventListeners();
        this.setupModals();
        this.setupForceUpdate();
    }

    // ========== UTILITIES ==========
    displayVersion() {
        const versionEl = document.getElementById('appVersion');
        if (versionEl) {
            versionEl.textContent = APP_VERSION;
        }
    }

    getToday() {
        const now = new Date();
        return this.formatDateKey(now);
    }

    formatDateKey(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    updateTodayDate() {
        const el = document.getElementById('todayDate');
        if (el) {
            const options = { weekday: 'long', month: 'short', day: 'numeric' };
            el.textContent = new Date().toLocaleDateString('en-US', options);
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    generateId(name) {
        return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    }

    // ========== DRINK TYPES MANAGEMENT ==========
    addDrinkType(name, emoji, color) {
        // Check if there's a deleted drink with the same name (case-insensitive)
        const normalizedName = name.toLowerCase().trim();
        let id = null;
        
        for (const [deletedId, deletedDrink] of Object.entries(this.deletedDrinks)) {
            if (deletedDrink.name.toLowerCase().trim() === normalizedName) {
                id = deletedId;
                // Remove from deletedDrinks since we're re-adding it
                delete this.deletedDrinks[deletedId];
                this.saveDeletedDrinks();
                break;
            }
        }
        
        // Generate new ID if no match found
        if (!id) {
            id = this.generateId(name);
        }
        
        this.drinkTypes.push({ id, name, emoji, color });
        this.saveDrinkTypes();
        this.renderDrinksGrid();
        this.renderDrinksList();
        this.updateChart();
        this.updateStats();
    }

    removeDrinkType(id) {
        // Store drink metadata before removing
        const drink = this.drinkTypes.find(d => d.id === id);
        if (drink) {
            this.deletedDrinks[id] = {
                name: drink.name,
                emoji: drink.emoji,
                color: drink.color
            };
            this.saveDeletedDrinks();
        }
        
        this.drinkTypes = this.drinkTypes.filter(d => d.id !== id);
        this.saveDrinkTypes();
        this.renderDrinksGrid();
        this.renderDrinksList();
        this.updateChart();
        this.updateStats();
    }

    saveDrinkTypes() {
        localStorage.setItem('drinkTypes', JSON.stringify(this.drinkTypes));
    }

    saveDeletedDrinks() {
        localStorage.setItem('deletedDrinks', JSON.stringify(this.deletedDrinks));
    }

    // ========== DAILY LOGGING ==========
    getTodayLog() {
        const today = this.getToday();
        return this.logs[today] || {};
    }

    getDrinkCount(drinkId, date = null) {
        const dateKey = date || this.getToday();
        return (this.logs[dateKey] && this.logs[dateKey][drinkId]) || 0;
    }

    incrementDrink(drinkId) {
        const today = this.getToday();
        if (!this.logs[today]) {
            this.logs[today] = {};
        }
        this.logs[today][drinkId] = (this.logs[today][drinkId] || 0) + 1;
        this.saveLogs();
        this.renderDrinksGrid();
        this.updateStats();
        this.updateChart();
        this.showToast('🫧 Fizz added!', 'success');
    }

    decrementDrink(drinkId) {
        const today = this.getToday();
        if (this.logs[today] && this.logs[today][drinkId] > 0) {
            this.logs[today][drinkId]--;
            if (this.logs[today][drinkId] === 0) {
                delete this.logs[today][drinkId];
            }
            this.saveLogs();
            this.renderDrinksGrid();
            this.updateStats();
            this.updateChart();
            this.showToast('💨 Removed one', 'info');
        }
    }

    saveLogs() {
        localStorage.setItem('drinkLogs', JSON.stringify(this.logs));
    }

    // ========== RENDERING ==========
    renderDrinksGrid() {
        const grid = document.getElementById('drinksGrid');
        if (!grid) return;

        if (this.drinkTypes.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🥤</span>
                    <p>No drinks added yet!</p>
                    <p>Tap the button below to add your first fizzy drink 🫧</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.drinkTypes.map(drink => {
            const count = this.getDrinkCount(drink.id);
            return `
                <div class="drink-card" style="--drink-color: ${drink.color}">
                    <div class="drink-header">
                        <span class="drink-emoji">${drink.emoji}</span>
                        <span class="drink-name">${drink.name}</span>
                    </div>
                    <div class="drink-counter">
                        <button class="counter-btn decrement" data-id="${drink.id}" ${count === 0 ? 'disabled' : ''}>
                            ➖
                        </button>
                        <span class="drink-count">${count}</span>
                        <button class="counter-btn increment" data-id="${drink.id}">
                            ➕
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners
        grid.querySelectorAll('.increment').forEach(btn => {
            btn.addEventListener('click', () => this.incrementDrink(btn.dataset.id));
        });
        grid.querySelectorAll('.decrement').forEach(btn => {
            btn.addEventListener('click', () => this.decrementDrink(btn.dataset.id));
        });
    }

    renderDrinksList() {
        const list = document.getElementById('drinksList');
        if (!list) return;

        if (this.drinkTypes.length === 0) {
            list.innerHTML = '<p class="no-drinks">No drink types configured 🤷</p>';
            return;
        }

        list.innerHTML = this.drinkTypes.map(drink => `
            <div class="drink-list-item">
                <span class="drink-info">
                    <span class="drink-emoji">${drink.emoji}</span>
                    <span class="drink-name">${drink.name}</span>
                </span>
                <div class="drink-color" style="background: ${drink.color}"></div>
                <button class="delete-drink-btn" data-id="${drink.id}" title="Delete">🗑️</button>
            </div>
        `).join('');

        list.querySelectorAll('.delete-drink-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const drink = this.drinkTypes.find(d => d.id === btn.dataset.id);
                this.showConfirm(
                    `Delete ${drink.emoji} ${drink.name}?`,
                    'This will remove the drink type. Your consumption history will be kept.',
                    () => this.removeDrinkType(btn.dataset.id)
                );
            });
        });
    }

    // ========== STATISTICS ==========
    
    // Get drink info for any ID (including historical/deleted drinks)
    getDrinkInfo(drinkId) {
        // First check current drink types
        const current = this.drinkTypes.find(d => d.id === drinkId);
        if (current) return current;
        
        // Check deleted drinks for preserved metadata
        const deleted = this.deletedDrinks[drinkId];
        if (deleted) {
            return { id: drinkId, name: deleted.name, emoji: deleted.emoji, color: deleted.color };
        }
        
        // Fallback for very old drinks without metadata
        return { id: drinkId, name: drinkId, emoji: '🥤', color: '#888888' };
    }

    // Get all unique drink IDs from logs
    getAllHistoricalDrinkIds() {
        const ids = new Set();
        for (const dayLog of Object.values(this.logs)) {
            for (const drinkId of Object.keys(dayLog)) {
                ids.add(drinkId);
            }
        }
        return Array.from(ids);
    }

    // Aggregate counts by drink ID for a date range
    aggregateByDrink(startDate, endDate) {
        const counts = {};
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateKey = this.formatDateKey(d);
            if (this.logs[dateKey]) {
                for (const [drinkId, count] of Object.entries(this.logs[dateKey])) {
                    counts[drinkId] = (counts[drinkId] || 0) + count;
                }
            }
        }
        return counts;
    }

    // Render breakdown HTML for a counts object
    renderBreakdown(counts) {
        const entries = Object.entries(counts).filter(([_, count]) => count > 0);
        if (entries.length === 0) return '<span class="no-drinks">No fizz yet 🫧</span>';
        
        return entries.map(([drinkId, count]) => {
            const drink = this.getDrinkInfo(drinkId);
            return `<span class="breakdown-item" style="--drink-color: ${drink.color}">${drink.emoji} ${count}</span>`;
        }).join('');
    }

    updateStats() {
        const today = new Date();
        
        // Today's stats
        const todayLog = this.getTodayLog();
        const todayTotal = Object.values(todayLog).reduce((sum, c) => sum + c, 0);
        document.getElementById('todayTotal').textContent = todayTotal;
        document.getElementById('todayBreakdown').innerHTML = this.renderBreakdown(todayLog);

        // This week total (last 7 days)
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 6);
        const weekCounts = this.aggregateByDrink(weekAgo, today);
        const weekTotal = Object.values(weekCounts).reduce((sum, c) => sum + c, 0);
        document.getElementById('weekTotal').textContent = weekTotal;
        document.getElementById('weekBreakdown').innerHTML = this.renderBreakdown(weekCounts);

        // This month total
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthCounts = this.aggregateByDrink(monthStart, today);
        const monthTotal = Object.values(monthCounts).reduce((sum, c) => sum + c, 0);
        document.getElementById('monthTotal').textContent = monthTotal;
        document.getElementById('monthBreakdown').innerHTML = this.renderBreakdown(monthCounts);
    }

    // ========== CHART ==========
    setupChart() {
        const ctx = document.getElementById('drinksChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const date = new Date(items[0].label);
                                return date.toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                });
                            }
                        }
                    }
                }
            }
        });

        this.updateChart();
    }

    getDateRange() {
        const today = new Date();
        let start, end;

        switch (this.selectedRange) {
            case 'week':
                start = new Date(today);
                start.setDate(start.getDate() - 6);
                end = today;
                break;
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = today;
                break;
            case 'prevMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'year':
                start = new Date(today.getFullYear(), 0, 1);
                end = today;
                break;
            case 'prevYear':
                start = new Date(today.getFullYear() - 1, 0, 1);
                end = new Date(today.getFullYear() - 1, 11, 31);
                break;
            case 'custom':
                if (this.customStartDate && this.customEndDate) {
                    start = new Date(this.customStartDate);
                    end = new Date(this.customEndDate);
                } else {
                    start = new Date(today);
                    start.setDate(start.getDate() - 6);
                    end = today;
                }
                break;
            default:
                start = new Date(today);
                start.setDate(start.getDate() - 6);
                end = today;
        }

        return { start, end };
    }

    updateChart() {
        if (!this.chart) return;

        const { start, end } = this.getDateRange();
        const labels = [];
        const dateMap = {};

        // Generate all dates in range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateKey = this.formatDateKey(d);
            labels.push(dateKey);
            dateMap[dateKey] = this.logs[dateKey] || {};
        }

        // Get all drink IDs that appear in this date range (including deleted ones)
        const drinkIdsInRange = new Set();
        for (const dateKey of labels) {
            if (this.logs[dateKey]) {
                for (const drinkId of Object.keys(this.logs[dateKey])) {
                    drinkIdsInRange.add(drinkId);
                }
            }
        }

        // Create datasets: current drinks + historical drinks with data in range
        const allDrinks = [...this.drinkTypes];
        for (const drinkId of drinkIdsInRange) {
            if (!allDrinks.find(d => d.id === drinkId)) {
                allDrinks.push(this.getDrinkInfo(drinkId));
            }
        }

        const datasets = allDrinks
            .filter(drink => {
                // Only include if there's data for this drink in the range
                return labels.some(date => (dateMap[date][drink.id] || 0) > 0);
            })
            .map(drink => ({
                label: `${drink.emoji} ${drink.name}`,
                data: labels.map(date => dateMap[date][drink.id] || 0),
                backgroundColor: drink.color + 'CC',
                borderColor: drink.color,
                borderWidth: 1,
                borderRadius: 4
            }));

        this.chart.data.labels = labels;
        this.chart.data.datasets = datasets;
        this.chart.update();

        // Update max day info
        this.updateMaxDayInfo(labels, dateMap);
    }

    updateMaxDayInfo(labels, dateMap) {
        let maxTotal = 0;
        let maxDate = null;
        let maxBreakdown = {};

        for (const date of labels) {
            const dayLog = dateMap[date];
            const total = Object.values(dayLog).reduce((sum, c) => sum + c, 0);
            if (total > maxTotal) {
                maxTotal = total;
                maxDate = date;
                maxBreakdown = dayLog;
            }
        }

        const infoEl = document.getElementById('maxDayInfo');
        if (maxTotal > 0 && maxDate) {
            const dateObj = new Date(maxDate);
            const dateStr = dateObj.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
            });

            const breakdown = Object.entries(maxBreakdown)
                .filter(([_, count]) => count > 0)
                .map(([drinkId, count]) => {
                    const drink = this.getDrinkInfo(drinkId);
                    return `${drink.emoji} ${count}`;
                })
                .join(' • ');

            infoEl.innerHTML = `
                <div class="max-day-card">
                    <span class="max-day-label">🏆 Peak Fizz Day</span>
                    <span class="max-day-date">${dateStr}</span>
                    <span class="max-day-total">${maxTotal} drinks</span>
                    <span class="max-day-breakdown">${breakdown}</span>
                </div>
            `;
        } else {
            infoEl.innerHTML = '<p class="no-data">No data for this period 📊</p>';
        }
    }

    // ========== EVENT LISTENERS ==========
    setupEventListeners() {
        const customDateRange = document.getElementById('customDateRange');
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const applyBtn = document.getElementById('applyDateRange');

        // Set default values for date inputs (last 30 days)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        if (startDateInput) startDateInput.value = this.formatDateKey(thirtyDaysAgo);
        if (endDateInput) endDateInput.value = this.formatDateKey(today);

        // Preset range buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedRange = btn.dataset.range;
                
                // Show/hide custom date picker
                if (btn.dataset.range === 'custom') {
                    customDateRange?.classList.remove('hidden');
                } else {
                    customDateRange?.classList.add('hidden');
                    this.updateChart();
                }
            });
        });

        // Apply custom date range
        applyBtn?.addEventListener('click', () => {
            const startVal = startDateInput?.value;
            const endVal = endDateInput?.value;
            
            if (startVal && endVal) {
                if (new Date(startVal) > new Date(endVal)) {
                    this.showToast('Start date must be before end date! 📅', 'error');
                    return;
                }
                this.customStartDate = startVal;
                this.customEndDate = endVal;
                this.updateChart();
                this.showToast('Date range applied! 📈', 'success');
            } else {
                this.showToast('Please select both dates 📅', 'error');
            }
        });
    }

    // ========== MODALS ==========
    setupModals() {
        const addModal = document.getElementById('addDrinkModal');
        const addBtn = document.getElementById('addDrinkBtn');
        const closeAddBtn = document.getElementById('closeAddModal');
        const addForm = document.getElementById('addDrinkForm');
        const emojiPicker = document.getElementById('emojiPicker');

        addBtn?.addEventListener('click', () => {
            addModal.classList.add('active');
        });

        closeAddBtn?.addEventListener('click', () => {
            addModal.classList.remove('active');
            addForm.reset();
        });

        addModal?.addEventListener('click', (e) => {
            if (e.target === addModal) {
                addModal.classList.remove('active');
                addForm.reset();
            }
        });

        // Emoji picker
        emojiPicker?.querySelectorAll('.emoji-option').forEach(btn => {
            btn.addEventListener('click', () => {
                emojiPicker.querySelectorAll('.emoji-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('drinkEmoji').value = btn.dataset.emoji;
            });
        });

        // Add form submit
        addForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('drinkName').value.trim();
            const emoji = document.getElementById('drinkEmoji').value;
            const color = document.getElementById('drinkColor').value;

            if (name) {
                this.addDrinkType(name, emoji, color);
                addModal.classList.remove('active');
                addForm.reset();
                emojiPicker.querySelectorAll('.emoji-option').forEach(b => b.classList.remove('selected'));
                this.showToast(`${emoji} ${name} added! 🎉`, 'success');
            }
        });

        // Confirm modal
        const confirmModal = document.getElementById('confirmModal');
        document.getElementById('confirmCancel')?.addEventListener('click', () => {
            confirmModal.classList.remove('active');
            this.confirmCallback = null;
        });

        document.getElementById('confirmOk')?.addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            confirmModal.classList.remove('active');
            this.confirmCallback = null;
        });
    }

    showConfirm(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        this.confirmCallback = callback;
        document.getElementById('confirmModal').classList.add('active');
    }

    // ========== FORCE UPDATE ==========
    setupForceUpdate() {
        document.getElementById('forceUpdateBtn')?.addEventListener('click', async () => {
            this.showToast('🔄 Clearing cache...', 'info');
            
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }
            
            setTimeout(() => {
                window.location.reload(true);
            }, 500);
        });
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new DietCokeTracker();
});
