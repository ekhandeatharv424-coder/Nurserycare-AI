const API = "https://nurserycare-ai-1.onrender.com/api";


// ======================================================
// AUTH CHECK
// ======================================================

const token = localStorage.getItem("nurserycare_token");

if (!token) {
    window.location.href = "login.html";
}


// ======================================================
// DOM HELPERS
// ======================================================

function getElement(id) {
    return document.getElementById(id);
}


// ======================================================
// API REQUEST
// ======================================================

async function getData(endpoint) {

    const response = await fetch(
        API + endpoint,
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        }
    );

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {

        if (response.status === 401) {

            localStorage.removeItem("nurserycare_token");
            localStorage.removeItem("nurserycare_current_user");
            localStorage.removeItem("nurserycare_user");

            window.location.href = "login.html";

            throw new Error("Session expired.");
        }

        throw new Error(
            data.message || "Request failed."
        );
    }

    return data;
}


// ======================================================
// LOAD DASHBOARD
// ======================================================

async function loadDashboard() {

    try {

        setLoadingStates();

        const [
            analysisData,
            inventoryData
        ] = await Promise.all([
            getData("/analyses"),
            getData("/inventory")
        ]);


        const analyses =
            Array.isArray(analysisData.analyses)
                ? analysisData.analyses
                : [];


        const inventory =
            Array.isArray(inventoryData.inventory)
                ? inventoryData.inventory
                : [];


        // ------------------------------------------------
        // SORT NEWEST FIRST
        // ------------------------------------------------

        analyses.sort(
            function (a, b) {

                return (
                    new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0)
                );
            }
        );


        // ------------------------------------------------
        // HEALTH SCORES
        // ------------------------------------------------

        const scores =
            analyses.map(
                function (item) {

                    return getHealthScore(item);
                }
            );


        const total =
            analyses.length;


        const healthy =
            scores.filter(
                score => score >= 80
            ).length;


        const attention =
            scores.filter(
                score => score >= 50 && score < 80
            ).length;


        const problemAlerts =
            scores.filter(
                score => score < 50
            ).length;


        // ------------------------------------------------
        // AVERAGE HEALTH
        // ------------------------------------------------

        let average = 0;

        if (scores.length > 0) {

            average = Math.round(
                scores.reduce(
                    function (sum, score) {
                        return sum + score;
                    },
                    0
                ) / scores.length
            );
        }


        // ------------------------------------------------
        // UPDATE STATS
        // ------------------------------------------------

        getElement("total").textContent =
            total;

        getElement("healthy").textContent =
            healthy;

        getElement("attention").textContent =
            attention;

        getElement("alerts").textContent =
            problemAlerts;


        // ------------------------------------------------
        // OVERALL HEALTH
        // ------------------------------------------------

        updateOverallHealth(
            average,
            total
        );


        // ------------------------------------------------
        // USER WELCOME
        // ------------------------------------------------

        updateWelcome();


        // ------------------------------------------------
        // DASHBOARD DATE
        // ------------------------------------------------

        updateDate();


        // ------------------------------------------------
        // SMART ALERTS
        // ------------------------------------------------

        renderAlerts(
            analyses
        );


        // ------------------------------------------------
        // RECENT ANALYSES
        // ------------------------------------------------

        renderRecentAnalyses(
            analyses
        );


        // ------------------------------------------------
        // INVENTORY
        // ------------------------------------------------

        renderInventory(
            inventory
        );

    } catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );

        showDashboardError(
            error.message
        );
    }
}


// ======================================================
// HEALTH SCORE
// ======================================================

