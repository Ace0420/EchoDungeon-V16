// ============================================================
// ECHO DUNGEON - 08 NARRATOR (optional, off until asked for)
// A small AI storyteller that runs on the player's own device.
// Copyright 2025 Asa Hartz Games - FREE for the community
//
// BLIND FIRST. ALWAYS.
//
// WHAT IT DOES
// - Adds the voice commands: narrator on, narrator off,
//   narrator status.
// - The narrator is a dry, teasing smart aleck who is secretly
//   fond of the hero.
// - When on, a small language model writes one line about each
//   calm room, ahead of the player, so nobody waits for it.
// - Until the model has a line ready, the narrator uses lines
//   written by hand (Section 7), so no calm room is left bare.
// - The narrator also remarks on fights, victories, level ups,
//   chests and defeats. Those remarks are all written by hand.
// - If anything goes wrong, the game carries on with its usual
//   lines. The narrator can never stop the game.
//
// TO REMOVE IT
// Delete the 08-narrator.js line from index.html. Nothing in
// files 01 to 07 depends on this file.
//
// WHAT LEAVES THE DEVICE
// Nothing the player says or does. The only network use is
// fetching two things: the wllama engine (from jsDelivr) and the
// model file (from Hugging Face, once, then kept on the device).
// ============================================================

