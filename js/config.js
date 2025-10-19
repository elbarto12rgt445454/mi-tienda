
// Importar módulos de Firebase desde CDN (compatible con GitHub Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ⚙️ Tu configuración de Firebase (copiada de tu consola)
const firebaseConfig = {
  apiKey: "AIzaSyAJRPLeyfVFyVmshekqSONm4P9ssTxhfJA",
  authDomain: "mi-tienda-cc21e.firebaseapp.com",
  projectId: "mi-tienda-cc21e",
  storageBucket: "mi-tienda-cc21e.firebasestorage.app",
  messagingSenderId: "41230624909",
  appId: "1:41230624909:web:f66164de53f0ad84815ac4",
  measurementId: "G-KM2LP27PRP"
};

// 🚀 Inicializar Firebase y Firestore
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 🛒 Configuración general de la tienda
export const APP_CONFIG = {
  whatsapp: "59168650455", // Tu número sin "+"
  sessionTTLms: 60 * 1000, // 1 minuto de sesión admin
  brandDefault: {
    name: "La Fórmula",
    logo: null,
    address: "Sopachuy - Chuquisaca",
    phone: "+591 68650455",
    email: "contacto@laformula.com.bo"
  }
};
