import fs from "fs";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function translateText(text) {
    if (!text.trim()) return text;

    const response = await client.responses.create({
        model: "gpt-4.1-mini", // más barato y suficiente
        temperature: 0,
        input: `Traduce al español sin agregar nada:\n\n${text}`
    });

    return response.output[0].content[0].text.trim();
}

async function translateHTML(inputFile, outputFile) {
    const html = fs.readFileSync(inputFile, "utf-8");
    const $ = cheerio.load(html, { decodeEntities: false });

    const textNodes = [];

    function extractTextNodes(node) {
        node.contents().each((_, el) => {
            if (el.type === "text") {
                const text = el.data;
                if (text.trim()) {
                    textNodes.push(el);
                }
            } else {
                extractTextNodes($(el));
            }
        });
    }

    extractTextNodes($.root());

    for (const node of textNodes) {
        const original = node.data;
        const translated = await translateText(original);
        node.data = translated;
    }

    fs.writeFileSync(outputFile, $.html());
    console.log(`✅ Traducción perfecta sin romper HTML`);
}

const args = process.argv.slice(2);

if (args.length < 2) {
    console.error("Uso: node translate.js input.html output.html");
    process.exit(1);
}

translateHTML(args[0], args[1]);