import axios from "axios";
import TelegramApi from "node-telegram-bot-api";
import cheerio from "cheerio";
import fs from "fs";
import { appendFile } from "fs/promises";
import { numberOptions, againOptions, sameLetters } from "./options.js";
import { tscList } from "./tsc.js";

const token = "6347029504:AAGpNCYGUNaWfT5KM-kaLh5cVx7rylVZ3s0";

const bot = new TelegramApi(token, { polling: true });

const url = "http://opendata.hsc.gov.ua/check-leisure-license-plates/";

const licensePlateNumbers = [];

const licensePlateRegex = /^[A-Z]{2}\d{4}[A-Z]{2}$/;

async function fetchData() {
    try {
        const response = await axios.get(url);
        if (response.status !== 200) {
            throw new Error(`Failed to fetch HTML. Status: ${response.status}`);
        }

        const html = response.data;
        const $ = cheerio.load(html);
        const csrfToken = $(
            'input[type="hidden"][name="csrfmiddlewaretoken"]'
        ).val();

        if (!csrfToken) {
            throw new Error("CSRF token not found in HTML");
        }

        return csrfToken;
    } catch (error) {
        console.error("Error fetching HTML:", error);
        throw error;
    }
}

async function postData(csrfToken) {
    licensePlateNumbers.length = 0; // clear array
    // Проходимо по всіх об'єктах у масиві tscList
    for (const tscItem of tscList) {
        const params = new URLSearchParams();
        params.append("region", "15");
        params.append("tsc", tscItem.tscNumber);
        params.append("type_venichle", "light_car_and_truck");
        params.append("number", "");
        params.append("csrfmiddlewaretoken", csrfToken);

        const res = await fetch(url, {
            method: "POST",
            body: params.toString(),
            headers: {
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        const data = await res.text();

        if (data) {
            // await appendFile("index.html", data);
            // const html = fs.readFileSync("index.html", "utf-8");
            const $ = cheerio.load(data);
            const tdElements = $("td");
            tdElements.each((index, element) => {
                const licensePlate = $(element).text().trim();
                if (licensePlateRegex.test(licensePlate)) {
                    licensePlateNumbers.push(licensePlate);
                }
            });
        }
    }
}

async function startSearch(chatId) {
    await bot.sendMessage(chatId, "Оберіть одну з бажаних комбінацій:");
    await bot.sendMessage(chatId, ":)", numberOptions);
}

async function oneAtThe(chatId, num) {
    const filteredNumbers = [];
    licensePlateNumbers.forEach((number) => {
        const slicedNumber = number.slice(2, 6);
        if (slicedNumber === num) {
            filteredNumbers.push(number);
        }
    });

    if (filteredNumbers.length > 0) {
        const chunkSize = 400; // Кількість номерів у кожній частині
        for (let i = 0; i < filteredNumbers.length; i += chunkSize) {
            const chunk = filteredNumbers.slice(i, i + chunkSize);
            const message = `ОСЬ ЯКІ НОМЕРИ Я ЗНАЙШОВ ПО ДАНІЙ ОБЛАСТІ:\n${chunk.join(
                "\n"
            )}`;

            // Відправка частини повідомлення
            await bot.sendMessage(chatId, message, againOptions);
        }
    } else {
        await bot.sendMessage(
            chatId,
            `На жаль, номери не знайдені за цим критерієм. Спробуйте інший варіант.`,
            againOptions
        );
    }
}

async function zeroEnd(chatId) {
    const filteredNumbers = licensePlateNumbers.filter((number) => {
        const filteredNumber = number.slice(2, 6);

        return filteredNumber.endsWith("00");
    });
    if (filteredNumbers.length > 0) {
        const chunkSize = 400; // Кількість номерів у кожній частині
        for (let i = 0; i < filteredNumbers.length; i += chunkSize) {
            const chunk = filteredNumbers.slice(i, i + chunkSize);
            const message = `ОСЬ ЯКІ НОМЕРИ Я ЗНАЙШОВ ПО ДАНІЙ ОБЛАСТІ:\n${chunk.join(
                "\n"
            )}`;

            // Відправка частини повідомлення
            await bot.sendMessage(chatId, message, againOptions);
        }
    } else {
        await bot.sendMessage(
            chatId,
            `На жаль, номери не знайдені за цим критерієм. Спробуйте інший варіант.`,
            againOptions
        );
    }
}

async function getSameLetters(chatId, letters) {
    const filteredNumbers = [];
    licensePlateNumbers.forEach((number) => {
        const slicedNumber = number.slice(6, 8);

        if (slicedNumber.toUpperCase() === letters.slice(2).toUpperCase()) {
            filteredNumbers.push(number);
        }
    });

    if (filteredNumbers.length > 0) {
        // Поділимо повідомлення на менші частини
        const chunkSize = 400; // Кількість номерів у кожній частині
        for (let i = 0; i < filteredNumbers.length; i += chunkSize) {
            const chunk = filteredNumbers.slice(i, i + chunkSize);
            const message = `ОСЬ ЯКІ НОМЕРИ Я ЗНАЙШОВ ПО ДАНІЙ ОБЛАСТІ:\n${chunk.join(
                "\n"
            )}`;

            // Відправка частини повідомлення
            await bot.sendMessage(chatId, message, againOptions);
        }
    } else {
        await bot.sendMessage(
            chatId,
            `На жаль, номери не знайдені за цим критерієм. Спробуйте інший варіант.`,
            againOptions
        );
    }
}

async function getAllSameLetters(chatId) {
    const filteredNumbers = [];
    licensePlateNumbers.forEach((number) => {
        const firstTwoLetters = number.slice(0, 2);
        const lastTwoLetters = number.slice(6, 8);
        if (firstTwoLetters === lastTwoLetters) {
            filteredNumbers.push(number);
        }
    });

    if (filteredNumbers.length > 0) {
        const chunkSize = 400; // Кількість номерів у кожній частині
        for (let i = 0; i < filteredNumbers.length; i += chunkSize) {
            const chunk = filteredNumbers.slice(i, i + chunkSize);
            const message = `ОСЬ ЯКІ НОМЕРИ Я ЗНАЙШОВ ПО ДАНІЙ ОБЛАСТІ:\n${chunk.join(
                "\n"
            )}`;

            // Відправка частини повідомлення
            await bot.sendMessage(chatId, message, againOptions);
        }
    } else {
        await bot.sendMessage(
            chatId,
            `На жаль, номери не знайдені за цим критерієм. Спробуйте інший варіант.`,
            againOptions
        );
    }
}
async function getAllMirrorLetters(chatId) {
    const filteredNumbers = [];
    licensePlateNumbers.forEach((number) => {
        const firstTwoLetters = number.slice(0, 2);
        const lastTwoLetters = number.slice(6, 8);
        if (firstTwoLetters === lastTwoLetters.split("").reverse().join("")) {
            filteredNumbers.push(number);
        }
    });

    if (filteredNumbers.length > 0) {
        const chunkSize = 400; // Кількість номерів у кожній частині
        for (let i = 0; i < filteredNumbers.length; i += chunkSize) {
            const chunk = filteredNumbers.slice(i, i + chunkSize);
            const message = `ОСЬ ЯКІ НОМЕРИ Я ЗНАЙШОВ ПО ДАНІЙ ОБЛАСТІ:\n${chunk.join(
                "\n"
            )}`;

            // Відправка частини повідомлення
            await bot.sendMessage(chatId, message, againOptions);
        }
    } else {
        await bot.sendMessage(
            chatId,
            `На жаль, номери не знайдені за цим критерієм. Спробуйте інший варіант.`,
            againOptions
        );
    }
}
async function start() {
    try {
        console.log('loading')
        const csrfToken = await fetchData();

        await postData(csrfToken);
        console.log('started')
        // Вызываем функцию fetchData раз в 12 часов
        setInterval(async () => {
            const csrfToken = await fetchData();
            await postData(csrfToken);
        }, 7200000);

        bot.setMyCommands([
            { command: "/start", description: "Почати пошук номеру" },
            { command: "/search", description: "Search!" },
        ]);

        bot.on("message", async (msg) => {
            const text = msg.text;
            const chatId = msg.chat.id;

            if (text === "/start") {
                await bot.sendSticker(
                    chatId,
                    "https://upload.wikimedia.org/wikipedia/commons/5/5a/Car_icon_alone.png"
                );
                await bot.sendMessage(chatId, `Welcome to bot!`);
                // return bot.sendMessage(
                //     chatId,
                //     "Оберіть свій регіон",
                //     chooseRegionOptions
                // );
            }
            if (text === "/search") {
                return startSearch(chatId);
            }
            return bot.sendMessage(chatId, "Вибачте, не зрозумів Вас:(");
        });

        bot.on("callback_query", async (msg) => {
            const data = msg.data;
            const chatId = msg.message.chat.id;
            if (data === "/again") {
                return startSearch(chatId);
            }

            if (data === "....00..") {
                return await zeroEnd(chatId);
            }
            if (data === "0001") {
                return await oneAtThe(chatId, "0001");
            }
            if (data === "0010") {
                return await oneAtThe(chatId, "0010");
            }
            if (data === "0100") {
                return await oneAtThe(chatId, "0100");
            }
            for (let i = 0; i < sameLetters.length; i++) {
                if (data === sameLetters[i]) {
                    return await getSameLetters(chatId, sameLetters[i]);
                }
            }
            if (data === "Однакові букви") {
                return await getAllSameLetters(chatId);
            }
            if (data === "Дзеркальні букви") {
                return await getAllMirrorLetters(chatId);
            }
        });
    } catch (error) {
        console.error("Bot initialization error:", error);
    }
}

start();
