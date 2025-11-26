
/**
 * Fetch players from Supabase and populate the DB.
 * @param {Object} dbInstance - The global DB object from app.js
 * @param {Function} renderCallback - Optional callback to re-render the UI
 */
async function loadPlayersFromSupabase(dbInstance, renderCallback) {
    console.log("Loading players and skills from Supabase...");

    // 1. Fetch Players
    const { data: players, error: playerError } = await window.supabaseClient
        .from('players')
        .select('*');

    if (playerError) {
        console.error("Error loading players:", playerError);
        return;
    }

    // 2. Fetch Skills
    const { data: skills, error: skillError } = await window.supabaseClient
        .from('skill_library')
        .select('*');

    if (skillError) {
        console.error("Error loading skills:", skillError);
    } else {
        console.log(`Loaded ${skills ? skills.length : 0} skills.`);
    }

    // 3. Fetch Evaluations
    const { data: evaluations, error: evalError } = await window.supabaseClient
        .from('player_latest_evaluation')
        .select('*');

    if (evalError) {
        console.error("Error loading evaluations:", evalError);
    } else {
        console.log(`Loaded ${evaluations ? evaluations.length : 0} evaluations.`);
    }

    if (!players || players.length === 0) {
        console.log("No players found in Supabase.");
        return;
    }

    console.log(`Loaded ${players.length} players.`);

    // Store skills in DB for later use (e.g. promotion)
    dbInstance.skillLibrary = skills || [];

    // Clear existing players in the first session of each branch to avoid duplicates if called multiple times
    // Or just append? The requirement implies we are populating the DB. 
    // Since DB is in-memory and fresh on reload, we can just push.

    players.forEach(p => {
        // Map Supabase player to App player structure
        // Supabase columns: id, Name, age, level, Branch (Note capitalization)

        let branchId = null;
        const branchName = p.Branch ? p.Branch.trim() : "";

        // Map branch names from Supabase to App IDs
        if (branchName === "Ajman") {
            branchId = "Ajman_Academy";
        } else if (branchName === "Tilal" || branchName === "VISS" || branchName === "Sharjah") {
            branchId = "VISS";
        } else {
            console.warn(`Unknown branch '${branchName}' for player ${p.Name}. Defaulting to VISS.`);
            branchId = "VISS";
        }

        const targetBranch = dbInstance.branches.find(b => b.id === branchId);
        if (targetBranch && targetBranch.sessions.length > 0) {
            // Add to the FIRST session (index 0) which is "5-6"
            const targetSession = targetBranch.sessions[0];

            const pLevel = p.level || "Recreational";

            // Create player object matching app.js structure
            const newPlayer = {
                id: p.id || "sp_" + Math.random().toString(36).slice(2),
                name: p.Name || p.name || "Unknown", // Handle 'Name' from Supabase
                age: p.age || 0,
                levelCode: pLevel,
                sport: "Gymnastics",
                devices: [
                    { name: "Floor", skills: getSkillsForDevice("Floor", pLevel, skills, p.id, evaluations) },
                    { name: "Bars", skills: getSkillsForDevice("Bars", pLevel, skills, p.id, evaluations) },
                    { name: "Beam", skills: getSkillsForDevice("Beam", pLevel, skills, p.id, evaluations) },
                    { name: "Vault", skills: getSkillsForDevice("Vault", pLevel, skills, p.id, evaluations) },
                ],
                notes: "",
                // Store original Supabase data if needed
                supabaseId: p.id
            };

            targetSession.players.push(newPlayer);
        }
    });

    console.log("Players distributed to branches with skills.");

    if (renderCallback) {
        renderCallback();
    }
}

// Helper to filter skills
function getSkillsForDevice(deviceName, level, allSkills, playerId, allEvaluations) {
    if (!allSkills || !allSkills.length) {
        return createZeroSkills();
    }

    // Filter skills by apparatus and level
    // We try to match case-insensitive and multiple property names
    const filtered = allSkills.filter(s => {
        // Check for 'apparatus', 'Apparatus', 'device', 'Device'
        const sApp = (s.apparatus || s.Apparatus || s.device || s.Device || "").toLowerCase();
        // Check for 'level', 'Level'
        const sLevel = (s.level || s.Level || "").toString().toLowerCase();

        const targetApp = deviceName.toLowerCase();
        const targetLevel = level.toString().toLowerCase();

        // Loose matching for level (e.g. "1" vs 1, or "Bronze" vs "bronze")
        // Also handle if level is "Recreational"
        return sApp === targetApp && sLevel === targetLevel;
    });

    if (filtered.length === 0) {
        return createZeroSkills();
    }

    return filtered.map(s => {
        const skillName = s.name || s.Name || s.Skill || "Unknown Skill";

        // Find saved rating
        let savedRating = 0;
        if (allEvaluations && playerId) {
            const evalRecord = allEvaluations.find(e =>
                e.player_id === playerId &&
                e.skill_name === skillName
            );
            if (evalRecord) {
                savedRating = evalRecord.rating || 0;
            }
        }

        return {
            name: skillName,
            rating: savedRating,
            inPath: false,
            videoUrl: s.video_url || s.VideoUrl || "",
        };
    });
}

// Helper to create empty skills (fallback)
function createZeroSkills() {
    return ["Skill A", "Skill B", "Skill C"].map((nm) => ({
        name: nm,
        rating: 0,
        inPath: false,
        videoUrl: "",
    }));
}

// Save evaluation to Supabase
async function saveEvaluation(playerId, skillName, rating) {
    if (!playerId || !skillName) return;

    console.log(`Saving evaluation: ${playerId}, ${skillName}, ${rating}`);

    const { data, error } = await window.supabaseClient
        .from('player_latest_evaluation')
        .upsert({
            player_id: playerId,
            skill_name: skillName,
            rating: rating
        }, { onConflict: 'player_id, skill_name' });

    if (error) {
        console.error("Error saving evaluation:", error);
    } else {
        console.log("Evaluation saved successfully.");
    }
}

// Expose helpers globally
window.getSkillsForDevice = getSkillsForDevice;
window.saveEvaluation = saveEvaluation;