(function () {

    // ------------------------------------------------------------
    // NARRATOR SECTION 1: SETTINGS
    // Swap modelRepo and modelFile to use a different model, such
    // as Flowers once there is a GGUF file of it on Hugging Face.
    // ------------------------------------------------------------

    var WLLAMA_BASE = 'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.7/esm/';

    var CONFIG = {
        modelRepo: 'unsloth/SmolLM2-360M-Instruct-GGUF',
        modelFile: 'SmolLM2-360M-Instruct-Q4_K_M.gguf',
        modelSizeSpoken: '270 megabytes',
        engineUrl: WLLAMA_BASE + 'index.js',
        wasmSingle: WLLAMA_BASE + 'single-thread/wllama.wasm',
        wasmMulti: WLLAMA_BASE + 'multi-thread/wllama.wasm',
        contextSize: 1024,
        maxTokens: 48,
        triesPerRoom: 3,
        storageKey: 'echoDungeon_narrator'
    };

    // ------------------------------------------------------------
    // NARRATOR SECTION 2: SAFETY CHECK
    // If this is not the game we expect, do nothing at all.
    // ------------------------------------------------------------

    if (typeof game === 'undefined' ||
        typeof speak !== 'function' ||
        typeof speakSequence !== 'function' ||
        typeof describeRoom !== 'function' ||
        typeof processCommand !== 'function') {
        if (window.console) console.warn('Echo narrator: game not found, add-on is idle.');
        return;
    }

    // ------------------------------------------------------------
    // NARRATOR SECTION 3: NARRATOR STATE
    // state is one of: off, loading, ready, failed
    // ------------------------------------------------------------

    var narrator = {
        state: 'off',
        enabled: false,
        progress: 0,
        engine: null,
        queue: [],
        busy: false,
        pendingNotice: '',
        awaitingConfirm: false,
        bootChecked: false,
        written: 0,
        discarded: 0,
        lastRoom: null,
        lastError: ''
    };
    window.EchoNarrator = narrator;

    function readPreference() {
        try { return localStorage.getItem(CONFIG.storageKey); } catch (e) { return null; }
    }

    function writePreference(value) {
        try { localStorage.setItem(CONFIG.storageKey, value); } catch (e) { /* ignore */ }
    }

    // Returns a spoken reason the narrator cannot run here, or '' if it can.
    function cannotRunReason() {
        if (!/^https?:$/.test(location.protocol)) {
            return 'The narrator needs the game to be opened from a web address, not from a file on the device. Everything else in the game works as always.';
        }
        if (typeof WebAssembly !== 'object' || !navigator.storage || !navigator.storage.getDirectory) {
            return 'Sorry, this browser cannot run the narrator. Everything else in the game works as always.';
        }
        return '';
    }

    // ------------------------------------------------------------
    // NARRATOR SECTION 4: LOADING THE MODEL
    // Runs in the background. The player keeps playing.
    // ------------------------------------------------------------

    function releaseEngine() {
        var engine = narrator.engine;
        narrator.engine = null;
        narrator.busy = false;
        narrator.queue = [];
        if (engine && typeof engine.exit === 'function') {
            try {
                var closing = engine.exit();
                if (closing && typeof closing.catch === 'function') closing.catch(function () {});
            } catch (e) { /* ignore */ }
        }
    }

    function startLoading() {
        narrator.state = 'loading';
        narrator.enabled = true;
        narrator.progress = 0;
        narrator.lastError = '';
        narrator.lastRoom = null;

        var loadLibrary;
        try {
            // Written this way so very old browsers do not choke on the word "import".
            loadLibrary = (new Function('url', 'return import(url);'))(CONFIG.engineUrl);
        } catch (e) {
            loadLibrary = Promise.reject(e);
        }

        loadLibrary.then(function (library) {
            var engine = new library.Wllama({
                'single-thread/wllama.wasm': CONFIG.wasmSingle,
                'multi-thread/wllama.wasm': CONFIG.wasmMulti
            }, {
                suppressNativeLog: true,
                allowOffline: true
            });
            narrator.engine = engine;
            return engine.loadModelFromHF(CONFIG.modelRepo, CONFIG.modelFile, {
                n_ctx: CONFIG.contextSize,
                progressCallback: function (p) {
                    if (p && p.total) {
                        narrator.progress = Math.floor((p.loaded / p.total) * 100);
                    }
                }
            });
        }).then(function () {
            if (narrator.state !== 'loading') {
                // The player said narrator off while it was loading.
                releaseEngine();
                return;
            }
            narrator.state = 'ready';
            writePreference('on');
            narrator.pendingNotice = 'The narrator is fully awake now. Try to contain your excitement.';
            queueNearbyRooms();
        }).catch(function (err) {
            narrator.lastError = String((err && err.message) || err);
            if (window.console) console.warn('Echo narrator could not load:', narrator.lastError);
            if (narrator.state !== 'loading') {
                releaseEngine();
                return;
            }
            narrator.state = 'failed';
            releaseEngine();
            narrator.pendingNotice = 'The narrator could not get ready this time, so the game will carry on with its usual descriptions. Say narrator on to try again.';
        });
    }

    // On the first command of a session, wake the narrator by itself
    // if the player had it on last time. No download is needed then.
    function bootCheck() {
        if (narrator.bootChecked) return;
        narrator.bootChecked = true;
        if (readPreference() === 'on' && narrator.state === 'off' && !cannotRunReason()) {
            startLoading();
        }
    }

    // ------------------------------------------------------------
    // NARRATOR SECTION 5: VOICE COMMANDS
    // narrator on, narrator yes, narrator off, narrator status
    // ------------------------------------------------------------

    function turnOn(confirmed) {
        if (narrator.state === 'ready') {
            speak('The narrator is already awake and describing rooms for you.');
            return;
        }
        if (narrator.state === 'loading') {
            speak('The narrator is still getting ready. ' + progressSpoken());
            return;
        }
        var problem = cannotRunReason();
        if (problem) {
            speak(problem);
            return;
        }
        var downloadedBefore = readPreference() !== null;
        if (!downloadedBefore && !confirmed && !narrator.awaitingConfirm) {
            narrator.awaitingConfirm = true;
            speak('The narrator is an optional storyteller that runs entirely on your own device. ' +
                  'It needs a one time download of about ' + CONFIG.modelSizeSpoken + ', so wifi is best. ' +
                  'Say narrator yes to begin, or narrator off to cancel.');
            return;
        }
        narrator.awaitingConfirm = false;
        speak('Wonderful! The narrator is waking up. Keep playing. You will hear a few remarks already, and more once the narrator is fully awake.');
        startLoading();
    }

    function turnOff() {
        var wasWaiting = narrator.awaitingConfirm;
        narrator.awaitingConfirm = false;
        narrator.pendingNotice = '';
        if (wasWaiting) {
            speak('No problem. The narrator will stay off.');
            return;
        }
        if (!narrator.enabled && narrator.state === 'off') {
            speak('The narrator is already off.');
            return;
        }
        narrator.state = 'off';
        narrator.enabled = false;
        if (readPreference() !== null) writePreference('off');
        releaseEngine();
        speak('The narrator is resting. The game will use its usual descriptions. Say narrator on whenever you would like the narrator back.');
    }

    function progressSpoken() {
        if (narrator.progress > 0 && narrator.progress < 100) {
            return 'The download is ' + narrator.progress + ' percent done.';
        }
        return 'It should not be long now.';
    }

    function reportStatus() {
        if (narrator.awaitingConfirm) {
            speak('The narrator is waiting for your answer. Say narrator yes to begin the download, or narrator off to cancel.');
        } else if (narrator.state === 'ready') {
            speak('The narrator is awake. So far the narrator has written ' + narrator.written +
                  ' room lines and thrown away ' + narrator.discarded + '.');
        } else if (narrator.state === 'loading') {
            speak('The narrator is getting ready. ' + progressSpoken());
        } else if (narrator.state === 'failed') {
            speak('The narrator could not get ready last time. Say narrator on to try again.');
        } else {
            speak('The narrator is off. Say narrator on to wake the narrator.');
        }
    }

    function handleNarratorCommand(cmd) {
        if (/\b(off|of|stop|quiet|disable|cancel|no)\b/.test(cmd)) {
            turnOff();
        } else if (/\b(status|progress|ready|awake)\b/.test(cmd)) {
            reportStatus();
        } else if (/\b(yes|confirm|begin|okay|ok)\b/.test(cmd)) {
            turnOn(narrator.awaitingConfirm);
        } else {
            turnOn(false);
        }
    }

    var originalProcessCommand = processCommand;
    window.processCommand = function (command) {
        var cmd = String(command || '').toLowerCase().trim();
        if (game.started && game.initialized && game.player.name &&
            /\b(narrator|narrators|narration|narrate|storyteller|story teller)\b/.test(cmd)) {
            bootCheck();
            handleNarratorCommand(cmd);
            return;
        }
        var result = originalProcessCommand.apply(this, arguments);
        if (game.initialized) bootCheck();
        return result;
    };

    // ------------------------------------------------------------
    // NARRATOR SECTION 6: WRITING ROOM DETAIL
    // One short sentence per room, about sound, smell and touch.
    // Anything that could mislead the player is thrown away.
    // ------------------------------------------------------------

    var SYSTEM_PROMPT =
        'You are the narrator of an audio dungeon game: a dry, teasing smart aleck who is secretly fond of the hero. ' +
        'For each room, reply with exactly one short sentence about what is heard, smelled or felt there, with a wry remark. ' +
        'Never mention directions, doors, treasure or monsters.';

    var EXAMPLES = [
        ['Room: an empty stone chamber. Mood: damp.',
         'Something drips with real commitment in here, and the air smells like a wet sock that gave up.'],
        ['Room: a magical fountain room. Mood: cool.',
         'Water burbles away smugly, and a cool mist settles on your skin whether you asked or not.'],
        ['Room: an ancient shrine. Mood: still.',
         'Old incense hangs in the air, and the silence feels like it is judging your life choices.']
    ];

    var MOODS = ['still', 'cold', 'damp', 'echoing', 'dusty', 'warm', 'drafty', 'quiet', 'musty', 'humming'];

    // Words that would give false information about the game, plus signs the model went off script.
    var BLOCKED = /\b(chests?|gold|golden|coins?|treasures?|potions?|keys?|doors?|doorways?|stairs?|staircases?|exits?|monsters?|enem(y|ies)|creatures?|beasts?|goblins?|dragons?|north|south|east|west|left|right|ahead|behind|sorry|cannot|assistant|sentence)\b/i;

    // This build stores a room as a type and its content, so name the place from those.
    function roomLabel(room) {
        if (room.type === 'treasure') {
            return room.content === 'welcome_chest' ? 'the dungeon entrance' : 'a quiet stone vault';
        }
        if (room.type === 'special') {
            if (room.content === 'fountain') return 'a magical fountain room';
            if (room.content === 'shrine') return 'an ancient shrine';
            if (room.content === 'merchant') return 'a traveling trader camp';
            if (room.content === 'stairs') return 'a drafty passage sloping downward';
        }
        if (room.type === 'combat') return 'a battle-scarred chamber';
        if (room.type === 'boss') return 'a vast throne hall';
        return 'an empty stone chamber';
    }

    function cleanFlavor(raw) {
        if (typeof raw !== 'string') return '';
        var text = raw.replace(/[\r\n]+/g, ' ').replace(/["“”*#_`]/g, '').replace(/’/g, "'").trim();
        var firstSentence = text.match(/^(.+?[.!?])(\s|$)/);
        if (!firstSentence) return '';              // cut off before the sentence ended
        text = firstSentence[1].trim();
        if (text.length < 25 || text.length > 200) return '';
        if (/\d/.test(text)) return '';              // no invented numbers
        if (text.indexOf(':') !== -1) return '';     // it repeated the prompt instead of answering
        if (/[^\x20-\x7E]/.test(text)) return '';    // plain characters only, so speech reads it cleanly
        if (BLOCKED.test(text)) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function writeFlavor(room) {
        var messages = [{ role: 'system', content: SYSTEM_PROMPT }];
        for (var i = 0; i < EXAMPLES.length; i++) {
            messages.push({ role: 'user', content: EXAMPLES[i][0] });
            messages.push({ role: 'assistant', content: EXAMPLES[i][1] });
        }
        var mood = MOODS[Math.floor(Math.random() * MOODS.length)];
        messages.push({ role: 'user', content: 'Room: ' + roomLabel(room) + '. Mood: ' + mood + '.' });

        return narrator.engine.createChatCompletion(messages, {
            nPredict: CONFIG.maxTokens,
            useCache: true,
            sampling: { temp: 0.8, top_k: 40, top_p: 0.9, penalty_repeat: 1.1 }
        }).then(cleanFlavor);
    }

    // Line up this room, the four rooms next to it, then the rooms two steps away.
    function queueNearbyRooms() {
        if (narrator.state !== 'ready') return;
        if (!game.dungeon || !game.dungeon.grid || !game.player || !game.player.position) return;
        var x = game.player.position.x;
        var y = game.player.position.y;
        var spots = [[0, 0], [0, -1], [0, 1], [1, 0], [-1, 0],
                     [0, -2], [0, 2], [2, 0], [-2, 0], [1, -1], [1, 1], [-1, -1], [-1, 1]];
        narrator.queue = [];
        for (var i = 0; i < spots.length; i++) {
            var room = game.dungeon.grid[(x + spots[i][0]) + ',' + (y + spots[i][1])];
            if (room && !room.flavor && (room.flavorTried || 0) < CONFIG.triesPerRoom) {
                narrator.queue.push(room);
            }
        }
        pump();
    }

    // Write one room at a time so the phone is never overloaded.
    function pump() {
        if (narrator.busy || narrator.state !== 'ready' || !narrator.engine) return;
        var room = narrator.queue.shift();
        if (!room) return;
        narrator.busy = true;
        var engineAtStart = narrator.engine;
        var attempt;
        try {
            attempt = writeFlavor(room);
        } catch (e) {
            attempt = Promise.reject(e);
        }
        attempt.then(function (text) {
            if (text) {
                if (!room.flavor) room.flavor = text;
                narrator.written++;
            } else {
                room.flavorTried = (room.flavorTried || 0) + 1;
                narrator.discarded++;
            }
        }).catch(function (err) {
            room.flavorTried = (room.flavorTried || 0) + 1;
            narrator.lastError = String((err && err.message) || err);
        }).then(function () {
            if (narrator.engine !== engineAtStart) return;   // narrator was turned off meanwhile
            narrator.busy = false;
            setTimeout(pump, 50);
        });
    }

    // ------------------------------------------------------------
    // NARRATOR SECTION 7: THE NARRATOR'S OWN LINES
    // Written by hand, in the narrator's voice. Add, change or
    // delete lines freely. Keep each one short. {enemy} is swapped
    // for the enemy's name. Room lines must not promise anything
    // the game has not said (no loot, no monsters, no directions).
    // ------------------------------------------------------------

    var ROOM_LINES = {
        entrance: [
            'It smells of damp stone and questionable decisions. Mostly yours.',
            'A cold draft welcomes you, which is more than anyone else down here will do.',
            'Somewhere below, something drips. It has all day, and so, apparently, do you.'
        ],
        treasure: [
            'It smells of dust and other people\'s poor planning in here.',
            'The air is stale, as if nobody has breathed in here for years. Sensible of them.',
            'Your footsteps echo a little too proudly for someone who just walked into a strange room.',
            'It is quiet in here. The suspicious kind of quiet, not the restful kind.',
            'Old wood creaks nearby, the way old wood does when it knows it has company.'
        ],
        fountain: [
            'Water burbles away, sounding very pleased with itself.',
            'A cool mist settles on your skin, whether you asked for it or not.',
            'The splashing is almost soothing. Do not get used to it.'
        ],
        shrine: [
            'Old incense hangs in the air, and the silence is frankly judging you.',
            'The air hums faintly, like something holy clearing its throat.',
            'It is very peaceful in here. Try not to ruin it.'
        ],
        merchant: [
            'Somebody in here smells of lamp oil and optimistic pricing.',
            'You hear coins clinking. They are not your coins yet, and may never be.',
            'A kettle rattles somewhere close. At least one of you is having a nice day.'
        ],
        stairs: [
            'A cold draft crawls up from below, which is the dungeon\'s way of saying it gets worse.',
            'The air from below smells older and meaner. So that is something to enjoy later.',
            'Your footsteps echo downward for a long time. A very long time.'
        ],
        empty: [
            'It is quiet now, in the smug way rooms get after you win.',
            'Nothing in here but dust and your own breathing. Thrilling.',
            'The air is still, as if the room is hoping you will just leave.',
            'Something drips with real commitment in here.',
            'It smells like a wet sock that gave up.',
            'Your footsteps echo back, sounding braver than you probably feel.',
            'A draft wanders through, finds nothing of interest, and moves on. Take the hint.',
            'The floor is gritty underfoot. Nobody has swept in a century, and it will not be you either.'
        ]
    };

    var REMARKS = {
        fightStart: {
            chance: 0.6,
            lines: [
                'Try not to bleed on anything important.',
                'I would wish you luck, but I have met you.',
                'On the bright side, it has not eaten you yet.',
                'I will be over here, narrating from a safe distance.',
                'Remember, the pointy end goes in the {enemy}.',
                'Deep breath. You have survived worse. Probably.',
                'No pressure, but I have a bet riding on this.',
                'It does not sound pleased about the company.'
            ]
        },
        bossStart: {
            chance: 1,
            lines: [
                'This is the big one. I believe in you, and I do not say that lightly, or often.',
                'For once I have nothing clever to say. Do not die.'
            ]
        },
        victory: {
            chance: 0.7,
            lines: [
                'And the {enemy} learns a valuable lesson, a bit too late to use it.',
                'Well, well. Surviving on purpose now.',
                'I had my doubts. I still do, but well done.',
                'The {enemy} would like a rematch. The {enemy} is not getting one.',
                'Somebody has been practicing.',
                'That was almost graceful. Almost.',
                'I am putting that one in the memoir.',
                'Not bad. I had already started drafting your farewell speech.'
            ]
        },
        levelUp: {
            chance: 1,
            lines: [
                'Stronger and wiser. Well, stronger.',
                'The dungeon is officially a little worried.',
                'Do try to stay humble. I certainly will not.',
                'At this rate you might actually pull this off.',
                'I would clap, but I am a voice.'
            ]
        },
        chest: {
            chance: 0.6,
            lines: [
                'Finders keepers. That is basically dungeon law.',
                'Somebody left this unattended. Their mistake, your retirement fund.',
                'Try to act like you have found nice things before.',
                'I will not tell anyone you squealed a little.',
                'Dibs on nothing, sadly. I have no hands.'
            ]
        },
        death: {
            chance: 1,
            lines: [
                'For the record, I thought this was a bad idea. Quietly. To myself.',
                'We will call that a learning experience.',
                'In fairness, you did very well right up until the end.',
                'I will keep your seat warm. Come back and try again.'
            ]
        }
    };

    // Picks lines in a shuffled order, so nothing repeats until the whole list has been heard.
    function pickFrom(list) {
        if (!list || !list.length) return '';
        if (!list.bag || !list.bag.length) {
            list.bag = list.slice();
            for (var i = list.bag.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var swap = list.bag[i]; list.bag[i] = list.bag[j]; list.bag[j] = swap;
            }
        }
        return list.bag.pop();
    }

    function roomKind(room) {
        if (room.type === 'treasure') return room.content === 'welcome_chest' ? 'entrance' : 'treasure';
        if (room.type === 'special' && ROOM_LINES[room.content]) return room.content;
        return 'empty';
    }

    function enemyName() {
        var name = game.combat && game.combat.enemy && game.combat.enemy.name;
        return name ? String(name).toLowerCase() : 'beast';
    }

    function remark(kind) {
        var set = REMARKS[kind];
        if (!narrator.enabled || !set || Math.random() >= set.chance) return '';
        return pickFrom(set.lines).replace(/\{enemy\}/g, enemyName());
    }

    // ------------------------------------------------------------
    // NARRATOR SECTION 8: SPEAKING ROOM LINES
    // Wraps the game's own describeRoom and adds one line to the end
    // of what the game says. The model's line is used if it is ready,
    // otherwise a hand-written one. A room keeps its line once heard.
    // Left alone: rooms with a fight waiting (see Section 9), spent
    // fountains and shrines, and repeat looks at the same room.
    // ------------------------------------------------------------

    var originalDescribeRoom = describeRoom;
    window.describeRoom = function () {
        var room = game.currentRoom;
        var calm = !!room && room.type !== 'combat' && room.type !== 'boss';
        var spent = !!room && room.type === 'special' && room.used;
        var flavor = '';
        if (narrator.enabled && calm && !spent && room !== narrator.lastRoom) {
            if (typeof room.flavor !== 'string' || !room.flavor) {
                room.flavor = pickFrom(ROOM_LINES[roomKind(room)]);
            }
            flavor = room.flavor;
        }
        var notice = calm ? narrator.pendingNotice : '';
        var realSpeak = speak;

        if (flavor || notice) {
            var used = false;
            window.speak = function (text, callback) {
                if (!used && typeof text === 'string') {
                    used = true;
                    if (notice) {
                        narrator.pendingNotice = '';
                        text = notice + ' ' + text;
                    }
                    if (flavor) text = text + ' ' + flavor;
                }
                return realSpeak(text, callback);
            };
        }

        try {
            return originalDescribeRoom.apply(this, arguments);
        } finally {
            window.speak = realSpeak;
            narrator.lastRoom = flavor ? room : null;
            queueNearbyRooms();
        }
    };

    // ------------------------------------------------------------
    // NARRATOR SECTION 9: REMARKS ON WHAT HAPPENS
    // Slips one hand-written remark into what the game already says
    // when a fight starts, a fight is won, the hero levels up, a
    // chest is opened, or the hero falls. Nothing else about those
    // moments is changed.
    // where: 'end' adds the remark last, a number puts it at that spot.
    // ------------------------------------------------------------

    function addRemarkTo(functionName, kind, where) {
        var original = window[functionName];
        if (typeof original !== 'function') return;
        window[functionName] = function () {
            if (!narrator.enabled) return original.apply(this, arguments);
            var realSpeakSequence = speakSequence;
            var used = false;
            window.speakSequence = function (messages, callback) {
                if (!used && messages && messages.length) {
                    used = true;
                    var line = remark(kind);
                    if (line) {
                        if (where === 'end') messages.push(line);
                        else messages.splice(Math.min(where, messages.length), 0, line);
                    }
                }
                return realSpeakSequence(messages, callback);
            };
            try {
                return original.apply(this, arguments);
            } finally {
                window.speakSequence = realSpeakSequence;
            }
        };
    }

    addRemarkTo('startCombat', 'fightStart', 1);
    addRemarkTo('startBossCombat', 'bossStart', 1);
    addRemarkTo('combatVictory', 'victory', 'end');
    addRemarkTo('levelUp', 'levelUp', 'end');
    addRemarkTo('openChest', 'chest', 'end');
    addRemarkTo('playerDeath', 'death', 1);

    // ------------------------------------------------------------
    // NARRATOR SECTION 10: HELP TEXT
    // Adds one line to the spoken help list.
    // ------------------------------------------------------------

    if (typeof showHelp === 'function') {
        var originalShowHelp = showHelp;
        window.showHelp = function () {
            var realSpeakSequence = speakSequence;
            var lineAdded = false;
            window.speakSequence = function (messages, callback) {
                if (!lineAdded && messages && messages.length) {
                    lineAdded = true;
                    messages.push(
                        'Narrator: narrator on, narrator off, narrator status. The narrator is an optional storyteller with opinions, and runs on your own device.');
                }
                return realSpeakSequence(messages, callback);
            };
            try {
                return originalShowHelp.apply(this, arguments);
            } finally {
                window.speakSequence = realSpeakSequence;
            }
        };
    }

    // ------------------------------------------------------------
    // END OF NARRATOR ADD-ON
    // Making accessibility the norm in blind gaming.
    // ------------------------------------------------------------

})();
