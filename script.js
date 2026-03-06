/**
 * 音楽作成ゲーム
 * 歯車メニュー・フルスクリーン・曲管理機能 追加版
 */

const canvas = document.getElementById('scoreCanvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('canvas-viewport');
const yAxisLabelsContainer = document.getElementById('y-axis-labels');

const hTrack = document.getElementById('h-scroll-track');
const hHandle = document.getElementById('h-scroll-handle');
const vTrack = document.getElementById('v-scroll-track');
const vHandle = document.getElementById('v-scroll-handle');

const playBtn = document.getElementById('playBtn');
const loopBtn = document.getElementById('loopBtn');
let isLooping = true;
const synthTypeSelect = document.getElementById('synthType');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const songNameInput = document.getElementById('songNameInput');
const loadingOverlay = document.getElementById('loading-overlay');

const modeDrawBtn = document.getElementById('modeDrawBtn');
const modeEraseBtn = document.getElementById('modeEraseBtn');
const randomDrumsBtn = document.getElementById('randomDrumsBtn');

// 設定モーダル関連
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const manageSongList = document.getElementById('manage-song-list');

const DOREMI = ["ソ", "", "ファ", "ミ", "", "レ", "", "ド", "シ", "", "ラ", "", "ソ", "", "ファ", "ミ", "", "レ", "", "ド", "シ", "", "ラ", "", "ソ"];
const NOTES = ["G5", "F#5", "F5", "E5", "D#5", "D5", "C#5", "C5", "B4", "A#4", "A4", "G#4", "G4", "F#4", "F4", "E4", "D#4", "D4", "C#4", "C4", "B3", "A#3", "A3", "G#3", "G3"];

const ROW_COUNT = NOTES.length + 3; // +3 percussion rows
const MELODY_ROWS = NOTES.length;
const COLS = 64;
const CELL_W = 60;
const CELL_H = 27; // 全体の高さを以前(15音*45px=675px)に合わせるため 675/25=27pxに調整
const OFFSET_X = 110;
const MARGIN_TOP = 40;

const PERCUSSION_TYPES = [
    { id: "kick", name: "🥁 バスドラム", note: "C1" },
    { id: "snare", name: "🥁 スネア", note: "D1" },
    { id: "hihat", name: "📀 ハイハット", note: "E1" },
    { id: "clap", name: "👏 クラップ", note: "F1" },
    { id: "cowbell", name: "🔔 カウベル", note: "G1" }
];
let percussionSettings = ["kick", "snare", "hihat"];

let notesData = [];
let isPlaying = false;
let draggedNote = null;
let currentMode = 'draw';

// 音源管理
let synthPoly = new Tone.PolySynth(Tone.Synth).toDestination();
let samplerPiano = new Tone.Sampler({
    urls: {
        "A0": "A0.mp3", "C1": "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3", "A1": "A1.mp3",
        "C2": "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3", "A2": "A2.mp3", "C3": "C3.mp3",
        "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", "A3": "A3.mp3", "C4": "C4.mp3", "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3", "A4": "A4.mp3", "C5": "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
        "A5": "A5.mp3", "C6": "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3", "A6": "A6.mp3",
        "C7": "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3", "A7": "A7.mp3", "C8": "C8.mp3"
    },
    release: 1,
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    onload: () => {
        loadingOverlay.style.display = 'none';
    }
}).toDestination();

let currentInstrument = samplerPiano;

// ドラム音源
const drumSampler = new Tone.Sampler({
    urls: {
        "C1": "kick.mp3",
        "D1": "snare.mp3",
        "E1": "hihat.mp3",
        "F1": "tom1.mp3",
        "G1": "tom2.mp3"
    },
    baseUrl: "https://tonejs.github.io/audio/drum-samples/CR78/",
    onload: () => console.log("Drums loaded")
}).toDestination();

canvas.width = COLS * CELL_W + OFFSET_X + 50;
canvas.height = (ROW_COUNT - 1) * CELL_H + MARGIN_TOP + 100;

function createYAxisLabels() {
    yAxisLabelsContainer.innerHTML = '';
    yAxisLabelsContainer.style.height = `${canvas.height}px`;

    for (let i = 0; i < ROW_COUNT; i++) {
        const label = document.createElement('div');
        label.className = 'y-label';
        label.style.top = `${MARGIN_TOP + i * CELL_H}px`;

        if (i < MELODY_ROWS) {
            const note = NOTES[i];
            const isDo = (DOREMI[i] === "ド");
            const isStaffLine = (note === "E4" || note === "G4" || note === "B4" || note === "D5" || note === "F5");

            label.innerText = DOREMI[i];
            if (isStaffLine) label.style.color = "#333";
            else if (isDo) label.style.color = "#ff4444";
            else label.style.color = "#666";
        } else {
            // パーカッション行
            label.classList.add('percussion-label');
            const pIdx = i - MELODY_ROWS;
            const select = document.createElement('select');
            select.className = 'percussion-select';
            PERCUSSION_TYPES.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type.id;
                opt.innerText = type.name;
                if (type.id === percussionSettings[pIdx]) opt.selected = true;
                select.appendChild(opt);
            });
            select.onchange = (e) => {
                percussionSettings[pIdx] = e.target.value;
                updateSchedule();
            };
            label.appendChild(select);
        }

        yAxisLabelsContainer.appendChild(label);
    }
}

