# PRODUCT_SPEC.md — BolaComVisão: Sistema Operacional do Treinador de Futebol

> **Missão:** Tornar o treinador mais focado, eficiente e inteligente, fechando o ciclo contínuo do futebol moderno com zero atritos cognitivos e máxima velocidade de decisão.

---

## 1. O Princípio da Invisibilidade ("1 a 3 Toques")

O software nunca deve fazer o treinador parar para pensar: *"Onde está esta funcionalidade?"*.
Deve ser intuitivo e direto:
1. **Regra de Decisão:** Uma página = uma decisão principal.
2. **Tempo de Resposta:** Todas as ações frequentes (abrir jogo, registar golo, consultar presença) em 1 a 3 toques.
3. **Contexto Automático:** A aplicação sabe que dia é hoje, se há jogo ou treino, e prepara o ecrã com o que é relevante para o momento.

---

## 2. O Ciclo Completo do Treinador

```
          ┌────────────────────────────────┐
          │     1. PRÉ-JOGO & SCOUTING     │ (Adversário, Convocatória, Bolas Paradas)
          └───────────────┬────────────────┘
                          ↓
          ┌────────────────────────────────┐
          │     2. MODO BANCO (AO VIVO)    │ (Marcador, 1-touch Golos/Cartões/Subs)
          └───────────────┬────────────────┘
                          ↓
          ┌────────────────────────────────┐
          │     3. RESUMO PÓS-JOGO (30s)   │ (O que aconteceu, PDF, Checklist)
          └───────────────┬────────────────┘
                          ↓
          ┌────────────────────────────────┐
          │     4. ANÁLISE TÁTICA & DADOS  │ (Minutos críticos, Padrões, Tendências)
          └───────────────┬────────────────┘
                          ↓
          ┌────────────────────────────────┐
          │   5. RECOMENDAÇÃO TÁTICA IA    │ ("O que os dados sugerem trabalhar")
          └───────────────┬────────────────┘
                          ↓
          ┌────────────────────────────────┐
          │  6. TREINO GERADO (1-CLIQUE)   │ (Objetivo, Duração, Exercício sugerido)
          └───────────────┬────────────────┘
                          ↓
          ┌────────────────────────────────┐
          │     7. NOVO JOGO & EVOLUÇÃO    │ (Medir se o problema foi resolvido)
          └────────────────────────────────┘
```

---

## 3. Especificação dos Módulos Principais

### A. Ecrã Principal ("Início / Assistente")
- **Saudação & Escalão:** Bom dia / Boa tarde com o escalão ativo (ex: Sub-13).
- **Próximo Jogo / Hoje:**
  - Se há jogo hoje: Botão direto `[ ABRIR MODO JOGO ]`.
  - Se há treino hoje: Botão direto `[ ABRIR TREINO ]` com **Foco Recomendado**.
  - Se não há evento hoje: Próximo jogo com contagem regressiva e `[ PREPARAR JOGO ]`.
- **Visão do Treinador (5 Métricas Executivas + Contexto):**
  - Golos Marcados / Jogo
  - Golos Sofridos / Jogo
  - % Vitórias
  - 🔥 **Ponto Forte** (ex: Marcámos em 8 dos últimos 10 jogos)
  - ⚠️ **Ponto de Atenção** (ex: 43% dos golos sofridos após os 60')
- **Tendências Rápidas da Equipa:**
  - Ataque: 🟢 A melhorar | Defesa: 🟠 Instável | Bolas Paradas: 🟢 Forte | Disciplina: 🟢 Estável.

---

### B. Modo Banco Rápido (Interface Simplificada de Jogo)
- **Visual:** Alto contraste, botões grandes (mínimo 48px).
- **Golo da Nossa Equipa:** 1 toque em `⚽ GOLO` $\rightarrow$ Minuto automático $\rightarrow$ Marcador $\rightarrow$ Assistência $\rightarrow$ Tipo (Canto, Livre, Transição, Jogada) $\rightarrow$ `[ Registar ]`.
- **Golo Sofrido:** 1 toque em `🔴 SOFRIDO` $\rightarrow$ Minuto $\rightarrow$ Origem (Canto, Bola Parada, Ataque Posicional, Perda).
- **Substituição / Cartão / Falta / Canto:** Registados em 1-2 toques.
- **Offline Total:** Funciona sem qualquer sinal de rede; armazena todos os eventos em IndexedDB/LocalStorage e sincroniza quando a rede regressa.

---

### C. Pós-Jogo e "O Que Devemos Trabalhar?"
Ao terminar a partida:
1. Resumo instantâneo do resultado e estatísticas vitais.
2. Alerta tático fundamentado:
   - *Exemplo:* "A equipa sofreu 4 dos últimos 6 golos entre os 60' e 90'."
   - *Recomendação:* "Trabalhar organização defensiva em bloco baixo e concentração no último terço."
3. Botão: **[ ➕ Adicionar ao Próximo Treino ]** $\rightarrow$ Preenche automaticamente uma nova sessão com:
   - Tema: *Organização Defensiva / Bola Parada Defensiva*
   - Duração sugerida: *20-25 min*
   - Pontos-chave: *Posicionamento, Primeira bola, Segunda bola, Reação à perda.*

---

### D. Perfil de Evolução Individual dos Atletas
- Em formação, eliminar notas arbitrárias estilo "FIFA".
- Acompanhamento objetivo:
  - **Participação:** Jogos, Minutos jogados, Titularidades.
  - **Presenças:** Assiduidade a treinos (%).
  - **Produção:** Golos, Assistências, Desarmes, Recuperações.
  - **Objetivos Formativos:** Ex: *Melhorar finalização com pé esquerdo* $\rightarrow$ Progresso (🟢 Em evolução).

---

### E. Visão do Clube & Coordenação
- **Painel Multi-Escalão:** Visão global Sub-9 a Seniores com indicadores de saúde desportiva.
- **Relatório Executivo Mensal:** Conclusões e tendências prontas para a Direção sem PDFs com tabelas excessivas.

---

## 4. Metas de Desempenho & Fiabilidade

| Ação | Meta de Tempo |
| :--- | :---: |
| Carregar Início | $< 1.5\text{ s}$ |
| Abrir Modo Jogo | $< 0.8\text{ s}$ |
| Registar Evento (Golo/Falta) | $< 0.5\text{ s}$ |
| Abrir Plantel / Treinos | $< 1.0\text{ s}$ |
| Operação sem Internet | $100\%\text{ funcional}$ |

---

## 5. Regra de Ouro do Desenvolvimento
Qualquer nova funcionalidade deve obrigatoriamente responder a:
> **"Isto ajuda o treinador a tomar uma decisão melhor em menos tempo?"**
Se a resposta for não, ou se adicionar cliques e ruído visual desnecessário, a funcionalidade é rejeitada.
