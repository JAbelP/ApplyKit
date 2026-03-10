/* ── popup.js ───────────────────────────────────────────────── */

// ── DOM refs ──────────────────────────────────────────────────
const viewMain      = document.getElementById('view-main');
const viewForm      = document.getElementById('view-form');
const profileSelect = document.getElementById('profile-select');
const btnFill       = document.getElementById('btn-fill');
const btnNew        = document.getElementById('btn-new');
const btnEdit       = document.getElementById('btn-edit');
const btnDelete     = document.getElementById('btn-delete');
const statusMsg     = document.getElementById('status-msg');
const formTitle     = document.getElementById('form-title');
const profileForm   = document.getElementById('profile-form');
const btnCancel     = document.getElementById('btn-cancel');
const formError     = document.getElementById('form-error');

// Static field refs
const F = {
  name:      document.getElementById('f-name'),
  firstName:  document.getElementById('f-first-name'),
  middleName: document.getElementById('f-middle-name'),
  lastName:   document.getElementById('f-last-name'),
  email:     document.getElementById('f-email'),
  phone:     document.getElementById('f-phone'),
  address:   document.getElementById('f-address'),
  city:      document.getElementById('f-city'),
  state:     document.getElementById('f-state'),
  zip:       document.getElementById('f-zip'),
  linkedin:  document.getElementById('f-linkedin'),
  website:   document.getElementById('f-website'),
  summary:   document.getElementById('f-summary'),
  skills:    document.getElementById('f-skills'),
  salary:    document.getElementById('f-salary'),
  workAuth:        document.getElementById('f-work-auth'),        // checkbox
  visaSponsorship: document.getElementById('f-visa-sponsorship'), // checkbox
};

// Dynamic list containers
const expList      = document.getElementById('exp-list');
const eduList      = document.getElementById('edu-list');
const btnAddExp    = document.getElementById('btn-add-exp');
const btnAddEdu    = document.getElementById('btn-add-edu');

// Resume refs
const resumeArea    = document.getElementById('resume-area');
const resumeCurrent = document.getElementById('resume-current');
const resumeNameEl  = document.getElementById('resume-name');
const btnResumeClear = document.getElementById('btn-resume-clear');
const resumeDropLabel = document.getElementById('resume-drop-label');
const resumeFileInput = document.getElementById('f-resume');

const coverCurrent   = document.getElementById('cover-current');
const coverNameEl    = document.getElementById('cover-name');
const btnCoverClear  = document.getElementById('btn-cover-clear');
const coverDropLabel = document.getElementById('cover-drop-label');
const coverFileInput = document.getElementById('f-cover');

// ── State ─────────────────────────────────────────────────────
let profiles    = {};
let editingName = null;
// Temporary resume/cover state while the form is open
// { name: string, dataUrl: string } | null
let pendingResume = null;
let pendingCover  = null;

// ── Storage helpers ───────────────────────────────────────────
function loadProfiles() {
  return new Promise(resolve =>
    chrome.storage.local.get('profiles', d => resolve(d.profiles || {}))
  );
}

function saveProfiles(obj) {
  return new Promise(resolve => chrome.storage.local.set({ profiles: obj }, resolve));
}

function getActiveProfileName() {
  return new Promise(resolve =>
    chrome.storage.local.get('activeProfile', d => resolve(d.activeProfile || null))
  );
}

function setActiveProfileName(name) {
  return new Promise(resolve => chrome.storage.local.set({ activeProfile: name }, resolve));
}

