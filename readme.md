# 📅 Sistema de Confirmação de Agendamentos - WhatsApp Bot

## 🎯 Objetivo

Enviar automaticamente mensagens de confirmação para pacientes **no dia anterior às 08:00h**, solicitando confirmação de presença nas consultas agendadas.

---

## 📦 Instalação

### 1. Instalar Dependência

```bash
npm install node-cron
```

### 2. Estrutura de Arquivos

Adicione os seguintes arquivos ao projeto:

```
whatsapp-bot/
├── services/
│   ├── WhatsAppService.js (atualizado)
│   └── SchedulerService.js (novo)
├── controllers/
│   ├── MessageController.js (existente)
│   └── ConfirmationController.js (novo)
├── server.js (atualizado)
└── testConfirmation.js (opcional - para testes)
```

---

## 🚀 Como Funciona

### 1. **Agendamento Automático**
- Todo dia às **08:00h** o sistema roda automaticamente
- Busca na `View_AgendaMedico` as agendas do **dia seguinte**
- Filtra apenas agendas:
  - Com `SITUACAO = 'A'` (ativa)
  - Com `CELULARPAC` preenchido
  - Com `STATUSCONFIRMA` vazio ou NULL

### 2. **Envio de Mensagens**
- Para cada agenda encontrada, envia uma mensagem personalizada
- Atualiza `STATUSCONFIRMA = 'P'` (Pendente) na tabela `ARQ_AGENDAS`
- Respeita delays configurados no `.env` entre mensagens

### 3. **Respostas dos Pacientes**
O sistema detecta automaticamente quando o paciente responde:

#### ✅ Confirmação (SIM, OK, CONFIRMO, etc.)
- Atualiza `STATUSCONFIRMA = 'C'` (Confirmado)
- Envia mensagem de confirmação

#### ❌ Cancelamento (NÃO, CANCELAR, etc.)
- Atualiza `STATUSCONFIRMA = 'R'` (Recusado)
- Envia informações para reagendamento

---

## 📋 Status de Confirmação

A coluna `STATUSCONFIRMA` na tabela `ARQ_AGENDAS` terá os seguintes valores:

| Status | Significado |
|--------|-------------|
| `NULL` ou vazio | Ainda não enviado |
| `P` | Pendente (mensagem enviada, aguardando resposta) |
| `C` | Confirmado pelo paciente |
| `R` | Recusado/Cancelado pelo paciente |

---

## 🔧 Configuração

### Variáveis de Ambiente (.env)

```env
# Delays entre mensagens (em milissegundos)
DELAY_MIN_MS=15000  # 15 segundos
DELAY_MAX_MS=40000  # 40 segundos

# Configurações do banco de dados (já existentes)
MSSQL_HOST=seu_host
MSSQL_USER=seu_usuario
MSSQL_PASS=sua_senha
MSSQL_NAME=seu_banco
```

---

## ⚙️ Requisitos da Tabela ARQ_AGENDAS

Certifique-se de que a tabela tenha a coluna:

```sql
ALTER TABLE ARQ_AGENDAS
ADD STATUSCONFIRMA VARCHAR(1) NULL;
```

Se a coluna já existir, não há problema!

---

## 🧪 Testando o Sistema

### Teste Manual (sem esperar até às 08:00h)

Execute o script de teste:

```bash
node testConfirmation.js
```

Isso executará imediatamente o envio de confirmações para as agendas do dia seguinte.

### Teste de Agendamento

Para verificar se o job está agendado corretamente, inicie o servidor:

```bash
npm start
```

Você verá no console:

```
📅 [SCHEDULER] Job de confirmação agendado para 08:00h diariamente
📋 [SCHEDULER] Jobs agendados:
  1. Confirmação de Agendamentos - 08:00 diariamente
```

---

## 📊 Logs e Monitoramento

O sistema gera logs detalhados:

```
⏰ [SCHEDULER] Executando job de confirmação às 08:00h
📅 [CONFIRMAÇÃO] Buscando agendas para: 07/10/2025
📋 [CONFIRMAÇÃO] 15 agenda(s) encontrada(s)
📤 [CONFIRMAÇÃO] Enviado para: João Silva (5514999887766)
✅ [CONFIRMAÇÃO] Resumo: 14 enviadas, 1 erro(s)
✅ [SCHEDULER] Job de confirmação concluído com sucesso
```

---

## 🔍 Consultas Úteis

### Ver agendas pendentes de confirmação

```sql
SELECT NOMEPAC, CELULARPAC, DATAAGENDA, HORARIO, STATUSCONFIRMA
FROM View_AgendaMedico
WHERE DATAAGENDA = CAST(DATEADD(DAY, 1, GETDATE()) AS DATE)
  AND SITUACAO = 'A'
  AND CELULARPAC IS NOT NULL
ORDER BY HORARIO;
```

### Ver confirmações do dia

```sql
SELECT 
  STATUSCONFIRMA,
  COUNT(*) as TOTAL
FROM ARQ_AGENDAS
WHERE DATAAGENDA =