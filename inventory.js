const API = "http://localhost:5000/api";

let inventory = [];

// ======================================================
// AUTH
// ======================================================

const token = localStorage.getItem("nurserycare_token");

if (!token) {
    window.location.href = "login.html";
}

// ======================================================
// ELEMENTS
// ======================================================

const inventoryForm =
    document.getElementById("inventoryForm");

const inventoryTable =
    document.getElementById("inventoryTable");

const messageBox =
    document.getElementById("message");

// ======================================================
// API REQUEST
// ======================================================

async function apiRequest(url, options = {}) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        "Authorization": "Bearer " + token
    };

    const response = await fetch(
        API + url,
        {
            ...options,
            headers
        }
    );

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    // Session expired
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

        window.location.href = "login.html";

        throw new Error(
            "Session expired. Please login again."
        );
    }

    if (!response.ok) {

        throw new Error(
            data.message ||
            "Unable to complete the request."
        );
    }

    return data;
}

// ======================================================
// LOAD INVENTORY
// ======================================================

async function loadInventory() {

    if (!inventoryTable) {
        return;
    }

    inventoryTable.innerHTML = `
        <div class="empty">
            <div style="font-size:32px;margin-bottom:10px;">
                ⏳
            </div>

            <strong>
                Loading inventory...
            </strong>

            <p>
                Please wait while your nursery records are loaded.
            </p>
        </div>
    `;

    try {

        const data =
            await apiRequest(
                "/inventory"
            );

        inventory =
            Array.isArray(data.inventory)
                ? data.inventory
                : [];

        renderInventory();

    } catch (error) {

        console.error(
            "Inventory Load Error:",
            error
        );

        inventoryTable.innerHTML = `
            <div class="empty">

                <div style="font-size:38px;margin-bottom:10px;">
                    ⚠️
                </div>

                <h3 style="margin:0 0 8px;">
                    Unable to Load Inventory
                </h3>

                <p style="margin:0 0 18px;">
                    ${escapeHTML(error.message)}
                </p>

                <button
                    type="button"
                    class="btn"
                    onclick="loadInventory()">
                    Try Again
                </button>

            </div>
        `;
    }
}

// ======================================================
// ADD INVENTORY
// ======================================================

if (inventoryForm) {

    inventoryForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const plantNameInput =
                document.getElementById(
                    "plantName"
                );

            const quantityInput =
                document.getElementById(
                    "quantity"
                );

            const sectionInput =
                document.getElementById(
                    "section"
                );

            const dateInput =
                document.getElementById(
                    "dateAdded"
                );

            const notesInput =
                document.getElementById(
                    "notes"
                );

            const submitButton =
                inventoryForm.querySelector(
                    'button[type="submit"]'
                );

            const plantName =
                plantNameInput
                    ? plantNameInput.value.trim()
                    : "";

            const quantity =
                quantityInput
                    ? quantityInput.value.trim()
                    : "";

            const section =
                sectionInput
                    ? sectionInput.value.trim()
                    : "";

            const dateAdded =
                dateInput
                    ? dateInput.value
                    : getTodayDate();

            const notes =
                notesInput
                    ? notesInput.value.trim()
                    : "";

            // ==================================================
            // VALIDATION
            // ==================================================

            if (!plantName) {

                showMessage(
                    "Please enter plant name.",
                    "error"
                );

                if (plantNameInput) {
                    plantNameInput.focus();
                }

                return;
            }

            if (
                quantity === "" ||
                Number(quantity) < 0
            ) {

                showMessage(
                    "Please enter a valid quantity.",
                    "error"
                );

                if (quantityInput) {
                    quantityInput.focus();
                }

                return;
            }

            if (!section) {

                showMessage(
                    "Please enter nursery section.",
                    "error"
                );

                if (sectionInput) {
                    sectionInput.focus();
                }

                return;
            }

            // ==================================================
            // SUBMIT
            // ==================================================

            try {

                if (submitButton) {

                    submitButton.disabled = true;

                    submitButton.dataset.originalText =
                        submitButton.textContent;

                    submitButton.textContent =
                        "Adding Plant...";
                }

                showMessage(
                    "Adding plant to inventory...",
                    "info"
                );

                await apiRequest(
                    "/inventory",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            plantName,
                            quantity:
                                Number(quantity),
                            section,
                            dateAdded,
                            notes
                        })
                    }
                );

                showMessage(
                    "Plant added successfully.",
                    "success"
                );

                inventoryForm.reset();

                // Restore defaults

                if (sectionInput) {
                    sectionInput.value =
                        "Main Nursery";
                }

                if (dateInput) {
                    dateInput.value =
                        getTodayDate();
                }

                await loadInventory();

            } catch (error) {

                console.error(
                    "Inventory Add Error:",
                    error
                );

                showMessage(
                    error.message,
                    "error"
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        submitButton.dataset.originalText ||
                        "Add Plant";
                }
            }
        }
    );
}

// ======================================================
// DELETE INVENTORY
// ======================================================

