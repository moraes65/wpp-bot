import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import database from '../database/connection.js';

let client;

function initializeClient() {
	client = new Client({
		authStrategy: new LocalAuth(),
		puppeteer: { headless: true },
	});

	client.on('qr', (qr) => {
		qrcode.generate(qr, { small: true });
	});

	client.on('authenticated', () => {
		console.log('✅ AUTHENTICATED');
	});

	client.on('auth_failure', () => {
		console.error('❌ Authentication failed');
	});

	client.on('ready', () => {
		console.log('💬 WhatsApp Client is ready');
	});

	client.on('message', async (msg) => {
		if (!msg.body?.trim()) return;

		const body = msg.body.trim().toLowerCase();
		const cleanNumber = msg.from.replace(/\D/g, '');

		const confirmacoes = [
			'sim',
			'sim.',
			'ok',
			'ok.',
			'claro',
			'com certeza',
			'positivo',
			'confirmado',
			'confirmo',
		];
		const recusas = [
			'não',
			'nao',
			'não quero',
			'nao quero',
			'pare',
			'cancelar',
			'sair',
			'não desejo',
			'nao desejo',
		];
		const interesse = [
			'talvez',
			'quem sabe',
			'me explica',
			'explica melhor',
			'qual o objetivo?',
			'o que é isso?',
		];

		if (confirmacoes.includes(body)) {
			await msg.reply(
				'Obrigado por confirmar!\nSe desejar mais informações, clique aqui: https://api.whatsapp.com/send?phone=5514998974587&text=Atendimento%20ICM'
			);

			// Persiste confirmação no banco
			try {
				await database.connection.query(
					`UPDATE dbo.SMS_SEND 
			 SET confirmed_at = GETDATE(), 
			     status = 'C', 
			     message_received = :msg
			 WHERE id = (
			       SELECT TOP 1 id 
			       FROM dbo.SMS_SEND 
			       WHERE recipient LIKE :recipient AND status = 'S'
			       ORDER BY id DESC
			);`,
					{
						replacements: {
							recipient: `%${cleanNumber}%`,
							msg: JSON.stringify(msg),
						},
						type: database.connection.QueryTypes.UPDATE,
					}
				);
				console.log(`✔️ Confirmado em DB para ${cleanNumber}`);
			} catch (err) {
				console.error('❌ Erro ao atualizar confirmação:', err);
			}
		} else if (recusas.includes(body)) {
			await msg.reply(
				'Tudo bem! Se desejar atendimento da recepção, clique aqui: https://api.whatsapp.com/send?phone=5514998974587&text=Atendimento%20ICM.\nSe mudar de ideia, é só responder *SIM*.'
			);

			// Registra como recusado
			try {
				await database.connection.query(
					`UPDATE dbo.SMS_SEND 
				SET confirmed_at = GETDATE(), 
						status = 'R', 
						message_received = :msg
				WHERE id = (
						SELECT TOP 1 id 
						FROM dbo.SMS_SEND 
						WHERE recipient LIKE :recipient AND status = 'S'
						ORDER BY id DESC
				);`,
					{
						replacements: {
							recipient: '%' + cleanNumber + '%',
							msg: JSON.stringify(msg),
						},
						type: database.connection.QueryTypes.UPDATE,
					}
				);
				console.log(`⚠️ Recusa registrada no DB para ${cleanNumber}`);
			} catch (err) {
				console.error('❌ Erro ao registrar recusa:', err);
			}
		} else if (interesse.includes(body)) {
			await msg.reply(
				'Claro! Estamos aqui para tirar todas as suas dúvidas. 😊\nSe desejar atendimento, clique aqui: https://api.whatsapp.com/send?phone=5514998974587&text=Atendimento%20ICM'
			);
		} else {
			await msg.reply(
				'Agradecemos seu contato!\nSe desejar atendimento, clique aqui: https://api.whatsapp.com/send?phone=5514998974587&text=Atendimento%20ICM'
			);
		}
	});

	client.on('disconnected', async (reason) => {
		console.warn('⚠️ WhatsApp Client disconnected. Reason:', reason);
		console.log('🔁 Tentando reconectar em 5 segundos...');
		setTimeout(() => {
			initializeClient();
			client.initialize();
		}, 5000);
	});
}

initializeClient();

export default client;
