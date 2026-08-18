const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const directories = ["src", "tests"];
const files = [path.join(root, "server.js")];

function collectJavaScriptFiles(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            collectJavaScriptFiles(entryPath);
        } else if (entry.isFile() && entry.name.endsWith(".js")) {
            files.push(entryPath);
        }
    }
}

for (const directory of directories) {
    collectJavaScriptFiles(path.join(root, directory));
}

for (const file of files) {
    execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
