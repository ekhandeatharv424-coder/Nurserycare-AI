document.addEventListener("DOMContentLoaded", function () {

    const STORAGE_KEY =
        "nurserycare_current_analysis";

    const HISTORY_KEY =
        "nurserycare_history";


    const savedData =
        localStorage.getItem(STORAGE_KEY);


    /* ================= CHECK DATA ================= */

    if (!savedData) {

        showNoResult();

        return;
    }


    let data;

    try {

        data = JSON.parse(savedData);

    } catch (error) {

        console.error(
            "Unable to read analysis data:",
            error
        );

        showNoResult();

        return;
    }


    let result =
        data.aiResult || {};


    /* ================= PARSE AI RESULT ================= */

    if (typeof result === "string") {

        try {

            result = JSON.parse(result);

        } catch (error) {

            console.error(
                "AI JSON parsing failed:",
                error
            );

            result = {};
        }
    }


    /* ================= HELPERS ================= */

    function getValue(value, fallback = "Not available") {

        if (
            value === undefined ||
            value === null ||
            String(value).trim() === ""
        ) {

            return fallback;
        }

        return String(value);
    }


    function cleanScore(value) {

        let score =
            Number(
                String(value)
                    .replace("%", "")
                    .trim()
            );


        if (!Number.isFinite(score)) {
            score = 0;
        }


        score =
            Math.round(
                Math.max(
                    0,
                    Math.min(
                        100,
                        score
                    )
                )
            );


        return score;
    }


    function formatDate(dateValue) {

        if (!dateValue) {
            return "Date unavailable";
        }


        const date =
            new Date(dateValue);


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


    /* ================= BASIC INFORMATION ================= */

    document.getElementById(
        "plantName"
    ).textContent =
        getValue(
            result.plantName,
            "Unknown Plant"
        );


    document.getElementById(
        "plantType"
    ).textContent =
        getValue(
            result.plantType
        );


    document.getElementById(
        "analysisDate"
    ).textContent =
        "Analyzed on " +
        formatDate(
            data.analysisDate
        );


    document.getElementById(
        "fileName"
    ).textContent =
        data.fileName
            ? "📎 " + data.fileName
            : "Plant image";


    /* ================= HEALTH SCORE ================= */

    const score =
        cleanScore(
            result.healthScore
        );


    document.getElementById(
        "healthScore"
    ).textContent =
        score;


    const progress =
        document.getElementById(
            "healthProgress"
        );


    progress.style.width =
        score + "%";


    const healthStatus =
        document.getElementById(
            "healthStatus"
        );


    let status =
        getValue(
            result.healthStatus,
            ""
        );


    if (!status) {

        if (score >= 80) {
            status = "Healthy";
        }

        else if (score >= 50) {
            status = "Attention Needed";
        }

        else {
            status = "Poor";
        }
    }


    healthStatus.textContent =
        status;


    healthStatus.className =
        "health-status " +
        getStatusClass(status);


    progress.className =
        "health-progress-fill " +
        getStatusClass(status);


    /* ================= CONDITION ================= */

    document.getElementById(
        "overallCondition"
    ).textContent =
        getValue(
            result.overallCondition
        );


    /* ================= CARE REQUIREMENTS ================= */

    document.getElementById(
        "waterRequirement"
    ).textContent =
        getValue(
            result.waterRequirement
        );


    document.getElementById(
        "sunlightRequirement"
    ).textContent =
        getValue(
            result.sunlightRequirement
        );


    document.getElementById(
        "temperatureRequirement"
    ).textContent =
        getValue(
            result.temperatureRequirement
        );


    document.getElementById(
        "soilRequirement"
    ).textContent =
        getValue(
            result.soilRequirement
        );


    document.getElementById(
        "nutrientRequirement"
    ).textContent =
        getValue(
            result.nutrientRequirement
        );


    document.getElementById(
        "growthStage"
    ).textContent =
        getValue(
            result.growthStage
        );


    /* ================= OBSERVATION ================= */

    document.getElementById(
        "observation"
    ).textContent =
        getValue(
            result.observation,
            "No additional observation available."
        );


    /* ================= PROBLEM ================= */

    document.getElementById(
        "possibleProblem"
    ).textContent =
        getValue(
            result.possibleProblem,
            "No major problem detected"
        );


    document.getElementById(
        "problemConfidence"
    ).textContent =
        getValue(
            result.problemConfidence,
            "Not available"
        );


    /* ================= PLANT IMAGE ================= */

    const plantPhoto =
        document.getElementById(
            "plantPhoto"
        );


    const placeholder =
        document.getElementById(
            "imagePlaceholder"
        );


    if (
        data.image &&
        data.image.startsWith("data:image")
    ) {

        plantPhoto.src =
            data.image;


        plantPhoto.classList.remove(
            "hidden"
        );


        placeholder.classList.add(
            "hidden"
        );

    }

    else {

        plantPhoto.classList.add(
            "hidden"
        );


        placeholder.classList.remove(
            "hidden"
        );

    }


    /* ================= RECOMMENDED CARE ================= */

    renderCare(
        result.recommendedCare
    );


    /* ================= SAVE HISTORY ================= */

    saveHistory(
        data,
        result,
        score,
        status
    );

});


/* =====================================================
   STATUS CLASS
===================================================== */

function getStatusClass(status) {

    const value =
        String(status)
            .toLowerCase();


    if (
        value.includes("healthy")
    ) {

        return "status-healthy";

    }


    if (
        value.includes("poor") ||
        value.includes("critical")
    ) {

        return "status-poor";

    }


    return "status-attention";
}


/* =====================================================
   RECOMMENDED CARE
===================================================== */

function renderCare(careData) {

    const container =
        document.getElementById(
            "recommendedCare"
        );


    container.innerHTML = "";


    let careItems = [];


    if (Array.isArray(careData)) {

        careItems =
            careData;

    }

    else if (
        typeof careData === "string" &&
        careData.trim()
    ) {

        careItems =
            careData
                .split(/\n|•/)
                .map(
                    item =>
                        item
                            .replace(
                                /^\s*[-*]\s*/,
                                ""
                            )
                            .trim()
                )
                .filter(
                    Boolean
                );

    }


    if (!careItems.length) {

        careItems = [
            "Monitor the plant regularly.",
            "Maintain suitable water and sunlight conditions.",
            "Remove visibly damaged plant parts when appropriate.",
            "Take another clear photo if the plant condition changes."
        ];

    }


    careItems.forEach(
        function (item, index) {

            const careItem =
                document.createElement(
                    "div"
                );


            careItem.className =
                "care-item";


            careItem.innerHTML = `

                <div class="care-number">
                    ${index + 1}
                </div>

                <div class="care-text">
                    ${escapeHTML(
                        String(item)
                    )}
                </div>

            `;


            container.appendChild(
                careItem
            );

        }
    );

}


/* =====================================================
   HISTORY
===================================================== */

async function saveHistory(
    data,
    result,
    score,
    status
) {

    const HISTORY_KEY =
        "nurserycare_history";


    let history = [];


    try {

        history =
            JSON.parse(
                localStorage.getItem(
                    HISTORY_KEY
                ) || "[]"
            );

    }

    catch {

        history = [];

    }


    /* Prevent duplicate save */

    const analysisDate =
        data.analysisDate ||
        new Date().toISOString();


    const duplicate =
        history.some(
            function (item) {

                return (
                    item.analysisDate ===
                    analysisDate
                );

            }
        );


    if (duplicate) {
        return;
    }


    /* Create thumbnail */

    const thumbnail =
        await createThumbnail(
            data.image
        );


    const historyItem = {

        id:
            Date.now().toString(),

        image:
            thumbnail,

        fileName:
            data.fileName ||
            "Plant Image",

        analysisDate:
            analysisDate,

        plantName:
            result.plantName ||
            "Unknown Plant",

        plantType:
            result.plantType ||
            "Unknown",

        healthScore:
            score,

        healthStatus:
            status,

        possibleProblem:
            result.possibleProblem ||
            "No major problem detected",

        problemConfidence:
            result.problemConfidence ||
            "Not available",

        aiResult:
            result

    };


    history.unshift(
        historyItem
    );


    /* Keep latest 50 */

    history =
        history.slice(
            0,
            50
        );


    try {

        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(
                history
            )
        );

    }

    catch (error) {

        console.warn(
            "History storage full. Saving without thumbnails.",
            error
        );


        const lightweightHistory =
            history.map(
                function (item) {

                    return {
                        ...item,
                        image: ""
                    };

                }
            );


        try {

            localStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(
                    lightweightHistory
                )
            );

        }

        catch (finalError) {

            console.error(
                "Unable to save history:",
                finalError
            );

        }

    }

}