function getHealthScore(item) {

    const result =
        item?.result || {};

    let score =
        Number(result.healthScore);


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
// OVERALL HEALTH
// ======================================================

function updateOverallHealth(
    average,
    total
) {

    const scoreElement =
        getElement("score");

    const barElement =
        getElement("bar");

    const descriptionElement =
        getElement("desc");


    scoreElement.textContent =
        `${average}/100`;


    barElement.style.width =
        `${average}%`;


    if (total === 0) {

        descriptionElement.textContent =
            "Run your first AI analysis to monitor nursery health.";

        return;
    }


    if (average >= 80) {

        descriptionElement.textContent =
            "Overall nursery health is in a healthy range.";

    } else if (average >= 60) {

        descriptionElement.textContent =
            "Overall health is moderate. Monitor plants needing attention.";

    } else {

        descriptionElement.textContent =
            "Several plants may need attention. Review the latest analyses.";
    }
}


// ======================================================
// USER WELCOME
// ======================================================

function updateWelcome() {

    const welcome =
        getElement("welcome");


    if (!welcome) {
        return;
    }


    let user = {};


    try {

        user =
            JSON.parse(
                localStorage.getItem(
                    "nurserycare_current_user"
                ) ||
                localStorage.getItem(
                    "nurserycare_user"
                ) ||
                "{}"
            );

    } catch {

        user = {};
    }


    const name =
        user.name ||
        "Farmer";


    welcome.textContent =
        `Welcome, ${name}. Monitor your nursery in one place.`;
}


// ======================================================
// CURRENT DATE
// ======================================================

function updateDate() {

    const dateElement =
        getElement("dashboardDate");


    if (!dateElement) {
        return;
    }


    dateElement.textContent =
        new Date().toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );
}


// ======================================================
// SMART ALERTS
// ======================================================

function renderAlerts(
    analyses
) {

    const alertList =
        getElement("alertList");


    if (!alertList) {
        return;
    }


    const alerts =
        analyses
            .filter(
                function (item) {

                    return getHealthScore(item) < 80;
                }
            )
            .slice(0, 6);


    if (!alerts.length) {

        alertList.innerHTML = `
            <div class="empty-dashboard">
                <div style="font-size:32px;">✅</div>
                <div style="margin-top:8px;">
                    No attention alerts.
                </div>
            </div>
        `;

        return;
    }


    alertList.innerHTML =
        alerts.map(
            function (item) {

                const result =
                    item?.result || {};

                const score =
                    getHealthScore(item);

                const plantName =
                    result.plantName ||
                    "Unknown Plant";

                const problem =
                    result.possibleProblem ||
                    "Monitor this plant closely.";


                return `

                    <div class="alert-item">

                        <div class="item-main">

                            <div>

                                <div class="item-title">
                                    ⚠️ ${escapeHTML(
                                        plantName
                                    )}
                                </div>

                                <div class="item-sub">
                                    ${escapeHTML(
                                        problem
                                    )}
                                </div>

                            </div>

                            <div class="score-pill">
                                ${score}%
                            </div>

                        </div>

                    </div>

                `;
            }
        ).join("");
}


// ======================================================
// RECENT ANALYSES
// ======================================================

function renderRecentAnalyses(
    analyses
) {

    const recent =
        getElement("recent");


    if (!recent) {
        return;
    }


    const latest =
        analyses.slice(0, 5);


    if (!latest.length) {

        recent.innerHTML = `
            <div class="empty-dashboard">

                <div style="font-size:32px;">
                    🌱
                </div>

                <div style="margin-top:8px;">
                    No analyses yet.
                </div>

                <a
                    href="analysis.html"
                    class="btn"
                    style="display:inline-block;margin-top:12px;"
                >
                    Start AI Analysis
                </a>

            </div>
        `;

        return;
    }


    recent.innerHTML =
        latest.map(
            function (item) {

                const result =
                    item?.result || {};

                const score =
                    getHealthScore(item);

                const plantName =
                    result.plantName ||
                    "Unknown Plant";

                const date =
                    formatDate(
                        item.createdAt
                    );


                return `

                    <div class="recent-item">

                        <div class="item-main">

                            <div>

                                <div class="item-title">
                                    🌿 ${escapeHTML(
                                        plantName
                                    )}
                                </div>

                                <div class="item-sub">
                                    ${escapeHTML(date)}
                                </div>

                            </div>

                            <div class="score-pill">
                                ${score}%
                            </div>

                        </div>

                    </div>

                `;
            }
        ).join("");
}


