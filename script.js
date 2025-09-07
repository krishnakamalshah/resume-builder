// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBIHzPoVYOcFwCtab3UDWJLlK0YYa2HL_Y",
  authDomain: "my-resume-builder-61766.firebaseapp.com",
  projectId: "my-resume-builder-61766",
  storageBucket: "my-resume-builder-61766.firebasestorage.app",
  messagingSenderId: "698820841364",
  appId: "1:698820841364:web:c4994a8ce5759d7ddfc981",
  measurementId: "G-P0WB7SWHML"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let currentResumeId = null;


onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    document.getElementById("userWelcome").textContent = `Welcome, ${user.displayName || user.email}`;
    await loadResumeList(); // Load resume dropdown
  }
});


window.logoutUser = function () {
  signOut(auth).then(() => {
    alert("Logged out");
    window.location.href = "login.html";
  });
};


let currentStep = 0;
const steps = document.querySelectorAll(".form-step");

// Show the current step
function showStep(index) {
  steps.forEach((step, i) => {
    step.classList.toggle("active", i === index);
  });

  attachInputValidation(index);
  validateCurrentStep(); // Immediately validate for current step
}

async function createNewResume() {
  const docRef = await addDoc(collection(db, "users", currentUser.uid, "resumes"), {
    title: `Resume ${Date.now()}`,
    createdAt: new Date().toISOString(),
    data: {}
  });
  currentResumeId = docRef.id;
  await loadResumeList();
  clearForm();
}

// Move to next step
window.nextStep = function () {
  if (currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
  }
}


// Move to previous step
window.prevStep = function () {
  if (currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
}

// Validate current step
function validateCurrentStep() {
  const currentFormStep = steps[currentStep];
  const inputs = currentFormStep.querySelectorAll("input[required], textarea[required]");
  const nextBtn = currentFormStep.querySelector("button[id^='nextBtn']");

  const allFilled = Array.from(inputs).every(input => input.value.trim() !== "");
  if (nextBtn) {
    nextBtn.disabled = !allFilled;
  }
}

// Attach input listeners to current step
function attachInputValidation(index) {
  const currentFormStep = steps[index];
  const inputs = currentFormStep.querySelectorAll("input[required], textarea[required]");

  inputs.forEach(input => {
    input.removeEventListener("input", validateCurrentStep); // Remove existing to avoid duplicates
    input.addEventListener("input", validateCurrentStep);
  });
}

// Work Experience Add
function addWorkExperience() {
  const container = document.getElementById("workExperienceContainer");
  const index = container.children.length;
  const section = document.createElement("div");
  section.className = "section-group";
  section.innerHTML = `
    <h3>Experience ${index + 1}</h3>
    <input type="text" name="workDesignation${index}" placeholder="Work Designation" / required>
    <input type="text" name="workCompany${index}" placeholder="Company Name" / required>
    <input type="text" name="workLocation${index}" placeholder="Location" / required>
    <input type="text" name="workDate${index}" placeholder="Working Date" / required>
    <textarea name="workDesc${index}" placeholder="Bullet points (line-separated)" rows="3"></textarea>
  `;
  container.appendChild(section);
  attachLocalListeners(section);
}

// Project Add
function addProject() { 
  const container = document.getElementById("projectsContainer");
  const index = container.children.length;
  const section = document.createElement("div");
  section.className = "section-group";
  section.innerHTML = `
    <h3>Project ${index + 1}</h3>
    <input type="text" name="projectName${index}" placeholder="Project Name" />
    <input type="text" name="projectTech${index}" placeholder="Technology Used" / required>
    <textarea name="projectAim${index}" placeholder="Aim" rows="2" required></textarea>
    <textarea name="projectDesc${index}" placeholder="Bullet points (line-separated)" rows="3" required></textarea>
  `;
  container.appendChild(section);
  attachLocalListeners(section);
}

// Save locally
function attachLocalListeners(container) {
  container.querySelectorAll("input, textarea").forEach(input => {
    input.addEventListener("input", saveToLocalStorage);
  });
}

function saveToLocalStorage() {
  const data = {};
  document.querySelectorAll("input, textarea").forEach(input => {
    data[input.name] = input.value;
  });
  localStorage.setItem("resumeData", JSON.stringify(data));
}

function loadFromLocalStorage() {
  const saved = JSON.parse(localStorage.getItem("resumeData") || "{}");
  for (const [key, value] of Object.entries(saved)) {
    let el = document.querySelector(`[name='${key}']`);
    if (!el) {
      if (key.startsWith("work")) addWorkExperience();
      else if (key.startsWith("project")) addProject();
      el = document.querySelector(`[name='${key}']`);
    }
    if (el) el.value = value;
  }
}

async function loadResumeList() {
  const selector = document.getElementById("resumeSelector");
  selector.innerHTML = "";

  const q = collection(db, "users", currentUser.uid, "resumes");
  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap => {
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.textContent = docSnap.data().title || "Untitled Resume";
    selector.appendChild(opt);
  });

  // Load first resume if exists
  if (selector.options.length > 0) {
    currentResumeId = selector.options[0].value;
    loadResumeData(currentResumeId);
  }

  selector.onchange = () => {
    currentResumeId = selector.value;
    loadResumeData(currentResumeId);
  };
}

