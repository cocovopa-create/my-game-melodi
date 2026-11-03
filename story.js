/*
 * ИСТОРИЯ ИГРЫ. Тексты диалогов и порядок сцен живут здесь, код игры трогать не нужно.
 *
 * scenes: кто говорит и в какой позе Мелоди на каждой реплике.
 *   'm' Мелоди, 'b' босс текущего уровня (lvl), 'n' рассказчик (без спрайтов).
 *   Второе число у реплики: поза Мелоди.
 *     -1 обычная (idel), 0 с микрофоном (posa_1), 1 радуется (posa_2),
 *      2 злится (posa_3), 3 испугана (posa_4), 4 привидение (posa_5)
 *   bg: фон сцены. Игра ищет assets/bg_<имя>.png, а если файла нет, берёт bg_menu.png.
 *   theme: цветовой оттенок: 0, 1, 2 (по уровням) или 'menu'.
 *
 * text: сами реплики по языкам. Количество реплик обязано совпадать со scenes.
 * names: имена в табличке над текстом.
 *
 * Озвучка: файл assets/voice/<язык>/<сцена>_<номер реплики из двух цифр>.mp3,
 *   например assets/voice/ru/l1_pre_02.mp3. Весь список файлов в voice-script.csv.
 */
(function (root) {

const STORY = {

    version: 3,

    scenes: {
        prologue: { lvl: 0, theme: 'menu', bg: 'gate', lines: [['n', -1], ['m', -1], ['n', -1]] },

        l1_pre:  { lvl: 0, theme: 0, bg: 'corridor', lines: [['b', -1], ['m', 2], ['b', -1], ['m', 0]] },
        l1_post: { lvl: 0, theme: 0, bg: 'corridor', lines: [['b', -1], ['m', 1], ['n', -1]] },

        l2_pre:  { lvl: 1, theme: 1, bg: 'yard', lines: [['n', -1], ['b', -1], ['m', 2], ['b', -1], ['m', 0]] },
        l2_post: { lvl: 1, theme: 1, bg: 'yard', lines: [['b', -1], ['m', 3], ['b', -1], ['n', -1]] },

        l3_pre:  { lvl: 2, theme: 2, bg: 'stage', lines: [['n', -1], ['b', -1], ['m', -1], ['b', -1], ['m', 0]] },
        l3_post: { lvl: 2, theme: 2, bg: 'stage', lines: [['b', -1], ['m', 1], ['n', -1]] }
    },

    names: {
        ru: { m: 'МЕЛОДИ', boss: ['МАКАРОН', 'ПОЗЁР', 'СНЕЖНЫЙ БАРС'] },
        cz: { m: 'MELODY', boss: ['MAKARON', 'POZÉR', 'SNĚŽNÝ LEVHART'] }
    },

    text: {
        ru: {
            prologue: [
                'Первое сентября. Мелоди приезжает в новую музыкальную школу — «Академию Сакура».',
                'Ого… Здесь даже воздух звучит. Только бы не потеряться в первый же день.',
                'Но потеряться не вышло: в коридоре её уже ждали.'
            ],
            l1_pre: [
                'О, новенькая! Слышал, ты пишешь треки? Здесь это никого не впечатляет.',
                'Я просто хочу учиться. А ты вообще кто?',
                'Макарон. Здесь всё решает баттл. Проиграешь — будешь носить мой рюкзак до выпуска.',
                'Договорились. Но когда я выиграю, ты извинишься перед всей школой!'
            ],
            l1_post: [
                'Невозможно… Ладно, ладно, рюкзак я донесу сам.',
                'Вот и договорились! Кто следующий?',
                'Слух о баттле облетел академию быстрее, чем звонок на перемену.'
            ],
            l2_pre: [
                'На следующий день во дворе, под цветущей сакурой, Мелоди остановил ещё один ученик, из параллельного класса.',
                'Так это ты победила Макарона? Повезло, не более.',
                'Повезло? Выходи на ритм, и проверим.',
                'Во дворе все смотрят на меня. Не опозорься, новенькая.',
                'Это я-то новенькая? Держи темп!'
            ],
            l2_post: [
                'Ты… слишком хороша. Но самый главный соперник ещё впереди.',
                'Какой ещё соперник?',
                'Тот, кто выступает только в шапке. Его зовут Снежный Барс.',
                'За закрытым занавесом актового зала кто-то уже мурлыкал в микрофон.'
            ],
            l3_pre: [
                'Вечер. Сцена. Занавес медленно ползёт в стороны.',
                'Мурр. Добро пожаловать. Я — Снежный Барс. И да, шапку я не сниму.',
                'Ты правда барс? А в шапке тебе не жарко?',
                'Холодно мне бывает только от плохого ритма. Покажи, на что способна.',
                'Зал уже качает. Играем!'
            ],
            l3_post: [
                'Мурр… Давно меня никто не заставлял потеть. Шапка вот-вот слетит.',
                'Спасибо за баттл!',
                'Так началась история Мелоди в «Академии Сакура». А впереди было ещё много песен.'
            ]
        },
        cz: {
            prologue: [
                'První září. Melody přijíždí do nové hudební školy, do „Akademie Sakura“.',
                'Páni… Tady i vzduch zní. Jen ať se hned první den neztratím.',
                'Ztratit se jí ale nepodařilo: na chodbě už na ni někdo čekal.'
            ],
            l1_pre: [
                'Ó, nováčku! Slyšel jsem, že skládáš skladby? Tady to nikoho nezajímá.',
                'Já se chci jen učit. A ty jsi vlastně kdo?',
                'Makaron. Tady o všem rozhoduje souboj. Prohraješ a budeš mi nosit batoh až do konce školy.',
                'Platí. Ale až vyhraju, omluvíš se před celou školou!'
            ],
            l1_post: [
                'To není možné… Dobře, dobře, batoh si ponesu sám.',
                'Tak vidíš! Kdo je další?',
                'Zpráva o souboji obletěla akademii rychleji než zvonění na přestávku.'
            ],
            l2_pre: [
                'Následujícího dne na nádvoří pod rozkvetlou sakurou zastavil Melody další žák, z paralelní třídy.',
                'Takže ty jsi porazila Makarona? Štěstí, nic víc.',
                'Štěstí? Pojď do rytmu a uvidíme.',
                'Na nádvoří se všichni dívají na mě. Neztrapni se, nováčku.',
                'Já a nováček? Drž tempo!'
            ],
            l2_post: [
                'Ty jsi… moc dobrá. Ale ten nejhlavnější soupeř tě teprve čeká.',
                'Jaký soupeř?',
                'Ten, kdo vystupuje jen v čepici. Jmenuje se Sněžný levhart.',
                'Za zavřenou oponou školního sálu už někdo do mikrofonu předl.'
            ],
            l3_pre: [
                'Večer. Jeviště. Opona se pomalu rozjíždí.',
                'Mrrr. Vítej. Jsem Sněžný levhart. A ano, čepici nesundám.',
                'Ty jsi opravdu levhart? A v čepici ti není horko?',
                'Zima je mi jen ze špatného rytmu. Ukaž, co v tobě je.',
                'Sál už se kývá. Hrajeme!'
            ],
            l3_post: [
                'Mrrr… Dlouho mě nikdo nenechal se zapotit. Čepice mi snad spadne.',
                'Díky za souboj!',
                'Tak začal příběh Melody v „Akademii Sakura“. A před ní bylo ještě mnoho písní.'
            ]
        }
    }
};

if (typeof module !== 'undefined' && module.exports) module.exports = STORY;
else root.STORY = STORY;

})(typeof window !== 'undefined' ? window : globalThis);