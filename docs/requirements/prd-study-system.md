# PRD - Sistema de Estudos Principal

## Visão Geral
O Sistema de Estudos é o núcleo do Study Planner, responsável por permitir que usuários criem, configurem e executem planos de estudo personalizados com distribuição automática de tempo e acompanhamento de progresso.

## Objetivos

### Objetivo Principal
Fornecer uma ferramenta completa para planejamento e execução de estudos, automatizando a distribuição de tempo e facilitando o acompanhamento de progresso.

### Objetivos Específicos
- Criação intuitiva de planos de estudo hierárquicos
- Cálculo automático de distribuição de tempo
- Acompanhamento em tempo real do progresso
- Flexibilidade para ajustes dinâmicos
- Persistência confiável de todos os dados

## Funcionalidades Principais

### 1. Criação de Planos de Estudo

#### 1.1 Configuração Inicial
**Descrição**: Interface para configurar parâmetros básicos do plano
- ✅ **Seleção de data do exame**: DatePicker integrado
- ✅ **Configuração de horas semanais**: Slider de 10-80 horas
- ✅ **Seleção de dias da semana**: Checkboxes para cada dia
- ✅ **Configuração de ciclos**: Quantos ciclos de revisão

**Critérios de Aceitação**:
- Data do exame deve ser futura
- Horas semanais entre 10-80
- Pelo menos 3 dias selecionados
- Ciclos entre 1-5

#### 1.2 Gerenciamento de Matérias
**Descrição**: CRUD completo para matérias de estudo
- ✅ **Adicionar matérias**: Modal com nome e peso
- ✅ **Editar matérias**: Modificar nome e peso
- ✅ **Remover matérias**: Com confirmação
- ✅ **Reordenar matérias**: Drag & drop

**Critérios de Aceitação**:
- Nome único por matéria
- Peso entre 1-10
- Soma de pesos = 100% na visualização
- Mínimo 2 matérias por plano

#### 1.3 Gerenciamento de Tópicos
**Descrição**: Estrutura hierárquica dentro de cada matéria
- ✅ **Adicionar tópicos**: Nome e peso relativo à matéria
- ✅ **Editar tópicos**: Modificação inline ou modal
- ✅ **Remover tópicos**: Com verificação de dependências
- ✅ **Subtópicos**: Até 3 níveis de hierarquia

**Critérios de Aceitação**:
- Tópicos únicos dentro da matéria
- Peso relativo somando 100% por matéria
- Suporte a subtópicos aninhados
- Preservar hierarquia na navegação

### 2. Cálculo Automático de Distribuição

#### 2.1 Algoritmo de Distribuição de Tempo
**Descrição**: Sistema inteligente que calcula automaticamente a distribuição de horas
- ✅ **Cálculo por peso**: Distribui tempo baseado nos pesos configurados
- ✅ **Consideração de ciclos**: Inclui tempo para revisões
- ✅ **Ajuste por disponibilidade**: Considera dias e horas disponíveis
- ✅ **Buffer de segurança**: Reserva tempo para imprevistos

**Algoritmo**:
```typescript
tempo_materia = (peso_materia / 100) * tempo_total_disponivel
tempo_topico = (peso_topico / 100) * tempo_materia
tempo_com_ciclos = tempo_base * (1 + 0.3 * num_ciclos)
```

#### 2.2 Recálculo Dinâmico
**Descrição**: Atualização automática quando parâmetros mudam
- ✅ **Mudança de pesos**: Recalcula distribuição instantaneamente
- ✅ **Alteração de disponibilidade**: Ajusta cronograma
- ✅ **Modificação de ciclos**: Rebalanceia tempos
- ✅ **Progresso real**: Considera tempo já estudado

### 3. Execução e Acompanhamento

#### 3.1 Timer Pomodoro Integrado
**Descrição**: Timer focado em sessões de estudo
- ✅ **Configuração personalizada**: 15-90 minutos
- ✅ **Pausas automáticas**: Intervalos curtos e longos
- ✅ **Seleção de contexto**: Matéria/tópico atual
- ✅ **Notificações visuais**: Alertas de início/fim

**Critérios de Aceitação**:
- Timer preciso com controles play/pause/stop
- Salvamento automático de sessões
- Integração com progresso do plano
- Funcionamento em background

#### 3.2 Registro de Sessões
**Descrição**: Histórico completo de atividades de estudo
- ✅ **Sessões automáticas**: Via timer integrado
- ✅ **Sessões manuais**: Adição posterior
- ✅ **Detalhamento**: Matéria, tópico, duração, data
- ✅ **Edição/exclusão**: Correções posteriores

