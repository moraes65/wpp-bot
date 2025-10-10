import database from '../database/connection.js';

/* const mensagensEngajamento = [
	'ICM Marília - Olá! Gostaria de receber lembretes dos seus agendamentos pelo WhatsApp?\nResponda *SIM* para ativar com segurança.',
	'Oi! Podemos te lembrar dos seus agendamentos e horários pelo WhatsApp?\nResponda *SIM* para ativar. - ICM Marília',
	'ICM Marília - E aí! Quer receber notificações de agendamentos e horários de atendimento?\nResponda *SIM* para ativar.',
	'Olá! Deseja receber avisos sobre suas consultas agendadas diretamente no WhatsApp?\nResponda *SIM* para ativar. - ICM Marília',
	'Quer ser lembrado do seu agendamento com antecedência pelo WhatsApp?\nÉ só confirmar aqui!\nResponda *SIM*. - ICM Marília',
	'ICM Marília - Oi! Podemos te avisar sobre novos horários disponíveis para consultas?\nResponda *SIM* para ativar.',
	'Gostaria de receber lembretes dos seus agendamentos médicos pelo WhatsApp?\nResponda *SIM* para ativar! - ICM Marília',
	'ICM Marília - Quer receber notificações quando seu agendamento estiver confirmado?\nResponda *SIM* para ativar.',
	'Oi! Você prefere receber lembretes dos seus horários agendados por aqui?\nSó responder *SIM*! - ICM Marília',
	'ICM Marília - Quer evitar esquecimentos? Receba lembretes dos seus agendamentos via WhatsApp.\nResponda *SIM* para ativar.',
	'Olá! Podemos te lembrar dos seus compromissos com o ICM pelo WhatsApp?\nResponda *SIM* para ativar. - ICM Marília',
	'ICM Marília - Oi! Para continuar recebendo lembretes de agendamento, responda:\n*SIM* para ativar.',
	'Quer receber lembretes automáticos das suas consultas agendadas?\nDigite *SIM* para ativar. - ICM Marília',
	'ICM Marília - Podemos te avisar sempre que houver um novo agendamento confirmado?\nDigite *SIM* para ativar.',
]; */

const mensagemConfirmacao = `*Por favor, confirme sua presença. Digite:*

1️⃣ para *Confirmar*  
2️⃣ para *Cancelar*  
3️⃣ para *Reagendar*  

Aguardamos sua confirmação!`;

export default async function sendMessageJob(client) {
	console.log('🚀 Iniciando envio de mensagens...');

	try {
		const messages = await database.connection.query(
			`SELECT * FROM dbo.SMS_SEND WHERE STATUS = 'N'`,
			{ type: database.connection.QueryTypes.SELECT }
		);

		if (messages.length === 0) {
			console.log('📭 Nenhuma mensagem encontrada!');
			return;
		}

		for (const msg of messages) {
			console.log(`📥 Enviando mensagem: ${msg.text}`);
			const raw = msg.recipient ? msg.recipient.replace(/\D/g, '') : '';

			// Adiciona DDI 55 se não tiver
			const fullNumber = raw.length === 11 ? `55${raw}` : raw;

			const isValidPhone = fullNumber && /^55\d{10,11}$/.test(fullNumber);

			if (!isValidPhone) {
				console.warn(
					`⚠️ Número inválido ou ausente ignorado: ${msg.recipient}`
				);
				continue;
			}

			const numberId = await client.getNumberId(fullNumber);
			if (!numberId) {
				console.warn(`⚠️ Número não encontrado no WhatsApp: ${msg.recipient}`);
				continue;
			}

			const recipient = numberId._serialized;

			try {
				(async () => {
					await client.sendMessage(recipient, msg.text);
					await new Promise((r) => setTimeout(r, 2000));
					await client.sendMessage(recipient, mensagemConfirmacao);
				})();

				const delayMin = parseInt(process.env.DELAY_MIN_MS) || 15000;
				let delayMax = parseInt(process.env.DELAY_MAX_MS) || 40000;
				if (delayMax < delayMin) delayMax = delayMin + 5000;

				const delay =
					Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
				await new Promise((res) => setTimeout(res, delay));

				console.log(`📤 Enviado para: ${msg.recipient} (delay: ${delay}ms)`);

				await database.connection.query(
					`UPDATE SMS_SEND SET status = 'S' WHERE id = :id`,
					{
						replacements: { id: msg.id },
						type: database.connection.QueryTypes.UPDATE,
					}
				);
				// Atualiza o status de confirmação na tabela
				await database.connection.query(
					`UPDATE ARQ_AGENDA 
					 SET STATUSCONFIRMA = 'Pendente' 
					 WHERE CODAGENDA = :codAgenda`,
					{
						replacements: { codAgenda: msg.idRequest },
						type: database.connection.QueryTypes.UPDATE,
					}
				);
			} catch (err) {
				if (err.message?.includes('serialize')) {
					console.warn(
						`⚠️ Erro não crítico ao serializar mensagem para ${msg.recipient}:`,
						err.message
					);
				} else {
					console.error(`❌ Erro ao enviar para ${msg.recipient}:`, err);
				}
			}
		}

		console.log('✅ Todas as mensagens foram enviadas com sucesso!');
	} catch (err) {
		console.error('❌ Erro ao enviar mensagens:', err);
	}
}
