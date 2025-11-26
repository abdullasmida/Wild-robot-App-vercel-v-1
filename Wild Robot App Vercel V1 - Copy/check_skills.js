
async function checkSkillLibrary() {
    console.log("Checking skill_library structure...");
    const { data, error } = await window.supabaseClient
        .from('skill_library')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error checking skill_library:", error);
    } else {
        console.log("skill_library sample:", JSON.stringify(data[0]));
    }
}

// Expose to window to call it from console or just run it if we inject this file
window.checkSkillLibrary = checkSkillLibrary;
if (window.supabaseClient) checkSkillLibrary();