let scrollPercentX = 0;
let scrollPercentY = 0;

function updateCanvasPosition() {
    const maxX = canvas.width - viewport.offsetWidth;
    const maxY = canvas.height - viewport.offsetHeight;
    const posX = maxX > 0 ? scrollPercentX * maxX : 0;
    const posY = maxY > 0 ? scrollPercentY * maxY : 0;

    canvas.style.left = `-${posX}px`;
    canvas.style.top = `-${posY}px`;

    yAxisLabelsContainer.style.top = `-${posY}px`;

    const hRange = hTrack.offsetWidth - hHandle.offsetWidth;
    if (hRange > 0) hHandle.style.left = `${scrollPercentX * hRange}px`;

    const vRange = vTrack.offsetHeight - vHandle.offsetHeight;
    if (vRange > 0) vHandle.style.top = `${scrollPercentY * vRange}px`;
}

function updateHandleSizes() {
    const ratioX = Math.min(1, viewport.offsetWidth / canvas.width);
    hHandle.style.width = `${ratioX * 100}%`;
    const ratioY = Math.min(1, viewport.offsetHeight / canvas.height);
    vHandle.style.height = `${ratioY * 100}%`;
}

let activeScroll = null;
let startPos = 0;
let startPercent = 0;

function handleScrollStart(e, type) {
    activeScroll = type;
    const clientPos = e.touches ? e.touches[0] : e;
    startPos = (type === 'h') ? clientPos.clientX : clientPos.clientY;
    startPercent = (type === 'h') ? scrollPercentX : scrollPercentY;
    if (e.cancelable) e.preventDefault();
}

function handleScrollMove(e) {
    if (!activeScroll) return;
    const clientPos = e.touches ? e.touches[0] : e;
    if (activeScroll === 'h') {
        const delta = clientPos.clientX - startPos;
        const range = hTrack.offsetWidth - hHandle.offsetWidth;
        if (range > 0) scrollPercentX = Math.max(0, Math.min(1, startPercent + (delta / range)));
    } else {
        const delta = clientPos.clientY - startPos;
        const range = vTrack.offsetHeight - vHandle.offsetHeight;
        if (range > 0) scrollPercentY = Math.max(0, Math.min(1, startPercent + (delta / range)));
    }
    updateCanvasPosition();
}

function handleScrollEnd() { activeScroll = null; }

