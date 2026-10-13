const sampleMaterials = [
  { id: "cse-s5-ds", kind: "paper", branch: "CSE", semester: 5, year: "2025", title: "Data Structures", subtitle: "Previous-paper entry · illustrative sample", code: "CSE / DS", description: "A sample library record to demonstrate how a student could find a subject paper. Replace this record with a verified paper, official subject code, exam session, and source URL before publishing.", source: "Sample data — not verified", exam: "Model entry" },
  { id: "cse-s5-dbms", kind: "paper", branch: "CSE", semester: 5, year: "2024", title: "Database Management", subtitle: "Previous-paper entry · illustrative sample", code: "CSE / DBMS", description: "An illustrative database-management paper entry. Add only after checking the document against a trustworthy source and confirming that it may be linked or distributed.", source: "Sample data — not verified", exam: "Model entry" },
  { id: "ece-s4-circuits", kind: "paper", branch: "ECE", semester: 4, year: "2025", title: "Electronic Circuits", subtitle: "Previous-paper entry · illustrative sample", code: "ECE / EC", description: "A sample electronic-circuits listing for testing branch and semester filters. No real PDF is attached to this prototype entry.", source: "Sample data — not verified", exam: "Model entry" },
  { id: "eee-s3-machines", kind: "paper", branch: "EEE", semester: 3, year: "2024", title: "Electrical Machines", subtitle: "Previous-paper entry · illustrative sample", code: "EEE / EM", description: "A placeholder record demonstrating how electrical engineering material could be presented. Verify the syllabus, regulation, and source before replacing the placeholder.", source: "Sample data — not verified", exam: "Model entry" },
  { id: "cse-s5-revision", kind: "guide", branch: "CSE", semester: 5, year: "2026", title: "Revision Planner", subtitle: "Study guide · illustrative sample", code: "GUIDE / 01", description: "A sample study guide entry. A real guide could help students divide topics into short sessions, track confidence, and revisit mistakes.", source: "Sample data — not verified", exam: "Study guide" },
  { id: "all-study-method", kind: "guide", branch: "all", semester: 0, year: "2026", title: "Practice Session Notes", subtitle: "Study guide · illustrative sample", code: "GUIDE / 02", description: "A sample guide about using timed practice sessions, reviewing mistakes, and noting topics to revisit. Replace with reviewed original content before launch.", source: "Sample data — not verified", exam: "Study guide" }
];

const branchNames = { CSE: "Computer Science", ECE: "Electronics", EEE: "Electrical", MECH: "Mechanical", CIVIL: "Civil", all: "All branches" };
const paperGrid = document.querySelector("#paperGrid");
const branchFilter = document.querySelector("#branchFilter");
const semesterFilter = document.querySelector("#semesterFilter");
const searchInput = document.querySelector("#searchInput");
const resultCount = document.querySelector("#resultCount");
const bottomCount = document.querySelector("#bottomCount");
const emptyState = document.querySelector("#emptyState");
const savedCount = document.querySelector("#savedCount");
const paperDialog = document.querySelector("#paperDialog");
const toast = document.querySelector("#toast");
let activeKind = "all";
let currentDialogId = null;
let savedIds = loadSaved();
let toastTimer;