// ======================================================
// INVENTORY
// ======================================================

function renderInventory(
    inventory
) {

    const inventoryElement =
        getElement("inv");


    if (!inventoryElement) {
        return;
    }


    const totalPlants =
        inventory.reduce(
            function (
                sum,
                item
            ) {

                return (
                    sum +
                    (
                        Number(
                            item.quantity
                        ) || 0
                    )
                );
            },
            0
        );


    if (!inventory.length) {

        inventoryElement.innerHTML = `

            <div class="empty-dashboard">

                <div style="font-size:32px;">
                    🪴
                </div>

                <div style="margin-top:8px;">
                    No inventory records yet.
                </div>

                <a
                    href="inventory.html"
                    class="btn"
                    style="display:inline-block;margin-top:12px;"
                >
                    Add Inventory
                </a>

            </div>

        `;

        return;
    }


    const preview =
        inventory.slice(0, 5);


    inventoryElement.innerHTML = `

        <div style="
            display:grid;
            grid-template-columns:
                repeat(auto-fit,minmax(160px,1fr));
            gap:12px;
            margin-bottom:18px;
        ">

            <div
                style="
                    padding:15px;
                    border:1px solid #edf1ed;
                    border-radius:12px;
                "
            >

                <div class="muted">
                    Inventory Records
                </div>

                <strong
                    style="
                        display:block;
                        font-size:24px;
                        margin-top:5px;
                    "
                >
                    ${inventory.length}
                </strong>

            </div>


            <div
                style="
                    padding:15px;
                    border:1px solid #edf1ed;
                    border-radius:12px;
                "
            >

                <div class="muted">
                    Total Plants
                </div>

                <strong
                    style="
                        display:block;
                        font-size:24px;
                        margin-top:5px;
                    "
                >
                    ${totalPlants}
                </strong>

            </div>

        </div>


        ${preview.map(
            function (item) {

                return `

                    <div class="inventory-item">

                        <div class="item-main">

                            <div>

                                <div class="item-title">
                                    🪴 ${escapeHTML(
                                        item.plantName ||
                                        "Plant"
                                    )}
                                </div>

                                <div class="item-sub">
                                    ${
                                        item.section
                                            ? escapeHTML(
                                                item.section
                                            )
                                            : "Nursery"
                                    }
                                </div>

                            </div>

                            <strong>
                                ${Number(
                                    item.quantity
                                ) || 0}
                            </strong>

                        </div>

                    </div>

                `;
            }
        ).join("")}


        <div style="margin-top:18px;">

            <a
                href="inventory.html"
                class="btn"
                style="display:inline-block;"
            >
                Manage Inventory
            </a>

        </div>

    `;
}


// ======================================================
// LOADING STATES
// ======================================================

function setLoadingStates() {

    const ids = [
        "alertList",
        "recent",
        "inv"
    ];


    ids.forEach(
        function (id) {

            const element =
                getElement(id);

            if (element) {

                element.innerHTML =
                    `
                        <div class="empty-dashboard">
                            Loading...
                        </div>
                    `;
            }
        }
    );
}


// ======================================================
// ERROR STATE
// ======================================================

function showDashboardError(
    message
) {

    const desc =
        getElement("desc");


    if (desc) {

        desc.textContent =
            message ||
            "Unable to load dashboard data.";
    }


    const alertList =
        getElement("alertList");


    if (alertList) {

        alertList.innerHTML = `
            <div class="empty-dashboard">

                ⚠️

                <br><br>

                Unable to load dashboard data.

                <br><br>

                <button
                    class="btn"
                    onclick="loadDashboard()"
                >
                    Try Again
                </button>

            </div>
        `;
    }
}


// ======================================================
// DATE FORMAT
// ======================================================

function formatDate(
    value
) {

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


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    ).replace(
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
// START DASHBOARD
// ======================================================

loadDashboard();