hHandle.addEventListener('mousedown', (e) => handleScrollStart(e, 'h'));
hHandle.addEventListener('touchstart', (e) => handleScrollStart(e, 'h'), { passive: false });
vHandle.addEventListener('mousedown', (e) => handleScrollStart(e, 'v'));
vHandle.addEventListener('touchstart', (e) => handleScrollStart(e, 'v'), { passive: false });
window.addEventListener('mousemove', handleScrollMove);
window.addEventListener('touchmove', handleScrollMove, { passive: false });
window.addEventListener('mouseup', handleScrollEnd);
window.addEventListener('touchend', handleScrollEnd);

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i <= COLS; i++) {
        const isMeasure = (i % 4 === 0);
        ctx.strokeStyle = isMeasure ? "#bbb" : "#eee";
        ctx.lineWidth = isMeasure ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(OFFSET_X + i * CELL_W, MARGIN_TOP);
        ctx.lineTo(OFFSET_X + i * CELL_W, MARGIN_TOP + (ROW_COUNT - 1) * CELL_H);
        ctx.stroke();
    }

    for (let i = 0; i < ROW_COUNT; i++) {
        let isStaffLine = false;
        let isDo = false;
        let isPercussion = (i >= MELODY_ROWS);

        const y = MARGIN_TOP + i * CELL_H;

        if (!isPercussion) {
            const note = NOTES[i];
            isDo = (DOREMI[i] === "ド");
            isStaffLine = (note === "E4" || note === "G4" || note === "B4" || note === "D5" || note === "F5");

            // 黒鍵（半音）の背景を塗ってわかりやすくする
            if (note.includes("#")) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
                ctx.fillRect(OFFSET_X, y - CELL_H / 2, COLS * CELL_W, CELL_H);
            }
        }

        if (isStaffLine) { ctx.strokeStyle = "#333"; ctx.lineWidth = 2; }
        else if (isDo) { ctx.strokeStyle = "#ffcccc"; ctx.lineWidth = 3; }
        else if (isPercussion) { ctx.strokeStyle = "#ffe0b2"; ctx.lineWidth = 2; }
        else { ctx.strokeStyle = "#eee"; ctx.lineWidth = 1; }

        ctx.beginPath();
        ctx.moveTo(OFFSET_X, y);
        ctx.lineTo(OFFSET_X + COLS * CELL_W, y);
        ctx.stroke();
    }

    notesData.forEach(n => {
        const isBeingDragged = (draggedNote === n);
        const isPercussion = (n.noteIndex >= MELODY_ROWS);

        if (currentMode === 'erase') ctx.fillStyle = "#ff6666";
        else ctx.fillStyle = isPercussion ? "#ff9800" : "#4A90E2"; // パーカッションはオレンジ

        ctx.beginPath();
        const x = OFFSET_X + n.timeIndex * CELL_W;
        const y = MARGIN_TOP + n.noteIndex * CELL_H;
        ctx.arc(x, y, 10, 0, Math.PI * 2); // 半音化に伴い半径を16から10へ
        ctx.fill();

        if (isBeingDragged && currentMode === 'draw') {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    });

    if (isPlaying) {
        let progress = Tone.Transport.progress;
        if (!Tone.Transport.loop) {
            const duration = Tone.Time(Tone.Transport.loopEnd).toSeconds();
            progress = duration > 0 ? Tone.Transport.seconds / duration : 0;
        }
        const barX = OFFSET_X + (progress * (COLS * CELL_W));
        ctx.strokeStyle = "#ff3366";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(barX, MARGIN_TOP);
        ctx.lineTo(barX, MARGIN_TOP + (ROW_COUNT - 1) * CELL_H);
        ctx.stroke();

        if (!activeScroll) {
            const maxX = canvas.width - viewport.offsetWidth;
            if (maxX > 0) {
                let targetX = (barX - OFFSET_X) - (viewport.offsetWidth * 0.2);
                scrollPercentX = Math.max(0, Math.min(1, targetX / maxX));
                updateCanvasPosition();
            }
        }
    }
}

function getGridPos(canvasX, canvasY) {
    const x = Math.round((canvasX - OFFSET_X) / CELL_W);
    const y = Math.round((canvasY - MARGIN_TOP) / CELL_H);
    return { x, y };
}

function getEventPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

modeDrawBtn.addEventListener('click', () => {
    currentMode = 'draw';
    modeDrawBtn.classList.add('active');
    modeEraseBtn.classList.remove('active');
    draw();
});

modeEraseBtn.addEventListener('click', () => {
    currentMode = 'erase';
    modeEraseBtn.classList.add('active');
    modeDrawBtn.classList.remove('active');
    draw();
});

