const firebaseConfig = {
  apiKey: "AIzaSyAEAEYZjv8VGkpu7MlBggFIdY8e_1xZYS4",
  authDomain: "phone-2f7ee.firebaseapp.com",
  projectId: "phone-2f7ee",
  storageBucket: "phone-2f7ee.appspot.com",
  messagingSenderId: "1017451701717",
  appId: "1:1017451701717:web:eaa50d92c166897a7d895c",
  databaseURL: "https://phone-2f7ee-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let stores = [];
window.filteredStores = [];
window.currentFilter = 'all';
window.searchQuery = '';
window.currentRange = 'all';

const el = (id) => document.getElementById(id);

// --- PIN Lockout Logic ---
let pinAttempts = parseInt(localStorage.getItem('pin_attempts') || '0');
let lockUntil = parseInt(localStorage.getItem('pin_lock_until') || '0');

function checkLock() {
    const now = Date.now();
    if (now < lockUntil) {
        const mins = Math.ceil((lockUntil - now) / 60000);
        alert(`تم قفل النظام مؤقتاً. حاول بعد ${mins} دقائق.`);
        return true;
    }
    return false;
}

window.handlePinSubmit = function() {
    if (checkLock()) return;
    
    var correctPin = localStorage.getItem('admin_pin') || '1234';
    const errorMsg = document.getElementById('pin-error-msg');
    
    if (window.enteredPin === correctPin) {
        localStorage.setItem('pin_attempts', '0');
        document.getElementById('pin-overlay').style.display = 'none';
        if (window.applyFilters) window.applyFilters();
    } else {
        pinAttempts++;
        localStorage.setItem('pin_attempts', pinAttempts.toString());
        if (pinAttempts >= 3) {
            lockUntil = Date.now() + (5 * 60 * 1000);
            localStorage.setItem('pin_lock_until', lockUntil.toString());
            if (errorMsg) errorMsg.innerText = 'تم قفل النظام لـ 5 دقائق.';
        } else {
            if (errorMsg) errorMsg.innerText = `الرمز خاطئ! تبقى لك ${3 - pinAttempts} محاولات.`;
        }
        window.enteredPin = '';
        if (window.updateDots) window.updateDots();
    }
};

window.pinSubmit = window.handlePinSubmit;

// --- Utils ---
const calculateDaysLeft = (expiryDate) => {
    if (!expiryDate) return 0;
    return Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
};

const getStatus = (expiryDate) => {
    const days = calculateDaysLeft(expiryDate);
    return days < 0 ? 'منتهي' : (days <= 7 ? 'تحذير' : 'نشط');
};

const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';

window.generateKey = () => {
    const s = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `NGP-${s()}-${s()}-${s()}`;
};

// --- Store Rendering (SRS 2.د) ---
window.renderStores = function() {
    const grid = el('store-list');
    if (!grid) return;
    if (window.filteredStores.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; opacity: 0.5;">لا توجد بيانات</div>`;
        return;
    }
    grid.innerHTML = window.filteredStores.map(store => {
        const status = getStatus(store.expiryDate);
        const used = store.storageUsed || 0;
        const limit = store.storageLimit || 100;
        const percent = Math.min((used / limit) * 100, 100);
        let color = 'var(--accent)';
        if (percent >= 90) color = 'var(--danger)';
        else if (percent >= 70) color = 'var(--warning)';
        
        return `<div class="store-card" onclick="window.openMenu('${store.id}')" style="cursor: pointer;">
            <div class="menu-trigger" onclick="event.stopPropagation(); window.openMenu('${store.id}')"><i class="fas fa-ellipsis-v"></i></div>
            <div class="card-header">
                <div class="store-name">
                    <h4>${store.name || 'بدون اسم'}</h4>
                    <span>${store.phone || 'بدون جوال'}</span>
                </div>
                <div class="status-badge status-${status === 'نشط' ? 'active' : (status === 'تحذير' ? 'warning' : 'expired')}">${status}</div>
            </div>
            <div class="info-grid">
                <div class="info-item"><label>الانتهاء</label><span>${formatDate(store.expiryDate)}</span></div>
                <div class="info-item"><label>المتبقي</label><span>${calculateDaysLeft(store.expiryDate)} يوم</span></div>
                <div class="info-item"><label>الموظفين</label><span>${store.subUsers}</span></div>
                <div class="info-item"><label>الفواتير</label><span>${store.invoicesCount}</span></div>
            </div>
            <div class="storage-section">
                <div class="storage-labels"><span>المساحة</span><span>${used.toFixed(1)} / ${limit} MB</span></div>
                <div class="progress-container"><div class="progress-bar" style="width: ${percent}%; background: ${color}"></div></div>
            </div>
            <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="event.stopPropagation(); window.openExtend('${store.id}')">تمديد الترخيص</button>
        </div>`;
    }).join('');
};

window.updateStats = function() {
    if (!el('stat-total')) return;
    el('stat-total').innerText = stores.length;
    el('stat-active').innerText = stores.filter(s => getStatus(s.expiryDate) === 'نشط').length;
    el('stat-warning').innerText = stores.filter(s => getStatus(s.expiryDate) === 'تحذير').length;
    el('stat-expired').innerText = stores.filter(s => getStatus(s.expiryDate) === 'منتهي').length;
};

window.applyFilters = function() {
    window.filteredStores = stores.filter(s => {
        const status = getStatus(s.expiryDate);
        const name = (s.name || '').toLowerCase();
        const phone = (s.phone || '').toLowerCase();
        const query = window.searchQuery.toLowerCase();
        const matchesSearch = name.includes(query) || phone.includes(query);
        const matchesStat = (window.currentFilter === 'all' || (window.currentFilter === 'active' && status === 'نشط') || (window.currentFilter === 'warning' && status === 'تحذير') || (window.currentFilter === 'expired' && status === 'منتهي'));
        let matchesRange = true;
        if (window.currentRange !== 'all') {
            const d = calculateDaysLeft(s.expiryDate);
            if (window.currentRange === 'expired') matchesRange = d < 0;
            else matchesRange = (d >= 0 && d <= parseInt(window.currentRange));
        }
        return matchesSearch && matchesStat && matchesRange;
    });
    window.renderStores();
};

// --- Sync & Data ---
function initSync() {
    db.ref('Stores').on('value', (snapshot) => {
        const data = snapshot.val();
        stores = data ? Object.keys(data).map(id => ({
            id, ...data[id].details,
            storageUsed: data[id].storageUsed || 0,
            storageLimit: data[id].storageLimit || 100,
            subUsers: data[id].staff_codes ? Object.keys(data[id].staff_codes).length : 0,
            invoicesCount: data[id].invoicesCount || 0
        })) : [];
        window.applyFilters();
        window.updateStats();
    });

    db.ref('Licenses').on('value', (snap) => {
        const data = snap.val();
        const keys = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
        const tbody = el('keys-table-body');
        if (!tbody) return;
        tbody.innerHTML = keys.map(k => `<tr>
            <td style="padding: 10px;">${k.key}</td>
            <td style="padding: 10px;">${formatDate(k.expiryDate)}</td>
            <td style="padding: 10px;">${k.status === 'unused' ? 'متاح' : 'مستخدم'}</td>
            <td style="padding: 10px;"><button class="btn btn-ghost" style="color:var(--danger)" onclick="window.deleteKey('${k.id}')">حذف</button></td>
        </tr>`).join('');
    });
}

// --- Modals & Actions ---
window.showModal = (id) => {
    document.querySelectorAll('.modal-overlay').forEach(m => { if(m.id !== 'pin-overlay') m.style.display = 'none'; });
    const m = el(id);
    if (m) m.style.display = 'flex';
};

window.closeAllModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => { if(m.id !== 'pin-overlay') m.style.display = 'none'; });
};

