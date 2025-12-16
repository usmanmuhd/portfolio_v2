// Weight Loss Tracker - Main JavaScript

class WeightTracker {
    constructor() {
        this.logs = JSON.parse(localStorage.getItem('weightLogs')) || [];
        this.profile = JSON.parse(localStorage.getItem('userProfile')) || {};
        this.target = JSON.parse(localStorage.getItem('weightTarget')) || {};
        this.pastTargets = JSON.parse(localStorage.getItem('pastTargets')) || [];
        this.charts = {};
        this.confirmCallback = null;
        
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupForms();
        this.setupHistoryControls();
        this.setupTargetButtons();
        this.setupQuickLog();
        this.setupConfirmModal();
        this.loadProfile();
        this.updateTargetPage();
        this.updateDashboard();
        this.renderHistory();
        this.setDefaultDate();
    }

    // ========== TAB NAVIGATION ==========
    setupTabs() {
        const hamburger = document.getElementById('navToggle');
        const navDropdown = document.getElementById('navMenu');
        const navItems = document.querySelectorAll('.nav-item');
        
        // Toggle menu open/close
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburger.classList.toggle('open');
            navDropdown.classList.toggle('open');
        });
        
        // Handle nav item clicks
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabId = item.dataset.tab;
                
                // Update active states
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Close the menu
                hamburger.classList.remove('open');
                navDropdown.classList.remove('open');
                
                // Update tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(tabId).classList.add('active');

                // Refresh content when switching
                if (tabId === 'dashboard') {
                    this.updateDashboard();
                }
                if (tabId === 'target') {
                    this.updateTargetPage();
                }
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navDropdown.contains(e.target)) {
                hamburger.classList.remove('open');
                navDropdown.classList.remove('open');
            }
        });
    }

    // ========== FORM SETUP ==========
    setupForms() {
        // Target Form
        document.getElementById('targetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTarget();
        });

        // Profile Form
        document.getElementById('profileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        // Export Button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Clear Data Button
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.showConfirm(
                'Delete All Data?',
                'This will permanently delete all your logs, profile, and targets. This cannot be undone.',
                () => this.clearAllData(),
                { icon: '🗑️', confirmText: 'Delete All' }
            );
        });
    }

    setupTargetButtons() {
        document.getElementById('cancelTargetBtn')?.addEventListener('click', () => {
            this.cancelTarget();
        });
        
        document.getElementById('completeTargetBtn')?.addEventListener('click', () => {
            this.completeTarget();
        });
    }

    setupQuickLog() {
        const fab = document.getElementById('fabButton');
        const modal = document.getElementById('quickLogModal');
        const closeBtn = document.getElementById('closeModal');
        const morningForm = document.getElementById('morningLogForm');
        const eveningForm = document.getElementById('eveningLogForm');
        const timeTabs = document.querySelectorAll('.time-tab');
        
        // Open modal
        fab.addEventListener('click', () => {
            this.openQuickLogModal();
        });
        
        // Close modal
        closeBtn.addEventListener('click', () => {
            this.closeQuickLogModal();
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeQuickLogModal();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.closeQuickLogModal();
            }
        });
        
        // Time tab switching
        timeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const time = tab.dataset.time;
                timeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('.time-form').forEach(form => {
                    form.classList.remove('active');
                });
                
                if (time === 'morning') {
                    morningForm.classList.add('active');
                    document.getElementById('quickWeight').focus();
                } else {
                    eveningForm.classList.add('active');
                }
            });
        });
        
        // Handle morning form submit
        morningForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMorningLog();
        });
        
        // Handle evening form submit
        eveningForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEveningLog();
        });
        
        // Update status when date changes
        document.getElementById('morningLogDate').addEventListener('change', () => {
            this.updateQuickLogStatus();
        });
        
        document.getElementById('eveningLogDate').addEventListener('change', () => {
            this.updateQuickLogStatus();
        });
    }

    setupConfirmModal() {
        const modal = document.getElementById('confirmModal');
        const cancelBtn = document.getElementById('confirmCancel');
        const okBtn = document.getElementById('confirmOk');
        
        cancelBtn.addEventListener('click', () => {
            this.hideConfirm();
        });
        
        okBtn.addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.hideConfirm();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideConfirm();
            }
        });
    }

    showConfirm(title, message, onConfirm, options = {}) {
        const modal = document.getElementById('confirmModal');
        const iconEl = document.getElementById('confirmIcon');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOk');
        
        iconEl.textContent = options.icon || '⚠️';
        titleEl.textContent = title;
        messageEl.textContent = message;
        okBtn.textContent = options.confirmText || 'Delete';
        okBtn.className = options.confirmClass || 'btn-danger';
        
        this.confirmCallback = onConfirm;
        modal.classList.add('active');
    }

    hideConfirm() {
        document.getElementById('confirmModal').classList.remove('active');
        this.confirmCallback = null;
    }

    openQuickLogModal() {
        const modal = document.getElementById('quickLogModal');
        
        // Set today's date (local timezone)
        const today = new Date();
        const todayStr = this.getLocalDateString(today);
        
        // Set date inputs to today
        document.getElementById('morningLogDate').value = todayStr;
        document.getElementById('eveningLogDate').value = todayStr;
        
        // Auto-select morning or evening based on time
        const hour = today.getHours();
        const timeTabs = document.querySelectorAll('.time-tab');
        const morningForm = document.getElementById('morningLogForm');
        const eveningForm = document.getElementById('eveningLogForm');
        
        timeTabs.forEach(t => t.classList.remove('active'));
        morningForm.classList.remove('active');
        eveningForm.classList.remove('active');
        
        if (hour < 14) { // Before 2 PM, show morning
            document.querySelector('.time-tab[data-time="morning"]').classList.add('active');
            morningForm.classList.add('active');
        } else { // After 2 PM, show evening
            document.querySelector('.time-tab[data-time="evening"]').classList.add('active');
            eveningForm.classList.add('active');
        }
        
        // Reset forms
        document.getElementById('quickWeight').value = '';
        document.getElementById('quickSleep').checked = true;
        document.querySelector('input[name="quickActivity"][value="none"]').checked = true;
        document.getElementById('quickNoJunk').checked = true;
        
        // Update status indicators
        this.updateQuickLogStatus();
        
        modal.classList.add('active');
        
        if (hour < 14) {
            document.getElementById('quickWeight').focus();
        }
    }

    updateQuickLogStatus() {
        const morningDate = document.getElementById('morningLogDate').value;
        const eveningDate = document.getElementById('eveningLogDate').value;
        
        const morningLog = this.logs.find(log => log.date === morningDate);
        const eveningLog = this.logs.find(log => log.date === eveningDate);
        
        const morningStatus = document.getElementById('morningStatus');
        const eveningStatus = document.getElementById('eveningStatus');
        
        if (morningLog && morningLog.weight) {
            morningStatus.textContent = `✓ Logged: ${morningLog.weight} kg, Sleep: ${morningLog.sleep === 'yes' ? '✓' : '✗'}`;
            morningStatus.classList.add('logged');
        } else {
            morningStatus.textContent = '';
            morningStatus.classList.remove('logged');
        }
        
        if (eveningLog && eveningLog.eveningLogged) {
            eveningStatus.textContent = `✓ Logged: ${this.getActivityLabel(eveningLog.activity)}, No Junk: ${eveningLog.noJunk === 'yes' ? '✓' : (eveningLog.noJunk === 'no' ? '✗' : '-')}`;
            eveningStatus.classList.add('logged');
        } else {
            eveningStatus.textContent = '';
            eveningStatus.classList.remove('logged');
        }
    }

    closeQuickLogModal() {
        document.getElementById('quickLogModal').classList.remove('active');
    }

    saveMorningLog() {
        const date = document.getElementById('morningLogDate').value;
        const weight = parseFloat(document.getElementById('quickWeight').value);
        const sleep = document.getElementById('quickSleep').checked ? 'yes' : 'no';
        const notes = document.getElementById('morningNotes').value.trim();

        // Check if entry for this date already exists
        const existingIndex = this.logs.findIndex(log => log.date === date);
        
        if (existingIndex >= 0) {
            // Update existing entry - only update morning fields
            this.logs[existingIndex].weight = weight;
            this.logs[existingIndex].sleep = sleep;
            if (notes) this.logs[existingIndex].notes = (this.logs[existingIndex].notes ? this.logs[existingIndex].notes + ' | ' : '') + notes;
            this.showToast('Morning log updated! ☀️', 'success');
        } else {
            // Create new entry - evening fields are empty
            const logEntry = {
                id: Date.now(),
                date,
                weight,
                activity: '',
                sleep,
                noJunk: '',
                notes: notes,
                eveningLogged: false,
                createdAt: new Date().toISOString()
            };
            this.logs.push(logEntry);
            this.showToast('Morning log saved! ☀️', 'success');
        }

        // Sort logs by date
        this.logs.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Save to localStorage
        localStorage.setItem('weightLogs', JSON.stringify(this.logs));
        
        // Clear notes field
        document.getElementById('morningNotes').value = '';
        
        this.updateQuickLogStatus();
        this.updateDashboard();
        this.renderHistory();
    }

    saveEveningLog() {
        const date = document.getElementById('eveningLogDate').value;
        const activity = document.querySelector('input[name="quickActivity"]:checked').value;
        const noJunk = document.getElementById('quickNoJunk').checked ? 'yes' : 'no';
        const notes = document.getElementById('eveningNotes').value.trim();

        // Check if entry for this date already exists
        const existingIndex = this.logs.findIndex(log => log.date === date);
        
        if (existingIndex >= 0) {
            // Update existing entry - only update evening fields
            this.logs[existingIndex].activity = activity;
            this.logs[existingIndex].noJunk = noJunk;
            this.logs[existingIndex].eveningLogged = true;
            if (notes) this.logs[existingIndex].notes = (this.logs[existingIndex].notes ? this.logs[existingIndex].notes + ' | ' : '') + notes;
            this.showToast('Evening log saved! 🌙', 'success');
        } else {
            // Create new entry without weight (morning not logged yet)
            const logEntry = {
                id: Date.now(),
                date,
                weight: '',
                activity,
                sleep: '',
                noJunk,
                notes: notes,
                eveningLogged: true,
                createdAt: new Date().toISOString()
            };
            this.logs.push(logEntry);
            this.showToast('Evening log saved! 🌙 (Don\'t forget morning weight!)', 'info');
        }

        // Sort logs by date
        this.logs.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Save to localStorage
        localStorage.setItem('weightLogs', JSON.stringify(this.logs));
        
        // Clear notes field
        document.getElementById('eveningNotes').value = '';
        
        this.updateQuickLogStatus();
        this.updateDashboard();
        this.renderHistory();
    }

    saveQuickLog() {
        // This method is no longer used - replaced by saveMorningLog and saveEveningLog
    }

    setDefaultDate() {
        // Set minimum target date to tomorrow (local timezone)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('targetDate').min = this.getLocalDateString(tomorrow);
    }

    // ========== DAILY LOG ==========
    deleteLog(id) {
        this.showConfirm(
            'Delete Entry?',
            'Are you sure you want to delete this log entry?',
            () => {
                this.logs = this.logs.filter(log => log.id !== id);
                localStorage.setItem('weightLogs', JSON.stringify(this.logs));
                this.showToast('Entry deleted', 'info');
                this.updateDashboard();
                this.renderHistory();
            },
            { icon: '🗑️', confirmText: 'Delete' }
        );
    }

    // ========== TARGET ==========
    saveTarget() {
        const targetWeight = parseFloat(document.getElementById('targetWeightInput').value);
        const targetDate = document.getElementById('targetDate').value;
        const currentWeight = this.getCurrentWeight() || this.profile.startingWeight;

        if (!currentWeight) {
            this.showToast('Please log your weight first or set starting weight in profile', 'error');
            return;
        }

        this.target = {
            weight: targetWeight,
            date: targetDate,
            setDate: new Date().toISOString(),
            startWeight: currentWeight
        };

        localStorage.setItem('weightTarget', JSON.stringify(this.target));
        this.showToast('Target set successfully! 🎯', 'success');
        
        // Clear form
        document.getElementById('targetWeightInput').value = '';
        document.getElementById('targetDate').value = '';
        
        this.updateTargetPage();
        this.updateDashboard();
    }

    cancelTarget() {
        this.showConfirm(
            'Cancel Target?',
            'Are you sure you want to cancel this target? It will be saved to your history.',
            () => {
                // Save to past targets as cancelled
                if (this.target.weight) {
                    this.pastTargets.unshift({
                        ...this.target,
                        status: 'cancelled',
                        endDate: new Date().toISOString(),
                        endWeight: this.getCurrentWeight()
                    });
                    localStorage.setItem('pastTargets', JSON.stringify(this.pastTargets));
                }
                
                this.target = {};
                localStorage.removeItem('weightTarget');
                this.showToast('Target cancelled', 'info');
                this.updateTargetPage();
                this.updateDashboard();
            },
            { icon: '❌', confirmText: 'Cancel Target' }
        );
    }

    completeTarget() {
        const currentWeight = this.getCurrentWeight();
        const achieved = currentWeight <= this.target.weight;
        
        this.pastTargets.unshift({
            ...this.target,
            status: achieved ? 'achieved' : 'completed',
            endDate: new Date().toISOString(),
            endWeight: currentWeight
        });
        localStorage.setItem('pastTargets', JSON.stringify(this.pastTargets));
        
        this.target = {};
        localStorage.removeItem('weightTarget');
        
        if (achieved) {
            this.showToast('🎉 Congratulations! Target achieved!', 'success');
        } else {
            this.showToast('Target completed. Keep going!', 'info');
        }
        
        this.updateTargetPage();
        this.updateDashboard();
    }

    updateTargetPage() {
        const currentTargetStatus = document.getElementById('currentTargetStatus');
        const targetProgressCard = document.getElementById('targetProgressCard');
        const completeBtn = document.getElementById('completeTargetBtn');
        
        if (this.target.weight && this.target.date) {
            // Show active target
            const daysLeft = this.calculateDaysLeft(this.target.date);
            currentTargetStatus.innerHTML = `
                <div class="active-target">
                    <div class="target-weight-display">${this.target.weight} kg</div>
                    <div class="target-date-row">
                        <span class="target-date-display">Target by ${this.formatDateLong(this.target.date)}</span>
                        <button class="edit-date-btn" id="editTargetDateBtn" title="Edit date">✏️</button>
                    </div>
                    <div class="target-date-edit" id="targetDateEdit" style="display: none;">
                        <input type="date" id="editTargetDateInput" value="${this.target.date}">
                        <button class="btn-small btn-success" id="saveTargetDateBtn">Save</button>
                        <button class="btn-small btn-secondary" id="cancelEditDateBtn">Cancel</button>
                    </div>
                    <div class="target-days-badge">${daysLeft} days remaining</div>
                </div>
            `;
            
            // Add edit date listeners
            document.getElementById('editTargetDateBtn').addEventListener('click', () => this.showEditTargetDate());
            document.getElementById('saveTargetDateBtn').addEventListener('click', () => this.saveTargetDate());
            document.getElementById('cancelEditDateBtn').addEventListener('click', () => this.hideEditTargetDate());
            
            // Show progress
            targetProgressCard.style.display = 'block';
            this.updateTargetProgress();
            
            // Show complete button if target date passed or target achieved
            const currentWeight = this.getCurrentWeight();
            if (currentWeight && (currentWeight <= this.target.weight || daysLeft <= 0)) {
                completeBtn.style.display = 'inline-block';
            } else {
                completeBtn.style.display = 'none';
            }
        } else {
            currentTargetStatus.innerHTML = `<p class="no-target">No target set yet. Set one below!</p>`;
            targetProgressCard.style.display = 'none';
        }
        
        this.renderPastTargets();
    }

    updateTargetProgress() {
        const currentWeight = this.getCurrentWeight();
        const startWeight = this.target.startWeight || this.profile.startingWeight;
        const targetWeight = this.target.weight;
        
        if (!currentWeight || !startWeight || !targetWeight) return;
        
        const totalToLose = startWeight - targetWeight;
        const lostSoFar = startWeight - currentWeight;
        const remaining = currentWeight - targetWeight;
        const progress = Math.max(0, Math.min(100, (lostSoFar / totalToLose) * 100));
        
        // Update progress bar
        document.getElementById('targetProgressBar').style.width = `${progress}%`;
        
        // Update labels
        document.getElementById('startWeightLabel').textContent = `Start: ${startWeight} kg`;
        document.getElementById('currentWeightLabel').textContent = `Current: ${currentWeight} kg`;
        document.getElementById('targetWeightLabel').textContent = `Target: ${targetWeight} kg`;
        
        // Update stats
        document.getElementById('weightLost').textContent = lostSoFar > 0 ? lostSoFar.toFixed(1) : '0';
        document.getElementById('weightRemaining').textContent = remaining > 0 ? remaining.toFixed(1) : '0';
        
        const daysLeft = this.calculateDaysLeft(this.target.date);
        document.getElementById('targetDaysLeft').textContent = daysLeft;
        
        // Calculate required rate
        if (daysLeft > 0 && remaining > 0) {
            const weeksLeft = daysLeft / 7;
            const requiredRate = remaining / weeksLeft;
            document.getElementById('requiredRate').textContent = requiredRate.toFixed(2);
        } else {
            document.getElementById('requiredRate').textContent = '--';
        }
    }

    showEditTargetDate() {
        document.querySelector('.target-date-row').style.display = 'none';
        document.getElementById('targetDateEdit').style.display = 'flex';
    }

    hideEditTargetDate() {
        document.querySelector('.target-date-row').style.display = 'flex';
        document.getElementById('targetDateEdit').style.display = 'none';
    }

    saveTargetDate() {
        const newDate = document.getElementById('editTargetDateInput').value;
        if (newDate) {
            this.target.date = newDate;
            localStorage.setItem('weightTarget', JSON.stringify(this.target));
            this.updateTargetPage();
            this.updateDashboard();
            this.showToast('Target date updated! 📅', 'success');
        }
    }

    renderPastTargets() {
        const container = document.getElementById('pastTargetsList');
        
        if (this.pastTargets.length === 0) {
            container.innerHTML = `<p class="no-targets">No completed targets yet.</p>`;
            return;
        }
        
        container.innerHTML = this.pastTargets.map(target => {
            const achieved = target.status === 'achieved';
            const cancelled = target.status === 'cancelled';
            return `
                <div class="past-target-item ${achieved ? '' : 'failed'}">
                    <div class="past-target-info">
                        <h4>Target: ${target.weight} kg</h4>
                        <p>Set on ${this.formatDateLong(target.setDate)} • Due ${this.formatDateLong(target.date)}</p>
                        <p>Started at ${target.startWeight} kg → Ended at ${target.endWeight || '--'} kg</p>
                    </div>
                    <div class="past-target-result">
                        <span class="result-badge ${achieved ? 'achieved' : 'missed'}">
                            ${achieved ? '✓ Achieved' : cancelled ? '✗ Cancelled' : '○ Missed'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    loadTarget() {
        // This is now handled by updateTargetPage
    }

    // ========== PROFILE ==========
    saveProfile() {
        const dobMonth = document.getElementById('dobMonth').value;
        const dobYear = document.getElementById('dobYear').value;
        
        this.profile = {
            name: document.getElementById('userName').value,
            dobMonth: dobMonth !== '' ? parseInt(dobMonth) : null,
            dobYear: dobYear !== '' ? parseInt(dobYear) : null,
            height: parseInt(document.getElementById('userHeight').value),
            gender: document.getElementById('userGender').value,
            activityLevel: parseFloat(document.getElementById('activityLevel').value),
            startingWeight: parseFloat(document.getElementById('startingWeight').value)
        };

        localStorage.setItem('userProfile', JSON.stringify(this.profile));
        this.showToast('Profile saved successfully!', 'success');
        this.updateProfileSummary();
        this.updateDashboard();
    }

    loadProfile() {
        // Populate year dropdown
        this.populateDobYears();
        
        if (this.profile.name) {
            document.getElementById('userName').value = this.profile.name || '';
            document.getElementById('dobMonth').value = this.profile.dobMonth !== null ? this.profile.dobMonth : '';
            document.getElementById('dobYear').value = this.profile.dobYear || '';
            document.getElementById('userHeight').value = this.profile.height || '';
            document.getElementById('userGender').value = this.profile.gender || 'male';
            document.getElementById('activityLevel').value = this.profile.activityLevel || 1.55;
            document.getElementById('startingWeight').value = this.profile.startingWeight || '';
            this.updateProfileSummary();
        }
    }

    populateDobYears() {
        const yearSelect = document.getElementById('dobYear');
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '<option value="">Year</option>';
        
        for (let year = currentYear; year >= currentYear - 100; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }

    calculateAge() {
        if (this.profile.dobMonth === null || !this.profile.dobYear) return null;
        
        const today = new Date();
        const birthDate = new Date(this.profile.dobYear, this.profile.dobMonth, 1);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0) {
            age--;
        }
        
        return age;
    }

    updateProfileSummary() {
        const container = document.getElementById('profileSummary');
        if (!this.profile.height) {
            container.innerHTML = '<p class="empty-state">Fill in your profile to see your health stats.</p>';
            return;
        }

        const currentWeight = this.getCurrentWeight();
        const bmi = this.calculateBMI(currentWeight);
        const bmr = this.calculateBMR(currentWeight);
        const tdee = this.calculateTDEE(bmr);
        const age = this.calculateAge();

        container.innerHTML = `
            <h3>📊 Your Health Summary</h3>
            <div class="profile-info-grid">
                <div class="profile-info-item">
                    <label>Name</label>
                    <span>${this.profile.name || 'Not set'}</span>
                </div>
                <div class="profile-info-item">
                    <label>Age</label>
                    <span>${age !== null ? age + ' years' : '--'}</span>
                </div>
                <div class="profile-info-item">
                    <label>Height</label>
                    <span>${this.profile.height || '--'} cm</span>
                </div>
                <div class="profile-info-item">
                    <label>Starting Weight</label>
                    <span>${this.profile.startingWeight || '--'} kg</span>
                </div>
                <div class="profile-info-item">
                    <label>Current BMI</label>
                    <span>${bmi ? bmi.toFixed(1) : '--'}</span>
                </div>
                <div class="profile-info-item">
                    <label>Daily Calories (TDEE)</label>
                    <span>${tdee ? Math.round(tdee) : '--'}</span>
                </div>
            </div>
        `;
    }

    // ========== CALCULATIONS ==========
    getCurrentWeight() {
        if (this.logs.length === 0) return null;
        const sortedLogs = [...this.logs].sort((a, b) => new Date(b.date) - new Date(a.date));
        return sortedLogs[0].weight;
    }

    calculateBMI(weight) {
        if (!weight || !this.profile.height) return null;
        const heightInMeters = this.profile.height / 100;
        return weight / (heightInMeters * heightInMeters);
    }

    getBMICategory(bmi) {
        if (!bmi) return { category: 'Unknown', class: '' };
        if (bmi < 18.5) return { category: 'Underweight', class: 'underweight' };
        if (bmi < 25) return { category: 'Normal', class: 'normal' };
        if (bmi < 30) return { category: 'Overweight', class: 'overweight' };
        return { category: 'Obese', class: 'obese' };
    }

    calculateBMR(weight) {
        const age = this.calculateAge();
        if (!weight || !this.profile.height || age === null) return null;
        
        // Mifflin-St Jeor Equation
        if (this.profile.gender === 'male') {
            return (10 * weight) + (6.25 * this.profile.height) - (5 * age) + 5;
        } else {
            return (10 * weight) + (6.25 * this.profile.height) - (5 * age) - 161;
        }
    }

    calculateTDEE(bmr) {
        if (!bmr) return null;
        return bmr * (this.profile.activityLevel || 1.55);
    }

    calculateProgress() {
        if (!this.target.weight || !this.profile.startingWeight) return 0;
        
        const currentWeight = this.getCurrentWeight();
        if (!currentWeight) return 0;

        const totalToLose = this.profile.startingWeight - this.target.weight;
        const lostSoFar = this.profile.startingWeight - currentWeight;
        
        if (totalToLose <= 0) return 0;
        
        const progress = (lostSoFar / totalToLose) * 100;
        return Math.max(0, Math.min(100, progress));
    }

    isOnTrack() {
        if (!this.target.weight || !this.target.date || !this.profile.startingWeight) return null;
        
        const currentWeight = this.getCurrentWeight();
        if (!currentWeight) return null;

        const startDate = new Date(this.target.setDate || Date.now());
        const targetDate = new Date(this.target.date);
        const today = new Date();
        
        const totalDays = (targetDate - startDate) / (1000 * 60 * 60 * 24);
        const daysElapsed = (today - startDate) / (1000 * 60 * 60 * 24);
        
        if (totalDays <= 0) return null;
        
        const expectedProgress = (daysElapsed / totalDays) * 100;
        const actualProgress = this.calculateProgress();
        
        return actualProgress >= expectedProgress - 5; // 5% tolerance
    }

    calculateDaysLeft(targetDate) {
        const target = new Date(targetDate);
        const today = new Date();
        const diff = target - today;
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    // ========== DASHBOARD UPDATE ==========
    updateDashboard() {
        this.updateCurrentStats();
        this.updateHealthStats();
        this.updateCharts();
        this.updateWeeklySummary();
    }

    updateCurrentStats() {
        const currentWeight = this.getCurrentWeight();
        document.getElementById('currentWeight').textContent = currentWeight ? currentWeight.toFixed(1) : '--';
        document.getElementById('targetWeight').textContent = this.target.weight ? this.target.weight.toFixed(1) : '--';

        // Progress
        const progress = this.calculateProgress();
        document.getElementById('progressPercent').textContent = `${Math.round(progress)}%`;
        
        // Animate progress ring
        const circle = document.getElementById('progressCircle');
        const circumference = 2 * Math.PI * 52;
        const offset = circumference - (progress / 100) * circumference;
        circle.style.strokeDashoffset = offset;

        // Track status
        const statusEl = document.getElementById('trackStatus');
        const daysLeftEl = document.getElementById('daysLeft');
        const onTrack = this.isOnTrack();
        
        if (onTrack === null) {
            statusEl.innerHTML = `
                <span class="status-icon">📊</span>
                <span class="status-text">Set target & profile</span>
            `;
            daysLeftEl.textContent = '';
        } else if (onTrack) {
            statusEl.innerHTML = `
                <span class="status-icon">✅</span>
                <span class="status-text" style="color: var(--success-color);">On Track!</span>
            `;
            daysLeftEl.textContent = `${this.calculateDaysLeft(this.target.date)} days remaining`;
        } else {
            statusEl.innerHTML = `
                <span class="status-icon">⚠️</span>
                <span class="status-text" style="color: var(--warning-color);">Behind Schedule</span>
            `;
            daysLeftEl.textContent = `${this.calculateDaysLeft(this.target.date)} days remaining`;
        }
    }

    updateHealthStats() {
        const currentWeight = this.getCurrentWeight();
        const bmi = this.calculateBMI(currentWeight);
        const bmiData = this.getBMICategory(bmi);
        const bmr = this.calculateBMR(currentWeight);
        const tdee = this.calculateTDEE(bmr);

        // BMI
        document.getElementById('bmiValue').textContent = bmi ? bmi.toFixed(1) : '--';
        const bmiCategoryEl = document.getElementById('bmiCategory');
        bmiCategoryEl.textContent = bmiData.category;
        bmiCategoryEl.className = `bmi-category ${bmiData.class}`;

        // BMI Indicator position (scale: 15-40)
        const bmiIndicator = document.getElementById('bmiIndicator');
        if (bmi) {
            const position = Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100));
            bmiIndicator.style.left = `${position}%`;
            bmiIndicator.style.display = 'block';
        } else {
            bmiIndicator.style.display = 'none';
        }

        // Update activity assumption text
        const activityLevel = this.profile.activityLevel || 1.55;
        const activityLabels = {
            '1.2': 'Sedentary (little or no exercise)',
            '1.375': 'Light activity (1-3 days/week, ~20 min/session)',
            '1.55': 'Moderate activity (3-5 days/week, ~30 min/session)',
            '1.725': 'Active (6-7 days/week, ~45 min/session)',
            '1.9': 'Very active (hard exercise daily, ~60+ min)'
        };
        const assumptionEl = document.getElementById('calorieAssumption');
        if (assumptionEl) {
            assumptionEl.textContent = `Based on: ${activityLabels[activityLevel.toString()] || 'Moderate activity'}`;
        }

        // Calories - weight loss options
        // 1 kg fat ≈ 7700 calories, so:
        // 0.5 kg/week = 3850 cal/week = 550 cal/day deficit
        // 1 kg/week = 7700 cal/week = 1100 cal/day deficit
        // 1.5 kg/week = 11550 cal/week = 1650 cal/day deficit  
        document.getElementById('tdeeValue').textContent = tdee ? `${Math.round(tdee)} cal` : '--';
        document.getElementById('loss05').textContent = tdee ? `${Math.round(tdee - 550)} cal` : '--';
        document.getElementById('loss10').textContent = tdee ? `${Math.round(tdee - 1100)} cal` : '--';
        document.getElementById('loss15').textContent = tdee ? `${Math.round(tdee - 1650)} cal` : '--';
    }

    // ========== CHARTS ==========
    updateCharts() {
        this.updateWeightChart();
        this.updateBMIChart();
        this.updateActivityChart();
        this.updateHabitsChart();
    }

    getLast30DaysLogs() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        return this.logs
            .filter(log => new Date(log.date) >= thirtyDaysAgo)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    updateWeightChart() {
        const ctx = document.getElementById('weightChart').getContext('2d');
        const logs = this.getLast30DaysLogs();

        if (this.charts.weight) {
            this.charts.weight.destroy();
        }

        if (logs.length === 0) {
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText('No data yet. Start logging!', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        const labels = logs.map(log => this.formatDate(log.date));
        const data = logs.map(log => log.weight);

        this.charts.weight = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Weight (kg)',
                    data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, this.target.weight ? {
                    label: 'Target',
                    data: Array(labels.length).fill(this.target.weight),
                    borderColor: '#22c55e',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                } : null].filter(Boolean)
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#94a3b8' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    },
                    y: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    }
                }
            }
        });
    }

    updateBMIChart() {
        const ctx = document.getElementById('bmiChart').getContext('2d');
        const logs = this.getLast30DaysLogs();

        if (this.charts.bmi) {
            this.charts.bmi.destroy();
        }

        if (logs.length === 0 || !this.profile.height) {
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText('Set your height in profile', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        const labels = logs.map(log => this.formatDate(log.date));
        const data = logs.map(log => this.calculateBMI(log.weight));

        this.charts.bmi = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'BMI',
                    data,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, {
                    label: 'Normal Range',
                    data: Array(labels.length).fill(24.9),
                    borderColor: '#22c55e',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#94a3b8' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    },
                    y: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        suggestedMin: 15,
                        suggestedMax: 35
                    }
                }
            }
        });
    }

    updateActivityChart() {
        const ctx = document.getElementById('activityChart').getContext('2d');
        const logs = this.getLast30DaysLogs();

        if (this.charts.activity) {
            this.charts.activity.destroy();
        }

        const activityCounts = {
            gym: logs.filter(l => l.activity === 'gym' || l.activity === 'both').length,
            walk: logs.filter(l => l.activity === 'walk' || l.activity === 'both').length,
            both: logs.filter(l => l.activity === 'both').length,
            none: logs.filter(l => l.activity === 'none').length
        };

        this.charts.activity = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['🏋️ Gym', '🚶 Walk', '💪 Both', '❌ None'],
                datasets: [{
                    data: [activityCounts.gym, activityCounts.walk, activityCounts.both, activityCounts.none],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(148, 163, 184, 0.4)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', padding: 20 }
                    }
                }
            }
        });
    }

    updateHabitsChart() {
        const ctx = document.getElementById('habitsChart').getContext('2d');
        const logs = this.getLast30DaysLogs();

        if (this.charts.habits) {
            this.charts.habits.destroy();
        }

        const totalDays = logs.length || 1;
        const stats = {
            goodSleep: logs.filter(l => l.sleep === 'yes').length,
            noJunk: logs.filter(l => l.noJunk === 'yes').length,
            active: logs.filter(l => l.activity && l.activity !== 'none').length
        };

        this.charts.habits = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['😴 Good Sleep', '🥗 No Junk', '🏃 Active Days'],
                datasets: [{
                    label: 'Days',
                    data: [stats.goodSleep, stats.noJunk, stats.active],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        beginAtZero: true,
                        max: Math.max(totalDays, 10)
                    }
                }
            }
        });
    }

    updateWeeklySummary() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const weekLogs = this.logs.filter(log => new Date(log.date) >= sevenDaysAgo);
        
        // Weight change
        let weightChange = '--';
        if (weekLogs.length >= 2) {
            const sortedLogs = [...weekLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
            const change = sortedLogs[sortedLogs.length - 1].weight - sortedLogs[0].weight;
            const sign = change > 0 ? '+' : '';
            weightChange = `${sign}${change.toFixed(1)} kg`;
        }

        document.getElementById('weeklyWeightChange').textContent = weightChange;
        document.getElementById('weeklyGym').textContent = `${weekLogs.filter(l => l.activity === 'gym' || l.activity === 'both').length}/7`;
        document.getElementById('weeklyWalk').textContent = `${weekLogs.filter(l => l.activity === 'walk' || l.activity === 'both').length}/7`;
        document.getElementById('weeklySleep').textContent = `${weekLogs.filter(l => l.sleep === 'yes').length}/7`;
        document.getElementById('weeklyNoJunk').textContent = `${weekLogs.filter(l => l.noJunk === 'yes').length}/7`;
    }

    // ========== HISTORY ==========
    setupHistoryControls() {
        document.getElementById('historySearch').addEventListener('input', () => this.renderHistory());
        document.getElementById('historyFilter').addEventListener('change', () => this.renderHistory());
    }

    renderHistory() {
        const tbody = document.getElementById('historyTableBody');
        const search = document.getElementById('historySearch').value.toLowerCase();
        const filter = document.getElementById('historyFilter').value;

        let filteredLogs = [...this.logs];

        // Apply filter
        const now = new Date();
        if (filter === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filteredLogs = filteredLogs.filter(log => new Date(log.date) >= weekAgo);
        } else if (filter === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filteredLogs = filteredLogs.filter(log => new Date(log.date) >= monthAgo);
        } else if (filter === 'gym') {
            filteredLogs = filteredLogs.filter(log => log.activity === 'gym' || log.activity === 'both');
        } else if (filter === 'walk') {
            filteredLogs = filteredLogs.filter(log => log.activity === 'walk' || log.activity === 'both');
        }

        // Apply search
        if (search) {
            filteredLogs = filteredLogs.filter(log => 
                log.date.includes(search) || 
                (log.notes && log.notes.toLowerCase().includes(search))
            );
        }

        if (filteredLogs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <p>No entries found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredLogs.map(log => `
            <tr>
                <td>${this.formatDate(log.date)}</td>
                <td><strong>${log.weight || '-'} ${log.weight ? 'kg' : ''}</strong></td>
                <td><span class="badge ${log.activity || 'empty'}">${this.getActivityLabel(log.activity)}</span></td>
                <td><span class="badge ${log.sleep || 'empty'}">${log.sleep === 'yes' ? '✓ Yes' : (log.sleep === 'no' ? '✗ No' : '-')}</span></td>
                <td><span class="badge ${log.noJunk || 'empty'}">${log.noJunk === 'yes' ? '✓ Yes' : (log.noJunk === 'no' ? '✗ No' : '-')}</span></td>
                <td>${log.notes || '-'}</td>
                <td><button class="delete-btn" onclick="tracker.deleteLog(${log.id})">🗑️</button></td>
            </tr>
        `).join('');
    }

    getActivityLabel(activity) {
        if (!activity) return '-';
        const labels = {
            none: '❌ None',
            gym: '🏋️ Gym',
            walk: '🚶 Walk',
            both: '💪 Both'
        };
        return labels[activity] || activity;
    }

    // ========== UTILITIES ==========
    getLocalDateString(date = new Date()) {
        // Get local date in YYYY-MM-DD format (not UTC)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatDateLong(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    exportData() {
        if (this.logs.length === 0) {
            this.showToast('No data to export', 'error');
            return;
        }

        const headers = ['Date', 'Weight (kg)', 'Activity', 'Sleep >6h', 'No Junk', 'Notes'];
        const rows = this.logs.map(log => [
            log.date,
            log.weight,
            log.activity,
            log.sleep,
            log.noJunk,
            log.notes || ''
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `weight-tracker-${this.getLocalDateString()}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Data exported successfully!', 'success');
    }

    clearAllData() {
        this.logs = [];
        this.profile = {};
        this.target = {};
        this.pastTargets = [];
        
        localStorage.removeItem('weightLogs');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('weightTarget');
        localStorage.removeItem('pastTargets');
        
        // Reset forms
        document.getElementById('dailyLogForm').reset();
        document.getElementById('targetForm').reset();
        document.getElementById('profileForm').reset();
        
        this.updateDashboard();
        this.renderHistory();
        this.updateProfileSummary();
        this.updateTargetPage();
        this.setDefaultDate();
        
        this.showToast('All data cleared', 'info');
    }
}

// Initialize the tracker
const tracker = new WeightTracker();