// ── UI helpers ────────────────────────────────────────────────
function showStatus(msg, type = 'info', duration = 2800) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg ${type}`;
  statusMsg.classList.remove('hidden');
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => statusMsg.classList.add('hidden'), duration);
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}

function hideFormError() {
  formError.classList.add('hidden');
}

function showMain() {
  viewMain.classList.remove('hidden');
  viewForm.classList.add('hidden');
}

function showForm() {
  viewMain.classList.add('hidden');
  viewForm.classList.remove('hidden');
}

// ── Dropdown ─────────────────────────────────────────────────
async function refreshDropdown(selectName) {
  profileSelect.innerHTML = '';
  const names = Object.keys(profiles).sort();
  if (names.length === 0) {
    profileSelect.add(new Option('— No profiles yet —', ''));
    btnFill.disabled = btnEdit.disabled = btnDelete.disabled = true;
    return;
  }
  names.forEach(n => profileSelect.add(new Option(n, n)));
  const active = selectName || await getActiveProfileName();
  profileSelect.value = (active && profiles[active]) ? active : names[0];
  await setActiveProfileName(profileSelect.value);
  btnFill.disabled = btnEdit.disabled = btnDelete.disabled = false;
}

// ── Dynamic entry builders ────────────────────────────────────

/** Build an experience entry card and append to expList.
 *  data = { title, employer, startDate, endDate, current } */
function addExpEntry(data = {}) {
  const idx = expList.children.length;
  const card = document.createElement('div');
  card.className = 'entry-card';
  card.innerHTML = `
    <div class="entry-card-header">
      <span class="entry-card-title">Experience #${idx + 1}</span>
      <button type="button" class="btn-remove-entry" title="Remove">&#x2212;</button>
    </div>
    <div class="field-group">
      <label class="field-label">Job Title</label>
      <input class="input exp-title" type="text" placeholder="Software Engineer" value="${esc(data.title)}" />
    </div>
    <div class="field-group">
      <label class="field-label">Employer</label>
      <input class="input exp-employer" type="text" placeholder="Acme Corp" value="${esc(data.employer)}" />
    </div>
    <div class="field-row">
      <div class="field-group">
        <label class="field-label">Start</label>
        <input class="input exp-start" type="month" value="${esc(data.startDate)}" />
      </div>
      <div class="field-group">
        <label class="field-label">End</label>
        <input class="input exp-end" type="month" value="${esc(data.endDate)}" ${data.current ? 'disabled' : ''} />
      </div>
    </div>
    <label class="check-row">
      <input type="checkbox" class="exp-current" ${data.current ? 'checked' : ''} />
      Currently work here
    </label>
  `;

  // "Currently work here" toggles end date field
  const currentCheck = card.querySelector('.exp-current');
  const endInput     = card.querySelector('.exp-end');
  currentCheck.addEventListener('change', () => {
    endInput.disabled = currentCheck.checked;
    if (currentCheck.checked) endInput.value = '';
  });

  card.querySelector('.btn-remove-entry').addEventListener('click', () => {
    card.remove();
    renumberEntries(expList, 'Experience');
  });

  expList.appendChild(card);
}

/** Build an education entry card and append to eduList.
 *  data = { degree, school, gradYear } */
function addEduEntry(data = {}) {
  const idx = eduList.children.length;
  const card = document.createElement('div');
  card.className = 'entry-card';
  card.innerHTML = `
    <div class="entry-card-header">
      <span class="entry-card-title">Education #${idx + 1}</span>
      <button type="button" class="btn-remove-entry" title="Remove">&#x2212;</button>
    </div>
    <div class="field-group">
      <label class="field-label">Degree</label>
      <input class="input edu-degree" type="text" placeholder="B.S. Computer Science" value="${esc(data.degree)}" />
    </div>
    <div class="field-group">
      <label class="field-label">School</label>
      <input class="input edu-school" type="text" placeholder="State University" value="${esc(data.school)}" />
    </div>
    <div class="field-group">
      <label class="field-label">Graduation Year</label>
      <input class="input edu-gradyear" type="number" min="1950" max="2035" placeholder="2022" value="${esc(data.gradYear)}" />
    </div>
  `;

  card.querySelector('.btn-remove-entry').addEventListener('click', () => {
    card.remove();
    renumberEntries(eduList, 'Education');
  });

  eduList.appendChild(card);
}

function renumberEntries(list, label) {
  Array.from(list.children).forEach((card, i) => {
    const titleEl = card.querySelector('.entry-card-title');
    if (titleEl) titleEl.textContent = `${label} #${i + 1}`;
  });
}

