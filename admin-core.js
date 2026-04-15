/**
 * admin-core.js
 * Parish CMS — Authentication, Toolbar, Inline Editing, Page Builder
 * Requires: Firebase v10 (loaded via CDN in each HTML file)
 */

// ══════════════════════════════════════════════════════════════════
//  FIREBASE CONFIG  — Replace with your own project's config
// ══════════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyAyPD8doWSSKVPClFZEDIugwBQDkVQQuus",
  authDomain: "askbalparish.firebaseapp.com",
  projectId: "askbalparish",
  storageBucket: "askbalparish.firebasestorage.app",
  messagingSenderId: "155232908107",
  appId: "1:155232908107:web:356342d57a54c4ebd0aece"
};

// ══════════════════════════════════════════════════════════════════
//  INITIALISE FIREBASE (once, guard against double-load)
// ══════════════════════════════════════════════════════════════════
import { initializeApp, getApps }           from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged,
         signInWithEmailAndPassword,
         signOut, sendPasswordResetEmail }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc,
         setDoc, collection, getDocs,
         addDoc, deleteDoc, serverTimestamp,
         query, orderBy, limit }            from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref as storageRef,
         uploadBytes, getDownloadURL,
         deleteObject }                     from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const app  = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);
const storage = getStorage(app);

// ══════════════════════════════════════════════════════════════════
//  PAGE DETECTION
// ══════════════════════════════════════════════════════════════════
const PAGE_ID = location.pathname.split('/').pop().replace('.html','') || 'index';

// ══════════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════════
let adminMode   = false;
let unsaved     = false;
let pendingEdits = {};   // { fieldId: newValue }

