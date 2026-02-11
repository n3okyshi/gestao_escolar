const fs = require('fs');
const vm = require('vm');

// --- Mock Environment ---

const mockList = {
    children: [],
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(val) {
        this._innerHTML = val;
        if (val === '') this.children = []; // Basic clearing
    },
    appendChild: function(child) {
        this.children.push(child);
    },
    get firstElementChild() {
        return this.children[0] || null;
    },
    replaceChildren: function(...nodes) {
        this.children = nodes;
    },
    dataset: {},
    addEventListener: () => {},
    // Specialized querySelector for benchmark to work with list listeners?
    // No, list listeners are attached to 'list'.
};

// Mock Element
class Element {
    constructor(tagName) {
        this.tagName = tagName ? tagName.toUpperCase() : 'DIV';
        this.children = [];
        this.classList = {
            _classes: new Set(),
            add: function(cls) {
                cls.split(' ').forEach(c => this._classes.add(c));
                this.updateClassName();
            },
            remove: function(cls) {
                cls.split(' ').forEach(c => this._classes.delete(c));
                this.updateClassName();
            },
            contains: function(cls) { return this._classes.has(cls); },
            updateClassName: function() { this.className = Array.from(this._classes).join(' '); }
        };
        this.className = '';
        this.style = {};
        this.dataset = {};
        this.id = '';
        this.listeners = {};
        this._innerHTML = '';
        this._innerText = '';
    }

    appendChild(child) {
        this.children.push(child);
    }

    get innerHTML() { return this._innerHTML; }
    set innerHTML(val) { this._innerHTML = val; }

    get innerText() { return this._innerText; }
    set innerText(val) { this._innerText = val; }

    querySelector(selector) {
        // Return a dummy element to prevent crashes
        // In optimized code: el.querySelector('.alloc-toggle-btn')
        return new Element('div');
    }

    addEventListener(event, callback) {
        this.listeners[event] = callback;
    }

    remove() {
        // Since we don't have parent pointer in this simple mock, we can't remove self from parent.
        // But the benchmark just calls renderAllocations, which clears existingNodes from map.
    }

    closest(selector) {
        // Very basic mock
        if (this.classList.contains(selector.replace('.', ''))) return this;
        return null;
    }

    get firstElementChild() {
        return this.children[0] || null;
    }
}

global.document = {
    getElementById: (id) => {
        if (id === 'allocationsList') return mockList;
        return new Element('div');
    },
    createElement: (tag) => new Element(tag),
    createDocumentFragment: () => ({
        children: [],
        appendChild: function(child) {
             // In real DOM fragment moves children. Here we act like list wrapper?
             // But in my optimized code: list.appendChild(el). I don't use fragment appendChild heavily except...
             // Wait, in my optimized code I replaced fragment usage with direct list.appendChild(el) inside loop?
             // Let's check code. Yes: list.appendChild(el);
             // Ah, I declared `const fragment = document.createDocumentFragment();` but didn't use it!
             // That's fine.
        }
    }),
    querySelectorAll: () => [],
    addEventListener: () => {}
};

global.window = {
    onload: null
};

global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

global.lucide = {
    createIcons: () => {}
};

global.showToast = (msg) => {};
global.updateDashboard = () => {};
global.escapeHTML = (str) => str; // Simple mock

// --- Load Source Code ---
let code = fs.readFileSync('js/complete.js', 'utf8');

// Hack to ensure 'allocations' is accessible globally or populated correctly
code = code.replace('let allocations = [];', 'global.allocations = [];');
code = code.replace('let classes = [];', 'global.classes = [];');

// Run code
vm.runInThisContext(code);

// --- Setup Benchmark Data ---

// Create 2000 allocations
global.allocations = [];
for (let i = 0; i < 2000; i++) {
    global.allocations.push({
        id: i,
        class: `TURMA ${Math.floor(i / 50)}`,
        subject: `MATERIA ${i % 10}`,
        teacher: `PROFESSOR ${i % 20}`,
        count: 2,
        active: true,
        bgColor: '#abcdef',
        color: '#abcdef'
    });
}

// --- Run Benchmark ---

console.log('Starting Benchmark (Optimized)...');
const start = process.hrtime();

const ITERATIONS = 100;
for (let i = 0; i < ITERATIONS; i++) {
    renderAllocations();
}

const end = process.hrtime(start);
const timeInMs = (end[0] * 1000 + end[1] / 1e6);

console.log(`Executed ${ITERATIONS} renders in ${timeInMs.toFixed(2)}ms`);
console.log(`Average: ${(timeInMs / ITERATIONS).toFixed(4)}ms per render`);

// Verify Output
if (mockList.children.length > 0) {
    console.log(`Render output detected (children). Count: ${mockList.children.length}`);
} else if (mockList.innerHTML.length > 0) {
     console.log(`Render output detected (innerHTML). Length: ${mockList.innerHTML.length}`);
} else {
    console.error('Render output empty (failure). Allocations count:', global.allocations.length);
}
