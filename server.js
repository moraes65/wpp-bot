// server.js
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import sendMessageJob from './controllers/MessageController.js';
import client from './services/WhatsAppService.js';

const PORT = process.env.PORT || 3009;

app.listen(PORT, () => {
	console.log(`🌐 Servidor rodando na porta ${PORT}`);
});

client.on('ready', async () => {
	console.log('💬 WhatsApp Client is ready');

	console.log('🚀 Executando job inicial...');
	const start = Date.now();
	await sendMessageJob(client);
	const duration = Date.now() - start;
	console.log(`✅ Job inicial concluído em ${duration}ms`);

	let isRunning = false;
	setInterval(async () => {
		if (isRunning) {
			console.log('⏳ Job ainda em execução, aguardando a próxima rodada.');
			return;
		}
		try {
			isRunning = true;
			console.log('🔄 Verificando novas mensagens para envio...');
			const start = Date.now();

			await sendMessageJob(client);

			const duration = Date.now() - start;
			console.log(`✅ Job concluído em ${duration}ms`);
		} catch (err) {
			console.error('❌ Erro ao executar o job:', err);
		} finally {
			isRunning = false;
		}
	}, 5 * 60 * 1000);
});
