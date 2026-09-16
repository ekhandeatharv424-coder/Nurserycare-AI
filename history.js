const API = "http://localhost:5000/api";

let allAnalyses = [];


// ======================================================
// AUTH CHECK
// ======================================================

const token = localStorage.getItem("nurserycare_token");

if (!token) {
    window.location.href = "login.html";
}


// ======================================================
// DOM ELEMENTS
// ======================================================

const searchInput = document.getElementById("search");
const filterSelect = document.getElementById("filter");
const listContainer = document.getElementById("list");

const totalAnalyses = document.getElementById("totalAnalyses");
const healthyAnalyses = document.getElementById("healthyAnalyses");
const attentionAnalyses = document.getElementById("attentionAnalyses");


// ======================================================
// LOAD HISTORY FROM BACKEND
// ======================================================

async function loadHistory() {

    if (!token) return;

    try {

        showLoading();

        const response = await fetch(
            `${API}/analyses`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {

            if (response.status === 401) {

                localStorage.removeItem("nurserycare_token");
                localStorage.removeItem("nurserycare_current_user");

                window.location.href = "login.html";
                return;
            }

            throw new Error(
                data.message || "Unable to load analysis history."
            );
        }

        allAnalyses = Array.isArray(data.analyses)
            ? data.analyses
            : [];

        renderHistory();

    } catch (error) {

        console.error("History Error:", error);

        listContainer.innerHTML = `
            <div class="empty">
                <div style="font-size:42px;margin-bottom:12px;">⚠️</div>
                <h3>Unable to Load History</h3>
                <p>${escapeHTML(error.message)}</p>
                <button
                    class="btn"
                    onclick="loadHistory()"
                    style="margin-top:15px;"
                >
                    Try Again
                </button>
            </div>
        `;
    }
}


// ======================================================
// LOADING STATE
// ======================================================

function showLoading() {

    listContainer.innerHTML = `
        <div class="empty">
            <div style="font-size:42px;margin-bottom:12px;">🌿</div>
            <h3>Loading Analysis History...</h3>
            <p>Please wait while we fetch your previous analyses.</p>
        </div>
    `;
}


// ======================================================
// GET HEALTH SCORE
// ======================================================

function getHealthScore(item) {

    const result = item?.result || {};

    let score = Number(result.healthScore);

    if (!Number.isFinite(score)) {
        score = 0;
    }

    return Math.max(
        0,
        Math.min(
            100,
            Math.round(score)
        )
    );
}


// ======================================================
// GET STATUS CLASS
// ======================================================

function getStatusClass(score) {

    if (score >= 80) {
        return "good";
    }

    if (score >= 50) {
        return "warn";
    }

    return "bad";
}


// ======================================================
// GET STATUS TEXT
// ======================================================

function getStatusText(item, score) {

    const status =
        item?.result?.healthStatus;

    if (status) {
        return String(status);
    }

    if (score >= 80) {
        return "Healthy";
    }

    if (score >= 50) {
        return "Needs Attention";
    }

    return "Poor";
}


// ======================================================
// FILTER + SEARCH
// ======================================================

function getFilteredAnalyses() {

    const search =
        String(
            searchInput?.value || ""
        )
        .trim()
        .toLowerCase();

    const filter =
        filterSelect?.value || "all";

    return allAnalyses.filter(
        function (item) {

            const result =
                item?.result || {};

            const score =
                getHealthScore(item);

            const plantName =
                String(
                    result.plantName || ""
                )
                .toLowerCase();

            const plantType =
                String(
                    result.plantType || ""
                )
                .toLowerCase();

            const problem =
                String(
                    result.possibleProblem || ""
                )
                .toLowerCase();

            const matchesSearch =
                !search ||
                plantName.includes(search) ||
                plantType.includes(search) ||
                problem.includes(search);

            let matchesFilter = true;

            if (filter === "healthy") {

                matchesFilter =
                    score >= 80;

            } else if (filter === "attention") {

                matchesFilter =
                    score >= 50 &&
                    score < 80;

            } else if (filter === "poor") {

                matchesFilter =
                    score < 50;
            }

            return (
                matchesSearch &&
                matchesFilter
            );
        }
    );
}


// ======================================================
// UPDATE STATISTICS
// ======================================================

function updateStatistics() {

    const total =
        allAnalyses.length;

    const healthy =
        allAnalyses.filter(
            function (item) {

                return getHealthScore(item) >= 80;
            }
        ).length;

    const attention =
        allAnalyses.filter(
            function (item) {

                return getHealthScore(item) < 80;
            }
        ).length;


    totalAnalyses.textContent =
        total;

    healthyAnalyses.textContent =
        healthy;

    attentionAnalyses.textContent =
        attention;
}


// ======================================================
// RENDER HISTORY
// ======================================================

function renderHistory() {

    updateStatistics();

    const rows =
        getFilteredAnalyses();


    if (!rows.length) {

        const hasData =
            allAnalyses.length > 0;

        listContainer.innerHTML = `
            <div class="empty">

                <div style="font-size:48px;margin-bottom:12px;">
                    ${hasData ? "🔎" : "🌱"}
                </div>

                <h3>
                    ${
                        hasData
                            ? "No Matching Analyses"
                            : "No Analysis History Yet"
                    }
                </h3>

                <p>
                    ${
                        hasData
                            ? "Try changing your search or filter."
                            : "Upload a plant image and start your first AI analysis."
                    }
                </p>

                ${
                    !hasData
                        ? `
                            <a
                                href="analysis.html"
                                class="btn"
                                style="display:inline-block;margin-top:15px;"
                            >
                                Start AI Analysis
                            </a>
                        `
                        : ""
                }

            </div>
        `;

        return;
    }


    listContainer.innerHTML = `

        <div style="overflow-x:auto;">

            <table class="table">

                <thead>

                    <tr>

                        <th>Plant</th>

                        <th>Date</th>

                        <th>Health</th>

                        <th>Status</th>

                        <th>Possible Problem</th>

                    </tr>

                </thead>

                <tbody>

                    ${rows.map(
                        function (item) {

                            return createHistoryRow(item);
                        }
                    ).join("")}

                </tbody>

            </table>

        </div>
    `;
}


// ======================================================
// CREATE HISTORY ROW
// ======================================================

function createHistoryRow(item) {

    const result =
        item?.result || {};

    const score =
        getHealthScore(item);

    const badge =
        getStatusClass(score);

    const status =
        getStatusText(
            item,
            score
        );

    const plantName =
        result.plantName ||
        "Unknown Plant";

    const plantType =
        result.plantType ||
        "Plant";

    const problem =
        result.possibleProblem ||
        "No major problem detected";


    const date =
        formatDate(
            item.createdAt
        );


    return `

        <tr>

            <td>

                <div style="
                    display:flex;
                    flex-direction:column;
                    gap:4px;
                ">

                    <strong>
                        ${escapeHTML(plantName)}
                    </strong>

                    <small style="opacity:.7;">
                        ${escapeHTML(plantType)}
                    </small>

                </div>

            </td>


            <td>
                ${escapeHTML(date)}
            </td>


            <td>

                <strong>
                    ${score}%
                </strong>

            </td>


            <td>

                <span class="badge ${badge}">
                    ${escapeHTML(status)}
                </span>

            </td>


            <td>

                <span
                    title="${escapeHTML(problem)}"
                    style="
                        display:block;
                        max-width:320px;
                        white-space:nowrap;
                        overflow:hidden;
                        text-overflow:ellipsis;
                    "
                >
                    ${escapeHTML(problem)}
                </span>

            </td>

        </tr>

    `;
}


// ======================================================
// DATE FORMAT
// ======================================================

function formatDate(value) {

    if (!value) {
        return "Date unavailable";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Date unavailable";
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /[&<>"']/g,
            function (character) {

                const entities = {

                    "&": "&amp;",

                    "<": "&lt;",

                    ">": "&gt;",

                    '"': "&quot;",

                    "'": "&#39;"
                };

                return entities[character];
            }
        );
}


// ======================================================
// SEARCH EVENT
// ======================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderHistory
    );
}


// ======================================================
// FILTER EVENT
// ======================================================

if (filterSelect) {

    filterSelect.addEventListener(
        "change",
        renderHistory
    );
}


// ======================================================
// INITIAL LOAD
// ======================================================

loadHistory();