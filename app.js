/**
 * DISCORD ULTRA SOUNDBOARD V3.0 - ADVANCED WORLD SHARE & VIRTUAL MIC ROUTING ENGINE
 * Author: UG
 */

// ==================== INDEXEDDB STORAGE FOR ONLY-ME SOUNDS ====================
const DB_NAME = 'UGSoundboardDB_v3';
const DB_VERSION = 1;
const LOCAL_STORE = 'local_sounds';

class LocalSoundDB {
    static async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(LOCAL_STORE)) {
                    db.createObjectStore(LOCAL_STORE, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    static async getAll() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(LOCAL_STORE, 'readonly');
            const store = transaction.objectStore(LOCAL_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    static async save(sound) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(LOCAL_STORE, 'readwrite');
            const store = transaction.objectStore(LOCAL_STORE);
            const request = store.put(sound);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    static async delete(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(LOCAL_STORE, 'readwrite');
            const store = transaction.objectStore(LOCAL_STORE);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// ==================== WORLD SHARED STORE MANAGER ====================
const WORLD_STORAGE_KEY = 'UG_WORLD_SOUNDS_DATA_V3';
const ADMIN_PASSCODE_KEY = 'UG_ADMIN_PASSCODE_SECRET';

class WorldSoundDB {
    static getRawList() {
        try {
            const data = localStorage.getItem(WORLD_STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    static saveRawList(list) {
        try {
            localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            console.error('Error saving world list to storage:', e);
        }
    }

    static getAdminPasscode() {
        return localStorage.getItem(ADMIN_PASSCODE_KEY) || 'UG1';
    }

    static setAdminPasscode(newPass) {
        localStorage.setItem(ADMIN_PASSCODE_KEY, newPass);
    }
}


// ==================== MAIN SOUNDBOARD APP CONTROLLER ====================
class SoundboardApp {
    constructor() {
        this.localSounds = [];
        this.worldSounds = [];
        this.activeAudioInstances = [];
        this.currentSelectedFile = null;
        this.selectedEmoji = '🔊';
        this.selectedColor = 'blurple';
        this.selectedShortcut = '';
        this.playMode = 'multi'; // 'multi' or 'solo'
        this.masterVolume = 0.8;
        this.currentCategoryFilter = 'world'; // 'world' or 'local'
        this.isAdminMode = false;

        // Mic Routing & Audio Output Device Control State
        this.selectedSinkId = 'default';
        this.cableDeviceId = null;
        this.micMode = 'sound_only'; // 'sound_only' or 'dual_voice'
        this.micStream = null;
        this.micCableAudio = null;
        this.audioCtx = null;
        this.micSourceNode = null;

        this.presetEmojis = ['🔊', '🎮', '💥', '⚡', '🎉', '🔥', '🦆', '🎺', '🎺', '💀', '🤡', '🤖', '👑', '🚨', '🎶', '🎯', '✨', '🚀'];

        this.init();
    }

    async init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderEmojiPicker();
        await this.loadWorldSounds();
        await this.loadLocalSounds();
        this.setupKeyboardListeners();
        this.loadAudioDevices();
    }

    cacheDOM() {
        // Nav & Views
        this.navWelcomeBtn = document.getElementById('navWelcomeBtn');
        this.navBoardBtn = document.getElementById('navBoardBtn');
        this.navAddBtn = document.getElementById('navAddBtn');
        this.adminNavBtn = document.getElementById('adminNavBtn');
        this.adminLockIcon = document.getElementById('adminLockIcon');
        this.adminBtnText = document.getElementById('adminBtnText');

        this.welcomeSection = document.getElementById('welcomeSection');
        this.addSection = document.getElementById('addSection');
        this.boardSection = document.getElementById('boardSection');
        this.guideSection = document.getElementById('guideSection');
        this.soundCountBadge = document.getElementById('soundCountBadge');

        // User Guide Elements
        this.navGuideBtn = document.getElementById('navGuideBtn');
        this.guideLangBtns = document.querySelectorAll('.guide-lang-btn');
        this.guideContentCards = document.querySelectorAll('.guide-content-card');

        // Welcome Hero
        this.heroAddBtn = document.getElementById('heroAddBtn');
        this.heroPlayBtn = document.getElementById('heroPlayBtn');

        // Header Audio & Mic Controls
        this.micModeBtn = document.getElementById('micModeBtn');
        this.micModeIcon = document.getElementById('micModeIcon');
        this.micModeText = document.getElementById('micModeText');
        this.audioOutputSelect = document.getElementById('audioOutputSelect');
        this.installDriverBtn = document.getElementById('installDriverBtn');
        this.vbGuideBtn = document.getElementById('vbGuideBtn');

        this.masterVolumeInput = document.getElementById('masterVolume');
        this.volumeValueText = document.getElementById('volumeValue');
        this.stopAllBtn = document.getElementById('stopAllBtn');

        // Add Sound Form Components
        this.dropzone = document.getElementById('dropzone');
        this.audioFileInput = document.getElementById('audioFileInput');
        this.browseFileBtn = document.getElementById('browseFileBtn');
        this.soundConfigForm = document.getElementById('soundConfigForm');
        this.previewPlayBtn = document.getElementById('previewPlayBtn');
        this.previewFilename = document.getElementById('previewFilename');
        this.previewFilesize = document.getElementById('previewFilesize');
        this.audioPreviewElement = document.getElementById('audioPreviewElement');
        this.worldShareCheckbox = document.getElementById('worldShareCheckbox');
        this.soundNameInput = document.getElementById('soundNameInput');
        this.currentEmojiDisplay = document.getElementById('currentEmojiDisplay');
        this.customEmojiInput = document.getElementById('customEmojiInput');
        this.emojiPickerGrid = document.getElementById('emojiPickerGrid');
        this.colorPickerGrid = document.getElementById('colorPickerGrid');
        this.shortcutInput = document.getElementById('shortcutInput');
        this.clearShortcutBtn = document.getElementById('clearShortcutBtn');
        this.cancelAddBtn = document.getElementById('cancelAddBtn');
        this.saveSoundBtn = document.getElementById('saveSoundBtn');

        // Play Soundboard Components
        this.soundSearchInput = document.getElementById('soundSearchInput');
        this.tabCatWorld = document.getElementById('tabCatWorld');
        this.tabCatLocal = document.getElementById('tabCatLocal');
        this.cntWorld = document.getElementById('cntWorld');
        this.cntLocal = document.getElementById('cntLocal');

        this.overlapModeBtn = document.getElementById('overlapModeBtn');
        this.singleModeBtn = document.getElementById('singleModeBtn');
        this.quickAddNavBtn = document.getElementById('quickAddNavBtn');
        this.nowPlayingBar = document.getElementById('nowPlayingBar');
        this.nowPlayingTitle = document.getElementById('nowPlayingTitle');
        this.nowPlayingStopBtn = document.getElementById('nowPlayingStopBtn');
        this.soundGrid = document.getElementById('soundGrid');
        this.emptyState = document.getElementById('emptyState');
        this.emptyAddBtn = document.getElementById('emptyAddBtn');

        // Modals
        this.editModalOverlay = document.getElementById('editModalOverlay');
        this.closeEditModalBtn = document.getElementById('closeEditModalBtn');
        this.editSoundId = document.getElementById('editSoundId');
        this.editSoundName = document.getElementById('editSoundName');
        this.editEmojiDisplay = document.getElementById('editEmojiDisplay');
        this.editEmojiInput = document.getElementById('editEmojiInput');
        this.editShortcutInput = document.getElementById('editShortcutInput');
        this.editClearShortcutBtn = document.getElementById('editClearShortcutBtn');
        this.deleteSoundBtn = document.getElementById('deleteSoundBtn');
        this.saveEditBtn = document.getElementById('saveEditBtn');

        // Admin Modal
        this.adminModalOverlay = document.getElementById('adminModalOverlay');
        this.closeAdminModalBtn = document.getElementById('closeAdminModalBtn');
        this.adminLoginView = document.getElementById('adminLoginView');
        this.adminActiveView = document.getElementById('adminActiveView');
        this.adminPinInput = document.getElementById('adminPinInput');
        this.loginAdminBtn = document.getElementById('loginAdminBtn');
        this.logoutAdminBtn = document.getElementById('logoutAdminBtn');
        this.newAdminPassInput = document.getElementById('newAdminPassInput');
        this.changePassBtn = document.getElementById('changePassBtn');

        // VB Guide Modal
        this.vbGuideModalOverlay = document.getElementById('vbGuideModalOverlay');
        this.closeVbGuideModalBtn = document.getElementById('closeVbGuideModalBtn');
        this.closeVbGuideFooterBtn = document.getElementById('closeVbGuideFooterBtn');
    }

    bindEvents() {
        // Navigation Switcher
        [this.navWelcomeBtn, this.navBoardBtn, this.navAddBtn, this.navGuideBtn].forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.switchTab(targetTab);
            });
        });

        this.heroAddBtn.addEventListener('click', () => this.switchTab('add'));
        this.heroPlayBtn.addEventListener('click', () => this.switchTab('board'));
        this.quickAddNavBtn.addEventListener('click', () => this.switchTab('add'));
        this.emptyAddBtn.addEventListener('click', () => this.switchTab('add'));

        // Mic Routing & Audio Output Device Handlers
        this.micModeBtn.addEventListener('click', () => this.toggleMicMode());
        
        this.audioOutputSelect.addEventListener('change', (e) => {
            this.selectedSinkId = e.target.value;
            this.showToast(`Audio Output set to: ${e.target.options[e.target.selectedIndex].text}`, 'success');
        });

        this.audioOutputSelect.addEventListener('focus', () => {
            this.refreshAudioDevicesWithPermission();
        });

        if (this.installDriverBtn) {
            this.installDriverBtn.addEventListener('click', () => {
                this.vbGuideModalOverlay.classList.add('active');
                this.showToast('ℹ️ Open Driver Installer dialog. Click 1-Click Auto Installer to install VB-Cable!', 'success');
            });
        }

        this.vbGuideBtn.addEventListener('click', () => {
            this.vbGuideModalOverlay.classList.add('active');
        });

        this.closeVbGuideModalBtn.addEventListener('click', () => {
            this.vbGuideModalOverlay.classList.remove('active');
        });
        
        this.closeVbGuideFooterBtn.addEventListener('click', () => {
            this.vbGuideModalOverlay.classList.remove('active');
        });

        // Admin Mode Toggle
        this.adminNavBtn.addEventListener('click', () => {
            this.adminModalOverlay.classList.add('active');
        });

        this.closeAdminModalBtn.addEventListener('click', () => {
            this.adminModalOverlay.classList.remove('active');
        });

        this.loginAdminBtn.addEventListener('click', () => this.handleAdminLogin());
        this.logoutAdminBtn.addEventListener('click', () => this.handleAdminLogout());
        this.changePassBtn.addEventListener('click', () => this.handleChangePasscode());

        this.adminPinInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleAdminLogin();
        });

        // Master Volume
        this.masterVolumeInput.addEventListener('input', (e) => {
            const val = e.target.value;
            this.masterVolume = val / 100;
            this.volumeValueText.textContent = `${val}%`;
            this.activeAudioInstances.forEach(item => {
                if (item.audio) item.audio.volume = this.masterVolume;
            });
        });

        // Stop All Audio
        this.stopAllBtn.addEventListener('click', () => this.stopAllAudio());
        this.nowPlayingStopBtn.addEventListener('click', () => this.stopAllAudio());

        // File Drag & Drop Handlers
        this.browseFileBtn.addEventListener('click', () => this.audioFileInput.click());
        this.dropzone.addEventListener('click', (e) => {
            if (e.target !== this.browseFileBtn && !this.browseFileBtn.contains(e.target)) {
                this.audioFileInput.click();
            }
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dropzone.classList.remove('dragover');
            });
        });

        this.dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                this.handleFileSelected(files[0]);
            }
        });

        this.audioFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleFileSelected(e.target.files[0]);
            }
        });

        // Preview Player Button
        this.previewPlayBtn.addEventListener('click', () => {
            if (this.audioPreviewElement.paused) {
                this.audioPreviewElement.volume = this.masterVolume;
                this.audioPreviewElement.play();
                this.previewPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            } else {
                this.audioPreviewElement.pause();
                this.previewPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            }
        });

        this.audioPreviewElement.addEventListener('ended', () => {
            this.previewPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        });

        // Custom Emoji & Color Pickers
        this.customEmojiInput.addEventListener('input', (e) => {
            if (e.target.value) {
                this.selectedEmoji = e.target.value;
                this.currentEmojiDisplay.textContent = this.selectedEmoji;
                this.deselectEmojiGrid();
            }
        });

        this.colorPickerGrid.addEventListener('click', (e) => {
            const target = e.target.closest('.color-option');
            if (target) {
                this.colorPickerGrid.querySelectorAll('.color-option').forEach(el => el.classList.remove('active'));
                target.classList.add('active');
                this.selectedColor = target.dataset.color;
            }
        });

        // Keybinding capturing in Add Form
        this.shortcutInput.addEventListener('keydown', (e) => {
            e.preventDefault();
            const key = e.key.length === 1 ? e.key.toUpperCase() : e.code;
            this.selectedShortcut = key;
            this.shortcutInput.value = key;
        });

        this.clearShortcutBtn.addEventListener('click', () => {
            this.selectedShortcut = '';
            this.shortcutInput.value = '';
        });

        // Save Sound Action
        this.saveSoundBtn.addEventListener('click', () => this.saveCurrentSound());
        this.cancelAddBtn.addEventListener('click', () => this.resetAddForm());

        // Play Soundboard Category Filters (World Share & Only Me tabs)
        [this.tabCatWorld, this.tabCatLocal].forEach(tab => {
            tab.addEventListener('click', (e) => {
                const cat = e.currentTarget.dataset.category;
                this.currentCategoryFilter = cat;
                [this.tabCatWorld, this.tabCatLocal].forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.renderBoard();
            });
        });

        this.soundSearchInput.addEventListener('input', () => this.renderBoard());

        this.overlapModeBtn.addEventListener('click', () => {
            this.playMode = 'multi';
            this.overlapModeBtn.classList.add('active');
            this.singleModeBtn.classList.remove('active');
        });

        this.singleModeBtn.addEventListener('click', () => {
            this.playMode = 'solo';
            this.singleModeBtn.classList.add('active');
            this.overlapModeBtn.classList.remove('active');
        });

        // Edit Modal Controls
        this.closeEditModalBtn.addEventListener('click', () => this.closeEditModal());
        this.deleteSoundBtn.addEventListener('click', () => this.deleteEditSound());
        this.saveEditBtn.addEventListener('click', () => this.saveEditSound());

        this.editShortcutInput.addEventListener('keydown', (e) => {
            e.preventDefault();
            const key = e.key.length === 1 ? e.key.toUpperCase() : e.code;
            this.editShortcutInput.value = key;
        });

        // Language Switcher in User Guide (new card-style picker)
        document.querySelectorAll('.guide-lang-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.currentTarget.dataset.lang;
                document.querySelectorAll('.guide-lang-card').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.guide-body').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const targetBody = document.getElementById(`guide${lang.charAt(0).toUpperCase() + lang.slice(1)}`);
                if (targetBody) targetBody.classList.add('active');
            });
        });

    }

    // Helper: Determine the active Virtual Cable sink ID (or selected device)
    getCableSinkId() {
        if (this.selectedSinkId && this.selectedSinkId !== 'default') {
            return this.selectedSinkId;
        }
        if (this.cableDeviceId) {
            return this.cableDeviceId;
        }
        return null;
    }

    // Refresh devices with permission so device labels (like "CABLE Input") are revealed
    async refreshAudioDevicesWithPermission() {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                tempStream.getTracks().forEach(t => t.stop());
                await this.loadAudioDevices();
            }
        } catch (e) {
            console.warn('Microphone permission check:', e);
        }
    }

    // Detect and populate available Audio Output Devices (Speakers / VB-Cable)
    async loadAudioDevices() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            return;
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

            if (audioOutputs.length > 0) {
                this.audioOutputSelect.innerHTML = '<option value="default">🔊 Default Speaker</option>';
                let foundCable = false;

                audioOutputs.forEach(device => {
                    if (!device.deviceId) return;
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    let label = device.label || `Output (${device.deviceId.substring(0, 6)}...)`;
                    const lowerLabel = label.toLowerCase();
                    if (lowerLabel.includes('cable') || lowerLabel.includes('vb-audio') || lowerLabel.includes('virtual')) {
                        label = `🎙️ ${label} (Virtual Cable)`;
                        this.cableDeviceId = device.deviceId;
                        foundCable = true;
                    }
                    option.textContent = label;
                    this.audioOutputSelect.appendChild(option);
                });

                // Auto-select Virtual Cable if found and user hasn't selected another device
                if (foundCable && this.cableDeviceId && this.selectedSinkId === 'default') {
                    this.audioOutputSelect.value = this.cableDeviceId;
                    this.selectedSinkId = this.cableDeviceId;
                    console.log('VB-Audio Cable auto-selected:', this.cableDeviceId);
                }
            }
        } catch (err) {
            console.warn('Could not enumerate audio output devices:', err);
        }
    }

    // Toggle Mic Routing (Sound Only vs Dual Voice + Sound)
    async toggleMicMode() {
        if (this.micMode === 'sound_only') {
            // Click 1: Switch to Dual Voice Mode -> Stream real microphone + soundboard into Game/Discord
            try {
                await this.refreshAudioDevicesWithPermission();

                this.micStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    }
                });

                // Pipe microphone stream into Virtual Cable sink
                if (!this.micCableAudio) {
                    this.micCableAudio = new Audio();
                }
                this.micCableAudio.srcObject = this.micStream;

                const cableSink = this.getCableSinkId();
                if (cableSink && typeof this.micCableAudio.setSinkId === 'function') {
                    await this.micCableAudio.setSinkId(cableSink).catch(e => console.warn('setSinkId for mic error:', e));
                }

                this.micCableAudio.volume = 1.0;
                await this.micCableAudio.play().catch(e => console.warn('micCableAudio play:', e));

                this.micMode = 'dual_voice';
                this.micModeBtn.className = 'mic-mode-btn dual-mic';
                this.micModeIcon.className = 'fa-solid fa-microphone';
                this.micModeText.textContent = 'Dual Voice + Sound';
                this.showToast('🎧 Dual Voice Mode ON! Your real voice & soundboard will be sent together into Discord/Game.', 'success');
            } catch (err) {
                console.error(err);
                this.showToast('Microphone access denied! Allow microphone in browser to enable Dual Voice.', 'danger');
            }
        } else {
            // Click 2: Switch to Sound Only Mic Mode -> Stop real microphone (Voice Muted)
            if (this.micStream) {
                this.micStream.getTracks().forEach(track => track.stop());
                this.micStream = null;
            }
            if (this.micCableAudio) {
                this.micCableAudio.pause();
                this.micCableAudio.srcObject = null;
            }

            this.micMode = 'sound_only';
            this.micModeBtn.className = 'mic-mode-btn sound-only';
            this.micModeIcon.className = 'fa-solid fa-microphone-slash';
            this.micModeText.textContent = 'Sound Only Mic';
            this.showToast('🎙️ Sound Only Mic Active. Your physical voice is MUTED in game — only sounds will play!', 'success');
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

        if (tabName === 'welcome') {
            this.navWelcomeBtn.classList.add('active');
            this.welcomeSection.classList.add('active');
        } else if (tabName === 'board') {
            this.navBoardBtn.classList.add('active');
            this.boardSection.classList.add('active');
        } else if (tabName === 'add') {
            this.navAddBtn.classList.add('active');
            this.addSection.classList.add('active');
        } else if (tabName === 'guide') {
            if (this.navGuideBtn) this.navGuideBtn.classList.add('active');
            if (this.guideSection) this.guideSection.classList.add('active');
        }
    }

    renderEmojiPicker() {
        this.emojiPickerGrid.innerHTML = '';
        this.presetEmojis.forEach((emoji, index) => {
            const item = document.createElement('div');
            item.className = `emoji-option ${index === 0 ? 'selected' : ''}`;
            item.textContent = emoji;
            item.addEventListener('click', () => {
                this.deselectEmojiGrid();
                item.classList.add('selected');
                this.selectedEmoji = emoji;
                this.currentEmojiDisplay.textContent = emoji;
                this.customEmojiInput.value = '';
            });
            this.emojiPickerGrid.appendChild(item);
        });
    }

    deselectEmojiGrid() {
        this.emojiPickerGrid.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('selected'));
    }

    // Handle File Selected
    handleFileSelected(file) {
        if (!file.type.startsWith('audio/')) {
            this.showToast('Please select a valid audio file!', 'danger');
            return;
        }

        this.currentSelectedFile = file;

        const fullName = file.name;
        const nameWithoutExt = fullName.substring(0, fullName.lastIndexOf('.')) || fullName;

        this.soundNameInput.value = nameWithoutExt;
        this.previewFilename.textContent = fullName;
        this.previewFilesize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

        const objectUrl = URL.createObjectURL(file);
        this.audioPreviewElement.src = objectUrl;

        this.soundConfigForm.style.display = 'block';
        this.soundConfigForm.scrollIntoView({ behavior: 'smooth' });
    }

    // Save Sound (World Share or Only Me)
    async saveCurrentSound() {
        if (!this.currentSelectedFile) {
            this.showToast('Please select an audio file first!', 'danger');
            return;
        }

        const name = this.soundNameInput.value.trim() || 'Untitled Sound';
        const emoji = this.selectedEmoji || '🔊';
        const color = this.selectedColor || 'blurple';
        const shortcut = this.selectedShortcut || '';
        const isWorldShare = this.worldShareCheckbox.checked;

        const soundId = (isWorldShare ? 'world_' : 'local_') + Date.now();
        const base64Audio = await this.blobToBase64(this.currentSelectedFile);

        const newSound = {
            id: soundId,
            name: name,
            emoji: emoji,
            color: color,
            shortcut: shortcut,
            audioData: base64Audio,
            audioBlob: this.currentSelectedFile,
            isWorld: isWorldShare,
            createdAt: Date.now()
        };

        if (isWorldShare) {
            this.worldSounds.push(newSound);
            WorldSoundDB.saveRawList(this.worldSounds);
            this.showToast(`🌍 Sound "${name}" published to World Share!`, 'success');
        } else {
            await LocalSoundDB.save(newSound);
            this.localSounds.push(newSound);
            this.showToast(`🔒 Sound "${name}" saved to Only Me (Local)!`, 'success');
        }

        this.updateCounts();
        this.resetAddForm();
        this.switchTab('board');

        if (isWorldShare) {
            this.currentCategoryFilter = 'world';
            this.tabCatWorld.classList.add('active');
            this.tabCatLocal.classList.remove('active');
        } else {
            this.currentCategoryFilter = 'local';
            this.tabCatLocal.classList.add('active');
            this.tabCatWorld.classList.remove('active');
        }

        this.renderBoard();
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    resetAddForm() {
        this.currentSelectedFile = null;
        this.audioFileInput.value = '';
        this.soundNameInput.value = '';
        this.audioPreviewElement.src = '';
        this.soundConfigForm.style.display = 'none';
        this.previewPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        this.selectedShortcut = '';
        this.shortcutInput.value = '';
        this.worldShareCheckbox.checked = true;
    }

    // Load World Sounds
    async loadWorldSounds() {
        let rawWorld = WorldSoundDB.getRawList();
        if (!rawWorld || rawWorld.length === 0) {
            const defaultPresets = [
                { name: 'Discord Join', emoji: '🎮', type: 'join', color: 'blurple', key: '1' },
                { name: 'Discord Mute', emoji: '🔇', type: 'mute', color: 'red', key: '2' },
                { name: 'Airhorn Blast', emoji: '🎺', type: 'airhorn', color: 'yellow', key: '3' },
                { name: 'Ba-Dum-Tss', emoji: '🥁', type: 'badumtss', color: 'cyan', key: '4' },
                { name: 'Funny Quack', emoji: '🦆', type: 'quack', color: 'green', key: '5' },
                { name: 'Victory Fanfare', emoji: '👑', type: 'victory', color: 'fuchsia', key: '6' },
                { name: 'GG Cheer', emoji: '✨', type: 'gg', color: 'purple', key: '7' }
            ];

            rawWorld = [];
            for (const p of defaultPresets) {
                const blob = window.SoundSynth.createAudioBlob(p.type);
                const base64 = await this.blobToBase64(blob);
                rawWorld.push({
                    id: 'world_preset_' + p.type,
                    name: p.name,
                    emoji: p.emoji,
                    color: p.color,
                    shortcut: p.key,
                    audioData: base64,
                    audioBlob: blob,
                    isWorld: true,
                    createdAt: Date.now()
                });
            }
            WorldSoundDB.saveRawList(rawWorld);
        }

        this.worldSounds = rawWorld.map(s => {
            if (s.audioData && !s.audioBlob) {
                s.audioBlob = this.base64ToBlob(s.audioData);
            }
            s.isWorld = true;
            return s;
        });
    }

    base64ToBlob(base64Data) {
        const parts = base64Data.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const uInt8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
    }

    // Load Local Only-Me Sounds
    async loadLocalSounds() {
        try {
            this.localSounds = await LocalSoundDB.getAll();
            this.localSounds.forEach(s => s.isWorld = false);
            this.updateCounts();
            this.renderBoard();
        } catch (e) {
            console.error(e);
        }
    }

    updateCounts() {
        const total = this.worldSounds.length + this.localSounds.length;
        this.cntWorld.textContent = this.worldSounds.length;
        this.cntLocal.textContent = this.localSounds.length;
        this.soundCountBadge.textContent = total;
    }

    renderBoard() {
        const query = this.soundSearchInput.value.toLowerCase().trim();

        let listToDisplay = (this.currentCategoryFilter === 'local') ? this.localSounds : this.worldSounds;

        const filtered = listToDisplay.filter(s => 
            s.name.toLowerCase().includes(query) || s.emoji.includes(query)
        );

        this.soundGrid.innerHTML = '';

        if (filtered.length === 0) {
            this.emptyState.style.display = 'block';
            this.soundGrid.style.display = 'none';
            return;
        }

        this.emptyState.style.display = 'none';
        this.soundGrid.style.display = 'grid';

        filtered.forEach(sound => {
            const card = document.createElement('div');
            card.className = `sound-card`;
            card.dataset.id = sound.id;

            const colorMap = {
                blurple: '#5865f2',
                green: '#23a55a',
                yellow: '#fee75c',
                fuchsia: '#eb459e',
                red: '#f23f43',
                cyan: '#00b0f4',
                orange: '#f97316',
                purple: '#a855f7'
            };
            const accentHex = colorMap[sound.color] || '#5865f2';
            card.style.setProperty('--card-accent', accentHex);

            const scopeBadgeHTML = sound.isWorld 
                ? `<span class="scope-badge world"><i class="fa-solid fa-earth-americas"></i> World</span>`
                : `<span class="scope-badge local"><i class="fa-solid fa-lock"></i> Only Me</span>`;

            let actionBtnHTML = '';
            if (sound.isWorld) {
                if (this.isAdminMode) {
                    actionBtnHTML = `
                        <button class="card-options-btn" title="Edit World Sound (Admin)">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>`;
                } else {
                    actionBtnHTML = `
                        <button class="import-to-local-btn" title="Copy to Only Me (Local)">
                            <i class="fa-solid fa-download"></i> Save Local
                        </button>`;
                }
            } else {
                actionBtnHTML = `
                    <button class="card-options-btn" title="Edit Local Sound">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>`;
            }

            card.innerHTML = `
                ${scopeBadgeHTML}
                <div class="sound-emoji">${sound.emoji}</div>
                <div class="sound-title">${this.escapeHTML(sound.name)}</div>
                <div class="sound-meta">
                    <span class="hotkey-badge">${sound.shortcut ? sound.shortcut : 'No Key'}</span>
                    ${actionBtnHTML}
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-options-btn')) {
                    e.stopPropagation();
                    this.openEditModal(sound);
                } else if (e.target.closest('.import-to-local-btn')) {
                    e.stopPropagation();
                    this.importWorldToLocal(sound);
                } else {
                    this.playSound(sound, card);
                }
            });

            this.soundGrid.appendChild(card);
        });
    }

    // Copy a World Sound into user's Private "Only Me" Local Storage
    async importWorldToLocal(worldSound) {
        const localCopy = {
            id: 'local_imp_' + Date.now(),
            name: `${worldSound.name} (Copy)`,
            emoji: worldSound.emoji,
            color: worldSound.color,
            shortcut: '',
            audioData: worldSound.audioData,
            audioBlob: worldSound.audioBlob,
            isWorld: false,
            createdAt: Date.now()
        };

        await LocalSoundDB.save(localCopy);
        this.localSounds.push(localCopy);
        this.updateCounts();
        this.showToast(`📥 "${worldSound.name}" saved to your "Only Me" board!`, 'success');

        this.currentCategoryFilter = 'local';
        this.tabCatLocal.classList.add('active');
        this.tabCatWorld.classList.remove('active');
        this.renderBoard();
    }

    playSound(sound, cardElement = null) {
        if (this.playMode === 'solo') {
            this.stopAllAudio();
        }

        let audioUrl;
        if (sound.audioBlob instanceof Blob) {
            audioUrl = URL.createObjectURL(sound.audioBlob);
        } else if (sound.audioData) {
            audioUrl = sound.audioData;
        } else {
            return;
        }

        // 1. Play to user's headphones/default speaker so USER hears the sound
        const userAudio = new Audio(audioUrl);
        userAudio.volume = this.masterVolume;

        // 2. Play simultaneously to Virtual Cable (CABLE Input) so teammates in Game/Discord hear the sound
        let cableAudio = null;
        const cableSink = this.getCableSinkId();

        if (cableSink && typeof Audio.prototype.setSinkId === 'function') {
            try {
                cableAudio = new Audio(audioUrl);
                cableAudio.volume = this.masterVolume;
                cableAudio.setSinkId(cableSink).catch(err => console.warn('setSinkId for cable audio error:', err));
            } catch (err) {
                console.warn('Error creating cable audio:', err);
            }
        }

        const instance = { id: sound.id, audio: userAudio, cableAudio, cardElement };
        this.activeAudioInstances.push(instance);

        if (cardElement) {
            cardElement.classList.add('playing');
        }

        this.nowPlayingBar.style.display = 'flex';
        this.nowPlayingTitle.textContent = `${sound.emoji} ${sound.name}`;

        userAudio.play().catch(err => console.error('userAudio play error:', err));
        if (cableAudio) {
            cableAudio.play().catch(err => console.error('cableAudio play error:', err));
        }

        userAudio.addEventListener('ended', () => {
            if (cardElement) cardElement.classList.remove('playing');
            if (cableAudio) {
                cableAudio.pause();
                cableAudio.currentTime = 0;
            }
            this.activeAudioInstances = this.activeAudioInstances.filter(i => i.audio !== userAudio);
            if (this.activeAudioInstances.length === 0) {
                this.nowPlayingBar.style.display = 'none';
            }
        });
    }

    stopAllAudio() {
        this.activeAudioInstances.forEach(item => {
            if (item.audio) {
                item.audio.pause();
                item.audio.currentTime = 0;
            }
            if (item.cableAudio) {
                item.cableAudio.pause();
                item.cableAudio.currentTime = 0;
            }
            if (item.cardElement) {
                item.cardElement.classList.remove('playing');
            }
        });
        this.activeAudioInstances = [];
        this.nowPlayingBar.style.display = 'none';
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            const pressedKey = e.key.length === 1 ? e.key.toUpperCase() : e.code;
            const currentList = (this.currentCategoryFilter === 'local') ? this.localSounds : this.worldSounds;
            const matchedSound = currentList.find(s => s.shortcut && s.shortcut.toUpperCase() === pressedKey);

            if (matchedSound) {
                const card = this.soundGrid.querySelector(`.sound-card[data-id="${matchedSound.id}"]`);
                this.playSound(matchedSound, card);
            }
        });
    }

    // Modal Edit Options
    openEditModal(sound) {
        if (sound.isWorld && !this.isAdminMode) {
            this.showToast('World sounds can only be edited by Admin!', 'danger');
            return;
        }

        this.editSoundId.value = sound.id;
        this.editSoundName.value = sound.name;
        this.editEmojiDisplay.textContent = sound.emoji;
        this.editEmojiInput.value = sound.emoji;
        this.editShortcutInput.value = sound.shortcut || '';
        this.editModalOverlay.classList.add('active');
    }

    closeEditModal() {
        this.editModalOverlay.classList.remove('active');
    }

    async saveEditSound() {
        const id = this.editSoundId.value;
        const isWorld = id.startsWith('world_');

        if (isWorld) {
            if (!this.isAdminMode) {
                this.showToast('Only Admin can modify World sounds!', 'danger');
                return;
            }
            const idx = this.worldSounds.findIndex(s => s.id === id);
            if (idx !== -1) {
                this.worldSounds[idx].name = this.editSoundName.value.trim() || 'Untitled';
                this.worldSounds[idx].emoji = this.editEmojiInput.value.trim() || '🔊';
                this.worldSounds[idx].shortcut = this.editShortcutInput.value.trim();
                WorldSoundDB.saveRawList(this.worldSounds);
            }
        } else {
            const idx = this.localSounds.findIndex(s => s.id === id);
            if (idx !== -1) {
                this.localSounds[idx].name = this.editSoundName.value.trim() || 'Untitled';
                this.localSounds[idx].emoji = this.editEmojiInput.value.trim() || '🔊';
                this.localSounds[idx].shortcut = this.editShortcutInput.value.trim();
                await LocalSoundDB.save(this.localSounds[idx]);
            }
        }

        this.closeEditModal();
        this.renderBoard();
        this.showToast('Sound updated successfully!', 'success');
    }

    async deleteEditSound() {
        const id = this.editSoundId.value;
        const isWorld = id.startsWith('world_');

        if (isWorld) {
            if (!this.isAdminMode) {
                this.showToast('Only Admin can delete World sounds!', 'danger');
                return;
            }
            this.worldSounds = this.worldSounds.filter(s => s.id !== id);
            WorldSoundDB.saveRawList(this.worldSounds);
        } else {
            await LocalSoundDB.delete(id);
            this.localSounds = this.localSounds.filter(s => s.id !== id);
        }

        this.updateCounts();
        this.closeEditModal();
        this.renderBoard();
        this.showToast('Sound deleted!', 'danger');
    }

    // Admin Authentication Handlers
    handleAdminLogin() {
        const pin = this.adminPinInput.value.trim();
        const currentPass = WorldSoundDB.getAdminPasscode();

        if (pin === currentPass) {
            this.isAdminMode = true;
            this.adminNavBtn.classList.add('unlocked');
            this.adminLockIcon.className = 'fa-solid fa-lock-open';
            this.adminBtnText.textContent = 'Admin Active';

            this.adminLoginView.style.display = 'none';
            this.adminActiveView.style.display = 'flex';

            this.logoutAdminBtn.style.display = 'inline-flex';
            this.loginAdminBtn.style.display = 'none';
            this.adminPinInput.value = '';
            this.renderBoard();
            this.showToast('🔑 Admin Mode Unlocked! You can now edit/delete World sounds.', 'success');
        } else {
            this.showToast('Incorrect Admin Passcode!', 'danger');
        }
    }

    handleAdminLogout() {
        this.isAdminMode = false;
        this.adminNavBtn.classList.remove('unlocked');
        this.adminLockIcon.className = 'fa-solid fa-lock';
        this.adminBtnText.textContent = 'Admin Mode';

        this.adminLoginView.style.display = 'block';
        this.adminActiveView.style.display = 'none';

        this.logoutAdminBtn.style.display = 'none';
        this.loginAdminBtn.style.display = 'inline-flex';
        this.adminModalOverlay.classList.remove('active');
        this.renderBoard();
        this.showToast('Admin Mode Locked.', 'danger');
    }

    handleChangePasscode() {
        const newPass = this.newAdminPassInput.value.trim();
        if (!newPass || newPass.length < 3) {
            this.showToast('Please enter a passcode at least 3 characters!', 'danger');
            return;
        }

        WorldSoundDB.setAdminPasscode(newPass);
        this.newAdminPassInput.value = '';
        this.showToast('🔐 Admin Passcode successfully updated!', 'success');
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${this.escapeHTML(message)}</span>`;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&#34;'
            }[tag] || tag)
        );
    }
}

// Instantiate Soundboard Application when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SoundboardApp();
});
