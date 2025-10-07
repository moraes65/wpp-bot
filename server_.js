// server.js
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import sendMessageJob from './controllers/MessageController.js';
// import client from './services/WhatsAppService.js';
import schedulerService from './services/SchedulerService.js';

const PORT = process.env.PORT || 3009;

// Inicia o scheduler de confirmações (08:00h diariamente)
schedulerService.startConfirmationScheduler();
schedulerService.listJobs();

app.listen(PORT, () => {
	console.log(`🌐 Servidor rodando na porta ${PORT}`);
});

/* client.on('ready', async () => {
	console.log('💬 WhatsApp Client is ready');

	// Inicia o scheduler de confirmações (08:00h diariamente)
	schedulerService.startConfirmationScheduler();
	schedulerService.listJobs();

	// Job inicial de envio de mensagens pendentes
	console.log('🚀 Executando job inicial de mensagens pendentes...');
	const start = Date.now();
	await sendMessageJob(client);
	const duration = Date.now() - start;
	console.log(`✅ Job inicial concluído em ${duration}ms`);

	// Job recorrente de envio de mensagens pendentes (a cada 5 minutos)
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
	}, 5 * 60 * 1000); // 5 minutos
}); */

// Tratamento de encerramento gracioso
process.on('SIGINT', () => {
	console.log('\n🛑 Encerrando aplicação...');
	schedulerService.stopAll();
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log('\n🛑 Encerrando aplicação...');
	schedulerService.stopAll();
	process.exit(0);
});
