const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;
const JWT_SECRET =
    process.env.JWT_SECRET || "nurserycare-change-this-secret";

const DB_FILE = path.join(__dirname, "data.json");

app.use(cors());
app.use(express.json({ limit: "12mb" }));

// ======================================================
// DATABASE
// ======================================================

function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialDB = {
            users: [],
            analyses: [],
            inventory: []
        };

        fs.writeFileSync(
            DB_FILE,
            JSON.stringify(initialDB, null, 2)
        );

        return initialDB;
    }

    try {
        return JSON.parse(
            fs.readFileSync(DB_FILE, "utf8")
        );
    } catch (error) {
        console.error("Database read error:", error);

        return {
            users: [],
            analyses: [],
            inventory: []
        };
    }
}

function saveDB(db) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(db, null, 2)
    );
}

// ======================================================
// PASSWORD
// ======================================================

function hashPassword(password, salt) {
    salt =
        salt ||
        crypto.randomBytes(16).toString("hex");

    const hash = crypto
        .scryptSync(password, salt, 64)
        .toString("hex");

    return {
        salt,
        hash
    };
}

function verifyPassword(password, salt, hash) {
    try {
        const candidate = crypto
            .scryptSync(password, salt, 64)
            .toString("hex");

        return crypto.timingSafeEqual(
            Buffer.from(candidate, "hex"),
            Buffer.from(hash, "hex")
        );
    } catch (error) {
        return false;
    }
}

// ======================================================
// AUTH MIDDLEWARE
// ======================================================

function auth(req, res, next) {
    const header =
        req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Login required."
        });
    }

    const token =
        header.substring(7).trim();

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Login required."
        });
    }

    try {
        req.user =
            jwt.verify(
                token,
                JWT_SECRET
            );

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message:
                "Session expired. Please login again."
        });
    }
}

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message:
            "🌿 NurseryCare AI Backend is running!"
    });
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message:
            "NurseryCare AI backend is healthy.",
        time:
            new Date().toISOString()
    });
});

// ======================================================
// REGISTER
// ======================================================

app.post("/api/auth/register", (req, res) => {
    try {
        const {
            name,
            email,
            password
        } = req.body || {};

        const cleanName =
            String(name || "").trim();

        const normalizedEmail =
            String(email || "")
                .trim()
                .toLowerCase();

        if (
            !cleanName ||
            !normalizedEmail ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, email and password are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 6 characters."
            });
        }

        const db = loadDB();

        const exists =
            db.users.some(
                user =>
                    user.email ===
                    normalizedEmail
            );

        if (exists) {
            return res.status(409).json({
                success: false,
                message:
                    "Email already registered."
            });
        }

        const passwordData =
            hashPassword(password);

        const user = {
            id: crypto.randomUUID(),
            name: cleanName,
            email: normalizedEmail,
            salt: passwordData.salt,
            hash: passwordData.hash,
            createdAt:
                new Date().toISOString()
        };

        db.users.push(user);

        saveDB(db);

        const token =
            jwt.sign(
                {
                    id: user.id,
                    name: user.name,
                    email: user.email
                },
                JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error(
            "Register Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Registration failed."
        });
    }
});

// ======================================================
// LOGIN
// ======================================================

app.post("/api/auth/login", (req, res) => {
    try {
        const {
            email,
            password
        } = req.body || {};

        const normalizedEmail =
            String(email || "")
                .trim()
                .toLowerCase();

        const db = loadDB();

        const user =
            db.users.find(
                item =>
                    item.email ===
                    normalizedEmail
            );

        if (
            !user ||
            !verifyPassword(
                String(password || ""),
                user.salt,
                user.hash
            )
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Incorrect email or password."
            });
        }

        const token =
            jwt.sign(
                {
                    id: user.id,
                    name: user.name,
                    email: user.email
                },
                JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error(
            "Login Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Login failed."
        });
    }
});

// ======================================================
// CURRENT USER
// ======================================================

app.get(
    "/api/me",
    auth,
    (req, res) => {
        res.json({
            success: true,
            user: req.user
        });
    }
);

// ======================================================
// AI PLANT ANALYSIS
// ======================================================

