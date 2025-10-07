// services/WhatsAppService.js
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import database from '../database/connection.js';
import { detectIntent } from './middlewares/intentDetector.js';

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

		const body = msg.body
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // remove acentos
			.replace(/[^\w\s]/g, '') // remove pontuação
			.trim();

		const cleanNumber = msg.from.replace(/\D/g, '');

		const intencao = await detectIntent(msg.body);
		console.log(`💡 Intenção detectada: ${intencao} (mensagem: "${msg.body}")`);

		if (intencao === 'confirmacao') {
			// Verifica se é uma resposta para agendamento
			const agendamento = await verificarAgendamentoPendente(cleanNumber);

			if (agendamento) {
				// É uma confirmação de agendamento
				await msg.reply(
					`✅ Perfeito, ${agendamento.NOMEPAC}!\n\n` +
						`Sua consulta está confirmada:\n` +
						`📅 ${new Date(agendamento.DATAAGENDA).toLocaleDateString(
							'pt-BR'
						)}\n` +
						`⏰ ${agendamento.HORARIO}\n` +
						`👨‍⚕️ ${agendamento.NOMEMED}\n\n` +
						`Aguardamos você! ❤️ ICM Marília`
				);

				// Atualiza o status na tabela de agendas
				await database.connection.query(
					`UPDATE ARQ_AGENDAS 
					 SET STATUSCONFIRMA = 'Confirmada' 
					 WHERE CODAGENDA = :codAgenda`,
					{
						replacements: { codAgenda: agendamento.CODAGENDA },
						type: database.connection.QueryTypes.UPDATE,
					}
				);

				console.log(
					`✅ Agendamento ${agendamento.CODAGENDA} confirmado por ${cleanNumber}`
				);
			} else {
				// É uma confirmação de engajamento (SMS_SEND)
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
				} catch (err) {
					console.error('❌ Erro ao atualizar confirmação:', err);
				}
			}
		} else if (intencao === 'recusa') {
			// Verifica se é um cancelamento de agendamento
			const agendamento = await verificarAgendamentoPendente(cleanNumber);

			if (agendamento) {
				await msg.reply(
					`Entendido! 😊\n\n` +
						`Sua consulta foi desmarcada:\n` +
						`📅 ${new Date(agendamento.DATAAGENDA).toLocaleDateString(
							'pt-BR'
						)}\n` +
						`⏰ ${agendamento.HORARIO}\n\n` +
						`Para reagendar, entre em contato:\n` +
						`https://api.whatsapp.com/send?phone=5514998974587&text=Solicito%20reagendar%20atendimento%20-ICM`
				);

				// Atualiza o status como recusado
				await database.connection.query(
					`UPDATE ARQ_AGENDAS 
					 SET STATUSCONFIRMA = 'Recusada' 
					 WHERE CODAGENDA = :codAgenda`,
					{
						replacements: { codAgenda: agendamento.CODAGENDA },
						type: database.connection.QueryTypes.UPDATE,
					}
				);

				console.log(
					`❌ Agendamento ${agendamento.CODAGENDA} recusado por ${cleanNumber}`
				);
			} else {
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
			}
		} else if (intencao === 'interesse') {
			await msg.reply(
				'Claro! Estamos aqui para tirar todas as suas dúvidas. 😊\nSe desejar atendimento, clique aqui: https://api.whatsapp.com/send?phone=5514998974587&text=Atendimento%20ICM'
			);
		} /* else {
			await msg.reply(
				'Agradecemos seu contato!\nSe desejar atendimento, clique aqui: https://api.whatsapp.com/send?phone=5514998974587&text=Atendimento%20ICM'
			);
		} */
	});

	client.on('disconnected', (reason) => {
		console.warn('⚠️ WhatsApp Client disconnected. Reason:', reason);
		console.log('🔄 Tentando reconectar em 5 segundos...');
		setTimeout(() => {
			initializeClient();
		}, 5000);
	});

	client.initialize();
}

/**
 * Verifica se existe um agendamento pendente de confirmação para o número
 */
/* async function verificarAgendamentoPendente(cleanNumber) {
	try {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(0, 0, 0, 0);

		const endOfTomorrow = new Date(tomorrow);
		endOfTomorrow.setHours(23, 59, 59, 999);

		const [agendamento] = await database.connection.query(
			`SELECT TOP 1 
				CODAGENDA, CODMED, CODPAC, DATAAGENDA, HORAAGENDA, 
				HORARIO, NOMEPAC, NOMEMED, CELULARPAC, STATUSCONFIRMA
			FROM View_AgendaMedico
			WHERE CELULARPAC LIKE :celular
				AND DATAAGENDA >= :startOfDay 
				AND DATAAGENDA < :endOfDay
				AND STATUSCONFIRMA = 'Pendente'
			ORDER BY DATAAGENDA, HORARIO`,
			{
				replacements: {
					celular: `%${cleanNumber}%`,
					startOfDay: tomorrow,
					endOfDay: endOfTomorrow,
				},
				type: database.connection.QueryTypes.SELECT,
			}
		);

		return agendamento || null;
	} catch (error) {
		console.error('❌ Erro ao verificar agendamento pendente:', error);
		return null;
	}
} */

initializeClient();

export default client;
