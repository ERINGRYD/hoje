# PRD - Sistema de Batalhas Gamificado

## Visão Geral
O Sistema de Batalhas é o componente de gamificação do Study Planner, transformando sessões de estudo em combates RPG contra inimigos, aumentando engajamento e motivação através de mecânicas de jogo.

## Objetivos

### Objetivo Principal  
Gamificar a experiência de estudo através de batalhas RPG, transformando progresso acadêmico em progressão de personagem e criando loops de engajamento motivacionais.

### Objetivos Específicos
- Converter sessões de estudo em "ataques" contra inimigos
- Criar sistema de progressão baseado em RPG
- Fornecer feedback visual imediato para conquistas
- Manter motivação através de desafios escaláveis
- Integrar perfeitamente com sistema de estudos principal

## Funcionalidades Principais

### 1. Sistema de Combate

#### 1.1 Mecânica de Batalha
**Descrição**: Simulação de combate RPG baseada em sessões de estudo
- ✅ **Dano por Sessão**: Cada sessão de 25min = 10-30 dano (baseado em foco)
- ✅ **HP dos Inimigos**: Escalável baseado na dificuldade (100-1000 HP)
- ✅ **Críticos**: Sessões excepcionais causam dano dobrado
- ✅ **Sistema de Turnos**: Alternância entre ataques do jogador e inimigo

**Fórmula de Dano**:
```typescript
dano_base = duracao_sessao / 25 * 20  // 20 dano por 25min
multiplicador_foco = avaliacao_foco / 5  // 1-5 estrelas
dano_final = dano_base * multiplicador_foco
critico = random(1-10) <= 2 ? dano_final * 2 : dano_final
```

#### 1.2 Tipos de Inimigos
**Descrição**: Diferentes categorias de oponentes com características únicas
- ✅ **Slimes**: Inimigos básicos (100-200 HP)
- ✅ **Goblins**: Inimigos intermediários (300-500 HP)  
- ✅ **Orcs**: Inimigos avançados (600-800 HP)
- ✅ **Dragões**: Boss battles (1000+ HP)

**Atributos dos Inimigos**:
- **HP**: Pontos de vida totais
- **Attack**: Dano por "turno" (baseado em tempo inativo)
- **Defense**: Redução de dano recebido
- **XP Reward**: Experiência concedida ao derrotar
- **Loot**: Recursos/conquistas desbloqueadas

### 2. Sistema de Progressão

#### 2.1 Níveis e Experiência
**Descrição**: Sistema clássico de RPG para progressão do personagem
- ✅ **XP por Vitória**: Baseado na dificuldade do inimigo
- ✅ **Curve de Nível**: Exponencial para manter desafio
- ✅ **Level Cap**: Máximo inicial de 50 níveis
- ✅ **Bonificações**: Cada nível aumenta stats base

**Sistema de XP**:
```typescript
xp_inimigo = base_hp_inimigo / 10
xp_total_nivel = nivel_atual * 100 + 200
level_up = xp_atual >= xp_necessaria
```

#### 2.2 Atributos do Personagem
**Descrição**: Stats que evoluem e afetam performance em batalha
- ✅ **Attack Power**: Aumenta dano das sessões
- ✅ **Defense**: Reduz "dano" por procrastinação
- ✅ **Focus**: Afeta chance de crítico
- ✅ **Endurance**: Permite sessões mais longas

### 3. Interface de Batalha

#### 3.1 Arena de Combate
**Descrição**: Interface visual para acompanhar batalhas em andamento
- ✅ **Sprite do Inimigo**: Representação visual animada
- ✅ **Barras de HP**: Jogador e inimigo com animações
- ✅ **Log de Combate**: Histórico de ações recentes
- ✅ **Botões de Ação**: Atacar (estudar), defender, itens

#### 3.2 Widgets de Progresso
**Descrição**: Componentes integrados mostrando status da batalha
- ✅ **Mini Battle Widget**: Status compacto na página principal
- ✅ **Progress Ring**: HP do inimigo em formato circular
- ✅ **XP Bar**: Progresso para próximo nível
- ✅ **Battle Stats**: Estatísticas da batalha atual

### 4. Sistema de Recompensas

#### 4.1 Loot e Conquistas
**Descrição**: Recompensas por derrotar inimigos e atingir marcos
- 🔄 **Moedas Virtuais**: Para comprar upgrades e itens
- 🔄 **Conquistas**: Badges por feitos específicos
- 🔄 **Títulos**: Unlockáveis baseados em performance
- 🔄 **Skins**: Personalizações visuais

#### 4.2 Sistema de Streaks
**Descrição**: Bônus por consistência nos estudos
- ✅ **Daily Streak**: Dias consecutivos estudando
- ✅ **Study Streak**: Sessões consecutivas sem falhas
- 🔄 **Perfect Days**: Dias cumprindo 100% da meta
- 🔄 **Combo Multiplier**: Multiplicador de XP por streaks

