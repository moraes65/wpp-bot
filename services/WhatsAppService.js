// services/WhatsAppService.js
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import database from '../database/connection.js';

let client;
console.log('🔄 Inicializando WhatsApp Client...');

function initializeClient() {
	/* 	client = new Client({
		authStrategy: new LocalAuth(),
		puppeteer: { headless: true },
	}); */

	client = new Client({
		authStrategy: new LocalAuth({
			dataPath: './.wwebjs_auth',
		}),
		puppeteer: {
			headless: true,
			// args: ['--no-sandbox', '--disable-setuid-sandbox'],
			// executablePath: '/usr/bin/google-chrome', // caminho customizado, se necessário
			// userDataDir: './.chrome_data', // se quiser um perfil customizado
			// defaultViewport: null, // para usar o tamanho da janela do sistema
			// ignoreDefaultArgs: ['--disable-extensions'], // se precisar de algo específico
			// slowMo: 20, // diminui a velocidade para visualização (útil para debug)
			// devtools: true, // abre o devtools junto com o navegador
			// args: ['--window-size=1920,1080'], // define o tamanho da janela
			// executablePath: puppeteer.executablePath(), // caminho do executável do puppeteer
		},
	});

	client.on('loading_screen', (percent, message) => {
		console.log(`⏳ Carregando ${percent}% - ${message}`);
	});

	client.on('qr', (qr) => {
		qrcode.generate(qr, { small: true });
	});

	client.on('authenticated', () => {
		console.log('✅ AUTHENTICATED..');
	});

	client.on('auth_failure', () => {
		console.error('❌ Authentication failed');
	});

	client.on('ready', () => {
		console.log('💬 WhatsApp Client is ready');
	});

	client.on('message', async (msg) => {
		if (!msg.body?.trim()) return;

		const cleanNumber = msg.from.replace(/\D/g, '');
		const body = msg.body.trim().toLowerCase();

		/* 		const intencao = await detectIntent(msg);
		console.log(
			`🤖 [INTENÇÃO] Detectada: ${intencao} para a mensagem: "${msg.body}"`
		); */

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
			'1',
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
			'2',
		];
		const reagendar = [
			'reagendar',
			'reagenda',
			'quero reagendar',
			'3',
			'remarcar',
			'remarca',
			'quero remarcar',
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
				// Atualiza o status de confirmação na tabela
				await database.connection
					.query(
						`SELECT TOP 1 *  FROM dbo.SMS_SEND
  						WHERE recipient = :recipient AND status IN ('S', 'C')
  						ORDER BY id DESC `,
						{
							replacements: {
								recipient: cleanNumber,
								msg: JSON.stringify(msg),
							},
							type: database.connection.QueryTypes.UPDATE,
						}
					)
					.then(async ([msg]) => {
						if (msg && msg[0]?.idRequest) {
							await database.connection.query(
								`UPDATE ARQ_AGENDA 
							 SET STATUSCONFIRMA = 'Confirmada' 
							 WHERE CODAGENDA = :codAgenda`,
								{
									replacements: { codAgenda: msg[0]?.idRequest },
									type: database.connection.QueryTypes.UPDATE,
								}
							);
							console.log(`✔️ Confirmado na AGENDA para ${cleanNumber}`);
						}
					});
			} catch (err) {
				console.error('❌ Erro ao atualizar confirmação:', err);
			}
		} else if (recusas.includes(body)) {
			await msg.reply(
				'Tudo bem! Se desejar atendimento da recepção, clique aqui: https://api.whatsapp.com/send?phone=5514998974587&text=Atendimento%20ICM.\nSe mudar de ideia, é só responder *SIM*.'
			);

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
							recipient: `%${cleanNumber}%`,
							msg: JSON.stringify(msg),
						},
						type: database.connection.QueryTypes.UPDATE,
					}
				);
				console.log(`⚠️ Recusa registrada no DB para ${cleanNumber}`);
			} catch (err) {
				console.error('❌ Erro ao registrar recusa:', err);
			}
		} else if (reagendar.includes(body)) {
			await msg.reply(
				'Sem problemas! Se quiser reagendar seu horário ou falar com a recepção, clique aqui: https://api.whatsapp.com/send?phone=5514998974587&text=Solicito%20atendimento%20para%20reagendar-%20ICM\n\nSe mudar de ideia, é só responder *SIM*. 😊'
			);

			try {
				await database.connection.query(
					`UPDATE dbo.SMS_SEND 
						SET confirmed_at = GETDATE(), 
								status = 'A', 
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
				console.log(`⚠️ Recusa registrada no DB para ${cleanNumber}`);
			} catch (err) {
				console.error('❌ Erro ao registrar recusa:', err);
			}
		} else if (interesse.includes(body)) {
			await msg.reply(
				'Claro! Estamos aqui para tirar todas as suas dúvidas. 😊\nSe desejar atendimento, clique aqui: https://api.whatsapp.com/send?phone=5514998974587&text=Atendimento%20ICM'
			);

			try {
				await database.connection.query(
					`UPDATE dbo.SMS_SEND 
						SET confirmed_at = GETDATE(), 
								status = 'I', 
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
				console.log(`⚠️ Interesse registrado no DB para ${cleanNumber}`);
			} catch (err) {
				console.error('❌ Erro ao registrar interesse:', err);
			}
		} else {
			try {
				await database.connection.query(
					`UPDATE dbo.SMS_SEND 
						SET confirmed_at = GETDATE(), 
								status = 'U', 
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
				console.log(`⚠️ Interesse registrado no DB para ${cleanNumber}`);
			} catch (err) {
				console.error('❌ Erro ao registrar interesse:', err);
			}
		}
	});

	client.on('disconnected', (reason) => {
		console.warn('⚠️ WhatsApp Client disconnected. Reason:', reason);
		console.log('🔁 Tentando reconectar em 5 segundos...');
		setTimeout(() => {
			initializeClient(); // já reinicializa aqui
		}, 5000);
	});

	client.initialize().catch(console.error); // 🚀 inicialização centralizada aqui
}

initializeClient();

export default client;