function loadSaved() {
  try {
    const value = JSON.parse(localStorage.getItem("paperdesk-saved") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function persistSaved() {
  try {
    localStorage.setItem("paperdesk-saved", JSON.stringify(savedIds));
  } catch {
    showToast("Saving is unavailable in this browser session.");
  }
  savedCount.textContent = savedIds.length;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function matchesFilters(item) {
  const branch = branchFilter.value;
  const semester = semesterFilter.value;
  const query = searchInput.value.trim().toLowerCase();
  const branchMatches = branch === "all" || item.branch === "all" || item.branch === branch;
  const semesterMatches = semester === "all" || item.semester === 0 || String(item.semester) === semester;
  const kindMatches = activeKind === "all" || item.kind === activeKind;
  const haystack = [item.title, item.subtitle, item.code, item.branch, branchNames[item.branch], item.year, item.description].join(" ").toLowerCase();
  const queryMatches = !query || haystack.includes(query);
  return branchMatches && semesterMatches && kindMatches && queryMatches;
}

function renderMaterials() {
  const filtered = sampleMaterials.filter(matchesFilters);
  paperGrid.replaceChildren();
  emptyState.classList.toggle("hidden", filtered.length !== 0);
  paperGrid.classList.toggle("hidden", filtered.length === 0);

  filtered.forEach((item) => {
    const card = document.createElement("article");
    card.className = "paper-card";

    const top = document.createElement("div");
    top.className = "card-top";
    const type = document.createElement("span");
    type.className = "card-type";
    type.textContent = item.kind === "paper" ? "QUESTION PAPER" : "STUDY GUIDE";
    const year = document.createElement("span");
    year.className = "card-year";
    year.textContent = item.year;
    top.append(type, year);

    const icon = document.createElement("div");
    icon.className = "card-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = item.kind === "paper" ? "P." : "N.";

    const title = document.createElement("h3");
    title.textContent = item.title;
    const subtitle = document.createElement("p");
    subtitle.className = "card-subtitle";
    subtitle.textContent = item.subtitle;

    const bottom = document.createElement("div");
    bottom.className = "card-bottom";
    const tags = document.createElement("div");
    tags.className = "card-tags";
    const branchTag = document.createElement("span");
    branchTag.className = "card-tag";
    branchTag.textContent = item.branch === "all" ? "ALL BRANCHES" : item.branch;
    const semTag = document.createElement("span");
    semTag.className = "card-tag";
    semTag.textContent = item.semester ? `SEM ${item.semester}` : "GENERAL";
    tags.append(branchTag, semTag);

    const open = document.createElement("button");
    open.className = "card-open";
    open.type = "button";
    open.setAttribute("aria-label", `View details for ${item.title}`);
    open.textContent = "↗";
    open.addEventListener("click", () => openDetails(item.id));
    bottom.append(tags, open);
    card.append(top, icon, title, subtitle, bottom);
    paperGrid.append(card);
  });

  resultCount.textContent = `Showing ${filtered.length} of ${sampleMaterials.length} sample entries`;
  bottomCount.textContent = `${String(filtered.length).padStart(2, "0")} ITEMS / SAMPLE DATA`;
}

function openDetails(id) {
  const item = sampleMaterials.find((material) => material.id === id);
  if (!item) return;
  currentDialogId = id;
  document.querySelector("#dialogTitle").textContent = item.title;
  document.querySelector("#dialogMeta").textContent = `${item.code} · ${item.year} · ${item.source}`;
  document.querySelector("#dialogDescription").textContent = item.description;
  document.querySelector("#dialogSave").innerHTML = savedIds.includes(id) ? 'Saved for later <span>✓</span>' : 'Save for later <span>＋</span>';
  if (typeof paperDialog.showModal === "function") paperDialog.showModal();
  else showToast("Your browser does not support this details dialog.");
}

function toggleSaved(id) {
  if (savedIds.includes(id)) {
    savedIds = savedIds.filter((savedId) => savedId !== id);
    showToast("Removed from saved items.");
  } else {
    savedIds.push(id);
    showToast("Saved on this device.");
  }
  persistSaved();
}

document.querySelector("#filterForm").addEventListener("submit", (event) => {
  event.preventDefault();
  renderMaterials();
  document.querySelector("#library").scrollIntoView({ behavior: "smooth" });
});

[branchFilter, semesterFilter].forEach((control) => control.addEventListener("change", renderMaterials));
searchInput.addEventListener("input", renderMaterials);

document.querySelectorAll(".view-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeKind = button.dataset.kind;
    document.querySelectorAll(".view-button").forEach((other) => other.classList.toggle("active", other === button));
    renderMaterials();
  });
});

document.querySelector("#clearFilters").addEventListener("click", () => {
  branchFilter.value = "all";
  semesterFilter.value = "all";
  searchInput.value = "";
  activeKind = "all";
  document.querySelectorAll(".view-button").forEach((button) => button.classList.toggle("active", button.dataset.kind === "all"));
  renderMaterials();
});

document.querySelector("#dialogSave").addEventListener("click", () => {
  if (!currentDialogId) return;
  toggleSaved(currentDialogId);
  document.querySelector("#dialogSave").innerHTML = savedIds.includes(currentDialogId) ? 'Saved for later <span>✓</span>' : 'Save for later <span>＋</span>';
});

document.querySelector("#savedToggle").addEventListener("click", () => {
  const savedItems = sampleMaterials.filter((item) => savedIds.includes(item.id));
  if (!savedItems.length) {
    showToast("No saved items yet. Open a material and save it for later.");
    return;
  }
  branchFilter.value = "all";
  semesterFilter.value = "all";
  searchInput.value = "";
  activeKind = "all";
  document.querySelectorAll(".view-button").forEach((button) => button.classList.toggle("active", button.dataset.kind === "all"));
  paperGrid.replaceChildren();
  emptyState.classList.add("hidden");
  paperGrid.classList.remove("hidden");
  savedItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "paper-card";
    const type = document.createElement("span");
    type.className = "card-type";
    type.textContent = "SAVED ITEM";
    const title = document.createElement("h3");
    title.style.marginTop = "25px";
    title.textContent = item.title;
    const subtitle = document.createElement("p");
    subtitle.className = "card-subtitle";
    subtitle.textContent = `${item.code} · ${item.year}`;
    const open = document.createElement("button");
    open.className = "text-link";
    open.style.marginTop = "24px";
    open.style.alignSelf = "flex-start";
    open.type = "button";
    open.textContent = "View details ↗";
    open.addEventListener("click", () => openDetails(item.id));
    card.append(type, title, subtitle, open);
    paperGrid.append(card);
  });
  resultCount.textContent = `${savedItems.length} saved item${savedItems.length === 1 ? "" : "s"}`;
  bottomCount.textContent = `${String(savedItems.length).padStart(2, "0")} SAVED ITEMS`;
  document.querySelector("#library").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#backToTop").addEventListener("click", (event) => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

persistSaved();
renderMaterials();