### 5. Balanceamento e Dificuldade

#### 5.1 Escalonamento Dinâmico
**Descrição**: Ajuste automático de dificuldade baseado em performance
- ✅ **Análise de Performance**: Monitora tempo médio de sessões
- ✅ **Ajuste de HP**: Inimigos mais/menos resistentes
- ✅ **Frequência de Spawn**: Novos inimigos baseado em progresso
- ✅ **Boss Scaling**: Chefes proporcionais ao nível do jogador

#### 5.2 Curva de Progressão
**Descrição**: Design cuidadoso para manter engajamento a longo prazo
- ✅ **Early Game**: Vitórias frequentes para onboarding
- ✅ **Mid Game**: Desafios equilibrados
- ✅ **End Game**: Conteúdo para jogadores avançados
- 🔄 **Prestige System**: Reset com bonificações permanentes

## Fluxos de Usuário

### Fluxo de Primeira Batalha
1. **Onboarding**: Tutorial explica mecânicas básicas
2. **Primeiro Inimigo**: Slime fraco para vitória fácil
3. **Sessão de Estudo**: Timer integrado com contexto de batalha
4. **Ataque**: Animação de dano e redução de HP inimigo
5. **Vitória**: Celebração, XP, level up, próximo inimigo

### Fluxo de Batalha Contínua
1. **Status Check**: Verificar HP do inimigo atual
2. **Planejamento**: Escolher matéria/tópico para estudar
3. **Sessão Focada**: Timer com tema de batalha
4. **Resultado**: Dano causado baseado em performance
5. **Progressão**: XP ganho, possível level up

### Fluxo de Boss Battle
1. **Unlock**: Aparecem após sequência de vitórias
2. **Preparação**: Interface especial mostra desafio
3. **Múltiplas Sessões**: Boss requer várias sessões
4. **Estratégia**: Usuário pode escolher "ataques especiais"
5. **Recompensa**: Loot especial e grande quantidade de XP

## Integração com Sistema de Estudos

### Triggers de Combate
- **Nova Sessão**: Inicia ataque contra inimigo atual
- **Sessão Completa**: Calcula e aplica dano
- **Avaliação de Foco**: Afeta multiplicador de dano
- **Pausas Longas**: Inimigo "ataca" reduzindo HP do jogador

### Dados Compartilhados
- **Duração de Sessões**: Base para cálculo de dano
- **Matérias Estudadas**: Podem ter bonus contra tipos específicos
- **Consistência**: Afeta chances de crítico
- **Metas Atingidas**: Triggers para recompensas especiais

## Métricas de Sucesso

### Engajamento
- **Sessões diárias**: +40% comparado a sem gamificação
- **Tempo por sessão**: Manter 25-30 minutos médios
- **Retention rate**: 85% dos usuários ativos após 1 semana

### Progressão
- **Level médio**: 15-20 após 1 mês de uso
- **Boss defeats**: 60% dos usuários derrotam primeiro boss
- **Streak máximo**: Média de 7 dias consecutivos

### Satisfação
- **Fun factor**: 8.5/10 em pesquisas de usuário
- **Motivação**: 90% reporta maior motivação para estudar
- **Addictiveness**: Balanço saudável entre vício e produtividade

## Considerações Técnicas

### Performance
- **Sprites**: Otimizados para carregamento rápido
- **Animações**: CSS simples, sem impacto na performance
- **Estado**: Mínima complexidade adicional no state management

### Persistência
- **Battle State**: Salvo junto com dados de estudo
- **Character Progression**: Tabela dedicada no SQLite
- **Histórico**: Últimas 100 batalhas mantidas

### Acessibilidade
- **Screen Readers**: Alternativas textuais para elementos visuais
- **Reduced Motion**: Opção para desabilitar animações
- **Color Blind**: Indicadores não dependem apenas de cor

## Roadmap de Desenvolvimento

### Fase 1 (Atual) ✅
- Sistema básico de combate
- 4 tipos de inimigos
- Progressão de XP e níveis
- Interface básica de batalha

### Fase 2 🔄
- Sistema de loot e recompensas
- Conquistas e títulos
- Boss battles especiais
- Balanceamento avançado

### Fase 3 🔮
- Multiplayer batalhas
- Guildas de estudo
- Torneios temporários
- Sistema de prestige

## Riscos e Mitigações

### Risco: Distração do Objetivo Principal
**Mitigação**: Gamificação deve sempre servir aos estudos, não competir

### Risco: Curva de Dificuldade Inadequada
**Mitigação**: A/B testing e ajustes baseados em dados reais

### Risco: Vício Não Saudável
**Mitigação**: Limites naturais, pausas forçadas, métricas de well-being