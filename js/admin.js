import {departmentLabel} from './department.js';
import { db } from "./firebase-config.js";
import { requireAuth, wireLogout } from "./auth.js";
import { initThemeToggle } from "./theme.js";
import { doc, setDoc, writeBatch, serverTimestamp, arrayRemove } from "./api-store.js";
import { page, record } from "./academic.js";
import { escapeHtml as e, errorState, busy } from "./ui.js";
import { ROLES, SERVICES, stableId, saveAccount, saveOffering, enrollStudent, preparePlan } from "./admin-data.js";
import { upgradeLegacyRequest } from "./workflow.js";
import { parseCSV } from "./csv.js";
wireLogout(); initThemeToggle();
const content = document.getElementById("content");
const fields = {
  users: ["uid","name","role","email","phone","facultyId","department","usn","semester","section","mentorId"],
  students: ["uid","name","email","phone","department","scheme","usn","semester","section","mentorId"],
  subjects: ["id","name","code"],
  offerings: ["id","subjectId","department","scheme","semester","section","teacherId","active"],
  enrollments: ["studentId","offeringId"],
  assignments: ["id","offeringId","title","description","dueDate","status"],
  settings: [...SERVICES,"hodId","officeId"]
};
const tabTitles = {
  students: "🎓 Student Records",
  users: "👥 Faculty & Staff Accounts",
  subjects: "📘 Course Subjects",
  offerings: "🏫 Classes & Teacher Assignments",
  enrollments: "📝 Student Course Enrollments",
  assignments: "📋 Class Assignments",
  settings: "⚙️ Institutional Approver Roles"
};
const fieldLabels = {
  uid: "User Account ID (Firebase UID)",
  id: "Record ID / Document ID",
  name: "Full Name",
  role: "Account Role",
  email: "College Email Address",
  phone: "Phone Number",
  facultyId: "Faculty / Employee ID",
  department: "Academic Department",
  usn: "University Seat Number (USN)",
  semester: "Semester Number (1 to 8)",
  section: "Section (A, B, C...)",
  mentorId: "Assigned Mentor UID",
  scheme: "Curriculum Scheme (e.g. 2022)",
  code: "Subject Code (e.g. 21CS51)",
  subjectId: "Subject ID",
  teacherId: "Assigned Teacher UID",
  active: "Active Status (true or false)",
  studentId: "Student UID",
  offeringId: "Class / Offering ID",
  title: "Assignment Title",
  description: "Assignment Description",
  dueDate: "Submission Due Date",
  status: "Current Status",
  library: "Library Approver UID",
  accounts: "Accounts Approver UID",
  hodId: "Head of Department (HOD) UID",
  officeId: "Administrative Office UID"
};
const roleLabels = {
  student: "Student",
  subject_faculty: "Subject Faculty",
  mentor: "Faculty Mentor",
  hod: "Head of Department (HOD)",
  office: "College Office",
  library: "Library In-charge",
  physics_lab: "Physics Lab In-charge",
  chemistry_lab: "Chemistry Lab In-charge",
  accounts: "Accounts / Fee In-charge",
  admin: "Administrator"
};
let selected = "students", cursor, listed = [];
requireAuth(["admin"]).then(() => render()).catch(error => errorState(content, error));
async function render() {
  content.innerHTML = `<div class="banner">ℹ️ Database editor: Directly inspect or adjust individual records in the college database.</div>
    <div class="tab-strip">${Object.keys(fields).map(key => `<button class="btn-sm tab ${selected===key?'active':''}" data-key="${key}">${e(tabTitles[key] || key)}</button>`).join("")}</div>
    <div class="card">
      <h2>${e(tabTitles[selected] || selected)}</h2>
      <p class="muted">Fill in the fields below to create or update this record.</p>
      <form id="recordForm">
        ${fields[selected].map(key => {
          if (key === "role") return `<label style="margin-bottom:10px;"><span style="font-weight:500;display:block;margin-bottom:3px;">${e(fieldLabels[key] || key)}</span><select name="role">${ROLES.map(r => `<option value="${e(r)}">${e(roleLabels[r] || r)}</option>`).join("")}</select></label>`;
          if (key === "department") return `<label style="margin-bottom:10px;"><span style="font-weight:500;display:block;margin-bottom:3px;">${e(fieldLabels[key] || key)}</span><select name="department"><option value="">-- Select Department --</option><option value="CSE">CSE</option><option value="ISE">ISE</option><option value="AIML">AIML</option><option value="AIDS">AIDS</option><option value="CIVIL">CIVIL</option><option value="MECHANICAL">MECHANICAL</option><option value="ECE">ECE</option><option value="POLYTECHNIC">POLYTECHNIC</option><option value="ELECTRICAL">ELECTRICAL</option></select></label>`;
          if (key === "section") return `<label style="margin-bottom:10px;"><span style="font-weight:500;display:block;margin-bottom:3px;">${e(fieldLabels[key] || key)}</span><select name="section"><option value="">-- Select Section --</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></label>`;
          if (key === "semester") return `<label style="margin-bottom:10px;"><span style="font-weight:500;display:block;margin-bottom:3px;">${e(fieldLabels[key] || key)}</span><select name="semester"><option value="">-- Select Semester --</option>${[1,2,3,4,5,6,7,8].map(s=>`<option value="${s}">${s}</option>`).join("")}</select></label>`;
          if (key === "scheme") return `<label style="margin-bottom:10px;"><span style="font-weight:500;display:block;margin-bottom:3px;">${e(fieldLabels[key] || key)}</span><select name="scheme"><option value="">-- Select Scheme --</option>${[2022,2023,2024,2025,2026].map(y=>`<option value="${y}">${y}</option>`).join("")}</select></label>`;
          return `<label style="margin-bottom:10px;"><span style="font-weight:500;display:block;margin-bottom:3px;">${e(fieldLabels[key] || key)}</span><input name="${e(key)}" placeholder="Enter ${e(fieldLabels[key] || key)}" ${key === "email" ? 'type="email"' : key === "dueDate" ? 'type="date"' : 'type="text"'}>></label>`;
        }).join("")}
        ${selected === "offerings" ? '<label style="margin-top:8px;"><span style="font-weight:500;display:block;margin-bottom:3px;">Assessments Breakdown: ID, Title, Max Marks (one per line)</span><textarea name="components" rows="4" placeholder="ia1, Internal Assessment 1, 30\nia2, Internal Assessment 2, 30"></textarea></label>' : ""}
        <button class="btn-primary" type="submit" style="margin-top:10px;">Save Record</button>
      </form>
      <p id="saveMessage" role="status"></p>
    </div>
    <div class="card">
      <h2>Search &amp; Edit Existing ${e(tabTitles[selected] || selected)}</h2>
      <label><span style="font-weight:500;display:block;margin-bottom:3px;">Record ID or UID</span><input id="lookup" placeholder="Paste exact ID to search"></label>
      <button id="lookupBtn" class="btn-primary" style="margin-top:4px;">Find &amp; Edit Record</button>
      <div id="records" style="margin-top:14px;"></div>
      <button id="next" class="btn-sm" style="margin-top:10px;">Load More Records</button>
    </div>
    <div class="card">
      <h2>Rebuild Student Clearance Approvals</h2>
      <p class="muted">Recalculates required teacher, mentor, and departmental approvers for a student's No-Due application.</p>
      <label><span style="font-weight:500;display:block;margin-bottom:3px;">Student Account UID</span><input id="planUid" placeholder="e.g. user_abc123"></label>
      <button id="planBtn" class="btn-primary" style="margin-top:6px;">Update Clearance Approver Plan</button>
    </div>
    <div class="card">
      <h2>Bulk Import Students via CSV</h2>
      <p class="muted">Upload CSV file with columns: uid, name, usn, email, phone, semester, section, mentorId.</p>
      <input id="csv" type="file" accept=".csv">
      <button id="csvPreviewBtn" class="btn-sm">Preview CSV File</button>
      <div id="csvPreview" style="margin-top:10px;"></div>
      <button id="csvSave" class="btn-primary" disabled style="margin-top:8px;">Import All Valid Students</button>
    </div>
    <div class="card">
      <h2>Upgrade Existing No-Due Application</h2>
      <p class="muted">Migrate an older application to the current clearance workflow while preserving all existing approval timestamps.</p>
      <label><span style="font-weight:500;display:block;margin-bottom:3px;">Application / Request ID</span><input id="legacyId" placeholder="e.g. req_xyz"></label>
      <button id="legacyBtn" class="btn-sm" style="margin-top:6px;">Upgrade Application</button>
    </div>`;
  document.querySelectorAll(".tab").forEach(b => b.onclick = () => { selected = b.dataset.key; cursor = null; listed = []; render().catch(error => errorState(content,error)); });
  document.getElementById("recordForm").onsubmit = event => { event.preventDefault(); busy(event.target.querySelector("button"), () => save(new FormData(event.target))); };
  document.getElementById("lookupBtn").onclick = event => busy(event.target, async () => { const row = await record(selected, document.getElementById("lookup").value.trim()); if (!row) throw new Error("Record not found."); edit(row); });
  document.getElementById("next").onclick = event => busy(event.target, () => loadList(true));
  document.getElementById("planBtn").onclick = event => busy(event.target, async () => { await preparePlan(document.getElementById("planUid").value.trim()); alert("Academic mappings and clearance plan are ready."); });
  document.getElementById("legacyBtn").onclick = event => busy(event.target, async () => {
    const id = document.getElementById("legacyId").value.trim(), r = await record("noDueRequests", id);
    if (!r) throw new Error("Request not found.");
    const p = await record(`students/${r.studentId}/clearance`, "plan");
    if (!p?.valid) throw new Error("Prepare the student clearance plan first.");
    if (confirm(`Upgrade ${r.studentName} (${r.usn}), status ${r.status}, using current mappings?`)) { await upgradeLegacyRequest(id, p); alert("Legacy request upgraded; decisions preserved."); }
  });
  let csvRows = [];
  document.getElementById("csvPreviewBtn").onclick = event => busy(event.target, async () => {
    const file = document.getElementById("csv").files[0]; if (!file) throw new Error("Choose a CSV file.");
    csvRows = parseCSV(await file.text());
    document.getElementById("csvPreview").innerHTML = `<p>${csvRows.length} records</p>${csvRows.map(s => `<p>${e(s.uid)} · ${e(s.name)} · ${e(s.usn)} · ${e(s.mentorId)}</p>`).join("")}`;
    document.getElementById("csvSave").disabled = !csvRows.length;
  });
  document.getElementById("csv").onchange = () => { csvRows = []; document.getElementById("csvSave").disabled = true; };
  document.getElementById("csvSave").onclick = event => busy(event.target, async () => {
    let count = 0;
    for (const row of csvRows) { await saveAccount({...row,role:"student"}); count++; document.getElementById("csvPreview").textContent = `Imported ${count}/${csvRows.length}.`; }
    csvRows=[]; alert("Students imported. Assign subjects, then prepare their plans.");
  });
  await loadList();
}
async function edit(row) {
  if (selected === "users" && row.role === "student") row = {...row, ...(await record("students",row.id))};
  const form = document.getElementById("recordForm");
  for (const key of fields[selected]) if (form.elements[key]) form.elements[key].value = (key==='department'?departmentLabel(row[key]):row[key]) ?? (key === "uid" ? row.id : "");
  if (selected === "offerings") form.elements.components.value = (row.components || []).map(c => `${c.id}, ${c.label}, ${c.max}`).join("\n");
}
async function loadList(append = false) {
  const result = await page(selected, [], append ? cursor : null);
  cursor = result.cursor; listed = append ? [...listed,...result.rows] : result.rows;
  document.getElementById("records").innerHTML = listed.map(row => `<div class="row"><span>${e(row.name || row.title || row.subjectName || row.id)}<br><small>${e(row.id)} · ${e(row.role || row.subjectCode || row.usn || "")}</small></span><button class="btn-sm edit" data-id="${e(row.id)}">Edit</button>${selected === "enrollments" ? `<button class="btn-sm deactivate" data-id="${e(row.id)}">Deactivate</button>` : ""}</div>`).join("") || "No records yet.";
  document.getElementById("next").hidden = !result.more;
  document.querySelectorAll(".edit").forEach(b => b.onclick = () => edit(listed.find(r => r.id === b.dataset.id)));
  document.querySelectorAll(".deactivate").forEach(b => b.onclick = () => busy(b, async () => {
    const row = listed.find(r => r.id === b.dataset.id);
    const batch = writeBatch(db);
    batch.update(doc(db,"enrollments",row.id),{active:false});
    batch.set(doc(db,"students",row.studentId,"clearance","plan"),{valid:false},{merge:true});
    batch.update(doc(db,"students",row.studentId),{teacherIds:arrayRemove(row.teacherId),offeringIds:arrayRemove(row.offeringId)});
    await batch.commit();
    alert("Enrollment deactivated. Refresh the student clearance plan.");
  }));
}
async function save(formData) {
  const data = Object.fromEntries([...formData].map(([k,v]) => [k,v.trim()]));
  if (selected === "students" || selected === "users") await saveAccount({...data, role: selected === "students" ? "student" : data.role});
  else if (selected === "offerings") {
    data.components = data.components.split(/\r?\n/).filter(Boolean).map(line => { const [id,label,max] = line.split(",").map(v=>v.trim()); return {id,label,max:Number(max)}; }); await saveOffering(data);
  } else if (selected === "enrollments") await enrollStudent(data.studentId,data.offeringId);
  else if (selected === "settings") {
    for (const key of fields.settings) { const user = await record("users",data[key]); if (user?.role !== (key === "hodId" ? "hod" : key === "officeId" ? "office" : key)) throw new Error(`Choose a valid ${key} account UID.`); }
    await setDoc(doc(db,"settings","workflow"),data);
  } else {
    stableId(data.id);
    if (selected === "subjects" && (!data.name || !data.code)) throw new Error("Subject name and code are required.");
    if (selected === "assignments" && (!data.title || !(await record("offerings",data.offeringId)))) throw new Error("Assignment title and an existing class ID are required.");
    const {id,...payload} = data; await setDoc(doc(db,selected,id),{...payload,updatedAt:serverTimestamp()},{merge:true});
  }
  document.getElementById("saveMessage").textContent = "Saved. Refresh affected student clearance plans after academic changes.";
  await loadList();
}
