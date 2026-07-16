// Configuración de Firebase (Compat)
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
const db = firebase.firestore();

// Variables globales para compartir estado
window.currentUser = null;
window.userRole = null;

// =========================================
// FUNCIONES DE AUTENTICACIÓN
// =========================================

window.loginUser = async function(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await fetchUserRole(user.email); // Usamos el email como ID del documento
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
        return true;
    } catch (error) {
        console.error("Error al salir:", error);
        return false;
    }
};

// =========================================
// FUNCIONES DE BASE DE DATOS (FIRESTORE)
// =========================================

async function fetchUserRole(email) {
    try {
        const userDocRef = db.collection("AI_Tutor_users").doc(email);
        const userSnap = await userDocRef.get();
        if (userSnap.exists) {
            window.userRole = userSnap.data().role.trim().toLowerCase(); // Asegurarnos de limpiar espacios
            window.currentUser = { email: email, ...userSnap.data() };
        } else {
            alert(`ATENCIÓN MAESTRO: Firebase Autenticó tu correo, pero no encontró un documento en la colección 'AI_Tutor_users' cuyo ID sea exactamente tu correo (${email}). Por defecto te enviará a la vista de alumno.`);
            window.userRole = 'student';
            window.currentUser = { email: email, role: 'student', name: 'Aventurero' };
        }
    } catch (error) {
        alert(`ATENCIÓN MAESTRO: La base de datos denegó el acceso (Error: ${error.message}). Revisa las Reglas de Seguridad de Firestore en tu consola de Firebase.`);
        console.error("Error obteniendo rol:", error);
        window.userRole = 'student';
    }
}

window.saveLevelProgress = async function(levelId, score, isCorrect = true) {
    if (!window.currentUser || window.userRole !== 'student') return;

    try {
        await db.collection("progress").add({
            studentId: window.currentUser.uid,
            studentName: window.currentUser.name || window.currentUser.email,
            levelId: levelId,
            score: score,
            isCorrect: isCorrect,
            completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Progreso guardado en Firebase.");
    } catch (error) {
        console.error("Error guardando progreso:", error);
    }
};

window.saveChatActivity = async function(message, response) {
    if (!window.currentUser || window.userRole !== 'student') return;
    
    try {
        await db.collection("student_activities").add({
            studentId: window.currentUser.uid,
            studentName: window.currentUser.name || window.currentUser.email,
            type: "chat",
            message: message,
            botResponse: response,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error guardando actividad de chat:", error);
    }
};

window.saveSettings = async function(scriptUrl) {
    if (!window.currentUser || window.userRole !== 'teacher') return false;
    try {
        await db.collection("settings").doc("global").set({
            gasProxyUrl: scriptUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Error guardando ajustes:", error);
        return false;
    }
};

window.loadSettings = async function() {
    try {
        const snap = await db.collection("settings").doc("global").get();
        if (snap.exists) {
            return snap.data();
        }
        return null;
    } catch (error) {
        console.error("Error cargando ajustes:", error);
        return null;
    }
};

window.saveLesson = async function(lessonId, lessonData) {
    if (!window.currentUser || window.userRole !== 'teacher') return false;
    try {
        await db.collection("lessons").doc(lessonId).set({
            ...lessonData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Error guardando lección:", error);
        return false;
    }
};

window.fetchLessons = async function() {
    try {
        const snap = await db.collection("lessons").orderBy("order").get();
        const lessons = [];
        snap.forEach(doc => {
            lessons.push({ id: doc.id, ...doc.data() });
        });
        return lessons;
    } catch (error) {
        console.error("Error cargando lecciones:", error);
        return [];
    }
};
