document.addEventListener('DOMContentLoaded', () => {
        lucide.createIcons();

        // --- STATE MANAGEMENT ---
        let userDashboard = {
            enrolledCourses: []
        };
        let currentGeneratedCourse = null;
        let lessonsCompleted = new Set(); // To track completed quizzes for progress

        // --- DOM ELEMENTS ---
        const generatorScreen = document.getElementById('generator-screen');
        const dashboardScreen = document.getElementById('dashboard-screen');
        const showGeneratorBtn = document.getElementById('show-generator-btn');
        const showDashboardBtn = document.getElementById('show-dashboard-btn');
        const topicInput = document.getElementById('topic-input');
        const generateCourseBtn = document.getElementById('generate-course-btn');
        const generatorLoading = document.getElementById('generator-loading');
        const courseOutput = document.getElementById('course-output');
        const courseTitle = document.getElementById('course-title');
        const courseDescription = document.getElementById('course-description');
        const modulesContainer = document.getElementById('modules-container');
        const addCourseBtn = document.getElementById('add-course-btn');
        const dashboardContent = document.getElementById('dashboard-content');
        
        // --- NOTIFICATION ---
        function showToast(message, isError = false) {
            const toastContainer = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${isError ? 'bg-red-500' : 'bg-green-600'}`;
            toast.textContent = message;
            toastContainer.appendChild(toast);
            
            // Trigger the animation
            setTimeout(() => toast.classList.add('show'), 100);

            // Hide the toast after 3 seconds
            setTimeout(() => {
                toast.classList.remove('show');
                // Remove the element after the transition ends
                toast.addEventListener('transitionend', () => toast.remove());
            }, 3000);
        }

        // --- NAVIGATION ---
        showGeneratorBtn.addEventListener('click', () => switchView('generator'));
        showDashboardBtn.addEventListener('click', () => switchView('dashboard'));

        function switchView(view) {
            if (view === 'generator') {
                dashboardScreen.classList.add('hidden');
                generatorScreen.classList.remove('hidden');
                showGeneratorBtn.classList.add('text-indigo-600', 'border-indigo-600');
                showGeneratorBtn.classList.remove('text-gray-500');
                showDashboardBtn.classList.add('text-gray-500');
                showDashboardBtn.classList.remove('text-indigo-600', 'border-indigo-600');
            } else {
                generatorScreen.classList.add('hidden');
                dashboardScreen.classList.remove('hidden');
                showDashboardBtn.classList.add('text-indigo-600', 'border-indigo-600');
                showDashboardBtn.classList.remove('text-gray-500');
                showGeneratorBtn.classList.add('text-gray-500');
                showGeneratorBtn.classList.remove('text-indigo-600', 'border-indigo-600');
                renderDashboard();
            }
        }
        
        // --- API CALLER ---
        async function callGenerativeAI(prompt, jsonSchema = null) {
            // NOTE: The API Key should not be stored in client-side code in a real app.
            // This is left empty for demonstration purposes.
            const apiKey = "AIzaSyByFY1RgqBXKEi5LvOgYHJrAYoderWvXA0"; // <-- PASTE YOUR GEMINI API KEY HERE
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
            };

            if (jsonSchema) {
                payload.generationConfig = {
                    responseMimeType: "application/json",
                    responseSchema: jsonSchema
                }
            }

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    throw new Error(`API Error: ${response.statusText}`);
                }
                const data = await response.json();
                const text = data.candidates[0].content.parts[0].text;
                
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error("Failed to parse JSON from AI response:", text);
                    return { error: "AI returned invalid data.", content: text };
                }
            } catch (error) {
                console.error("AI Generation Failed:", error);
                showToast("Error generating AI content. Check console for details.", true);
                return null;
            }
        }

        // --- COURSE GENERATION ---
        generateCourseBtn.addEventListener('click', async () => {
            const topic = topicInput.value.trim();
            if (!topic) return;
            
            courseOutput.classList.add('hidden');
            generatorLoading.classList.remove('hidden');
            generateCourseBtn.disabled = true;

            const prompt = `Create a detailed course structure for the topic: "${topic}". The course should have a title, a short description, and exactly 3 modules. Each module must have a title and a list of 3 specific lesson topics. For each lesson, also provide a relevant YouTube search query.`;
            const schema = {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" },
                    description: { type: "STRING" },
                    modules: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                title: { type: "STRING" },
                                lessons: {
                                    type: "ARRAY",
                                    items: {
                                        type: "OBJECT",
                                        properties: {
                                            topic: { type: "STRING" },
                                            youtubeSearchQuery: { type: "STRING" }
                                        },
                                        required: ["topic", "youtubeSearchQuery"]
                                    }
                                }
                            },
                            required: ["title", "lessons"]
                        }
                    }
                },
                required: ["title", "description", "modules"]
            };

            const courseData = await callGenerativeAI(prompt, schema);
            
            generatorLoading.classList.add('hidden');
            generateCourseBtn.disabled = false;
            if (courseData && !courseData.error) {
                const totalLessons = courseData.modules.reduce((acc, module) => acc + module.lessons.length, 0);
                currentGeneratedCourse = { ...courseData, id: Date.now(), progress: 0, totalLessons: totalLessons };
                displayGeneratedCourse(currentGeneratedCourse);
            }
        });

        function displayGeneratedCourse(data) {
            courseTitle.textContent = data.title;
            courseDescription.textContent = data.description;
            modulesContainer.innerHTML = '';
            lessonsCompleted.clear(); // Reset progress for the new course

            data.modules.forEach((module, moduleIndex) => {
                const moduleEl = document.createElement('div');
                moduleEl.className = 'p-6 bg-slate-50 border border-slate-200 rounded-lg';
                let lessonsHtml = module.lessons.map((lesson, lessonIndex) => {
                    const lessonId = `${moduleIndex}-${lessonIndex}`;
                    return `
                        <div class="p-4 bg-white rounded-md border" data-lesson-id="${lessonId}">
                            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                <div class="mb-3 sm:mb-0">
                                    <p class="font-semibold text-gray-800">${lesson.topic}</p>
                                    <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(lesson.youtubeSearchQuery)}" target="_blank" class="text-sm text-indigo-500 hover:underline flex items-center gap-1 mt-1">
                                        <i data-lucide="youtube" class="w-4 h-4"></i> Watch on YouTube
                                    </a>
                                </div>
                                <button data-lesson-topic="${lesson.topic}" data-lesson-id="${lessonId}" class="generate-quiz-btn w-full sm:w-auto bg-white text-indigo-600 font-semibold px-4 py-2 rounded-lg border-2 border-indigo-600 hover:bg-indigo-50 text-sm">
                                    Take Quiz
                                </button>
                            </div>
                            <div class="quiz-container mt-4 hidden"></div>
                        </div>
                    `;
                }).join('<div class="my-4"></div>');

                moduleEl.innerHTML = `
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Module ${moduleIndex + 1}: ${module.title}</h3>
                    <div class="space-y-4">${lessonsHtml}</div>
                `;
                modulesContainer.appendChild(moduleEl);
            });

            courseOutput.classList.remove('hidden');
            lucide.createIcons();
            document.querySelectorAll('.generate-quiz-btn').forEach(btn => btn.addEventListener('click', handleQuizGeneration));
        }

        // --- QUIZ GENERATION & HANDLING ---
        async function handleQuizGeneration(event) {
            const btn = event.currentTarget;
            const topic = btn.dataset.lessonTopic;
            const lessonId = btn.dataset.lessonId;
            const quizContainer = document.querySelector(`[data-lesson-id="${lessonId}"] .quiz-container`);

            quizContainer.classList.toggle('hidden');
            if (!quizContainer.classList.contains('hidden')) {
                 quizContainer.innerHTML = `<div class="flex items-center"><div class="loader !w-6 !h-6"></div><p class="ml-3 text-sm text-gray-500">Generating quiz...</p></div>`;
                btn.textContent = 'Hide Quiz';
                
                const prompt = `Generate a 3-question multiple-choice quiz on the topic: "${topic}". Each question should have 4 options. The correct answer must be one of the options.`;
                const schema = {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            question: { type: "STRING" },
                            options: { type: "ARRAY", items: { type: "STRING" } },
                            correctAnswer: { type: "STRING", description: "The full text of the correct option" }
                        },
                        required: ["question", "options", "correctAnswer"]
                    }
                };
                const quizData = await callGenerativeAI(prompt, schema);

                if (quizData && !quizData.error) {
                    displayQuiz(quizContainer, quizData, topic, lessonId);
                } else {
                    quizContainer.innerHTML = `<p class="text-red-500">Failed to generate quiz.</p>`;
                }
            } else {
                btn.textContent = 'Take Quiz';
            }
        }
        
        function displayQuiz(container, quizData, topic, lessonId) {
            let quizHtml = `<h4 class="font-bold text-gray-700 mb-3">Quiz: ${topic}</h4><form>`;
            quizData.forEach((q, index) => {
                quizHtml += `
                    <div class="mb-4">
                        <p class="font-semibold text-gray-800">${index + 1}. ${q.question}</p>
                        <div class="mt-2 space-y-1">
                            ${q.options.map(opt => `
                                <label class="flex items-center p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                    <input type="radio" name="question-${index}" value="${opt.replace(/"/g, '&quot;')}" class="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500">
                                    <span class="ml-3 text-gray-700">${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
            quizHtml += `<button type="submit" class="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700">Submit Quiz</button></form><div class="quiz-result mt-4"></div>`;
            container.innerHTML = quizHtml;
            container.querySelector('form').addEventListener('submit', (e) => handleSubmitQuiz(e, quizData, lessonId));
        }

        function handleSubmitQuiz(event, quizData, lessonId) {
            event.preventDefault();
            const form = event.target;
            const resultContainer = form.nextElementSibling;
            let score = 0;
            
            quizData.forEach((q, index) => {
                const selected = form.querySelector(`input[name="question-${index}"]:checked`);
                if (selected && selected.value === q.correctAnswer) {
                    score++;
                }
            });

            const percentage = Math.round((score / quizData.length) * 100);
            resultContainer.innerHTML = `<p class="font-bold">Your score: ${percentage}% (${score}/${quizData.length})</p>`;
            
            // Disable form after submission
            form.querySelectorAll('input, button').forEach(el => el.disabled = true);
            
            // Update progress
            if (percentage >= 50 && !lessonsCompleted.has(lessonId)) {
                lessonsCompleted.add(lessonId);
                updateCourseProgress();
            }
        }
        
        function updateCourseProgress() {
            if (!currentGeneratedCourse) return;
            const progress = Math.round((lessonsCompleted.size / currentGeneratedCourse.totalLessons) * 100);
            currentGeneratedCourse.progress = progress;
            
            // If the course is already on the dashboard, update it there too
            const enrolled = userDashboard.enrolledCourses.find(c => c.id === currentGeneratedCourse.id);
            if (enrolled) {
                enrolled.progress = progress;
                renderDashboard();
            }
        }
        
        // --- DASHBOARD ---
        addCourseBtn.addEventListener('click', () => {
            if (currentGeneratedCourse && !userDashboard.enrolledCourses.find(c => c.id === currentGeneratedCourse.id)) {
                userDashboard.enrolledCourses.push(currentGeneratedCourse);
                showToast(`"${currentGeneratedCourse.title}" has been added to your dashboard!`);
                switchView('dashboard');
            } else if (currentGeneratedCourse) {
                showToast("You have already added this course.", true);
            }
        });

        function renderDashboard() {
            if (userDashboard.enrolledCourses.length === 0) {
                dashboardContent.innerHTML = `<p class="text-gray-500">Your enrolled courses will appear here. Go to "Create Course" to generate and add a new course!</p>`;
                return;
            }

            dashboardContent.innerHTML = '';
            userDashboard.enrolledCourses.forEach(course => {
                const courseEl = document.createElement('div');
                courseEl.className = 'p-6 bg-slate-50 border rounded-lg';
                courseEl.innerHTML = `
                    <h3 class="text-2xl font-bold text-gray-800">${course.title}</h3>
                    <p class="text-gray-600 mt-1">${course.description}</p>
                    <div class="mt-4">
                        <p class="text-sm font-semibold text-gray-700 mb-1">Overall Progress: ${course.progress}%</p>
                        <div class="w-full progress-bar-bg rounded-full h-2.5">
                            <div class="progress-bar-fill h-2.5 rounded-full" style="width: ${course.progress}%"></div>
                        </div>
                    </div>
                `;
                dashboardContent.appendChild(courseEl);
            });
        }
    });