// ══════════════════════════════════════════════════════════════════
//  1.  AUTH MODAL — login / forgot password
// ══════════════════════════════════════════════════════════════════
function injectAuthModal() {
  if (document.getElementById('adminAuthModal')) return;
  const modal = document.createElement('div');
  modal.id = 'adminAuthModal';
  modal.innerHTML = `
    <div class="adm-overlay" id="admOverlay">
      <div class="adm-modal" role="dialog" aria-modal="true" aria-labelledby="admModalTitle">
        <div class="adm-modal-header">
          <span class="adm-modal-cross">&#10015;</span>
          <h2 class="adm-modal-title" id="admModalTitle">Parish Admin Login</h2>
          <p class="adm-modal-sub">Askeaton &amp; Ballysteen Parish CMS</p>
        </div>

        <!-- LOGIN PANEL -->
        <div id="admLoginPanel" class="adm-panel">
          <div class="adm-field">
            <label class="adm-label" for="admEmail">Email Address</label>
            <input class="adm-input" type="email" id="admEmail" autocomplete="email" placeholder="admin@parish.ie">
          </div>
          <div class="adm-field">
            <label class="adm-label" for="admPassword">Password</label>
            <input class="adm-input" type="password" id="admPassword" autocomplete="current-password" placeholder="••••••••">
          </div>
          <label class="adm-check-row">
            <input type="checkbox" id="admRemember"> Remember me on this device
          </label>
          <p class="adm-error" id="admError" role="alert"></p>
          <button class="adm-btn-primary" id="admLoginBtn">Sign In</button>
          <button class="adm-btn-ghost" id="admForgotBtn">Forgot password?</button>
          <button class="adm-btn-ghost" id="admCancelBtn">Cancel</button>
        </div>

        <!-- FORGOT PASSWORD PANEL -->
        <div id="admForgotPanel" class="adm-panel" style="display:none">
          <p style="font-size:0.9rem;color:var(--text-mid);margin-bottom:1rem;">
            Enter your admin email address and we will send a password reset link.
          </p>
          <div class="adm-field">
            <label class="adm-label" for="admResetEmail">Email Address</label>
            <input class="adm-input" type="email" id="admResetEmail" placeholder="admin@parish.ie">
          </div>
          <p class="adm-error" id="admResetMsg" role="alert"></p>
          <button class="adm-btn-primary" id="admResetBtn">Send Reset Link</button>
          <button class="adm-btn-ghost" id="admBackToLogin">Back to Login</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Events
  document.getElementById('admLoginBtn').addEventListener('click', handleLogin);
  document.getElementById('admPassword').addEventListener('keydown', e => { if(e.key==='Enter') handleLogin(); });
  document.getElementById('admCancelBtn').addEventListener('click', closeAuthModal);
  document.getElementById('admForgotBtn').addEventListener('click', () => {
    document.getElementById('admLoginPanel').style.display = 'none';
    document.getElementById('admForgotPanel').style.display = 'block';
  });
  document.getElementById('admBackToLogin').addEventListener('click', () => {
    document.getElementById('admForgotPanel').style.display = 'none';
    document.getElementById('admLoginPanel').style.display = 'block';
  });
  document.getElementById('admResetBtn').addEventListener('click', handleReset);
  document.getElementById('admOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('admOverlay')) closeAuthModal();
  });
}

async function handleLogin() {
  const email = document.getElementById('admEmail').value.trim();
  const pass  = document.getElementById('admPassword').value;
  const err   = document.getElementById('admError');
  err.textContent = '';
  if (!email || !pass) { err.textContent = 'Please enter your email and password.'; return; }
  try {
    document.getElementById('admLoginBtn').textContent = 'Signing in…';
    await signInWithEmailAndPassword(auth, email, pass);
    closeAuthModal();
  } catch(e) {
    document.getElementById('admLoginBtn').textContent = 'Sign In';
    err.textContent = friendlyAuthError(e.code);
  }
}

async function handleReset() {
  const email = document.getElementById('admResetEmail').value.trim();
  const msg   = document.getElementById('admResetMsg');
  if (!email) { msg.textContent = 'Please enter your email address.'; return; }
  try {
    await sendPasswordResetEmail(auth, email);
    msg.style.color = 'green';
    msg.textContent = 'Reset link sent! Check your email.';
  } catch(e) {
    msg.style.color = '';
    msg.textContent = friendlyAuthError(e.code);
  }
}

function friendlyAuthError(code) {
  const map = {
    'auth/invalid-email':          'Invalid email address.',
    'auth/user-not-found':         'No account found with that email.',
    'auth/wrong-password':         'Incorrect password.',
    'auth/invalid-credential':     'Incorrect email or password.',
    'auth/too-many-requests':      'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'An error occurred. Please try again.';
}

function closeAuthModal() {
  const modal = document.getElementById('adminAuthModal');
  if (modal) modal.remove();
}

// ══════════════════════════════════════════════════════════════════
//  2.  ADMIN TOOLBAR
// ══════════════════════════════════════════════════════════════════
function injectAdminBar(user) {
  if (document.getElementById('adminBar')) return;
  const bar = document.createElement('div');
  bar.id = 'adminBar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Admin toolbar');
  bar.innerHTML = `
    <div class="adm-bar-inner">
      <div class="adm-bar-left">
        <span class="adm-bar-logo">&#10015; Parish CMS</span>
        <span class="adm-bar-page">${PAGE_ID}</span>
      </div>
      <div class="adm-bar-center">
        <label class="adm-toggle-label" for="admModeToggle">
          <input type="checkbox" id="admModeToggle" role="switch" aria-checked="false">
          <span class="adm-toggle-track"><span class="adm-toggle-thumb"></span></span>
          <span class="adm-toggle-text" id="admModeLabel">Edit Mode: Off</span>
        </label>
      </div>
      <div class="adm-bar-right">
        <button class="adm-bar-btn adm-bar-btn--ghost" id="admHistoryBtn" title="Version history">&#9783; History</button>
        <button class="adm-bar-btn adm-bar-btn--ghost" id="admAddNewsBtn" title="Create news article">+ News</button>
        <button class="adm-bar-btn adm-bar-btn--discard" id="admDiscardBtn" disabled>Discard</button>
        <button class="adm-bar-btn adm-bar-btn--save"    id="admSaveBtn"    disabled>Save Changes</button>
        <button class="adm-bar-btn adm-bar-btn--logout"  id="admLogoutBtn">Sign Out</button>
      </div>
    </div>
    <div class="adm-unsaved-dot" id="admUnsavedDot" aria-hidden="true"></div>`;
  // Insert right after <body> opens (before any site content)
  document.body.insertBefore(bar, document.body.firstChild);
  document.body.classList.add('has-admin-bar');

  document.getElementById('admModeToggle').addEventListener('change', toggleEditMode);
  document.getElementById('admSaveBtn').addEventListener('click', saveAllChanges);
  document.getElementById('admDiscardBtn').addEventListener('click', discardChanges);
  document.getElementById('admLogoutBtn').addEventListener('click', () => signOut(auth));
  document.getElementById('admHistoryBtn').addEventListener('click', openHistory);
  document.getElementById('admAddNewsBtn').addEventListener('click', openNewsEditor);
}

function removeAdminBar() {
  const bar = document.getElementById('adminBar');
  if (bar) bar.remove();
  document.body.classList.remove('has-admin-bar', 'admin-edit-mode');
}

// ══════════════════════════════════════════════════════════════════
//  3.  EDIT MODE — inline editing with [Edit] buttons
// ══════════════════════════════════════════════════════════════════
function toggleEditMode() {
  adminMode = !adminMode;
  const toggle = document.getElementById('admModeToggle');
  const label  = document.getElementById('admModeLabel');
  toggle.setAttribute('aria-checked', adminMode);
  label.textContent = adminMode ? 'Edit Mode: On' : 'Edit Mode: Off';
  document.body.classList.toggle('admin-edit-mode', adminMode);

  if (adminMode) {
    activateEditMode();
    // Also activate page builder on index
    if (PAGE_ID === 'index') activatePageBuilder();
  } else {
    deactivateEditMode();
  }
}

// Selectors for editable regions
const EDITABLE_SELECTORS = [
  '.quick-card-value',
  '.quick-card-label',
  '.hero-title',
  '.hero-tagline',
  '.section-title',
  '.section-subtitle',
  '.church-card-body p',
  '.prose p',
  '.prose h2',
  '.prose h3',
  '.mass-time',
  '.contact-card-title',
  '.news-full-title',
  '.news-full-text p',
  '[data-editable]',
];

function activateEditMode() {
  // Load saved content from Firebase first, then apply edit buttons
  loadPageContent().then(() => {
    document.querySelectorAll(EDITABLE_SELECTORS.join(',')).forEach(el => {
      if (el.closest('#adminBar') || el.closest('#adminAuthModal') ||
          el.closest('.adm-modal') || el.dataset.editAttached) return;
      attachEditButton(el);
    });
  });
}

function deactivateEditMode() {
  document.querySelectorAll('.adm-edit-btn').forEach(b => b.remove());
  document.querySelectorAll('[data-edit-attached]').forEach(el => {
    el.removeAttribute('data-edit-attached');
    el.removeAttribute('contenteditable');
    el.classList.remove('adm-editable-active');
  });
}

function attachEditButton(el) {
  el.dataset.editAttached = '1';
  el.setAttribute('data-field-id', el.dataset.fieldId || makeFieldId(el));

  const wrapper = document.createElement('span');
  wrapper.style.cssText = 'position:relative;display:inline;';
  el.parentNode.insertBefore(wrapper, el);
  wrapper.appendChild(el);

  const btn = document.createElement('button');
  btn.className = 'adm-edit-btn';
  btn.setAttribute('aria-label', 'Edit this text');
  btn.innerHTML = '&#9998; Edit';
  btn.addEventListener('click', () => beginEdit(el, btn));
  wrapper.appendChild(btn);
}

function makeFieldId(el) {
  const tag  = el.tagName.toLowerCase();
  const cls  = [...el.classList].filter(c => !c.startsWith('adm-')).join('-') || 'text';
  const idx  = [...document.querySelectorAll(tag + '.' + [...el.classList][0])].indexOf(el);
  return `${PAGE_ID}__${cls}__${idx}`;
}

function beginEdit(el, btn) {
  el.setAttribute('contenteditable', 'true');
  el.classList.add('adm-editable-active');
  el.focus();

  btn.innerHTML = '&#10003; Done';
  btn.classList.add('adm-edit-btn--done');

  // Move cursor to end
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  btn.onclick = () => finishEdit(el, btn);
  el.addEventListener('keydown', e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); finishEdit(el, btn); } }, { once: true });
}

function finishEdit(el, btn) {
  const fieldId  = el.dataset.fieldId;
  const newValue = el.innerHTML;
  el.removeAttribute('contenteditable');
  el.classList.remove('adm-editable-active');

  btn.innerHTML = '&#9998; Edit';
  btn.classList.remove('adm-edit-btn--done');
  btn.onclick = () => beginEdit(el, btn);

  // Check if same field exists elsewhere (e.g. Mass times appear on index + masses pages)
  const allSameField = document.querySelectorAll(`[data-field-id="${fieldId}"]`);
  if (allSameField.length > 1) {
    const applyAll = confirm('This content appears in multiple places.\n\nApply this change everywhere on this page?');
    if (applyAll) {
      allSameField.forEach(node => { node.innerHTML = newValue; });
    }
  }

  pendingEdits[fieldId] = newValue;
  markUnsaved();
}

function markUnsaved() {
  unsaved = true;
  document.getElementById('admSaveBtn').disabled    = false;
  document.getElementById('admDiscardBtn').disabled = false;
  document.getElementById('admUnsavedDot').style.display = 'block';
}

function clearUnsaved() {
  unsaved = false;
  pendingEdits = {};
  document.getElementById('admSaveBtn').disabled    = true;
  document.getElementById('admDiscardBtn').disabled = true;
  document.getElementById('admUnsavedDot').style.display = 'none';
}

// ══════════════════════════════════════════════════════════════════
//  4.  FIREBASE LOAD / SAVE
// ══════════════════════════════════════════════════════════════════
async function loadPageContent() {
  try {
    const docRef  = doc(db, 'pages', PAGE_ID);
    const snap    = await getDoc(docRef);
    if (!snap.exists()) return;
    const fields  = snap.data().fields || {};
    Object.entries(fields).forEach(([fieldId, value]) => {
      const el = document.querySelector(`[data-field-id="${fieldId}"]`);
      if (el) el.innerHTML = value;
    });
  } catch(e) {
    console.warn('Could not load page content from Firebase:', e);
  }
}

async function saveAllChanges() {
  const btn = document.getElementById('admSaveBtn');
  btn.textContent = 'Saving…';
  btn.disabled = true;

  try {
    // Save a version snapshot first
    await addDoc(collection(db, 'versions'), {
      page:      PAGE_ID,
      fields:    pendingEdits,
      timestamp: serverTimestamp(),
      label:     new Date().toLocaleString('en-IE'),
    });

    // Merge with existing page fields
    const pageRef  = doc(db, 'pages', PAGE_ID);
    const existing = await getDoc(pageRef);
    const prev     = existing.exists() ? (existing.data().fields || {}) : {};
    await setDoc(pageRef, { fields: { ...prev, ...pendingEdits }, updatedAt: serverTimestamp() });

    btn.textContent = '✓ Saved!';
    setTimeout(() => { btn.textContent = 'Save Changes'; }, 2500);
    clearUnsaved();
    showToast('Changes saved successfully.', 'success');
  } catch(e) {
    console.error(e);
    btn.textContent = 'Save Changes';
    btn.disabled = false;
    showToast('Error saving. Check your connection.', 'error');
  }
}

async function discardChanges() {
  if (!confirm('Discard all unsaved changes and reload the page?')) return;
  pendingEdits = {};
  clearUnsaved();
  location.reload();
}

// ══════════════════════════════════════════════════════════════════
//  5.  VERSION HISTORY PANEL
// ══════════════════════════════════════════════════════════════════
async function openHistory() {
  const panel = document.getElementById('admHistoryPanel') || createHistoryPanel();
  panel.style.display = 'flex';
  const list = document.getElementById('admHistoryList');
  list.innerHTML = '<p style="color:var(--text-light);font-style:italic;">Loading history…</p>';

  try {
    const q    = query(collection(db, 'versions'), orderBy('timestamp','desc'), limit(20));
    const snap = await getDocs(q);
    if (snap.empty) { list.innerHTML = '<p>No saved versions yet.</p>'; return; }
    list.innerHTML = '';
    snap.forEach(vDoc => {
      const d   = vDoc.data();
      const row = document.createElement('div');
      row.className = 'adm-hist-row';
      row.innerHTML = `
        <div>
          <div class="adm-hist-label">${d.label || '(unlabelled)'}</div>
          <div class="adm-hist-page">Page: ${d.page}</div>
          <div class="adm-hist-fields">${Object.keys(d.fields||{}).length} field(s) changed</div>
        </div>
        <button class="adm-bar-btn adm-bar-btn--ghost" data-vid="${vDoc.id}" data-page="${d.page}">Restore</button>`;
      row.querySelector('button').addEventListener('click', () => restoreVersion(vDoc.id, d));
      list.appendChild(row);
    });
  } catch(e) { list.innerHTML = '<p>Could not load history.</p>'; }
}

function createHistoryPanel() {
  const panel = document.createElement('div');
  panel.id = 'admHistoryPanel';
  panel.className = 'adm-side-panel';
  panel.innerHTML = `
    <div class="adm-side-header">
      <h3>Version History</h3>
      <button class="adm-side-close" id="admHistoryClose" aria-label="Close">&times;</button>
    </div>
    <div id="admHistoryList" class="adm-side-body"></div>`;
  document.body.appendChild(panel);
  document.getElementById('admHistoryClose').addEventListener('click', () => { panel.style.display='none'; });
  return panel;
}

async function restoreVersion(vId, data) {
  if (!confirm(`Restore this version from ${data.label}?\nThis will overwrite current saved content for page: ${data.page}.`)) return;
  try {
    const pageRef  = doc(db, 'pages', data.page);
    const existing = await getDoc(pageRef);
    const prev     = existing.exists() ? (existing.data().fields || {}) : {};
    await setDoc(pageRef, { fields: { ...prev, ...data.fields }, updatedAt: serverTimestamp() });
    showToast('Version restored. Reloading…', 'success');
    setTimeout(() => location.reload(), 1500);
  } catch(e) { showToast('Restore failed.', 'error'); }
}

// ══════════════════════════════════════════════════════════════════
//  6.  NEWS EDITOR MODAL
// ══════════════════════════════════════════════════════════════════
const ARTICLE_TYPES = [
  { value: 'general',  label: 'General Update',       badge: 'Parish News', badgeColor: '#B8934A' },
  { value: 'critical', label: 'Critical Update',      badge: 'Important',   badgeColor: '#8B1A1A' },
  { value: 'event',    label: 'Event Notice',         badge: 'Events',      badgeColor: '#1C2951' },
  { value: 'booking',  label: 'Event with Booking',   badge: 'Events',      badgeColor: '#1C2951' },
];

function openNewsEditor(existingData = null) {
  let modal = document.getElementById('admNewsModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'admNewsModal';
  const isEdit = !!existingData;
  const d = existingData || {};

  modal.innerHTML = `
    <div class="adm-overlay" id="admNewsOverlay">
      <div class="adm-modal adm-modal--wide" role="dialog" aria-modal="true">
        <div class="adm-modal-header">
          <span class="adm-modal-cross">&#10015;</span>
          <h2 class="adm-modal-title">${isEdit ? 'Edit Article' : 'Create News Article'}</h2>
        </div>
        <div class="adm-panel">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="adm-field">
              <label class="adm-label" for="newsType">Article Type</label>
              <select class="adm-input" id="newsType">
                ${ARTICLE_TYPES.map(t => `<option value="${t.value}" ${d.type===t.value?'selected':''}>${t.label}</option>`).join('')}
              </select>
            </div>
            <div class="adm-field">
              <label class="adm-label" for="newsCategory">Category</label>
              <select class="adm-input" id="newsCategory">
                <option ${d.category==='Parish News'?'selected':''}>Parish News</option>
                <option ${d.category==='Events'?'selected':''}>Events</option>
                <option ${d.category==='Sacraments'?'selected':''}>Sacraments</option>
                <option ${d.category==='Upcoming'?'selected':''}>Upcoming</option>
                <option ${d.category==='Notices'?'selected':''}>Notices</option>
              </select>
            </div>
          </div>
          <div class="adm-field">
            <label class="adm-label" for="newsTitle">Headline *</label>
            <input class="adm-input" type="text" id="newsTitle" value="${d.title||''}" placeholder="Article title…">
          </div>
          <div class="adm-field">
            <label class="adm-label" for="newsDate">Date *</label>
            <input class="adm-input" type="date" id="newsDate" value="${d.date||new Date().toISOString().split('T')[0]}">
          </div>
          <div class="adm-field">
            <label class="adm-label" for="newsExcerpt">Excerpt (short summary for homepage)</label>
            <input class="adm-input" type="text" id="newsExcerpt" value="${d.excerpt||''}" placeholder="One or two sentences…">
          </div>
          <div class="adm-field">
            <label class="adm-label" for="newsBody">Full Article Body *</label>
            <textarea class="adm-input adm-textarea" id="newsBody" rows="8" placeholder="Full article text. Use blank lines for paragraphs.">${d.body||''}</textarea>
          </div>

          <!-- Booking fields (shown only for booking type) -->
          <div id="bookingFields" style="display:none;border:1px dashed var(--border);border-radius:8px;padding:1rem;margin-top:0.5rem;">
            <p class="adm-label" style="margin-bottom:0.75rem;">&#128197; Booking Options</p>
            <div class="adm-field">
              <label class="adm-label" for="newsBookingUrl">Booking Link URL</label>
              <input class="adm-input" type="url" id="newsBookingUrl" value="${d.bookingUrl||''}" placeholder="https://…">
            </div>
            <div class="adm-field">
              <label class="adm-label" for="newsBookingLabel">Booking Button Label</label>
              <input class="adm-input" type="text" id="newsBookingLabel" value="${d.bookingLabel||'Book a Place'}" placeholder="Book a Place">
            </div>
            <div class="adm-field">
              <label class="adm-label" for="newsEventDate">Event Date &amp; Time</label>
              <input class="adm-input" type="datetime-local" id="newsEventDate" value="${d.eventDate||''}">
            </div>
            <div class="adm-field">
              <label class="adm-label" for="newsEventCapacity">Capacity (optional)</label>
              <input class="adm-input" type="number" id="newsEventCapacity" value="${d.capacity||''}" placeholder="e.g. 50">
            </div>
          </div>

          <!-- Image upload -->
          <div class="adm-field" style="margin-top:1rem;">
            <label class="adm-label">Images</label>
            ${d.images && d.images.length ? d.images.map((img,i) => `
              <div class="adm-img-preview" data-img="${img}">
                <img src="${img}" alt="Article image ${i+1}" style="height:80px;object-fit:cover;border-radius:4px;">
                <button class="adm-img-remove" data-img="${img}" title="Remove image">&times;</button>
              </div>`).join('') : ''}
            <label class="adm-upload-label" for="newsImages">
              <span>&#128247; Upload Images</span>
              <input type="file" id="newsImages" accept="image/*" multiple style="display:none">
            </label>
            <div id="newsImgPreviews" class="adm-img-previews"></div>
            <p style="font-size:0.8rem;color:var(--text-light);margin-top:0.3rem;">Images are automatically compressed. Max 5 per article.</p>
          </div>

          <p class="adm-error" id="newsError" role="alert"></p>
          <div style="display:flex;gap:1rem;margin-top:1rem;">
            <button class="adm-btn-primary" id="newsSubmitBtn">${isEdit?'Update Article':'Publish Article'}</button>
            <button class="adm-btn-ghost" id="newsCancelBtn">Cancel</button>
            ${isEdit ? `<button class="adm-btn-danger" id="newsDeleteBtn">Delete Article</button>` : ''}
          </div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // Show/hide booking fields
  const typeSelect = document.getElementById('newsType');
  const bookingDiv = document.getElementById('bookingFields');
  const checkBooking = () => { bookingDiv.style.display = typeSelect.value==='booking' ? 'block' : 'none'; };
  typeSelect.addEventListener('change', checkBooking);
  checkBooking();

  // Image preview
  const imagesInput = document.getElementById('newsImages');
  let pendingFiles = [];
  imagesInput.addEventListener('change', () => {
    const previews = document.getElementById('newsImgPreviews');
    [...imagesInput.files].slice(0, 5).forEach(file => {
      pendingFiles.push(file);
      const reader = new FileReader();
      reader.onload = e => {
        const wrap = document.createElement('div');
        wrap.className = 'adm-img-preview';
        wrap.innerHTML = `<img src="${e.target.result}" style="height:80px;object-fit:cover;border-radius:4px;"><button class="adm-img-remove" title="Remove">&times;</button>`;
        wrap.querySelector('button').onclick = () => {
          pendingFiles = pendingFiles.filter(f => f !== file);
          wrap.remove();
        };
        previews.appendChild(wrap);
      };
      reader.readAsDataURL(file);
    });
  });

  // Remove existing images
  modal.querySelectorAll('.adm-img-remove[data-img]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (d.images) d.images = d.images.filter(i => i !== btn.dataset.img);
      btn.closest('.adm-img-preview').remove();
    });
  });

  // Submit
  document.getElementById('newsSubmitBtn').addEventListener('click', () => publishArticle(d.id, pendingFiles, d.images));
  document.getElementById('newsCancelBtn').addEventListener('click', () => modal.remove());
  document.getElementById('admNewsOverlay').addEventListener('click', e => { if(e.target.id==='admNewsOverlay') modal.remove(); });

  if (isEdit && document.getElementById('newsDeleteBtn')) {
    document.getElementById('newsDeleteBtn').addEventListener('click', () => deleteArticle(d.id));
  }
}

