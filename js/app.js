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
            const email = document.getElementById('email').value.trim().toLowerCase();
            const password = document.getElementById('password').value.trim();
            const errorP = document.getElementById('login-error');
            
            // window.loginUser is defined in firebase-auth.js
            const result = await window.loginUser(email, password);
            if(result.success) {
                screenLogin.classList.remove('active');
                
                if (result.role === 'teacher') {
                    screenTeacher.classList.add('active');
                    teacherNameDisplay.innerText = window.currentUser?.name || 'Profesor';
                    loadTeacherDashboard();
                    loadTeacherDashboardStudents();
                    
                    // Obtener la API Key desde Google Sheets para confirmar que está guardada
                    try {
                        const res = await window.fetchSecure({ action: "GET_SETTINGS", key: "GROQ_API_KEY" });
                        const data = await res.json();
                        if (data.success && data.apiKey) {
                            const keyInput = document.getElementById('groq-api-key');
                            if(keyInput) {
                                keyInput.value = data.apiKey;
                            }
                        }
                    } catch(e) {
                        console.error("No se pudo cargar la configuración:", e);
                    }
                } else {
                    // Es alumno, requiere seleccionar sub-perfil y colocar PIN
                    await showPinModal();
                }
            } else {
                errorP.innerText = result.error;
                errorP.style.display = 'block';
            }
        });
    }

    // ==========================================
    // SISTEMA DE PIN Y PERFILES (ESTUDIANTES)
    // ==========================================
    const modPin = document.getElementById('mod-pin');
    const pinSelUser = document.getElementById('pin-sel-user');
    const pinInput = document.getElementById('pin-input');
    const pinError = document.getElementById('pin-error');
    
    async function showPinModal() {
        modPin.style.display = 'block';
        pinSelUser.value = '';
        pinInput.value = '';
        pinError.style.display = 'none';
        
        window._studentProfiles = await window.getStudentProfiles(false);
    }

    document.getElementById('btn-verify-pin')?.addEventListener('click', () => {
        const typedUsername = pinSelUser.value.trim();
        const typedPin = pinInput.value.trim();
        
        if (!typedUsername || !typedPin) return;

        const profiles = window._studentProfiles || [];
        const matchingProfile = profiles.find(p => p.username.toLowerCase() === typedUsername.toLowerCase());

        if (matchingProfile && matchingProfile.pin.toString() === typedPin) {
            // PIN correcto
            window.activeStudent = {
                username: matchingProfile.username,
                name: matchingProfile.name || matchingProfile.username
            };
            modPin.style.display = 'none';
            // Mostrar los nombres de estudiante en las pantallas
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) userNameEl.innerText = window.activeStudent.name;
            
            const learningUserEl = document.getElementById('learning-user');
            if (learningUserEl) learningUserEl.innerText = window.activeStudent.name;
            
            initStudentDashboard();  
        } else {
            pinError.style.display = 'block';
            pinInput.value = '';
        }
    });

    document.getElementById('btn-logout-pin')?.addEventListener('click', async () => {
        await window.logoutUser();
        modPin.style.display = 'none';
        screenLogin.classList.add('active');
    });

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
    
    // Configuración del Maestro
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const groqKey = document.getElementById('groq-api-key').value.trim();
            
            try {
                // Enviar la clave al servidor de forma segura
                const response = await window.fetchSecure({ action: "SAVE_SETTINGS", key: "GROQ_API_KEY", apiKey: groqKey });
                
                const data = await response.json();
                
                if (data.success) {
                    const statusP = document.getElementById('settings-status');
                    statusP.innerText = "✅ Configuración guardada correctamente.";
                    statusP.style.display = 'block';
                    setTimeout(() => statusP.style.display = 'none', 4000);
                } else {
                    alert("Error: " + data.error);
                }
            } catch (error) {
                alert("Error de red: " + error.message);
                console.error(error);
            }
        });
    }

    // Ojito para ver contraseña de API
    const toggleEye = document.getElementById('toggle-eye');
    const groqInput = document.getElementById('groq-api-key');
    if (toggleEye && groqInput) {
        toggleEye.addEventListener('click', () => {
            if (groqInput.type === 'password') {
                groqInput.type = 'text';
                toggleEye.innerText = '🙈';
            } else {
                groqInput.type = 'password';
                toggleEye.innerText = '👁️';
            }
        });
    }

    // Ojito para ver contraseña en Login (removido del HTML, limpiando JS para evitar error null)
    const toggleEyeLogin = document.getElementById('toggle-eye-login');
    const loginInput = document.getElementById('password');
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

    // ==========================================
    // CRUD ALUMNOS (DASHBOARD MAESTRO)
    // ==========================================
    
    async function loadTeacherDashboardStudents() {
        const tbody = document.getElementById('student-list-dashboard');
        if(!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 15px; color:#888;">Cargando alumnos...</td></tr>';
        const profiles = await window.getStudentProfiles(true);
        
        tbody.innerHTML = '';
        if(profiles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 15px; color:#888;">No hay alumnos registrados.</td></tr>';
            return;
        }
        
        profiles.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${p.username}</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; letter-spacing: 0.2em;">${p.pin}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.name || '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.age || '-'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <button class="btn small-btn btn-del-student" data-username="${p.username}" style="background-color: #ef4444; color: white;">Borrar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Asignar eventos de borrado
        document.querySelectorAll('.btn-del-student').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(!confirm("¿Borrar este perfil?")) return;
                const username = e.target.dataset.username;
                e.target.innerText = '...';
                await window.deleteStudentProfile(username);
                loadTeacherDashboardStudents();
            });
        });
    }

    const formNewStudent = document.getElementById('form-new-student');
    if (formNewStudent) {
        formNewStudent.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formNewStudent.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "⏳ Guardando...";
            btn.disabled = true;

            const profileData = {
                username: document.getElementById('std-username').value.trim(),
                pin: document.getElementById('std-pin').value.trim(),
                name: document.getElementById('std-name').value.trim(),
                age: document.getElementById('std-age').value.trim(),
                guardian: document.getElementById('std-guardian').value.trim(),
                phone: document.getElementById('std-phone').value.trim(),
                address: document.getElementById('std-address').value.trim()
            };

            const result = await window.createStudentProfile(profileData);
            
            if (result.success) {
                const statusP = document.getElementById('std-status');
                statusP.style.display = 'block';
                formNewStudent.reset();
                setTimeout(() => statusP.style.display = 'none', 3000);
                loadTeacherDashboardStudents();
            } else {
                alert("Error: " + result.error);
            }
            
            btn.innerText = originalText;
            btn.disabled = false;
        });
    }
    // CMS: Guardar Tema Simple
    const cmsForm = document.getElementById('cms-form');
    if (cmsForm) {
        cmsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const subject = document.getElementById('cms-subject').value.trim();
            const unit = document.getElementById('cms-unit').value.trim();
            const topic = document.getElementById('cms-topic').value.trim();
            const btn = cmsForm.querySelector('button');
            const originalText = btn.innerText;
            
            if(!subject || !unit || !topic) return;
            
            btn.innerText = "⏳ Guardando...";
            btn.disabled = true;

            try {
                const response = await window.fetchSecure({ 
                    action: "ADD_TOPIC", 
                    subject: subject, 
                    unit: unit, 
                    topic: topic 
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const statusP = document.getElementById('cms-status');
                    statusP.style.display = 'block';
                    cmsForm.reset();
                    setTimeout(() => statusP.style.display = 'none', 3000);
                    // Actualizar lista en pantalla
                    loadTopicsForTeacher();
                } else {
                    alert("Error guardando el tema: " + data.error);
                }
            } catch (error) {
                alert("Error de red al guardar el tema: " + error.message);
                console.error(error);
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // Variable global para todos los temas cargados
    window.allTeacherTopics = [];

    // Cargar la lista de temas en el Dashboard del Maestro
    window.loadTopicsForTeacher = async function() {
        const listContainer = document.getElementById('topic-list-dashboard');
        if(!listContainer) return;

        listContainer.innerHTML = '<li><em style="color:#888;">Cargando temas...</em></li>';
        
        try {
            const response = await window.fetchSecure({ action: "GET_TOPICS" });
            const data = await response.json();
            
            if (data.success) {
                window.allTeacherTopics = data.topics || [];
                
                // Extraer subjects y units únicos para poblar filtros y datalists
                const subjectsSet = new Set();
                const unitsSet = new Set();
                window.allTeacherTopics.forEach(t => {
                    subjectsSet.add(t.subject);
                    unitsSet.add(t.unit);
                });
                
                // Poblar datalists del formulario CMS
                const sList = document.getElementById('subjects-list');
                const uList = document.getElementById('units-list');
                if(sList) sList.innerHTML = Array.from(subjectsSet).map(s => `<option value="${s}">`).join('');
                if(uList) uList.innerHTML = Array.from(unitsSet).map(u => `<option value="${u}">`).join('');
                
                // Poblar dropdowns de filtros CMS
                const filterSubject = document.getElementById('filter-cms-subject');
                const filterUnit = document.getElementById('filter-cms-unit');
                if(filterSubject) {
                    const currentSubject = filterSubject.value;
                    filterSubject.innerHTML = '<option value="ALL">Todas las Materias</option>' + Array.from(subjectsSet).map(s => `<option value="${s}">${s}</option>`).join('');
                    if(subjectsSet.has(currentSubject)) filterSubject.value = currentSubject;
                }
                if(filterUnit) {
                    const currentUnit = filterUnit.value;
                    filterUnit.innerHTML = '<option value="ALL">Todas las Unidades</option>' + Array.from(unitsSet).map(u => `<option value="${u}">${u}</option>`).join('');
                    if(unitsSet.has(currentUnit)) filterUnit.value = currentUnit;
                }
                
                // Renderizar la lista
                renderTeacherTopicsList();
            } else {
                listContainer.innerHTML = `<li><em style="color:red;">Error: ${data.error}</em></li>`;
            }
        } catch (error) {
            listContainer.innerHTML = '<li><em style="color:red;">Error de conexión.</em></li>';
        }
    };

    function renderTeacherTopicsList() {
        const listContainer = document.getElementById('topic-list-dashboard');
        const filterSubj = document.getElementById('filter-cms-subject')?.value || 'ALL';
        const filterUn = document.getElementById('filter-cms-unit')?.value || 'ALL';
        
        listContainer.innerHTML = '';
        if(window.allTeacherTopics.length === 0) {
            listContainer.innerHTML = '<li><em style="color:#888;">No hay temas registrados aún.</em></li>';
            return;
        }
        
        // Filtrar y agrupar por subject > unit
        const grouped = {};
        let count = 0;
        
        window.allTeacherTopics.forEach(t => {
            if(filterSubj !== 'ALL' && t.subject !== filterSubj) return;
            if(filterUn !== 'ALL' && t.unit !== filterUn) return;
            
            if(!grouped[t.subject]) grouped[t.subject] = {};
            if(!grouped[t.subject][t.unit]) grouped[t.subject][t.unit] = [];
            grouped[t.subject][t.unit].push(t);
            count++;
        });
        
        if (count === 0) {
            listContainer.innerHTML = '<li><em style="color:#888;">No hay temas que coincidan con los filtros.</em></li>';
            return;
        }
        
        // Renderizar árbol
        for(let subject in grouped) {
            const subjLi = document.createElement('li');
            subjLi.innerHTML = `<strong style="font-size:1.2rem; color:var(--primary-color); display:block; padding-top:10px;">📚 ${subject}</strong>`;
            subjLi.style.listStyle = 'none';
            listContainer.appendChild(subjLi);
            
            for(let unit in grouped[subject]) {
                const unitLi = document.createElement('li');
                unitLi.innerHTML = `<strong style="color:#555; margin-left:15px; display:block; padding-top:5px;">📘 ${unit}</strong>`;
                unitLi.style.listStyle = 'none';
                listContainer.appendChild(unitLi);
                
                grouped[subject][unit].forEach(topicObj => {
                    const li = document.createElement('li');
                    li.style.display = 'flex';
                    li.style.justifyContent = 'space-between';
                    li.style.alignItems = 'center';
                    li.style.padding = '8px';
                    li.style.backgroundColor = '#f8fafc';
                    li.style.border = '1px solid #e2e8f0';
                    li.style.borderRadius = '5px';
                    li.style.marginLeft = '30px';
                    li.style.marginTop = '5px';
                    
                    const span = document.createElement('span');
                    span.innerText = topicObj.topic;
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.innerText = '🗑️ Eliminar';
                    deleteBtn.className = 'btn small-btn';
                    deleteBtn.style.backgroundColor = '#fee2e2';
                    deleteBtn.style.color = '#ef4444';
                    deleteBtn.style.border = '1px solid #fca5a5';
                    deleteBtn.style.padding = '5px 10px';
                    
                    deleteBtn.onclick = async () => {
                        if(confirm(`¿Estás seguro de eliminar el tema: "${topicObj.topic}"?`)) {
                            deleteBtn.innerText = '⏳...';
                            deleteBtn.disabled = true;
                            try {
                                const delRes = await window.fetchSecure({ 
                                    action: "DELETE_TOPIC", 
                                    subject: topicObj.subject, 
                                    unit: topicObj.unit, 
                                    topic: topicObj.topic 
                                });
                                const delData = await delRes.json();
                                if(delData.success) {
                                    loadTopicsForTeacher();
                                } else {
                                    alert("Error: " + delData.error);
                                }
                            } catch(e) {
                                alert("Error de red");
                            }
                        }
                    };
                    
                    li.appendChild(span);
                    li.appendChild(deleteBtn);
                    listContainer.appendChild(li);
                });
            }
        }
    }
    
    // Listeners para filtros de CMS
    document.getElementById('filter-cms-subject')?.addEventListener('change', renderTeacherTopicsList);
    document.getElementById('filter-cms-unit')?.addEventListener('change', renderTeacherTopicsList);

    // ==========================================
    // RENDERIZAR JERARQUÍA (ESTUDIANTES)
    // ==========================================
    window.appTopics = []; // Caché global de temas para el estudiante
    
    async function loadTopicsForStudent() {
        try {
            const response = await window.fetchSecure({ action: "GET_TOPICS" });
            const data = await response.json();
            if (data.success) {
                window.appTopics = data.topics;
            }
        } catch (error) {
            console.error("Error cargando temas del sistema:", error);
        }
    }

    async function initStudentDashboard() {
        const mapScreen = document.getElementById('map-screen');
        mapScreen.classList.add('active');
        
        await loadTopicsForStudent();
        
        const selSubject = document.getElementById('map-sel-subject');
        const selUnit = document.getElementById('map-sel-unit');
        
        if (window.appTopics.length === 0) {
            selSubject.innerHTML = '<option value="">Sin Materias</option>';
            selUnit.innerHTML = '<option value="">Sin Unidades</option>';
            document.getElementById('dynamic-map').innerHTML = '<p style="text-align:center; color:white; font-size:1.2rem;">Aún no hay aventuras disponibles.</p>';
            return;
        }

        const subjectsSet = Array.from(new Set(window.appTopics.map(t => t.subject)));
        
        selSubject.innerHTML = subjectsSet.map(s => `<option value="${s}">${s}</option>`).join('');
        
        selSubject.onchange = () => {
            const currentSubject = selSubject.value;
            const unitsSet = Array.from(new Set(window.appTopics.filter(t => t.subject === currentSubject).map(t => t.unit)));
            selUnit.innerHTML = unitsSet.map(u => `<option value="${u}">Unidad ${u}</option>`).join('');
            renderMap(currentSubject, selUnit.value);
        };
        
        selUnit.onchange = () => {
            renderMap(selSubject.value, selUnit.value);
        };
        
        // Trigger inicial
        selSubject.onchange();
    }

    function renderMap(subject, unit) {
        const mapContainer = document.getElementById('dynamic-map');
        
        const filteredTopics = window.appTopics.filter(t => t.subject === subject && t.unit === unit);
        
        mapContainer.innerHTML = '';
        if (filteredTopics.length === 0) {
            mapContainer.innerHTML = '<p style="text-align:center; color:white; font-size:1.2rem;">Aún no hay aventuras en esta unidad.</p>';
        } else {
            filteredTopics.forEach((tObj, index) => {
                const btn = document.createElement('button');
                btn.className = 'level-node active';
                btn.innerText = `${index + 1}. ${tObj.topic}`;
                
                btn.addEventListener('click', () => {
                    openLesson(tObj.topic, index + 1, subject, unit);
                });
                mapContainer.appendChild(btn);
            });
        }
        
        // Agregar botón de volver a las unidades
        const backBtn = document.createElement('button');
        backBtn.className = 'btn secondary-btn';
        backBtn.innerText = '⬅️ Volver a Unidades';
        backBtn.style.marginTop = '20px';
        backBtn.onclick = () => {
            mapScreen.classList.remove('active');
            renderUnits(subject);
        };
        mapContainer.appendChild(backBtn);
    }

    let currentChapters = [];
    let currentChapterIndex = 0;
    let currentTopicTitle = "";

    async function openLesson(topicTitle, orderIndex, subject, unit) {
        document.getElementById('map-screen').classList.remove('active');
        const lessonScreen = document.getElementById('lesson-screen');
        lessonScreen.classList.add('active');
        
        currentTopicTitle = topicTitle;
        currentChapterIndex = 0;
        currentExam = null;
        currentExamIndex = 0;
        examScore = 0;
        examDetails = [];
        
        document.getElementById('lesson-title').innerText = topicTitle;
        document.getElementById('lesson-progress').innerText = "Cargando aventura...";
        document.getElementById('chapter-title').innerText = "¡Preparando la magia!";
        const textElement = document.getElementById('lesson-text');
        textElement.innerText = "✨ El Tutor Mágico está invocando su magia para preparar tu aventura. ¡Espera un momento! ✨";
        
        document.getElementById('game-trivia').style.display = 'none';
        document.getElementById('chapter-success').style.display = 'none';
        document.getElementById('exam-container').style.display = 'none';
        document.getElementById('game-exam').style.display = 'none';
        document.getElementById('exam-results').style.display = 'none';
        document.getElementById('story-box').style.display = 'block';
        
        try {
            const response = await window.fetchSecure({ action: "GENERATE_LESSON", subject: subject, unit: unit, topic: topicTitle });
            const data = await response.json();
            
            if (data.success && data.lesson && data.lesson.chapters) {
                currentChapters = data.lesson.chapters;
                currentExam = data.lesson.exam; // Guardar las preguntas del examen
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
            // Iniciar el examen en lugar de terminar
            if (currentExam && currentExam.length > 0) {
                startExam();
            } else {
                finishLessonWithoutExam();
            }
            return;
        }

        const chapter = currentChapters[currentChapterIndex];
        
        document.getElementById('lesson-progress').innerText = `Capítulo ${currentChapterIndex + 1} de ${currentChapters.length}`;
        document.getElementById('chapter-title').innerText = chapter.title;
        document.getElementById('lesson-text').innerText = chapter.story;
        
        // Reset interfaces de juegos
        document.getElementById('chapter-success').style.display = 'none';
        document.getElementById('game-trivia').style.display = 'none';
        const timelineEl = document.getElementById('game-timeline');
        const memoryEl = document.getElementById('game-memory');
        if (timelineEl) timelineEl.style.display = 'none';
        if (memoryEl) memoryEl.style.display = 'none';
        
        // Backward compatibility: Si no hay gameType o es trivia
        const gType = chapter.gameType || 'trivia';
        
        if (gType === 'trivia') {
            renderTrivia(chapter);
        } else if (gType === 'timeline') {
            renderTimeline(chapter);
        } else if (gType === 'memory') {
            renderMemory(chapter);
        } else {
            renderTrivia(chapter); // Fallback
        }
    }

    // ================== TRIVIA ==================
    function renderTrivia(chapter) {
        document.getElementById('game-trivia').style.display = 'block';
        
        // Backward compatibility (chapter.question o chapter.triviaData.question)
        const qText = chapter.triviaData ? chapter.triviaData.question : chapter.question;
        const correctText = chapter.triviaData ? chapter.triviaData.correct : chapter.correct;
        const wrongText = chapter.triviaData ? chapter.triviaData.wrong : chapter.wrong;
        
        document.getElementById('trivia-question').innerText = qText;
        
        const options = document.getElementById('trivia-options');
        options.innerHTML = '';
        
        const btnCorrect = document.createElement('button');
        btnCorrect.className = 'btn option-btn';
        btnCorrect.innerText = correctText;
        btnCorrect.onclick = () => handleAnswer(true, btnCorrect);

        const btnWrong = document.createElement('button');
        btnWrong.className = 'btn option-btn';
        btnWrong.innerText = wrongText;
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

    // ================== TIMELINE ==================
    function renderTimeline(chapter) {
        const timelineGame = document.getElementById('game-timeline');
        if (!timelineGame) { renderTrivia(chapter); return; } // Fallback
        timelineGame.style.display = 'block';
        
        const container = document.getElementById('timeline-container');
        container.innerHTML = '';
        
        // Obtenemos los eventos (deben ser 3)
        let events = chapter.timelineData || [];
        if (events.length < 3) {
            events = ["Evento antiguo", "Evento medio", "Evento reciente"];
        }
        
        // Guardamos el orden original (correcto)
        const correctOrder = [...events];
        
        // Desordenar
        let shuffled = [...events].sort(() => Math.random() - 0.5);
        
        shuffled.forEach((evText, index) => {
            const div = document.createElement('div');
            div.innerText = evText;
            div.className = 'timeline-item';
            div.draggable = true;
            div.dataset.original = evText;
            div.style.padding = "10px";
            div.style.backgroundColor = "#fff";
            div.style.border = "1px solid #ccc";
            div.style.borderRadius = "8px";
            div.style.cursor = "grab";
            
            // Drag Events
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
                div.style.opacity = '0.5';
            });
            div.addEventListener('dragend', () => div.style.opacity = '1');
            
            div.addEventListener('dragover', (e) => e.preventDefault());
            div.addEventListener('drop', function(e) {
                e.preventDefault();
                const fromIndex = e.dataTransfer.getData('text/plain');
                if (fromIndex === '') return;
                
                // Intercambiar elementos en el DOM
                const fromNode = container.children[fromIndex];
                const toNode = this;
                
                // Si son diferentes, intercambiar
                if (fromNode !== toNode) {
                    const fromText = fromNode.innerText;
                    const fromOriginal = fromNode.dataset.original;
                    
                    fromNode.innerText = toNode.innerText;
                    fromNode.dataset.original = toNode.dataset.original;
                    
                    toNode.innerText = fromText;
                    toNode.dataset.original = fromOriginal;
                }
            });
            
            container.appendChild(div);
        });
        
        const btnCheck = document.getElementById('btn-check-timeline');
        btnCheck.onclick = () => {
            let isCorrect = true;
            Array.from(container.children).forEach((node, idx) => {
                if (node.dataset.original !== correctOrder[idx]) {
                    isCorrect = false;
                }
            });
            handleAnswer(isCorrect, btnCheck);
        };
    }

    // ================== MEMORY ==================
    let flippedCards = [];
    let matchedPairs = 0;
    
    function renderMemory(chapter) {
        const memoryGame = document.getElementById('game-memory');
        if (!memoryGame) { renderTrivia(chapter); return; } // Fallback
        memoryGame.style.display = 'block';
        
        const grid = document.getElementById('memory-grid');
        grid.innerHTML = '';
        
        flippedCards = [];
        matchedPairs = 0;
        
        let pairs = chapter.memoryData || [];
        if (pairs.length < 3) {
            pairs = [["A", "a"], ["B", "b"], ["C", "c"]];
        }
        
        let cardsData = [];
        pairs.forEach((p, index) => {
            cardsData.push({ text: p[0], pairId: index });
            cardsData.push({ text: p[1], pairId: index });
        });
        
        // Shuffle
        cardsData.sort(() => Math.random() - 0.5);
        
        cardsData.forEach(cd => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.pairId = cd.pairId;
            card.style.backgroundColor = 'var(--secondary-color)';
            card.style.color = 'white';
            card.style.padding = '20px 10px';
            card.style.textAlign = 'center';
            card.style.borderRadius = '8px';
            card.style.cursor = 'pointer';
            card.style.fontWeight = 'bold';
            card.style.minHeight = '60px';
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.justifyContent = 'center';
            card.innerText = "?"; // Oculto al inicio
            
            card.onclick = function() {
                if (flippedCards.length < 2 && !card.classList.contains('flipped') && !card.classList.contains('matched')) {
                    card.innerText = cd.text;
                    card.classList.add('flipped');
                    card.style.backgroundColor = 'white';
                    card.style.color = 'var(--text-color)';
                    card.style.border = '2px solid var(--primary-color)';
                    
                    flippedCards.push(card);
                    
                    if (flippedCards.length === 2) {
                        setTimeout(checkMemoryMatch, 1000);
                    }
                }
            };
            grid.appendChild(card);
        });
    }
    
    function checkMemoryMatch() {
        const [c1, c2] = flippedCards;
        if (c1.dataset.pairId === c2.dataset.pairId) {
            c1.classList.add('matched');
            c2.classList.add('matched');
            c1.style.backgroundColor = '#dcfce3';
            c2.style.backgroundColor = '#dcfce3';
            matchedPairs++;
            
            // Total parejas es 3
            if (matchedPairs === 3) {
                // Generar un elemento falso para pasar a handleAnswer
                const fakeBtn = document.createElement('button');
                handleAnswer(true, fakeBtn);
            }
        } else {
            c1.innerText = "?";
            c2.innerText = "?";
            c1.classList.remove('flipped');
            c2.classList.remove('flipped');
            c1.style.backgroundColor = 'var(--secondary-color)';
            c2.style.backgroundColor = 'var(--secondary-color)';
            c1.style.color = 'white';
            c2.style.color = 'white';
            c1.style.border = 'none';
            c2.style.border = 'none';
            
            // Logear error (opcional)
            window.saveLevelProgress(currentTopicTitle + ` (Cap ${currentChapterIndex+1} - Error)`, 0, false);
        }
        flippedCards = [];
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
        document.getElementById('map-screen').classList.add('active');
        
        // Actualizar por si se completó algo
        const selSubject = document.getElementById('map-sel-subject').value;
        const selUnit = document.getElementById('map-sel-unit').value;
        if (selSubject && selUnit) renderMap(selSubject, selUnit);
    });

    // Botón para volver al mapa desde resultados de examen
    document.getElementById('btn-finish-lesson')?.addEventListener('click', () => {
        document.getElementById('lesson-screen').classList.remove('active');
        document.getElementById('exam-results').style.display = 'none';
        document.getElementById('map-screen').classList.add('active');
        
        const selSubject = document.getElementById('map-sel-subject').value;
        const selUnit = document.getElementById('map-sel-unit').value;
        if (selSubject && selUnit) renderMap(selSubject, selUnit);
    });

    // ==========================================
    // LÓGICA DEL EXAMEN FINAL
    // ==========================================
    function finishLessonWithoutExam() {
        document.getElementById('lesson-progress').innerText = "¡Aventura Completada!";
        document.getElementById('chapter-title').innerText = "¡Felicidades, Héroe de la Historia!";
        document.getElementById('lesson-text').innerText = "Has completado esta gran aventura y aprendido muchísimo. El Tutor Mágico está muy orgulloso de ti.";
        document.getElementById('game-trivia').style.display = 'none';
        document.getElementById('chapter-success').style.display = 'none';
        
        const audioCel = document.getElementById('audio-celebration');
        if(audioCel) {
            audioCel.currentTime = 0;
            audioCel.play().catch(e => console.log(e));
        }
    }

    function startExam() {
        document.getElementById('lesson-progress').innerText = "Examen Final";
        document.getElementById('chapter-title').innerText = "Prueba del Tutor Mágico";
        document.getElementById('lesson-text').innerText = "¡Llegó el momento de demostrar lo que aprendiste! Responde las siguientes 5 preguntas para graduarte de esta aventura.";
        
        document.getElementById('game-trivia').style.display = 'none';
        document.getElementById('chapter-success').style.display = 'none';
        document.getElementById('game-exam').style.display = 'block';
        
        renderExamQuestion();
    }

    function renderExamQuestion() {
        if (currentExamIndex >= currentExam.length) {
            finishExam();
            return;
        }

        const questionData = currentExam[currentExamIndex];
        document.getElementById('exam-progress').innerText = `Pregunta ${currentExamIndex + 1} de ${currentExam.length}`;
        document.getElementById('exam-question').innerText = questionData.question;
        
        const optionsContainer = document.getElementById('exam-options');
        optionsContainer.innerHTML = '';
        
        questionData.options.forEach((optText, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn option-btn';
            btn.innerText = optText;
            btn.onclick = () => handleExamAnswer(index === questionData.correctIndex, btn, optText, questionData);
            optionsContainer.appendChild(btn);
        });
    }

    function handleExamAnswer(isCorrect, btnElement, selectedText, questionData) {
        // Deshabilitar botones
        const buttons = document.querySelectorAll('#exam-options .option-btn');
        buttons.forEach(b => b.disabled = true);

        if (isCorrect) {
            btnElement.classList.add('correct');
            examScore += 20; // 5 preguntas = 20 pts c/u
            examDetails.push(`Q${currentExamIndex+1}: ✅ (${selectedText})`);
            const audioCor = document.getElementById('audio-correct');
            if(audioCor) { audioCor.currentTime = 0; audioCor.play().catch(e => console.log(e)); }
        } else {
            btnElement.classList.add('wrong');
            // Resaltar la correcta
            buttons[questionData.correctIndex].classList.add('correct');
            examDetails.push(`Q${currentExamIndex+1}: ❌ (${selectedText})`);
        }

        // Pasar a la siguiente después de 2 segundos
        setTimeout(() => {
            currentExamIndex++;
            renderExamQuestion();
        }, 2000);
    }

    async function finishExam() {
        document.getElementById('game-exam').style.display = 'none';
        document.getElementById('story-box').style.display = 'none';
        document.getElementById('exam-results').style.display = 'block';
        
        document.getElementById('exam-score-text').innerText = `Tu punteo: ${examScore}/100`;
        const feedbackEl = document.getElementById('exam-feedback');
        
        if (examScore >= 60) {
            feedbackEl.innerText = "¡Excelente trabajo! Eres un verdadero maestro en este tema.";
            const audioCel = document.getElementById('audio-celebration');
            if(audioCel) { audioCel.currentTime = 0; audioCel.play().catch(e => console.log(e)); }
        } else {
            feedbackEl.innerText = "Buen intento, pero debes prestar más atención a las historias la próxima vez.";
        }

        // Guardar progreso del examen
        try {
            await window.fetchSecure({ 
                action: "SAVE_EXAM", 
                topic: currentTopicTitle,
                score: examScore,
                details: examDetails.join(" | ")
            });
        } catch(e) {
            console.error("No se pudo guardar el examen", e);
        }
    }

    // Lógica de Tabs para el Dashboard del Maestro
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    async function loadTeacherDashboard() {
        if(window.loadTopicsForTeacher) await window.loadTopicsForTeacher();
        
        const tbody = document.getElementById('dashboard-topics-body');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Cargando analíticas...</td></tr>';
        
        try {
            const analytics = await window.getAllStudentsAnalytics();
            window.teacherAnalyticsContext = analytics; // Contexto para el Tutor IA
            
            // Llenar selectores del Dashboard si no lo están
            const subjectsSet = new Set();
            const unitsSet = new Set();
            window.allTeacherTopics.forEach(t => {
                subjectsSet.add(t.subject);
                unitsSet.add(t.unit);
            });
            
            const filterDashSubject = document.getElementById('filter-dashboard-subject');
            const filterDashUnit = document.getElementById('filter-dashboard-unit');
            if(filterDashSubject && filterDashSubject.options.length <= 1) {
                filterDashSubject.innerHTML = '<option value="ALL">Todas las Materias</option>' + Array.from(subjectsSet).map(s => `<option value="${s}">${s}</option>`).join('');
            }
            if(filterDashUnit && filterDashUnit.options.length <= 1) {
                filterDashUnit.innerHTML = '<option value="ALL">Todas las Unidades</option>' + Array.from(unitsSet).map(u => `<option value="${u}">${u}</option>`).join('');
            }
            
            const selSubj = filterDashSubject ? filterDashSubject.value : 'ALL';
            const selUn = filterDashUnit ? filterDashUnit.value : 'ALL';
            
            let globalScoreSum = 0;
            let globalActivitiesCount = 0;
            let studentAverages = {};
            let aggregatedData = {}; // { 'username_topicName': { student, topic, sum, count, isBad } }
            
            // Agrupación
            analytics.forEach(student => {
                const sName = student.name || student.username;
                let studentScoreSum = 0;
                let studentCount = 0;
                
                student.progress.forEach(p => {
                    // Limpiar el topicName de " (Cap X)"
                    let topicClean = p.levelId.replace(/\s*\(Cap.*?\)\s*/, '');
                    
                    // Buscar a qué materia/unidad pertenece
                    const topicMeta = window.allTeacherTopics.find(t => t.topic === topicClean);
                    if(topicMeta) {
                        if(selSubj !== 'ALL' && topicMeta.subject !== selSubj) return;
                        if(selUn !== 'ALL' && topicMeta.unit !== selUn) return;
                    }
                    
                    const key = `${student.username}_${topicClean}`;
                    if(!aggregatedData[key]) {
                        aggregatedData[key] = { studentName: sName, topic: topicClean, sum: 0, count: 0 };
                    }
                    aggregatedData[key].sum += p.score;
                    aggregatedData[key].count++;
                    
                    globalScoreSum += p.score;
                    globalActivitiesCount++;
                    studentScoreSum += p.score;
                    studentCount++;
                });
                
                if (studentCount > 0) {
                    studentAverages[sName] = studentScoreSum / studentCount;
                }
            });
            
            // Cálculos Finales y Llenado de UI
            const avgGlobal = globalActivitiesCount === 0 ? 0 : Math.round(globalScoreSum / globalActivitiesCount);
            document.getElementById('stat-avg').innerText = avgGlobal + '%';
            document.getElementById('stat-exams').innerText = globalActivitiesCount;
            
            // Mejor Alumno
            let bestStudent = '--';
            let bestAvg = -1;
            for (let s in studentAverages) {
                if(studentAverages[s] > bestAvg) {
                    bestAvg = studentAverages[s];
                    bestStudent = s;
                }
            }
            document.getElementById('stat-top-student').innerText = bestAvg >= 0 ? `${bestStudent} (${Math.round(bestAvg)}%)` : '--';
            
            // Tabla y Sugerencias
            if (Object.keys(aggregatedData).length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hay actividades para los filtros seleccionados.</td></tr>';
                document.getElementById('stat-review').innerText = 'Ninguna de momento.';
                return;
            }
            
            tbody.innerHTML = '';
            let reviewsNeeded = [];
            
            for (let key in aggregatedData) {
                let d = aggregatedData[key];
                let avg = Math.round(d.sum / d.count);
                let statusIcon = avg >= 80 ? '🌟 Excelente' : (avg >= 60 ? '👍 Bueno' : '⚠️ Necesita Repaso');
                let color = avg >= 80 ? 'green' : (avg >= 60 ? 'black' : 'red');
                
                if (avg < 60) {
                    reviewsNeeded.push(`${d.studentName} en ${d.topic}`);
                }
                
                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid #e2e8f0";
                tr.innerHTML = `
                    <td style="padding: 12px;"><strong>${d.studentName}</strong></td>
                    <td style="padding: 12px;">${d.topic}</td>
                    <td style="padding: 12px; font-size: 0.9rem;">${d.count} actividades</td>
                    <td style="padding: 12px; font-weight: bold; color: ${color};">${avg}%</td>
                    <td style="padding: 12px; font-size: 0.85rem; color: ${color};">${statusIcon}</td>
                `;
                tbody.appendChild(tr);
            }
            
            // Render Sugerencias
            const reviewWidget = document.getElementById('stat-review');
            if (reviewsNeeded.length > 0) {
                reviewWidget.innerHTML = reviewsNeeded.join("<br>");
                reviewWidget.style.color = "#991b1b";
            } else {
                reviewWidget.innerText = "¡Todos van al día! 🎉";
                reviewWidget.style.color = "#166534"; // Verde
            }
            
        } catch(error) {
            console.error("Error cargando dashboard analítico:", error);
            tbody.innerHTML = `<tr><td colspan="5" style="color: red; text-align: center; padding: 20px;">Error cargando datos: ${error.message}</td></tr>`;
        }
    }
    
    // Listeners para filtros de Dashboard
    document.getElementById('filter-dashboard-subject')?.addEventListener('change', () => {
        const filterDashSubject = document.getElementById('filter-dashboard-subject');
        const filterDashUnit = document.getElementById('filter-dashboard-unit');
        
        // Si cambio materia, podriamos resetear unidad (opcional)
        // filterDashUnit.value = 'ALL';
        
        loadTeacherDashboard();
    });
    document.getElementById('filter-dashboard-unit')?.addEventListener('change', loadTeacherDashboard);

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
            document.getElementById('map-screen').classList.add('active');
            
            const selSubject = document.getElementById('map-sel-subject').value;
            const selUnit = document.getElementById('map-sel-unit').value;
            if (selSubject && selUnit) renderMap(selSubject, selUnit);
        });
    }



});