// Resume Preview
window.resumePreview = async function () {
  const form = new FormData(document.getElementById("resumeForm"));
  const get = key => form.get(key) || "";

  // Personal Info
  const nameEl = document.getElementById("name");
  const contactEl = document.getElementById("contact");
  const educationEl = document.getElementById("educationBlock");
  const langEl = document.getElementById("skillLang");
  const webEl = document.getElementById("skillWeb");
  const coreEl = document.getElementById("skillCore");
  const toolsEl = document.getElementById("skillTools");
  const expSection = document.getElementById("experienceSection");
  const projSection = document.getElementById("projectSection");
  const achieveEl = document.getElementById("achievementBlock");

  // Section Headings
  const eduHeading = educationEl.previousElementSibling;
  const skillHeading = langEl.closest("ul").previousElementSibling;
  const expHeading = expSection.previousElementSibling;
  const projHeading = projSection.previousElementSibling;
  const achieveHeading = achieveEl.previousElementSibling;

  // Reset Sections
  expSection.innerHTML = "";
  projSection.innerHTML = "";

  // Fill Data
  nameEl.textContent = get("fullName");
  contactEl.innerHTML = `
    <span>${get("phone")}</span> |
    <span><a href="mailto:${get("email")}">${get("email")}</a></span> |
    <span><a href="${get("linkedin")}" target="_blank">LinkedIn</a></span> |
    <span><a href="${get("github")}" target="_blank">GitHub</a></span> |
    <span><a href="${get("portfolio")}" target="_blank">Portfolio</a></span>
  `;

  const eduContent = `
    <strong>${get("college")}</strong><br>
    ${get("degree")} (${get("edu-duration")})<br>
    CGPA: ${get("cgpa")}`;
  educationEl.innerHTML = eduContent;
  educationEl.style.display = eduContent.trim() ? "block" : "none";
  eduHeading.style.display = eduContent.trim() ? "block" : "none";

  const skillVisible = get("languages") || get("web") || get("core") || get("tools");
  langEl.innerHTML = `<strong>Languages:</strong> ${get("languages")}`;
  webEl.innerHTML = `<strong>Web:</strong> ${get("web")}`;
  coreEl.innerHTML = `<strong>Core CS:</strong> ${get("core")}`;
  toolsEl.innerHTML = `<strong>Tools:</strong> ${get("tools")}`;
  langEl.closest("ul").style.display = skillVisible ? "block" : "none";
  skillHeading.style.display = skillVisible ? "block" : "none";

  let expCount = 0;
  for (let i = 0; i < 10; i++) {
    const role = get(`workDesignation${i}`);
    if (role) {
      expCount++;
      const bullets = get(`workDesc${i}`).split('\n').map(line => `<li>${line}</li>`).join('');
      const item = document.createElement("div");
      item.innerHTML = `
        <p><strong>${role}</strong> at ${get(`workCompany${i}`)}, ${get(`workLocation${i}`)} (${get(`workDate${i}`)})</p>
        <ul>${bullets}</ul>
      `;
      expSection.appendChild(item);
    }
  }
  expSection.style.display = expCount ? "block" : "none";
  expHeading.style.display = expCount ? "block" : "none";

  let projCount = 0;
  for (let i = 0; i < 10; i++) {
    const title = get(`projectName${i}`);
    if (title) {
      projCount++;
      const bullets = get(`projectDesc${i}`).split('\n').map(line => `<li>${line}</li>`).join('');
      const item = document.createElement("div");
      item.innerHTML = `
        <p><strong>${title}</strong> (${get(`projectTech${i}`)})</p>
        <p><em>Aim:</em> ${get(`projectAim${i}`)}</p>
        <ul>${bullets}</ul>
      `;
      projSection.appendChild(item);
    }
  }
  projSection.style.display = projCount ? "block" : "none";
  projHeading.style.display = projCount ? "block" : "none";

  const achievements = get("achievements").replace(/\n/g, "<br>");
  achieveEl.innerHTML = achievements;
  const hasAchievements = achievements.trim() !== "";
  achieveEl.style.display = hasAchievements ? "block" : "none";
  achieveHeading.style.display = hasAchievements ? "block" : "none";

  document.getElementById("downloadButtons").style.display = "block";

  saveResumeToFirestore();
  await uploadWordToDrive(get("fullName"));

}

