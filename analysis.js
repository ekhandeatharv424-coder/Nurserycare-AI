const API = "https://nurserycare-ai-1.onrender.com/api";

let selectedFile = null;

// ======================================================
// LOGIN CHECK
// ======================================================

const token = localStorage.getItem("nurserycare_token");

if (!token) {
    window.location.href = "login.html";
}

// ======================================================
// ELEMENTS
// ======================================================

const imageInput = document.getElementById("plantImage");
const previewImage = document.getElementById("previewImage");
const analyzeButton = document.getElementById("analyzeBtn");
const statusBox = document.getElementById("status");

// ======================================================
// IMAGE SELECT
// ======================================================

if (imageInput) {

    imageInput.addEventListener("change", function () {

        const file = this.files && this.files[0];

        if (!file) {
            selectedFile = null;
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {

            alert(
                "Please upload a JPG, JPEG, PNG or WEBP image."
            );

            imageInput.value = "";
            selectedFile = null;

            if (previewImage) {
                previewImage.src = "";
                previewImage.style.display = "none";
            }

            return;
        }

        // Maximum 10 MB
        if (file.size > 10 * 1024 * 1024) {

            alert(
                "Image must be less than 10 MB."
            );

            imageInput.value = "";
            selectedFile = null;

            if (previewImage) {
                previewImage.src = "";
                previewImage.style.display = "none";
            }

            return;
        }

        selectedFile = file;

        const imageURL =
            URL.createObjectURL(file);

        if (previewImage) {

            previewImage.src = imageURL;
            previewImage.style.display = "block";

            previewImage.onload = function () {
                URL.revokeObjectURL(imageURL);
            };
        }

        if (statusBox) {
            statusBox.textContent =
                "✅ Image selected. Ready for AI analysis.";
        }
    });
}

// ======================================================
// FILE TO BASE64
// ======================================================

function imageToBase64(file) {

    return new Promise(function (resolve, reject) {

        const reader = new FileReader();

        reader.onload = function () {
            resolve(reader.result);
        };

        reader.onerror = function () {

            reject(
                new Error(
                    "Unable to read the selected image."
                )
            );
        };

        reader.readAsDataURL(file);
    });
}

// ======================================================
// ANALYZE PLANT
// ======================================================

if (analyzeButton) {

    analyzeButton.addEventListener(
        "click",
        async function () {

            if (!selectedFile) {

                alert(
                    "Please select a plant image first."
                );

                return;
            }

            const currentToken =
                localStorage.getItem(
                    "nurserycare_token"
                );

            if (!currentToken) {

                window.location.href =
                    "login.html";

                return;
            }

            // ------------------------------------------
            // BUTTON STATE
            // ------------------------------------------

            analyzeButton.disabled = true;

            analyzeButton.style.opacity = "0.6";
            analyzeButton.style.cursor = "not-allowed";

            if (statusBox) {

                statusBox.textContent =
                    "🌿 AI is analyzing the plant image...";
            }

            try {

                // --------------------------------------
                // CONVERT IMAGE
                // --------------------------------------

                const image =
                    await imageToBase64(
                        selectedFile
                    );

                // --------------------------------------
                // SEND TO BACKEND
                // --------------------------------------

                const response =
                    await fetch(
                        API + "/analyze",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    "Bearer " +
                                    currentToken
                            },

                            body: JSON.stringify({
                                image: image
                            })
                        }
                    );

                // --------------------------------------
                // READ RESPONSE SAFELY
                // --------------------------------------

                let data = {};

                try {

                    data =
                        await response.json();

                } catch (error) {

                    throw new Error(
                        "Invalid response from the server."
                    );
                }

                // --------------------------------------
                // TOKEN EXPIRED / INVALID
                // --------------------------------------

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

                    alert(
                        "Your session has expired. Please login again."
                    );

                    window.location.href =
                        "login.html";

                    return;
                }

                // --------------------------------------
                // API ERROR
                // --------------------------------------

                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "AI analysis failed. Please try again."
                    );
                }

                // --------------------------------------
                // VERIFY AI RESULT
                // --------------------------------------

                if (!data.result) {

                    throw new Error(
                        "AI did not return a valid analysis result."
                    );
                }

                // --------------------------------------
                // SAVE CURRENT ANALYSIS
                // --------------------------------------

                const currentAnalysis = {

                    image: image,

                    fileName:
                        selectedFile.name,

                    fileSize:
                        selectedFile.size,

                    fileType:
                        selectedFile.type,

                    analysisDate:
                        new Date().toISOString(),

                    aiResult:
                        typeof data.result === "string"
                            ? data.result
                            : JSON.stringify(
                                data.result
                            )
                };

                localStorage.setItem(
                    "nurserycare_current_analysis",
                    JSON.stringify(
                        currentAnalysis
                    )
                );

                // --------------------------------------
                // SUCCESS
                // --------------------------------------

                if (statusBox) {

                    statusBox.textContent =
                        "✅ Analysis complete. Opening result...";
                }

                window.location.href =
                    "result.html";

            } catch (error) {

                console.error(
                    "AI Analysis Error:",
                    error
                );

                if (statusBox) {

                    statusBox.textContent =
                        "❌ " +
                        (
                            error.message ||
                            "AI analysis failed."
                        );
                }

                // --------------------------------------
                // RESTORE BUTTON
                // --------------------------------------

                analyzeButton.disabled = false;

                analyzeButton.style.opacity = "1";
                analyzeButton.style.cursor = "pointer";
            }
        }
    );
}