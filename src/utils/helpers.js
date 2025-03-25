import niubizService from "../services/niubizService";

export async function ipNiubiz() {
  try {
    const response = await niubizService.obtenerIpNiubiz();
    localStorage.setItem("ip", response.clientIp || "");
    return response.clientIp || "";
  } catch (error) {
    console.error("Error al obtener ip de Niubiz:", error);
    return "";
  }
}

export function stringToBool(value) {
  value = value.trim();
  const truthy = ["true", "yes", "1"];
  const falsy = ["false", "no", "0", ""];
  if (truthy.includes(value.toLowerCase())) return true;
  if (falsy.includes(value.toLowerCase())) return false;
  throw new Error("Invalid boolean string");
}

export async function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export function getBrand(bin) {
  let brand = "DESCONOCIDO";
  if (/^[0-9]/.test(bin)) {
    brand = "8";
  }
  if (/^5[1-5]|^2[2-7]/.test(bin)) {
    brand = "10";
  }
  if (/^3[47]/.test(bin)) {
    brand = "9";
  }
  if (bin.startsWith("36")) {
    brand = "11";
  }
  return brand;
}

export function getBrandText(bin) {
  let brand = "NN";
  if (/^[0-9]/.test(bin)) {
    brand = "VS";
  }
  if (/^5[1-5]|^2[2-7]/.test(bin)) {
    brand = "MC";
  }
  if (/^3[47]/.test(bin)) {
    brand = "AE";
  }
  if (bin.startsWith("36")) {
    brand = "DN";
  }
  return brand;
}

export function getBrandCompleto(brand) {  
  if (brand == "VS") {
    return "VISA"
  }
  if (brand == "MC") {
    return "MASTERCARD"
  }
  if (brand == "DN") {
    return "DINNERS"
  }
  if (brand == "AE") {
    return "AMEX"
  }
  return brand;
}

export function describeTipoCuenta(tipoCuenta) {
  switch (tipoCuenta) {
    case "1":
      return "CORRIENTE";
    case "2":
      return "AHORRO";
    default:
      return "Otro";
  }
}

export function generarMerchantBuyerId() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return day + month + year + hours + minutes + seconds;
}