// HTML-escape helper for injecting values into innerHTML
function esc(val) {
  return (val || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Read dynamic lists from the DOM ──────────────────────────
function readExpEntries() {
  return Array.from(expList.querySelectorAll('.entry-card')).map(card => ({
    title:     card.querySelector('.exp-title').value.trim(),
    employer:  card.querySelector('.exp-employer').value.trim(),
    startDate: card.querySelector('.exp-start').value.trim(),
    endDate:   card.querySelector('.exp-end').value.trim(),
    current:   card.querySelector('.exp-current').checked,
  }));
}

function readEduEntries() {
  return Array.from(eduList.querySelectorAll('.entry-card')).map(card => ({
    degree:   card.querySelector('.edu-degree').value.trim(),
    school:   card.querySelector('.edu-school').value.trim(),
    gradYear: card.querySelector('.edu-gradyear').value.trim(),
  }));
}

// ── Resume helpers ────────────────────────────────────────────
function updateResumeUI() {
  if (pendingResume) {
    resumeNameEl.textContent = pendingResume.name;
    resumeCurrent.classList.remove('hidden');
    resumeDropLabel.classList.add('hidden');
  } else {
    resumeCurrent.classList.add('hidden');
    resumeDropLabel.classList.remove('hidden');
  }
}

resumeFileInput.addEventListener('change', () => {
  const file = resumeFileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    pendingResume = { name: file.name, dataUrl: e.target.result };
    updateResumeUI();
  };
  reader.readAsDataURL(file);
  // Reset so the same file can be re-selected after clearing
  resumeFileInput.value = '';
});

btnResumeClear.addEventListener('click', () => {
  pendingResume = null;
  updateResumeUI();
});

// ── Cover letter helpers ──────────────────────────────────────
function updateCoverUI() {
  if (pendingCover) {
    coverNameEl.textContent = pendingCover.name;
    coverCurrent.classList.remove('hidden');
    coverDropLabel.classList.add('hidden');
  } else {
    coverCurrent.classList.add('hidden');
    coverDropLabel.classList.remove('hidden');
  }
}

coverFileInput.addEventListener('change', () => {
  const file = coverFileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    pendingCover = { name: file.name, dataUrl: e.target.result };
    updateCoverUI();
  };
  reader.readAsDataURL(file);
  coverFileInput.value = '';
});

btnCoverClear.addEventListener('click', () => {
  pendingCover = null;
  updateCoverUI();
});

// ── Form <-> Profile conversion ───────────────────────────────
function formToProfile() {
  return {
    firstName:   F.firstName.value.trim(),
    middleName:  F.middleName.value.trim(),
    lastName:    F.lastName.value.trim(),
    email:       F.email.value.trim(),
    phone:       F.phone.value.trim(),
    address:     F.address.value.trim(),
    city:        F.city.value.trim(),
    state:       F.state.value.trim(),
    zip:         F.zip.value.trim(),
    linkedin:    F.linkedin.value.trim(),
    website:     F.website.value.trim(),
    summary:     F.summary.value.trim(),
    skills:      F.skills.value.trim(),
    salary:      F.salary.value.trim(),
    workAuth:        F.workAuth.checked,        // boolean
    visaSponsorship: F.visaSponsorship.checked, // boolean
    experience:  readExpEntries(),           // array
    education:   readEduEntries(),           // array
    resume:      pendingResume,              // { name, dataUrl } | null
    cover:       pendingCover,               // { name, dataUrl } | null
  };
}

function profileToForm(name, p) {
  F.name.value      = name || '';
  F.firstName.value  = p.firstName  || '';
  F.middleName.value = p.middleName || '';
  F.lastName.value   = p.lastName   || '';
  F.email.value     = p.email     || '';
  F.phone.value     = p.phone     || '';
  F.address.value   = p.address   || '';
  F.city.value      = p.city      || '';
  F.state.value     = p.state     || '';
  F.zip.value       = p.zip       || '';
  F.linkedin.value  = p.linkedin  || '';
  F.website.value   = p.website   || '';
  F.summary.value   = p.summary   || '';
  F.skills.value    = p.skills    || '';
  F.salary.value    = p.salary    || '';
  F.workAuth.checked        = !!p.workAuth;
  F.visaSponsorship.checked = !!p.visaSponsorship;

  // Dynamic lists
  expList.innerHTML = '';
  (p.experience || []).forEach(e => addExpEntry(e));

  eduList.innerHTML = '';
  (p.education || []).forEach(e => addEduEntry(e));

  // Resume & cover letter
  pendingResume = p.resume || null;
  updateResumeUI();
  pendingCover = p.cover || null;
  updateCoverUI();
}

function clearForm() {
  profileForm.reset();
  expList.innerHTML = '';
  eduList.innerHTML = '';
  pendingResume = null;
  updateResumeUI();
  pendingCover = null;
  updateCoverUI();
  hideFormError();
}

