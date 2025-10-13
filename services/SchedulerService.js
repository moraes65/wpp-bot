// services/SchedulerService.js
import cron from 'node-cron';
import sendConfirmationJob from '../controllers/ConfirmationController.js';

class SchedulerService {
	constructor() {
		console.log('🛠️ [SCHEDULER] Inicializando SchedulerService...');
		this.jobs = [];
	}

	/**
	 * Inicia o agendamento de confirmações diárias às 08:00h
	 */
	startConfirmationScheduler() {
		console.log(
			'⏰ [SCHEDULER] Iniciando agendamento de confirmações diárias às 19:00h...'
		);
		// Executa todos os dias às 08:00h (horário de Brasília)
		// Formato: segundo minuto hora dia mês dia-da-semana
		const confirmationJob = cron.schedule(
			'00 06 * * *', // 08:00 todos os dias
			async () => {
				console.log('⏰ [SCHEDULER] Executando job de confirmação às 08:00h');
				try {
					await sendConfirmationJob(); // client
					console.log(
						'✅ [SCHEDULER] Job de confirmação concluído com sucesso'
					);
				} catch (error) {
					console.error(
						'❌ [SCHEDULER] Erro ao executar job de confirmação:',
						error
					);
				}
			},
			{
				scheduled: true,
				timezone: 'America/Sao_Paulo', // Fuso horário de Brasília
			}
		);

		this.jobs.push({
			name: 'Confirmação de Agendamentos',
			job: confirmationJob,
			schedule: '19:00 diariamente',
		});

		console.log(
			'📅 [SCHEDULER] Job de confirmação agendado para 19:00h diariamente'
		);
	}

	/**
	 * Para todos os jobs agendados
	 */
	stopAll() {
		console.log('🛑 [SCHEDULER] Parando todos os jobs agendados...');
		this.jobs.forEach((jobInfo) => {
			jobInfo.job.stop();
			console.log(`⏹️ [SCHEDULER] Job "${jobInfo.name}" parado`);
		});
	}

	/**
	 * Lista todos os jobs ativos
	 */
	listJobs() {
		console.log('\n📋 [SCHEDULER] Jobs agendados:');
		this.jobs.forEach((jobInfo, index) => {
			console.log(`  ${index + 1}. ${jobInfo.name} - ${jobInfo.schedule}`);
		});
		console.log('');
	}
}

const schedulerService = new SchedulerService();
export default schedulerService;
