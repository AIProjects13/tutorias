// Archivo para la conexión con Google Sheets vía Google Apps Script (Web App)

const SCRIPT_URL = 'URL_DE_TU_WEB_APP_AQUI'; // El usuario lo proveerá luego

async function saveProgress(studentId, levelId, score, time) {
    if(SCRIPT_URL === 'URL_DE_TU_WEB_APP_AQUI') {
        console.warn("Google Sheets API no configurada. Progreso no guardado en la nube.");
        return false;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Necesario para evitar problemas de CORS simples en Apps Script
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'saveProgress',
                data: {
                    studentId,
                    levelId,
                    score,
                    time,
                    timestamp: new Date().toISOString()
                }
            })
        });
        
        console.log("Progreso enviado a Google Sheets");
        return true;
    } catch (error) {
        console.error("Error al guardar progreso en Sheets:", error);
        return false;
    }
}