function handleStart(e) {
    const pos = getEventPos(e);
    const grid = getGridPos(pos.x, pos.y);
    if (pos.x < OFFSET_X - CELL_W / 2) return;

    if (grid.x >= 0 && grid.x < COLS && grid.y >= 0 && grid.y < ROW_COUNT) {
        const foundIndex = notesData.findIndex(n => n.timeIndex === grid.x && n.noteIndex === grid.y);
        if (currentMode === 'erase') {
            if (foundIndex !== -1) {
                notesData.splice(foundIndex, 1);
                updateSchedule();
            }
        } else {
            if (foundIndex !== -1) {
                draggedNote = notesData[foundIndex];
            } else {
                const newNote = { timeIndex: grid.x, noteIndex: grid.y };
                notesData.push(newNote);
                draggedNote = newNote;
                playPreview(grid.y);
            }
        }
    }
    draw();
}

function handleMove(e) {
    if (!draggedNote || currentMode === 'erase') return;
    const pos = getEventPos(e);
    const grid = getGridPos(pos.x, pos.y);
    if (pos.x < OFFSET_X - CELL_W / 2) return;

    if (grid.x >= 0 && grid.x < COLS && grid.y >= 0 && grid.y < ROW_COUNT) {
        if (draggedNote.timeIndex !== grid.x || draggedNote.noteIndex !== grid.y) {
            draggedNote.timeIndex = grid.x;
            draggedNote.noteIndex = grid.y;
            playPreview(grid.y);
        }
    }
    draw();
}

function handleEnd() {
    if (!draggedNote || currentMode === 'erase') return;
    if (draggedNote.timeIndex < 0 || draggedNote.timeIndex >= COLS ||
        draggedNote.noteIndex < 0 || draggedNote.noteIndex >= ROW_COUNT) {
        notesData = notesData.filter(n => n !== draggedNote);
    }
    draggedNote = null;
    draw();
    updateSchedule();
}

canvas.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', (e) => { if (!activeScroll) handleMove(e); });
window.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchstart', (e) => { handleStart(e); }, { passive: false });
window.addEventListener('touchmove', (e) => { if (!activeScroll) handleMove(e); }, { passive: false });
window.addEventListener('touchend', handleEnd);

function playPreview(index) {
    if (index < MELODY_ROWS) {
        const note = NOTES[index];
        if (currentInstrument === synthPoly) currentInstrument.triggerAttackRelease(note, "8n");
        else currentInstrument.triggerAttackRelease(note, "4n");
    } else {
        const typeId = percussionSettings[index - MELODY_ROWS];
        const typeObj = PERCUSSION_TYPES.find(t => t.id === typeId);
        drumSampler.triggerAttackRelease(typeObj.note, "4n");
    }
}

function updateSchedule() {
    Tone.Transport.cancel();
    notesData.forEach(n => {
        Tone.Transport.schedule((time) => {
            if (n.noteIndex < MELODY_ROWS) {
                if (currentInstrument === synthPoly) currentInstrument.triggerAttackRelease(NOTES[n.noteIndex], "8n", time);
                else currentInstrument.triggerAttackRelease(NOTES[n.noteIndex], "4n", time);
            } else {
                const typeId = percussionSettings[n.noteIndex - MELODY_ROWS];
                const typeObj = PERCUSSION_TYPES.find(t => t.id === typeId);
                drumSampler.triggerAttackRelease(typeObj.note, "4n", time);
            }
        }, `0:0:${n.timeIndex * 2}`);
    });
}

playBtn.addEventListener('click', async () => {
    if (Tone.context.state !== 'running') await Tone.start();
    if (isPlaying) {
        Tone.Transport.stop();
        isPlaying = false;
        playBtn.innerText = "▶︎ / ■";
    } else {
        Tone.Transport.loop = isLooping;
        Tone.Transport.loopEnd = `0:0:${COLS * 2}`;
        updateSchedule();
        Tone.Transport.start();
        isPlaying = true;
        playBtn.innerText = "■ とめる";
    }
    draw();
});

loopBtn.addEventListener('click', () => {
    isLooping = !isLooping;
    loopBtn.classList.toggle('active', isLooping);
});

synthTypeSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === "piano") {
        currentInstrument = samplerPiano;
    } else {
        currentInstrument = synthPoly;
        synthPoly.set({ oscillator: { type: val } });
    }
});

