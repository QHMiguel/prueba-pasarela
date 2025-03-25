// src/config/envConfig.js
import configData from "./config.json";

const environment = process.env.VUE_APP_ENV || "dev";
const envConfig = configData[environment] || configData.dev;

console.log("Environment gaaaaaaa: ", import.meta.env.VITE_ENV );

export default envConfig;
