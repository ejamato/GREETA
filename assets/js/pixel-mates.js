(() => {
    const canvas = document.getElementById("worldCanvas");
    const ctx = canvas.getContext("2d");
    const optimizedMode = false;
    const renderScale = 1;
    let worldWidth = window.innerWidth;
    let worldHeight = window.innerHeight;
    const spriteCache = new WeakMap();
    const spriteLayer = null;

    // Skala ukuran per piksel sprite (misal 4px layar = 1 piksel art)
    const PIXEL_SCALE = 4;
    const SPRITE_SIZE = 16; // 16x16 grid piksel
    const ENTITY_SIZE = SPRITE_SIZE * PIXEL_SCALE; // 64x64 px di layar

    function getCachedSprite(palette, matrix) {
        let paletteCache = spriteCache.get(palette);
        if (!paletteCache) {
            paletteCache = new WeakMap();
            spriteCache.set(palette, paletteCache);
        }

        let sprite = paletteCache.get(matrix);
        if (sprite) return sprite;

        sprite = document.createElement("canvas");
        sprite.width = ENTITY_SIZE;
        sprite.height = ENTITY_SIZE;
        const spriteContext = sprite.getContext("2d");
        const colors = {
            O: "#090d16",
            B: palette.body,
            b: palette.body,
            S: palette.shade,
            E: palette.ear,
            X: palette.eye,
            A: palette.accent,
        };

        for (let row = 0; row < SPRITE_SIZE; row++) {
            for (let column = 0; column < SPRITE_SIZE; column++) {
                const color = colors[matrix[row][column]];
                if (!color) continue;
                spriteContext.fillStyle = color;
                spriteContext.fillRect(
                    column * PIXEL_SCALE,
                    row * PIXEL_SCALE,
                    PIXEL_SCALE,
                    PIXEL_SCALE,
                );
            }
        }

        paletteCache.set(matrix, sprite);
        return sprite;
    }

    function getSpriteSource(sprite) {
        let source = spriteSources.get(sprite);
        if (!source) {
            source = sprite.toDataURL("image/png");
            spriteSources.set(sprite, source);
        }
        return source;
    }

    // Konfigurasi Fisika
    const GRAVITY = 0.42;
    const MAX_FALL_SPEED = 12;
    const BOUNCE_DAMPING = 0.35;

    // Daftar State AI
    const STATE = {
        IDLE: "DIAM",
        WALK: "JALAN",
        SIT: "DUDUK",
        SLEEP: "TIDUR",
        CLIMB: "MANJAT",
        HANG: "GELANTUNG",
        FALL: "JATUH",
        DRAGGED: "DITARIK",
    };

    // Palet Warna Karakter
    const PALETTES = {
        NEKO: [
            {
                name: "Putih Susu",
                body: "#f8fafc",
                shade: "#cbd5e1",
                ear: "#f472b6",
                eye: "#0f172a",
                accent: "#ef4444",
            },
            {
                name: "Oren Barbar",
                body: "#fb923c",
                shade: "#ea580c",
                ear: "#fda4af",
                eye: "#0f172a",
                accent: "#38bdf8",
            },
            {
                name: "Kucing Hitam",
                body: "#334155",
                shade: "#1e293b",
                ear: "#f472b6",
                eye: "#fde047",
                accent: "#f43f5e",
            },
            {
                name: "Abu Calico",
                body: "#94a3b8",
                shade: "#64748b",
                ear: "#fbcfe8",
                eye: "#0f172a",
                accent: "#a855f7",
            },
        ],
        BOT: [
            {
                name: "Cyber Biru",
                body: "#38bdf8",
                shade: "#0284c7",
                ear: "#facc15",
                eye: "#bae6fd",
                accent: "#f43f5e",
            },
            {
                name: "Retro Hijau",
                body: "#4ade80",
                shade: "#16a34a",
                ear: "#fb923c",
                eye: "#dcfce7",
                accent: "#eab308",
            },
            {
                name: " Unit Ungu",
                body: "#c084fc",
                shade: "#9333ea",
                ear: "#38bdf8",
                eye: "#f3e8ff",
                accent: "#22d3ee",
            },
        ],
        MOCHI: [
            {
                name: "Sakura Mochi",
                body: "#f472b6",
                shade: "#db2777",
                ear: "#fbcfe8",
                eye: "#0f172a",
                accent: "#fef08a",
            },
            {
                name: "Slime Siber",
                body: "#2dd4bf",
                shade: "#0d9488",
                ear: "#99f6e4",
                eye: "#0f172a",
                accent: "#fde047",
            },
            {
                name: "Roh Bintang",
                body: "#facc15",
                shade: "#ca8a04",
                ear: "#fef08a",
                eye: "#0f172a",
                accent: "#fb7185",
            },
        ],
    };

    /**
     * ============================================================================
     * MATRIKS SPRITE PIXEL ART 16x16
     * '.' = Transparan
     * 'O' = Outline Gelap (#090d16)
     * 'B' = Warna Tubuh Utama
     * 'S' = Warna Bayangan Tubuh
     * 'E' = Warna Telinga / Antena / Pipi
     * 'X' = Warna Mata / Visor
     * 'A' = Warna Aksen (Kalung / Lampu Dada)
     * ============================================================================
     */
    const SPRITES = {
        NEKO: {
            IDLE_1: [
                "................",
                "...OO......OO...",
                "..OBEO....OEBO..",
                "..OBBBOOOOBBBO..",
                "..OBBBBBBBBBBO..",
                "..OBXBBBBBBXBO..",
                "..OBBBBBBBBBBO..",
                "...OBBEOOEBBO...",
                "....OAAAAAOO....",
                "...OBBBBBBBBO...",
                "...OBBBBBBBBO...",
                "...OBBBBBBBBO...",
                "...OBBSSSSBBO...",
                "...OSSO..OSSO...",
                "...OOO....OOO...",
                "................",
            ],
            IDLE_2: [
                "................",
                "................",
                "...OO......OO...",
                "..OBEO....OEBO..",
                "..OBBBOOOOBBBO..",
                "..OBBBBBBBBBBO..",
                "..OBXBBBBBBXBO..",
                "...OBBEOOEBBO...",
                "....OAAAAAOO....",
                "...OBBBBBBBBO...",
                "...OBBBBBBBBO...",
                "...OBBBBBBBBO...",
                "...OBBSSSSBBO...",
                "...OSSO..OSSO...",
                "...OOO....OOO...",
                "................",
            ],
            BLINK: [
                "................",
                "...OO......OO...",
                "..OBEO....OEBO..",
                "..OBBBOOOOBBBO..",
                "..OBBBBBBBBBBO..",
                "..OBOOBBBBOOBO..",
                "..OBBBBBBBBBBO..",
                "...OBBEOOEBBO...",
                "....OAAAAAOO....",
                "...OBBBBBBBBO...",
                "...OBBBBBBBBO...",
                "...OBBBBBBBBO...",
                "...OBBSSSSBBO...",
                "...OSSO..OSSO...",
                "...OOO....OOO...",
                "................",
            ],
            WALK_1: [
                "................",
                "...OO......OO...",
                "..OBEO....OEBO..",
                "..OBBBOOOOBBBO..",
                "..OBBBBBBBBBBO..",
                "..OBBBBBXBBBXO..",
                "..OBBBBBBBBBBO..",
                "...OBBEOOEBBO...",
                "....OAAAAAOO.OO.",
                "...OBBBBBBBBOOBO",
                "...OBBBBBBBBBBO.",
                "...OBBBBBBBBO...",
                "..OSSO...OSSO...",
                "..OOO.....OOO...",
                "................",
                "................",
            ],
            WALK_2: [
                "................",
                "................",
                "...OO......OO...",
                "..OBEO....OEBO..",
                "..OBBBOOOOBBBO..",
                "..OBBBBBXBBBXO..",
                "..OBBBBBBBBBBO..",
                "...OBBEOOEBBO...",
                "....OAAAAAOO....",
                "...OBBBBBBBBOOO.",
                "...OBBBBBBBBBSBO",
                "...OBBBBBBBBOOO.",
                "....OSSO.OSSO...",
                "....OOO...OOO...",
                "................",
                "................",
            ],
            SIT: [
                "................",
                "................",
                "...OO......OO...",
                "..OBEO....OEBO..",
                "..OBBBOOOOBBBO..",
                "..OBBBBBBBBBBO..",
                "..OBXBBBBBBXBO..",
                "...OBBEOOEBBO...",
                "....OAAAAAOO....",
                "...OBBBBBBBBO...",
                "..OBBBBBBBBBBO..",
                "..OBBBBBBBBBBOOO",
                "..OBBBOOOOBBBBBO",
                "..OSSO....OSSOO.",
                "..OOO......OOO..",
                "................",
            ],
            SLEEP: [
                "................",
                "................",
                "................",
                "...OO......OO...",
                "..OBEO....OEBO..",
                "..OBBBOOOOBBBO..",
                "..OBOOBBBBOOBO..",
                "...OBBEOOEBBO...",
                "....OAAAAAOO....",
                "...OBBBBBBBBO...",
                "..OBBBBBBBBBBO..",
                "..OBBBBBBBBBBOOO",
                "..OBBBOOOOBBBBBO",
                "..OSSO....OSSOO.",
                "..OOO......OOO..",
                "................",
            ],
            CLIMB_1: [
                "................",
                "...OO......OO...",
                "..OBEO....OEBO..",
                "..OBBBOOOOBBBO..",
                "..OBBBBBBBBBBO..",
                "..OBBBBBBBBBXO..",
                "...OBBBBBBBBO...",
                "....OAAAAAOO.OO.",
                "...OBBBBBBBBOOBO",
                "...OBBBBBBBBBBO.",
                "...OBBBBBBBBO...",
                "...OBBSSSSBBO...",
                "..OSSO....OSSO..",
                "..OOO......OOO..",
                "................",
                "................",
            ],
            CLIMB_2: [
                "................",
                "...OO......OO...",
                "..OBEO....OEBO..",
                "..OBBBOOOOBBBO..",
                "..OBBBBBBBBBBO..",
                "..OBBBBBBBBBXO..",
                "...OBBBBBBBBO...",
                "..OO.OAAAAAOO...",
                ".OBOOBBBBBBBBO..",
                "..OBBBBBBBBBBO..",
                "...OBBBBBBBBO...",
                "...OBBSSSSBBO...",
                "....OSSO..OSSO..",
                "....OOO....OOO..",
                "................",
                "................",
            ],
            HANG_1: [
                "..OOO......OOO..",
                "..OBBO....OBBO..",
                "...OBBO..OBBO...",
                "...OOAAAAAOOO...",
                "..OBBBBBBBBBBO..",
                "..OBXBBBBBBXBO..",
                "..OBBBBBBBBBBO..",
                "..OBEOOOOOOEBO..",
                "...OO.OBBO.OO...",
                "......OBBO......",
                ".....OBBBBO.....",
                ".....OSSSSO.....",
                ".....OO..OO.....",
                "................",
                "................",
                "................",
            ],
            HANG_2: [
                "...OOO....OOO...",
                "...OBBO..OBBO...",
                "...OBBO..OBBO...",
                "...OOAAAAAOOO...",
                "..OBBBBBBBBBBO..",
                "..OBXBBBBBBXBO..",
                "..OBBBBBBBBBBO..",
                "..OBEOOOOOOEBO..",
                "...OO..OBBO.OO..",
                ".......OBBO.....",
                "......OBBBBO....",
                "......OSSSSO....",
                "......OO..OO....",
                "................",
                "................",
                "................",
            ],
            FALL: [
                ".OO..........OO.",
                "OBBO.OO..OO.OBBO",
                ".OBBOBEOOEBOBBO.",
                "..OBBBBBBBBBBO..",
                "..OBXBBBBBBXBO..",
                "..OBBBBBBBBBBO..",
                "...OBBEOOEBBO...",
                "....OAAAAAOO....",
                "...OBBBBBBBBO...",
                "...OBBSSSSBBO...",
                "..OSSO....OSSO..",
                "..OOO......OOO..",
                "................",
                "................",
                "................",
                "................",
            ],
        },

        BOT: {
            IDLE_1: [
                ".......OO.......",
                "......OEEO......",
                ".......OO.......",
                "...OOOOOOOOOO...",
                "..OBBBBBBBBBBO..",
                "..OBOOOOOOOObo..",
                "..OBOXXBBXXOBO..",
                "..OBOOOOOOOObo..",
                "..OBBBBBBBBBBO..",
                "...OOOOOOOOOO...",
                "...OBBBAAABBBO..",
                "...OBBBBBBBBBO..",
                "...OSSSSSSSSSO..",
                "....OO....OO....",
                "...OSSO..OSSO...",
                "...OOOO..OOOO...",
            ],
            IDLE_2: [
                "................",
                ".......OO.......",
                "......OEEO......",
                ".......OO.......",
                "...OOOOOOOOOO...",
                "..OBBBBBBBBBBO..",
                "..OBOOOOOOOObo..",
                "..OBOXXBBXXOBO..",
                "..OBOOOOOOOObo..",
                "...OOOOOOOOOO...",
                "...OBBBAAABBBO..",
                "...OBBBBBBBBBO..",
                "...OSSSSSSSSSO..",
                "....OO....OO....",
                "...OSSO..OSSO...",
                "...OOOO..OOOO...",
            ],
            BLINK: [
                ".......OO.......",
                "......OEEO......",
                ".......OO.......",
                "...OOOOOOOOOO...",
                "..OBBBBBBBBBBO..",
                "..OBOOOOOOOObo..",
                "..OBOEEBBEEOBO..",
                "..OBOOOOOOOObo..",
                "..OBBBBBBBBBBO..",
                "...OOOOOOOOOO...",
                "...OBBBAAABBBO..",
                "...OBBBBBBBBBO..",
                "...OSSSSSSSSSO..",
                "....OO....OO....",
                "...OSSO..OSSO...",
                "...OOOO..OOOO...",
            ],
            WALK_1: [
                ".......OO.......",
                "......OEEO......",
                ".......OO.......",
                "...OOOOOOOOOO...",
                "..OBBBBBBBBBBO..",
                "..OBOOOOOOOObo..",
                "..OBOBBXXBBXXO..",
                "..OBOOOOOOOObo..",
                "...OOOOOOOOOO...",
                "...OBBBAAABBBO..",
                "...OBBBBBBBBBO..",
                "...OSSSSSSSSSO..",
                "...OO......OO...",
                "..OSSO....OSSO..",
                "..OOOO....OOOO..",
                "................",
            ],
            WALK_2: [
                "................",
                ".......OO.......",
                "......OEEO......",
                ".......OO.......",
                "...OOOOOOOOOO...",
                "..OBBBBBBBBBBO..",
                "..OBOOOOOOOObo..",
                "..OBOBBXXBBXXO..",
                "..OBOOOOOOOObo..",
                "...OOOOOOOOOO...",
                "...OBBBAAABBBO..",
                "...OBBBBBBBBBO..",
                "...OSSSSSSSSSO..",
                ".....OO..OO.....",
                "....OSSO.OSSO...",
                "....OOOO.OOOO...",
            ],
            SIT: [
                "................",
                ".......OO.......",
                "......OEEO......",
                ".......OO.......",
                "...OOOOOOOOOO...",
                "..OBBBBBBBBBBO..",
                "..OBOOOOOOOObo..",
                "..OBOXXBBXXOBO..",
                "..OBOOOOOOOObo..",
                "...OOOOOOOOOO...",
                "...OBBBAAABBBO..",
                "..OBBBBBBBBBBBO.",
                "..OSSSSSSSSSSSO.",
                "..OOOO....OOOO..",
                "................",
                "................",
            ],
            SLEEP: [
                "................",
                "................",
                ".......OO.......",
                "......OSSO......",
                ".......OO.......",
                "...OOOOOOOOOO...",
                "..OBBBBBBBBBBO..",
                "..OBOOOOOOOObo..",
                "..OBOOOOOOOObo..",
                "...OOOOOOOOOO...",
                "...OBBBSSSBBO...",
                "..OBBBBBBBBBBBO.",
                "..OSSSSSSSSSSSO.",
                "..OOOO....OOOO..",
                "................",
                "................",
            ],
            CLIMB_1: [
                ".......OO.......",
                "......OEEO......",
                ".......OO.......",
                "...OOOOOOOOOO...",
                "..OBBBBBBBBBBO..",
                "..OBOOOOOOOObo..",
                "..OBOBBBBXXXXO..",
                "...OOOOOOOOOO...",
                "...OBBBAAABBBOOO",
                "...OBBBBBBBBBEEO",
                "...OSSSSSSSSSOOO",
                "...OO......OO...",
                "..OSSO..........",
                "..OOOO..........",
                "................",
                "................",
            ],
            CLIMB_2: [
                ".......OO.......",
                "......OEEO......",
                ".......OO.......",
                "...OOOOOOOOOO...",
                "..OBBBBBBBBBBO..",
                "..OBOOOOOOOObo..",
                "..OBOBBBBXXXXO..",
                "...OOOOOOOOOO...",
                "OOOBBBBAAABBBO..",
                "OEEBBBBBBBBBO...",
                "OOSSSSSSSSSSO...",
                "....OO.....OO...",
                "..........OSSO..",
                "..........OOOO..",
                "................",
                "................",
            ],
            HANG_1: [
                "..OOOO....OOOO..",
                "..OEEO....OEEO..",
                "...OO......OO...",
                "...OOOOOOOOOO...",
                "..OBBBBBBBBBBO..",
                "..OBOOOOOOOObo..",
                "..OBOXXBBXXOBO..",
                "..OBOOOOOOOObo..",
                "...OOOOOOOOOO...",
                "...OBBBAAABBBO..",
                "....OBBBBBBBBO..",
                "....OSSSSSSSSO..",
                ".....OO....OO...",
                "................",
                "................",
                "................",
            ],
            HANG_2: [
                "...OOOO..OOOO...",
                "...OEEO..OEEO...",
                "....OO....OO....",
                "...OOOOOOOOOO...",
                "..OBBBBBBBBBBO..",
                "..OBOOOOOOOObo..",
                "..OBOXXBBXXOBO..",
                "..OBOOOOOOOObo..",
                "...OOOOOOOOOO...",
                "..OBBBAAABBBO...",
                "..OBBBBBBBBO....",
                "..OSSSSSSSSO....",
                "...OO....OO.....",
                "................",
                "................",
                "................",
            ],
            FALL: [
                "......OOOO......",
                ".....OEEEEO.....",
                ".OO...OOOO...OO.",
                "OBBOOOOOOOOOOBBO",
                ".OBBBBBBBBBBBBO.",
                "..OBOOOOOOOObo..",
                "..OBOXXBBXXOBO..",
                "..OBOOOOOOOObo..",
                "...OOOOOOOOOO...",
                "...OBBBAAABBBO..",
                "...OSSSSSSSSSO..",
                "..OSSO....OSSO..",
                "..OOOO....OOOO..",
                "................",
                "................",
                "................",
            ],
        },

        MOCHI: {
            IDLE_1: [
                "................",
                "......OOOO......",
                "....OOBBBBOO....",
                "...OBBBBBBBBO...",
                "..OBBBBBBBBBBO..",
                "..OBXBBBBBBXBO..",
                "..OBEOBBBBBOEBO.",
                ".OBBBBBBBBBBBBBO",
                ".OBBBBBAAABBBBBO",
                ".OBBBBBBBBBBBBBO",
                ".OBSSSSSSSSSSSBO",
                "..OOOOOOOOOOOO..",
                "...OO..OO..OO...",
                "................",
                "................",
                "................",
            ],
            IDLE_2: [
                "................",
                "................",
                ".....OOOOOO.....",
                "...OOBBBBBBOO...",
                "..OBBBBBBBBBBO..",
                "..OBXBBBBBBXBO..",
                ".OBBEBBBBBBBEBO.",
                ".OBBBBBAAABBBBBO",
                ".OBBBBBBBBBBBBBO",
                ".OBSSSSSSSSSSSBO",
                "..OOOOOOOOOOOO..",
                "..OO...OO...OO..",
                "................",
                "................",
                "................",
                "................",
            ],
            BLINK: [
                "................",
                "......OOOO......",
                "....OOBBBBOO....",
                "...OBBBBBBBBO...",
                "..OBBBBBBBBBBO..",
                "..OBOOBBBBBOOBO.",
                "..OBEOBBBBBOEBO.",
                ".OBBBBBBBBBBBBBO",
                ".OBBBBBAAABBBBBO",
                ".OBBBBBBBBBBBBBO",
                ".OBSSSSSSSSSSSBO",
                "..OOOOOOOOOOOO..",
                "...OO..OO..OO...",
                "................",
                "................",
                "................",
            ],
            WALK_1: [
                "................",
                "......OOOO......",
                "....OOBBBBOO....",
                "...OBBBBBBBBO...",
                "..OBBBBBXBBBXO..",
                "..OBBBBBBBBBOEBO",
                ".OBBBBBBBBBBBBBO",
                ".OBBBBBAAABBBBBO",
                ".OBSSSSSSSSSSSBO",
                "..OOOOOOOOOOOO..",
                "..OOO....OOO....",
                "................",
                "................",
                "................",
                "................",
                "................",
            ],
            WALK_2: [
                "................",
                "................",
                ".....OOOOOO.....",
                "...OOBBBBBBOO...",
                "..OBBBBBXBBBXO..",
                ".OBBBBBBBBBBOEBO",
                ".OBBBBBAAABBBBBO",
                ".OBBBBBBBBBBBBBO",
                ".OBSSSSSSSSSSSBO",
                "..OOOOOOOOOOOO..",
                "....OOO....OOO..",
                "................",
                "................",
                "................",
                "................",
                "................",
            ],
            SIT: [
                "................",
                "................",
                "................",
                ".....OOOOOO.....",
                "...OOBBBBBBOO...",
                "..OBBBBBBBBBBO..",
                "..OBXBBBBBBXBO..",
                ".OBBEBBBBBBBEBO.",
                ".OBBBBBAAABBBBBO",
                "OBBBBBBBBBBBBBBO",
                "OBSSSSSSSSSSSSBO",
                ".OOOOOOOOOOOOOO.",
                "................",
                "................",
                "................",
                "................",
            ],
            SLEEP: [
                "................",
                "................",
                "................",
                "................",
                "....OOOOOOOO....",
                "..OOBBBBBBBBOO..",
                ".OBBOOBBBBBOOBBO",
                ".OBBEBBBBBBBEBO.",
                "OBBBBBBBBBBBBBBO",
                "OBSSSSSSSSSSSSBO",
                ".OOOOOOOOOOOOOO.",
                "................",
                "................",
                "................",
                "................",
                "................",
            ],
            CLIMB_1: [
                "................",
                "......OOOO......",
                "....OOBBBBOO....",
                "...OBBBBBBBBO...",
                "...OBBBBBBBBXO..",
                "...OBBBBBBBBEBO.",
                "...OBBBBBBBBBBO.",
                "...OBBBAAABBBBO.",
                "...OBSSSSSSSSBO.",
                "....OOOOOOOOOO..",
                "................",
                "................",
                "................",
                "................",
                "................",
                "................",
            ],
            CLIMB_2: [
                "................",
                "................",
                "......OOOO......",
                "....OOBBBBOO....",
                "...OBBBBBBBBXO..",
                "...OBBBBBBBBEBO.",
                "..OBBBBBBBBBBBO.",
                "..OBBBBAAABBBBO.",
                "...OBSSSSSSSSBO.",
                "....OOOOOOOOOO..",
                "................",
                "................",
                "................",
                "................",
                "................",
                "................",
            ],
            HANG_1: [
                "..OOOOOOOOOOOO..",
                ".OBSSSSSSSSSSSBO",
                "..OBBBBBBBBBBO..",
                "...OBBBBBBBBO...",
                "..OBBBBBBBBBBO..",
                "..OBXBBBBBBXBO..",
                "..OBEOBBBBBOEBO.",
                "...OBBBAAABBBO..",
                "....OOBBBBBOO...",
                "......OOOOO.....",
                "................",
                "................",
                "................",
                "................",
                "................",
                "................",
            ],
            HANG_2: [
                "..OOOOOOOOOOOO..",
                ".OBSSSSSSSSSSSBO",
                "..OBBBBBBBBBBO..",
                "....OBBBBBBBBO..",
                "...OBBBBBBBBBBO.",
                "...OBXBBBBBBXBO.",
                "...OBEOBBBBBOEBO",
                "....OBBBAAABBBO.",
                ".....OOBBBBBOO..",
                ".......OOOOO....",
                "................",
                "................",
                "................",
                "................",
                "................",
                "................",
            ],
            FALL: [
                ".....OOOOOO.....",
                "....OBBBBBBO....",
                "...OBBBBBBBBO...",
                "...OBXBBBBXBO...",
                "...OBBBBBBBBO...",
                "..OBEOBBBBBOEBO.",
                "..OBBBBAAABBBBO.",
                "..OBBBBBBBBBBBO.",
                "...OBSSSSSSSBO..",
                "....OOOOOOOOO...",
                "................",
                "................",
                "................",
                "................",
                "................",
                "................",
            ],
        },
    };

    // Variabel Global Simulasi
    let characters = [];
    let particles = [];
    let ledges = [];
    const mobileViewport = window.matchMedia("(max-width: 600px)");
    const savedMateSettings = window.ejaSettings.get("pixelMates");
    const characterLimit = 3;
    const savedCharacterTypes =
        Array.isArray(savedMateSettings.characterTypes) &&
        savedMateSettings.characterTypes.length > 0 &&
        savedMateSettings.characterTypes.length <= 3 &&
        savedMateSettings.characterTypes.every((type) =>
            Object.prototype.hasOwnProperty.call(PALETTES, type),
        )
            ? savedMateSettings.characterTypes.slice(0, characterLimit)
            : null;
    let configuredLedges = savedMateSettings.ledgesEnabled !== false;
    const hangSurfaces = [
        document.getElementById("time"),
        document.getElementById("username"),
        document.getElementById("login-button"),
    ].map((element) => ({ element, x: 0, y: 0, w: 0, h: 0 }));
    let showLedges =
        !mobileViewport.matches && configuredLedges && !optimizedMode;
    let selectedArchetype = Object.prototype.hasOwnProperty.call(
        PALETTES,
        savedMateSettings.selectedArchetype,
    )
        ? savedMateSettings.selectedArchetype
        : "NEKO";
    let nextCharId = 1;

    function saveMateSettings() {
        window.ejaSettings.update("pixelMates", {
            selectedArchetype,
            characterTypes: characters.map((character) => character.type),
            ledgesEnabled: configuredLedges,
        });
    }

    // Interaksi Pointer (Mouse / Touch)
    let pointer = {
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        vx: 0,
        vy: 0,
        isDown: false,
        draggedEntity: null,
        draggedLedge: null,
        dragOffsetX: 0,
        dragOffsetY: 0,
        downTime: 0,
    };

    function updateTextHangSurfaces() {
        for (const surface of hangSurfaces) {
            const rect = surface.element.getBoundingClientRect();
            surface.x = rect.left;
            surface.y = rect.top;
            surface.w = rect.width;
            surface.h = rect.height;
        }
    }

    const surfaceObserver = new ResizeObserver(updateTextHangSurfaces);
    for (const surface of hangSurfaces) {
        surfaceObserver.observe(surface.element);
    }

    /**
     * Inisialisasi Pijakan (Ledges) Melayang di Layar
     * Karakter bisa berjalan di atasnya, duduk di tepinya, atau bergelantungan di bawahnya.
     */
    function initLedges() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        showLedges =
            !mobileViewport.matches && configuredLedges && !optimizedMode;
        const ledgeWidth = Math.min(260, w * 0.32);
        ledges = showLedges
            ? [
                  {
                      id: "LEDGE_1",
                      x: Math.max(20, w - ledgeWidth - Math.max(40, w * 0.08)),
                      y: Math.max(160, h * 0.62),
                      w: ledgeWidth,
                      h: 16,
                      color: "#172b3b",
                      border: "#8bf3c5",
                      label: "PLATFORM A",
                      labelVisibleUntil: 0,
                  },
              ]
            : [];
        syncLedgeToggle();
    }

    function syncLedgeToggle() {
        const toggleButton = document.getElementById("toggleLedgesBtn");
        toggleButton.textContent = showLedges
            ? "[=] Pijakan: ON"
            : "[=] Pijakan: OFF";
        toggleButton.classList.toggle("is-selected", showLedges);
        toggleButton.setAttribute("aria-pressed", String(showLedges));
        toggleButton.disabled = mobileViewport.matches || optimizedMode;
    }

    /**
     * Efek Partikel Pixel (Hati, Bintang, Zzz, Debu Mendarat)
     */
    class PixelParticle {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type; // 'HEART', 'ZZZ', 'DUST', 'STAR'
            this.life = 1.0;
            this.vx = (Math.random() - 0.5) * 1.8;
            this.vy = -1.2 - Math.random() * 1.2;

            if (type === "ZZZ") {
                this.vx = 0.4 + Math.random() * 0.4;
                this.vy = -0.7;
            } else if (type === "DUST") {
                this.vx = (Math.random() - 0.5) * 3.5;
                this.vy = -Math.random() * 1.5;
            }
        }

        update(motionScale = 1) {
            this.x += this.vx * motionScale;
            this.y += this.vy * motionScale;
            this.life -= (this.type === "DUST" ? 0.05 : 0.018) * motionScale;
        }

        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, this.life);
            const px = Math.round(this.x);
            const py = Math.round(this.y);

            if (this.type === "HEART") {
                ctx.fillStyle = "#f43f5e";
                const heart = [
                    ".XX.XX.",
                    "XXXXXXX",
                    "XXXXXXX",
                    ".XXXXX.",
                    "..XXX..",
                    "...X...",
                ];
                for (let r = 0; r < heart.length; r++) {
                    for (let c = 0; c < heart[r].length; c++) {
                        if (heart[r][c] === "X") {
                            ctx.fillRect(px + c * 3, py + r * 3, 3, 3);
                        }
                    }
                }
            } else if (this.type === "STAR") {
                ctx.fillStyle = "#facc15";
                const star = ["..X..", ".XXX.", "XXXXX", ".XXX.", "..X.."];
                for (let r = 0; r < star.length; r++) {
                    for (let c = 0; c < star[r].length; c++) {
                        if (star[r][c] === "X") {
                            ctx.fillRect(px + c * 3, py + r * 3, 3, 3);
                        }
                    }
                }
            } else if (this.type === "ZZZ") {
                ctx.fillStyle = "#bae6fd";
                ctx.font = 'bold 12px "Silkscreen", monospace';
                ctx.fillText("Z", px, py);
            } else if (this.type === "DUST") {
                ctx.fillStyle = "#94a3b8";
                ctx.fillRect(px, py, 4, 4);
            }
            ctx.restore();
        }
    }

    /**
     * Kelas Karakter Pixel Otonom (Desktop Pet / Screen Mate)
     */
    class PixelMate {
        constructor(x, y, type = "NEKO") {
            this.id = nextCharId++;
            this.type = type;
            const paletteList = PALETTES[type] || PALETTES.NEKO;
            this.palette =
                paletteList[Math.floor(Math.random() * paletteList.length)];
            this.name = `${type}-${String(this.id).padStart(2, "0")}`;

            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
            this.dir = Math.random() < 0.5 ? 1 : -1; // 1 = Kanan, -1 = Kiri

            this.state = STATE.FALL;
            this.stateTimer = 120;
            this.animTick = Math.floor(Math.random() * 100);
            this.spriteElement = null;
            this.lastDomSprite = null;

            // Konteks permukaan tempat karakter berada
            this.currentLedge = null; // null atau referensi objek ledge
            this.wallSide = null; // 'LEFT' atau 'RIGHT'
            this.hangSurface = null; // 'CEILING' atau objek ledge

            // Squash & Stretch untuk kelenturan animasi
            this.scaleX = 1;
            this.scaleY = 1;

            // Gelembung status kecil di atas kepala
            this.thoughtText = "";
            this.thoughtTimer = 0;
        }

        setThought(text, duration = 90) {
            this.thoughtText = text;
            this.thoughtTimer = duration;
        }

        /**
         * Transisi ke State Baru secara Otonom atau Interaktif
         */
        setState(newState, duration = null) {
            this.state = newState;
            if (duration !== null) {
                this.stateTimer = duration;
            } else {
                this.stateTimer = 110 + Math.floor(Math.random() * 180);
            }

            if (newState === STATE.IDLE) {
                this.vx = 0;
                this.vy = 0;
            } else if (newState === STATE.WALK) {
                const baseSpeed =
                    this.type === "NEKO"
                        ? 1.7
                        : this.type === "BOT"
                          ? 1.35
                          : 1.5;
                this.vx = this.dir * (baseSpeed + Math.random() * 0.5);
                this.vy = 0;
            } else if (newState === STATE.SIT) {
                this.vx = 0;
                this.vy = 0;
                this.stateTimer = 160 + Math.floor(Math.random() * 200);
            } else if (newState === STATE.SLEEP) {
                this.vx = 0;
                this.vy = 0;
                this.stateTimer = 260 + Math.floor(Math.random() * 240);
            } else if (newState === STATE.CLIMB) {
                this.vx = 0;
                // Default memanjat ke atas (-1.4) atau kadang turun (1.1)
                this.vy = -1.35 - Math.random() * 0.4;
                this.stateTimer = 180 + Math.floor(Math.random() * 200);
            } else if (newState === STATE.HANG) {
                this.vy = 0;
                // Kadang merayap di langit-langit, kadang diam bergelantungan sambil mengayun
                if (Math.random() < 0.72) {
                    this.vx = this.dir * (0.9 + Math.random() * 0.45);
                } else {
                    this.vx = 0;
                }
                this.stateTimer = 150 + Math.floor(Math.random() * 220);
            } else if (newState === STATE.FALL) {
                this.currentLedge = null;
                this.wallSide = null;
                this.hangSurface = null;
            }
        }

        /**
         * Otak Otonom (Memilih aksi selanjutnya saat timer habis)
         */
        chooseNextGroundAction() {
            const roll = Math.random();
            if (roll < 0.44) {
                // Jalan ke arah acak
                if (Math.random() < 0.45) this.dir *= -1;
                this.setState(STATE.WALK);
            } else if (roll < 0.68) {
                // Duduk santai
                this.setState(STATE.SIT);
            } else if (roll < 0.84) {
                // Diam sebentar melihat sekitar
                this.setState(STATE.IDLE);
            } else {
                // Melompat ke atas (bisa meraih platform atau bergelantungan di bawah pijakan)
                this.vy = -8.5 - Math.random() * 3.0;
                this.vx = this.dir * (1.8 + Math.random() * 1.5);
                this.scaleX = 0.8;
                this.scaleY = 1.25;
                this.setState(STATE.FALL);
                this.setThought("!", 35);
            }
        }

        /**
         * Update Fisika & AI setiap Frame
         */
        update(motionScale = 1) {
            this.animTick += motionScale;

            // Kembalikan efek squash & stretch ke normal (1.0) secara halus
            this.scaleX += (1 - this.scaleX) * Math.min(1, 0.18 * motionScale);
            this.scaleY += (1 - this.scaleY) * Math.min(1, 0.18 * motionScale);

            if (this.thoughtTimer > 0) {
                this.thoughtTimer -= motionScale;
            }

            const floorY = worldHeight - ENTITY_SIZE;
            const rightWallX = worldWidth - ENTITY_SIZE;

            // 1. JIKA SEDANG DITARIK OLEH PENGGUNA
            if (this.state === STATE.DRAGGED) {
                return;
            }

            this.stateTimer -= motionScale;

            // 2. LOGIKA PER STATE
            switch (this.state) {
                case STATE.FALL: {
                    const prevBottom = this.y + ENTITY_SIZE;
                    const prevY = this.y;
                    this.vy = Math.min(
                        MAX_FALL_SPEED,
                        this.vy + GRAVITY * motionScale,
                    );
                    this.x += this.vx * motionScale;
                    this.y += this.vy * motionScale;

                    // Cek apakah meraih bagian bawah pijakan untuk bergelantungan saat melompat naik
                    if (showLedges && this.vy < 0) {
                        for (const l of ledges) {
                            const centerX = this.x + ENTITY_SIZE * 0.5;
                            if (
                                centerX > l.x + 12 &&
                                centerX < l.x + l.w - 12 &&
                                Math.abs(this.y - (l.y + l.h)) < 10 &&
                                Math.random() < 0.35
                            ) {
                                this.y = l.y + l.h;
                                this.hangSurface = l;
                                this.setState(STATE.HANG);
                                this.setThought("[^]", 50);
                                return;
                            }
                        }
                    }

                    if (this.vy < 0) {
                        for (const surface of hangSurfaces) {
                            const surfaceBottom = surface.y + surface.h;
                            const centerX = this.x + ENTITY_SIZE * 0.5;
                            if (
                                surface.w >= ENTITY_SIZE &&
                                centerX >= surface.x &&
                                centerX <= surface.x + surface.w &&
                                prevY >= surfaceBottom &&
                                this.y <= surfaceBottom
                            ) {
                                this.y = surfaceBottom;
                                this.hangSurface = surface;
                                this.setState(STATE.HANG);
                                this.setThought("[GELANTUNG]", 55);
                                return;
                            }
                        }
                    }

                    // Cek apakah mendarat di atas Pijakan (Ledge)
                    if (showLedges && this.vy > 0) {
                        for (const l of ledges) {
                            const centerX = this.x + ENTITY_SIZE * 0.5;
                            const newBottom = this.y + ENTITY_SIZE;
                            if (
                                centerX >= l.x + 6 &&
                                centerX <= l.x + l.w - 6 &&
                                prevBottom <= l.y + 8 &&
                                newBottom >= l.y
                            ) {
                                this.y = l.y - ENTITY_SIZE;
                                this.vy = 0;
                                this.vx = 0;
                                this.currentLedge = l;
                                this.onLanded();
                                return;
                            }
                        }
                    }

                    // Cek apakah menabrak dinding kiri/kanan layar
                    if (this.x <= 0) {
                        this.x = 0;
                        if (Math.random() < 0.65 && this.y < floorY - 30) {
                            this.wallSide = "LEFT";
                            this.dir = -1;
                            this.setState(STATE.CLIMB);
                            return;
                        } else {
                            this.vx = -this.vx * 0.5;
                            this.dir = 1;
                        }
                    } else if (this.x >= rightWallX) {
                        this.x = rightWallX;
                        if (Math.random() < 0.65 && this.y < floorY - 30) {
                            this.wallSide = "RIGHT";
                            this.dir = 1;
                            this.setState(STATE.CLIMB);
                            return;
                        } else {
                            this.vx = -this.vx * 0.5;
                            this.dir = -1;
                        }
                    }

                    // Cek apakah menyentuh langit-langit
                    if (this.y <= 0) {
                        this.y = 0;
                        if (Math.random() < 0.7) {
                            this.hangSurface = "CEILING";
                            this.setState(STATE.HANG);
                            return;
                        } else {
                            this.vy = 1;
                        }
                    }

                    // Cek mendarat di Lantai Bawah Layar
                    if (this.y >= floorY) {
                        this.y = floorY;
                        this.vy = 0;
                        this.vx = 0;
                        this.currentLedge = null;
                        this.onLanded();
                    }
                    break;
                }

                case STATE.IDLE: {
                    this.checkSurfaceSupport(floorY);
                    if (this.stateTimer <= 0) {
                        this.chooseNextGroundAction();
                    }
                    break;
                }

                case STATE.SIT: {
                    this.checkSurfaceSupport(floorY);
                    if (this.stateTimer <= 0) {
                        // Dari duduk bisa lanjut tertidur (SLEEP) atau bangun jalan
                        if (Math.random() < 0.45) {
                            this.setState(STATE.SLEEP);
                        } else {
                            this.chooseNextGroundAction();
                        }
                    }
                    break;
                }

                case STATE.SLEEP: {
                    this.checkSurfaceSupport(floorY);
                    // Munculkan partikel Zzz berkala
                    if (this.animTick % 55 === 0) {
                        particles.push(
                            new PixelParticle(
                                this.x + ENTITY_SIZE * 0.65,
                                this.y + 6,
                                "ZZZ",
                            ),
                        );
                    }
                    if (this.stateTimer <= 0) {
                        this.setState(STATE.IDLE, 60);
                    }
                    break;
                }

                case STATE.WALK: {
                    this.x += this.vx * motionScale;

                    // Jika sedang berada di atas pijakan melayang
                    if (this.currentLedge) {
                        if (!showLedges) {
                            this.setState(STATE.FALL);
                            break;
                        }
                        const l = this.currentLedge;
                        this.y = l.y - ENTITY_SIZE;
                        const centerX = this.x + ENTITY_SIZE * 0.5;

                        // Jika mencapai ujung pijakan
                        if (centerX < l.x + 10 || centerX > l.x + l.w - 10) {
                            const edgeRoll = Math.random();
                            if (edgeRoll < 0.42) {
                                // Berbalik arah tetap di pijakan
                                this.dir *= -1;
                                this.vx = -this.vx;
                                this.x = Math.max(
                                    l.x - 10,
                                    Math.min(
                                        l.x + l.w - ENTITY_SIZE + 10,
                                        this.x,
                                    ),
                                );
                            } else if (edgeRoll < 0.72) {
                                // Duduk santai di pinggir pijakan
                                this.setState(STATE.SIT);
                            } else {
                                // Melompat / terjun turun dari pijakan
                                this.currentLedge = null;
                                this.vy = -2.5;
                                this.setState(STATE.FALL);
                            }
                            break;
                        }
                    } else {
                        // Berada di lantai utama
                        this.y = floorY;

                        // Jika menyentuh dinding kiri layar
                        if (this.x <= 0) {
                            this.x = 0;
                            if (Math.random() < 0.78) {
                                // Mulai memanjat dinding kiri!
                                this.wallSide = "LEFT";
                                this.dir = -1;
                                this.setState(STATE.CLIMB);
                                this.setThought("[MANJAT]", 45);
                            } else {
                                this.dir = 1;
                                this.vx = Math.abs(this.vx);
                            }
                            break;
                        }

                        // Jika menyentuh dinding kanan layar
                        if (this.x >= rightWallX) {
                            this.x = rightWallX;
                            if (Math.random() < 0.78) {
                                // Mulai memanjat dinding kanan!
                                this.wallSide = "RIGHT";
                                this.dir = 1;
                                this.setState(STATE.CLIMB);
                                this.setThought("[MANJAT]", 45);
                            } else {
                                this.dir = -1;
                                this.vx = -Math.abs(this.vx);
                            }
                            break;
                        }
                    }

                    if (this.stateTimer <= 0) {
                        this.chooseNextGroundAction();
                    }
                    break;
                }

                case STATE.CLIMB: {
                    // Pastikan menempel di dinding tepi layar
                    if (this.wallSide === "LEFT") {
                        this.x = 0;
                        this.dir = -1;
                    } else {
                        this.x = rightWallX;
                        this.dir = 1;
                    }

                    this.y += this.vy * motionScale;

                    // Jika sampai di langit-langit atas layar -> Bergelantungan!
                    if (this.y <= 0) {
                        this.y = 0;
                        this.hangSurface = "CEILING";
                        this.dir = this.wallSide === "LEFT" ? 1 : -1;
                        this.wallSide = null;
                        this.setState(STATE.HANG);
                        this.setThought("[GELANTUNG]", 55);
                        break;
                    }

                    // Jika turun sampai ke lantai
                    if (this.y >= floorY) {
                        this.y = floorY;
                        this.dir = this.wallSide === "LEFT" ? 1 : -1;
                        this.wallSide = null;
                        this.setState(STATE.WALK);
                        break;
                    }

                    // Ketika timer panjat habis di tengah dinding
                    if (this.stateTimer <= 0) {
                        const roll = Math.random();
                        if (roll < 0.55) {
                            // Lanjut memanjat ke atas menuju langit-langit
                            this.vy = -1.5;
                            this.stateTimer = 140;
                        } else if (roll < 0.8) {
                            // Melompat lepas dari dinding ke tengah layar
                            this.vx =
                                (this.wallSide === "LEFT" ? 1 : -1) *
                                (3.5 + Math.random() * 2.5);
                            this.vy = -4.5;
                            this.dir = this.wallSide === "LEFT" ? 1 : -1;
                            this.wallSide = null;
                            this.setState(STATE.FALL);
                        } else {
                            // Merayap turun dinding
                            this.vy = 1.2;
                            this.stateTimer = 110;
                        }
                    }
                    break;
                }

                case STATE.HANG: {
                    this.x += this.vx * motionScale;

                    if (this.hangSurface === "CEILING") {
                        this.y = 0;
                        // Batas kiri & kanan langit-langit
                        if (this.x <= 10) {
                            this.x = 10;
                            this.dir = 1;
                            this.vx = Math.abs(this.vx);
                        } else if (this.x >= rightWallX - 10) {
                            this.x = rightWallX - 10;
                            this.dir = -1;
                            this.vx = -Math.abs(this.vx);
                        }
                    } else if (
                        this.hangSurface &&
                        typeof this.hangSurface === "object"
                    ) {
                        const isTextSurface = hangSurfaces.includes(
                            this.hangSurface,
                        );
                        if (!showLedges && !isTextSurface) {
                            this.setState(STATE.FALL);
                            break;
                        }
                        const l = this.hangSurface;
                        this.y = l.y + l.h;
                        if (this.x < l.x) {
                            this.x = l.x;
                            this.dir = 1;
                            this.vx = Math.abs(this.vx);
                        } else if (this.x > l.x + l.w - ENTITY_SIZE) {
                            this.x = l.x + l.w - ENTITY_SIZE;
                            this.dir = -1;
                            this.vx = -Math.abs(this.vx);
                        }
                    }

                    // Saat timer bergelantungan selesai
                    if (this.stateTimer <= 0) {
                        const roll = Math.random();
                        if (roll < 0.48) {
                            // Lepaskan pegangan dan terjun bebas!
                            this.hangSurface = null;
                            this.vx = (Math.random() - 0.5) * 2;
                            this.vy = 1.0;
                            this.setState(STATE.FALL);
                            this.setThought("[TERJUN!]", 45);
                        } else if (roll < 0.78) {
                            // Bergelantungan diam sambil berayun-ayun lucu
                            this.vx = 0;
                            this.stateTimer =
                                110 + Math.floor(Math.random() * 120);
                        } else {
                            // Lanjut merayap bergelantungan ke arah sebaliknya
                            this.dir *= -1;
                            this.vx = this.dir * 1.1;
                            this.stateTimer =
                                130 + Math.floor(Math.random() * 140);
                        }
                    }
                    break;
                }
            }
        }

        /**
         * Memastikan karakter masih memiliki pijakan di bawahnya
         */
        checkSurfaceSupport(floorY) {
            if (this.currentLedge) {
                if (!showLedges) {
                    this.currentLedge = null;
                    this.setState(STATE.FALL);
                    return;
                }
                const l = this.currentLedge;
                this.y = l.y - ENTITY_SIZE;
                const centerX = this.x + ENTITY_SIZE * 0.5;
                if (centerX < l.x || centerX > l.x + l.w) {
                    this.currentLedge = null;
                    this.setState(STATE.FALL);
                }
            } else {
                if (this.y < floorY) {
                    this.setState(STATE.FALL);
                } else {
                    this.y = floorY;
                }
            }
        }

        /**
         * Efek Squash & Partikel saat Mendarat
         */
        onLanded() {
            this.scaleX = 1.32;
            this.scaleY = 0.68;
            // Munculkan partikel debu kecil
            for (let i = 0; i < 4; i++) {
                particles.push(
                    new PixelParticle(
                        this.x + ENTITY_SIZE * 0.5,
                        this.y + ENTITY_SIZE - 4,
                        "DUST",
                    ),
                );
            }
            // Pilih aksi selanjutnya
            if (Math.random() < 0.35) {
                this.setState(STATE.SIT);
            } else {
                this.chooseNextGroundAction();
            }
        }

        /**
         * Memilih Matriks Sprite 16x16 berdasarkan State & Frame Animasi
         */
        getCurrentSpriteMatrix() {
            const pack = SPRITES[this.type] || SPRITES.NEKO;

            switch (this.state) {
                case STATE.IDLE:
                    if (this.animTick % 90 > 82) return pack.BLINK;
                    return Math.floor(this.animTick / 28) % 2 === 0
                        ? pack.IDLE_1
                        : pack.IDLE_2;

                case STATE.WALK:
                    return Math.floor(this.animTick / 9) % 2 === 0
                        ? pack.WALK_1
                        : pack.WALK_2;

                case STATE.SIT:
                    if (this.animTick % 100 > 92) return pack.SLEEP;
                    return pack.SIT;

                case STATE.SLEEP:
                    return pack.SLEEP;

                case STATE.CLIMB:
                    return Math.floor(this.animTick / 10) % 2 === 0
                        ? pack.CLIMB_1
                        : pack.CLIMB_2;

                case STATE.HANG:
                case STATE.DRAGGED:
                    return Math.floor(this.animTick / 14) % 2 === 0
                        ? pack.HANG_1
                        : pack.HANG_2;

                case STATE.FALL:
                    return pack.FALL;

                default:
                    return pack.IDLE_1;
            }
        }

        /**
         * Render Karakter Pixel ke Canvas
         */
        draw(ctx) {
            const matrix = this.getCurrentSpriteMatrix();
            const sprite = getCachedSprite(this.palette, matrix);
            const isHanging =
                this.state === STATE.HANG || this.state === STATE.DRAGGED;

            if (optimizedMode) {
                if (!this.spriteElement) {
                    this.spriteElement = document.createElement("img");
                    this.spriteElement.className = "pixel-mate-sprite";
                    this.spriteElement.alt = "";
                    this.spriteElement.draggable = false;
                    spriteLayer.append(this.spriteElement);
                }
                if (sprite !== this.lastDomSprite) {
                    this.spriteElement.src = getSpriteSource(sprite);
                    this.lastDomSprite = sprite;
                }

                let rotation = 0;
                if (this.state === STATE.HANG && Math.abs(this.vx) < 0.1) {
                    rotation = Math.sin(this.animTick * 0.08) * 0.09;
                } else if (this.state === STATE.DRAGGED) {
                    rotation =
                        Math.max(-0.35, Math.min(0.35, pointer.vx * 0.025)) +
                        Math.sin(this.animTick * 0.25) * 0.08;
                }
                this.spriteElement.style.transformOrigin = isHanging
                    ? "50% 0"
                    : "50% 100%";
                this.spriteElement.style.transform =
                    `translate3d(${Math.round(this.x)}px, ${Math.round(this.y)}px, 0) ` +
                    `rotate(${rotation}rad) scale(${this.dir * this.scaleX}, ${this.scaleY})`;
                return;
            }

            ctx.save();

            // Titik jangkar transformasi (bawah tengah untuk jalan/duduk, atas tengah untuk bergelantungan)
            const anchorX = Math.round(this.x + ENTITY_SIZE * 0.5);
            const anchorY = isHanging
                ? Math.round(this.y)
                : Math.round(this.y + ENTITY_SIZE);

            // Gambar bayangan di lantai/pijakan jika tidak sedang jatuh atau bergelantungan
            if (
                !isHanging &&
                this.state !== STATE.FALL &&
                this.state !== STATE.CLIMB
            ) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
                ctx.fillRect(anchorX - 20, anchorY - 4, 40, 6);
            }

            ctx.translate(anchorX, anchorY);

            // Ayunan lembut saat bergelantungan atau ditarik mouse
            if (this.state === STATE.HANG && Math.abs(this.vx) < 0.1) {
                const swingAngle = Math.sin(this.animTick * 0.08) * 0.09;
                ctx.rotate(swingAngle);
            } else if (this.state === STATE.DRAGGED) {
                const dragAngle =
                    Math.max(-0.35, Math.min(0.35, pointer.vx * 0.025)) +
                    Math.sin(this.animTick * 0.25) * 0.08;
                ctx.rotate(dragAngle);
            }

            // Flip horizontal jika menghadap ke kiri (-1)
            ctx.scale(this.dir * this.scaleX, this.scaleY);

            const drawOffsetX = -ENTITY_SIZE * 0.5;
            const drawOffsetY = isHanging ? 0 : -ENTITY_SIZE;

            ctx.drawImage(sprite, drawOffsetX, drawOffsetY);

            ctx.restore();

            // Gambar tag status/pikiran kecil di atas karakter jika aktif
            if (this.thoughtTimer > 0 && this.thoughtText) {
                ctx.save();
                ctx.font = 'bold 10px "JetBrains Mono", monospace';
                const textWidth = ctx.measureText(this.thoughtText).width;
                const bx = Math.round(
                    this.x + ENTITY_SIZE * 0.5 - textWidth * 0.5 - 5,
                );
                const by = Math.round(this.y - 16);

                ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 1.5;
                ctx.fillRect(bx, by, textWidth + 10, 15);
                ctx.strokeRect(bx, by, textWidth + 10, 15);

                ctx.fillStyle = "#f8fafc";
                ctx.fillText(this.thoughtText, bx + 5, by + 11);
                ctx.restore();
            }
        }
    }

    /**
     * Menggambar Pijakan Melayang (Floating Pixel Ledges)
     */
    function drawLedges(ctx) {
        if (!showLedges) return;

        for (const l of ledges) {
            ctx.save();
            const lx = Math.round(l.x);
            const ly = Math.round(l.y);

            const width = Math.round(l.w);
            ctx.fillStyle = "rgba(4, 10, 24, .72)";
            ctx.fillRect(lx + 4, ly + 12, width, 3);

            ctx.fillStyle = "#0b1325";
            ctx.fillRect(lx + 2, ly + 3, width - 4, 8);
            ctx.fillStyle = l.color;
            ctx.fillRect(lx, ly + 2, width, 8);
            ctx.fillStyle = "#8bf3c5";
            ctx.fillRect(lx + 2, ly, width - 4, 2);
            ctx.fillStyle = "#d7ffe9";
            ctx.fillRect(lx + 4, ly + 1, width - 8, 1);
            ctx.fillStyle = "#304e5d";
            ctx.fillRect(lx + 2, ly + 3, width - 4, 2);
            ctx.fillStyle = "#25394b";
            ctx.fillRect(lx + 2, ly + 6, width - 4, 3);
            ctx.fillStyle = "#8bf3c5";
            ctx.fillRect(lx + 3, ly + 10, width - 6, 1);
            ctx.fillStyle = "#f4d875";
            ctx.fillRect(lx + 7, ly + 4, 2, 2);
            ctx.fillRect(lx + width - 9, ly + 4, 2, 2);

            for (let gx = lx + 16; gx < lx + width - 12; gx += 24) {
                ctx.fillStyle = "#426273";
                ctx.fillRect(gx, ly + 7, 10, 1);
                ctx.fillStyle = "#8bf3c5";
                ctx.fillRect(gx + 2, ly + 6, 2, 2);
            }

            if (performance.now() < l.labelVisibleUntil) {
                const label = `${l.label}  /  DRAG`;
                ctx.textBaseline = "middle";
                ctx.font = '12px "Pixelify Sans", monospace';
                const labelWidth = Math.ceil(ctx.measureText(label).width) + 14;
                const labelX = Math.max(4, lx - labelWidth - 8);

                ctx.fillStyle = "rgba(8, 15, 30, .98)";
                ctx.fillRect(labelX, ly - 21, labelWidth, 18);
                ctx.fillStyle = "#8bf3c5";
                ctx.fillRect(labelX, ly - 21, labelWidth, 2);
                ctx.fillRect(labelX, ly - 19, 2, 5);
                ctx.fillRect(labelX + labelWidth - 2, ly - 19, 2, 5);
                ctx.fillStyle = "#f4f2dc";
                ctx.fillText(label, labelX + 7, ly - 11);
            }

            ctx.restore();
        }
    }

    /**
     * Menambahkan Karakter Baru ke Layar
     */
    function spawnCharacter(
        type = selectedArchetype,
        x = null,
        y = null,
        initialState = null,
    ) {
        if (characters.length >= characterLimit) return null;
        const spawnX =
            x !== null
                ? x
                : Math.max(
                      40,
                      Math.min(
                          window.innerWidth - 100,
                          80 + Math.random() * (window.innerWidth - 180),
                      ),
                  );
        const spawnY =
            y !== null ? y : 60 + Math.random() * (window.innerHeight * 0.4);
        const mate = new PixelMate(spawnX, spawnY, type);

        if (initialState) {
            mate.setState(initialState);
        }
        characters.push(mate);
        updateHudStatus();
        return mate;
    }

    /**
     * Inisialisasi Populasi Awal Karakter dengan Beragam Aksi
     */
    function initCharacters() {
        characters = [];
        const w = window.innerWidth;
        const h = window.innerHeight;

        if (savedCharacterTypes) {
            savedCharacterTypes.forEach((type) => spawnCharacter(type));
            return;
        }

        // 1. Neko sedang berjalan di lantai
        const c1 = spawnCharacter("NEKO", w * 0.25, h - ENTITY_SIZE);
        c1.setState(STATE.WALK);

        // 2. Bot mulai bergelantungan di teks jam
        const timeSurface = hangSurfaces[0];
        const c2 = spawnCharacter(
            "BOT",
            timeSurface.x + (timeSurface.w - ENTITY_SIZE) * 0.5,
            timeSurface.y + timeSurface.h,
        );
        c2.hangSurface = timeSurface;
        c2.setState(STATE.HANG);

        // 3. On mobile, Mochi hangs from the login button instead of a platform.
        if (mobileViewport.matches) {
            const loginSurface = hangSurfaces[2];
            const c3 = spawnCharacter(
                "MOCHI",
                loginSurface.x + (loginSurface.w - ENTITY_SIZE) * 0.5,
                loginSurface.y + loginSurface.h,
            );
            c3.hangSurface = loginSurface;
            c3.setState(STATE.HANG);
        } else if (ledges[0]) {
            const c3 = spawnCharacter(
                "MOCHI",
                ledges[0].x + 50,
                ledges[0].y - ENTITY_SIZE,
            );
            c3.currentLedge = ledges[0];
            c3.setState(STATE.SIT);
        }
    }

    function getPointerPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function onPointerDown(e) {
        const pos = getPointerPos(e);
        pointer.x = pos.x;
        pointer.y = pos.y;
        pointer.prevX = pos.x;
        pointer.prevY = pos.y;
        pointer.isDown = true;
        pointer.downTime = performance.now();

        for (let i = characters.length - 1; i >= 0; i--) {
            const ch = characters[i];
            if (
                pos.x >= ch.x &&
                pos.x <= ch.x + ENTITY_SIZE &&
                pos.y >= ch.y &&
                pos.y <= ch.y + ENTITY_SIZE
            ) {
                pointer.draggedEntity = ch;
                pointer.dragOffsetX = pos.x - ch.x;
                pointer.dragOffsetY = pos.y - ch.y;
                ch.setState(STATE.DRAGGED);
                ch.currentLedge = null;
                ch.wallSide = null;
                ch.hangSurface = null;
                ch.setThought("[DITARIK]", 60);
                return;
            }
        }

        if (showLedges) {
            for (let i = ledges.length - 1; i >= 0; i--) {
                const l = ledges[i];
                if (
                    pos.x >= l.x &&
                    pos.x <= l.x + l.w &&
                    pos.y >= l.y - 10 &&
                    pos.y <= l.y + l.h + 6
                ) {
                    pointer.draggedLedge = l;
                    pointer.dragOffsetX = pos.x - l.x;
                    pointer.dragOffsetY = pos.y - l.y;
                    l.labelVisibleUntil = performance.now() + 2000;
                    return;
                }
            }
        }
    }

    function onPointerMove(e) {
        const pos = getPointerPos(e);
        pointer.vx = pos.x - pointer.prevX;
        pointer.vy = pos.y - pointer.prevY;
        pointer.prevX = pointer.x;
        pointer.prevY = pointer.y;
        pointer.x = pos.x;
        pointer.y = pos.y;

        if (pointer.draggedEntity) {
            const ch = pointer.draggedEntity;
            ch.x = Math.max(
                0,
                Math.min(worldWidth - ENTITY_SIZE, pos.x - pointer.dragOffsetX),
            );
            ch.y = Math.max(
                0,
                Math.min(
                    worldHeight - ENTITY_SIZE,
                    pos.y - pointer.dragOffsetY,
                ),
            );
            if (Math.abs(pointer.vx) > 0.8) {
                ch.dir = pointer.vx > 0 ? 1 : -1;
            }
        } else if (pointer.draggedLedge) {
            const l = pointer.draggedLedge;
            const dx = pos.x - pointer.dragOffsetX - l.x;
            const dy = pos.y - pointer.dragOffsetY - l.y;
            l.x += dx;
            l.y += dy;

            for (const ch of characters) {
                if (ch.currentLedge === l || ch.hangSurface === l) {
                    ch.x += dx;
                    ch.y += dy;
                }
            }
        }
    }

    function onPointerUp() {
        if (pointer.draggedEntity) {
            const ch = pointer.draggedEntity;
            const clickDuration = performance.now() - pointer.downTime;

            if (clickDuration < 200 && Math.hypot(pointer.vx, pointer.vy) < 5) {
                for (let i = 0; i < 4; i++) {
                    particles.push(
                        new PixelParticle(
                            ch.x +
                                ENTITY_SIZE * 0.5 +
                                (Math.random() - 0.5) * 24,
                            ch.y + 8,
                            i % 2 === 0 ? "HEART" : "STAR",
                        ),
                    );
                }
                ch.vy = -7.5;
                ch.vx = (Math.random() - 0.5) * 4;
                ch.scaleX = 0.78;
                ch.scaleY = 1.28;
                ch.setThought("<3", 65);
                ch.setState(STATE.FALL);
            } else {
                if (ch.y <= 18) {
                    ch.y = 0;
                    ch.hangSurface = "CEILING";
                    ch.setState(STATE.HANG);
                    ch.setThought("[GELANTUNG]", 60);
                } else if (ch.x <= 12) {
                    ch.x = 0;
                    ch.wallSide = "LEFT";
                    ch.setState(STATE.CLIMB);
                } else if (ch.x >= worldWidth - ENTITY_SIZE - 12) {
                    ch.x = worldWidth - ENTITY_SIZE;
                    ch.wallSide = "RIGHT";
                    ch.setState(STATE.CLIMB);
                } else {
                    ch.vx = Math.max(-7, Math.min(7, pointer.vx * 0.45));
                    ch.vy = Math.max(-7, Math.min(5, pointer.vy * 0.35));
                    ch.setState(STATE.FALL);
                }
            }
            pointer.draggedEntity = null;
        }

        pointer.draggedLedge = null;
        pointer.isDown = false;
    }

    canvas.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    canvas.addEventListener(
        "touchstart",
        (e) => {
            onPointerDown(e);
        },
        { passive: true },
    );
    window.addEventListener(
        "touchmove",
        (e) => {
            onPointerMove(e);
        },
        { passive: true },
    );
    window.addEventListener("touchend", onPointerUp);

    function updateHudStatus() {
        if (document.getElementById("hudContainer").hidden) return;

        const badge = document.getElementById("charCountBadge");
        badge.textContent = `[${characters.length} AKTIF]`;

        const listEl = document.getElementById("stateLogList");
        const fragment = document.createDocumentFragment();

        characters.forEach((ch) => {
            const row = document.createElement("div");
            row.className = "mates-state-row";

            const name = document.createElement("span");
            name.className = "mates-state-name";

            const color = document.createElement("span");
            color.className = "mates-state-dot";
            color.style.backgroundColor = ch.palette.body;

            const label = document.createElement("span");
            label.textContent = ch.name;
            name.append(color, label);

            const state = document.createElement("span");
            state.className = "mates-state-value";
            state.dataset.state = ch.state;
            state.textContent = `[${ch.state}]`;

            row.append(name, state);
            fragment.append(row);
        });

        listEl.replaceChildren(fragment);
    }

    document.querySelectorAll(".type-select-btn").forEach((btn) => {
        const isSelected = btn.dataset.type === selectedArchetype;
        btn.classList.toggle("active-type", isSelected);
        btn.setAttribute("aria-pressed", String(isSelected));
        btn.addEventListener("click", () => {
            document.querySelectorAll(".type-select-btn").forEach((b) => {
                b.classList.remove("active-type");
                b.setAttribute("aria-pressed", "false");
            });
            btn.classList.add("active-type");
            btn.setAttribute("aria-pressed", "true");
            selectedArchetype = btn.getAttribute("data-type");
            saveMateSettings();
        });
    });

    document.getElementById("spawnBtn").addEventListener("click", () => {
        if (characters.length >= characterLimit) return;
        const m = spawnCharacter(selectedArchetype);
        m.setThought("[HALO!]", 60);
        particles.push(new PixelParticle(m.x + ENTITY_SIZE * 0.5, m.y, "STAR"));
        saveMateSettings();
    });

    document.getElementById("removeBtn").addEventListener("click", () => {
        if (characters.length > 1) {
            const removed = characters.pop();
            removed.spriteElement?.remove();
            for (let i = 0; i < 5; i++) {
                particles.push(
                    new PixelParticle(
                        removed.x + ENTITY_SIZE * 0.5,
                        removed.y + ENTITY_SIZE * 0.5,
                        "DUST",
                    ),
                );
            }
            updateHudStatus();
            saveMateSettings();
        }
    });

    document.getElementById("cmdWalkBtn").addEventListener("click", () => {
        characters.forEach((ch) => {
            if (ch.state === STATE.HANG || ch.state === STATE.CLIMB) {
                ch.setState(STATE.FALL);
            } else {
                ch.dir = Math.random() < 0.5 ? 1 : -1;
                ch.setState(STATE.WALK);
            }
            ch.setThought("[JALAN]", 45);
        });
    });

    document.getElementById("cmdSitBtn").addEventListener("click", () => {
        characters.forEach((ch) => {
            if (ch.state === STATE.HANG || ch.state === STATE.CLIMB) {
                ch.setState(STATE.FALL);
            } else {
                ch.setState(STATE.SIT);
            }
            ch.setThought("[DUDUK]", 50);
        });
    });

    document.getElementById("cmdHangBtn").addEventListener("click", () => {
        characters.forEach((ch, idx) => {
            if (idx < hangSurfaces.length) {
                const surface = hangSurfaces[idx];
                ch.x = surface.x + (surface.w - ENTITY_SIZE) * 0.5;
                ch.y = surface.y + surface.h;
                ch.hangSurface = surface;
            } else if (showLedges && ledges.length > 0) {
                const l = ledges[0];
                ch.x =
                    l.x +
                    16 +
                    Math.random() * Math.max(10, l.w - ENTITY_SIZE - 32);
                ch.y = l.y + l.h;
                ch.hangSurface = l;
            } else {
                ch.x = 30 + Math.random() * (worldWidth - ENTITY_SIZE - 60);
                ch.y = 0;
                ch.hangSurface = "CEILING";
            }
            ch.currentLedge = null;
            ch.wallSide = null;
            ch.setState(STATE.HANG);
            ch.setThought("[GELANTUNG]", 65);
        });
        updateHudStatus();
    });

    document.getElementById("cmdClimbBtn").addEventListener("click", () => {
        characters.forEach((ch, idx) => {
            const side = idx % 2 === 0 ? "LEFT" : "RIGHT";
            ch.wallSide = side;
            ch.x = side === "LEFT" ? 0 : worldWidth - ENTITY_SIZE;
            ch.y = 100 + Math.random() * (worldHeight - ENTITY_SIZE - 160);
            ch.currentLedge = null;
            ch.hangSurface = null;
            ch.setState(STATE.CLIMB);
            ch.setThought("[MANJAT]", 55);
        });
    });

    document.getElementById("cmdJumpBtn").addEventListener("click", () => {
        characters.forEach((ch) => {
            ch.vy = -8.5 - Math.random() * 3.5;
            ch.vx = (Math.random() - 0.5) * 6;
            ch.scaleX = 0.75;
            ch.scaleY = 1.3;
            ch.setState(STATE.FALL);
            ch.setThought("[YAY!]", 55);
            particles.push(
                new PixelParticle(ch.x + ENTITY_SIZE * 0.5, ch.y, "HEART"),
            );
        });
    });

    const toggleLedgesBtn = document.getElementById("toggleLedgesBtn");
    toggleLedgesBtn.addEventListener("click", () => {
        if (mobileViewport.matches) return;
        showLedges = !showLedges;
        configuredLedges = showLedges;
        syncLedgeToggle();
        saveMateSettings();
    });

    const toggleHudBtn = document.getElementById("toggleHudBtn");
    const hudContent = document.getElementById("hudContent");
    const hudContainer = document.getElementById("hudContainer");
    const openMatesBtn = document.getElementById("openMatesBtn");
    const closeMatesBtn = document.getElementById("closeMatesBtn");
    let hudMinimized = false;
    let hudCloseTimer;

    function setHudOpen(isOpen) {
        if (isOpen) {
            window.clearTimeout(hudCloseTimer);
            hudContainer.hidden = false;
            hudContainer.classList.remove("is-closing");
            hudContainer.classList.add("is-opening");
        } else if (
            !hudContainer.hidden &&
            !hudContainer.classList.contains("is-closing")
        ) {
            hudContainer.classList.remove("is-opening");
            hudContainer.classList.add("is-closing");
            window.clearTimeout(hudCloseTimer);
            hudCloseTimer = window.setTimeout(() => {
                hudContainer.hidden = true;
                hudContainer.classList.remove("is-closing");
            }, 200);
        }

        openMatesBtn.setAttribute("aria-expanded", String(isOpen));
        if (isOpen) {
            window.dispatchEvent(
                new CustomEvent("eja:control-opened", {
                    detail: { owner: "mates" },
                }),
            );
            updateHudStatus();
        }
    }

    hudContainer.addEventListener("animationend", (event) => {
        if (event.target !== hudContainer) return;
        hudContainer.classList.remove("is-opening");
        if (hudContainer.classList.contains("is-closing")) {
            window.clearTimeout(hudCloseTimer);
            hudContainer.hidden = true;
            hudContainer.classList.remove("is-closing");
        }
    });

    window.addEventListener("eja:control-opened", (event) => {
        if (event.detail.owner !== "mates") setHudOpen(false);
    });

    document.addEventListener("click", (event) => {
        if (
            hudContainer.hidden ||
            hudContainer.contains(event.target) ||
            openMatesBtn.contains(event.target)
        )
            return;
        setHudOpen(false);
    });

    openMatesBtn.addEventListener("click", () => {
        setHudOpen(hudContainer.hidden);
    });

    closeMatesBtn.addEventListener("click", () => {
        setHudOpen(false);
        openMatesBtn.focus();
    });

    toggleHudBtn.addEventListener("click", () => {
        hudMinimized = !hudMinimized;
        hudContent.hidden = hudMinimized;
        toggleHudBtn.textContent = hudMinimized ? "[+]" : "[-]";
        toggleHudBtn.setAttribute(
            "aria-label",
            hudMinimized ? "Expand controls" : "Minimize controls",
        );
    });

    function resizeCanvas() {
        worldWidth = window.innerWidth;
        worldHeight = window.innerHeight;
        canvas.width = Math.round(worldWidth * renderScale);
        canvas.height = Math.round(worldHeight * renderScale);
        ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        ctx.imageSmoothingEnabled = false;

        for (const l of ledges) {
            l.x = Math.max(20, Math.min(worldWidth - l.w - 20, l.x));
            l.y = Math.max(80, Math.min(worldHeight - 100, l.y));
        }
    }

    mobileViewport.addEventListener("change", () => {
        const previousLedges = ledges;
        initLedges();
        for (const character of characters) {
            if (
                previousLedges.includes(character.currentLedge) ||
                previousLedges.includes(character.hangSurface)
            ) {
                character.currentLedge = null;
                character.hangSurface = null;
                character.setState(STATE.FALL);
            }
        }
        updateHudStatus();
    });

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("resize", () => {
        updateTextHangSurfaces();
        for (const ch of characters) {
            ch.x = Math.min(ch.x, Math.max(0, worldWidth - ENTITY_SIZE));
            ch.y = Math.min(ch.y, Math.max(0, worldHeight - ENTITY_SIZE));
        }
    });

    let lastLoopTime = 0;
    let lastFpsTime = performance.now();
    let frameCount = 0;
    let hudRefreshCounter = 0;

    function animateLoop(now) {
        if (document.hidden) return;
        const elapsed = lastLoopTime
            ? Math.min((now - lastLoopTime) / 1000, 0.1)
            : 1 / 60;
        lastLoopTime = now;
        const motionScale = elapsed * 60;

        frameCount++;
        if (now - lastFpsTime >= 1000) {
            document.getElementById("fpsCounter").textContent =
                `${frameCount} FPS`;
            frameCount = 0;
            lastFpsTime = now;
        }

        ctx.clearRect(0, 0, worldWidth, worldHeight);
        drawLedges(ctx);

        for (const ch of characters) {
            ch.update(motionScale);
            ch.draw(ctx);
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.update(motionScale);
            p.draw(ctx);
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }

        if (!hudContainer.hidden) {
            hudRefreshCounter++;
            if (hudRefreshCounter % 20 === 0) {
                updateHudStatus();
            }
        }
    }

    resizeCanvas();
    initLedges();
    updateTextHangSurfaces();
    initCharacters();
    EJALoop.register(animateLoop, "pixel-mates");
})();