window.openExtend = (id) => {
    const s = stores.find(x => x.id === id);
    if (!s) return;
    el('extend-store-name').innerText = s.name;
    el('extend-new-date').value = formatDate(s.expiryDate);
    el('modal-extend').dataset.activeId = id;
    window.showModal('modal-extend');
};

window.openMenu = (id) => {
    const s = stores.find(x => x.id === id);
    if (!s) return;
    el('det-name').value = s.name || '';
    el('det-phone').value = s.phone || '';
    el('det-pass').value = s.password || '';
    el('det-storage-limit').value = s.storageLimit || 100;
    el('det-expiry').value = formatDate(s.expiryDate);
    el('det-used-key').innerText = s.usedKey || 'لا يوجد';
    el('modal-store-details').dataset.activeId = id;
    loadStaff(id);
    window.showModal('modal-store-details');
};

function loadStaff(id) {
    const list = el('det-staff-list');
    db.ref(`Stores/${id}/staff_codes`).once('value', (snap) => {
        const staff = snap.val();
        list.innerHTML = staff ? Object.keys(staff).map(code => `<tr>
            <td style="padding: 5px;">${staff[code].name}</td>
            <td style="padding: 5px;">${code}</td>
            <td style="text-align: center;"><button class="btn btn-ghost" style="color:var(--danger); padding:4px;" onclick="window.deleteSingleStaff('${id}', '${code}')"><i class="fas fa-trash"></i></button></td>
        </tr>`).join('') : '<tr><td colspan="3" style="text-align:center; padding:10px; opacity:0.5;">لا يوجد موظفين</td></tr>';
    });
}

