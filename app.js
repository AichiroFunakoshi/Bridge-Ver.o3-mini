// リアルタイム音声翻訳 - JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // デフォルトAPIキー
    const DEFAULT_OPENAI_API_KEY = '';
    
    // APIキー保存
    let OPENAI_API_KEY = '';
    
    // DOM要素
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
    
    // 音声認識変数
    let recognition = null;
    let isRecording = false;
    let currentTranslationController = null;
    let translationInProgress = false;
    let selectedLanguage = ''; // 'ja' は日本語、'en' は英語
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
    
    // APIキー読み込み
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
    
    // APIキー保存
    saveApiKeysBtn.addEventListener('click', () => {
        const openaiKey = openaiKeyInput.value.trim();
        
        if (!openaiKey) {
            alert('OpenAI APIキーを入力してください。');
            return;
        }
        
        // APIキーを保存する前に不要なスペースを確実に削除
        localStorage.setItem('translatorOpenaiKey', openaiKey.trim());
        
        OPENAI_API_KEY = openaiKey.trim();
        
        apiModal.style.display = 'none';
        initializeApp();
    });
    
    // 設定モーダルを開く
    settingsButton.addEventListener('click', () => {
        openaiKeyInput.value = OPENAI_API_KEY;
        apiModal.style.display = 'flex';
    });
    
    // APIキーリセット
    resetKeysBtn.addEventListener('click', () => {
        if (confirm('APIキーをリセットしますか？')) {
            localStorage.removeItem('translatorOpenaiKey');
            location.reload();
        }
    });
    
    // モーダル外クリックで閉じる
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
    
    // アプリの初期化
    function initializeApp() {
        // エラーメッセージをクリア
        errorMessage.textContent = '';
        
        // Web Speech APIのサポート確認
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setupSpeechRecognition();
        } else {
            status.textContent = 'このブラウザは音声認識に対応していません。';
            status.classList.remove('idle');
            status.classList.add('error');
            errorMessage.textContent = 'ブラウザが音声認識に対応していません。Chrome、Safari、またはEdgeをお使いください。';
            return;
        }
        
        // 言語ボタンを有効化
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
        
        // 翻訳システムプロンプト
        window.SYSTEM_PROMPT = `あなたは日本語と英語の専門的な同時通訳者です。
音声入力データを以下のルールに従って読みやすいテキストに変換して翻訳してください：

1. 元のテキストが日本語の場合は英語に翻訳する。
2. 元のテキストが英語の場合は日本語に翻訳する。
3. 「えー」「うー」などのフィラーや冗長な表現は除去する。
4. データが不足している場合は文脈に基づいて補完する。
5. 専門用語、固有名詞、文化的な言及は正確に保持する。
6. 出力は自然で会話的にする。
7. 翻訳のみを出力し、説明は含めない。`;
    }
    
    // コンテンツリセット機能
    function resetContent() {
        // リセット処理
        processedResultIds.clear();
        lastTranslatedText = '';
        originalText.textContent = '';
        translatedText.textContent = '';
        
        // ステータス表示も更新
        status.textContent = '待機中';
        status.classList.remove('recording', 'processing', 'error');
        status.classList.add('idle');
        
        errorMessage.textContent = '';
        
        console.log('コンテンツリセット完了');
    }
    
    // 音声認識の設定
    function setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            status.textContent = 'このブラウザは音声認識に対応していません。';
            status.classList.remove('idle');
            status.classList.add('error');
            errorMessage.textContent = 'ブラウザが音声認識に対応していません。Chrome、Safari、またはEdgeをお使いください。';
            return;
        }
        
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        
        recognition.onstart = function() {
            console.log('音声認識開始。言語:', recognition.lang);
            listeningIndicator.classList.add('visible');
        };
        
        recognition.onend = function() {
            console.log('音声認識終了');
            listeningIndicator.classList.remove('visible');
            
            // 録音中の場合は再開
            if (isRecording) {
                try {
                    recognition.start();
                } catch (e) {
                    console.error('音声認識の再開に失敗', e);
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
                sourceLanguage.textContent = '日本語';
                targetLanguage.textContent = '英語';
            } else {
                sourceLanguage.textContent = '英語';
                targetLanguage.textContent = '日本語';
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
            console.error('音声認識エラー', event.error);
            
            if (event.error === 'no-speech') {
                // 音声が検出されない - 正常な状態
            } else if (event.error === 'audio-capture') {
                status.textContent = 'マイクが検出されません';
                status.classList.remove('idle', 'recording');
                status.classList.add('error');
                errorMessage.textContent = 'マイクが検出できません。デバイス設定を確認してください。';
                stopRecording();
            } else if (event.error === 'not-allowed') {
                status.textContent = 'マイク権限が拒否されています';
                status.classList.remove('idle', 'recording');
                status.classList.add('error');
                errorMessage.textContent = 'マイクアクセスが拒否されました。ブラウザ設定でマイク権限を許可してください。';
                stopRecording();
            }
        };
    }
    
    // 録音状態のボタン表示切り替え
    function updateButtonVisibility(isRecordingState) {
        if (isRecordingState) {
            // 開始ボタンを非表示、停止ボタンを表示
            startJapaneseBtn.style.display = 'none';
            startEnglishBtn.style.display = 'none';
            stopBtn.style.display = 'flex';
            stopBtn.disabled = false;
            resetBtn.disabled = true; // 録音中はリセット無効化
            resetBtn.style.opacity = '0.5';
        } else {
            // 開始ボタンを表示、停止ボタンを非表示
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
    
    // 指定された言語で録音開始
    async function startRecording(language) {
        // エラーメッセージをクリア
        errorMessage.textContent = '';
        
        // 選択言語を設定
        selectedLanguage = language;
        
        // UIと変数をリセット
        processedResultIds.clear();
        lastTranslatedText = '';
        originalText.textContent = '';
        translatedText.textContent = '';
        
        // 言語インジケータを更新
        if (language === 'ja') {
            sourceLanguage.textContent = '日本語';
            targetLanguage.textContent = '英語';
        } else {
            sourceLanguage.textContent = '英語';
            targetLanguage.textContent = '日本語';
        }
        
        // UIを更新
        isRecording = true;
        document.body.classList.add('recording');
        status.textContent = '録音中';
        status.classList.remove('idle', 'error');
        status.classList.add('recording');
        
        // ボタン表示を更新 - 開始ボタンを非表示、停止ボタンを表示
        updateButtonVisibility(true);
        
        // Web Speech APIを使用して言語を明示的に設定
        try {
            // 認識言語を設定
            recognition.lang = language === 'ja' ? 'ja-JP' : 'en-US';
            recognition.start();
        } catch (e) {
            console.error('音声認識開始エラー', e);
            errorMessage.textContent = '音声認識の開始に失敗しました: ' + e.message;
            stopRecording();
        }
    }
    
    // 録音停止
    function stopRecording() {
        isRecording = false;
        document.body.classList.remove('recording');
        status.textContent = '処理中';
        status.classList.remove('recording');
        status.classList.add('processing');
        
        // ボタン表示を更新 - 開始ボタンを表示、停止ボタンを非表示
        updateButtonVisibility(false);
        
        try {
            recognition.stop();
        } catch (e) {
            console.error('音声認識停止エラー', e);
        }
        
        // 処理完了後にステータスを更新
        setTimeout(() => {
            status.textContent = '待機中';
            status.classList.remove('processing');
            status.classList.add('idle');
        }, 1000);
        
        console.log('録音停止');
    }
    
    // OpenAI API（o3-miniモデル）を使用してテキストを翻訳
    async function translateText(text) {
        // 翻訳処理の実行条件をチェック
        if (!text || !text.trim()) {
            console.log('翻訳スキップ: 空のテキスト');
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
        
        // エラーメッセージをクリア
        errorMessage.textContent = '';
        
        try {
            // 選択された言語ボタンに基づいて元言語を決定
            const sourceLanguageStr = selectedLanguage === 'ja' ? '日本語' : '英語';
            
            // 新しいAbortControllerを作成
            currentTranslationController = new AbortController();
            const signal = currentTranslationController.signal;
            
            console.log(`テキスト翻訳中 (${text.length} 文字): "${text.substring(0, 30)}..."`);
            
            // o3-miniモデルを使用したOpenAIリクエストを作成
            const translationPayload = {
                model: "o3-mini",  // 仕様に基づきo3-miniを使用
                messages: [
                    {
                        role: "developer",
                        content: window.SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: `以下の${sourceLanguageStr}テキストを翻訳してください:\n\n${text}`
                    }
                ],
                stream: true,  // リアルタイムレスポンスのためストリーミングを有効化
                reasoning_effort: "medium"  // 翻訳精度とリアルタイム性のバランス
            };
            
            console.log('OpenAI APIに翻訳リクエストを送信中...');
            
            // 翻訳リクエスト
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
                    errorData = { error: { message: `HTTPエラー: ${response.status}` } };
                }
                
                console.error('OpenAI APIエラー:', errorData);
                throw new Error(errorData.error?.message || `OpenAI APIがステータスを返しました: ${response.status}`);
            }
            
            console.log('翻訳ストリーム開始');
            
            // ストリーミングレスポンスを処理
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let translationResult = '';
            
            // 新しい翻訳開始時は以前の内容をクリア
            translatedText.textContent = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // チャンクをデコード
                const chunk = decoder.decode(value);
                
                // チャンクから各行を処理
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
                            console.error('ストリーミングレスポンス解析エラー:', e);
                        }
                    }
                }
            }
            
            console.log('翻訳完了');
            
            // 現在のコントローラーをリセット
            currentTranslationController = null;
            
        } catch (error) {
            // 中断エラーは無視
            if (error.name === 'AbortError') {
                console.log('翻訳リクエストが中断されました');
            } else {
                console.error('翻訳エラー:', error);
                errorMessage.textContent = error.message;
                if (translatedText.textContent === '') {
                    translatedText.textContent = '(翻訳エラー - 再度お試しください)';
                }
            }
        } finally {
            translationInProgress = false;
            translatingIndicator.classList.remove('visible');
        }
    }
    
    // アプリ初期化
    loadApiKeys();
});