async function publishArticle(existingId, pendingFiles, existingImages = []) {
  const btn   = document.getElementById('newsSubmitBtn');
  const error = document.getElementById('newsError');
  error.textContent = '';

  const title    = document.getElementById('newsTitle').value.trim();
  const date     = document.getElementById('newsDate').value;
  const body     = document.getElementById('newsBody').value.trim();
  const excerpt  = document.getElementById('newsExcerpt').value.trim();
  const category = document.getElementById('newsCategory').value;
  const type     = document.getElementById('newsType').value;

  if (!title || !date || !body) { error.textContent = 'Please fill in the headline, date, and article body.'; return; }

  btn.textContent = 'Publishing…';
  btn.disabled = true;

  try {
    // Upload images
    const uploadedUrls = [...existingImages];
    for (const file of pendingFiles) {
      const compressed = await compressImage(file, 1200, 0.78);
      const path = `news/${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi,'_')}`;
      const snap = await uploadBytes(storageRef(storage, path), compressed);
      const url  = await getDownloadURL(snap.ref);
      uploadedUrls.push(url);
    }

    const article = {
      title, date, body, excerpt, category, type,
      images:  uploadedUrls,
      updatedAt: serverTimestamp(),
    };

    if (type === 'booking') {
      article.bookingUrl   = document.getElementById('newsBookingUrl').value.trim();
      article.bookingLabel = document.getElementById('newsBookingLabel').value.trim() || 'Book a Place';
      article.eventDate    = document.getElementById('newsEventDate').value;
      article.capacity     = document.getElementById('newsEventCapacity').value || null;
    }

    if (existingId) {
      await setDoc(doc(db, 'news', existingId), article, { merge: true });
    } else {
      article.createdAt = serverTimestamp();
      await addDoc(collection(db, 'news'), article);
    }

    showToast(existingId ? 'Article updated!' : 'Article published!', 'success');
    document.getElementById('admNewsModal').remove();
    // Reload news if on news page
    if (typeof loadNewsFromFirebase === 'function') loadNewsFromFirebase();

  } catch(e) {
    console.error(e);
    error.textContent = 'Error publishing. Please try again.';
    btn.textContent = 'Publish Article';
    btn.disabled = false;
  }
}