// ── Events: main view ─────────────────────────────────────────
profileSelect.addEventListener('change', async () => {
  await setActiveProfileName(profileSelect.value);
});

btnNew.addEventListener('click', () => {
  editingName = null;
  clearForm();
  formTitle.textContent = 'New Profile';
  showForm();
});

btnEdit.addEventListener('click', () => {
  const name = profileSelect.value;
  if (!name || !profiles[name]) return;
  editingName = name;
  profileToForm(name, profiles[name]);
  formTitle.textContent = 'Edit Profile';
  showForm();
});

btnDelete.addEventListener('click', async () => {
  const name = profileSelect.value;
  if (!name || !profiles[name]) return;
  if (!confirm(`Delete profile "${name}"?`)) return;
  delete profiles[name];
  await saveProfiles(profiles);
  await refreshDropdown(null);
  showStatus(`Profile "${name}" deleted.`, 'info');
});

// ── Events: form view ─────────────────────────────────────────
btnCancel.addEventListener('click', showMain);

btnAddExp.addEventListener('click', () => addExpEntry());
btnAddEdu.addEventListener('click', () => addEduEntry());

profileForm.addEventListener('submit', async e => {
  e.preventDefault();
  hideFormError();

  const newName = F.name.value.trim();
  if (!newName) {
    showFormError('Profile name is required.');
    F.name.focus();
    return;
  }

  if (editingName === null && profiles[newName]) {
    showFormError(`A profile named "${newName}" already exists.`);
    F.name.focus();
    return;
  }

  const profileData = formToProfile();

  if (editingName !== null && editingName !== newName) {
    delete profiles[editingName];
  }

  profiles[newName] = profileData;
  await saveProfiles(profiles);
  await refreshDropdown(newName);
  showMain();
  showStatus(`Profile "${newName}" saved.`, 'success');
});

// ── Fill Page ─────────────────────────────────────────────────
btnFill.addEventListener('click', async () => {
  const name = profileSelect.value;
  if (!name || !profiles[name]) {
    showStatus('Please select a profile first.', 'error');
    return;
  }

  const profile = profiles[name];
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) { showStatus('No active tab found.', 'error'); return; }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillPageWithProfile,
      args: [profile],
    });

    const filled = results?.[0]?.result ?? 0;

    // If there's a resume, also try to attach it to any file input on the page
    if (profile.resume) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: attachResumeToPage,
        args: [profile.resume],
      });
    }

    // If there's a cover letter, attach it to the best matching file input
    if (profile.cover) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: attachCoverToPage,
        args: [profile.cover],
      });
    }

    if (filled > 0) {
      showStatus(`Filled ${filled} field${filled !== 1 ? 's' : ''}.`, 'success');
    } else {
      showStatus('No matching fields found on this page.', 'info');
    }
  } catch (err) {
    showStatus('Could not run on this page.', 'error');
    console.error(err);
  }
});

