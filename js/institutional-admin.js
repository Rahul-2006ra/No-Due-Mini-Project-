import {departmentLabel} from './department.js';
import {wireAccountRemoval,wireAccountReactivation,mountExitManagement} from './account-removal.js';
import {requireAuth,wireLogout} from './auth.js';
import {functions,isEmulator} from './firebase-config.js';
import {httpsCallable} from "./api-callable.js";
import {parseCSV} from './csv.js';
import {page} from './academic.js';
import {escapeHtml as e,busy,errorState} from './ui.js';
import {ROLES} from './admin-data.js';
import {initThemeToggle} from './theme.js';
const callable=httpsCallable(functions,'institutionalAdmin',{timeout:540000});
const api=async(action,data={})=>(await callable({action,...data})).data;
const content=document.getElementById('content');
wireLogout();initThemeToggle();
let preview=[],results=[],jobId='',previewPage=0,exitManager;
const field=(name,label,type='text',required=false,placeholder='',hint='')=>`<label class="form-field-group"><span class="field-label">${e(label)}${required?' <span style="color:#e53e3e">*</span>':''}</span>${hint?`<small class="field-hint" style="display:block;color:var(--text-muted);font-size:12px;margin-bottom:4px;">${e(hint)}</small>`:''}<input name="${e(name)}" type="${type}" ${placeholder?`placeholder="${e(placeholder)}"`:''} ${required?'required':''}></label>`;
requireAuth(['admin']).then(render).catch(error=>errorState(content,error));
async function render() {
  content.innerHTML=`<div class="banner">${isEmulator?'DEMO EMULATOR MODE — newly created accounts can sign in with password DemoPassword123! locally.':'Official college accounts will receive an email activation link. Passwords are created securely by users.'}</div>
  <nav><a href="advanced-admin.html">⚙️ Advanced Records &amp; Class Database</a> · <a href="academic.html">📚 Classes, Subjects &amp; Marks</a></nav>
  
  <div class="card">
    <h2>1. College Institution Settings</h2>
    <p class="muted">Define authorized email domains, academic departments, and optional email delivery settings for student and staff activation.</p>
    <form id="policyForm">
      ${field('allowedDomains','Allowed College Email Domains','text',true,'e.g. college.edu, student.college.edu','Only users with these email domains can register or log in.')}
      ${field('departments','Academic Departments','text',true,'e.g. ISE, CSE, ECE, MECH, CIVIL','Separate multiple department abbreviations with commas.')}
      ${field('sections','Class Sections','text',true,'e.g. A, B, C, D','Separate all valid section names with commas.')}
      ${field('smtpHost','Email Server Host (SMTP)','text',false,'e.g. smtp.gmail.com','Optional: Used to send account welcome emails.')}
      ${field('smtpPort','Email Server Port','number',false,'465 or 587')}
      ${field('smtpUser','Email Server Username','text',false,'e.g. admin@college.edu')}
      ${field('mailFrom','Sender Email Address','email',false,'e.g. no-reply@college.edu','Email address shown in the "From" line.')}
      <p class="muted" style="font-size:12px;">Security notice: For safety, the SMTP password must only be configured in server environment variables (.env), never entered in the browser.</p>
      <button class="btn-primary">Save College Settings</button>
    </form>
    <p id="policyStatus" role="status"></p>
  </div>

  <div class="card">
    <h2>2. Create Single User Account</h2>
    <p class="muted">Add a new student, teacher, mentor, department head (HOD), office staff, or administrator account.</p>
    <form id="accountForm">
      <label class="form-field-group">
        <span class="field-label">Account Role <span style="color:#e53e3e">*</span></span>
        <select name="role">
          <option value="student">Student (Clearance Applicant)</option>
          <option value="subject_faculty">Subject Faculty (Teacher)</option>
          <option value="mentor">Faculty Mentor (Proctor)</option>
          <option value="hod">Head of Department (HOD)</option>
          <option value="office">Administrative Office Staff</option>
          <option value="library">Library Clearance In-charge</option>
          <option value="physics_lab">Physics Lab In-charge</option>
          <option value="chemistry_lab">Chemistry Lab In-charge</option>
          <option value="accounts">Accounts &amp; Fee In-charge</option>
          <option value="admin">System Administrator</option>
        </select>
      </label>
      ${field('name','Full Name','text',true,'e.g. Rahul Sharma')}
      ${field('collegeEmail','Official College Email','email',true,'e.g. rahul@college.edu')}
      ${field('phone','Phone Number','text',false,'e.g. 9876543210')}
      <label class="form-field-group">
        <span class="field-label">Academic Department <span style="color:#e53e3e">*</span></span>
        <select name="department" required>
          <option value="">-- Select Department --</option>
          <option value="CSE">CSE - Computer Science &amp; Engineering</option>
          <option value="ISE">ISE - Information Science &amp; Engineering</option>
          <option value="AIML">AIML - Artificial Intelligence &amp; Machine Learning</option>
          <option value="AIDS">AIDS - Artificial Intelligence &amp; Data Science</option>
          <option value="CIVIL">CIVIL - Civil Engineering</option>
          <option value="MECHANICAL">MECHANICAL - Mechanical Engineering</option>
          <option value="ECE">ECE - Electronics &amp; Communication Engineering</option>
          <option value="POLYTECHNIC">POLYTECHNIC</option>
          <option value="ELECTRICAL">ELECTRICAL - Electrical &amp; Electronics Engineering</option>
        </select>
      </label>
      ${field('facultyId','Staff / Employee ID (For Teachers & Staff)','text',false,'e.g. EMP1024')}
      ${field('usn','University Seat Number / USN (For Students)','text',false,'e.g. 1MS21IS001')}
      <label class="form-field-group">
        <span class="field-label">Semester (For Students)</span>
        <select name="semester">
          <option value="">-- Select Semester (1st to 8th) --</option>
          <option value="1">1st Semester</option>
          <option value="2">2nd Semester</option>
          <option value="3">3rd Semester</option>
          <option value="4">4th Semester</option>
          <option value="5">5th Semester</option>
          <option value="6">6th Semester</option>
          <option value="7">7th Semester</option>
          <option value="8">8th Semester</option>
        </select>
      </label>
      <label class="form-field-group">
        <span class="field-label">Class Section (For Students)</span>
        <select name="section">
          <option value="">-- Select Section (A, B, C, D) --</option>
          <option value="A">Section A</option>
          <option value="B">Section B</option>
          <option value="C">Section C</option>
          <option value="D">Section D</option>
        </select>
      </label>
      <label class="form-field-group">
        <span class="field-label">Curriculum Scheme (For Students)</span>
        <select name="scheme">
          <option value="">-- Select Scheme (2022 to 2026) --</option>
          <option value="2022">2022 Scheme</option>
          <option value="2023">2023 Scheme</option>
          <option value="2024">2024 Scheme</option>
          <option value="2025">2025 Scheme</option>
          <option value="2026">2026 Scheme</option>
        </select>
      </label>
      <label class="form-field-group">
        <span class="field-label">Assigned Faculty Mentor (For Students)</span>
        <small class="field-hint" style="display:block;color:var(--text-muted);font-size:12px;margin-bottom:4px;">Select from existing faculty mentors or type their official email below.</small>
        <input name="mentorEmail" type="email" list="mentorOptions" placeholder="mentor@college.edu">
      </label>
      <datalist id="mentorOptions"></datalist>
      ${field('mentorEmployeeId','Mentor Employee ID (Alternative lookup)','text',false,'e.g. EMP1005')}
    </form>
    <div class="provision-actions">
      <button type="submit" form="accountForm" id="validateAccountBtn" class="btn-primary">Step 1: Check &amp; Verify Account</button>
      <button type="button" id="provisionBtn" class="btn-primary" disabled>Step 2: Confirm &amp; Create Account</button>
    </div>
    <div id="accountPreview" style="margin-top:12px;"></div>
    <p id="accountStatus" role="status"></p>
  </div>

  <div class="card">
    <h2>3. Bulk Import Accounts from CSV File</h2>
    <p class="muted">Quickly upload entire classes of students, faculty lists, or course offerings in bulk using spreadsheets.</p>
    <label class="form-field-group">
      <span class="field-label">Select What You Want to Import:</span>
      <select id="importType">
        <option value="students">🎓 Students — Register accounts and map to classes automatically</option>
        <option value="teachers">👨‍🏫 Teachers &amp; Faculty — Register faculty accounts</option>
        <option value="offerings">📖 Subjects &amp; Classes — Connect subjects, sections and assigned teachers</option>
      </select>
    </label>
    <p style="margin:10px 0;">
      <strong>Download CSV sample templates:</strong><br>
      <a href="templates/student-import.csv" download="student-import.csv">📥 Student List Template</a> · 
      <a href="templates/teacher-import.csv" download="teacher-import.csv">📥 Teacher List Template</a> · 
      <a href="templates/offering-import.csv" download="offering-import.csv">📥 Subject Offerings Template</a>
    </p>
    <label class="form-field-group">
      <span class="field-label">Choose CSV File from your computer:</span>
      <input id="importFile" type="file" accept=".csv">
    </label>
    <button id="previewBtn" class="btn-sm">Step 1: Upload &amp; Preview File</button>
    <div id="importPreview" style="margin-top:12px;"></div>
    <div style="display:flex;gap:8px;margin:8px 0;">
      <button id="previewPrevious" class="btn-sm" hidden>← Previous 50 Rows</button>
      <button id="previewNext" class="btn-sm" hidden>Next 50 Rows →</button>
    </div>
    <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:12px 0;">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:500;color:var(--text);margin:0;">
        <input id="acceptWarnings" type="checkbox" style="width:18px;height:18px;margin:0;cursor:pointer;">
        <span>I have verified the preview and approve importing all valid rows.</span>
      </label>
      <small style="display:block;color:var(--text-muted);margin-left:26px;margin-top:4px;">Check this box after reviewing the table above to unlock the import button.</small>
    </div>
    <button id="importBtn" class="btn-primary" disabled>Step 2: Confirm &amp; Import Verified Accounts</button>
    <p id="importProgress" role="status" aria-live="polite"></p>
    <div id="importResults"></div>
    <button id="downloadReport" class="btn-sm" disabled>Download Import Summary Report (CSV)</button>
  </div>

  <div id="exitManagement"></div>

  <div class="card">
    <h2>4. Quick Account Lookup</h2>
    <p class="muted">Search for any registered user to check their status, resend invitation emails, or modify account details.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
      <label class="form-field-group">
        <span class="field-label">Search Criteria</span>
        <select id="searchField">
          <option value="email">Search by College Email</option>
          <option value="usn">Search by Student USN</option>
          <option value="facultyId">Search by Faculty / Employee ID</option>
        </select>
      </label>
      <label class="form-field-group">
        <span class="field-label">Enter Exact Search Value</span>
        <input id="searchValue" placeholder="e.g. 1MS21IS001 or name@college.edu">
      </label>
    </div>
    <button id="searchBtn" class="btn-primary" style="margin-top:6px;">Search Account</button>
    <div id="searchResults" style="margin-top:14px;"></div>
  </div>`;
  exitManager=mountExitManagement(document.getElementById('exitManagement'));
  document.getElementById('policyForm').onsubmit=event=>{event.preventDefault();busy(event.target.querySelector('button'),async()=>{
    const data=Object.fromEntries(new FormData(event.target));for(const key of ['allowedDomains','departments','sections']) data[key]=data[key].split(',').map(v=>v.trim()).filter(Boolean);
    await api('savePolicy',{policy:data});document.getElementById('policyStatus').textContent='Policy saved.';
  });};
  let accountRow,accountRequestId;
  document.getElementById('accountForm').oninput=()=>{accountRow=null;document.getElementById('provisionBtn').disabled=true;};
  document.getElementById('accountForm').onsubmit=event=>{event.preventDefault();busy(document.getElementById('validateAccountBtn'),async()=>{
    const checked=(await api('previewAccounts',{rows:[Object.fromEntries(new FormData(event.target))]})).rows[0];
    document.getElementById('accountPreview').innerHTML=`<p>${e(checked.status)}: ${e(checked.error || checked.warnings?.join(' ') || 'Ready to create account.')}</p>`;
    accountRow=checked.status==='ERROR'?null:checked.row;accountRequestId=crypto.randomUUID();document.getElementById('provisionBtn').disabled=!accountRow;
  });};
  document.getElementById('provisionBtn').onclick=async event=>{await busy(event.target,async()=>{
    if(!accountRow) throw new Error('Validate the account first.');
    const result=await api('provision',{row:accountRow,requestId:accountRequestId});
    document.getElementById('accountStatus').textContent=`Created ${result.email}; ${result.subjectsMapped} subjects mapped; activation: ${result.activation}.${result.demoPassword?' Emulator password: '+result.demoPassword:''}${result.warning?' '+result.warning:''}`;
    accountRow=null;
  });event.target.disabled=!accountRow;};
  const resetPreview=()=>{preview=[];results=[];document.getElementById('importBtn').disabled=true;document.getElementById('acceptWarnings').checked=false;document.getElementById('importPreview').textContent='';document.getElementById('downloadReport').disabled=true;};
  document.getElementById('importFile').onchange=resetPreview;document.getElementById('importType').onchange=resetPreview;
  document.getElementById('previewBtn').onclick=event=>busy(event.target,async()=>{
    resetPreview();const file=document.getElementById('importFile').files[0];if(!file) throw new Error('Choose a CSV file.');if(file.size>2*1024*1024) throw new Error('CSV must be at most 2 MB.');
    const type=document.getElementById('importType').value;
    const rows=parseCSV(await file.text(),type==='students'?['name','usn','collegeEmail','phone','department','semester','section','scheme']:type==='teachers'?['name','collegeEmail','phone','department','employeeId','role']:['department','scheme','semester','section','subjectCode','subjectName','teacherEmail','credits','components']);
    if(!rows.length || rows.length>2000) throw new Error('Upload 1–2000 rows; split larger files.');
    jobId=crypto.randomUUID();const seen=new Map();
    for(let start=0;start<rows.length;start+=100) {
      document.getElementById('importProgress').textContent=`Validating ${start+1}–${Math.min(start+100,rows.length)} / ${rows.length}…`;
      const chunk=await api(type==='students'?'previewAccounts':type==='teachers'?'previewTeachers':'previewOfferings',{rows:rows.slice(start,start+100)});
      for(const checked of chunk.rows) {
        checked.index+=start;
        const keys=type!=='offerings'?['collegeEmail',type==='teachers'?'employeeId':'usn'].map(k=>`${k}:${String(checked.row[k] || '').trim().toLowerCase()}`):[JSON.stringify([checked.row.department,checked.row.scheme,checked.row.semester,checked.row.section,checked.row.subjectCode])];
        for(const key of keys.filter(k=>type!=='offerings'?!k.endsWith(':'):Boolean(checked.row.subjectCode))) {
          if(seen.has(key)) {checked.status='ERROR';checked.error='Duplicate identity/offering in this CSV.';checked.duplicate=true;const earlier=preview[seen.get(key)];earlier.status='ERROR';earlier.error=checked.error;earlier.duplicate=true;}
          else seen.set(key,checked.index);
        }
        preview.push(checked);
      }
    }
    previewPage=0;showPreview();document.getElementById('importProgress').textContent=type==='offerings' && preview.some(r=>r.status==='ERROR')?'Preview ready. Offerings import blocked: fix every invalid row, including missing teacher accounts, then validate again.':'Preview ready. Review before confirming.';
  });
  document.getElementById('previewPrevious').onclick=()=>{previewPage--;showPreview();};document.getElementById('previewNext').onclick=()=>{previewPage++;showPreview();};
  document.getElementById('acceptWarnings').onchange=()=>{document.getElementById('importBtn').disabled=!document.getElementById('acceptWarnings').checked || !preview.some(r=>r.status!=='ERROR') || (document.getElementById('importType').value==='offerings' && preview.some(r=>r.status==='ERROR'));};
  document.getElementById('importBtn').onclick=event=>busy(event.target,async()=>{
    const type=document.getElementById('importType').value,valid=preview.filter(r=>r.status!=='ERROR');
    if(!valid.length || !document.getElementById('acceptWarnings').checked) throw new Error('Review and confirm validated rows.');
    if(type==='offerings' && preview.some(r=>r.status==='ERROR')) throw new Error('Fix all invalid offering rows and revalidate; no partial offering set will be imported.');
    const controls=['importFile','importType','previewBtn','acceptWarnings'];controls.forEach(id=>document.getElementById(id).disabled=true);results=[];
    try {
      for(const checked of valid) {
        const row=checked.row;
        try {
          const result=type==='students'?await api('provision',{row,requestId:`${jobId}-${checked.index}`}):type==='teachers'?await api('importTeacher',{row}):await api('importOffering',{row});results.push({...row,...result,error:''});
          if(type==='offerings' && result.mappingErrors?.length)results.at(-1).error=result.mappingErrors.map(r=>`${r.uid}: ${r.error}`).join('; ');
        } catch(error) {results.push({...row,error:error.message,accountCreated:false});}
        document.getElementById('importProgress').textContent=`Processed ${results.length}/${valid.length}; ${results.filter(r=>r.error).length} errors.`;
      }
      results.push(...preview.filter(r=>r.status==='ERROR').map(r=>({...r.row,error:r.error,accountCreated:false})));
      document.getElementById('importProgress').textContent=`${results.filter(r=>!r.error).length}/${preview.length} rows completed; ${results.filter(r=>r.error).length} failed or skipped.`;
      document.getElementById('importResults').innerHTML=results.map(r=>`<p>${e(r.name || r.subjectName)} · ${e(r.usn || r.employeeId || r.subjectCode)} · ${e(r.email || r.collegeEmail || r.teacherEmail)} · ${e(r.error || r.warning || (type==='teachers'?(r.accountUpdated?'Teacher updated':'Teacher created'):type==='offerings'?r.studentsMapped+' / '+r.studentsMatched+' matching students mapped':r.subjectsMapped !== undefined ? r.subjectsMapped + ' subjects mapped' : 'Complete'))} ${r.activation?'· activation '+e(r.activation):''}</p>`).join('');document.getElementById('downloadReport').disabled=false;
    } finally {controls.forEach(id=>document.getElementById(id).disabled=false);}
  });
  document.getElementById('downloadReport').onclick=()=>{
    const headers=['name','usn','email','section','accountCreated','academicMappingCreated','mentorMapped','subjectsMapped','activation','error','warning','employeeId','role','uid','accountUpdated','studentsMatched','studentsMapped'],quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
    const csv=[headers.join(','),...results.map(r=>headers.map(k=>quote(r[k])).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='institutional-import-results.csv';a.click();URL.revokeObjectURL(url);
  };
  document.getElementById('searchBtn').onclick=event=>busy(event.target,async()=>{
    const result=await api('directory',{field:document.getElementById('searchField').value,value:document.getElementById('searchValue').value});
    document.getElementById('searchResults').innerHTML=result.rows.map(r=>`<div class="row"><span>${e(r.name)} · ${e(r.email)} · ${e(r.role)}<br>${e(r.usn || r.facultyId)} · internal UID ${e(r.uid)}<br>Status: ${e(r.accountStatus || "active")}</span>${["inactive","deleted","deactivating"].includes(r.accountStatus)?"":`<button class="btn-sm retry-activation" data-uid="${e(r.uid)}">Retry activation email</button>`}${r.role!=='admin'?`<button class="btn-sm" data-remove-account="${e(r.uid)}">${r.accountStatus==="inactive"?"View inactive account":"Delete account"}</button>`:""}</div>`).join('') || 'No account found.';
    wireAccountRemoval(document.getElementById('searchResults'),async()=>{await exitManager.refresh();document.getElementById('searchBtn').click();});
    document.querySelectorAll('.retry-activation').forEach(b=>b.onclick=()=>busy(b,async()=>{const delivery=await api('retryActivation',{uid:b.dataset.uid});alert(delivery.warning || `Activation: ${delivery.activation}`);}));
  });
  try {
    const policy=await api('policy'),form=document.getElementById('policyForm');for(const key of ['allowedDomains','departments','sections']) form.elements[key].value=(key==='departments'?policy[key].map(v=>departmentLabel(v)):policy[key]).join(', ');for(const key of ['smtpHost','smtpPort','smtpUser','mailFrom']) form.elements[key].value=policy[key] || '';
    if(isEmulator && !form.elements.allowedDomains.value) form.elements.allowedDomains.value='demo.test';
    const mentors=await page('users',[['role','==','mentor']],null,100);document.getElementById('mentorOptions').innerHTML=mentors.rows.map(m=>`<option value="${e(m.email)}">${e(m.name)} · ${e(m.facultyId)}</option>`).join('');
  } catch(error) {document.getElementById('policyStatus').textContent=`Provisioning backend unavailable: ${error.message}. Start the Functions emulator or deploy the backend. Existing workflows remain available through Advanced record editing.`;}
}
function showPreview() {
  const counts=status=>preview.filter(r=>r.status===status).length;
  document.getElementById('importPreview').innerHTML=`<p>${preview.length} rows uploaded · ${counts('VALID')} valid · ${counts('WARNING')} warnings · ${preview.filter(r=>r.duplicate).length} duplicate rows · ${counts('ERROR')} error rows</p><div class="table-scroll"><table class="${document.getElementById('importType').value==='teachers'?'teacher-preview':''}"><thead><tr><th>CSV row</th><th>Name / subject</th><th>Email / teacher</th><th>${document.getElementById('importType').value==='teachers'?'Employee ID / role':'Section'}</th><th>Department</th><th>Status</th><th>Details</th></tr></thead><tbody>${preview.slice(previewPage*50,(previewPage+1)*50).map(r=>`<tr><td>${r.index+2}</td><td>${e(r.row.name || r.row.subjectName)}</td><td>${e(r.row.collegeEmail || r.row.teacherEmail)}</td><td>${document.getElementById('importType').value==='teachers'?e(r.row.employeeId)+' / '+e(r.row.role):e(r.row.section)}</td><td>${e(departmentLabel(r.row.department))}</td><td>${e(r.status)}</td><td>${e(r.error || r.warnings?.join(' ') || 'Ready')}${r.inactiveUid?`<br><button class="btn-sm" data-reactivate-account="${e(r.inactiveUid)}" data-kind="${document.getElementById('importType').value==='students'?'student':'faculty'}">Reactivate existing account</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
  wireAccountReactivation(document.getElementById('importPreview'),async()=>{await exitManager.refresh();document.getElementById('previewBtn').click();});
  document.getElementById('previewPrevious').hidden=previewPage===0;document.getElementById('previewNext').hidden=(previewPage+1)*50>=preview.length;
}