// --- 保存機能 ---
const STORAGE_KEY = 'music_maker_songs_v1';

function getSavedSongs() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
}

function saveSongs(songs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

saveBtn.addEventListener('click', () => {
    if (notesData.length === 0) { alert("おんぷが ないよ！"); return; }

    const songName = songNameInput.value.trim();
    if (!songName) {
        alert("きょくの なまえを いれてね！");
        return;
    }

    let songs = getSavedSongs();

    // 上書き確認
    if (songs[songName]) {
        if (!confirm("「" + songName + "」は すでにあるよ。うわがきしても いい？")) {
            return;
        }
    } else if (Object.keys(songs).length >= 10) {
        alert("10きょく ほぞんされているよ。どれかをけしてね！");
        return;
    }

    songs[songName] = {
        notes: notesData,
        percussion: percussionSettings
    };
    saveSongs(songs);
    alert("「" + songName + "」を きろくしたよ！");
    renderSongList(); // リストを更新
});

clearBtn.addEventListener('click', () => {
    if (confirm("ぜんぶ けしちゃう？")) {
        notesData = [];
        updateSchedule();
        draw();
    }
});

// --- 設定・曲管理 モーダル ---
settingsBtn.addEventListener('click', () => {
    renderSongList();
    settingsModal.style.display = 'flex';
});

closeSettingsBtn.addEventListener('click', () => {
    // プレビュー用に変更された設定とスケジュールを元に戻す
    Tone.Transport.stop();
    Tone.Transport.cancel();

    // ボタンのテキストをリセット
    const buttons = manageSongList.querySelectorAll('button');
    buttons.forEach(btn => {
        if (btn.innerText === "■ とめる") {
            btn.innerText = "▶ プレビュー";
        }
    });

    settingsModal.style.display = 'none';

    // メイン画面の本来のスケジュールを復元
    updateSchedule();

    // もともと「▶︎ / ■」ボタンが再生中状態（isPlaying === true）だった場合
    // Tone.Transportはstopしているので内部でズレが生じるため、強制的に停止状態に戻す
    if (isPlaying) {
        isPlaying = false;
        playBtn.innerText = "▶︎ / ■";
        draw();
    }
});

// フルスクリーン制御
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert("フルスクリーンに できませんでした");
        });
    } else {
        document.exitFullscreen();
    }
});