async function deleteItem(id) {

    if (!id) {
        return;
    }

    const confirmed =
        window.confirm(
            "Are you sure you want to delete this inventory item?"
        );

    if (!confirmed) {
        return;
    }

    try {

        showMessage(
            "Deleting inventory item...",
            "info"
        );

        await apiRequest(
            "/inventory/" +
            encodeURIComponent(id),
            {
                method: "DELETE"
            }
        );

        showMessage(
            "Inventory item deleted successfully.",
            "success"
        );

        await loadInventory();

    } catch (error) {

        console.error(
            "Inventory Delete Error:",
            error
        );

        showMessage(
            error.message,
            "error"
        );
    }
}

// ======================================================
// RENDER INVENTORY
// ======================================================

function renderInventory() {

    if (!inventoryTable) {
        return;
    }

    if (!inventory.length) {

        inventoryTable.innerHTML = `
            <div class="empty">

                <div style="
                    font-size:48px;
                    margin-bottom:12px;
                ">
                    🌱
                </div>

                <h3 style="
                    margin:0 0 8px;
                ">
                    No Inventory Records
                </h3>

                <p style="
                    margin:0;
                    color:#718078;
                ">
                    Add your first plant to start
                    managing your nursery inventory.
                </p>

            </div>
        `;

        return;
    }

    inventoryTable.innerHTML = `
        <div style="overflow-x:auto;">

            <table class="table">

                <thead>
                    <tr>
                        <th>Plant</th>
                        <th>Quantity</th>
                        <th>Section</th>
                        <th>Date Added</th>
                        <th>Notes</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>

                    ${inventory.map(function (item) {

                        const id =
                            item.id ||
                            item._id ||
                            "";

                        const plantName =
                            item.plantName ||
                            "Unknown Plant";

                        const quantity =
                            item.quantity ??
                            0;

                        const section =
                            item.section ||
                            "Main Nursery";

                        const notes =
                            item.notes ||
                            "";

                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHTML(
                                            plantName
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    <span style="
                                        display:inline-flex;
                                        align-items:center;
                                        justify-content:center;
                                        min-width:42px;
                                        padding:5px 10px;
                                        border-radius:20px;
                                        background:#eef8f1;
                                        color:#176b45;
                                        font-weight:700;
                                    ">
                                        ${escapeHTML(
                                            quantity
                                        )}
                                    </span>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        section
                                    )}
                                </td>

                                <td>
                                    ${formatDate(
                                        item.dateAdded
                                    )}
                                </td>

                                <td>
                                    ${
                                        notes
                                            ? escapeHTML(
                                                notes
                                            )
                                            : `
                                                <span style="
                                                    color:#89988f;
                                                ">
                                                    No notes
                                                </span>
                                            `
                                    }
                                </td>

                                <td>

                                    <button
                                        type="button"
                                        class="btn"
                                        onclick="deleteItem('${escapeAttribute(id)}')"
                                        style="
                                            background:#c0392b;
                                            padding:8px 13px;
                                            font-size:13px;
                                            border:none;
                                            cursor:pointer;
                                        ">
                                        Delete
                                    </button>

                                </td>

                            </tr>
                        `;

                    }).join("")}

                </tbody>

            </table>

        </div>
    `;
}

// ======================================================
// MESSAGE
// ======================================================

function showMessage(
    text,
    type = "info"
) {

    const message =
        document.getElementById(
            "message"
        );

    if (!message) {
        return;
    }

    message.textContent =
        text;

    message.style.display =
        "block";

    message.style.padding =
        "12px 15px";

    message.style.borderRadius =
        "10px";

    message.style.marginTop =
        "12px";

    message.style.fontSize =
        "14px";

    message.style.fontWeight =
        "600";

    if (type === "success") {

        message.style.color =
            "#167548";

        message.style.background =
            "#eef9f2";

        message.style.border =
            "1px solid #cdebd8";

    } else if (type === "error") {

        message.style.color =
            "#b42318";

        message.style.background =
            "#fff3f1";

        message.style.border =
            "1px solid #f3ccc7";

    } else {

        message.style.color =
            "#176b45";

        message.style.background =
            "#f2faf5";

        message.style.border =
            "1px solid #dceee3";
    }
}

// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    return String(
        value ?? ""
    ).replace(
        /[&<>"']/g,
        function (char) {

            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        }
    );
}

// ======================================================
// ESCAPE ATTRIBUTE
// ======================================================

function escapeAttribute(value) {

    return String(
        value ?? ""
    )
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}

// ======================================================
// FORMAT DATE
// ======================================================

function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return escapeHTML(
            value
        );
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
// TODAY DATE
// ======================================================

function getTodayDate() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );

    return (
        year +
        "-" +
        month +
        "-" +
        day
    );
}

// ======================================================
// DEFAULT DATE
// ======================================================

const dateAddedInput =
    document.getElementById(
        "dateAdded"
    );

if (
    dateAddedInput &&
    !dateAddedInput.value
) {
    dateAddedInput.value =
        getTodayDate();
}

// ======================================================
// START APPLICATION
// ======================================================

loadInventory();