async function saveResumeToFirestore() {
  if (!currentUser || !currentResumeId) return;
  const form = new FormData(document.getElementById("resumeForm"));
  const data = {};
  form.forEach((value, key) => {
    data[key] = value;
  });
  try {
    await updateDoc(doc(db, "users", currentUser.uid, "resumes", currentResumeId), {
      data: data
    });
    console.log("Resume saved.");
  } catch (err) {
    console.error("Save failed:", err);
  }
}

async function uploadWordToDrive(username) {
  const resumeHTML = document.getElementById("resumePreview").innerHTML;

  // Convert to .docx blob
  const blob = htmlDocx.asBlob(`
    <!DOCTYPE html>
    <html><head><meta charset='utf-8'></head>
    <body>${resumeHTML}</body></html>
  `);

  // Convert blob to base64
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  // Send to Apps Script
  await fetch("https://script.google.com/macros/s/AKfycbwQBQ0cEneJpobsZK4WbafWFbpHP8jBIbLie8XAcLoalH-gN0ZQZ_qDY1_Euz9VRwgG/exec", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      file: base64,
      username: username || "Resume"
    })
  })
  .then(res => res.text())
  .then(msg => console.log("✅ Upload:", msg))
  .catch(err => console.error("❌ Upload Error:", err));
}


function clearForm() {
  document.querySelectorAll("input, textarea").forEach(el => el.value = "");
  document.getElementById("workExperienceContainer").innerHTML = "";
  document.getElementById("projectsContainer").innerHTML = "";
  addWorkExperience();
  addProject();
}


// Download PDF
window.downloadPDF = function () {
  const element = document.getElementById("resumePreview");
  const opt = {
    margin: 0.5,
    filename: 'resume.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}

// Download Word
window.downloadWord = function () {
  const content = document.getElementById("resumePreview").innerHTML;
  const converted = htmlDocx.asBlob(`<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>${content}</body></html>`);
  saveAs(converted, 'resume.docx');
}

// Initial Load
window.onload = () => {
  addWorkExperience();
  addProject();
  loadFromLocalStorage();
  showStep(currentStep);
};

