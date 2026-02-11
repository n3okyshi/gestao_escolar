// =================================================================
// 1. DADOS GLOBAIS E CONFIGURAÇÕES
// =================================================================

const defaultSubjects = {
    // Campos de Experiência
    'infantil': [
        { name: "O eu, o outro e o nós", color: "#4f46e5", count: 5 },
        { name: "Corpo, gestos e movimentos", color: "#0891b2", count: 5 },
        { name: "Traços, sons, cores e formas", color: "#db2777", count: 5 },
        { name: "Escuta, fala, pensamento e imaginação", color: "#7c3aed", count: 5 },
        { name: "Espaços, tempos, quantidades, relações e transformações", color: "#059669", count: 5 }
    ],

    // Fundamental 1 (Sem Inglês)
    'fund1': [
        { name: "Língua Portuguesa", color: "#2563eb", count: 5 },
        { name: "Matemática", color: "#dc2626", count: 5 },
        { name: "Ciências", color: "#16a34a", count: 5 },
        { name: "História", color: "#9333ea", count: 5 },
        { name: "Geografia", color: "#ca8a04", count: 5 },
        { name: "Arte", color: "#db2777", count: 5 },
        { name: "Educação Física", color: "#ea580c", count: 5 },
        { name: "Ensino Religioso", color: "#0d9488", count: 5 }
    ],

    // Fundamental 2 (Inclui Inglês)
    'fund2': [
        { name: "Língua Portuguesa", color: "#2563eb", count: 5 },
        { name: "Matemática", color: "#dc2626", count: 5 },
        { name: "Ciências", color: "#16a34a", count: 3 },
        { name: "História", color: "#9333ea", count: 3 },
        { name: "Geografia", color: "#ca8a04", count: 3 },
        { name: "Arte", color: "#db2777", count: 1 },
        { name: "Educação Física", color: "#ea580c", count: 2 },
        { name: "Língua Inglesa", color: "#475569", count: 2 },
        { name: "Ensino Religioso", color: "#0d9488", count: 1 }
    ],

    // Ensino Médio (Áreas + Componentes Específicos)
    'medio': [
        // Áreas de Conhecimento (Agrupadores)
        { name: "Linguagens e suas Tecnologias", color: "#2563eb", count: 0 },
        { name: "Matemática e suas Tecnologias", color: "#dc2626", count: 0 },
        { name: "Ciências da Natureza e suas Tecnologias", color: "#16a34a", count: 0 },
        { name: "Ciências Humanas e Sociais Aplicadas", color: "#9333ea", count: 0 },

        // Componentes Curriculares Específicos
        { name: "Língua Portuguesa", color: "#2563eb", count: 5 },
        { name: "Língua Inglesa", color: "#475569", count: 2 },
        { name: "Arte", color: "#db2777", count: 1 },
        { name: "Educação Física", color: "#ea580c", count: 2 },
        { name: "Matemática", color: "#dc2626", count: 5 },
        { name: "Biologia", color: "#16a34a", count: 3 },
        { name: "Física", color: "#16a34a", count: 3 },
        { name: "Química", color: "#16a34a", count: 3 },
        { name: "História", color: "#9333ea", count: 3 },
        { name: "Geografia", color: "#9333ea", count: 2 },
        { name: "Filosofia", color: "#9333ea", count: 1 },
        { name: "Sociologia", color: "#9333ea", count: 1 }
    ]
};

let classes = [];
let allocations = [];
let currentMatrix = [];
let lockedCells = {};
let teacherConstraints = JSON.parse(localStorage.getItem('teacherConstraints')) || {};
let resourceLimits = JSON.parse(localStorage.getItem('resourceLimits')) || {};
let printSettings = { name: 'Escola Modelo', sub: 'Horário 2026', logo: '' };
let teacherRegistry = [];
let subjectsRegistry = [];

let currentSchedule = {};
let conflictMemory = {};
let historyStack = [];
let isGenerating = false;
let attempts = 0;

const globalDays = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA'];
let globalSlotsPerDay = 5;

let modalTarget = { day: null, slot: null, cls: null };
let dragSourceData = null;
let editingTeacherAv = null;
let tempConstraints = {};
let currentEditingTeacherId = null;

// =================================================================
// 2. INICIALIZAÇÃO
// =================================================================

window.onload = function () {
    loadData();
    initSubjectSystem();
    initTeacherSystem();

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            performUndo();
        }
    });

    const slotsInput = document.getElementById('slotsPerDay');
    if (slotsInput) {
        slotsInput.addEventListener('change', function () {
            let val = parseInt(this.value);
            if (!val || val < 1) { val = 5; this.value = 5; }
            globalSlotsPerDay = val;
            initEmptySchedule();
            renderCurrentSchedule();
            saveData();
        });
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();

    const principalGroup = document.getElementById('group-principal');
    if (principalGroup) {
        principalGroup.style.maxHeight = principalGroup.scrollHeight + "px";
        const icon = document.querySelector('.group-principal-icon');
        if (icon) {
            icon.classList.add('rotate-90');
            icon.style.transform = 'rotate(90deg)';
        }
    }

    updateDashboard();
};

// =================================================================
// 3. FUNÇÕES AUXILIARES GLOBAIS
// =================================================================

function applyPrintSettings() {
    const elName = document.getElementById('printSchoolName');
    const elSub = document.getElementById('printSchoolSub');
    const elImg = document.getElementById('printLogoImg');

    if (elName) elName.innerText = printSettings.name || 'Escola Modelo';
    if (elSub) elSub.innerText = printSettings.sub || 'Horário Escolar';

    if (elImg) {
        if (printSettings.logo) {
            elImg.src = printSettings.logo;
            elImg.style.display = 'block';
        } else {
            elImg.style.display = 'none';
        }
    }
}

function toggleLock(dayName, slotIndex, schoolClass, event) {
    if (event) event.stopPropagation();
    recordHistory();

    const lockKey = `${dayName}-${slotIndex}-${schoolClass}`;

    if (!currentSchedule[dayName] || !currentSchedule[dayName][slotIndex] || !currentSchedule[dayName][slotIndex][schoolClass]) {
        return;
    }

    if (lockedCells[lockKey]) {
        delete lockedCells[lockKey];
        showToast("Aula destravada.", "info");
    } else {
        const content = currentSchedule[dayName][slotIndex][schoolClass];
        if (content) {
            lockedCells[lockKey] = content;
            showToast("Aula travada.", "success");
        }
    }

    renderCurrentSchedule();
    saveData();
}

