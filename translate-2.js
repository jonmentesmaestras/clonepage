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

export async function translateHTML(inputFile, outputFile) {
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

    const BATCH_SIZE = 10;
    for (let i = 0; i < textNodes.length; i += BATCH_SIZE) {
        const batch = textNodes.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (node) => {
            const original = node.data;
            const translated = await translateText(original);
            node.data = translated;
        }));
    }

    fs.writeFileSync(outputFile, $.html());
    console.log(`✅ Traducción perfecta sin romper HTML`);
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Uso: node translate-2.js input.html output.html");
        process.exit(1);
    }
    translateHTML(args[0], args[1]);
}