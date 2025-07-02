import database from '../database/connection.js';

const mensagensEngajamento = [
	'❤️ ICM Marília ❤️ - 👋 Olá! Gostaria de receber lembretes dos seus agendamentos pelo WhatsApp?\n🔒 Responda *SIM* para ativar com segurança.',
	'📅 Oi! Podemos te lembrar dos seus agendamentos e horários pelo WhatsApp?\n📲 Responda *SIM* para ativar. - ❤️ ICM Marília ❤️',
	'❤️ ICM Marília ❤️ - ⏰ E aí! Quer receber notificações de agendamentos e horários de atendimento?\n✉️ Responda *SIM* para ativar.',
	'🏥 Olá! Deseja receber avisos sobre suas consultas agendadas diretamente no WhatsApp?\n🤝 Responda *SIM* para ativar. - ❤️ ICM Marília ❤️',
	'⚡ Quer ser lembrado do seu agendamento com antecedência pelo WhatsApp?\n🛡️ É só confirmar aqui!\n✅ Responda *SIM*. - ❤️ ICM Marília ❤️',
	'❤️ ICM Marília ❤️ - 📢 Oi! Podemos te avisar sobre novos horários disponíveis para consultas?\n📆 Responda *SIM* para ativar.',
	'📌 Gostaria de receber lembretes dos seus agendamentos médicos pelo WhatsApp?\n💡 Responda *SIM* para ativar! - ❤️ ICM Marília ❤️',
	'❤️ ICM Marília ❤️ - 📲 Quer receber notificações quando seu agendamento estiver confirmado?\n📥 Responda *SIM* para ativar.',
	'💬 Oi! Você prefere receber lembretes dos seus horários agendados por aqui?\n📞 Só responder *SIM*! - ❤️ ICM Marília ❤️',
	'❤️ ICM Marília ❤️ - ⏳ Quer evitar esquecimentos? Receba lembretes dos seus agendamentos via WhatsApp.\n✅ Responda *SIM* para ativar.',
	'🔔 Olá! Podemos te lembrar dos seus compromissos com o ICM pelo WhatsApp?\n📱 Responda *SIM* para ativar. - ❤️ ICM Marília ❤️',
	'❤️ ICM Marília ❤️ - 👩‍⚕️ Oi! Para continuar recebendo lembretes de agendamento, responda:\n🆗 *SIM* para ativar.',
	'🤖 Quer receber lembretes automáticos das suas consultas agendadas?\n📨 Digite *SIM* para ativar. - ❤️ ICM Marília ❤️',
	'❤️ ICM Marília ❤️ - 🔍 Podemos te avisar sempre que houver um novo agendamento confirmado?\n📧 Digite *SIM* para ativar.',
];

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


			// const recipient = `${fullNumber}@c.us`;
			const recipient = numberId._serialized;

			const engajamento =
				mensagensEngajamento[
					Math.floor(Math.random() * mensagensEngajamento.length)
				];

			try {
				await client.sendMessage(recipient, engajamento);

				await client.sendMessage(recipient, msg.text);

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
