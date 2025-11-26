
function testPromotionLogic() {
    console.log("Starting Promotion Logic Test...");

    // Mock Data
    const mockPlayer = {
        id: "test_p1",
        name: "Test Player",
        levelCode: "Bronze",
        devices: [
            { name: "Floor", skills: [] }
        ]
    };

    // Mock DB
    const mockDB = {
        skillLibrary: [
            { name: "Silver Skill 1", apparatus: "Floor", level: "Silver" },
            { name: "Bronze Skill 1", apparatus: "Floor", level: "Bronze" }
        ]
    };
    window.DB = mockDB; // Ensure DB is global if needed by app, but we pass it or use global

    // Mock getSkillsForDevice (if not already loaded, but we assume supabase-service.js is loaded)
    // If supabase-service.js is loaded, window.getSkillsForDevice should exist. 
    // We'll check it.
    if (typeof window.getSkillsForDevice !== 'function') {
        console.error("window.getSkillsForDevice is not defined!");
        return;
    }

    // Test getNextLevel
    // We need to access getNextLevel. It's in app.js but not exposed globally. 
    // We might need to copy it here or expose it in app.js. 
    // For this test, let's redefine it to match app.js logic to verify the LOGIC itself.
    function getNextLevel(currentLevel) {
        const levels = ["Recreational", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Sapphire"];
        const idx = levels.findIndex(l => l.toLowerCase() === (currentLevel || "").toLowerCase());
        if (idx !== -1 && idx < levels.length - 1) {
            return levels[idx + 1];
        }
        return null;
    }

    const nextLevel = getNextLevel(mockPlayer.levelCode);
    console.log(`Current Level: ${mockPlayer.levelCode}, Next Level: ${nextLevel}`);

    if (nextLevel !== "Silver") {
        console.error("Failed: Next level should be Silver");
        return;
    }

    // Simulate Promotion
    console.log("Promoting player...");
    mockPlayer.levelCode = nextLevel;

    // Refresh skills
    mockPlayer.devices.forEach(d => {
        d.skills = window.getSkillsForDevice(d.name, nextLevel, mockDB.skillLibrary);
    });

    console.log("Player after promotion:", JSON.stringify(mockPlayer));

    // Verify Skills
    const hasSilverSkill = mockPlayer.devices[0].skills.some(s => s.name === "Silver Skill 1");
    if (hasSilverSkill) {
        console.log("SUCCESS: Player promoted and skills refreshed.");
    } else {
        console.error("FAILED: Player skills not refreshed correctly.");
    }
}

// Run test after a short delay to ensure scripts are loaded
setTimeout(testPromotionLogic, 2000);
