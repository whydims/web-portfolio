cat << 'EOF' > index.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesi_bot');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('Scan QR Code ini untuk menghubungkan bot:');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Koneksi terputus. Mencoba menghubungkan ulang...');
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Berhasil! Bot WhatsApp Anda sudah aktif dan terhubung.');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const pesanMasuk = m.message.conversation || m.message.extendedTextMessage?.text || '';
        const textLower = pesanMasuk.toLowerCase().trim();
        const nomorPengirim = m.key.remoteJid;

        console.log(`Pesan masuk dari ${nomorPengirim}: ${pesanMasuk}`);

        // 1. Perintah !menu
        if (textLower === '!menu') {
            const menuText = `🤖 *DAFTAR PERINTAH BOT* 🤖\n\n` +
                             `• *!halo* - Menyapa bot\n` +
                             `• *!ping* - Cek kecepatan respons bot\n` +
                             `• *!gombal* - Dapet gombalan lucu\n` +
                             `• *!quotes* - Kata-kata motivasi harian\n\n` +
                             `💬 *Fitur Ngobrol:* Kamu juga bisa ajak bot ngobrol santai seperti tanya nama, kegiatan, atau bilang terima kasih!`;
            await sock.sendMessage(nomorPengirim, { text: menuText }, { quoted: m });
        }

        // 2. Perintah !halo
        else if (textLower === '!halo') {
            await sock.sendMessage(nomorPengirim, { text: 'Halo juga! Ada yang bisa saya bantu? Ketik *!menu* untuk melihat daftar perintah.' }, { quoted: m });
        }

        // 3. Perintah !ping
        else if (textLower === '!ping') {
            await sock.sendMessage(nomorPengirim, { text: 'Pong! 🚀 Bot aktif dan merespons dengan sangat cepat.' }, { quoted: m });
        }

        // 4. Perintah !gombal
        else if (textLower === '!gombal') {
            const gombalanList = [
                'Kamu itu kayak Google ya, semua yang aku cari ada di kamu. 🤭',
                'Eh, kamu tahu gak bedanya kamu sama kalender? Kalender itu setahun sekali, kalau kamu cantiknya seumur hidup! 😆',
                'Masa sih bumi itu bulat? Padahal kalau lagi dekat kamu, rasanya dunia milik berdua. ✨'
            ];
            const randomGombal = gombalanList[Math.floor(Math.random() * gombalanList.length)];
            await sock.sendMessage(nomorPengirim, { text: randomGombal }, { quoted: m });
        }

        // 5. Perintah !quotes
        else if (textLower === '!quotes' || textLower === '!quote') {
            const quotesList = [
                '"Jangan pernah menyerah pada hal yang membuatmu tersenyum setiap hari."',
                '"Kesuksesan besar dimulai dari langkah-langkah kecil yang konsisten."',
                '"Tetap semangat menjalani hari, jadikan setiap tantangan sebagai batu loncatan!"'
            ];
            const randomQuote = quotesList[Math.floor(Math.random() * quotesList.length)];
            await sock.sendMessage(nomorPengirim, { text: randomQuote }, { quoted: m });
        }

        // 6. Fitur Ngobrol Santai / Percakapan Interaktif
        else if (textLower.includes('siapa kamu') || textLower.includes('nama kamu')) {
            await sock.sendMessage(nomorPengirim, { text: 'Saya adalah asisten bot WhatsApp pribadi buatanmu sendiri! Senang berkenalan. 😊' }, { quoted: m });
        }
        else if (textLower.includes('lagi apa') || textLower.includes('sibuk apa')) {
            await sock.sendMessage(nomorPengirim, { text: 'Lagi stand by aja nih, siap nungguin kamu kirim pesan atau perintah baru! 🤖' }, { quoted: m });
        }
        else if (textLower.includes('terima kasih') || textLower.includes('makasih')) {
            await sock.sendMessage(nomorPengirim, { text: 'Sama-sama! Senang bisa membantu. 👍' }, { quoted: m });
        }
    });
}

startBot();
EOF
