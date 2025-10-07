// controllers/ConfirmationController.js
import database from '../database/connection.js';

/**
 * Busca agendas do dia seguinte e envia mensagens de confirmação
 */
export default async function sendConfirmationJob() {
	console.log('🚀 [CONFIRMAÇÃO] Iniciando envio de confirmações...');

	try {
		// Calcula as datas: hoje e amanhã
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(0, 0, 0, 0);

		const endOfTomorrow = new Date(tomorrow);
		endOfTomorrow.setHours(23, 59, 59, 999);

		console.log(
			`📅 [CONFIRMAÇÃO] Buscando agendas para: ${tomorrow.toLocaleDateString(
				'pt-BR'
			)}`
		);

		// Busca agendas do dia seguinte que ainda não foram confirmadas
		const agendas = await database.connection.query(
			`SELECT 
				CODAGENDA, CODMED, CODPAC, CODCONV, CODPROCEDI,
				DATAAGENDA, HORAAGENDA, HORARIO, OBSERVACAO, SITUACAO, 
				CELULARPAC, ATIVIDADE, NOMEPAC, PROCEDIMENTO, CONVENIO, 
				NOMEMED, RQE, STATUSCONFIRMA
			FROM View_AgendaMedico
			WHERE
        (DATEDIFF(day, DATAAGENDA, :dtAg) = 0)
        AND (SITUACAO = 'Marcada' OR SITUACAO = 'Agendada')
				AND CELULARPAC IS NOT NULL
        AND CODPAC <> 1
				AND (STATUSCONFIRMA IS NULL OR STATUSCONFIRMA = '')
			ORDER BY DATAAGENDA, HORARIO`,
			{
				replacements: {
					dtAg: tomorrow.toISOString().split('T')[0],
				},
				type: database.connection.QueryTypes.SELECT,
			}
		);

		if (agendas.length === 0) {
			console.log(
				'📭 [CONFIRMAÇÃO] Nenhuma agenda encontrada para confirmação'
			);
			return;
		}

		console.log(`📋 [CONFIRMAÇÃO] ${agendas.length} agenda(s) encontrada(s)`);

		let sucessos = 0;
		let erros = 0;

		for (const agenda of agendas) {
			try {
				let celular = agenda.CELULARPAC
					? agenda.CELULARPAC.replace(/\D/g, '')
					: '';

				// Valida se o número tem 10 ou 11 dígitos
				if (!celular || celular.length < 10) {
					console.warn(
						`⚠️ [CONFIRMAÇÃO] Número inválido para ${agenda.NOMEPAC}: ${agenda.CELULARPAC}`
					);
					erros++;
					continue;
				}

				// 🔹 Regra: se tiver 12 dígitos e começar com 0 → remove o 0 inicial
				if (celular.length === 12 && celular.startsWith('0')) {
					celular = celular.slice(1);
				}

				// 🔹 Adiciona DDI 55 se ainda não tiver
				if (!celular.startsWith('55')) {
					celular = `55${celular}`;
				}

				// 🔹 Validação final — 55 + 10 ou 11 dígitos (ex: fixo ou celular com 9)
				const isValidPhone = /^55\d{10,11}$/.test(celular);

				if (!isValidPhone) {
					console.warn(`⚠️ [CONFIRMAÇÃO] Número inválido: ${celular}`);
					erros++;
					continue;
				} else {
					console.log(`✅ Número válido: ${celular}`);
				}

				// Formata data e hora
				const dataAgenda = new Date(agenda.DATAAGENDA);
				const dataFormatada = dataAgenda.toLocaleDateString('pt-BR');
				const horaFormatada = agenda.HORARIO || agenda.HORAAGENDA;

				// Monta a mensagem de confirmação
				const mensagem = `[❤️ ICM Marília ❤️]
Olá, ${agenda.NOMEPAC}! 👋
📌 *Protocolo:* ICM-${agenda.CODAGENDA}
👨‍⚕️ *Médico:* ${agenda.NOMEMED}
🏥 *Convênio:* ${agenda.CONVENIO}
📝 *Procedimento:* ${agenda.PROCEDIMENTO}
📅 *Data:* ${dataFormatada} às ⏰ ${horaFormatada}.
📍 *Local:* Instituto do Coração de Marília - ICM.
📍 *Endereço:* Av. Vicente Ferreira 780 – ao lado do P.S. da Santa Casa.
⚠️ *Chegar com 15 minutos de antecedência.*
🔗 *Mais informações:* www.icm.com.br

Por favor, confirme sua presença respondendo:
✅ *SIM* - para confirmar
❌ *NÃO* - para cancelar

Aguardamos sua confirmação! 😊`;
				// Envia a mensagem
				// await client.sendMessage(recipient, mensagem);

				console.log(
					`📤 [CONFIRMAÇÃO] Enviando mensagem na fila para: ${agenda.NOMEPAC} - (${celular})`
				);

				// Insere na fila de envio
				await database.connection
					.query(
						`INSERT INTO SMS_SEND (recipient, text, 
							  originator,  status, type, origem,
							  idRequest, idPaciente, nomePaciente, message)
						   VALUES (:recipient, :text, :originator, :status, :type, :origem,
							  :idRequest, :idPaciente, :nomePaciente, :message)`,
						{
							replacements: {
								recipient: celular,
								text: mensagem,
								status: 'N',
								type: 'A',
								origem: 'ICM',
								originator: 'AgendaICM',
								idRequest: agenda.CODAGENDA,
								idPaciente: agenda.CODPAC,
								nomePaciente: agenda.NOMEPAC,
								message: JSON.stringify(agenda),
							},
							type: database.connection.QueryTypes.INSERT,
						}
					)
					.then(() => {
						sucessos++;
					})
					.catch((error) => {
						console.error(`❌ [CONFIRMAÇÃO] Erro ao inserir SMS_SEND:`, error);
						erros++;
					});

				// Delay entre mensagens para evitar bloqueio
				const delayMin = parseInt(process.env.DELAY_MIN_MS) || 5000;
				let delayMax = parseInt(process.env.DELAY_MAX_MS) || 10000;
				if (delayMax < delayMin) delayMax = delayMin + 1000;

				const delay =
					Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
				await new Promise((res) => setTimeout(res, delay));
			} catch (err) {
				console.error(
					`❌ [CONFIRMAÇÃO] Erro ao processar agenda ${agenda.CODAGENDA}:`,
					err.message
				);
				erros++;
			}
		}

		console.log(
			`✅ [CONFIRMAÇÃO] Resumo: ${sucessos} enviadas, ${erros} erro(s)`
		);
	} catch (err) {
		console.error('❌ [CONFIRMAÇÃO] Erro ao executar job de confirmação:', err);
		throw err;
	}
}
