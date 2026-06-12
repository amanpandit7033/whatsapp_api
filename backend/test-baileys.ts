import makeWASocket, { useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';

async function connect() {
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/test-session`);
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: Browsers.macOS('Desktop'),
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('QR emitted');
        }
        if (connection === 'close') {
            console.error('Connection closed:', lastDisconnect);
        } else if (connection === 'open') {
            console.log('Connection open');
        }
    });
}

connect().catch(console.error);