function handleEnter(e, func) {
    if (e.key === 'Enter') func();
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 65%, 85%)`;
}

function getContrastYIQ(hslStr) {
    return '#1e293b';
}

function getRandomColor() {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// =================================================================
// 4. PERSISTÊNCIA (LOAD/SAVE)
// =================================================================

function saveData() {
    const slotsVal = parseInt(document.getElementById('slotsPerDay')?.value) || 5;
    const levelVal = document.getElementById('schoolLevel')?.value || 'fund2';

    const data = {
        classes,
        allocations,
        lockedCells,
        teacherConstraints,
        resourceLimits,
        printSettings,
        slotsPerDay: slotsVal,
        schoolLevel: levelVal,
        version: '2.1'
    };

    try {
        localStorage.setItem('gestorEscolarV21', JSON.stringify(data));
        localStorage.setItem('teacherConstraints', JSON.stringify(teacherConstraints));
        localStorage.setItem('resourceLimits', JSON.stringify(resourceLimits));
    } catch (e) {
        showToast("Erro ao salvar: LocalStorage cheio.", "error");
    }
}

function loadData() {
    const saved = localStorage.getItem('gestorEscolarV21');

    if (saved) {
        try {
            const data = JSON.parse(saved);

            classes = Array.isArray(data.classes) ? data.classes : [];
            allocations = Array.isArray(data.allocations) ? data.allocations : [];
            lockedCells = data.lockedCells || {};
            printSettings = data.printSettings || { name: 'Escola Modelo', sub: '', logo: '' };

            const savedConstraints = localStorage.getItem('teacherConstraints');
            if (savedConstraints) teacherConstraints = JSON.parse(savedConstraints);
            else teacherConstraints = data.teacherConstraints || {};

            const savedResources = localStorage.getItem('resourceLimits');
            if (savedResources) resourceLimits = JSON.parse(savedResources);
            else resourceLimits = data.resourceLimits || {};

            if (data.slotsPerDay && document.getElementById('slotsPerDay'))
                document.getElementById('slotsPerDay').value = data.slotsPerDay;
            if (data.schoolLevel && document.getElementById('schoolLevel'))
                document.getElementById('schoolLevel').value = data.schoolLevel;

            initEmptySchedule();
            updateCurriculumMatrix();
            renderClasses();
            renderAllocations();
            applyPrintSettings();

            for (let key in lockedCells) {
                const parts = key.split('-');
                if (parts.length >= 3) {
                    const d = parts[0];
                    const s = parseInt(parts[1]);
                    const cls = parts.slice(2).join('-');

                    if (currentSchedule[d] && currentSchedule[d][s]) {
                        if (classes.includes(cls)) {
                            currentSchedule[d][s][cls] = lockedCells[key];
                        } else {
                            delete lockedCells[key];
                        }
                    }
                }
            }

            renderCurrentSchedule();
            updateDashboard();
            showToast("Dados carregados.", "success");

        } catch (e) {
            console.error("Erro no loadData:", e);
            showToast("Erro ao carregar dados. Resetando.", "error");
            initDefaults();
        }
    } else {
        initDefaults();
    }
}

function initDefaults() {
    updateCurriculumMatrix();
    initEmptySchedule();
}

function resetAllData() {
    if (confirm("ATENÇÃO: Apagar TODOS os dados?")) {
        localStorage.removeItem('gestorEscolarV21');
        localStorage.removeItem('teacherConstraints');
        localStorage.removeItem('resourceLimits');
        localStorage.removeItem('teacherRegistry');
        localStorage.removeItem('subjectsRegistry');
        location.reload();
    }
}

function exportData() {
    saveData();
    const dataStr = localStorage.getItem('gestorEscolarV21');
    if (!dataStr) return;

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_escolar_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            JSON.parse(e.target.result);
            localStorage.setItem('gestorEscolarV21', e.target.result);
            showToast("Backup restaurado!", "success");
            setTimeout(() => location.reload(), 1000);
        } catch (err) {
            showToast("Arquivo inválido.", "error");
        }
    };
    reader.readAsText(file);
}

// =================================================================
// 5. NAVEGAÇÃO E INTERFACE (UI)
// =================================================================

function navigateTo(viewId) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('bg-white/10', 'text-white'));

    const target = document.getElementById('view-' + viewId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';

        if (viewId === 'schedule') renderCurrentSchedule();
        if (viewId === 'dashboard') updateDashboard();
    }
}

function navigateToConfig(target) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    const configTabs = ['teachers', 'subjects', 'classes'];

    if (configTabs.includes(target)) {
        document.getElementById('view-config').classList.remove('hidden');
        switchConfigTab(target);
    } else {
        const viewEl = document.getElementById(`view-${target}`);
        if (viewEl) viewEl.classList.remove('hidden');
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-primary-800');
    });
    const activeBtn = document.querySelector(`[onclick="navigateToConfig('${target}')"]`);
    if (activeBtn) activeBtn.classList.add('bg-primary-800');
}

function switchConfigTab(tabName) {
    document.querySelectorAll('.config-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('grid', 'block');
    });

    document.querySelectorAll('.config-tab-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm', 'border-slate-300');
        btn.classList.add('text-slate-600', 'hover:text-slate-900');
    });

    const targetSection = document.getElementById(`tab-${tabName}`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        if (tabName === 'teachers') {
            targetSection.classList.add('block');
        } else {
            targetSection.classList.add('grid');
        }
    }

    const activeBtn = document.getElementById(`btn-tab-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
        activeBtn.classList.remove('text-slate-600');
    }
}

function toggleNavGroup(groupId) {
    const group = document.getElementById(groupId);
    const icon = document.querySelector(`.${groupId}-icon`);

    if (!group) return;

    if (group.style.maxHeight === '0px' || group.classList.contains('max-h-0')) {
        group.classList.remove('max-h-0');
        group.style.maxHeight = group.scrollHeight + "px";
        if (icon) {
            icon.classList.add('rotate-90');
            icon.style.transform = 'rotate(90deg)';
        }
    } else {
        group.style.maxHeight = group.scrollHeight + "px";
        setTimeout(() => group.style.maxHeight = '0px', 10);
        group.classList.add('max-h-0');
        if (icon) {
            icon.classList.remove('rotate-90');
            icon.style.transform = 'rotate(0deg)';
        }
    }
}

// =================================================================
// 6. GERENCIAMENTO DE TURMAS E ATRIBUIÇÕES
// =================================================================

function initEmptySchedule() {
    const input = document.getElementById('slotsPerDay');
    globalSlotsPerDay = input ? (parseInt(input.value) || 5) : 5;

    currentSchedule = {};
    globalDays.forEach(d => {
        currentSchedule[d] = {};
        for (let s = 0; s < globalSlotsPerDay; s++) {
            currentSchedule[d][s] = {};
            classes.forEach(cls => {
                currentSchedule[d][s][cls] = null;
            });
        }
    });
}

function addClass() {
    const input = document.getElementById('classInput');
    const name = input.value.trim().toUpperCase();
    if (!name) return showToast("Digite o nome da turma.", "error");

    if (classes.includes(name)) return showToast("Turma já existe.", "error");

    recordHistory();
    classes.push(name);
    classes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    input.value = '';

    initEmptySchedule();
    renderClasses();
    saveData();
    showToast("Turma adicionada.", "success");
}

function removeClass(name) {
    if (!confirm(`Excluir turma ${name}?`)) return;
    recordHistory();

    classes = classes.filter(c => c !== name);
    allocations = allocations.filter(a => a.class !== name);

    for (let key in lockedCells) {
        if (key.endsWith(`-${name}`)) delete lockedCells[key];
    }

    initEmptySchedule();
    renderClasses();
    renderAllocations();
    saveData();
}

function renderClasses() {
    const container = document.getElementById('classList');
    if (!container) return;

    container.innerHTML = classes.map(c => `
        <div class="inline-flex items-center bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
            <span class="text-sm font-medium text-slate-700 mr-2">${escapeHTML(c)}</span>
            <button onclick="removeClass('${escapeHTML(c)}')" class="text-slate-400 hover:text-red-500 font-bold">×</button>
        </div>
    `).join('');

    const cbContainer = document.getElementById('classCheckboxes');
    if (cbContainer) {
        if (classes.length === 0) {
            cbContainer.innerHTML = '<span class="text-sm text-slate-400 italic">Nenhuma turma cadastrada.</span>';
        } else {
            cbContainer.innerHTML = classes.map((c, i) => `
                <div class="flex items-center bg-white px-2 py-1 rounded border border-slate-200">
                    <input type="checkbox" id="chk_cls_${i}" value="${escapeHTML(c)}" class="mr-2 rounded text-indigo-600 focus:ring-indigo-500">
                    <label for="chk_cls_${i}" class="text-sm text-slate-700 cursor-pointer select-none">${escapeHTML(c)}</label>
                </div>
            `).join('');
        }
    }
    updateDashboard();
}

function updateCurriculumMatrix() {
    const levelEl = document.getElementById('schoolLevel');
    if (!levelEl) return;
    const level = levelEl.value;
    currentMatrix = JSON.parse(JSON.stringify(defaultSubjects[level] || []));
    renderMatrixInputs();
    updateSubjectSelect();
}

function renderMatrixInputs() {
    const container = document.getElementById('matrixContainer');
    if (!container) return;
    container.innerHTML = currentMatrix.map((subj, i) => `
        <div class="flex justify-between items-center bg-white p-2 rounded border border-slate-100 mb-1">
            <span class="text-sm text-slate-700 font-medium flex-1">${escapeHTML(subj.name)}</span>
            <input type="number" value="${subj.count}" min="1" max="10" 
                onchange="currentMatrix[${i}].count = parseInt(this.value); updateSubjectSelect(); saveData();"
                class="w-14 p-1 border rounded text-center text-xs">
        </div>
    `).join('');
}

function addNewSubjectField() {
    const name = prompt("Nome da nova disciplina:");
    if (name && name.trim()) {
        currentMatrix.push({ name: name.trim(), count: 2 });
        renderMatrixInputs();
        updateSubjectSelect();
        saveData();
    }
}

function updateSubjectSelect() {
    const select = document.getElementById('subjectSelect');
    const modalSelect = document.getElementById('modalSubjectSelect');

    let html = '<option value="">Selecione...</option>';
    currentMatrix.forEach(s => html += `<option value="${escapeHTML(s.name)}">${escapeHTML(s.name)}</option>`);

    if (select) select.innerHTML = html;
    if (modalSelect) modalSelect.innerHTML = html;

    updateLessonCountDisplay();
}

function updateLessonCountDisplay() {
    const select = document.getElementById('subjectSelect');
    const input = document.getElementById('lessonCountInput');
    const subjectsRegistry = currentMatrix;

    if (!select || !input) return;

    const selectedName = select.value;
    const subject = subjectsRegistry.find(s => s.name === selectedName);

    if (subject && subject.defaultCount) {
        input.value = subject.defaultCount;
    } else {
        if (input.value === '') input.value = 2;
    }
}