// 曲リストの生成
function renderSongList() {
    const songs = getSavedSongs();
    manageSongList.innerHTML = '';
    const keys = Object.keys(songs);

    if (keys.length === 0) {
        manageSongList.innerHTML = '<li>きろくされた きょくが ないよ</li>';
        return;
    }

    keys.forEach(key => {
        const li = document.createElement('li');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'song-name';
        nameSpan.innerText = key;

        const actionDiv = document.createElement('div');
        actionDiv.className = 'song-actions';

        // プレビューボタン（楽譜展開せずに音だけ鳴らす）
        const previewBtn = document.createElement('button');
        previewBtn.innerText = "▶ プレビュー";
        let isPreviewing = false;
        previewBtn.onclick = async () => {
            if (Tone.context.state !== 'running') await Tone.start();

            if (isPreviewing) {
                // 再生中の場合は停止する
                Tone.Transport.stop();
                Tone.Transport.cancel();
                previewBtn.innerText = "▶ プレビュー";
                isPreviewing = false;
                return;
            }

            // 以前のスケジュールをクリア
            Tone.Transport.stop();
            Tone.Transport.cancel();

            const data = songs[key];
            const notesToPlay = data.notes || data;
            const percToUse = data.percussion || ["kick", "snare", "hihat"];

            notesToPlay.forEach(n => {
                Tone.Transport.schedule((time) => {
                    if (n.noteIndex < MELODY_ROWS) {
                        const dur = (currentInstrument === synthPoly) ? "8n" : "4n";
                        currentInstrument.triggerAttackRelease(NOTES[n.noteIndex], dur, time);
                    } else {
                        const typeId = percToUse[n.noteIndex - MELODY_ROWS];
                        const typeObj = PERCUSSION_TYPES.find(t => t.id === typeId);
                        drumSampler.triggerAttackRelease(typeObj.note, "4n", time);
                    }
                }, `0:0:${n.timeIndex * 2}`);
            });

            Tone.Transport.loop = false;

            // 曲の長さに応じて自動停止するようスケジュールを組む
            // COLS(64)マスの長さ分だけ再生したら停止状態（リセット）にする
            const songDuration = `0:0:${COLS * 2}`;
            Tone.Transport.schedule((time) => {
                Tone.Transport.stop();
            }, songDuration);

            Tone.Transport.start();
            console.log("「" + key + "」を さいせいちゅう...");

            previewBtn.innerText = "■ とめる";
            isPreviewing = true;

            // 停止時にボタンと状態を元に戻す
            Tone.Transport.once('stop', () => {
                previewBtn.innerText = "▶ プレビュー";
                isPreviewing = false;
            });
        };

        // 開く（読み込み）ボタン
        const loadActionBtn = document.createElement('button');
        loadActionBtn.innerText = "よみこむ";
        loadActionBtn.className = "action-btn";
        loadActionBtn.onclick = () => {
            Tone.Transport.stop();
            const data = songs[key];
            if (data.notes) {
                notesData = data.notes;
                percussionSettings = data.percussion || ["kick", "snare", "hihat"];
            } else {
                notesData = data; // 互換性維持
            }
            songNameInput.value = key; // 曲名をセット
            createYAxisLabels(); // 再生成してセレクトを更新
            updateSchedule();
            draw();
            settingsModal.style.display = 'none';
        };

        // 名前変更ボタン
        const renameBtn = document.createElement('button');
        renameBtn.innerText = "なまえへんこう";
        renameBtn.onclick = () => {
            const newName = prompt("あたらしい なまえを いれてね", key);
            if (newName && newName !== key) {
                if (songs[newName]) {
                    alert("おなじ なまえの きょくが あるよ");
                } else {
                    songs[newName] = songs[key];
                    delete songs[key];
                    saveSongs(songs);
                    renderSongList();
                }
            }
        };

        // 消すボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = "けす";
        deleteBtn.className = "danger-btn";
        deleteBtn.onclick = () => {
            Tone.Transport.stop();
            if (confirm("ほんとうに「" + key + "」を けす？")) {
                delete songs[key];
                saveSongs(songs);
                renderSongList();
            }
        };

        actionDiv.appendChild(previewBtn);
        actionDiv.appendChild(loadActionBtn);
        actionDiv.appendChild(renameBtn);
        actionDiv.appendChild(deleteBtn);

        li.appendChild(nameSpan);
        li.appendChild(actionDiv);
        manageSongList.appendChild(li);
    });
}

// --- ランダムドラム生成 ---
randomDrumsBtn.addEventListener('click', () => {
    // すでにパーカッションがある場合は消す
    notesData = notesData.filter(n => n.noteIndex < MELODY_ROWS);

    // 楽器もランダムに（重複あり）
    percussionSettings = [
        PERCUSSION_TYPES[Math.floor(Math.random() * PERCUSSION_TYPES.length)].id,
        PERCUSSION_TYPES[Math.floor(Math.random() * PERCUSSION_TYPES.length)].id,
        PERCUSSION_TYPES[Math.floor(Math.random() * PERCUSSION_TYPES.length)].id
    ];

    // パターン生成 (16ステップをループ)
    for (let t = 0; t < COLS; t++) {
        // Line 1: Basic beat (usually Kick)
        if (t % 4 === 0) notesData.push({ timeIndex: t, noteIndex: MELODY_ROWS + 0 });

        // Line 2: Accent (usually Snare)
        if (t % 8 === 4) notesData.push({ timeIndex: t, noteIndex: MELODY_ROWS + 1 });

        // Line 3: Fills (usually Hihat/Clap)
        if (t % 2 === 0 && Math.random() > 0.3) {
            notesData.push({ timeIndex: t, noteIndex: MELODY_ROWS + 2 });
        }
    }

    createYAxisLabels();
    updateSchedule();
    draw();
});

function init() {
    createYAxisLabels();
    updateHandleSizes();
    updateCanvasPosition();
    draw();
}