// ── Injected fill function ────────────────────────────────────
// Self-contained — no closures over popup scope.
function fillPageWithProfile(profile) {
  const ALIASES = {
    firstName: [
      'first_name','firstname','fname','first-name','first name',
      'applicant_first_name','applicantfirstname','given_name','givenname',
      'given-name','forename','candidate_first','legal_first'
    ],
    middleName: [
      'middle_name','middlename','mname','middle-name','middle name',
      'middle_initial','middleinitial','middle','second_name'
    ],
    lastName: [
      'last_name','lastname','lname','last-name','last name','surname',
      'family_name','familyname','family-name','applicant_last_name',
      'applicantlastname','candidate_last','legal_last'
    ],
    email: [
      'email','e-mail','email_address','emailaddress','email-address',
      'applicant_email','candidate_email','work_email','personal_email',
      'contact_email','your_email'
    ],
    phone: [
      'phone','phone_number','phonenumber','phone-number','telephone',
      'tel','mobile','cell','cell_phone','cellphone','contact_phone',
      'applicant_phone','candidate_phone','primary_phone'
    ],
    address: [
      'address','street','street_address','streetaddress','street-address',
      'address1','address_1','addr','mailing_address','home_address',
      'line1','address_line_1','address_line1'
    ],
    city: ['city','town','municipality','locality','city_name','applicant_city'],
    state: ['state','province','region','state_province','state-province','applicant_state','state_code'],
    zip: ['zip','zip_code','zipcode','zip-code','postal','postal_code','postalcode','postcode','post_code'],
    linkedin: ['linkedin','linkedin_url','linkedinurl','linkedin-url','linkedin_profile','linkedin_link','linkedinprofile'],
    website: [
      'website','portfolio','portfolio_url','portfoliourl','website_url',
      'websiteurl','personal_website','personalwebsite','web_site',
      'portfolio_link','github','github_url','personal_url'
    ],
    // First experience entry fields
    jobTitle: [
      'job_title','jobtitle','job-title','title','current_title',
      'current_position','position','role','current_job_title',
      'professional_title','occupation'
    ],
    employer: [
      'employer','company','current_employer','currentemployer',
      'current_company','currentcompany','employer_name','company_name',
      'organization','organisation','workplace','current_workplace'
    ],
    // First education entry fields
    degree: [
      'degree','education','highest_degree','degree_type','degree_name',
      'educational_level','highest_education','highest_level_of_education'
    ],
    school: [
      'school','university','college','institution','school_name',
      'university_name','college_name','institution_name','alma_mater',
      'educational_institution'
    ],
    gradYear: [
      'graduation_year','grad_year','gradyear','graduation_date',
      'grad_date','year_graduated','year_of_graduation','degree_year','completion_year'
    ],
    summary: [
      'summary','objective','cover_letter','coverletter','cover-letter',
      'bio','about','about_me','aboutme','professional_summary',
      'career_objective','personal_statement','statement','overview',
      'introduction','intro','description','profile_summary','message'
    ],
    skills: [
      'skills','skill_set','skillset','key_skills','core_skills',
      'technical_skills','competencies','abilities','expertise',
      'qualifications','skill_keywords'
    ],
    salary: [
      'salary','desired_salary','salary_expectation','salary_expectations',
      'expected_salary','compensation','desired_compensation',
      'pay_expectation','annual_salary','salary_requirement',
      'salary_requirements','pay_rate','wage','desired_wage'
    ],
    workAuth: [
      'work_authorization','workauthorization','work-authorization',
      'work_auth','authorized','authorization','visa_status','visa_type',
      'employment_authorization','eligibility','work_eligibility',
      'legally_authorized','right_to_work','citizenship','citizenship_status'
    ],
    visaSponsorship: [
      'visa_sponsorship','visasponsorship','sponsorship','require_sponsorship',
      'requiresponsorship','needs_sponsorship','needssponsorship',
      'sponsorship_required','will_require_sponsorship','future_sponsorship',
      'employment_visa_sponsorship','immigration_sponsorship'
    ],
  };

  // Flatten experience[0] and education[0] into top-level scalar values
  // for matching against single-field forms. Multi-entry sites are handled
  // separately via the repeater blocks above.
  const flat = Object.assign({}, profile);
  const exp0 = (profile.experience || [])[0];
  const edu0 = (profile.education  || [])[0];
  if (exp0) {
    flat.jobTitle = flat.jobTitle || exp0.title;
    flat.employer = flat.employer || exp0.employer;
  }
  if (edu0) {
    flat.degree   = flat.degree   || edu0.degree;
    flat.school   = flat.school   || edu0.school;
    flat.gradYear = flat.gradYear || edu0.gradYear;
  }
  // workAuth / visaSponsorship: convert booleans to readable strings for text inputs
  flat.workAuth        = profile.workAuth        ? 'Yes' : 'No';
  flat.visaSponsorship = profile.visaSponsorship ? 'Yes' : 'No';

  function normalize(str) {
    return (str || '').toLowerCase().replace(/[\s_\-\.]/g, '');
  }

  function getFieldHints(el) {
    const parts = [];
    parts.push(el.name, el.id, el.placeholder, el.getAttribute('aria-label'));
    for (const attr of el.attributes) {
      if (attr.name.startsWith('data-')) parts.push(attr.value);
    }
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) parts.push(lbl.textContent);
    }
    const wrapLabel = el.closest('label');
    if (wrapLabel) parts.push(wrapLabel.textContent);
    const parent = el.parentElement;
    if (parent) {
      const pl = parent.querySelector('label');
      if (pl) parts.push(pl.textContent);
      const gp = parent.parentElement;
      if (gp) {
        const gl = gp.querySelector('label');
        if (gl) parts.push(gl.textContent);
      }
    }
    parts.push(el.getAttribute('autocomplete'));
    return parts.map(normalize).filter(Boolean);
  }

  function scoreElement(el, key) {
    const hints   = getFieldHints(el);
    const aliases = (ALIASES[key] || []).map(normalize);
    aliases.push(normalize(key));
    let best = 0;
    for (const hint of hints) {
      for (const alias of aliases) {
        if (hint === alias)                                      { best = Math.max(best, 10); break; }
        if (hint.includes(alias) || alias.includes(hint))       { best = Math.max(best, 5);  }
      }
    }
    return best;
  }

  const inputs = Array.from(document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"])' +
    ':not([type="file"]):not([type="image"]), textarea, select'
  ));

  const profileKeys  = Object.keys(ALIASES).filter(k => flat[k] !== undefined && flat[k] !== '');
  const assignments  = new Map();

  for (const el of inputs) {
    // Handle checkboxes/radios for workAuth and visaSponsorship separately
    if (el.type === 'checkbox' || el.type === 'radio') {
      const hints = getFieldHints(el);
      const authAliases = ALIASES.workAuth.map(normalize);
      const sponsorAliases = ALIASES.visaSponsorship.map(normalize);
      if (hints.some(h => authAliases.some(a => h === a || h.includes(a) || a.includes(h)))) {
        assignments.set(el, { key: 'workAuth', score: 10 });
      } else if (hints.some(h => sponsorAliases.some(a => h === a || h.includes(a) || a.includes(h)))) {
        assignments.set(el, { key: 'visaSponsorship', score: 10 });
      }
      continue;
    }

    let bestKey = null, bestScore = 0;
    for (const key of profileKeys) {
      const score = scoreElement(el, key);
      if (score > bestScore) { bestScore = score; bestKey = key; }
    }
    if (bestScore >= 5) assignments.set(el, { key: bestKey, score: bestScore });
  }

  let filled = 0;

  for (const [el, { key }] of assignments) {
    const raw = flat[key];

    // Checkbox / radio for boolean fields
    if (el.type === 'checkbox' || el.type === 'radio') {
      const shouldBeChecked = key === 'visaSponsorship'
        ? profile.visaSponsorship === true
        : profile.workAuth === true;
      if (el.checked !== shouldBeChecked) {
        el.checked = shouldBeChecked;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        highlight(el);
        filled++;
      }
      continue;
    }

    const value = (raw === true ? 'Yes' : raw === false ? 'No' : raw) || '';
    if (!value) continue;

    if (el.tagName.toLowerCase() === 'select') {
      const normVal = normalize(value);
      let matched = false;
      for (const opt of el.options) {
        if (normalize(opt.text) === normVal || normalize(opt.value) === normVal) {
          el.value = opt.value; matched = true; break;
        }
      }
      if (!matched) {
        for (const opt of el.options) {
          if (normalize(opt.text).includes(normVal) || normVal.includes(normalize(opt.text))) {
            el.value = opt.value; matched = true; break;
          }
        }
      }
      if (!matched) continue;
    } else {
      el.value = el.type === 'number' ? value.replace(/[^0-9.]/g, '') : value;
    }

    // React/Angular synthetic event workaround
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    const proto = el.tagName.toLowerCase() === 'textarea'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) {
      setter.set.call(el, el.value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    highlight(el);
    filled++;
  }

  function highlight(el) {
    const origOutline = el.style.outline;
    const origShadow  = el.style.boxShadow;
    const origTrans   = el.style.transition;
    el.style.transition = 'outline 0.1s, box-shadow 0.1s';
    el.style.outline    = '2px solid #22c55e';
    el.style.boxShadow  = '0 0 0 3px rgba(34,197,94,0.25)';
    setTimeout(() => {
      el.style.outline    = origOutline;
      el.style.boxShadow  = origShadow;
      el.style.transition = origTrans;
    }, 1800);
  }

  return filled;
}

