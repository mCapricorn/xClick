import { styleLanguages as languages, styleLabels } from './ai/styles.mjs';
const preferenceKey = 'xc_ui_language';
const messages = {
  ...styleLabels,
  manageStyles: ['Manage custom styles', '管理自定义风格', '管理自訂風格', 'Eigene Stile verwalten', 'Gestisci stili personali', 'カスタムスタイルの管理', '사용자 스타일 관리', 'Gérer les styles personnalisés'],
  styleToEdit: ['Style to edit', '要编辑的风格', '要編輯的風格', 'Zu bearbeitender Stil', 'Stile da modificare', '編集するスタイル', '편집할 스타일', 'Style à modifier'],
  addStyle: ["Add custom style", "添加自定义风格", "新增自訂風格", "Eigenen Stil hinzufügen", "Aggiungi stile", "カスタムスタイルを追加", "사용자 스타일 추가", "Ajouter un style"],
  customStyle: ["Custom style", "自定义风格", "自訂風格", "Eigener Stil", "Stile personale", "カスタムスタイル", "사용자 스타일", "Style personnalisé"],
  styleName: ["Style name", "风格名称", "風格名稱", "Stilname", "Nome dello stile", "スタイル名", "스타일 이름", "Nom du style"],
  stylePrompt: ["Style instructions", "风格提示词", "風格提示詞", "Stilanweisung", "Istruzioni per lo stile", "スタイルの指示", "스타일 지침", "Consigne de style"],
  removeStyle: ["Remove style", "删除风格", "刪除風格", "Stil entfernen", "Elimina stile", "スタイルを削除", "스타일 삭제", "Supprimer le style"],
  stylePreview: ["Try reply styles", "试用回复风格", "試用回覆風格", "Antwortstile testen", "Prova gli stili", "返信スタイルを試す", "답글 스타일 테스트", "Essayer les styles de réponse"],
  testPost: ["Default test post", "默认测试语句", "預設測試語句", "Standard-Testbeitrag", "Post di prova predefinito", "既定のテスト投稿", "기본 테스트 게시물", "Texte de test par défaut"],
  sampleDefault: ["The basil on my windowsill finally has two new leaves.", "窗台上的罗勒终于长出了两片新叶。", "窗臺上的羅勒終於長出了兩片新葉。", "Mein Basilikum am Fenster hat endlich zwei neue Blätter.", "Il basilico sul davanzale ha finalmente due foglie nuove.", "窓辺のバジルにようやく新しい葉が二枚出た。", "창가의 바질에 드디어 새잎 두 장이 났다.", "Mon basilic sur le rebord de la fenêtre a enfin deux nouvelles feuilles."],
  randomPost: ["Generate random test post", "生成随机测试语句", "產生隨機測試語句", "Zufälligen Testbeitrag erstellen", "Genera post casuale", "ランダムなテスト投稿を生成", "무작위 테스트 게시물 생성", "Générer un texte aléatoire"],
  previewChoice: ["Style to test", "要试用的风格", "要試用的風格", "Zu testender Stil", "Stile da provare", "試すスタイル", "테스트할 스타일", "Style à essayer"],
  testStyle: ["Test this style", "试写此风格", "試寫此風格", "Stil testen", "Prova questo stile", "このスタイルで試す", "이 스타일 테스트", "Tester ce style"],
  previewCost: ["Each click uses the selected model and may incur charges. Save to keep your test post and styles.", "生成测试语句和试写都会调用当前模型，可能产生费用。点击保存可保留测试语句和风格。", "產生測試語句和試寫都會呼叫目前模型，可能產生費用。按儲存可保留測試語句和風格。", "Erstellen und Testen nutzen das gewählte Modell und können Kosten verursachen. Speichern übernimmt Testbeitrag und Stile.", "Generazione e prova usano il modello selezionato e possono avere un costo. Salva per conservare testo e stili.", "生成と試用には選択中のモデルを使用し、料金が発生する場合があります。投稿とスタイルは保存できます。", "생성과 테스트는 선택한 모델을 사용하며 비용이 발생할 수 있습니다. 저장을 누르면 테스트 게시물과 스타일이 유지됩니다.", "La génération et le test utilisent le modèle choisi et peuvent être facturés. Enregistrez pour conserver le texte et les styles."],
  previewPending: ["Waiting for the model…", "正在等待模型回复…", "正在等待模型回覆…", "Warte auf das Modell…", "In attesa del modello…", "モデルの応答を待っています…", "모델 응답 대기 중…", "En attente du modèle…"],
  previewFailed: ["Request failed. Check the provider, connection and quota.", "请求失败，请检查厂商配置、网络和额度。", "請求失敗，請檢查服務商設定、網路和額度。", "Anfrage fehlgeschlagen. Anbieter, Verbindung und Kontingent prüfen.", "Richiesta non riuscita. Verifica fornitore, connessione e quota.", "リクエストに失敗しました。接続、設定、利用枠を確認してください。", "요청 실패. 공급자 설정, 연결 및 한도를 확인하세요.", "Échec de la requête. Vérifiez le fournisseur, la connexion et le quota."],
  previewFormat: ["The model returned an unusable response. Try again.", "模型返回的内容格式无效，请重试。", "模型回傳的內容格式無效，請重試。", "Ungültige Modellantwort. Erneut versuchen.", "Risposta del modello non valida. Riprova.", "応答形式が無効です。再試行してください。", "모델 응답 형식이 잘못되었습니다. 다시 시도하세요.", "Réponse du modèle inutilisable. Réessayez."],
  needPost: ["Enter a test post.", "请填写测试语句。", "請填寫測試語句。", "Testbeitrag eingeben.", "Inserisci un post di prova.", "テスト投稿を入力してください。", "테스트 게시물을 입력하세요.", "Saisissez un texte de test."],
  needStyle: ["Enter a style name and instructions.", "请填写风格名称和提示词。", "請填寫風格名稱和提示詞。", "Stilname und Anweisung eingeben.", "Inserisci nome e istruzioni.", "スタイル名と指示を入力してください。", "스타일 이름과 지침을 입력하세요.", "Saisissez un nom et une consigne."],
  modelConnection: ['Provider and models', '厂商与模型', '供應商與模型', 'Anbieter und Modelle', 'Fornitore e modelli', 'プロバイダーとモデル', '제공업체 및 모델', 'Fournisseur et modèles'],
  replyPreferences: ['Reply preferences', '回复偏好', '回覆偏好', 'Antworteinstellungen', 'Preferenze di risposta', '返信の設定', '답글 설정', 'Préférences de réponse'],
  solImageHint: ['Sol uses its image tool automatically. A custom API must support image_generation in Responses.', 'Sol 生图时会自动调用工具，无需另填模型。中转站须支持 Responses 的 image_generation 工具。', 'Sol 產圖時會自動呼叫工具，無需另填模型。中繼站須支援 Responses 的 image_generation 工具。', 'Sol verwendet das Bildwerkzeug automatisch. Eigene APIs müssen image_generation in Responses unterstützen.', 'Sol usa automaticamente lo strumento immagini. Le API personalizzate devono supportare image_generation in Responses.', 'Sol は画像生成ツールを使用します。追加のモデル設定は不要です。中継 API は Responses の image_generation に対応している必要があります。', 'Sol은 이미지 생성 도구를 사용합니다. 별도 모델 설정은 필요 없습니다. 중계 API는 Responses의 image_generation을 지원해야 합니다.', 'Sol utilise son outil de génération d’images. Une API personnalisée doit prendre en charge image_generation dans Responses.'],
  arkImageHint: ['For images, enter your activated Seedream model ID in Advanced model settings.', '如需生图，请在高级模型设置中填写已开通的 Seedream 模型 ID。', '如需產圖，請在進階模型設定中填寫已開通的 Seedream 模型 ID。', 'Für Bilder die ID des aktivierten Seedream-Modells in den erweiterten Modelleinstellungen eingeben.', 'Per le immagini, inserisci l’ID del modello Seedream attivato nelle impostazioni avanzate.', '画像を生成するには、モデルの詳細設定で有効な Seedream モデル ID を入力してください。', '이미지를 생성하려면 고급 모델 설정에 활성화된 Seedream 모델 ID를 입력하세요.', 'Pour générer des images, saisissez l’ID du modèle Seedream activé dans les paramètres avancés.'],
  replyStyles: ['Reply styles', '回复风格', '回覆風格', 'Antwortstile', 'Stili di risposta', '返信スタイル', '답글 스타일', 'Styles de réponse'],
  chooseStyles: ['Select at least one style. Each gets one draft.', '至少勾选一种，每种生成一条草稿。', '至少勾選一種，每種產生一則草稿。', 'Wähle mindestens einen Stil. Pro Stil entsteht ein Entwurf.', 'Scegli almeno uno stile. Ogni stile genera una bozza.', '1つ以上選んでください。各スタイルで1件ずつ生成します。', '한 가지 이상 선택하세요. 스타일마다 초안 하나를 생성합니다.', 'Sélectionnez au moins un style. Chaque style donne un brouillon.'],
  adaptiveStyles: ['Adaptive reply styles', '自适应回复风格', '自適應回覆風格', 'Adaptive Antwortstile', 'Stili di risposta adattivi', '自動調整返信スタイル', '적응형 답글 스타일', 'Styles de réponse adaptatifs'],
  adaptiveHelp: ['Learn from chosen styles, occasionally try other available styles, and gradually generate fewer replies. Preferences stay in this browser.', '根据已选风格学习，也会偶尔尝试其他可用风格，并逐步减少生成数量。偏好保存在当前浏览器。', '根據已選風格學習，也會偶爾嘗試其他可用風格，並逐步減少產生數量。偏好會保存在目前瀏覽器。', 'Lernt aus gewählten Stilen, probiert gelegentlich andere verfügbare Stile aus und erzeugt nach und nach weniger Antworten. Die Präferenz bleibt in diesem Browser.', 'Impara dagli stili scelti, prova occasionalmente altri stili disponibili e riduce gradualmente le risposte generate. La preferenza resta in questo browser.', '選んだスタイルから学習し、ときどき他の利用可能なスタイルも試しながら、生成する返信を徐々に減らします。設定はこのブラウザーに保存されます。', '선택한 스타일을 학습하고 가끔 다른 사용 가능한 스타일도 시도하면서 생성하는 답글을 점차 줄입니다. 선호도는 이 브라우저에 저장됩니다.', 'Apprend des styles choisis, essaie parfois d’autres styles disponibles et réduit progressivement les réponses générées. La préférence reste dans ce navigateur.'],
  baseURL: ['API base URL (optional)', 'API 基础地址（可选）', 'API 基底網址（選填）', 'API-Basis-URL (optional)', 'URL base API (facoltativo)', 'API ベース URL（任意）', 'API 기본 URL (선택)', 'URL de base de l’API (facultatif)'],
  baseHelp: ['Leave blank for the official API. With HTTP, your key and request data are sent to the relay unencrypted.', '留空使用官方接口。使用 HTTP 时，密钥和请求内容会以明文发送给中转站。', '留空使用官方 API。使用 HTTP 時，金鑰與請求內容會以明文傳送至中轉站。', 'Leer lassen für die offizielle API. Bei HTTP werden Schlüssel und Anfragedaten unverschlüsselt an den Relay gesendet.', 'Lascia vuoto per usare l’API ufficiale. Con HTTP, la chiave e i dati vengono inviati al relay in chiaro.', '空欄では公式 API を使います。HTTP ではキーとリクエスト内容が平文で中継先に送られます。', '비워 두면 공식 API를 사용합니다. HTTP에서는 키와 요청 내용이 중계 서버에 평문으로 전송됩니다.', 'Laissez vide pour utiliser l’API officielle. Avec HTTP, la clé et les données sont envoyées au relais en clair.'],
  invalidBase: ['Enter an HTTP(S) base URL without credentials, query or fragment.', '请输入 HTTP(S) 基础地址，去掉账号密码、查询参数和片段。', '請輸入 HTTP(S) 基底網址，移除帳密、查詢參數和片段。', 'HTTP(S)-Basis-URL ohne Zugangsdaten, Abfrage oder Fragment eingeben.', 'Inserisci un URL base HTTP(S) senza credenziali, query o frammento.', '認証情報、クエリ、フラグメントを含まない HTTP(S) ベース URL を入力してください。', '인증 정보, 쿼리, 프래그먼트가 없는 HTTP(S) 기본 URL을 입력하세요.', 'Saisissez une URL de base HTTP(S) sans identifiants, paramètres ni fragment.'],
  claudeWorkspace: ["Workspace ID for all-workspaces keys", "工作区 ID（仅跨工作区密钥需填）", "工作區 ID（僅跨工作區金鑰需填）", "Workspace-ID für arbeitsbereichsübergreifende Schlüssel", "ID workspace per chiavi valide in più workspace", "ワークスペース ID（全ワークスペース共通キーの場合）", "워크스페이스 ID (모든 워크스페이스용 키에 필요)", "ID d’espace de travail pour les clés multi-espaces"],
  arkCatalogue: ["Ark lists models visible to your account. Choose one activated in Beijing and authorized for this key.", "方舟列表显示账号可见的模型。请选择在北京区已开通、且当前密钥有权调用的模型。", "方舟清單顯示帳號可見的模型。請選擇在北京區已開通且目前金鑰有權使用的模型。", "Ark zeigt die für dein Konto sichtbaren Modelle. Wähle ein in Peking aktiviertes Modell, auf das dein Schlüssel Zugriff hat.", "Ark mostra i modelli visibili al tuo account. Scegline uno attivato a Pechino e autorizzato per questa chiave.", "一覧にはアカウントから見えるモデルが表示されます。北京リージョンで有効化済みで、このキーで利用できるモデルを選んでください。", "Ark 목록에는 계정에 표시되는 모델이 나옵니다. 베이징 리전에서 활성화되어 있고 현재 키로 호출할 수 있는 모델을 선택하세요.", "Ark affiche les modèles visibles pour votre compte. Choisissez un modèle activé à Pékin et accessible avec cette clé."],
  modelOrEndpoint: ["Model or endpoint ID", "模型或接入点 ID", "模型或接入點 ID", "Modell- oder Endpunkt-ID", "ID modello o endpoint", "モデルまたはエンドポイント ID", "모델 또는 엔드포인트 ID", "ID de modèle ou de point de terminaison"],
  defaultReplyModel: ['Default reply model','默认回复模型','預設回覆模型','Standardmodell für Antworten','Modello predefinito per le risposte','既定の返信モデル','기본 답글 모델','Modèle de réponse par défaut'],
  imageGenModel: ['Image generation model','配图生成模型','配圖生成模型','Bildgenerierungsmodell','Modello per generare immagini','画像生成モデル','이미지 생성 모델','Modèle de génération d’images'],
  gifGenModel: ['GIF generation model (Seedance)','动图生成模型（Seedance）','動圖生成模型（Seedance）','GIF-Modell (Seedance)','Modello GIF (Seedance)','GIF 生成モデル（Seedance）','GIF 생성 모델 (Seedance)','Modèle GIF (Seedance)'],
  mediaHelp: ['Enter an activated model ID to enable its button. Generating media incurs provider charges.','填写已开通的模型 ID 即可启用对应按钮。点击生成媒体会产生厂商费用。','填寫已開通的模型 ID 即可啟用對應按鈕。產生媒體會產生費用。','Eine aktive Modell-ID aktiviert die Schaltfläche. Die Mediengenerierung ist kostenpflichtig.','Inserisci un ID modello attivo. La generazione di contenuti multimediali è a pagamento.','利用可能なモデル ID を入力するとボタンが有効になります。メディアの生成には料金がかかります。','활성 모델 ID를 입력하면 버튼이 표시됩니다. 미디어 생성에는 요금이 부과됩니다.','Saisissez un ID de modèle actif pour afficher le bouton. La génération de médias est payante.'],
  advancedModels: ['Advanced model settings','高级模型设置','進階模型設定','Erweiterte Modelleinstellungen','Impostazioni avanzate dei modelli','モデルの詳細設定','고급 모델 설정','Paramètres avancés des modèles'],
  photoModel: ['Model for posts with photos','带图帖模型','附圖貼文模型','Modell für Beiträge mit Bildern','Modello per i post con foto','画像付き投稿のモデル','사진이 있는 게시물의 모델','Modèle pour les publications avec photos'],
  useDefaultModel: ['Use default reply model','使用默认回复模型','使用預設回覆模型','Standardmodell verwenden','Usa il modello predefinito','既定の返信モデルを使う','기본 답글 모델 사용','Utiliser le modèle de réponse par défaut'],
  manualModel: ["Custom model or endpoint ID","手动输入模型或接入点 ID","手動輸入模型或接入點 ID","Eigene Modell- oder Endpunkt-ID","ID modello o endpoint personalizzato","モデルまたはエンドポイント ID を入力","모델 또는 엔드포인트 ID 직접 입력","Saisir un ID de modèle ou de point de terminaison"],
  refreshModels: ["Load provider models","获取厂商模型列表","取得供應商模型清單","Modelle vom Anbieter laden","Carica modelli dal fornitore","プロバイダーのモデルを取得","제공업체 모델 불러오기","Charger les modèles du fournisseur"],
  loadingModels: ["Loading models…","正在获取模型…","正在取得模型…","Modelle werden geladen…","Caricamento modelli…","モデルを取得中…","모델 불러오는 중…","Chargement des modèles…"],
  presetModels: ["Suggested models. Access depends on your account.","推荐模型，实际权限以厂商账号为准。","建議模型，實際權限依供應商帳號而定。","Modellvorschläge. Der Zugriff hängt vom Konto ab.","Modelli suggeriti. L’accesso dipende dall’account.","推奨モデルです。利用可否はアカウントによって異なります。","추천 모델입니다. 사용 권한은 계정에 따라 다릅니다.","Modèles suggérés. L’accès dépend de votre compte."],
  providerModels: ["List returned by the provider.","已显示厂商返回的模型列表。","已顯示供應商回傳的模型清單。","Modellliste vom Anbieter geladen.","Elenco ricevuto dal fornitore.","プロバイダーの一覧を表示しています。","제공업체의 모델 목록을 표시합니다.","Liste reçue du fournisseur."],
  modelsUnavailable: ["Could not load text models. Check your key and access, or enter a model ID.","未能获取文本模型，请检查密钥和权限，或手动输入模型 ID。","無法取得文字模型，請檢查金鑰和權限，或手動輸入模型 ID。","Textmodelle konnten nicht geladen werden. Schlüssel und Zugriff prüfen oder Modell-ID eingeben.","Impossibile caricare i modelli di testo. Verifica la chiave e i permessi o inserisci un ID modello.","テキストモデルを取得できません。キーと権限を確認するか、モデル ID を入力してください。","텍스트 모델을 불러올 수 없습니다. 키와 권한을 확인하거나 모델 ID를 입력하세요.","Impossible de charger les modèles texte. Vérifiez la clé et les droits, ou saisissez un ID de modèle."],
  arkHelp: ["Paste the Beijing Ark API Key value. The API Key ID is not required. For a custom endpoint, enter its ep-… ID under Model.","填写火山方舟北京区的 API Key 密钥值，无需 API Key ID。使用自定义推理接入点时，在模型列表中选择手动输入，填写 ep-… 接入点 ID。","請填寫火山方舟北京區的 API Key 金鑰值，無需 API Key ID。使用自訂推理接入點時，請手動輸入 ep-… 接入點 ID。","API-Schlüsselwert von Ark (Peking) eingeben. Die Schlüssel-ID wird nicht benötigt. Eigene Endpunkte unter Modell als ep-… eingeben.","Inserisci la chiave API di Ark (Pechino). L’ID della chiave non è richiesto. Per un endpoint personalizzato inserisci l’ID ep-… nel campo modello.","北京リージョンの Ark API キーの値を入力します。API Key ID は不要です。独自エンドポイントはモデル欄に ep-… ID を入力します。","베이징 Ark API 키 값을 입력하세요. API Key ID는 필요하지 않습니다. 사용자 지정 엔드포인트는 모델에 ep-… ID를 입력하세요.","Saisissez la valeur de la clé API Ark (Pékin). L’ID de clé est inutile. Pour un point de terminaison personnalisé, saisissez son ID ep-… comme modèle."],
  glm: ["Zhipu GLM", "智谱 GLM", "智譜 GLM", "Zhipu GLM", "Zhipu GLM", "Zhipu GLM", "Zhipu GLM", "Zhipu GLM"],
  kimi: ["Moonshot Kimi", "月之暗面 Kimi", "月之暗面 Kimi", "Moonshot Kimi", "Moonshot Kimi", "Moonshot Kimi", "Moonshot Kimi", "Moonshot Kimi"],
  doubao: ["Doubao (Volcengine Beijing)", "豆包（火山方舟·北京）", "豆包（火山方舟·北京）", "Doubao (Volcengine Peking)", "Doubao (Volcengine Pechino)", "Doubao（Volcengine 北京）", "Doubao (Volcengine 베이징)", "Doubao (Volcengine Pékin)"],
  audioSettings: ["Audio settings", "声音设置", "音效設定", "Toneinstellungen", "Impostazioni audio", "サウンド設定", "소리 설정", "Réglages audio"],
  includePhotos: ["Send up to four post photos to the model (including quoted posts)", "向模型发送最多四张配图（含引用帖）", "向模型傳送最多四張配圖（含引用貼文）", "Bis zu vier Beitragsbilder an das Modell senden (auch aus Zitaten)", "Invia al modello fino a quattro foto, incluse quelle dei post citati", "引用元を含む投稿の画像を最大4枚モデルに送信", "인용 게시물 포함 사진 최대 4장을 모델에 전송", "Envoyer au modèle jusqu’à quatre photos, citations comprises"],
  bilingual: ["Show native-language references", "双语辅助（显示母语参考）", "雙語輔助（顯示母語參考）", "Übersetzung in der Muttersprache anzeigen", "Mostra la traduzione nella lingua madre", "母語の参考訳を表示", "모국어 참고 번역 표시", "Afficher une traduction dans la langue maternelle"],
  nativeLanguage: ["Native language", "母语", "母語", "Muttersprache", "Lingua madre", "母語", "모국어", "Langue maternelle"],
  language: ["Interface language", "界面语言", "介面語言", "Oberflächensprache", "Lingua dell’interfaccia", "表示言語", "화면 언어", "Langue de l’interface"],
  tagline: ["INTERACTION FX FOR X", "X 互动特效", "X 互動特效", "INTERAKTIONSEFFEKTE FÜR X", "EFFETTI PER X", "X の操作エフェクト", "X 인터랙션 효과", "EFFETS POUR X"],
  active: ["ACTIVE ON X", "适用于 X", "適用於 X", "AKTIV AUF X", "ATTIVO SU X", "X で有効", "X에서 사용 가능", "ACTIF SUR X"],
  intro: ["Neon feedback for the moments you like, follow, and reply.", "为点赞、关注和回复添加霓虹特效。", "為喜歡、跟隨和回覆加入霓虹特效。", "Neoneffekte für Likes, neue Follows und Antworten.", "Effetti neon quando metti Mi piace, segui qualcuno o rispondi.", "いいね、フォロー、返信にネオンの演出を加えます。", "마음에 들어요, 팔로우, 답글에 네온 효과를 더하세요.", "Des effets néon pour vos J’aime, abonnements et réponses."],
  studio: ["Animation studio", "动画工作室", "動畫工作室", "Animationsstudio", "Studio di animazione", "アニメーションスタジオ", "애니메이션 스튜디오", "Studio d’animation"],
  theme: ["Color theme", "配色主题", "配色主題", "Farbschema", "Tema colori", "カラーテーマ", "색상 테마", "Thème de couleurs"],
  cyber: ["Cyber neon", "赛博霓虹", "賽博霓虹", "Cyber-Neon", "Neon cyber", "サイバーネオン", "사이버 네온", "Néon cyber"],
  aurora: ["Aurora", "极光", "極光", "Polarlicht", "Aurora", "オーロラ", "오로라", "Aurore boréale"],
  sakura: ["Sakura", "樱花", "櫻花", "Kirschblüte", "Fiori di ciliegio", "桜", "벚꽃", "Fleurs de cerisier"],
  mono: ["Monochrome", "单色", "單色", "Monochrom", "Monocromatico", "モノクロ", "단색", "Monochrome"],
  custom: ["Custom palette", "自定义配色", "自訂配色", "Eigene Farbpalette", "Tavolozza personalizzata", "カスタムパレット", "사용자 지정 팔레트", "Palette personnalisée"],
  surprise: ["Surprise me", "随机配色", "隨機配色", "Zufällige Farben", "Colori casuali", "ランダム配色", "무작위 색상", "Couleurs aléatoires"],
  shuffle: ["Shuffle", "换一组", "換一組", "Neu mischen", "Mescola", "シャッフル", "색상 섞기", "Mélanger"],
  pick: ["PICK A SCENE", "选择场景", "選擇場景", "SZENE WÄHLEN", "SCEGLI UNA SCENA", "シーンを選択", "장면 선택", "CHOISIR UNE SCÈNE"],
  preview: ["Preview animation and sound", "预览动画和音效", "預覽動畫與音效", "Animation und Ton testen", "Anteprima di animazione e suono", "アニメーションと効果音のプレビュー", "애니메이션 및 소리 미리보기", "Aperçu des animations et des sons"],
  previewLike: ["♥ Preview like", "♥ 预览点赞", "♥ 預覽喜歡", "♥ Like testen", "♥ Prova Mi piace", "♥ いいねを試す", "♥ 마음에 들어요 미리보기", "♥ Tester le J’aime"],
  previewFollow: ["＋ Preview follow", "＋ 预览关注", "＋ 預覽跟隨", "＋ Folgen testen", "＋ Prova Segui", "＋ フォローを試す", "＋ 팔로우 미리보기", "＋ Tester le suivi"],
  previewReply: ["↳ Preview reply", "↳ 预览回复", "↳ 預覽回覆", "↳ Antwort testen", "↳ Prova Rispondi", "↳ 返信を試す", "↳ 답글 미리보기", "↳ Tester la réponse"],
  previewComment: ["✦ Preview comment", "✦ 预览发送", "✦ 預覽傳送", "✦ Senden testen", "✦ Prova l’invio", "✦ 送信を試す", "✦ 전송 미리보기", "✦ Tester l’envoi"],
  previewHint: ["Preview any scene here. Sounds follow your sound toggle and volume.", "点击场景即可预览，音效使用当前的声音设置。", "點選場景即可預覽，音效會套用目前的聲音設定。", "Wähle eine Szene für die Vorschau. Dabei gelten deine Toneinstellungen.", "Scegli una scena per l’anteprima. L’audio segue le impostazioni di suono e volume.", "シーンを選んでプレビューできます。効果音には現在の音量とオン・オフ設定が適用されます。", "장면을 선택해 미리 보세요. 현재 소리 설정과 음량이 적용됩니다.", "Choisissez une scène pour la prévisualiser. Le son respecte vos réglages audio."],
  extension: ["Extension", "扩展设置", "擴充功能設定", "Erweiterung", "Estensione", "拡張機能", "확장 프로그램", "Extension"],
  effects: ["Enable effects", "启用特效", "啟用特效", "Effekte aktivieren", "Attiva effetti", "エフェクトを有効にする", "효과 사용", "Activer les effets"],
  scenes: ["Animation settings by scene", "各场景动画设置", "各場景動畫設定", "Animationseinstellungen nach Szene", "Impostazioni di animazione per scena", "シーン別のアニメーション設定", "장면별 애니메이션 설정", "Réglages d’animation par scène"],
  like: ["Like animation", "点赞动画", "喜歡動畫", "Like-Animation", "Animazione Mi piace", "いいねのアニメーション", "마음에 들어요 애니메이션", "Animation J’aime"],
  heart: ["Heart burst", "爱心绽放", "愛心綻放", "Herzexplosion", "Esplosione di cuori", "弾けるハート", "하트 팡팡", "Éclat de cœurs"],
  likeOn: ["Enable like animation", "启用点赞动画", "啟用喜歡動畫", "Like-Animation aktivieren", "Attiva animazione Mi piace", "いいねのアニメーションを有効にする", "마음에 들어요 애니메이션 사용", "Activer l’animation J’aime"],
  likeStyle: ["Like animation style", "点赞动画样式", "喜歡動畫樣式", "Stil der Like-Animation", "Stile dell’animazione Mi piace", "いいねのアニメーションスタイル", "마음에 들어요 애니메이션 스타일", "Style de l’animation J’aime"],
  follow: ["Follow animation", "关注动画", "跟隨動畫", "Folgen-Animation", "Animazione Segui", "フォローのアニメーション", "팔로우 애니메이션", "Animation d’abonnement"],
  rings: ["Cyber rings", "霓虹光环", "霓虹光環", "Neonringe", "Anelli neon", "ネオンリング", "네온 고리", "Anneaux néon"],
  followOn: ["Enable follow animation", "启用关注动画", "啟用跟隨動畫", "Folgen-Animation aktivieren", "Attiva animazione Segui", "フォローのアニメーションを有効にする", "팔로우 애니메이션 사용", "Activer l’animation d’abonnement"],
  followStyle: ["Follow animation style", "关注动画样式", "跟隨動畫樣式", "Stil der Folgen-Animation", "Stile dell’animazione Segui", "フォローのアニメーションスタイル", "팔로우 애니메이션 스타일", "Style de l’animation d’abonnement"],
  reply: ["Reply animation", "回复动画", "回覆動畫", "Antwortanimation", "Animazione di risposta", "返信のアニメーション", "답글 애니메이션", "Animation de réponse"],
  signal: ["Glitch signal", "信号干扰", "訊號干擾", "Signalstörung", "Segnale disturbato", "グリッチ信号", "글리치 신호", "Signal brouillé"],
  replyOn: ["Enable reply animation", "启用回复动画", "啟用回覆動畫", "Antwortanimation aktivieren", "Attiva animazione di risposta", "返信のアニメーションを有効にする", "답글 애니메이션 사용", "Activer l’animation de réponse"],
  replyStyle: ["Reply animation style", "回复动画样式", "回覆動畫樣式", "Stil der Antwortanimation", "Stile dell’animazione di risposta", "返信のアニメーションスタイル", "답글 애니메이션 스타일", "Style de l’animation de réponse"],
  comment: ["Comment animation", "发送动画", "傳送動畫", "Sendeanimation", "Animazione di invio", "送信のアニメーション", "전송 애니메이션", "Animation d’envoi"],
  burst: ["Post send burst", "发送时绽放", "傳送時綻放", "Lichtblitz beim Senden", "Lampo all’invio", "送信時のフラッシュ", "전송 시 섬광", "Éclat à l’envoi"],
  commentOn: ["Enable comment animation", "启用发送动画", "啟用傳送動畫", "Sendeanimation aktivieren", "Attiva animazione di invio", "送信のアニメーションを有効にする", "전송 애니메이션 사용", "Activer l’animation d’envoi"],
  commentStyle: ["Comment animation style", "发送动画样式", "傳送動畫樣式", "Stil der Sendeanimation", "Stile dell’animazione di invio", "送信のアニメーションスタイル", "전송 애니메이션 스타일", "Style de l’animation d’envoi"],
  pulse: ["Pulse", "脉冲", "脈衝", "Pulsieren", "Pulsazione", "パルス", "맥동", "Pulsation"],
  neon: ["Neon burst", "霓虹绽放", "霓虹綻放", "Neonblitz", "Esplosione neon", "ネオンバースト", "네온 섬광", "Éclat néon"],
  rotateStyles: ["Rotate styles", "轮换样式", "輪替樣式", "Stile abwechseln", "Alterna stili", "スタイルを順番に切り替え", "스타일 번갈아 사용", "Alterner les styles"],
  sound: ["Sound", "声音", "聲音", "Ton", "Audio", "サウンド", "소리", "Son"],
  soundOn: ["Enable sounds", "启用声音", "啟用聲音", "Töne aktivieren", "Attiva suoni", "効果音を有効にする", "효과음 사용", "Activer les sons"],
  volume: ["Volume", "音量", "音量", "Lautstärke", "Volume", "音量", "음량", "Volume"],
  soundMode: ["Sound mode", "音效模式", "音效模式", "Klangmodus", "Modalità audio", "サウンドモード", "효과음 모드", "Mode sonore"],
  classic: ["Classic", "经典", "經典", "Klassisch", "Classico", "クラシック", "클래식", "Classique"],
  alt: ["Alt", "变奏", "變奏", "Alternativ", "Alternativo", "アレンジ", "변주", "Variante"],
  rotate: ["Rotate", "轮换", "輪替", "Abwechselnd", "Alternato", "順番に切り替え", "번갈아 사용", "Alternance"],
  shortcuts: ["Shortcuts: L like, R reply, F follow the current profile or nearby follow action. Rotate mode alternates between multiple visual and audio variants.", "快捷键：L 点赞，R 回复，F 关注当前或附近的用户。轮换模式会交替使用不同的动画和音效。", "快速鍵：L 表示喜歡，R 回覆，F 跟隨目前或附近的使用者。輪替模式會交替使用不同的動畫與音效。", "Tastenkürzel: L für Like, R zum Antworten, F zum Folgen über das aktuelle Profil oder die nächstgelegene Folgen-Schaltfläche. Im Wechselmodus wechseln sich Effekte und Klänge ab.", "Scorciatoie: L per Mi piace, R per rispondere, F per seguire il profilo corrente o usare il pulsante Segui più vicino. In modalità alternata, stili ed effetti sonori cambiano a turno.", "ショートカット：L でいいね、R で返信、F で現在のプロフィールまたは近くのフォローボタンからフォローできます。順番に切り替えるモードでは、演出と効果音が交互に変わります。", "단축키: L은 마음에 들어요, R은 답글, F는 현재 프로필이나 가까운 팔로우 버튼을 통한 팔로우입니다. 번갈아 사용 모드에서는 효과와 소리가 차례로 바뀝니다.", "Raccourcis : L pour aimer, R pour répondre, F pour suivre le profil affiché ou utiliser le bouton Suivre le plus proche. Le mode alternance fait varier les effets visuels et sonores."],
  likeCaption: ["LIKE CONFIRMED", "已点赞", "已表示喜歡", "LIKE BESTÄTIGT", "MI PIACE CONFERMATO", "いいねしました", "마음에 들어요 표시됨", "J’AIME CONFIRMÉ"],
  followCaption: ["FOLLOW SIGNAL", "关注信号", "跟隨訊號", "FOLGEN BESTÄTIGT", "PROFILO SEGUITO", "フォローしました", "팔로우 완료", "ABONNEMENT CONFIRMÉ"],
  replyCaption: ["REPLY UPLINK", "回复信号", "回覆訊號", "ANTWORTSIGNAL", "SEGNALE DI RISPOSTA", "返信シグナル", "답글 신호", "SIGNAL DE RÉPONSE"],
  commentCaption: ["POST TRANSMITTED", "已发送", "已傳送", "BEITRAG GESENDET", "POST INVIATO", "ポストを送信しました", "게시물 전송됨", "PUBLICATION ENVOYÉE"],
  aiReplies: ["AI replies", "AI 回复", "AI 回覆", "KI-Antworten", "Risposte IA", "AI 返信", "AI 답글", "Réponses IA"],
  configure: ["Configure provider", "配置模型", "設定模型", "Anbieter einrichten", "Configura il fornitore", "プロバイダーを設定", "제공업체 설정", "Configurer le fournisseur"],
  aiTitle: ["xClick · AI replies", "xClick · AI 回复", "xClick · AI 回覆", "xClick · KI-Antworten", "xClick · Risposte IA", "xClick · AI 返信", "xClick · AI 답글", "xClick · Réponses IA"],
  aiNotice: ["Generating sends the original post and up to five comments from the open thread to your provider using your API key. Provider charges may apply. Settings are saved in this browser.", "点击生成时，原帖正文和当前讨论中最多 5 条已加载评论会发送给所选厂商。费用按厂商规则计算，配置保存在当前浏览器。", "點選產生回覆時，原文和目前討論中最多 5 則已載入的留言會傳送給所選供應商。費用依供應商規則計算，設定儲存在目前的瀏覽器。", "Beim Erstellen einer Antwort werden der Originalbeitrag und bis zu fünf geladene Kommentare aus der Diskussion an deinen Anbieter gesendet. Dabei können Gebühren anfallen. Die Einstellungen werden in diesem Browser gespeichert.", "Generando una risposta, il post originale e fino a cinque commenti già caricati nella discussione vengono inviati al fornitore scelto. Il servizio potrebbe essere a pagamento. Le impostazioni vengono salvate in questo browser.", "返信を生成すると、元のポストと読み込み済みのスレッド内の返信（最大5件）が選択したプロバイダーに送信されます。利用料金が発生する場合があります。設定はこのブラウザに保存されます。", "답글을 생성하면 원본 게시물과 현재 대화에 로드된 댓글 최대 5개를 선택한 제공업체에 전송합니다. 이용 요금이 발생할 수 있습니다. 설정은 이 브라우저에 저장됩니다.", "La génération envoie la publication d’origine et jusqu’à cinq commentaires déjà chargés dans la discussion au fournisseur choisi. Des frais peuvent s’appliquer. Les réglages sont enregistrés dans ce navigateur."],
  provider: ["Provider", "模型厂商", "模型供應商", "Anbieter", "Fornitore", "プロバイダー", "제공업체", "Fournisseur"],
  model: ["Model ID", "模型名称", "模型名稱", "Modell-ID", "ID del modello", "モデル ID", "모델 ID", "Identifiant du modèle"],
  key: ["API key", "API 密钥", "API 金鑰", "API-Schlüssel", "Chiave API", "API キー", "API 키", "Clé API"],
  save: ["Save", "保存", "儲存", "Speichern", "Salva", "保存", "저장", "Enregistrer"],
  clear: ["Clear all provider settings", "清除所有厂商配置", "清除所有供應商設定", "Alle Anbietereinstellungen löschen", "Cancella le impostazioni di tutti i fornitori", "すべてのプロバイダー設定を消去", "모든 제공업체 설정 지우기", "Effacer les paramètres de tous les fournisseurs"],
  saved: ["Saved", "已保存", "已儲存", "Gespeichert", "Salvato", "保存しました", "저장됨", "Enregistré"],
  savedDetails: ["Saved · provider {provider} · model {model} · styles {styles} · native references {native} · adaptive styles {adaptive}", "已保存：厂商 {provider} · 模型 {model} · 风格 {styles} · 母语辅助 {native} · 自适应风格 {adaptive}", "已儲存：供應商 {provider} · 模型 {model} · 回覆風格 {styles} · 母語輔助 {native} · 自適應回覆風格 {adaptive}", "Gespeichert · Anbieter {provider} · Modell {model} · Stile {styles} · Muttersprachliche Referenzen {native} · Adaptive Stile {adaptive}", "Salvato · fornitore {provider} · modello {model} · stili {styles} · riferimenti nella lingua madre {native} · stili adattivi {adaptive}", "保存しました · プロバイダー {provider} · モデル {model} · スタイル {styles} · 母語参考 {native} · 自動調整返信スタイル {adaptive}", "저장됨 · 제공업체 {provider} · 모델 {model} · 스타일 {styles} · 모국어 참고 번역 {native} · 적응형 스타일 {adaptive}", "Enregistré · fournisseur {provider} · modèle {model} · styles {styles} · références en langue maternelle {native} · styles adaptatifs {adaptive}"],
  enabled: ["on", "开启", "開啟", "an", "attivi", "オン", "켜짐", "activés"],
  disabled: ["off", "关闭", "關閉", "aus", "disattivati", "オフ", "꺼짐", "désactivés"],
  readError: ["Could not read settings", "无法读取配置", "無法讀取設定", "Einstellungen konnten nicht geladen werden", "Impossibile leggere le impostazioni", "設定を読み込めませんでした", "설정을 불러올 수 없습니다", "Impossible de lire les réglages"],
  missing: ["Enter a model and key", "请填写模型名称和密钥", "請填寫模型名稱和金鑰", "Modell und API-Schlüssel eingeben", "Inserisci modello e chiave API", "モデルと API キーを入力してください", "모델과 API 키를 입력하세요", "Saisissez un modèle et une clé API"],
  permission: ["Allow access to the provider API", "请允许访问厂商 API", "請允許存取供應商 API", "Zugriff auf die Anbieter-API erlauben", "Consenti l’accesso all’API del fornitore", "プロバイダーの API へのアクセスを許可してください", "제공업체 API에 대한 접근을 허용하세요", "Autorisez l’accès à l’API du fournisseur"],
  saveError: ["Could not save settings", "保存失败", "儲存失敗", "Einstellungen konnten nicht gespeichert werden", "Impossibile salvare le impostazioni", "設定を保存できませんでした", "설정을 저장할 수 없습니다", "Impossible d’enregistrer les réglages"],
  cleared: ["Configuration cleared", "配置已清除", "已清除設定", "Konfiguration gelöscht", "Configurazione cancellata", "設定を消去しました", "설정을 지웠습니다", "Configuration effacée"],
  clearError: ["Could not clear settings", "清除失败", "清除失敗", "Konfiguration konnte nicht gelöscht werden", "Impossibile cancellare la configurazione", "設定を消去できませんでした", "설정을 지울 수 없습니다", "Impossible d’effacer la configuration"],
  qwen: ["Alibaba Qwen (Beijing)", "通义千问（北京）", "通義千問（北京）", "Alibaba Qwen (Peking)", "Alibaba Qwen (Pechino)", "Alibaba Qwen（北京）", "알리바바 Qwen (베이징)", "Alibaba Qwen (Pékin)"]
};