#### 3.3 Visualização de Progresso
**Descrição**: Dashboards e widgets para acompanhar evolução
- ✅ **Progress bars**: Por matéria e tópico
- ✅ **Gráficos temporais**: Evolução diária/semanal
- ✅ **Estatísticas**: Horas totais, média diária, eficiência
- ✅ **Comparativo**: Planejado vs. executado

### 4. Flexibilidade e Ajustes

#### 4.1 Redistribuição de Tempo
**Descrição**: Ferramenta para rebalancear plano durante execução
- ✅ **Identificação de gaps**: Matérias atrasadas/adiantadas
- ✅ **Sugestões automáticas**: Redistribuição inteligente
- ✅ **Aplicação seletiva**: Escolher quais ajustes aplicar
- ✅ **Previsão de impacto**: Mostrar consequências dos ajustes

#### 4.2 Ajustes de Prioridade
**Descrição**: Modificação dinâmica de importância de tópicos
- ✅ **Slider de prioridade**: 1-5 estrelas
- ✅ **Impacto visual**: Cores/ícones diferentes
- ✅ **Recálculo automático**: Ajusta distribuição
- ✅ **Histórico**: Rastreia mudanças de prioridade

### 5. Persistência e Backup

#### 5.1 Salvamento Automático
**Descrição**: Sistema robusto de persistência local
- ✅ **Auto-save**: Salva mudanças a cada 1 segundo
- ✅ **Versionamento**: Mantém histórico de alterações  
- ✅ **Recuperação**: Restaura último estado válido
- ✅ **Integridade**: Validação de dados antes de salvar

#### 5.2 Gerenciamento de Planos
**Descrição**: Sistema para múltiplos planos nomeados
- ✅ **Planos nomeados**: Salvar com nome personalizado
- ✅ **Lista de planos**: Visualizar todos os planos salvos
- ✅ **Carregar plano**: Ativar plano específico
- ✅ **Duplicar plano**: Criar cópia para modificação
- ✅ **Exportar/Importar**: JSON para backup/compartilhamento

## Fluxos de Usuário

### Fluxo Principal - Criação de Plano
1. **Configuração Inicial**: Data exame, horas semanais, dias
2. **Adição de Matérias**: Nome, peso, ordem de prioridade
3. **Detalhamento de Tópicos**: Para cada matéria, adicionar tópicos
4. **Revisão Automática**: Sistema mostra distribuição calculada
5. **Confirmação**: Salvar plano e iniciar execução

### Fluxo de Estudo
1. **Seleção de Contexto**: Escolher matéria/tópico
2. **Configuração de Timer**: Duração da sessão
3. **Execução**: Timer rodando com controles
4. **Conclusão**: Registrar sessão e atualizar progresso
5. **Feedback**: Visualizar impacto no plano geral

### Fluxo de Ajuste
1. **Análise de Progresso**: Identificar desvios do planejado
2. **Sugestões**: Sistema propõe redistribuições
3. **Seleção**: Usuário escolhe ajustes desejados
4. **Aplicação**: Recálculo e atualização do plano
5. **Confirmação**: Novo cronograma salvo

## Métricas de Sucesso

### Métricas de Usabilidade
- **Tempo para criar primeiro plano**: < 5 minutos
- **Taxa de conclusão de configuração**: > 85%
- **Frequência de uso do timer**: > 70% das sessões

### Métricas de Engajamento
- **Sessões de estudo semanais**: > 15 por usuário ativo
- **Tempo médio de sessão**: 25-45 minutos
- **Taxa de conclusão de planos**: > 60%

### Métricas Técnicas
- **Tempo de carregamento do plano**: < 500ms
- **Precisão do timer**: ±1 segundo
- **Taxa de perda de dados**: 0%

## Casos de Uso Especiais

### Uso Intensivo
**Cenário**: Usuário com 8 matérias, 50+ tópicos, 6 meses de estudo
**Requisitos**: Performance mantida, interface responsiva

### Uso Móvel
**Cenário**: Estudo em dispositivos móveis
**Requisitos**: Interface adaptada, timer funcional em background

### Recuperação de Dados
**Cenário**: Falha no browser, limpeza de cache
**Requisitos**: Backup automático, recuperação completa

## Dependências e Integrações

### Dependências Internas
- **Database Layer**: SQLite + IndexedDB
- **UI Components**: Radix UI + Tailwind
- **State Management**: React Context + Custom Hooks

### Integrações Futuras
- **Sistema de Batalhas**: Progresso alimenta gamificação
- **Sistema de Questões**: Sessões podem incluir questões
- **Analytics**: Dados para relatórios avançados