// ── Injected resume-attach function ──────────────────────────
// Converts a base64 dataUrl back to a File and assigns it to any
// resume/CV file input it can find on the page.
function attachResumeToPage(resumeObj) {
  if (!resumeObj || !resumeObj.dataUrl) return;

  const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
  if (fileInputs.length === 0) return;

  // Score file inputs by their attributes for resume relevance
  const resumeKeywords  = ['resume','cv','curriculum','vitae'];
  const coverKeywords   = ['cover','coverletter','coverletterfile'];
  function normalize(s) { return (s || '').toLowerCase().replace(/[\s_\-\.]/g, ''); }

  function scoreFileInput(el) {
    const hints = [el.name, el.id, el.getAttribute('aria-label'), el.getAttribute('placeholder')];
    // Walk up 4 ancestor levels to capture surrounding label / heading text
    let node = el.parentElement;
    for (let i = 0; i < 4 && node; i++) {
      if (el.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lbl) hints.push(lbl.textContent);
      }
      const lbl = node.querySelector('label, h1, h2, h3, h4, p, span');
      if (lbl) hints.push(lbl.textContent);
      node = node.parentElement;
    }
    const norm = hints.map(normalize).filter(Boolean);
    let score = 0;
    for (const h of norm) {
      // Penalise cover letter inputs heavily
      for (const kw of coverKeywords) {
        if (h === kw || h.includes(kw)) { score -= 20; break; }
      }
      for (const kw of resumeKeywords) {
        if (h === kw)          { score = Math.max(score, 10); break; }
        if (h.includes(kw))    { score = Math.max(score, 5); }
      }
    }
    return score;
  }

  let best = null, bestScore = -1;
  for (const el of fileInputs) {
    const s = scoreFileInput(el);
    if (s > bestScore) { bestScore = s; best = el; }
  }

  // Fall back to first file input if none scored
  if (!best) best = fileInputs[0];
  if (!best) return;

  // Convert dataUrl -> Blob -> File
  const [header, b64] = resumeObj.dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const file = new File([blob], resumeObj.name, { type: mime });

  // Assign via DataTransfer (the only way to programmatically set a file input)
  const dt = new DataTransfer();
  dt.items.add(file);
  best.files = dt.files;
  best.dispatchEvent(new Event('change', { bubbles: true }));
  best.dispatchEvent(new Event('input',  { bubbles: true }));

  // Highlight it
  const origOutline = best.style.outline;
  best.style.outline = '2px solid #f59e0b';
  setTimeout(() => { best.style.outline = origOutline; }, 1800);
}

