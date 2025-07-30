// LeetCode Problems Tracker JavaScript

class LeetCodeTracker {
    constructor() {
        this.problems = [];
        this.groupedProblems = {};
        this.currentFilter = 'all';
        this.searchQuery = '';
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadProblems();
            this.setupEventListeners();
            this.hideLoadingSpinner();
            this.renderProblems();
            this.updateStats();
        } catch (error) {
            console.error('Error initializing LeetCode Tracker:', error);
            this.hideLoadingSpinner();
            this.showError('Failed to load problems. Please try again later.');
        }
    }
    
    async loadProblems() {
        try {
            const response = await fetch('leetcode_problems.csv');
            const csvText = await response.text();
            this.parseCSV(csvText);
        } catch (error) {
            console.error('Error loading CSV:', error);
            throw error;
        }
    }
    
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        
        // Skip header lines and find the actual data start
        let dataStartIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('Topic,Title,LeetCode Link')) {
                dataStartIndex = i + 1;
                break;
            }
        }
        
        this.problems = [];
        this.groupedProblems = {};
        
        for (let i = dataStartIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = this.parseCSVLine(line);
            if (columns.length >= 4 && columns[0] && columns[1]) {
                const problem = {
                    topic: columns[0],
                    title: columns[1],
                    url: columns[2],
                    problem: columns[3],
                    id: this.generateId(columns[1])
                };
                
                this.problems.push(problem);
                
                // Group problems by topic
                if (!this.groupedProblems[problem.topic]) {
                    this.groupedProblems[problem.topic] = [];
                }
                this.groupedProblems[problem.topic].push(problem);
            }
        }
    }
    
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }
    
    generateId(title) {
        return title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }
    
    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderProblems();
                this.updateStats();
            });
        });
        
        // Search input
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderProblems();
        });
        
        // Hamburger menu (from main site)
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
            
            // Close menu when clicking on a nav link
            document.querySelectorAll('.nav-menu a').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                });
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            });
        }
        
        // Add smooth scrolling for any anchor links
        this.setupSmoothScrolling();
    }
    
    renderProblems() {
        const container = document.getElementById('problems-container');
        container.innerHTML = '';
        
        const filteredTopics = this.getFilteredTopics();
        
        if (Object.keys(filteredTopics).length === 0) {
            container.innerHTML = '<div class="no-results"><h3>No problems found</h3><p>Try adjusting your search or filter criteria.</p></div>';
            return;
        }
        
        Object.entries(filteredTopics).forEach(([topic, problems]) => {
            const topicElement = this.createTopicElement(topic, problems);
            container.appendChild(topicElement);
        });
    }
    
    getFilteredTopics() {
        const filteredTopics = {};
        
        Object.entries(this.groupedProblems).forEach(([topic, problems]) => {
            const filteredProblems = problems.filter(problem => {
                const matchesSearch = this.searchQuery === '' || 
                    problem.title.toLowerCase().includes(this.searchQuery) ||
                    problem.topic.toLowerCase().includes(this.searchQuery);
                
                const matchesFilter = this.currentFilter === 'all' ||
                    (this.currentFilter === 'solved' && this.isSolved(problem.id)) ||
                    (this.currentFilter === 'unsolved' && !this.isSolved(problem.id)) ||
                    (this.currentFilter === 'bookmarked' && this.isBookmarked(problem.id));
                
                return matchesSearch && matchesFilter;
            });
            
            if (filteredProblems.length > 0) {
                filteredTopics[topic] = filteredProblems;
            }
        });
        
        return filteredTopics;
    }
    
    createTopicElement(topic, problems) {
        const topicDiv = document.createElement('div');
        topicDiv.className = 'topic-group';
        
        const solvedCount = problems.filter(p => this.isSolved(p.id)).length;
        const completionPercentage = problems.length > 0 ? Math.round((solvedCount / problems.length) * 100) : 0;
        
        topicDiv.innerHTML = `
            <div class="topic-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <div class="topic-title">
                    <i class="fas fa-folder"></i>
                    ${topic}
                    <span class="topic-count">${solvedCount}/${problems.length} (${completionPercentage}%)</span>
                </div>
                <i class="fas fa-chevron-down topic-toggle"></i>
            </div>
            <div class="problems-list">
                ${problems.map(problem => this.createProblemElement(problem)).join('')}
            </div>
        `;
        
        return topicDiv;
    }
    
    createProblemElement(problem) {
        const isSolved = this.isSolved(problem.id);
        const isBookmarked = this.isBookmarked(problem.id);
        
        return `
            <div class="problem-item ${isSolved ? 'solved' : ''} ${isBookmarked ? 'bookmarked' : ''}" data-id="${problem.id}">
                <div class="problem-info">
                    <a href="${problem.url}" target="_blank" class="problem-title">
                        ${problem.title}
                    </a>
                </div>
                <div class="problem-actions">
                    <button 
                        class="action-btn solve-btn ${isSolved ? 'solved' : ''}" 
                        title="${isSolved ? 'Mark as unsolved' : 'Mark as solved'}"
                        onclick="leetcodeTracker.toggleSolved('${problem.id}')"
                    >
                        <i class="fas ${isSolved ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </button>
                    <button 
                        class="action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" 
                        title="${isBookmarked ? 'Remove bookmark' : 'Add bookmark'}"
                        onclick="leetcodeTracker.toggleBookmark('${problem.id}')"
                    >
                        <i class="fas ${isBookmarked ? 'fa-star' : 'fa-star'}" style="color: ${isBookmarked ? '#ffc107' : '#ccc'}"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    toggleSolved(problemId) {
        const solved = this.getSolvedProblems();
        if (solved.includes(problemId)) {
            const index = solved.indexOf(problemId);
            solved.splice(index, 1);
        } else {
            solved.push(problemId);
        }
        
        localStorage.setItem('leetcode-solved', JSON.stringify(solved));
        this.updateProblemElement(problemId);
        this.updateStats();
        
        // If current filter is solved/unsolved, re-render to update visibility
        if (this.currentFilter === 'solved' || this.currentFilter === 'unsolved') {
            this.renderProblems();
        }
    }
    
    toggleBookmark(problemId) {
        const bookmarked = this.getBookmarkedProblems();
        if (bookmarked.includes(problemId)) {
            const index = bookmarked.indexOf(problemId);
            bookmarked.splice(index, 1);
        } else {
            bookmarked.push(problemId);
        }
        
        localStorage.setItem('leetcode-bookmarked', JSON.stringify(bookmarked));
        this.updateProblemElement(problemId);
        this.updateStats();
        
        // If current filter is bookmarked, re-render to update visibility
        if (this.currentFilter === 'bookmarked') {
            this.renderProblems();
        }
    }
    
    updateProblemElement(problemId) {
        const problemElement = document.querySelector(`[data-id="${problemId}"]`);
        if (!problemElement) return;
        
        const isSolved = this.isSolved(problemId);
        const isBookmarked = this.isBookmarked(problemId);
        
        // Update classes
        problemElement.className = `problem-item ${isSolved ? 'solved' : ''} ${isBookmarked ? 'bookmarked' : ''}`;
        
        // Update solve button
        const solveBtn = problemElement.querySelector('.solve-btn');
        const solveIcon = solveBtn.querySelector('i');
        solveBtn.className = `action-btn solve-btn ${isSolved ? 'solved' : ''}`;
        solveBtn.title = isSolved ? 'Mark as unsolved' : 'Mark as solved';
        solveIcon.className = `fas ${isSolved ? 'fa-check-circle' : 'fa-circle'}`;
        
        // Update bookmark button
        const bookmarkBtn = problemElement.querySelector('.bookmark-btn');
        const bookmarkIcon = bookmarkBtn.querySelector('i');
        bookmarkBtn.className = `action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`;
        bookmarkBtn.title = isBookmarked ? 'Remove bookmark' : 'Add bookmark';
        bookmarkIcon.style.color = isBookmarked ? '#ffc107' : '#ccc';
        
        // Update topic header counts
        this.updateTopicCounts();
    }
    
    updateTopicCounts() {
        document.querySelectorAll('.topic-group').forEach(topicGroup => {
            const problems = topicGroup.querySelectorAll('.problem-item');
            const solvedProblems = topicGroup.querySelectorAll('.problem-item.solved');
            const total = problems.length;
            const solved = solvedProblems.length;
            const percentage = total > 0 ? Math.round((solved / total) * 100) : 0;
            
            const countElement = topicGroup.querySelector('.topic-count');
            if (countElement) {
                countElement.textContent = `${solved}/${total} (${percentage}%)`;
            }
        });
    }
    
    updateStats() {
        const totalProblems = this.problems.length;
        const solvedProblems = this.getSolvedProblems().length;
        const bookmarkedProblems = this.getBookmarkedProblems().length;
        const completionPercentage = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0;
        
        document.getElementById('total-problems').textContent = totalProblems;
        document.getElementById('solved-problems').textContent = solvedProblems;
        document.getElementById('bookmarked-problems').textContent = bookmarkedProblems;
        document.getElementById('completion-percentage').textContent = `${completionPercentage}%`;
    }
    
    getSolvedProblems() {
        const solved = localStorage.getItem('leetcode-solved');
        return solved ? JSON.parse(solved) : [];
    }
    
    getBookmarkedProblems() {
        const bookmarked = localStorage.getItem('leetcode-bookmarked');
        return bookmarked ? JSON.parse(bookmarked) : [];
    }
    
    isSolved(problemId) {
        return this.getSolvedProblems().includes(problemId);
    }
    
    isBookmarked(problemId) {
        return this.getBookmarkedProblems().includes(problemId);
    }
    
    hideLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }
    }
    
    showError(message) {
        const container = document.getElementById('problems-container');
        container.innerHTML = `
            <div class="error-message">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
    
    setupSmoothScrolling() {
        // Add smooth scrolling behavior to the html element
        document.documentElement.style.scrollBehavior = 'smooth';
        
        // Handle anchor links with offset for fixed header
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    const header = document.querySelector('header');
                    const headerHeight = header ? header.offsetHeight : 80;
                    const targetPosition = targetSection.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// Initialize the tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.leetcodeTracker = new LeetCodeTracker();
});

// Add some additional CSS for error and no results states
const additionalStyles = `
    .no-results, .error-message {
        text-align: center;
        padding: 60px 20px;
        background: var(--white);
        border-radius: var(--border-radius);
        box-shadow: var(--shadow);
        margin: 20px 0;
    }
    
    .no-results h3, .error-message h3 {
        color: var(--primary-color);
        margin-bottom: 16px;
        font-size: 1.5rem;
    }
    
    .no-results p, .error-message p {
        color: var(--dark-gray);
        font-size: 1.1rem;
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
