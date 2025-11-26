
async function checkEvalTable() {
    console.log("Checking player_latest_evaluation structure...");
    const { data, error } = await window.supabaseClient
        .from('player_latest_evaluation')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error checking table:", error);
    } else {
        if (data && data.length > 0) {
            console.log("Eval table sample:", JSON.stringify(data[0]));
        } else {
            console.log("Eval table is empty, cannot infer structure directly. Assuming standard columns.");
        }
    }
}

window.checkEvalTable = checkEvalTable;
if (window.supabaseClient) checkEvalTable();
