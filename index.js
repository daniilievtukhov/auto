process.env.NTBA_FIX_319 = 1;

import axios from "axios";
import TelegramApi from "node-telegram-bot-api";
import cheerio from "cheerio";
import { numberOptions, againOptions, sameLetters } from "./options.js";
import { tscList } from "./tsc.js";
import * as fs from "fs";

const token = "6347029504:AAGpNCYGUNaWfT5KM-kaLh5cVx7rylVZ3s0";

const bot = new TelegramApi(token, { polling: true });

const url = "http://opendata.hsc.gov.ua/check-leisure-license-plates/";

const licensePlateRegex = /^[A-Z]{2}\d{4}[A-Z]{2}$/g;

let allNumbers = new Set();

const users = JSON.parse(fs.readFileSync("users.json", "utf8"));

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
    const numbers = [];
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
            // const $ = cheerio.load(data);
            // const tdElements = $("td");
            // tdElements.each((index, element) => {
            //     const licensePlate = $(element).text().trim();
            //     if (licensePlateRegex.test(licensePlate)) {
            //         numbers.push(licensePlate);
            //     }
            // });

            const regExpNumbers = data.match(licensePlateRegex);
            if (regExpNumbers !== null) {
                numbers.concat(regExpNumbers);
            }
        }
    }
    return numbers;
}

async function startSearch(chatId) {
    await bot.sendMessage(chatId, "Оберіть одну з бажаних комбінацій:");
    await bot.sendMessage(chatId, ":)", numberOptions);
}

function getOneAtThe(numbers, num) {
    const filteredNumbers = [];
    numbers.forEach((number) => {
        const slicedNumber = number.slice(2, 6);
        if (slicedNumber === num) {
            filteredNumbers.push(number);
        }
    });

    return filteredNumbers;
}

function getZeroEnd(numbers) {
    const filteredNumbers = numbers.filter((number) => {
        const filteredNumber = number.slice(2, 6);

        return filteredNumber.endsWith("00");
    });

    return filteredNumbers;
}

function getSameLetters(numbers, letters) {
    const filteredNumbers = [];
    numbers.forEach((number) => {
        const slicedNumber = number.slice(6, 8);

        if (slicedNumber.toUpperCase() === letters.slice(2).toUpperCase()) {
            filteredNumbers.push(number);
        }
    });

    return filteredNumbers;
}

function getAllSameLetters(numbers) {
    const filteredNumbers = [];
    numbers.forEach((number) => {
        const firstTwoLetters = number.slice(0, 2);
        const lastTwoLetters = number.slice(6, 8);
        if (firstTwoLetters === lastTwoLetters) {
            filteredNumbers.push(number);
        }
    });

    return filteredNumbers;
}
function getAllMirrorLetters(numbers) {
    const filteredNumbers = [];
    numbers.forEach((number) => {
        const firstTwoLetters = number.slice(0, 2);
        const lastTwoLetters = number.slice(6, 8);
        if (firstTwoLetters === lastTwoLetters.split("").reverse().join("")) {
            filteredNumbers.push(number);
        }
    });

    return filteredNumbers;
}

function findMatches(numbers) {
    const result = {};

    result["....00.."] = getZeroEnd(numbers);
    result["0001"] = getOneAtThe(numbers, "0001");
    result["0010"] = getOneAtThe(numbers, "0010");
    result["0100"] = getOneAtThe(numbers, "0100");
    for (const sameLetter of sameLetters) {
        result[sameLetter] = getSameLetters(numbers, sameLetter);
    }
    result["same letters"] = getAllSameLetters(numbers);
    result["mirrored letters"] = getAllMirrorLetters(numbers);
    console.log(result);
    return result;
}

function fixMessageLength(chatId, text) {
    const result = [""];
    const lines = text.split("\n");
    let indexResult = 0,
        indexLines = 0;
    while (indexLines < lines.length) {
        if (result[indexResult].length + lines[indexLines].length > 4095) {
            indexResult++;
            result[indexResult] = "";
        }
        result[indexResult] += lines[indexLines] + "\n";
        indexLines++;
    }

    return result;
}

async function findNewNumbers() {
    try {
        // get all numbers
        const csrfToken = await fetchData();
        const currentNumbers = await postData(csrfToken);

        // find new numbers
        const newNumbers = [];
        for (const number of currentNumbers) {
            if (!allNumbers.has(number)) {
                newNumbers.push(number);
                allNumbers.add(number);
            }
        }

        allNumbers = new Set(currentNumbers);

        const results = findMatches(newNumbers);
        let message = "";
        for (const key in results) {
            if (results[key].length > 0) {
                message += key + ":\n";
                message += results[key].join(", ");
                message += "\n\n";
            }
        }
        if (message.length > 0) {
            const messages = fixMessageLength(message);
            for (const user of users) {
                for (const message of messages) {
                    await safeSendMessage(user, message);
                }
            }
        }
    } catch (e) {
        console.log(e);
    }
}

async function safeSendMessage(chatId, message) {
    try {
        await bot.sendMessage(chatId, message);
    } catch (error) {
        if ("AggreageError" in error.message) {
            await bot.sendMessage(chatId, message);
        }
        if (
            error?.response?.body?.error_code === 403 &&
            error?.response?.body?.description ===
                "Forbidden: bot was blocked by the user"
        ) {
            const index = users.indexOf(user);
            if (index > -1) {
                users.splice(index, 1);
            }
        } else {
            console.log(error);
        }
    }
}

async function start() {
    try {
        console.log("loading");
        const csrfToken = await fetchData();
        const numbers = await postData(csrfToken);
        allNumbers.add(...numbers);

        console.log("started");
        // Вызываем функцию fetchData раз в 12 часов
        setInterval(findNewNumbers, 5 * 60 * 1000);

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

                if (users.includes(chatId)) {
                    await bot.sendMessage(
                        chatId,
                        `Ви вже підписані на оновлення`
                    );
                } else {
                    await bot.sendMessage(
                        chatId,
                        `Ви підписалися на оновлення`
                    );
                    users.push(chatId);
                    fs.writeFileSync("users.json", JSON.stringify(users));
                }

                // return bot.sendMessage(
                //     chatId,
                //     "Оберіть свій регіон",
                //     chooseRegionOptions
                // );
            } else if (text === "/search") {
                // return startSearch(chatId);
            } else {
                await bot.sendMessage(chatId, "Вибачте, не зрозумів Вас:(");
            }
        });

        // bot.on("callback_query", async (msg) => {
        //     const data = msg.data;
        //     const chatId = msg.message.chat.id;
        //     if (data === "/again") {
        //         return startSearch(chatId);
        //     }
        //
        //     if (data === "....00..") {
        //         return await zeroEnd(chatId);
        //     }
        //     if (data === "0001") {
        //         return await oneAtThe(chatId, "0001");
        //     }
        //     if (data === "0010") {
        //         return await oneAtThe(chatId, "0010");
        //     }
        //     if (data === "0100") {
        //         return await oneAtThe(chatId, "0100");
        //     }
        //     for (let i = 0; i < sameLetters.length; i++) {
        //         if (data === sameLetters[i]) {
        //             return await getSameLetters(chatId, sameLetters[i]);
        //         }
        //     }
        //     if (data === "Однакові букви") {
        //         return await getAllSameLetters(chatId);
        //     }
        //     if (data === "Дзеркальні букви") {
        //         return await getAllMirrorLetters(chatId);
        //     }
        // });
    } catch (error) {
        console.error("Bot initialization error:", error);
    }
}

start();
