// Archivo principal para la lógica interactiva y Web Speech API

document.addEventListener('DOMContentLoaded', () => {
    console.log("Tutor Mágico App Iniciada");
    
    // Configuración de la Web Speech API
    const synth = window.speechSynthesis;
    let voices = [];

    function populateVoiceList() {
        voices = synth.getVoices();
    }

    populateVoiceList();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    // Botón de lectura en voz alta
    const btnReadAloud = document.getElementById('btn-read-aloud');
    const textToRead = document.getElementById('lesson-text');

    if (btnReadAloud && textToRead) {
        btnReadAloud.addEventListener('click', () => {
            if (synth.speaking) {
                console.error('speechSynthesis.speaking');
                // Si ya está hablando, detenerlo y volver a empezar (comportamiento opcional)
                synth.cancel();
            }

            const utterThis = new SpeechSynthesisUtterance(textToRead.innerText);
            
            // Buscar una voz en español
            const spanishVoice = voices.find(voice => voice.lang.includes('es'));
            if (spanishVoice) {
                utterThis.voice = spanishVoice;
            }
            
            // Configurar para niño de 7 años (pausado y amigable)
            utterThis.pitch = 1.1; // Ligeramente más agudo
            utterThis.rate = 0.9;  // Un poco más lento para mejor comprensión
            
            synth.speak(utterThis);
            
            // Animación visual mientras lee (opcional)
            btnReadAloud.classList.add('reading');
            utterThis.onend = function (event) {
                btnReadAloud.classList.remove('reading');
            }
        });
    }

    // ==========================================
    // AUTENTICACIÓN (FIREBASE)
    // ==========================================
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const screenLogin = document.getElementById('login-screen');
    const screenRegister = document.getElementById('register-screen');
    const screenMap = document.getElementById('map-screen');
    const screenTeacher = document.getElementById('teacher-screen');
    const userNameDisplay = document.getElementById('user-name');
    const teacherNameDisplay = document.getElementById('teacher-name');
    const btnLogout = document.getElementById('btn-logout');
    const btnLogoutTeacher = document.getElementById('btn-logout-teacher');
    
    // Navegación de Auth
    document.getElementById('btn-show-register')?.addEventListener('click', () => {
        alert("Pídele a tu maestro que te dé tus credenciales para ingresar.");
    });

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim().toLowerCase();
            const password = document.getElementById('login-password').value.trim();
            const errorP = document.getElementById('login-error');
            
            // window.loginUser is defined in firebase-auth.js
            const result = await window.loginUser(email, password);
            if(result.success) {
                screenLogin.classList.remove('active');
                
                if (result.role === 'teacher') {
                    screenTeacher.classList.add('active');
                    teacherNameDisplay.innerText = window.currentUser?.name || 'Profesor';
                    loadTeacherDashboard();
                    
                    // Obtener la API Key desde Google Sheets para confirmar que está guardada
                    try {
                        const token = await firebase.auth().currentUser.getIdToken();
                        const res = await fetch(APPS_SCRIPT_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                            body: JSON.stringify({ action: "GET_SETTINGS", token: token })
                        });
                        const data = await res.json();
                        if (data.success && data.apiKey) {
                            document.getElementById('gemini-api-key').value = data.apiKey;
                        }
                    } catch(e) {
                        console.error("No se pudo cargar la API Key", e);
                    }
                } else {
                    screenMap.classList.add('active');
                    userNameDisplay.innerText = window.currentUser?.name || 'Aventurero';
                    renderMap(); // Renderizar mapa al iniciar sesión como estudiante
                }
            } else {
                errorP.innerText = result.error;
                errorP.style.display = 'block';
            }
        });
    }

    // Logout Alumno
    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await window.logoutUser();
            screenMap.classList.remove('active');
            document.getElementById('lesson-screen').classList.remove('active');
            screenLogin.classList.add('active');
        });
    }

    // Logout Maestro
    if(btnLogoutTeacher) {
        btnLogoutTeacher.addEventListener('click', async () => {
            await window.logoutUser();
            screenTeacher.classList.remove('active');
            screenLogin.classList.add('active');
        });
    }
    
    // Toggle Ojo para API Key del Maestro
    const toggleEyeSettings = document.getElementById('toggle-eye');
    const inputApiKey = document.getElementById('gemini-api-key');
    if (toggleEyeSettings && inputApiKey) {
        toggleEyeSettings.addEventListener('click', () => {
            if (inputApiKey.type === 'password') {
                inputApiKey.type = 'text';
            } else {
                inputApiKey.type = 'password';
            }
        });
    }

    // Configuración del Maestro (Guardar en Sheets)
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const geminiKey = document.getElementById('gemini-api-key').value.trim();
            
            try {
                // Enviar la API Key a Google Sheets mediante el Proxy (Apps Script) usando text/plain para evitar errores de CORS
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify({ action: "SAVE_SETTINGS", apiKey: geminiKey })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const statusP = document.getElementById('settings-status');
                    statusP.innerText = "✅ API Key encriptada en Google Sheets.";
                    statusP.style.display = 'block';
                    setTimeout(() => statusP.style.display = 'none', 4000);
                } else {
                    alert("Error en Apps Script: " + data.error);
                }
            } catch (error) {
                alert("Error de red. Apps script falló: " + error.message);
                console.error(error);
            }
        });
    }

    // Ojito para ver contraseña de Gemini
    const toggleEye = document.getElementById('toggle-eye');
    const geminiInput = document.getElementById('gemini-api-key');
    if (toggleEye && geminiInput) {
        toggleEye.addEventListener('click', () => {
            if (geminiInput.type === 'password') {
                geminiInput.type = 'text';
                toggleEye.innerText = '🙈';
            } else {
                geminiInput.type = 'password';
                toggleEye.innerText = '👁️';
            }
        });
    }

    // Ojito para ver contraseña en Login
    const toggleEyeLogin = document.getElementById('toggle-eye-login');
    const loginInput = document.getElementById('login-password');
    if (toggleEyeLogin && loginInput) {
        toggleEyeLogin.addEventListener('click', () => {
            if (loginInput.type === 'password') {
                loginInput.type = 'text';
                toggleEyeLogin.innerText = '🙈';
            } else {
                loginInput.type = 'password';
                toggleEyeLogin.innerText = '👁️';
            }
        });
    }
    // CMS: Guardar Tema Simple
    const cmsForm = document.getElementById('cms-form');
    if (cmsForm) {
        cmsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const topic = document.getElementById('cms-topic').value.trim();
            const btn = cmsForm.querySelector('button');
            const originalText = btn.innerText;
            
            if(!topic) return;
            
            btn.innerText = "⏳ Guardando...";
            btn.disabled = true;

            try {
                const token = await firebase.auth().currentUser.getIdToken();
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: "ADD_TOPIC", topic: topic, token: token })
                });
                const data = await response.json();
                
                if (data.success) {
                    const statusP = document.getElementById('cms-status');
                    statusP.style.display = 'block';
                    cmsForm.reset();
                    setTimeout(() => statusP.style.display = 'none', 3000);
                } else {
                    alert("Error guardando tema: " + data.error);
                }
            } catch (error) {
                alert("Error de red: " + error.message);
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // ==========================================
    // RENDERIZAR EL MAPA DINÁMICO
    // ==========================================
    async function renderMap() {
        const mapContainer = document.getElementById('dynamic-map');
        if (!mapContainer) return;
        
        mapContainer.innerHTML = '<p style="text-align:center; color:white; font-size:1.2rem;">Cargando tus aventuras...</p>';
        
        let topics = [];
        try {
            const token = await firebase.auth().currentUser.getIdToken();
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "GET_TOPICS", token: token })
            });
            const data = await response.json();
            if (data.success) {
                topics = data.topics;
            }
        } catch (error) {
            console.error("Error cargando temas:", error);
        }

        mapContainer.innerHTML = ''; // Limpiar
        
        if (topics.length === 0) {
            mapContainer.innerHTML = '<p style="text-align:center; color:white; font-size:1.2rem;">Aún no hay aventuras. ¡El maestro está preparando la magia!</p>';
            return;
        }

        topics.forEach((topic, index) => {
            const btn = document.createElement('button');
            btn.className = 'level-node active'; // Por ahora todos activos
            btn.innerText = `${index + 1}. ${topic}`;
            
            btn.addEventListener('click', () => {
                openLesson(topic, index + 1);
            });
            mapContainer.appendChild(btn);
        });
    }

    let currentChapters = [];
    let currentChapterIndex = 0;
    let currentTopicTitle = "";

    async function openLesson(topicTitle, orderIndex) {
        screenMap.classList.remove('active');
        const lessonScreen = document.getElementById('lesson-screen');
        lessonScreen.classList.add('active');
        
        currentTopicTitle = topicTitle;
        currentChapterIndex = 0;
        
        document.getElementById('lesson-title').innerText = topicTitle;
        document.getElementById('lesson-progress').innerText = "Cargando aventura...";
        document.getElementById('chapter-title').innerText = "¡Preparando la magia!";
        const textElement = document.getElementById('lesson-text');
        textElement.innerText = "✨ El Tutor Mágico está invocando su magia para preparar tu aventura. ¡Espera un momento! ✨";
        
        document.getElementById('game-trivia').style.display = 'none';
        document.getElementById('chapter-success').style.display = 'none';
        
        try {
            const token = await firebase.auth().currentUser.getIdToken();
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "GENERATE_LESSON", topic: topicTitle, token: token })
            });
            const data = await response.json();
            
            if (data.success && data.lesson && data.lesson.chapters) {
                currentChapters = data.lesson.chapters;
                renderChapter();
            } else {
                textElement.innerText = "Ups... La magia falló. " + (data.error || "El Tutor Mágico necesita que intentes de nuevo.");
            }
        } catch (error) {
            textElement.innerText = "Error de conexión mágica. Revisa tu internet.";
        }
    }

    function renderChapter() {
        if (currentChapterIndex >= currentChapters.length) {
            // Fin de la lección
            document.getElementById('lesson-progress').innerText = "¡Aventura Completada!";
            document.getElementById('chapter-title').innerText = "¡Felicidades, Héroe de la Historia!";
            document.getElementById('lesson-text').innerText = "Has completado esta gran aventura y aprendido muchísimo. El Tutor Mágico está muy orgulloso de ti.";
            document.getElementById('game-trivia').style.display = 'none';
            document.getElementById('chapter-success').style.display = 'none';
            
            // Sonido de victoria final
            const audioCel = document.getElementById('audio-celebration');
            if(audioCel) {
                audioCel.currentTime = 0;
                audioCel.play().catch(e => console.log(e));
            }
            return;
        }

        const chapter = currentChapters[currentChapterIndex];
        
        document.getElementById('lesson-progress').innerText = `Capítulo ${currentChapterIndex + 1} de ${currentChapters.length}`;
        document.getElementById('chapter-title').innerText = chapter.title;
        document.getElementById('lesson-text').innerText = chapter.story;
        
        // Reset Juego
        document.getElementById('chapter-success').style.display = 'none';
        document.getElementById('game-trivia').style.display = 'block';
        document.getElementById('trivia-question').innerText = chapter.question;
        
        const options = document.getElementById('trivia-options');
        options.innerHTML = '';
        
        const btnCorrect = document.createElement('button');
        btnCorrect.className = 'btn option-btn';
        btnCorrect.innerText = chapter.correct;
        btnCorrect.onclick = () => handleAnswer(true, btnCorrect);

        const btnWrong = document.createElement('button');
        btnWrong.className = 'btn option-btn';
        btnWrong.innerText = chapter.wrong;
        btnWrong.onclick = () => handleAnswer(false, btnWrong);
        
        // Randomizar botones
        if (Math.random() > 0.5) {
            options.appendChild(btnCorrect);
            options.appendChild(btnWrong);
        } else {
            options.appendChild(btnWrong);
            options.appendChild(btnCorrect);
        }
    }

    function handleAnswer(isCorrect, btnElement) {
        if (isCorrect) {
            btnElement.classList.add('correct');
            // Sonido de acierto
            const audioCor = document.getElementById('audio-correct');
            if(audioCor) {
                audioCor.currentTime = 0;
                audioCor.play().catch(e => console.log(e));
            }
            
            window.saveLevelProgress(currentTopicTitle + ` (Cap ${currentChapterIndex+1})`, 100, true);
            
            // Deshabilitar botones
            const buttons = document.querySelectorAll('.option-btn');
            buttons.forEach(b => b.disabled = true);
            
            // Mostrar botón de siguiente
            document.getElementById('chapter-success').style.display = 'block';
        } else {
            btnElement.classList.add('wrong');
            window.saveLevelProgress(currentTopicTitle + ` (Cap ${currentChapterIndex+1})`, 0, false);
            // Hacer que intente de nuevo sin bloquear todo
        }
    }

    document.getElementById('btn-next-chapter')?.addEventListener('click', () => {
        currentChapterIndex++;
        renderChapter();
    });

    // Botón para volver al mapa desde una lección
    document.getElementById('btn-back-map')?.addEventListener('click', () => {
        document.getElementById('lesson-screen').classList.remove('active');
        document.getElementById('game-trivia').style.display = 'none';
        screenMap.classList.add('active');
        renderMap(); // Actualizar por si se completó algo
    });

    async function loadTeacherDashboard() {
        const tbody = document.getElementById('dashboard-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Cargando datos desde Firebase...</td></tr>';
        
        try {
            const db = firebase.firestore();
            const progressSnap = await db.collection("progress").orderBy("completedAt", "desc").limit(20).get();
            const chatSnap = await db.collection("student_activities").orderBy("timestamp", "desc").limit(20).get();
            
            let allActivities = [];
            
            progressSnap.forEach(doc => {
                const d = doc.data();
                allActivities.push({
                    type: 'trivia',
                    studentName: d.studentName,
                    topic: d.levelId,
                    detail: `Puntaje: ${d.score}`,
                    result: d.isCorrect ? '✅ Correcto' : '❌ Incorrecto',
                    date: d.completedAt ? d.completedAt.toDate() : new Date()
                });
            });
            
            chatSnap.forEach(doc => {
                const d = doc.data();
                allActivities.push({
                    type: 'chat',
                    studentName: d.studentName,
                    topic: 'Chat Tutor IA',
                    detail: `Q: "${d.message}"\nA: "${d.botResponse}"`,
                    result: '💬 Conversación',
                    date: d.timestamp ? d.timestamp.toDate() : new Date()
                });
            });
            
            allActivities.sort((a, b) => b.date - a.date);
            
            if (allActivities.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hay actividades registradas aún.</td></tr>';
                return;
            }
            
            tbody.innerHTML = '';
            
            allActivities.forEach(act => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid #e2e8f0";
                
                tr.innerHTML = `
                    <td style="padding: 12px;">${act.studentName}</td>
                    <td style="padding: 12px;">${act.topic}</td>
                    <td style="padding: 12px; font-size: 0.9rem; max-width: 300px; white-space: pre-wrap;">${act.detail}</td>
                    <td style="padding: 12px; color: ${act.result.includes('✅') ? 'green' : (act.result.includes('❌') ? 'red' : 'black')};">${act.result}</td>
                    <td style="padding: 12px; font-size: 0.85rem; color: #64748b;">${act.date.toLocaleString()}</td>
                `;
                tbody.appendChild(tr);
            });
            
        } catch(error) {
            console.error("Error cargando dashboard:", error);
            tbody.innerHTML = `<tr><td colspan="5" style="color: red; text-align: center; padding: 20px;">Error cargando datos: ${error.message}</td></tr>`;
        }
    }

    const triviaData = [
        {
            question: "¿En qué año llegó Cristóbal Colón a América?",
            options: ["1492", "1821", "1524", "1900"],
            correctIndex: 0
        },
        {
            question: "¿Cómo se llamaban los barcos de Colón?",
            options: ["Lanchas rápidas", "Carabelas", "Submarinos", "Canoas"],
            correctIndex: 1
        },
        {
            question: "¿Quién era la Reina que apoyó a Colón?",
            options: ["Reina Isabel", "Reina Victoria", "Reina Cleopatra", "Reina de Corazones"],
            correctIndex: 0
        }
    ];

    let currentQuestionIndex = 0;
    
    const gameTriviaContainer = document.getElementById('game-trivia');
    const triviaQuestion = document.getElementById('trivia-question');
    const triviaOptions = document.getElementById('trivia-options');
    const triviaPlayer = document.getElementById('trivia-player');

    // Función temporal para simular el inicio de un nivel desde el mapa
    function startTriviaGame() {
        if(gameTriviaContainer) {
            gameTriviaContainer.style.display = 'block';
            currentQuestionIndex = 0;
            triviaPlayer.style.left = '5%';
            loadQuestion();
        }
    }

    function loadQuestion() {
        if (currentQuestionIndex >= triviaData.length) {
            // Juego Terminado, ¡Victoria!
            triviaQuestion.innerText = "¡Felicidades! Has llegado a la meta.";
            triviaOptions.innerHTML = `<button class="btn primary-btn" onclick="location.reload()">Volver al Mapa</button>`;
            triviaPlayer.style.left = '95%';
            
            // Aquí podríamos llamar al Tutor IA para felicitar
            if(window.aiTutor) {
                console.log("¡Tutor IA felicita al alumno!");
            }
            return;
        }

        const currentQ = triviaData[currentQuestionIndex];
        triviaQuestion.innerText = currentQ.question;
        triviaOptions.innerHTML = '';

        currentQ.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn option-btn';
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(index, currentQ.correctIndex, btn);
            triviaOptions.appendChild(btn);
        });
    }

    function checkAnswer(selectedIndex, correctIndex, btnElement) {
        // Deshabilitar todos los botones para evitar múltiples clics
        const allBtns = triviaOptions.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.disabled = true);

        if (selectedIndex === correctIndex) {
            btnElement.classList.add('correct');
            
            // Avanzar el jugador (avatar) en la línea
            // Calculamos la posición: 5% inicial + (90% / num_preguntas * (index + 1))
            const progress = 5 + ((90 / triviaData.length) * (currentQuestionIndex + 1));
            triviaPlayer.style.left = `${progress}%`;

            setTimeout(() => {
                currentQuestionIndex++;
                loadQuestion();
            }, 1500); // Pausa para celebrar antes de la siguiente pregunta
        } else {
            btnElement.classList.add('wrong');
            // Al fallar, le damos otra oportunidad después de un segundo
            setTimeout(() => {
                btnElement.classList.remove('wrong');
                allBtns.forEach(b => b.disabled = false);
            }, 1000);
        }
    }

    // Para probar, si hacemos clic en el Nivel 3 (Viajes de Colón) abriremos la trivia
    const level2Btn = document.querySelector('.level-node[data-level="2"]');
    if(level2Btn) {
        level2Btn.classList.remove('locked');
        level2Btn.classList.add('active');
        level2Btn.addEventListener('click', () => {
            screenMap.classList.remove('active');
            document.getElementById('lesson-screen').classList.add('active');
            
            // Configurar textos de la lección
            document.getElementById('lesson-title').innerText = "Viajes de Cristóbal Colón";
            document.getElementById('lesson-text').innerText = "Hace mucho tiempo, Cristóbal Colón viajó por el océano en sus tres carabelas: La Niña, La Pinta y La Santa María. ¡Ayuda a la carabela a llegar a su destino respondiendo correctamente!";
            
            startTriviaGame();
        });
    }
    
    // Botón de volver al mapa
    const btnBackMap = document.getElementById('btn-back-map');
    if(btnBackMap) {
        btnBackMap.addEventListener('click', () => {
            document.getElementById('lesson-screen').classList.remove('active');
            screenMap.classList.add('active');
        });
    }

    // ==========================================
    // LÓGICA DEL MINIJUEGO: LÍNEA DE TIEMPO
    // ==========================================
    const draggables = document.querySelectorAll('.drag-item');
    const dropzones = document.querySelectorAll('.dropzone');
    
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', () => {
            draggable.classList.add('dragging');
        });
        
        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
        });
    });
    
    dropzones.forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });
        
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            
            const draggingEl = document.querySelector('.dragging');
            if(draggingEl) {
                // Verificar si el id coincide (1, 2, 3)
                if(draggingEl.getAttribute('data-id') === zone.getAttribute('data-id')) {
                    zone.appendChild(draggingEl);
                    draggingEl.classList.add('correctly-placed');
                    // Comprobar si ganó
                    checkTimelineWin();
                } else {
                    // Feedback visual de error
                    draggingEl.style.animation = 'shake 0.5s';
                    setTimeout(() => draggingEl.style.animation = '', 500);
                }
            }
        });
    });

    function checkTimelineWin() {
        const placed = document.querySelectorAll('.dropzone .drag-item');
        if(placed.length === 3) {
            setTimeout(() => {
                alert("¡Excelente! Has ordenado la historia correctamente. Ahora te toca a ti contarla al Tutor IA.");
            }, 500);
        }
    }

    // ==========================================
    // LÓGICA DEL MINIJUEGO: MEMORIA HISTÓRICA
    // ==========================================
    const memoryBoard = document.getElementById('memory-board');
    const memoryCardsData = [
        { id: 'colon', name: 'Colón', img: 'assets/carabela.png' },
        { id: 'indep', name: 'Independencia', img: 'assets/pergamino.png' },
        { id: 'tecun', name: 'Tecún Umán', img: 'assets/tecun-uman.png' },
        { id: 'bandera', name: 'Bandera', img: 'assets/bandera-gt.png' }
    ];
    
    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;

    function initMemoryGame() {
        if(!memoryBoard) return;
        memoryBoard.innerHTML = '';
        cards = [...memoryCardsData, ...memoryCardsData]; // Duplicar para parejas
        // Barajar
        cards.sort(() => 0.5 - Math.random());
        
        cards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'memory-card';
            cardEl.dataset.id = card.id;
            cardEl.innerHTML = `
                <div class="memory-card-inner">
                    <div class="memory-card-front">?</div>
                    <div class="memory-card-back">
                        <img src="${card.img}" alt="${card.name}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/883/883017.png'">
                        <span>${card.name}</span>
                    </div>
                </div>
            `;
            cardEl.addEventListener('click', () => flipCard(cardEl));
            memoryBoard.appendChild(cardEl);
        });
    }

    function flipCard(cardEl) {
        if(flippedCards.length < 2 && !cardEl.classList.contains('flipped') && !cardEl.classList.contains('matched')) {
            cardEl.classList.add('flipped');
            flippedCards.push(cardEl);
            
            if(flippedCards.length === 2) {
                checkMemoryMatch();
            }
        }
    }

    function checkMemoryMatch() {
        const [card1, card2] = flippedCards;
        if(card1.dataset.id === card2.dataset.id) {
            card1.classList.add('matched');
            card2.classList.add('matched');
            matchedPairs++;
            if(matchedPairs === memoryCardsData.length) {
                setTimeout(() => alert("¡Ganaste! Tienes una memoria excelente."), 500);
            }
            flippedCards = [];
        } else {
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                flippedCards = [];
            }, 1000);
        }
    }

    // Inicializamos las plantillas al cargar (esto es para debug y visualización inicial)
    // En el juego real, esto se activará al hacer clic en un nivel
    initMemoryGame();
    // For testing visibility of all games, uncomment this if you want to see them all at once:
    // document.getElementById('game-timeline').style.display = 'block';
    // document.getElementById('game-memory').style.display = 'block';

});
