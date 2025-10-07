const confirmacoes = [
	'sim',
	'ok',
	'claro',
	'com certeza',
	'positivo',
	'confirmado',
	'confirmo',
	'pode ser',
	'pode sim',
	'isso',
	'beleza',
	'blz',
	'ta bom',
	'tudo bem',
	'perfeito',
	'show',
	'marque',
	'pode marcar',
	'de acordo',
	'ok obrigado',
	'pode continuar',
	'tá certo',
	// emojis comuns de confirmação
	'👍',
	'👌',
	'✌️',
	'👋',
	'🙌',
	'🤝',
	'✅',
	'🆗',
];

const recusas = [
	'não',
	'nao',
	'não quero',
	'nao quero',
	'cancelar',
	'sair',
	'pare',
	'não desejo',
	'nao desejo',
	'agora não',
	'não posso',
	'não precisa',
	'não marque',
	'desmarca',
	'cancele',
	'chega',
	'deixa pra depois',
	'sem interesse',
	'não, obrigado',
	// emojis de recusa
	'👎',
	'🚫',
	'❌',
];

const interesse = [
	'talvez',
	'quem sabe',
	'me explica',
	'explica melhor',
	'qual o objetivo',
	'o que é isso',
	'me fale mais',
	'como funciona',
	'quero saber mais',
	'me diga mais',
	'pode me explicar',
	'como assim',
	'me explica melhor',
	'qual o valor',
	'quanto custa',
	'tem custo',
	'é pago',
	'tem horário',
	'quando seria',
	'precisa marcar',
	'quais horários',
	'quero entender melhor',
	// emojis de dúvida
	'🤔',
	'❓',
	'❔',
];

/**
 * Detecta a intenção da mensagem do paciente.
 * @param {string} message - Texto da mensagem recebida.
 * @returns {'confirmacao'|'recusa'|'interesse'|'indefinido'}
 */
export function detectIntent(msg) {
	// tenta extrair o texto principal (body) ou reação (reaction)
	const raw = msg?.body || msg?.reaction || '';
	const message = raw
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // remove acentos
		.replace(/[^\w\s]/g, '') // remove pontuação
		.trim();

	const includesAny = (list) => list.some((p) => message.includes(p));

	if (includesAny(confirmacoes)) return 'confirmacao';
	if (includesAny(recusas)) return 'recusa';
	if (includesAny(interesse)) return 'interesse';
	return 'indefinido';
}