function addAllocation() {
    const checks = document.querySelectorAll('#classCheckboxes input:checked');
    const subjEl = document.getElementById('subjectSelect');
    const profEl = document.getElementById('teacherInput');
    const countEl = document.getElementById('lessonCountInput');
    const doubleEl = document.getElementById('allowDouble');

    if (!checks.length) return showToast("Selecione uma turma.", "error");
    if (!subjEl.value || !profEl.value) return showToast("Preencha disciplina e professor.", "error");

    recordHistory();

    const subjectName = subjEl.value;
    const teacherName = profEl.value.trim();
    const count = parseInt(countEl.value) || 2;
    const allowDouble = doubleEl.checked;

    const subjectObj = subjectsRegistry.find(s => s.name === subjectName);
    const baseColor = subjectObj ? subjectObj.defaultColor : '#cbd5e1';

    const colorKey = subjectName.toLowerCase() + teacherName.toLowerCase();
    const bgColor = stringToColor(colorKey);
    const textColor = getContrastYIQ(bgColor);

    checks.forEach(chk => {
        const cls = chk.value;
        allocations = allocations.filter(a => !(a.class === cls && a.subject === subjectName));

        allocations.push({
            id: Date.now(),
            class: cls,
            subject: subjectName,
            teacher: teacherName,
            count: count,
            allowDouble: allowDouble,
            bgColor: baseColor || bgColor,
            textColor: textColor,
            active: true
        });
    });

    renderAllocations();
    profEl.value = '';
    saveData();
    showToast("Atribuição salva.", "success");
}

