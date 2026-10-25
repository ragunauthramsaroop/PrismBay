import {defineConfig} from "@playwright/test";
export default defineConfig({
 testDir:"./e2e",timeout:60000,expect:{timeout:15000},retries:1,
 use:{baseURL:"http://127.0.0.1:5173",headless:true,browserName:"chromium"},
 webServer:{command:"npm run dev -- --host 127.0.0.1 --port 5173",url:"http://127.0.0.1:5173",timeout:120000,reuseExistingServer:!process.env.CI},
 reporter:[["list"],["html",{open:"never"}]]
});