/* =====================================================
   CREATE THUMBNAIL
===================================================== */

function createThumbnail(
    imageData
) {

    return new Promise(
        function (resolve) {

            if (
                !imageData ||
                !imageData.startsWith(
                    "data:image"
                )
            ) {

                resolve("");

                return;
            }


            const image =
                new Image();


            image.onload =
                function () {

                    const maxSize =
                        320;


                    const scale =
                        Math.min(
                            1,
                            maxSize /
                            Math.max(
                                image.width,
                                image.height
                            )
                        );


                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    canvas.width =
                        Math.max(
                            1,
                            Math.round(
                                image.width *
                                scale
                            )
                        );


                    canvas.height =
                        Math.max(
                            1,
                            Math.round(
                                image.height *
                                scale
                            )
                        );


                    const context =
                        canvas.getContext(
                            "2d"
                        );


                    context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );


                    resolve(
                        canvas.toDataURL(
                            "image/jpeg",
                            0.55
                        )
                    );

                };


            image.onerror =
                function () {

                    resolve("");

                };


            image.src =
                imageData;

        }
    );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(value) {

    return String(value)
        .replace(
            /[&<>"']/g,
            function (character) {

                const entities = {

                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"

                };


                return entities[
                    character
                ];

            }
        );

}


/* =====================================================
   NO RESULT
===================================================== */

function showNoResult() {

    const main =
        document.querySelector(
            ".result-page"
        );


    if (!main) {
        return;
    }


    main.innerHTML = `

        <section
            class="card"
            style="
                max-width:650px;
                margin:80px auto;
                text-align:center;
                padding:60px 30px;
            "
        >

            <div
                style="
                    font-size:70px;
                    margin-bottom:20px;
                "
            >
                🌱
            </div>

            <h1>
                No Analysis Found
            </h1>

            <p class="muted">
                Please upload a plant image
                and start a new AI analysis.
            </p>

            <a
                href="analysis.html"
                class="btn primary"
            >
                🔍 Start New Analysis
            </a>

        </section>

    `;

}