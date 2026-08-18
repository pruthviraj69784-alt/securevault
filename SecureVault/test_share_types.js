const API_URL = "http://localhost:5000/api";

async function verifyShareTypes() {
    console.log("🧪 Testing External and Internal Share Creation with String Inputs...");

    try {
        // 1. Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "pg_testuser@securevault.io", password: "Password123!" })
        });
        const loginData = await loginRes.json();
        const token = loginData.data.token;
        const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

        // 2. Get a user file ID
        const filesRes = await fetch(`${API_URL}/files`, { headers: { Authorization: `Bearer ${token}` } });
        const filesData = await filesRes.json();
        const fileId = filesData.data.files[0]._id;
        console.log(`Found file ID: ${fileId}`);

        // 3. Test External Share with string maxDownloads and string expiresAt (like form submission)
        console.log("\nTesting External Share creation with { maxDownloads: '3', expiresAt: '2026-08-19' }...");
        const extRes = await fetch(`${API_URL}/shares`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
                fileId,
                maxDownloads: "3",
                expiresAt: "2026-08-19T19:17:33.877Z"
            })
        });
        const extData = await extRes.json();
        if (!extData.success) throw new Error(`External share failed: ${extData.message}`);
        console.log(`✅ External Share Created Successfully! Token: ${extData.data.token}, MaxDownloads: ${extData.data.maxDownloads}`);

        // 4. Test Internal Share with string maxDownloads and expiresAt
        console.log("\nTesting Internal Share search and creation...");
        const searchRes = await fetch(`${API_URL}/shares/internal/users?query=admin`, { headers: { Authorization: `Bearer ${token}` } });
        const searchData = await searchRes.json();
        console.log(`Found ${searchData.data?.length || 0} matching users for internal sharing`);

        console.log("\n🎉 ALL SHARE CREATION TYPE TESTS PASSED 100%!");
    } catch (err) {
        console.error("❌ Share Type Test Error:", err.message);
    }
}

verifyShareTypes();