app.post(
    "/api/analyze",
    auth,
    async (req, res) => {
        try {
            const {
                image
            } = req.body || {};

            if (!image) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Plant image is required."
                });
            }

            if (
                typeof image !== "string" ||
                !image.startsWith("data:image/")
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please provide a valid plant image."
                });
            }

            if (
                !process.env.OPENAI_API_KEY
            ) {
                return res.status(500).json({
                    success: false,
                    message:
                        "OPENAI_API_KEY is not configured."
                });
            }

            const client =
                new OpenAI({
                    apiKey:
                        process.env.OPENAI_API_KEY
                });

            const response =
                await client.responses.create({
                    model:
                        process.env.OPENAI_MODEL ||
                        "gpt-5.6-luna",

                    input: [
                        {
                            role: "user",

                            content: [
                                {
                                    type:
                                        "input_text",

                                    text: `
You are NurseryCare AI, an agricultural nursery assistant.

Analyze the uploaded plant/crop image carefully.

Return ONLY valid JSON.
Do not use markdown.
Do not add any explanation outside JSON.

Use exactly these fields:

plantName
plantType
overallCondition
healthScore
healthStatus
possibleProblem
problemConfidence
waterRequirement
sunlightRequirement
temperatureRequirement
soilRequirement
nutrientRequirement
growthStage
observation
recommendedCare

Rules:

1. healthScore must be an integer from 0 to 100.
2. Do not claim 100% certainty.
3. Disease/problem identification is only a visual assessment.
4. Never describe a disease as laboratory-confirmed.
5. If the image quality is poor or the plant cannot be identified reliably, use "Unable to determine".
6. Give practical and safe nursery-care recommendations.
7. recommendedCare must be an array of short actionable recommendations.
8. Do not invent exact measurements when they cannot reasonably be determined from the image.
9. Mention uncertainty when visual evidence is insufficient.
10. Keep the response concise and useful for a farmer or nursery worker.
`
                                },

                                {
                                    type:
                                        "input_image",

                                    image_url:
                                        image
                                }
                            ]
                        }
                    ]
                });

            let raw =
                response.output_text || "";

            raw =
                raw
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();

            if (!raw) {
                throw new Error(
                    "AI returned an empty result."
                );
            }

            let result;

            try {
                result =
                    JSON.parse(raw);
            } catch (error) {
                const start =
                    raw.indexOf("{");

                const end =
                    raw.lastIndexOf("}");

                if (
                    start !== -1 &&
                    end !== -1 &&
                    end > start
                ) {
                    result =
                        JSON.parse(
                            raw.substring(
                                start,
                                end + 1
                            )
                        );
                } else {
                    throw new Error(
                        "AI returned unreadable result."
                    );
                }
            }

            // ==================================================
            // NORMALIZE AI RESULT
            // ==================================================

            let healthScore =
                Number(
                    result.healthScore
                );

            if (
                !Number.isFinite(
                    healthScore
                )
            ) {
                healthScore = 0;
            }

            healthScore =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Math.round(
                            healthScore
                        )
                    )
                );

            let recommendedCare =
                result.recommendedCare;

            if (
                !Array.isArray(
                    recommendedCare
                )
            ) {
                recommendedCare =
                    recommendedCare
                        ? [
                            String(
                                recommendedCare
                            )
                        ]
                        : [];
            }

            result = {
                plantName:
                    result.plantName ||
                    "Unable to determine",

                plantType:
                    result.plantType ||
                    "Unable to determine",

                overallCondition:
                    result.overallCondition ||
                    "Unable to determine",

                healthScore,

                healthStatus:
                    result.healthStatus ||
                    (
                        healthScore >= 80
                            ? "Healthy"
                            : healthScore >= 50
                                ? "Needs Attention"
                                : "Poor"
                    ),

                possibleProblem:
                    result.possibleProblem ||
                    "No clear problem detected",

                problemConfidence:
                    result.problemConfidence ||
                    "Low",

                waterRequirement:
                    result.waterRequirement ||
                    "Unable to determine",

                sunlightRequirement:
                    result.sunlightRequirement ||
                    "Unable to determine",

                temperatureRequirement:
                    result.temperatureRequirement ||
                    "Unable to determine",

                soilRequirement:
                    result.soilRequirement ||
                    "Unable to determine",

                nutrientRequirement:
                    result.nutrientRequirement ||
                    "Unable to determine",

                growthStage:
                    result.growthStage ||
                    "Unable to determine",

                observation:
                    result.observation ||
                    "No detailed observation available.",

                recommendedCare
            };

            // ==================================================
            // SAVE ANALYSIS
            // ==================================================

            const db =
                loadDB();

            const analysis = {
                id:
                    crypto.randomUUID(),

                userId:
                    req.user.id,

                createdAt:
                    new Date().toISOString(),

                result
            };

            db.analyses.push(
                analysis
            );

            saveDB(db);

            return res.json({
                success: true,
                analysisId:
                    analysis.id,
                result
            });
        } catch (error) {
            console.error(
                "AI Analysis Error:",
                error
            );

            let message =
                "AI analysis failed.";

            if (
                error &&
                error.message
            ) {
                message =
                    error.message;
            }

            return res.status(500).json({
                success: false,
                message
            });
        }
    }
);

// ======================================================
// GET ANALYSIS HISTORY
// ======================================================

app.get(
    "/api/analyses",
    auth,
    (req, res) => {
        try {
            const db =
                loadDB();

            const analyses =
                db.analyses
                    .filter(
                        item =>
                            item.userId ===
                            req.user.id
                    )
                    .sort(
                        (a, b) =>
                            new Date(
                                b.createdAt
                            ) -
                            new Date(
                                a.createdAt
                            )
                    );

            return res.json({
                success: true,
                analyses
            });
        } catch (error) {
            console.error(
                "History Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load analysis history."
            });
        }
    }
);