async function deleteArticle(id) {
  if (!confirm('Permanently delete this article? This cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, 'news', id));
    showToast('Article deleted.', 'success');
    document.getElementById('admNewsModal').remove();
    if (typeof loadNewsFromFirebase === 'function') loadNewsFromFirebase();
  } catch(e) { showToast('Delete failed.', 'error'); }
}

// ══════════════════════════════════════════════════════════════════
//  7.  IMAGE COMPRESSION (client-side canvas)
// ══════════════════════════════════════════════════════════════════
function compressImage(file, maxWidth = 1200, quality = 0.78) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = e => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
      };
    };
  });
}

// ══════════════════════════════════════════════════════════════════
//  8.  PAGE BUILDER (index.html only)
// ══════════════════════════════════════════════════════════════════
const ELEMENT_TYPES = [
  { value: 'text-block',     label: 'Text Block' },
  { value: 'announcement',   label: 'Announcement Banner' },
  { value: 'image-block',    label: 'Image with Caption' },
  { value: 'two-col',        label: 'Two-Column Layout' },
  { value: 'divider',        label: 'Ornamental Divider' },
];

async function activatePageBuilder() {
  // Load existing custom sections from Firebase
  try {
    const snap = await getDoc(doc(db, 'pagebuilder', 'index'));
    const sections = snap.exists() ? (snap.data().sections || []) : [];
    sections.forEach(s => renderBuilderSection(s, false));
  } catch(e) {}

  // Inject "Add Element" button at end of <main>
  if (document.getElementById('admAddElementBtn')) return;
  const main = document.querySelector('main#main-content');
  if (!main) return;
  const addBtn = document.createElement('div');
  addBtn.id = 'admAddElementBtn';
  addBtn.className = 'adm-add-element-bar';
  addBtn.innerHTML = `
    <select class="adm-input" id="admElementTypeSelect" style="max-width:220px;">
      ${ELEMENT_TYPES.map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
    </select>
    <button class="adm-bar-btn adm-bar-btn--save">+ Add Element</button>`;
  addBtn.querySelector('button').addEventListener('click', () => {
    const type = document.getElementById('admElementTypeSelect').value;
    const section = { id: 'sec_' + Date.now(), type, content: defaultContent(type) };
    renderBuilderSection(section, true);
  });
  main.appendChild(addBtn);
}