function animate() {
    if (isPlaying) draw();
    requestAnimationFrame(animate);
}

init();
animate();

window.addEventListener('resize', () => {
    updateHandleSizes();
    updateCanvasPosition();
});

// --- 書き出し機能 (WAV) ---
function bufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels,
        length = buffer.length * numOfChan * 2 + 44,
        bufferArr = new ArrayBuffer(length),
        view = new DataView(bufferArr),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    for (i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([bufferArr], { type: "audio/wav" });
}

async function exportSong(key, btn) {
    const songs = getSavedSongs();
    const data = songs[key];
    if (!data) return;

    const originalText = btn.innerText;
    btn.innerText = "じゅんび中...";
    btn.disabled = true;

    try {
        if (Tone.context.state !== 'running') await Tone.start();

        const notesToPlay = data.notes || data;
        const percToUse = data.percussion || ["kick", "snare", "hihat"];
        const bpm = Tone.Transport.bpm.value;
        const duration = (COLS * 2) * (60 / bpm / 4);
        const currentType = synthTypeSelect.value;

        // 1. 音源バッファを事前にロードする
        btn.innerText = "よみこみ中...";

        const drumSamples = {
            "C1": "kick.mp3", "D1": "snare.mp3", "E1": "hihat.mp3", "F1": "tom1.mp3", "G1": "tom2.mp3"
        };
        const drumBuffers = new Tone.ToneAudioBuffers(drumSamples, {
            baseUrl: "https://tonejs.github.io/audio/drum-samples/CR78/"
        });
        await drumBuffers.loaded;

        const pianoSamples = {
            "A0": "A0.mp3", "C1": "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3", "A1": "A1.mp3",
            "C2": "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3", "A2": "A2.mp3", "C3": "C3.mp3",
            "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", "A3": "A3.mp3", "C4": "C4.mp3", "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3", "A4": "A4.mp3", "C5": "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
            "A5": "A5.mp3", "C6": "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3", "A6": "A6.mp3",
            "C7": "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3", "A7": "A7.mp3", "C8": "C8.mp3"
        };
        let pianoBuffers = null;
        if (currentType === "piano") {
            pianoBuffers = new Tone.ToneAudioBuffers(pianoSamples, {
                baseUrl: "https://tonejs.github.io/audio/salamander/"
            });
            await pianoBuffers.loaded;
        }

        // 2. オフラインコンテキストでレンダリング
        btn.innerText = "かきだし中...";
        const buffer = await Tone.Offline(async (context) => {
            let inst;
            if (currentType === "piano") {
                const pianoMap = {};
                Object.keys(pianoSamples).forEach(note => {
                    const tb = pianoBuffers.get(note);
                    if (tb) pianoMap[note] = tb.get(); // ネイティブの AudioBuffer を抽出
                });
                inst = new Tone.Sampler({ urls: pianoMap, context }).toDestination();
            } else {
                inst = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: currentType },
                    context: context
                }).toDestination();
            }

            const drumMap = {};
            Object.keys(drumSamples).forEach(note => {
                const tb = drumBuffers.get(note);
                if (tb) drumMap[note] = tb.get(); // ネイティブの AudioBuffer を抽出
            });
            const drums = new Tone.Sampler({ urls: drumMap, context }).toDestination();

            // すでにロード済みのネイティブAudioBufferを渡しているので即座に発音可能
            notesToPlay.forEach(n => {
                const time = n.timeIndex * 2 * (60 / bpm / 4);
                if (n.noteIndex < MELODY_ROWS) {
                    const dur = (currentType === "piano") ? "4n" : "8n";
                    inst.triggerAttackRelease(NOTES[n.noteIndex], dur, time);
                } else {
                    const typeId = percToUse[n.noteIndex - MELODY_ROWS];
                    const typeObj = PERCUSSION_TYPES.find(t => t.id === typeId);
                    drums.triggerAttackRelease(typeObj.note, "4n", time);
                }
            });
        }, duration);

        const wavBlob = bufferToWav(buffer);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${key}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setTimeout(() => alert("「" + key + "」のかきだしが おわったよ！"), 500);
    } catch (e) {
        console.error(e);
        alert("かきだしに しっぱいしました。");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}