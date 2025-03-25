// src/config/envConfig.js
import configData from "./config.json";

const environment = import.meta.env.VITE_ENV || "dev";
const envConfig = configData[environment] || configData.dev;

console.log("Environment gaaaaaaa: ", import.meta.env.VITE_ENV );

export default envConfig;