function defaultContent(type) {
  const map = {
    'text-block':   { heading: 'New Section Heading', body: 'Enter your text here. Click edit to change this content.' },
    'announcement': { text: 'Parish Announcement — click edit to update this message.', icon: '&#10015;' },
    'image-block':  { src: '', caption: 'Image caption' },
    'two-col':      { left: 'Left column text.', right: 'Right column text.' },
    'divider':      {},
  };
  return map[type] || {};
}

function renderBuilderSection(section, isNew) {
  const main = document.querySelector('main#main-content');
  const addBtn = document.getElementById('admAddElementBtn');

  const wrap = document.createElement('div');
  wrap.className = 'adm-builder-section';
  wrap.dataset.sectionId = section.id;
  wrap.dataset.sectionType = section.type;

  const controls = `
    <div class="adm-builder-controls">
      <button class="adm-builder-ctrl" data-action="up"   title="Move up">&#9650;</button>
      <button class="adm-builder-ctrl" data-action="down" title="Move down">&#9660;</button>
      <button class="adm-builder-ctrl adm-builder-ctrl--del" data-action="del" title="Delete section">&times;</button>
    </div>`;

  let inner = '';
  const c = section.content || {};
  switch(section.type) {
    case 'text-block':
      inner = `<section class="section-gap"><div class="container">
        ${controls}
        <h2 class="section-title" contenteditable="${isNew||adminMode}" data-field-id="${section.id}__heading">${c.heading||''}</h2>
        <div class="ornament"><span class="ornament-cross">&#10015;</span></div>
        <p style="color:var(--text-mid);" contenteditable="${isNew||adminMode}" data-field-id="${section.id}__body">${c.body||''}</p>
      </div></section>`;
      break;
    case 'announcement':
      inner = `<section style="background:var(--gold);padding:1.5rem 0;"><div class="container" style="display:flex;align-items:center;gap:1rem;">
        ${controls}
        <span style="font-size:1.5rem;" contenteditable="${isNew||adminMode}" data-field-id="${section.id}__icon">${c.icon||'&#10015;'}</span>
        <p style="font-family:var(--ff-caps);font-size:0.9rem;letter-spacing:0.1em;color:var(--navy);flex:1;" contenteditable="${isNew||adminMode}" data-field-id="${section.id}__text">${c.text||''}</p>
      </div></section>`;
      break;
    case 'image-block':
      inner = `<section class="section-gap"><div class="container" style="text-align:center;">
        ${controls}
        ${c.src ? `<img src="${c.src}" alt="${c.caption||''}" style="max-width:100%;border-radius:8px;margin:0 auto 1rem;">` : `<div style="background:var(--cream-dark);height:200px;display:flex;align-items:center;justify-content:center;border-radius:8px;color:var(--text-light);">No image — upload via toolbar</div>`}
        <p style="font-style:italic;color:var(--text-light);" contenteditable="${isNew||adminMode}" data-field-id="${section.id}__caption">${c.caption||''}</p>
      </div></section>`;
      break;
    case 'two-col':
      inner = `<section class="section-gap"><div class="container" style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;">
        ${controls}
        <p contenteditable="${isNew||adminMode}" data-field-id="${section.id}__left">${c.left||''}</p>
        <p contenteditable="${isNew||adminMode}" data-field-id="${section.id}__right">${c.right||''}</p>
      </div></section>`;
      break;
    case 'divider':
      inner = `<div class="ornament" style="margin:2rem auto;max-width:1140px;padding:0 1.5rem;">${controls}<span class="ornament-cross">&#10015;</span></div>`;
      break;
  }

  wrap.innerHTML = inner;
  main.insertBefore(wrap, addBtn || null);

  // Control buttons
  wrap.querySelectorAll('.adm-builder-ctrl').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      if (action === 'del') {
        if (!confirm('Remove this section?')) return;
        wrap.remove();
        await savePageBuilder();
      } else if (action === 'up' && wrap.previousElementSibling && wrap.previousElementSibling.classList.contains('adm-builder-section')) {
        wrap.parentNode.insertBefore(wrap, wrap.previousElementSibling);
        await savePageBuilder();
      } else if (action === 'down' && wrap.nextElementSibling && wrap.nextElementSibling.classList.contains('adm-builder-section')) {
        wrap.parentNode.insertBefore(wrap.nextElementSibling, wrap);
        await savePageBuilder();
      }
    });
  });

  // Make editable fields dirty when changed
  wrap.querySelectorAll('[contenteditable]').forEach(el => {
    el.addEventListener('input', () => markUnsaved());
  });

  if (isNew) {
    markUnsaved();
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function savePageBuilder() {
  const sections = [];
  document.querySelectorAll('.adm-builder-section').forEach(wrap => {
    const type = wrap.dataset.sectionType;
    const content = {};
    wrap.querySelectorAll('[data-field-id]').forEach(el => {
      const key = el.dataset.fieldId.split('__').pop();
      content[key] = el.innerHTML;
    });
    sections.push({ id: wrap.dataset.sectionId, type, content });
  });
  await setDoc(doc(db, 'pagebuilder', 'index'), { sections, updatedAt: serverTimestamp() });
}

// Hook save into main save flow
const _origSave = saveAllChanges;
window.saveAllChanges = async function() {
  if (PAGE_ID === 'index') await savePageBuilder();
  await _origSave();
};

// ══════════════════════════════════════════════════════════════════
//  9.  TOAST NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════
function showToast(message, type = 'info') {
  const t = document.createElement('div');
  t.className = `adm-toast adm-toast--${type}`;
  t.setAttribute('role', 'status');
  t.innerHTML = `<span>${type==='success'?'&#10003;':type==='error'?'&#9888;':'&#8505;'}</span> ${message}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('adm-toast--show'));
  setTimeout(() => { t.classList.remove('adm-toast--show'); setTimeout(() => t.remove(), 400); }, 3500);
}

// ══════════════════════════════════════════════════════════════════
//  10.  FLOATING ADMIN TRIGGER BUTTON (hidden on public site)
// ══════════════════════════════════════════════════════════════════
function injectAdminTrigger() {
  const btn = document.createElement('button');
  btn.id = 'admTrigger';
  btn.setAttribute('aria-label', 'Admin login');
  btn.title = 'Parish Admin Login';
  btn.innerHTML = '&#10015;';
  btn.addEventListener('click', () => {
    injectAuthModal();
    document.getElementById('admEmail').focus();
  });
  document.body.appendChild(btn);
}

// ══════════════════════════════════════════════════════════════════
//  BOOT — watch auth state
// ══════════════════════════════════════════════════════════════════
onAuthStateChanged(auth, user => {
  if (user) {
    // Logged in
    const trigger = document.getElementById('admTrigger');
    if (trigger) trigger.remove();
    closeAuthModal();
    injectAdminBar(user);
    // Auto-load saved content for this page
    loadPageContent();
    if (PAGE_ID === 'index') {
      getDoc(doc(db, 'pagebuilder', 'index')).then(snap => {
        const sections = snap.exists() ? (snap.data().sections || []) : [];
        sections.forEach(s => renderBuilderSection(s, false));
      });
    }
  } else {
    // Not logged in
    removeAdminBar();
    if (!document.getElementById('admTrigger')) injectAdminTrigger();
  }
});

// Warn before navigating away with unsaved changes
window.addEventListener('beforeunload', e => {
  if (unsaved) { e.preventDefault(); e.returnValue = ''; }
});

// ══════════════════════════════════════════════════════════════════
//  EXPOSE for news page
// ══════════════════════════════════════════════════════════════════
window.ParishAdmin = { openNewsEditor, db, collection, getDocs, query, orderBy, doc, getDoc };
