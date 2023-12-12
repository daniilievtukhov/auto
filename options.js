const sameLetters = [
    "..AA",
    "..BB",
    "..EE",
    "..II",
    "..KK",
    "..MM",
    "..HH",
    "..OO",
    "..PP",
    "..CC",
    "..TT",
    "..XX",
];
// const regions = [
//     "АР Крим",
//     "Вінницька",
//     "Волинська",
//     "Дніпропетровська",
//     "Донецька",
//     "Житомирська",
//     "Закарпатська",
//     "Запорізька",
//     "Івано-Франківська",
//     "м. Київ",
//     "Київська",
//     "Кіровоградська",
//     "Луганська",
//     "Львівська",
//     "Миколаївська",
//     "Одеська",
//     "Полтавська",
//     "Рівненська",
//     "Сумська",
//     "Тернопільська",
//     "Харківська",
//     "Херсонська",
//     "Хмельницька",
//     "Черкаська",
//     "Чернівецька",
//     "Чернігівська",
// ];

// const buttonsRegionArray = regions.map((city) => ({
//     text: city,
//     callback_data: city,
// }));

const numberOptionsArray = sameLetters.map((letter) => ({
    text: letter,
    callback_data: letter,
}));

export const numberOptions = {
    reply_markup: JSON.stringify({
        inline_keyboard: [
            [
                { text: "0001", callback_data: "0001" },
                { text: "0010", callback_data: "0010" },
                { text: "0100", callback_data: "0100" },
            ],
            [{ text: "....00..", callback_data: "....00.." }],
            [...numberOptionsArray],
            [{ text: "Однакові букви", callback_data: "Однакові букви" }],
            [
                {
                    text: "Дзеркальні букви",
                    callback_data: "Дзеркальні букви",
                },
            ],
        ],
    }),
};
export const againOptions = {
    reply_markup: JSON.stringify({
        inline_keyboard: [[{ text: "Шукати знову", callback_data: "/again" }]],
    }),
};
