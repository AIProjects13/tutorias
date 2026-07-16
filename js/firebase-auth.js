// Configuración de Firebase (Compat) - SOLO PARA AUTHENTICATION
const firebaseConfig = {
  apiKey: "AIzaSyCtZnrcLj9wYFQnVKvC8-owb7JAaPXpUS8",
  authDomain: "varios-85d7c.firebaseapp.com",
  projectId: "varios-85d7c",
  storageBucket: "varios-85d7c.firebasestorage.app",
  messagingSenderId: "67103964963",
  appId: "1:67103964963:web:8ee9f644fede4d1604d696",
  measurementId: "G-8BMMP80PJ7"
};

// Inicializar Firebase Compat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// URL del backend (Definida en index.html)
// const SCRIPT_URL_DB se elimina, se usará window.APPS_SCRIPT_URL
const SCRIPT_URL_DB = window.APPS_SCRIPT_URL;

// Variables globales (Compatibles con app.js)
window.currentUser = null;
window.userRole = null; 
window.activeStudent = null; // Sub-perfil seleccionado con PIN

// Función global segura para hacer peticiones al backend
window.fetchSecure = async function(payload) {
    if (!auth.currentUser) {
        throw new Error("No hay usuario autenticado en Firebase.");
    }
    const token = await auth.currentUser.getIdToken();
    payload.token = token;
    payload.firebaseApiKey = firebaseConfig.apiKey; // Necesario para que el backend verifique
    
    return fetch(window.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    });
};

// =========================================
// FUNCIONES DE AUTENTICACIÓN
// =========================================

window.loginUser = async function(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const roleRes = await fetchUserRole(user.email); 
        
        if (!roleRes.success) {
            await auth.signOut();
            return { success: false, error: roleRes.error };
        }
        
        return { success: true, user: user, role: window.userRole };
    } catch (error) {
        console.error("Error en login:", error);
        return { success: false, error: "Contraseña incorrecta o usuario no existe." };
    }
};

window.logoutUser = async function() {
    try {
        await auth.signOut();
        window.currentUser = null;
        window.userRole = null;
        window.activeStudent = null;
        return true;
    } catch (error) {
        console.error("Error al salir:", error);
        return false;
    }
};

// =========================================
// FUNCIONES DE BASE DE DATOS
// =========================================

async function fetchUserRole(email) {
    try {
        // En el primer login, currentUser ya está asignado internamente por Firebase,
        // así que podemos usar fetchSecure.
        const response = await window.fetchSecure({ action: "GET_USER_ROLE", email: email });
        const data = await response.json();
        
        if (data.success && data.role) {
            const role = data.role.trim().toLowerCase();
            if (role === 'teacher' || role === 'student') {
                window.userRole = role;
                window.currentUser = { email: email };
                return { success: true };
            }
        }
        console.warn(`Usuario sin credenciales válidas en el sistema: ${email}`);
        window.userRole = null;
        return { success: false, error: data.error || "Rol no asignado en Sheets." };
    } catch (error) {
        console.error("Error obteniendo rol del sistema:", error);
        window.userRole = null;
        return { success: false, error: error.message };
    }
}

// =========================================
// FUNCIONES DE PROGRESO
// =========================================

window.saveLevelProgress = async function(levelId, score, isCorrect = true) {
    if (!window.currentUser || window.userRole !== 'student' || !window.activeStudent) return;
    
    try {
        await window.fetchSecure({
            action: "SAVE_PROGRESS",
            studentUsername: window.activeStudent.username,
            levelId: levelId,
            score: score,
            isCorrect: isCorrect
        });
        console.log("Progreso guardado para " + window.activeStudent.username);
    } catch (error) {
        console.error("Error guardando progreso:", error);
    }
};

window.getUserProgress = async function() {
    if (!window.currentUser || window.userRole !== 'student' || !window.activeStudent) return [];
    
    try {
        const response = await window.fetchSecure({
            action: "GET_USER_PROGRESS",
            studentUsername: window.activeStudent.username
        });
        const data = await response.json();
        if (data.success) {
            return data.completedTopics || [];
        }
        return [];
    } catch (error) {
        console.error("Error leyendo progreso:", error);
        return [];
    }
};

window.getAllStudentsAnalytics = async function() {
    if (!window.currentUser || window.userRole !== 'teacher') return [];
    
    try {
        const response = await window.fetchSecure({
            action: "GET_ALL_ANALYTICS",
            teacherEmail: window.currentUser.email
        });
        const data = await response.json();
        if (data.success) {
            // Re-mapear fechas para que sean objetos Date
            let analytics = data.analytics || [];
            analytics.forEach(student => {
                if(student.progress) {
                    student.progress.forEach(p => {
                        if(p.date) p.date = new Date(p.date);
                    });
                }
            });
            return analytics;
        }
        return [];
    } catch (error) {
        console.error("Error obteniendo analíticas:", error);
        return [];
    }
};

window.saveChatActivity = async function(message, responseMsg) {
    if (!window.currentUser || window.userRole !== 'student' || !window.activeStudent) return;
    
    try {
        await window.fetchSecure({
            action: "SAVE_CHAT",
            chatData: {
                studentUsername: window.activeStudent.username,
                message: message,
                response: responseMsg
            }
        });
    } catch (error) {
        console.error("Error guardando actividad de chat:", error);
    }
};

// =========================================
// CRUD DE PERFILES DE ALUMNO (SUB-USERS)
// =========================================

window.createStudentProfile = async function(profileData) {
    if (!window.currentUser || window.userRole !== 'teacher') return {success: false, error: "No autorizado"};
    
    try {
        profileData.teacherEmail = window.currentUser.email;
        const response = await window.fetchSecure({
            action: "CREATE_STUDENT_PROFILE",
            profileData: profileData
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error creando perfil:", error);
        return {success: false, error: error.message};
    }
};

window.getStudentProfiles = async function(forTeacher = false) {
    if (!window.currentUser) return [];
    
    try {
        const response = await window.fetchSecure({
            action: "GET_STUDENT_PROFILES",
            email: window.currentUser.email,
            forTeacher: forTeacher
        });
        const data = await response.json();
        if (data.success) {
            return data.profiles || [];
        }
        return [];
    } catch (error) {
        console.error("Error listando perfiles:", error);
        return [];
    }
};

window.deleteStudentProfile = async function(username) {
    console.log("Delete logic para sheets pendiente...");
    return {success: true};
};
