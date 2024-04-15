// @ts-nocheck

import { crypto, walletVersion } from '../../constants/decryptWallet';
import { doInitWorkers, kdf } from '../../deps/kdf';
import PhraseWallet from './phrase-wallet';
import * as WORDLISTS from './wordlists';

export function generateRandomSentence(template = 'adverb verb noun adjective noun adverb verb noun adjective noun adjective verbed adjective noun', maxWordLength = 0, capitalize = true) {
    const partsOfSpeechMap = {
        'noun': 'nouns',
        'adverb': 'adverbs',
        'adv': 'adverbs',
        'verb': 'verbs',
        'interjection': 'interjections',
        'adjective': 'adjectives',
        'adj': 'adjectives',
        'verbed': 'verbed'
    };

    let _wordlists = WORDLISTS;

    function _RNG(entropy) {
        if (entropy > 1074) {
            throw new Error('Javascript can not handle that much entropy!');
        }
        let randNum = 0;
        const crypto = window.crypto || window.msCrypto;

        if (crypto) {
            const entropy256 = Math.ceil(entropy / 8);
            let buffer = new Uint8Array(entropy256);
            crypto.getRandomValues(buffer);
            randNum = buffer.reduce((num, value) => num * 256 + value, 0) / Math.pow(256, entropy256);
        } else {
            console.warn('Secure RNG not found. Using Math.random');
            randNum = Math.random();
        }
        return randNum;
    }

    function _capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function getWord(partOfSpeech) {
        let words = _wordlists[partsOfSpeechMap[partOfSpeech]];
        if (maxWordLength) {
            words = words.filter(word => word.length <= maxWordLength);
        }
        const requiredEntropy = Math.log(words.length) / Math.log(2);
        const index = Math.floor(_RNG(requiredEntropy) * words.length);
        return words[index];
    }

    function parse(template) {
        return template.split(/\s+/).map(token => {
            const match = token.match(/^(\w+)(.*)$/);
            if (!match) return token; // No match, return original token

            const [ , partOfSpeech, rest ] = match;
            if (partsOfSpeechMap[partOfSpeech]) {
                let word = getWord(partOfSpeech);
                if (capitalize && token === token[0].toUpperCase() + token.slice(1).toLowerCase()) {
                    word = _capitalize(word);
                }
                return word + rest;
            }

            return token;
        }).join(' ');
    }

    return parse(template);
}

export const createAccount = async()=> {
    const generatedSeedPhrase = generateRandomSentence()
    const threads = doInitWorkers(crypto.kdfThreads)

    const seed = await kdf(generatedSeedPhrase, void 0, threads)
    const wallet = new PhraseWallet(seed, walletVersion)
    return wallet
       
  }

  export const  saveFileToDisk= async(data, qortAddress) => {
    try {
    const dataString = JSON.stringify(data)
        const blob = new Blob([dataString], { type: 'text/plain;charset=utf-8' })
        const fileName = "qortal_backup_" + qortAddress + ".json"
        const fileHandle = await self.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
                    description: "File",
            }]
        })
        const writeFile = async (fileHandle, contents) => {
            const writable = await fileHandle.createWritable()
            await writable.write(contents)
            await writable.close()
        }
        writeFile(fileHandle, blob).then(() => console.log("FILE SAVED"))

    } catch (error) {
        console.log({error})
        if (error.name === 'AbortError') {
            return
        }
        FileSaver.saveAs(blob, fileName)
    }
}