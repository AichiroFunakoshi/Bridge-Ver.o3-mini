// Real-time Voice Translator - JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Default API Keys
    const DEFAULT_OPENAI_API_KEY = '';
    
    // API Key storage
    let OPENAI_API_KEY = '';
    
    // DOM Elements
    const startJapaneseBtn = document.getElementById('startJapaneseBtn');
    const startEnglishBtn = document.getElementById('startEnglishBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resetBtn = document.getElementById('resetBtn');
    const status = document.getElementById('status');
    const errorMessage = document.getElementById('errorMessage');
    const originalText = document.getElementById('originalText');
    const translatedText = document.getElementById('translatedText');
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');
    const apiModal = document.getElementById('apiModal');
    const settingsButton = document.getElementById('settingsButton');
    const openaiKeyInput = document.getElementById('openaiKey');
    const saveApiKeysBtn = document.getElementById('saveApiKeys');
    const resetKeysBtn = document.getElementById('resetKeys');
    const listeningIndicator = document.getElementById('listeningIndicator');
    const translatingIndicator = document.getElementById('translatingIndicator');
    const fontSizeSmallBtn = document.getElementById('fontSizeSmall');
    const fontSizeMediumBtn = document.getElementById('fontSizeMedium');
    const fontSizeLargeBtn = document.getElementById('fontSizeLarge');
    const fontSizeXLargeBtn = document.getElementById('fontSizeXLarge');
    
    // Speech recognition variables
    let recognition = null;
    let isRecording = false;
    let currentTranslationController = null;
    let translationInProgress = false;
    let selectedLanguage = ''; // 'ja' for Japanese, 'en' for English
    let lastTranslationTime = 0;
    
    // 重複防止のための変数
    let processedResultIds = new Set(); // 処理済みの結果IDを追跡
    let lastTranslatedText = ''; // 最後に翻訳した内容を記録
    let translationDebounceTimer = null;

    // 日本語文字起こしの整形に使用する変数と関数
    let japaneseFormatter = {
        // 文章の最後に句点を追加する
        addPeriod: function(text) {
            if (text && !text.endsWith("。") && !text.endsWith(".") && !text.endsWith("？") && !text.endsWith("?") && !text.endsWith("！") && !text.endsWith("!")) {
                return text + "。";
            }
            return text;
        },
        
        // 適切な位置に読点を追加する
        addCommas: function(text) {
            // 文中の自然な区切りに読点を追加する簡易的なルール
            // 接続詞や特定のパターンの後に読点を追加
            const patterns = [
                { search: /([^、。])そして/g, replace: "$1、そして" },
                { search: /([^、。])しかし/g, replace: "$1、しかし" },
                { search: /([^、。])ですが/g, replace: "$1、ですが" },
                { search: /([^、。])また/g, replace: "$1、また" },
                { search: /([^、。])けれども/g, replace: "$1、けれども" },
                { search: /([^、。])だから/g, replace: "$1、だから" },
                { search: /([^、。])ので/g, replace: "$1、ので" },
                // 文が長い場合、適度に区切る
                { search: /(.{10,})から(.{10,})/g, replace: "$1から、$2" },
                { search: /(.{10,})ので(.{10,})/g, replace: "$1ので、$2" },
                { search: /(.{10,})けど(.{10,})/g, replace: "$1けど、$2" }
            ];
            
            let result = text;
            for (const pattern of patterns) {
                result = result.replace(pattern.search, pattern.replace);
            }
            
            return result;
        },
        
        // 文章全体を整形する
        format: function(text) {
            if (!text || text.trim().length === 0) return text;
            
            let formatted = text;
            // まず読点を追加
            formatted = this.addCommas(formatted);
            // 次に文末に句点を追加
            formatted = this.addPeriod(formatted);
            
            return formatted;
        }
    };
    
    // Load API keys
    function loadApiKeys() {
        const storedOpenaiKey = localStorage.getItem('translatorOpenaiKey');
        
        OPENAI_API_KEY = storedOpenaiKey ? storedOpenaiKey.trim() : '';
        
        if (!OPENAI_API_KEY) {
            openaiKeyInput.value = DEFAULT_OPENAI_API_KEY;
            apiModal.style.display = 'flex';
        } else {
            initializeApp();
        }
    }
    
    // Save API keys
    saveApiKeysBtn.addEventListener('click', () => {
        const openaiKey = openaiKeyInput.value.trim();
        
        if (!openaiKey) {
            alert('Please enter your OpenAI API key.');
            return;
        }
        
        // APIキーを保存する前に不要なスペースを確実に削除
        localStorage.setItem('translatorOpenaiKey', openaiKey.trim());
        
        OPENAI_API_KEY = openaiKey.trim();
        
        apiModal.style.display = 'none';
        initializeApp();
    });
    
    // Open settings modal
    settingsButton.addEventListener('click', () => {
        openaiKeyInput.value = OPENAI_API_KEY;
        apiModal.style.display = 'flex';
    });
    
    // Reset API keys
    resetKeysBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset your API key?')) {
            localStorage.removeItem('translatorOpenaiKey');
            location.reload();
        }
    });
    
    // Close modal when clicking outside
    apiModal.addEventListener('click', (e) => {
        if (e.target === apiModal) {
            apiModal.style.display = 'none';
        }
    });
    
    // フォントサイズ変更関数
    function changeFontSize(size) {
        // すべてのサイズクラスを削除
        originalText.classList.remove('size-small', 'size-medium', 'size-large', 'size-xlarge');
        translatedText.classList.remove('size-small', 'size-medium', 'size-large', 'size-xlarge');
        
        // 選択されたサイズクラスを追加
        originalText.classList.add(`size-${size}`);
        translatedText.classList.add(`size-${size}`);
        
        // ローカルストレージに保存してユーザー設定を記憶
        localStorage.setItem('translatorFontSize', size);
    }
    
    // Initialize the app
    function initializeApp() {
        // Clear any previous error messages
        errorMessage.textContent = '';
        
        // Check if Web Speech API is supported
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setupSpeechRecognition();
        } else {
            status.textContent = 'Speech recognition not supported in this browser.';
            status.classList.remove('idle');
            status.classList.add('error');
            errorMessage.textContent = 'Your browser does not support speech recognition. Please try using Chrome, Safari or Edge.';
            return;
        }
        
        // Enable language buttons
        startJapaneseBtn.addEventListener('click', () => startRecording('ja'));
        startEnglishBtn.addEventListener('click', () => startRecording('en'));
        stopBtn.addEventListener('click', stopRecording);
        resetBtn.addEventListener('click', resetContent);
        
        // フォントサイズ変更ボタンの設定
        fontSizeSmallBtn.addEventListener('click', () => changeFontSize('small'));
        fontSizeMediumBtn.addEventListener('click', () => changeFontSize('medium'));
        fontSizeLargeBtn.addEventListener('click', () => changeFontSize('large'));
        fontSizeXLargeBtn.addEventListener('click', () => changeFontSize('xlarge'));
        
        // 保存されたフォントサイズ設定があれば適用
        const savedFontSize = localStorage.getItem('translatorFontSize') || 'medium';
        changeFontSize(savedFontSize);
        
        // Translation system prompt
        window.SYSTEM_PROMPT = `You are a professional simultaneous interpreter with expertise in Japanese and English. 
Your task is to transform and translate the audio input data into readable text according to these rules:

1. If the source text is Japanese, translate it to English.
2. If the source text is English, translate it to Japanese.
3. Remove fillers (um, uh, etc.) and redundant expressions.
4. When there is missing data, supplement based on context.
5. Preserve specialized terms, names, and cultural references accurately.
6. Make the output natural and conversational.
7. Respond ONLY with the translation, no explanations.`;
    }
    
    // Reset content button function
    function resetContent() {
        // リセット処理
        processedResultIds.clear();
        lastTranslatedText = '';
        originalText.textContent = '';
        translatedText.textContent = '';
        
        // ステータス表示も更新
        status.textContent = 'Ready';
        status.classList.remove('recording', 'processing', 'error');
        status.classList.add('idle');
        
        errorMessage.textContent = '';
        
        console.log('Content reset completed');
    }
    
    // Set up speech recognition
    function setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            status.textContent = 'Speech recognition not supported in this browser.';
            status.classList.remove('idle');
            status.classList.add('error');
            errorMessage.textContent = 'Your browser does not support speech recognition. Please try using Chrome, Safari or Edge.';
            return;
        }
        
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        
        recognition.onstart = function() {
            console.log('Speech recognition started with language:', recognition.lang);
            listeningIndicator.classList.add('visible');
        };
        
        recognition.onend = function() {
            console.log('Speech recognition ended');
            listeningIndicator.classList.remove('visible');
            
            // If we're supposed to be recording, restart recognition
            if (isRecording) {
                try {
                    recognition.start();
                } catch (e) {
                    console.error('Failed to restart recognition', e);
                }
            }
        };
        
        // 音声認識結果の処理 - リアルタイム翻訳強化版
        recognition.onresult = function(event) {
            // 現在の文字起こし内容を構築
            let interimText = '';
            let finalText = '';
            let hasNewContent = false;
            
            // 各認識結果に対して処理
            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript.trim();
                
                // 各結果に一意のIDを生成（位置＋内容）
                const resultId = `${i}-${transcript}`;
                
                // 確定した結果の場合
                if (result.isFinal) {
                    // まだ処理していない結果の場合のみ追加
                    if (!processedResultIds.has(resultId)) {
                        processedResultIds.add(resultId);
                        hasNewContent = true;
                        
                        // 日本語入力の場合、文章を整形
                        if (selectedLanguage === 'ja') {
                            finalText += japaneseFormatter.format(transcript) + ' ';
                        } else {
                            finalText += transcript + ' ';
                        }
                    } else {
                        // 処理済みの確定結果も表示用には追加
                        finalText += transcript + ' ';
                    }
                } else {
                    // 暫定結果
                    interimText += transcript + ' ';
                    hasNewContent = true;
                }
            }
            
            // 表示テキスト (確定結果 + 暫定結果)
            const displayText = (finalText + interimText).trim();
            
            // UIを更新
            originalText.textContent = displayText;
            
            // 言語インジケータを更新
            if (selectedLanguage === 'ja') {
                sourceLanguage.textContent = 'Japanese';
                targetLanguage.textContent = 'English';
            } else {
                sourceLanguage.textContent = 'English';
                targetLanguage.textContent = 'Japanese';
            }
            
            // 新しいコンテンツがある場合、翻訳をトリガー
            if (hasNewContent && displayText !== lastTranslatedText) {
                // 翻訳処理をデバウンス（短時間に複数回呼ばれるのを防止）
                clearTimeout(translationDebounceTimer);
                translationDebounceTimer = setTimeout(() => {
                    lastTranslatedText = displayText;
                    translateText(displayText);
                }, 500); // 0.5秒のデバウンス（精度と速度のバランス）
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Recognition error', event.error);
            
            if (event.error === 'no-speech') {
                // No speech detected - this is normal
            } else if (event.error === 'audio-capture') {
                status.textContent = 'No microphone detected';
                status.classList.remove('idle', 'recording');
                status.classList.add('error');
                errorMessage.textContent = 'Could not detect a microphone. Please check your device settings.';
                stopRecording();
            } else if (event.error === 'not-allowed') {
                status.textContent = 'Microphone permission denied';
                status.classList.remove('idle', 'recording');
                status.classList.add('error');
                errorMessage.textContent = 'Microphone access was denied. Please allow microphone access in your browser settings.';
                stopRecording();
            }
        };
    }
    
    // Toggle button visibility for recording state
    function updateButtonVisibility(isRecordingState) {
        if (isRecordingState) {
            // Hide start buttons, show stop button
            startJapaneseBtn.style.display = 'none';
            startEnglishBtn.style.display = 'none';
            stopBtn.style.display = 'flex';
            stopBtn.disabled = false;
            resetBtn.disabled = true; // 録音中はリセット無効化
            resetBtn.style.opacity = '0.5';
        } else {
            // Show start buttons, hide stop button
            startJapaneseBtn.style.display = 'flex';
            startEnglishBtn.style.display = 'flex';
            startJapaneseBtn.disabled = false;
            startEnglishBtn.disabled = false;
            stopBtn.style.display = 'none';
            stopBtn.disabled = true;
            resetBtn.disabled = false; // 録音停止中はリセット有効化
            resetBtn.style.opacity = '1';
        }
    }
    
    // Start recording with specified language
    async function startRecording(language) {
        // Clear any previous error messages
        errorMessage.textContent = '';
        
        // Set the selected language
        selectedLanguage = language;
        
        // Reset UI and variables
        processedResultIds.clear();
        lastTranslatedText = '';
        originalText.textContent = '';
        translatedText.textContent = '';
        
        // Update language indicators
        if (language === 'ja') {
            sourceLanguage.textContent = 'Japanese';
            targetLanguage.textContent = 'English';
        } else {
            sourceLanguage.textContent = 'English';
            targetLanguage.textContent = 'Japanese';
        }
        
        // Update UI
        isRecording = true;
        document.body.classList.add('recording');
        status.textContent = 'Recording';
        status.classList.remove('idle', 'error');
        status.classList.add('recording');
        
        // Update button visibility - hide start buttons, show stop button
        updateButtonVisibility(true);
        
        // Using Web Speech API with explicitly set language
        try {
            // Set the language for recognition
            recognition.lang = language === 'ja' ? 'ja-JP' : 'en-US';
            recognition.start();
        } catch (e) {
            console.error('Error starting recognition', e);
            errorMessage.textContent = 'Failed to start speech recognition: ' + e.message;
            stopRecording();
        }
    }
    
    // Stop recording
    function stopRecording() {
        isRecording = false;
        document.body.classList.remove('recording');
        status.textContent = 'Processing';
        status.classList.remove('recording');
        status.classList.add('processing');
        
        // Update button visibility - show start buttons, hide stop button
        updateButtonVisibility(false);
        
        try {
            recognition.stop();
        } catch (e) {
            console.error('Error stopping recognition', e);
        }
        
        // Update status after processing
        setTimeout(() => {
            status.textContent = 'Ready';
            status.classList.remove('processing');
            status.classList.add('idle');
        }, 1000);
        
        console.log('Recording stopped');
    }
    
    // Translate text using OpenAI API with o3-mini model
    async function translateText(text) {
        // 翻訳処理の実行条件をチェック
        if (!text || !text.trim()) {
            console.log('Translation skipped: empty text');
            return;
        }
        
        // 既に翻訳中の場合は新しいリクエストで上書き
        if (translationInProgress) {
            // 既存のリクエストを中断
            if (currentTranslationController) {
                currentTranslationController.abort();
                currentTranslationController = null;
            }
        }
        
        translationInProgress = true;
        lastTranslationTime = Date.now();
        translatingIndicator.classList.add('visible');
        
        // Clear any previous error messages
        errorMessage.textContent = '';
        
        try {
            // Determine source language based on the selected language button
            const sourceLanguageStr = selectedLanguage === 'ja' ? 'Japanese' : 'English';
            
            // Create new abort controller
            currentTranslationController = new AbortController();
            const signal = currentTranslationController.signal;
            
            console.log(`Translating text (${text.length} chars): "${text.substring(0, 30)}..."`);
            
            // Create OpenAI request with o3-mini model
            const translationPayload = {
                model: "o3-mini",  // specifically using o3-mini as required
                messages: [
                    {
                        role: "developer",
                        content: window.SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: `Translate this ${sourceLanguageStr} text:\n\n${text}`
                    }
                ],
                stream: true,  // Enable streaming for real-time response
                reasoning_effort: "medium"  // 翻訳精度とリアルタイム性のバランス
            };
            
            console.log('Sending translation request to OpenAI API...');
            
            // Request translation
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + OPENAI_API_KEY.trim()
                },
                body: JSON.stringify(translationPayload),
                signal: signal
            });
            
            if (!response.ok) {
                let errorData = null;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: { message: `HTTP error: ${response.status}` } };
                }
                
                console.error('OpenAI API error:', errorData);
                throw new Error(errorData.error?.message || `OpenAI API returned status: ${response.status}`);
            }
            
            console.log('Translation stream started');
            
            // Process the streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let translationResult = '';
            
            // 新しい翻訳開始時は以前の内容をクリア
            translatedText.textContent = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Decode the chunk
                const chunk = decoder.decode(value);
                
                // Process each line from the chunk
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                                const content = data.choices[0].delta.content;
                                translationResult += content;
                                translatedText.textContent = translationResult;
                            }
                        } catch (e) {
                            console.error('Error parsing streaming response:', e);
                        }
                    }
                }
            }
            
            console.log('Translation completed successfully');
            
            // Ensure the current controller is reset
            currentTranslationController = null;
            
        } catch (error) {
            // Ignore abort errors
            if (error.name === 'AbortError') {
                console.log('Translation request aborted');
            } else {
                console.error('Translation error:', error);
                errorMessage.textContent = error.message;
                if (translatedText.textContent === '') {
                    translatedText.textContent = '(Translation error - please try again)';
                }
            }
        } finally {
            translationInProgress = false;
            translatingIndicator.classList.remove('visible');
        }
    }
    
    // Initialize the app
    loadApiKeys();
});