function renderAllocations() {
    const list = document.getElementById('allocationsList');
    if (!list) return;

    if (!allocations.length) {
        list.innerHTML = `<div class="p-4 text-center text-slate-400 text-sm">Nenhuma aula atribuída.</div>`;
        return;
    }

    allocations.sort((a, b) => a.class.localeCompare(b.class) || a.subject.localeCompare(b.subject));

    list.innerHTML = allocations.map((a, i) => `
        <div class="flex items-center justify-between p-3 border-b border-slate-100 hover:bg-slate-50 ${a.active ? '' : 'opacity-50'}">
            <div class="flex items-center gap-3 overflow-hidden">
                <input type="checkbox" ${a.active ? 'checked' : ''} onchange="toggleAllocationActive(${i})" class="rounded text-indigo-600">
                <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${a.bgColor || a.color || '#ccc'}"></div>
                <div class="min-w-0">
                    <div class="text-sm font-bold text-slate-800 truncate">
                        ${escapeHTML(a.class)} • ${escapeHTML(a.subject)}
                        ${a.count > 1 ? `<span class="text-xs bg-indigo-100 text-indigo-700 px-1 rounded ml-1">${a.count}x</span>` : ''}
                    </div>
                    <div class="text-xs text-slate-500 cursor-pointer hover:text-indigo-600 flex items-center gap-1"
                        onclick="openAvailabilityModal('${escapeHTML(a.teacher)}')" title="Configurar Folgas">
                        <i data-lucide="user" class="w-3 h-3"></i> ${escapeHTML(a.teacher)}
                    </div>
                </div>
            </div>
            <button onclick="removeAllocation(${i})" class="text-slate-400 hover:text-red-500 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
    updateDashboard();
}

function toggleAllocationActive(i) {
    if (allocations[i]) {
        allocations[i].active = !allocations[i].active;
        renderAllocations();
        saveData();
    }
}

function removeAllocation(i) {
    if (allocations[i]) {
        recordHistory();
        allocations.splice(i, 1);
        renderAllocations();
        saveData();
    }
}

// =================================================================
// 7. SISTEMA DE PROFESSORES
// =================================================================

function initTeacherSystem() {
    const saved = localStorage.getItem('teacherRegistry');
    if (saved) {
        teacherRegistry = JSON.parse(saved);
    } else {
        teacherRegistry = [];
    }
    renderTeacherList();
}

function registerNewTeacher() {
    const nameInput = document.getElementById('newTeacherName');
    const name = nameInput.value.trim().toUpperCase();

    if (!name) return showToast("Digite o nome do professor", "error");

    if (teacherRegistry.some(t => t.name === name)) {
        return showToast("Professor já cadastrado!", "error");
    }

    const newTeacher = {
        id: 'prof_' + Date.now(),
        name: name,
        color: getRandomColor(),
        subjects: []
    };

    teacherRegistry.push(newTeacher);
    saveTeacherData();
    renderTeacherList();

    nameInput.value = '';
    showToast(`${name} cadastrado com sucesso!`, "success");
}

function renderTeacherList() {
    const container = document.getElementById('teachersListGrid');
    if (!container) return;

    container.innerHTML = '';

    teacherRegistry.forEach(teacher => {
        let subjectsBadges = teacher.subjects.length > 0
            ? teacher.subjects.slice(0, 3).map(s => `<span class="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">${s}</span>`).join('')
            : '<span class="text-[10px] text-slate-400 italic">Nenhuma disciplina</span>';

        if (teacher.subjects.length > 3) subjectsBadges += `<span class="text-[10px] text-slate-400 ml-1">+${teacher.subjects.length - 3}</span>`;

        const card = document.createElement('div');
        card.className = "bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer group hover:border-indigo-300 relative overflow-hidden";
        card.onclick = () => openTeacherDetails(teacher.id);

        card.innerHTML = `
            <div class="absolute left-0 top-0 bottom-0 w-1" style="background-color: ${teacher.color}"></div>
            <div class="flex items-center gap-3 pl-2">
                <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    ${getInitials(teacher.name)}
                </div>
                <div class="overflow-hidden">
                    <h4 class="font-bold text-slate-800 text-sm truncate">${teacher.name}</h4>
                    <div class="flex flex-wrap gap-1 mt-1">
                        ${subjectsBadges}
                    </div>
                </div>
                <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 ml-auto group-hover:text-indigo-500"></i>
            </div>
        `;
        container.appendChild(card);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openTeacherDetails(id) {
    const teacher = teacherRegistry.find(t => t.id === id);
    if (!teacher) return;

    currentEditingTeacherId = id;
    document.getElementById('detailTeacherName').innerText = teacher.name;
    document.getElementById('teacherInitials').innerText = getInitials(teacher.name);
    document.getElementById('teacherInitials').style.color = teacher.color;
    document.getElementById('detailTeacherColor').value = teacher.color;

    renderTeacherSubjectMapping(teacher.name);

    const modal = document.getElementById('teacherDetailsModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}


function renderTeacherSubjectMapping(teacherName) {
    const listContainer = document.getElementById('teacherSubjectsList');
    listContainer.innerHTML = '';

    // Verifica se existem turmas cadastradas
    if (!classes || classes.length === 0) {
        listContainer.innerHTML = `
            <div class="p-4 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-200">
                <i data-lucide="alert-triangle" class="w-4 h-4 inline mr-1"></i>
                Cadastre turmas na aba "Turmas" antes de definir as aulas.
            </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // Verifica se existem disciplinas cadastradas
    if (!subjectsRegistry || subjectsRegistry.length === 0) {
        listContainer.innerHTML = `
            <div class="p-4 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-200">
                <i data-lucide="info" class="w-4 h-4 inline mr-1"></i>
                Cadastre disciplinas na aba "Disciplinas" primeiro.
            </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    subjectsRegistry.forEach(sub => {
        const currentAllocs = allocations || [];

        const activeClasses = currentAllocs
            .filter(a => a.teacher === teacherName && a.subject === sub.name)
            .map(a => a.class);

        const isChecked = activeClasses.length > 0;
        const safeSubId = sub.id.replace(/[^a-zA-Z0-9]/g, '_');

        const wrapper = document.createElement('div');
        wrapper.className = "border border-slate-200 rounded-lg mb-2 overflow-hidden transition-all bg-white";

        const header = document.createElement('div');
        header.className = `p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 ${isChecked ? 'bg-indigo-50/50' : ''}`;

        header.onclick = (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = document.getElementById(`chk_sub_${safeSubId}`);
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    toggleSubjectClassesArea(safeSubId, checkbox.checked);
                }
            }
        };

        header.innerHTML = `
            <div class="flex items-center gap-3">
                <input type="checkbox" id="chk_sub_${safeSubId}" 
                    class="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 transition"
                    ${isChecked ? 'checked' : ''}
                    onchange="toggleSubjectClassesArea('${safeSubId}', this.checked)">
                
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" style="background-color: ${sub.defaultColor}"></div>
                    <span class="font-bold text-slate-700 text-sm">${sub.name}</span>
                </div>
            </div>
            <span class="text-xs font-medium text-slate-400" id="count_sub_${safeSubId}">
                ${activeClasses.length > 0 ? activeClasses.length + ' turmas' : ''}
            </span>
        `;

        const classesArea = document.createElement('div');
        classesArea.id = `area_sub_${safeSubId}`;
        classesArea.className = isChecked ? "p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-2" : "hidden p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-2";

        const allBtn = `
            <label class="col-span-3 flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 cursor-pointer">
                <input type="checkbox" class="w-4 h-4 rounded text-slate-400" 
                onchange="toggleAllClassesForSubject('${safeSubId}', this.checked)">
                <span class="text-xs font-bold text-slate-500 uppercase">Selecionar Todas as Turmas</span>
            </label>
        `;
        classesArea.innerHTML = allBtn;

        classes.forEach(clsName => {
            const isClassActive = activeClasses.includes(clsName);
            const clsLabel = document.createElement('label');
            clsLabel.className = "flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition";
            clsLabel.innerHTML = `
                <input type="checkbox" value="${clsName}" 
                    class="cls-check-${safeSubId} w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    ${isClassActive ? 'checked' : ''}>
                <span class="text-xs text-slate-700 font-medium">${clsName}</span>
            `;
            classesArea.appendChild(clsLabel);
        });

        wrapper.appendChild(header);
        wrapper.appendChild(classesArea);
        listContainer.appendChild(wrapper);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleSubjectClassesArea(safeSubId, isChecked) {
    const area = document.getElementById(`area_sub_${safeSubId}`);
    if (isChecked) {
        area.classList.remove('hidden');
        area.classList.add('grid');
    } else {
        area.classList.add('hidden');
        area.classList.remove('grid');
        const checkboxes = document.querySelectorAll(`.cls-check-${safeSubId}`);
        checkboxes.forEach(cb => cb.checked = false);
    }
}

function toggleAllClassesForSubject(safeSubId, isChecked) {
    const checkboxes = document.querySelectorAll(`.cls-check-${safeSubId}`);
    checkboxes.forEach(cb => cb.checked = isChecked);
}

function saveTeacherDetailsFromModal() {
    if (!currentEditingTeacherId) return;

    const teacher = teacherRegistry.find(t => t.id === currentEditingTeacherId);
    if (!teacher) return;
    const teacherName = teacher.name;

    allocations = allocations.filter(a => a.teacher !== teacherName);

    subjectsRegistry.forEach(sub => {
        const safeSubId = sub.id.replace(/[^a-zA-Z0-9]/g, '_');
        const mainCheck = document.getElementById(`chk_sub_${safeSubId}`);

        if (mainCheck && mainCheck.checked) {
            const classCheckboxes = document.querySelectorAll(`.cls-check-${safeSubId}:checked`);

            classCheckboxes.forEach(cb => {
                const className = cb.value;
                const colorKey = sub.name + teacherName;

                allocations.push({
                    id: Date.now() + Math.random(),
                    class: className,
                    subject: sub.name,
                    teacher: teacherName,
                    count: sub.defaultCount || 2,
                    color: sub.defaultColor,
                    active: true,
                    bgColor: sub.defaultColor,
                    textColor: getContrastYIQ(sub.defaultColor) || '#1e293b'
                });
            });
        }
    });

    const uniqueSubjects = [...new Set(allocations
        .filter(a => a.teacher === teacherName)
        .map(a => a.subject))];

    teacher.subjects = uniqueSubjects;

    saveData();
    saveTeacherData();

    renderTeacherList();
    renderAllocations();

    closeTeacherDetails();
    showToast("Atribuições salvas com sucesso!", "success");
    updateDashboard();
}

function closeTeacherDetails() {
    document.getElementById('teacherDetailsModal').classList.add('hidden');
    document.getElementById('teacherDetailsModal').classList.remove('flex');
    currentEditingTeacherId = null;
    renderTeacherList();
}

function toggleTeacherSubject(subjectName) {
    if (!currentEditingTeacherId) return;
    const teacher = teacherRegistry.find(t => t.id === currentEditingTeacherId);
    if (!teacher) return;

    if (teacher.subjects.includes(subjectName)) {
        teacher.subjects = teacher.subjects.filter(s => s !== subjectName);
    } else {
        teacher.subjects.push(subjectName);
    }
    saveTeacherData();
}

function updateTeacherColor() {
    if (!currentEditingTeacherId) return;
    const color = document.getElementById('detailTeacherColor').value;
    const teacher = teacherRegistry.find(t => t.id === currentEditingTeacherId);
    if (teacher) {
        teacher.color = color;
        document.getElementById('teacherInitials').style.color = color;
        saveTeacherData();
    }
}

function deleteTeacher() {
    if (!confirm("ATENÇÃO: Isso removerá o professor e TODAS as aulas atribuídas a ele da grade.\nDeseja continuar?")) return;

    // Localiza o professor antes de deletar para pegar o nome exato
    const teacher = teacherRegistry.find(t => t.id === currentEditingTeacherId);

    if (teacher) {
        const teacherName = teacher.name;

        teacherRegistry = teacherRegistry.filter(t => t.id !== currentEditingTeacherId);

        allocations = allocations.filter(a => a.teacher !== teacherName);

        for (let key in lockedCells) {
            if (lockedCells[key] && lockedCells[key].teacher === teacherName) {
                delete lockedCells[key];
            }
        }

        if (teacherConstraints[teacherName]) {
            delete teacherConstraints[teacherName];
        }

        saveData();
        saveTeacherData();

        renderAllocations();
        renderTeacherList();

        initEmptySchedule(); renderCurrentSchedule();

        closeTeacherDetails();
        showToast("Professor e vínculos removidos.", "success");
        updateDashboard();
    } else {
        closeTeacherDetails();
    }
}

function saveTeacherData() {
    localStorage.setItem('teacherRegistry', JSON.stringify(teacherRegistry));
}

// =================================================================
// 8. SISTEMA DE DISCIPLINAS
// =================================================================

function importBNCCSubjects() {
    const stageSelect = document.getElementById('bnccStageSelect');
    const selectedStage = stageSelect.value;

    if (!selectedStage) return showToast("Selecione uma etapa de ensino primeiro.", "warning");

    const subjectsToImport = defaultSubjects[selectedStage];
    if (!subjectsToImport) return;

    let addedCount = 0;

    subjectsToImport.forEach(std => {
        const exists = subjectsRegistry.some(s => s.name.toLowerCase() === std.name.toLowerCase());

        if (!exists) {
            subjectsRegistry.push({
                id: 'sub_' + Date.now() + Math.random().toString(36).substr(2, 5),
                name: std.name,
                defaultColor: std.color,
                defaultCount: std.count || 2
            });
            addedCount++;
        } else {
            const existingSubject = subjectsRegistry.find(s => s.name.toLowerCase() === std.name.toLowerCase());
            if (std.count && !existingSubject.defaultCount) {
                existingSubject.defaultCount = std.count;
                addedCount++;
            }
        }
    });

    if (addedCount > 0) {
        saveSubjectData();
        renderSubjectsList();
        showToast(`${addedCount} disciplinas importadas com sucesso!`, "success");
    } else {
        showToast("Disciplinas já cadastradas.", "info");
    }
}

function initSubjectSystem() {
    const saved = localStorage.getItem('subjectsRegistry');
    if (saved) {
        subjectsRegistry = JSON.parse(saved);
    } else {
        subjectsRegistry = [];
    }
    renderSubjectsList();
    updateSubjectSelects();
}

function loadCommonSubjects() {
    importBNCCSubjects();
}

function addSubject() {
    const nameInput = document.getElementById('newSubjectName');
    const colorInput = document.getElementById('newSubjectColor');
    const name = nameInput.value.trim();
    const color = colorInput.value;
    const countInput = document.getElementById('newSubjectCount');
    const defaultCount = parseInt(countInput.value) || 2;

    if (!name) return showToast("Digite o nome da disciplina.", "error");

    if (subjectsRegistry.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        return showToast("Disciplina já existe!", "error");
    }

    subjectsRegistry.push({
        id: 'sub_' + Date.now(),
        name: name,
        defaultColor: color,
        defaultCount: defaultCount
    });

    saveSubjectData();
    renderSubjectsList();

    nameInput.value = '';
    countInput.value = '2';
}

function removeSubject(id) {
    if (!confirm("Remover esta disciplina? Isso pode afetar turmas já configuradas.")) return;
    subjectsRegistry = subjectsRegistry.filter(s => s.id !== id);
    saveSubjectData();
    renderSubjectsList();
}

function renderSubjectsList() {
    const container = document.getElementById('subjectsListContainer');
    if (!container) return;

    if (subjectsRegistry.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-slate-400 text-sm italic">Nenhuma disciplina...</div>`;
        return;
    }

    container.innerHTML = '';

    subjectsRegistry.forEach(sub => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-white p-2 rounded border border-slate-100 hover:shadow-sm transition group";

        const countBadge = sub.defaultCount
            ? `<span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-2 border border-slate-200" title="Aulas por semana">${sub.defaultCount} aulas</span>`
            : '';

        div.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded-full shadow-sm" style="background-color: ${sub.defaultColor}"></div>
                <div class="flex flex-col">
                    <span class="text-sm font-medium text-slate-700 leading-none">${sub.name}</span>
                </div>
                ${countBadge}
            </div>
            <button onclick="removeSubject('${sub.id}')" class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        container.appendChild(div);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
    updateSubjectSelects();
}

function updateSubjectSelects() {
    const selects = [
        document.getElementById('subjectSelect'),
        document.getElementById('modalSubjectSelect')
    ];

    selects.forEach(sel => {
        if (!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">Selecione...</option>';
        subjectsRegistry.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.innerText = s.name;
            sel.appendChild(opt);
        });
        if (currentVal) sel.value = currentVal;
    });
}

function saveSubjectData() {
    localStorage.setItem('subjectsRegistry', JSON.stringify(subjectsRegistry));
    window.subjects = subjectsRegistry.map(s => s.name);
}

// =================================================================
// 9. RENDERIZAÇÃO DA GRADE (SCHEDULE)
// =================================================================

function renderCurrentSchedule() {
    const table = document.getElementById('scheduleTable');
    if (!table) return;

    let head = `<thead class="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider sticky top-0 z-20">
        <tr><th class="p-3 border text-center w-12">Dia</th><th class="p-3 border text-center w-12">Aula</th>`;
    classes.forEach(c => head += `<th class="p-3 border text-center min-w-[120px]">${escapeHTML(c)}</th>`);
    head += `</tr></thead>`;

    let body = `<tbody>`;
    globalDays.forEach((day, dIdx) => {
        for (let s = 0; s < globalSlotsPerDay; s++) {
            body += `<tr>`;

            if (s === 0) {
                body += `<td rowspan="${globalSlotsPerDay}" class="p-2 border text-center font-bold bg-white text-slate-700 writing-vertical rotate-180 border-b-2 border-slate-300">
                    ${escapeHTML(day.substring(0, 3))}
                </td>`;
            }

            body += `<td class="p-2 border text-center text-xs font-bold text-slate-500 bg-slate-50">${s + 1}ª</td>`;

            classes.forEach((cls, cIdx) => {
                const item = currentSchedule[day]?.[s]?.[cls];
                const lockKey = `${day}-${s}-${cls}`;
                const isLocked = !!lockedCells[lockKey];
                const params = `'${day}', ${s}, '${escapeHTML(cls)}'`;

                if (item) {
                    body += `<td class="border p-1 h-20 align-top relative group" 
                                ondragover="handleDragOver(event)" 
                                ondrop="handleDrop(event, ${params})">
                        <div class="cell-content h-full w-full rounded p-1 flex flex-col justify-center items-center cursor-grab active:cursor-grabbing shadow-sm transition-all hover:scale-[1.02] ${isLocked ? 'ring-2 ring-red-400' : ''}"
                            style="background-color:${item.bgColor}; color:${item.textColor};"
                            draggable="true"
                            ondragstart="handleDragStart(event, ${params})"
                            ondblclick="openManualModal(${params})">

                            <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 cursor-pointer p-1 bg-white/50 rounded-full hover:bg-white transition"
                                onclick="toggleLock(${params}, event)" title="${isLocked ? 'Destravar' : 'Travar'}">
                                ${isLocked ? '🔒' : '🔓'}
                            </div>

                            <span class="text-xs font-bold text-center leading-tight">${escapeHTML(item.subject)}</span>
                            <span class="text-[10px] opacity-90 text-center truncate w-full">${escapeHTML(item.teacher)}</span>
                        </div>
                    </td>`;
                } else {
                    body += `<td class="border p-1 h-20 bg-slate-50/30 hover:bg-slate-100 transition cursor-pointer"
                                ondragover="handleDragOver(event)"
                                ondrop="handleDrop(event, ${params})"
                                ondblclick="openManualModal(${params})">
                    </td>`;
                }
            });
            body += `</tr>`;
        }
        body += `<tr class="bg-slate-300 h-1"><td colspan="${classes.length + 2}"></td></tr>`;
    });
    body += `</tbody>`;

    table.innerHTML = head + body;
}

function handleDragStart(e, day, slot, cls) {
    dragSourceData = { day, slot, cls, data: currentSchedule[day][slot][cls] };
    e.dataTransfer.setData('text/plain', '');
}

function handleDrop(e, targetDay, targetSlot, targetCls) {
    e.preventDefault();
    if (!dragSourceData) return;

    recordHistory();

    const movingData = dragSourceData.data;
    const existingData = currentSchedule[targetDay][targetSlot][targetCls];

    currentSchedule[targetDay][targetSlot][targetCls] = movingData;
    currentSchedule[dragSourceData.day][dragSourceData.slot][dragSourceData.cls] = existingData;

    renderCurrentSchedule();
    saveData();
    showToast("Horário alterado.", "success");
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

// =================================================================
// 10. MODAIS E UTILITÁRIOS
// =================================================================

function openManualModal(day, slot, cls) {
    modalTarget = { day, slot, cls };
    const info = document.getElementById('modalTargetInfo');
    if (info) info.innerText = `${cls} • ${day} • ${slot + 1}ª Aula`;

    updateSubjectSelects();

    const cur = currentSchedule[day]?.[slot]?.[cls];
    const sSel = document.getElementById('modalSubjectSelect');
    const tInp = document.getElementById('modalTeacherInput');

    if (sSel) sSel.value = cur ? cur.subject : "";
    if (tInp) tInp.value = cur ? cur.teacher : "";

    document.getElementById('manualModal').style.display = 'flex';
}

function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
}

function saveManualAllocation() {
    const subj = document.getElementById('modalSubjectSelect').value;
    const teach = document.getElementById('modalTeacherInput').value;

    if (!subj || !teach) return showToast("Preencha todos os campos.", "error");

    recordHistory();
    const colorKey = subj + teach;

    const item = {
        id: 'MANUAL_' + Date.now(),
        class: modalTarget.cls,
        subject: subj,
        teacher: teach,
        count: 1,
        active: true,
        bgColor: stringToColor(colorKey),
        textColor: getContrastYIQ(stringToColor(colorKey))
    };

    currentSchedule[modalTarget.day][modalTarget.slot][modalTarget.cls] = item;
    lockedCells[`${modalTarget.day}-${modalTarget.slot}-${modalTarget.cls}`] = item;

    renderCurrentSchedule();
    saveData();
    closeModal();
    showToast("Aula salva e fixada.", "success");
}

function clearManualCell() {
    recordHistory();
    currentSchedule[modalTarget.day][modalTarget.slot][modalTarget.cls] = null;
    delete lockedCells[`${modalTarget.day}-${modalTarget.slot}-${modalTarget.cls}`];
    renderCurrentSchedule();
    saveData();
    closeModal();
}

function openAvailabilityModal(teacherName) {
    editingTeacherAv = teacherName;
    document.getElementById('avTeacherName').innerText = teacherName;

    const grid = document.getElementById('availabilityGrid');
    grid.style.gridTemplateColumns = `60px repeat(${globalDays.length}, 1fr)`;

    tempConstraints = JSON.parse(JSON.stringify(teacherConstraints[teacherName] || {}));

    let html = `<div class="font-bold text-center text-xs p-2 bg-slate-100">Aula</div>`;
    globalDays.forEach(d => html += `<div class="font-bold text-center text-xs p-2 bg-slate-100">${d.substring(0, 3)}</div>`);

    for (let s = 0; s < globalSlotsPerDay; s++) {
        html += `<div class="font-bold text-center text-xs p-2 bg-slate-50 border-t border-slate-200">${s + 1}ª</div>`;
        globalDays.forEach(d => {
            const key = `${d}-${s}`;
            const isBlocked = tempConstraints[key] === true;
            html += `
                <div class="p-1 border border-slate-100 cursor-pointer hover:brightness-95 transition text-center text-lg select-none ${isBlocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}"
                    onclick="toggleAvCell(this, '${key}')">
                    ${isBlocked ? '✖' : '✔'}
                </div>
            `;
        });
    }
    grid.innerHTML = html;
    document.getElementById('availabilityModal').style.display = 'flex';
}

function toggleAvCell(el, key) {
    if (tempConstraints[key]) {
        delete tempConstraints[key];
        el.className = "p-1 border border-slate-100 cursor-pointer hover:brightness-95 transition text-center text-lg select-none bg-green-100 text-green-600";
        el.innerText = '✔';
    } else {
        tempConstraints[key] = true;
        el.className = "p-1 border border-slate-100 cursor-pointer hover:brightness-95 transition text-center text-lg select-none bg-red-100 text-red-600";
        el.innerText = '✖';
    }
}

function saveAvailability() {
    if (editingTeacherAv) {
        teacherConstraints[editingTeacherAv] = tempConstraints;
        saveData();
        showToast("Disponibilidade salva.", "success");
    }
    closeModal();
}

function openResourceModal() {
    const list = document.getElementById('resourceList');
    const subjects = subjectsRegistry.length > 0 ? subjectsRegistry : currentMatrix;

    list.innerHTML = subjects.map((s, i) => `
        <div class="flex justify-between items-center mb-2 p-2 border-b">
            <span class="text-sm font-medium">${escapeHTML(s.name)}</span>
            <input type="number" class="border w-16 p-1 rounded text-center" 
                value="${resourceLimits[s.name] || 99}" min="1" max="50"
                onchange="resourceLimits['${escapeHTML(s.name)}'] = parseInt(this.value); saveData();">
        </div>
    `).join('');
    document.getElementById('resourceModal').style.display = 'flex';
}

function closeResourceModal() { closeModal(); }

function saveResources() { closeModal(); showToast("Recursos salvos.", "success"); }

function openBulkImportModal() {
    document.getElementById('bulkImportModal').style.display = 'flex';
    document.getElementById('bulkImportText').focus();
}

function processBulkImport() {
    const text = document.getElementById('bulkImportText').value;
    if (!text.trim()) return showToast("Cole os dados primeiro.", "error");

    const lines = text.split('\n');
    let count = 0;

    recordHistory();

    lines.forEach(line => {
        const parts = line.split(/[,;\t]/);
        if (parts.length >= 4) {
            const cls = parts[0].trim().toUpperCase();
            const subj = parts[1].trim();
            const teach = parts[2].trim();
            const qtd = parseInt(parts[3].trim());

            if (cls && subj && teach && qtd > 0) {
                if (!classes.includes(cls)) classes.push(cls);

                allocations = allocations.filter(a => !(a.class === cls && a.subject === subj));

                const colorKey = subj + teach;
                allocations.push({
                    id: Date.now() + Math.random(),
                    class: cls,
                    subject: subj,
                    teacher: teach,
                    count: qtd,
                    allowDouble: (subj.toUpperCase().includes('MAT') || subj.toUpperCase().includes('PORT')),
                    bgColor: stringToColor(colorKey),
                    textColor: getContrastYIQ(stringToColor(colorKey)),
                    active: true
                });
                count++;
            }
        }
    });

    if (count > 0) {
        classes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        initEmptySchedule();
        renderClasses();
        renderAllocations();
        saveData();
        closeModal();
        showToast(`${count} registros importados!`, "success");
    } else {
        showToast("Formato inválido. Use: Turma, Matéria, Prof, Qtd", "error");
    }
}

function previewLogo() {
    const file = document.getElementById('cfgLogoInput').files[0];
    const img = document.getElementById('cfgLogoPreview');
    if (file) {
        const reader = new FileReader();
        reader.onload = e => { img.src = e.target.result; img.classList.remove('hidden'); };
        reader.readAsDataURL(file);
    }
}

function savePrintConfig() {
    printSettings.name = document.getElementById('cfgSchoolName').value;
    printSettings.sub = document.getElementById('cfgSchoolSub').value;
    const img = document.getElementById('cfgLogoPreview');
    if (img.src && !img.src.endsWith('html')) printSettings.logo = img.src;

    applyPrintSettings();
    saveData();
    closeModal();
}

// =================================================================
// 11. DASHBOARD E HELPERS
// =================================================================

function updateDashboard() {
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('pt-BR', dateOptions);
    const elDate = document.getElementById('current-date');
    if (elDate) elDate.innerText = today.charAt(0).toUpperCase() + today.slice(1);

    const elTurmas = document.getElementById('dash-turmas');
    if (elTurmas) elTurmas.innerText = classes.length;

    const elAulas = document.getElementById('dash-aulas');
    if (elAulas) elAulas.innerText = allocations.length;

    const elStatus = document.getElementById('dash-status');
    if (elStatus) {
        if (classes.length === 0) {
            elStatus.innerText = "Sem Dados";
            elStatus.className = "text-xl font-bold text-slate-400 mt-1";
        } else if (allocations.length === 0) {
            elStatus.innerText = "Falta Atribuir";
            elStatus.className = "text-xl font-bold text-amber-500 mt-1";
        } else {
            const hasContent = Object.values(currentSchedule).some(d =>
                Object.values(d).some(s => Object.values(s).some(c => c !== null))
            );
            if (hasContent) {
                elStatus.innerText = "Gerada";
                elStatus.className = "text-xl font-bold text-emerald-600 mt-1";
            } else {
                elStatus.innerText = "Pronto";
                elStatus.className = "text-xl font-bold text-indigo-600 mt-1";
            }
        }
    }

    updateDashboardAlerts();
}

function updateDashboardAlerts() {
    const container = document.getElementById('alertContainer');
    if (!container) return;
    container.innerHTML = '';

    if (classes.length === 0) {
        addAlert('warning', 'Cadastre as turmas para começar.');
    }

    const totalSlots = globalDays.length * globalSlotsPerDay;
    allocations.forEach(a => {
        if (a.count > totalSlots) {
            addAlert('error', `Disciplina ${a.subject} na ${a.class} tem ${a.count} aulas (Máximo ${totalSlots}).`);
        }
    });
}

function addAlert(type, msg) {
    const colors = {
        error: 'bg-red-50 text-red-700 border-red-100',
        warning: 'bg-amber-50 text-amber-700 border-amber-100',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-100'
    };
    const icon = type === 'error' ? 'alert-triangle' : (type === 'warning' ? 'alert-circle' : 'check-circle');

    const div = document.createElement('div');
    div.className = `p-3 rounded-lg text-sm border flex items-center gap-2 ${colors[type]}`;
    div.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i> <span>${msg}</span>`;
    document.getElementById('alertContainer').appendChild(div);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = { success: 'bg-emerald-600', error: 'bg-red-500', info: 'bg-slate-800' };

    const el = document.createElement('div');
    el.className = `${colors[type]} text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 transition-all transform translate-x-full`;
    el.innerHTML = `<span>${msg}</span>`;

    container.appendChild(el);

    requestAnimationFrame(() => el.classList.remove('translate-x-full'));

    setTimeout(() => {
        el.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// =================================================================
// 12. GERAÇÃO DE HORÁRIO OTIMIZADA (FAST BACKTRACKING + ATOMIZAÇÃO)
// =================================================================

let scheduleWorker = null;

function startGeneration() {
    if (isGenerating) return;

    const activeAllocs = allocations.filter(a => a.active);
    if (!activeAllocs.length) return showToast("Nenhuma aula ativa para gerar.", "error");
    if (!classes.length) return showToast("Não há turmas cadastradas.", "error");
    
    isGenerating = true;
    
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('startBtn').classList.add('hidden');
    document.getElementById('stopBtn').classList.remove('hidden');
    
    const loadingText = document.querySelector('#loadingOverlay p.animate-pulse');
    if(loadingText) loadingText.innerText = "Processando grade em alta velocidade...";

    const workerScript = `
    self.onmessage = function(e) {
        const { classes, globalDays, globalSlotsPerDay, allocations, lockedCells, resourceLimits, teacherConstraints } = e.data;
        
        const NUM_DAYS = globalDays.length;
        const NUM_SLOTS = globalSlotsPerDay;
        const TOTAL_SLOTS = NUM_DAYS * NUM_SLOTS;

        // --- 1. PREPARAÇÃO E ATOMIZAÇÃO (O segredo da flexibilidade) ---
        let activities = [];
        let actCounter = 0;

        // Converte alocações grandes ("Matemática 5 aulas") em pequenas atividades ("Matemática Aula 1", "Matemática Aula 2")
        allocations.forEach(alloc => {
            if (!alloc.active) return;
            
            // Prioridade: Aulas duplas e professores com muitas turmas tem prioridade maior
            const priority = (alloc.allowDouble ? 10 : 0) + (alloc.count > 4 ? 5 : 0);

            for (let i = 0; i < alloc.count; i++) {
                activities.push({
                    uid: actCounter++,
                    allocId: alloc.id,
                    class: alloc.class,
                    subject: alloc.subject,
                    teacher: alloc.teacher,
                    priority: priority,
                    color: alloc.bgColor || alloc.color,
                    allowDouble: alloc.allowDouble
                });
            }
        });

        // Ordenação Heurística (MRV simplificado): 
        // Resolve primeiro quem tem mais restrições/prioridade.
        activities.sort((a, b) => b.priority - a.priority);

        // --- 2. ESTRUTURAS DE ESTADO (LOOKUP TABLES RAPIDAS) ---
        // Em vez de percorrer arrays, usamos mapas diretos para O(1) de acesso.
        
        // [slot_index][turma] -> activityID (ou null)
        let gridClass = new Array(TOTAL_SLOTS).fill(null).map(() => ({})); 
        
        // [slot_index][professor] -> true/false
        let gridTeacher = new Array(TOTAL_SLOTS).fill(null).map(() => ({}));
        
        // [dia][turma][materia] -> contador
        let dailySubjectCount = new Array(NUM_DAYS).fill(null).map(() => ({}));
        
        // [slot_index][materia] -> contador (para recursos limitados)
        let resourceUsage = new Array(TOTAL_SLOTS).fill(null).map(() => ({}));

        // --- 3. APLICAÇÃO DE TRAVAS (LOCKED CELLS) ---
        // Preenche as tabelas com o que já está fixo
        
        let lockedActivitiesIndices = new Set();

        for (let key in lockedCells) {
            const parts = key.split('-'); // DIA-SLOT-TURMA
            if (parts.length < 3) continue;
            
            // Converte DIA-SLOT para índice linear (0 a 24)
            const dayIdx = globalDays.indexOf(parts[0]);
            const slotIdx = parseInt(parts[1]);
            const cls = parts.slice(2).join('-');
            
            if (dayIdx === -1) continue; // Dia inválido (ex: backup antigo)

            const linearSlot = (dayIdx * NUM_SLOTS) + slotIdx;
            const alloc = lockedCells[key];

            // Marca ocupação nas tabelas
            gridClass[linearSlot][cls] = 'LOCKED';
            gridTeacher[linearSlot][alloc.teacher] = true;
            
            // Contadores
            if (!dailySubjectCount[dayIdx][cls]) dailySubjectCount[dayIdx][cls] = {};
            dailySubjectCount[dayIdx][cls][alloc.subject] = (dailySubjectCount[dayIdx][cls][alloc.subject] || 0) + 1;

            if (!resourceUsage[linearSlot][alloc.subject]) resourceUsage[linearSlot][alloc.subject] = 0;
            resourceUsage[linearSlot][alloc.subject]++;

            // Remove UMA atividade correspondente da lista de "a fazer"
            // Procura a primeira atividade compatível que ainda não foi travada
            const actIndex = activities.findIndex((act, idx) => 
                !lockedActivitiesIndices.has(idx) &&
                act.class === cls && 
                act.subject === alloc.subject && 
                act.teacher === alloc.teacher
            );

            if (actIndex !== -1) {
                lockedActivitiesIndices.add(actIndex);
            }
        }

        // Filtra as atividades que já foram resolvidas pelas travas
        let pendingActivities = activities.filter((_, idx) => !lockedActivitiesIndices.has(idx));

        // --- 4. ENGINE DE BACKTRACKING (SIMPLIFICADO E RÁPIDO) ---
        
        const MAX_OPS = 5000000; // 5 Milhões de operações (aprox 3-5 segundos)
        let ops = 0;
        let solutionFound = false;
        let finalGrid = null;

        // Pré-calcula slots disponíveis (Shuffle para aleatoriedade)
        let allSlots = [];
        for(let i=0; i<TOTAL_SLOTS; i++) allSlots.push(i);

        function solve(idx) {
            ops++;
            if (idx >= pendingActivities.length) return true; // Sucesso!
            if (ops > MAX_OPS) return false; // Timeout

            const act = pendingActivities[idx];
            const subjLimit = resourceLimits[act.subject] || 99;
            const limitDaily = act.allowDouble ? 2 : 1;

            // Heurística: Tenta slots aleatórios para evitar padrões repetitivos
            // (Em C++ faríamos LCV, em JS o shuffle é mais barato)
            // Otimização: Filtra slots impossíveis antes de loopar? Não, check direto é mais rápido.
            
            // Embaralha slots a cada X iterações para variabilidade, ou usa pré-shuffled
            // Vamos usar uma permutação aleatória local
            let slotsTried = [...allSlots]; 
            // Fisher-Yates shuffle simplificado para performance
            for (let i = slotsTried.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [slotsTried[i], slotsTried[j]] = [slotsTried[j], slotsTried[i]];
            }

            for (let slot of slotsTried) {
                const day = Math.floor(slot / NUM_SLOTS);
                const slotInDay = slot % NUM_SLOTS;

                // --- VERIFICAÇÕES DE CONFLITO (O(1) Lookups) ---

                // 1. Turma ocupada?
                if (gridClass[slot][act.class]) continue;

                // 2. Professor ocupado?
                if (gridTeacher[slot][act.teacher]) continue;

                // 3. Limite diário da matéria
                const currentDaily = dailySubjectCount[day][act.class]?.[act.subject] || 0;
                if (currentDaily >= limitDaily) continue;

                // 4. Indisponibilidade do Professor (Constraints)
                // Chave salva: "SEGUNDA-0"
                if (teacherConstraints[act.teacher]) {
                    const key = globalDays[day] + '-' + slotInDay;
                    if (teacherConstraints[act.teacher][key] === true) continue;
                }

                // 5. Recursos (Salas)
                if ((resourceUsage[slot][act.subject] || 0) >= subjLimit) continue;

                // --- ALOCA ---
                gridClass[slot][act.class] = act;
                gridTeacher[slot][act.teacher] = true;
                
                if (!dailySubjectCount[day][act.class]) dailySubjectCount[day][act.class] = {};
                dailySubjectCount[day][act.class][act.subject] = (dailySubjectCount[day][act.class][act.subject] || 0) + 1;
                
                if (!resourceUsage[slot][act.subject]) resourceUsage[slot][act.subject] = 0;
                resourceUsage[slot][act.subject]++;

                // --- RECURSÃO ---
                if (solve(idx + 1)) return true;

                // --- DESALOCA (BACKTRACK) ---
                delete gridClass[slot][act.class];
                delete gridTeacher[slot][act.teacher];
                dailySubjectCount[day][act.class][act.subject]--;
                resourceUsage[slot][act.subject]--;
            }

            return false;
        }

        // Tenta resolver. Se falhar por timeout, tenta mais uma vez com ordenação diferente?
        // Vamos fazer uma única passagem profunda com limite alto.
        if (solve(0)) {
            // Reconstrói o formato para o app
            let scheduleExport = {};
            globalDays.forEach(d => {
                scheduleExport[d] = {};
                for(let s=0; s<NUM_SLOTS; s++) scheduleExport[d][s] = {};
            });

            // Preenche com as atividades alocadas
            for(let s=0; s<TOTAL_SLOTS; s++) {
                const dayIdx = Math.floor(s / NUM_SLOTS);
                const slotIdx = s % NUM_SLOTS;
                const dayName = globalDays[dayIdx];

                for (let cls in gridClass[s]) {
                    const item = gridClass[s][cls];
                    if (item && item !== 'LOCKED') { // Ignora marcadores de trava, eles já existem no app via lockedCells
                        scheduleExport[dayName][slotIdx][cls] = {
                            id: item.allocId,
                            class: item.class,
                            subject: item.subject,
                            teacher: item.teacher,
                            count: 1,
                            bgColor: item.color,
                            textColor: '#1e293b' // Contraste padrão
                        };
                    } else if (item === 'LOCKED') {
                        // Se é locked, precisamos garantir que o app saiba, 
                        // mas geralmente o app mescla lockedCells com schedule.
                        // Vamos buscar na trava original para preencher o buraco visualmente se necessário.
                        // (O app front-end usa lockedCells prioritariamente, então podemos deixar vazio ou preencher)
                        
                        // Para garantir consistência visual no retorno:
                        // O front-end geralmente renderiza o scheduleExport. 
                        // Vamos preencher com os dados da trava para garantir.
                        const lockKey = \`\${dayName}-\${slotIdx}-\${cls}\`;
                        const lockData = lockedCells[lockKey];
                        if (lockData) {
                             scheduleExport[dayName][slotIdx][cls] = lockData;
                        }
                    }
                }
            }
            
            self.postMessage({ type: 'SUCCESS', schedule: scheduleExport });
        } else {
            self.postMessage({ type: 'ERROR', message: 'Não foi possível gerar uma grade completa. Conflitos insolúveis detectados.' });
        }
    };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    scheduleWorker = new Worker(URL.createObjectURL(blob));

    scheduleWorker.onmessage = function(e) {
        const { type, message, schedule } = e.data;

        if (type === 'SUCCESS') {
            currentSchedule = schedule;
            
            // Mescla as células travadas de volta para garantir que nada foi perdido visualmente
            // (Embora o worker já deva ter cuidado disso)
            for (let key in lockedCells) {
                const parts = key.split('-');
                if(parts.length >= 3) {
                    const d = parts[0], s = parseInt(parts[1]), c = parts.slice(2).join('-');
                    if (currentSchedule[d] && currentSchedule[d][s]) {
                        currentSchedule[d][s][c] = lockedCells[key];
                    }
                }
            }

            renderCurrentSchedule();
            saveData();
            showToast("Grade gerada com sucesso!", "success");
            updateDashboard();
        } else if (type === 'ERROR') {
            showToast(message, "error");
        }

        stopGeneration();
    };

    scheduleWorker.postMessage({
        classes,
        globalDays,
        globalSlotsPerDay,
        allocations,
        lockedCells,
        resourceLimits,
        teacherConstraints
    });
}

function stopGeneration() {
    if (scheduleWorker) {
        scheduleWorker.terminate();
        scheduleWorker = null;
    }
    isGenerating = false;
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('stopBtn').classList.add('hidden');
}

function stopGeneration() {
    if (scheduleWorker) {
        scheduleWorker.terminate();
        scheduleWorker = null;
    }
    isGenerating = false;
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('stopBtn').classList.add('hidden');
}

// =================================================================
// 13. HISTÓRICO (UNDO)
// =================================================================

function recordHistory() {
    historyStack.push({
        schedule: JSON.parse(JSON.stringify(currentSchedule)),
        locks: JSON.parse(JSON.stringify(lockedCells)),
        allocs: JSON.parse(JSON.stringify(allocations))
    });
    if (historyStack.length > 20) historyStack.shift();
    updateUndoButton();
}

function performUndo() {
    if (!historyStack.length) return showToast("Nada para desfazer", "info");
    const prev = historyStack.pop();
    currentSchedule = prev.schedule;
    lockedCells = prev.locks;
    allocations = prev.allocs;
    renderCurrentSchedule();
    renderAllocations();
    renderClasses();
    saveData();
    updateUndoButton();
}

function updateUndoButton() {
    const btn = document.getElementById('undoBtn');
    if (btn) {
        if (historyStack.length > 0) {
            btn.classList.remove('hidden');
            btn.style.display = 'inline-flex';
        } else {
            btn.style.display = 'none';
        }
    }
}

// =================================================================
// 14. IMPRESSÃO
// =================================================================

window.onbeforeprint = function () {
    preparePrintLayout();
};

window.onafterprint = function () {
    const printArea = document.getElementById('print-area-container');
    if (printArea) printArea.innerHTML = '';
};

function preparePrintLayout() {
    if (document.body.classList.contains('printing-teacher') || document.body.classList.contains('printing-class')) return;

    const printArea = document.getElementById('print-area-container');
    if (!printArea) return;
    printArea.innerHTML = '';

    const TURMAS_POR_PAGINA = 6;
    const totalTurmas = classes.length;

    const schoolName = printSettings.name || 'Escola Modelo';
    const subTitle = printSettings.sub || 'Horário Escolar';
    const logoSrc = printSettings.logo || '';

    let headerHTML = `
        <div class="print-header-base text-center mb-4 border-b pb-2">
            ${logoSrc ? `<img src="${logoSrc}" class="h-16 mx-auto mb-2 object-contain">` : ''}
            <h1 class="text-2xl font-bold uppercase">${escapeHTML(schoolName)}</h1>
            <p class="text-gray-600">${escapeHTML(subTitle)}</p>
        </div>
    `;

    for (let i = 0; i < totalTurmas; i += TURMAS_POR_PAGINA) {
        const sliceClasses = classes.slice(i, i + TURMAS_POR_PAGINA);

        let tableHTML = `<div class="print-page-break"><table class="w-full border-collapse text-xs mb-8 page-break-inside-avoid">`;

        tableHTML += `<thead><tr class="bg-gray-100"><th class="border border-black p-2 w-12">DIA</th><th class="border border-black p-2 w-10">AULA</th>`;
        sliceClasses.forEach(cls => {
            tableHTML += `<th class="border border-black p-2">${escapeHTML(cls)}</th>`;
        });
        tableHTML += `</tr></thead><tbody>`;

        globalDays.forEach((day, dIdx) => {
            for (let s = 0; s < globalSlotsPerDay; s++) {
                tableHTML += `<tr>`;

                if (s === 0) {
                    tableHTML += `<td rowspan="${globalSlotsPerDay}" class="border border-black p-1 text-center font-bold writing-vertical rotate-180 bg-gray-50">${escapeHTML(day.substring(0, 3))}</td>`;
                }

                tableHTML += `<td class="border border-black p-1 text-center font-bold">${s + 1}ª</td>`;

                sliceClasses.forEach(cls => {
                    const item = currentSchedule[day]?.[s]?.[cls];
                    if (item) {
                        tableHTML += `<td class="border border-black p-1 h-16 align-top" style="background-color: ${item.bgColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                            <div class="flex flex-col items-center justify-center h-full">
                                <span class="font-bold text-center leading-tight" style="color:${item.textColor}">${escapeHTML(item.subject)}</span>
                                <span class="text-[10px] text-center w-full truncate" style="color:${item.textColor}">${escapeHTML(item.teacher)}</span>
                            </div>
                        </td>`;
                    } else {
                        tableHTML += `<td class="border border-black p-1 h-16"></td>`;
                    }
                });
                tableHTML += `</tr>`;
            }
            tableHTML += `<tr class="h-1 bg-gray-300"><td colspan="${sliceClasses.length + 2}" class="border-0"></td></tr>`;
        });

        tableHTML += `</tbody></table></div>`;

        const pageDiv = document.createElement('div');
        pageDiv.className = 'print-page-container';
        pageDiv.innerHTML = headerHTML + tableHTML;
        printArea.appendChild(pageDiv);
    }
}

// =================================================================
// 15. SISTEMA DE RELATÓRIOS (PROFESSOR E TURMA)
// =================================================================

function openTeacherReportModal() {
    const select = document.getElementById('reportTeacherSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione o Professor...</option>';

    let teachers = [];
    if (teacherRegistry && teacherRegistry.length > 0) {
        teachers = teacherRegistry.map(t => t.name);
    } else {
        teachers = [...new Set(allocations.map(a => a.teacher))];
    }

    teachers.sort().forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.innerText = t;
        select.appendChild(opt);
    });

    const tbody = document.querySelector('#teacherReportTable tbody');
    if (tbody) tbody.innerHTML = '';

    document.getElementById('teacherReportModal').style.display = 'flex';
}

function updateTeacherReportTable() {
    const teacherName = document.getElementById('reportTeacherSelect').value;
    const tbody = document.querySelector('#teacherReportTable tbody');
    if (!teacherName || !tbody) return;

    let html = '';

    for (let s = 0; s < globalSlotsPerDay; s++) {
        html += `<tr><td class="border p-2 font-bold bg-slate-50">${s + 1}ª Aula</td>`;

        globalDays.forEach(day => {
            let found = false;
            let cellContent = '-';

            if (currentSchedule[day] && currentSchedule[day][s]) {
                const slots = currentSchedule[day][s];
                for (const [cls, data] of Object.entries(slots)) {
                    if (data && data.teacher === teacherName) {
                        cellContent = `<div class="text-sm"><span class="font-bold text-indigo-700">${cls}</span><br><span class="text-xs text-slate-500">${data.subject}</span></div>`;
                        found = true;
                        break;
                    }
                }
            }
            html += `<td class="border p-2 text-center h-16 align-middle">${cellContent}</td>`;
        });

        html += '</tr>';
    }
    tbody.innerHTML = html;
}

function printTeacherReport() {
    const teacherName = document.getElementById('reportTeacherSelect').value;
    if (!teacherName) return showToast("Selecione um professor primeiro.", "error");

    document.body.classList.add('printing-teacher');

    window.print();

    setTimeout(() => {
        document.body.classList.remove('printing-teacher');
    }, 500);
}

function openClassReportModal() {
    const select = document.getElementById('reportClassSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione a Turma...</option>';
    classes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.innerText = c;
        select.appendChild(opt);
    });

    const tbody = document.querySelector('#classReportTable tbody');
    if (tbody) tbody.innerHTML = '';

    document.getElementById('classReportModal').style.display = 'flex';
}

function updateClassReportTable() {
    const className = document.getElementById('reportClassSelect').value;
    const tbody = document.querySelector('#classReportTable tbody');
    if (!className || !tbody) return;

    let html = '';

    for (let s = 0; s < globalSlotsPerDay; s++) {
        html += `<tr><td class="border p-2 font-bold bg-slate-50">${s + 1}ª Aula</td>`;

        globalDays.forEach(day => {
            let cellContent = '-';

            if (currentSchedule[day] && currentSchedule[day][s]) {
                const data = currentSchedule[day][s][className];
                if (data) {
                    cellContent = `<div class="text-sm"><span class="font-bold text-slate-800">${data.subject}</span><br><span class="text-xs text-slate-500">${data.teacher}</span></div>`;
                }
            }
            html += `<td class="border p-2 text-center h-16 align-middle">${cellContent}</td>`;
        });
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

function printClassReport() {
    const className = document.getElementById('reportClassSelect').value;
    if (!className) return showToast("Selecione uma turma primeiro.", "error");

    document.body.classList.add('printing-class');
    window.print();
    setTimeout(() => {
        document.body.classList.remove('printing-class');
    }, 500);
}

function closeReportModal() {
    document.getElementById('teacherReportModal').style.display = 'none';
    document.getElementById('classReportModal').style.display = 'none';
}

function clearSchedule() {
    if (!confirm("Tem certeza que deseja limpar toda a grade horária? \nIsso removerá todas as aulas geradas e destravará as células fixas.")) return;

    recordHistory();

    initEmptySchedule();

    lockedCells = {};

    renderCurrentSchedule();
    saveData();

    showToast("Grade limpa com sucesso.", "success");
    updateDashboard();
}