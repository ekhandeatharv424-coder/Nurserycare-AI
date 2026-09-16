const API = "http://localhost:5000/api";

// ======================================================
// LOGIN CHECK
// ======================================================

const token = localStorage.getItem("nurserycare_token");

if (!token) {
    window.location.href = "login.html";
}

// ======================================================
// SAFE HTML
// ======================================================

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/[&<>"']/g, function (char) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[char];
        });
}

// ======================================================
// NUMBER HELPER
// ======================================================

function getScore(item) {
    const result = item?.result || {};

    const score = Number(result.healthScore);

    if (Number.isNaN(score)) {
        return 0;
    }

    return Math.max(0, Math.min(100, score));
}

// ======================================================
// UPDATE ELEMENT
// ======================================================

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

// ======================================================
// UPDATE BAR
// ======================================================

function setBar(id, percentage) {
    const element = document.getElementById(id);

    if (element) {
        element.style.width =
            Math.max(0, Math.min(100, percentage)) + "%";
    }
}

// ======================================================
// LOAD ANALYTICS
// ======================================================

async function loadAnalytics() {

    const trend = document.getElementById("trend");

    try {

        if (trend) {
            trend.textContent = "Loading analytics...";
        }

        const response = await fetch(
            API + "/analyses",
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                }
            }
        );

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        // ==================================================
        // AUTH ERROR
        // ==================================================

        if (response.status === 401) {

            localStorage.removeItem(
                "nurserycare_token"
            );

            localStorage.removeItem(
                "nurserycare_user"
            );

            localStorage.removeItem(
                "nurserycare_current_user"
            );

            window.location.href =
                "login.html";

            return;
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to load analytics."
            );
        }

        // ==================================================
        // ANALYSIS DATA
        // ==================================================

        const analyses =
            Array.isArray(data.analyses)
                ? data.analyses
                : [];

        // Newest first
        analyses.sort(function (a, b) {

            return (
                new Date(b.createdAt || 0) -
                new Date(a.createdAt || 0)
            );

        });

        // ==================================================
        // SCORES
        // ==================================================

        const scores =
            analyses.map(getScore);

        const total =
            scores.length;

        const healthy =
            scores.filter(function (score) {
                return score >= 80;
            }).length;

        const attention =
            scores.filter(function (score) {
                return score >= 50 && score < 80;
            }).length;

        const poor =
            scores.filter(function (score) {
                return score < 50;
            }).length;

        // ==================================================
        // AVERAGE / BEST
        // ==================================================

        let average = 0;
        let best = 0;

        if (total > 0) {

            const sum =
                scores.reduce(
                    function (totalScore, score) {
                        return totalScore + score;
                    },
                    0
                );

            average =
                Math.round(sum / total);

            best =
                Math.max.apply(null, scores);
        }

        // ==================================================
        // PERCENTAGE
        // ==================================================

        function percentage(value) {

            if (total === 0) {
                return 0;
            }

            return Math.round(
                (value / total) * 100
            );
        }

        const healthyPercentage =
            percentage(healthy);

        const attentionPercentage =
            percentage(attention);

        const poorPercentage =
            percentage(poor);

        const problemPercentage =
            percentage(attention + poor);

        // ==================================================
        // TOP STATISTICS
        // ==================================================

        setText(
            "averageHealth",
            average + "%"
        );

        setText(
            "bestScore",
            best + "%"
        );

        setText(
            "problemRate",
            problemPercentage + "%"
        );

        // ==================================================
        // HEALTH DISTRIBUTION BARS
        // ==================================================

        setBar(
            "healthyBar",
            healthyPercentage
        );

        setBar(
            "attentionBar",
            attentionPercentage
        );

        setBar(
            "poorBar",
            poorPercentage
        );

        // Optional percentage labels
        setText(
            "healthyPercent",
            healthyPercentage + "%"
        );

        setText(
            "attentionPercent",
            attentionPercentage + "%"
        );

        setText(
            "poorPercent",
            poorPercentage + "%"
        );

        // ==================================================
        // NO DATA
        // ==================================================

        if (total === 0) {

            if (trend) {

                trend.innerHTML = `
                    <div>
                        <strong>No analysis data yet.</strong>
                        <br>
                        Upload a plant image to start
                        building your analytics.
                    </div>
                `;
            }

            return;
        }

        // ==================================================
        // RECENT HEALTH TREND
        // ==================================================

        const recent =
            analyses.slice(0, 10);

        if (trend) {

            trend.innerHTML =
                recent.map(
                    function (item, index) {

                        const result =
                            item.result || {};

                        const plantName =
                            escapeHTML(
                                result.plantName ||
                                "Unknown Plant"
                            );

                        const score =
                            getScore(item);

                        let dateText =
                            "Date unavailable";

                        if (item.createdAt) {

                            const date =
                                new Date(
                                    item.createdAt
                                );

                            if (
                                !Number.isNaN(
                                    date.getTime()
                                )
                            ) {

                                dateText =
                                    date.toLocaleDateString(
                                        "en-IN",
                                        {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric"
                                        }
                                    );
                            }
                        }

                        let status =
                            "Poor";

                        if (score >= 80) {
                            status = "Healthy";
                        } else if (score >= 50) {
                            status = "Attention";
                        }

                        return `
                            <div style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                gap:15px;
                                padding:12px 0;
                                border-bottom:1px solid #e5e7eb;
                            ">

                                <div style="
                                    text-align:left;
                                ">

                                    <strong>
                                        ${index + 1}.
                                        ${plantName}
                                    </strong>

                                    <div style="
                                        font-size:12px;
                                        color:#6b7280;
                                        margin-top:4px;
                                    ">
                                        ${dateText}
                                    </div>

                                </div>

                                <div style="
                                    text-align:right;
                                    white-space:nowrap;
                                ">

                                    <strong>
                                        ${score}%
                                    </strong>

                                    <div style="
                                        font-size:12px;
                                        color:#6b7280;
                                        margin-top:4px;
                                    ">
                                        ${status}
                                    </div>

                                </div>

                            </div>
                        `;
                    }
                ).join("");
        }

    } catch (error) {

        console.error(
            "Analytics Error:",
            error
        );

        if (trend) {

            trend.innerHTML = `
                <div style="color:#c62828;">
                    Unable to load analytics.
                    <br>
                    <small>
                        ${escapeHTML(
                            error.message ||
                            "Please try again."
                        )}
                    </small>
                </div>
            `;
        }
    }
}

// ======================================================
// START
// ======================================================

loadAnalytics();