// ======================================================
// INVENTORY - ADD
// ======================================================

app.post(
    "/api/inventory",
    auth,
    (req, res) => {
        try {
            const {
                plantName,
                quantity,
                section,
                dateAdded,
                notes
            } = req.body || {};

            const cleanPlantName =
                String(
                    plantName || ""
                ).trim();

            if (!cleanPlantName) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Plant name is required."
                });
            }

            const numericQuantity =
                Number(quantity);

            const item = {
                id:
                    crypto.randomUUID(),

                userId:
                    req.user.id,

                plantName:
                    cleanPlantName,

                quantity:
                    Number.isFinite(
                        numericQuantity
                    )
                        ? Math.max(
                            0,
                            numericQuantity
                        )
                        : 0,

                section:
                    String(
                        section ||
                        "Main Nursery"
                    ).trim(),

                dateAdded:
                    dateAdded ||
                    new Date()
                        .toISOString()
                        .slice(
                            0,
                            10
                        ),

                notes:
                    String(
                        notes || ""
                    ).trim(),

                createdAt:
                    new Date().toISOString()
            };

            const db =
                loadDB();

            db.inventory.push(
                item
            );

            saveDB(db);

            return res.json({
                success: true,
                item
            });
        } catch (error) {
            console.error(
                "Inventory Add Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to add inventory item."
            });
        }
    }
);

// ======================================================
// INVENTORY - GET
// ======================================================

app.get(
    "/api/inventory",
    auth,
    (req, res) => {
        try {
            const db =
                loadDB();

            const inventory =
                db.inventory
                    .filter(
                        item =>
                            item.userId ===
                            req.user.id
                    )
                    .sort(
                        (a, b) =>
                            new Date(
                                b.createdAt || 0
                            ) -
                            new Date(
                                a.createdAt || 0
                            )
                    );

            return res.json({
                success: true,
                inventory
            });
        } catch (error) {
            console.error(
                "Inventory Get Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load inventory."
            });
        }
    }
);

// ======================================================
// INVENTORY - UPDATE
// ======================================================

app.put(
    "/api/inventory/:id",
    auth,
    (req, res) => {
        try {
            const db =
                loadDB();

            const item =
                db.inventory.find(
                    entry =>
                        entry.id ===
                            req.params.id &&
                        entry.userId ===
                            req.user.id
                );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Inventory item not found."
                });
            }

            if (
                req.body.plantName !==
                undefined
            ) {
                const cleanName =
                    String(
                        req.body.plantName
                    ).trim();

                if (cleanName) {
                    item.plantName =
                        cleanName;
                }
            }

            if (
                req.body.quantity !==
                undefined
            ) {
                const quantity =
                    Number(
                        req.body.quantity
                    );

                if (
                    Number.isFinite(
                        quantity
                    )
                ) {
                    item.quantity =
                        Math.max(
                            0,
                            quantity
                        );
                }
            }

            if (
                req.body.section !==
                undefined
            ) {
                item.section =
                    String(
                        req.body.section
                    ).trim() ||
                    item.section;
            }

            if (
                req.body.dateAdded !==
                undefined
            ) {
                item.dateAdded =
                    req.body.dateAdded ||
                    item.dateAdded;
            }

            if (
                req.body.notes !==
                undefined
            ) {
                item.notes =
                    String(
                        req.body.notes
                    ).trim();
            }

            item.updatedAt =
                new Date().toISOString();

            saveDB(db);

            return res.json({
                success: true,
                item
            });
        } catch (error) {
            console.error(
                "Inventory Update Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to update inventory item."
            });
        }
    }
);

// ======================================================
// INVENTORY - DELETE
// ======================================================

app.delete(
    "/api/inventory/:id",
    auth,
    (req, res) => {
        try {
            const db =
                loadDB();

            const oldLength =
                db.inventory.length;

            db.inventory =
                db.inventory.filter(
                    item =>
                        !(
                            item.id ===
                                req.params.id &&
                            item.userId ===
                                req.user.id
                        )
                );

            const deleted =
                db.inventory.length <
                oldLength;

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Inventory item not found."
                });
            }

            saveDB(db);

            return res.json({
                success: true,
                deleted: true
            });
        } catch (error) {
            console.error(
                "Inventory Delete Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to delete inventory item."
            });
        }
    }
);

// ======================================================
// 404 API HANDLER
// ======================================================

app.use(
    "/api",
    (req, res) => {
        res.status(404).json({
            success: false,
            message:
                "API endpoint not found."
        });
    }
);

// ======================================================
// GENERAL ERROR HANDLER
// ======================================================

app.use(
    (error, req, res, next) => {
        console.error(
            "Server Error:",
            error
        );

        if (
            error instanceof
            SyntaxError
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid JSON request."
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Internal server error."
        });
    }
);

// ======================================================
// SERVER
// ======================================================

app.listen(
    PORT,
    () => {
        console.log(
            `🌿 NurseryCare AI running at http://localhost:${PORT}`
        );
    }
);