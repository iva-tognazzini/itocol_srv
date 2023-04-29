import { config } from "dotenv";



let isConfigured = false;
export function getEnvVar(name: string) {
    if (!isConfigured) {
        config();
        isConfigured = true;
    }
    return process.env[name];
}