window.deleteSingleStaff = (sid, code) => db.ref(`Stores/${sid}/staff_codes/${code}`).remove().then(() => loadStaff(sid));
window.deleteKey = (id) => db.ref(`Licenses/${id}`).remove();

// --- Event Listeners ---
function setupListeners() {
    if (el('search-input')) el('search-input').oninput = (e) => { window.searchQuery = e.target.value; window.applyFilters(); };
    document.querySelectorAll('.stat-card').forEach(c => c.onclick = () => { window.currentFilter = c.dataset.filter; window.applyFilters(); });
    document.querySelectorAll('.chip').forEach(c => c.onclick = () => {
        document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        window.currentRange = c.dataset.range;
        window.applyFilters();
    });

    if (el('save-new-key')) el('save-new-key').onclick = () => {
        const val = parseInt(el('new-key-value').value);
        const unit = el('new-key-unit').value;
        const key = el('display-new-key').innerText;
        let exp = new Date();
        if (unit === 'hours') exp.setHours(exp.getHours() + val);
        else if (unit === 'days') exp.setDate(exp.getDate() + val);
        else if (unit === 'months') exp.setMonth(exp.getMonth() + val);
        else if (unit === 'years') exp.setFullYear(exp.getFullYear() + val);
        
        db.ref(`Licenses/${key}`).set({
            key, expiryDate: exp.toISOString(), status: 'unused', createdAt: new Date().toISOString()
        }).then(() => { alert('تم إنشاء المفتاح بنجاح'); window.closeAllModals(); });
    };

    if (el('save-extension')) el('save-extension').onclick = () => {
        const id = el('modal-extend').dataset.activeId;
        const date = el('extend-new-date').value;
        db.ref(`Stores/${id}/details`).update({ expiryDate: new Date(date).toISOString() }).then(() => { alert('تم التمديد'); window.closeAllModals(); });
    };

    if (el('btn-det-save')) el('btn-det-save').onclick = () => {
        const id = el('modal-store-details').dataset.activeId;
        const updates = {
            name: el('det-name').value,
            phone: el('det-phone').value,
            password: el('det-pass').value,
            expiryDate: new Date(el('det-expiry').value).toISOString()
        };
        db.ref(`Stores/${id}/details`).update(updates).then(() => {
            return db.ref(`Stores/${id}`).update({ storageLimit: parseInt(el('det-storage-limit').value) });
        }).then(() => { alert('تم حفظ التغييرات'); window.closeAllModals(); });
    };

    if (el('btn-det-delete-account')) el('btn-det-delete-account').onclick = () => {
        if (confirm('هل أنت متأكد؟ سيتم حذف المتجر نهائياً من التطبيق.')) {
            if (confirm('تأكيد أخير: حذف الحساب نهائياً؟')) {
                const id = el('modal-store-details').dataset.activeId;
                db.ref(`Stores/${id}`).remove().then(() => { alert('تم الحذف بنجاح'); window.closeAllModals(); });
            }
        }
    };

    if (el('save-settings')) el('save-settings').onclick = () => {
        const pin = el('settings-pin').value;
        if (pin.length >= 4 && pin.length <= 6) {
            localStorage.setItem('admin_pin', pin);
            db.ref('admin/settings').update({ pin: pin });
            alert('تم حفظ الرمز الجديد');
        } else {
            alert('يجب أن يكون الرمز بين 4 و 6 أرقام');
        }
    };

    // --- Excel Export (SRS 3.هـ.3) ---
    if (el('btn-export-all')) el('btn-export-all').onclick = () => {
        let csv = '\uFEFFالاسم,الجوال,تاريخ الانتهاء,الموظفين,الفواتير\n';
        stores.forEach(s => {
            csv += `${s.name},${s.phone},${formatDate(s.expiryDate)},${s.subUsers},${s.invoicesCount}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `stores_report_${new Date().toLocaleDateString('ar-EG')}.csv`;
        link.click();
    };

    document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => window.closeAllModals());
}

window.toggleTheme = (target) => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = target || (current === 'dark' ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    db.ref('admin/settings').update({ theme: next });
    
    const container = el('theme-icon-svg');
    const sun = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    if (container) container.innerHTML = next === 'dark' ? sun : moon;
};

// --- Initialization ---
initSync();
setupListeners();
window.toggleTheme(localStorage.getItem('theme') || 'dark');
if (checkLock()) { /* UI remains locked by overlay */ }