// ── Injected cover-letter-attach function ────────────────────
function attachCoverToPage(coverObj) {
  if (!coverObj || !coverObj.dataUrl) return;

  const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
  if (fileInputs.length === 0) return;

  const coverKeywords  = ['cover','coverletter','coverletterfile'];
  const resumeKeywords = ['resume','cv','curriculum','vitae'];
  function normalize(s) { return (s || '').toLowerCase().replace(/[\s_\-\.]/g, ''); }

  function scoreFileInput(el) {
    const hints = [el.name, el.id, el.getAttribute('aria-label'), el.getAttribute('placeholder')];
    let node = el.parentElement;
    for (let i = 0; i < 4 && node; i++) {
      if (el.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lbl) hints.push(lbl.textContent);
      }
      const lbl = node.querySelector('label, h1, h2, h3, h4, p, span');
      if (lbl) hints.push(lbl.textContent);
      node = node.parentElement;
    }
    const norm = hints.map(normalize).filter(Boolean);
    let score = 0;
    for (const h of norm) {
      // Penalise resume inputs
      for (const kw of resumeKeywords) {
        if (h === kw || h.includes(kw)) { score -= 20; break; }
      }
      for (const kw of coverKeywords) {
        if (h === kw)          { score = Math.max(score, 10); break; }
        if (h.includes(kw))    { score = Math.max(score, 5); }
      }
    }
    return score;
  }

  let best = null, bestScore = -Infinity;
  for (const el of fileInputs) {
    const s = scoreFileInput(el);
    if (s > bestScore) { bestScore = s; best = el; }
  }

  // Only attach if we found a positively-scored match — don't guess
  if (!best || bestScore < 0) return;

  const [header, b64] = coverObj.dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const file = new File([blob], coverObj.name, { type: mime });

  const dt = new DataTransfer();
  dt.items.add(file);
  best.files = dt.files;
  best.dispatchEvent(new Event('change', { bubbles: true }));
  best.dispatchEvent(new Event('input',  { bubbles: true }));

  const origOutline = best.style.outline;
  best.style.outline = '2px solid #a78bfa';
  setTimeout(() => { best.style.outline = origOutline; }, 1800);
}

// ── Init ──────────────────────────────────────────────────────
(async () => {
  profiles = await loadProfiles();
  await refreshDropdown(null);
})();
