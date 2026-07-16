// Lógica para el tutor flotante y la interacción con Gemini API a través del Proxy de GAS


class AITutor {
    constructor() {
        this.fabButton = document.getElementById('btn-ai-tutor');
        this.chatModal = null;
        this.chatInput = null;
        this.chatHistory = null;
        this.sendBtn = null;
        
        this.proxyUrl = null; 
        this.geminiKey = null;
        
        this.init();
        this.createChatUI();
    }

    async init() {
        // Cargar configuración de forma asíncrona
        if(window.loadSettings) {
            const settings = await window.loadSettings();
            if(settings) {
                this.proxyUrl = settings.gasProxyUrl || null;
            }
        }
        if(this.fabButton) {
            this.fabButton.addEventListener('click', () => {
                if (this.chatModal && this.chatModal.style.display === 'flex') {
                    this.chatModal.style.display = 'none';
                } else {
                    this.openChat();
                }
            });
            
            // Llamar la atención del niño periódicamente
            setInterval(() => {
                this.fabButton.classList.add('attention');
                setTimeout(() => this.fabButton.classList.remove('attention'), 2000);
            }, 15000);
        }
    }

    createChatUI() {
        // Crear modal de chat
        const modal = document.createElement('div');
        modal.id = 'chat-modal';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.bottom = '100px';
        modal.style.right = '20px';
        modal.style.width = '300px';
        modal.style.backgroundColor = 'white';
        modal.style.border = '4px solid var(--secondary-color)';
        modal.style.borderRadius = '15px';
        modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
        modal.style.zIndex = '1000';
        modal.style.flexDirection = 'column';

        // Header del chat
        const header = document.createElement('div');
        header.style.backgroundColor = 'var(--secondary-color)';
        header.style.color = 'white';
        header.style.padding = '10px';
        header.style.borderTopLeftRadius = '10px';
        header.style.borderTopRightRadius = '10px';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.innerHTML = '<b>Tutor Mágico 🤖</b> <span id="close-chat" style="cursor:pointer;">✖</span>';
        modal.appendChild(header);

        // Historial
        this.chatHistory = document.createElement('div');
        this.chatHistory.style.height = '200px';
        this.chatHistory.style.padding = '10px';
        this.chatHistory.style.overflowY = 'auto';
        this.chatHistory.style.backgroundColor = '#f9f9f9';
        this.chatHistory.style.display = 'flex';
        this.chatHistory.style.flexDirection = 'column';
        this.chatHistory.style.gap = '10px';
        modal.appendChild(this.chatHistory);

        // Input container
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex';
        inputContainer.style.padding = '10px';
        inputContainer.style.borderTop = '1px solid #ddd';

        this.chatInput = document.createElement('input');
        this.chatInput.type = 'text';
        this.chatInput.placeholder = 'Escribe aquí...';
        this.chatInput.style.flex = '1';
        this.chatInput.style.padding = '8px';
        this.chatInput.style.borderRadius = '5px';
        this.chatInput.style.border = '1px solid #ccc';

        this.sendBtn = document.createElement('button');
        this.sendBtn.innerText = 'Enviar';
        this.sendBtn.className = 'btn secondary-btn';
        this.sendBtn.style.margin = '0 0 0 10px';
        this.sendBtn.style.padding = '8px 12px';

        inputContainer.appendChild(this.chatInput);
        inputContainer.appendChild(this.sendBtn);
        modal.appendChild(inputContainer);

        document.body.appendChild(modal);
        this.chatModal = modal;

        // Eventos
        document.getElementById('close-chat').addEventListener('click', () => {
            this.chatModal.style.display = 'none';
        });

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') this.sendMessage();
        });
    }

    openChat() {
        this.proxyUrl = localStorage.getItem('gas_proxy_url');
        this.chatModal.style.display = 'flex';
        if (this.chatHistory.children.length === 0) {
            this.addMessage("¡Hola! Soy tu Tutor Mágico. Haz clic en una aventura del mapa para empezar, o hazme una pregunta de tus lecciones.", 'bot');
        }
    }

    addMessage(text, sender) {
        const msg = document.createElement('div');
        msg.style.padding = '8px';
        msg.style.borderRadius = '10px';
        msg.style.maxWidth = '80%';
        msg.style.fontSize = '0.9rem';
        
        if (sender === 'user') {
            msg.style.backgroundColor = 'var(--accent-color)';
            msg.style.alignSelf = 'flex-end';
        } else {
            msg.style.backgroundColor = '#e0f7fa';
            msg.style.alignSelf = 'flex-start';
        }
        
        msg.innerText = text;
        this.chatHistory.appendChild(msg);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    async sendMessage() {
        const text = this.chatInput.value.trim();
        if (!text) return;
        
        this.addMessage(text, 'user');
        this.chatInput.value = '';
        // Simular que el bot está escribiendo
        const loadingId = this.addMessage("Escribiendo magia...", 'bot', true);

        try {
            const token = await firebase.auth().currentUser.getIdToken();
            
            // Si es estudiante
            let progressSummary = "";
            let studentName = "";
            if (window.userRole === 'student' && window.activeStudent) {
                studentName = window.activeStudent.name || window.activeStudent.username;
                if (window.getUserProgress) {
                    const completed = await window.getUserProgress();
                    if (completed.length > 0) {
                        progressSummary = completed.join(", ");
                    }
                }
            }
            
            // Si es maestro
            let teacherAnalytics = null;
            if (window.userRole === 'teacher' && window.teacherAnalyticsContext) {
                // Pasamos una versión ligera de la analítica (solo los puntajes recientes)
                teacherAnalytics = JSON.stringify(window.teacherAnalyticsContext.map(s => {
                    return {
                        name: s.name,
                        lastActive: s.lastActive,
                        recentScores: s.progress.slice(0, 5).map(p => ({topic: p.levelId, score: p.score}))
                    }
                }));
            }

            const response = await window.fetchSecure({ 
                action: "CHAT",
                message: text,
                progressSummary: progressSummary,
                studentName: studentName,
                teacherAnalytics: teacherAnalytics,
                role: window.userRole
            });
            
            const data = await response.json();
            
            // Eliminar el mensaje de carga
            const loadingMsg = this.chatHistory.querySelector(`[data-id="${loadingId}"]`);
            if (loadingMsg) loadingMsg.remove();
            
            if (data.success) {
                this.addMessage(data.reply, 'bot');
                if (window.saveChatActivity) {
                    window.saveChatActivity(text, data.reply);
                }
            } else {
                console.error("Error del proxy:", data.error);
                this.addMessage("¡Uy! Mis polvos mágicos fallaron. Intenta de nuevo.", 'bot');
            }
        } catch (error) {
            console.error("Error de conexión:", error);
            this.addMessage("No me pude conectar a la magia de internet. ¡Revisa tu conexión!", 'bot');
        }

        this.chatInput.disabled = false;
        this.sendBtn.disabled = false;
        this.chatInput.focus();
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.aiTutor = new AITutor();
});