function browserLanguage() {
  const locale = new Intl.Locale(chrome.i18n.getUILanguage()).maximize();
  if (locale.language === 'zh') return locale.script === 'Hant' ? 'zh-Hant' : 'zh-Hans';
  return languages.includes(locale.language) ? locale.language : 'en';
}

const selector = document.querySelector('#uiLanguage');
let language;

export function translated(key) {
  return key ? messages[key][languages.indexOf(language)] : '';
}

export function setLabel(element, key, attribute = 'textContent') {
  const binding = { textContent: 'i18n', placeholder: 'i18nPlaceholder', 'aria-label': 'i18nAria' }[attribute];
  element.dataset[binding] = key;
  const value = translated(key);
  if (attribute === 'textContent') element.textContent = value;
  else element.setAttribute(attribute, value);
}

function render() {
  const saved = localStorage.getItem(preferenceKey);
  language = languages.includes(saved) ? saved : browserLanguage();
  document.documentElement.lang = language;
  if (selector) selector.value = language;
  for (const el of document.querySelectorAll('[data-i18n]')) setLabel(el, el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) setLabel(el, el.dataset.i18nAria, 'aria-label');
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) setLabel(el, el.dataset.i18nPlaceholder, 'placeholder');
}

selector?.addEventListener('change', () => {
  localStorage.setItem(preferenceKey, selector.value);
  render();
});
window.addEventListener('storage', event => {
  if (event.key === preferenceKey || event.key === null) render();
});
render();
