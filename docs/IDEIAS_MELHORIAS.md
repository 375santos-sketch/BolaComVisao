# Ideias de melhorias (guardadas para mais tarde)

Lista feita a 24/10/2026, a pedido, do ponto de vista de um programador experiente e de um treinador de formação.
Só para a equipa técnica e para o design (nada para os pais). Implementar dois a dois, quando for pedido.

## Programação

### Fiabilidade

1. Cópia de segurança automática semanal, guardada fora da base de dados principal.
2. Registo de erros: quando algo falha no telemóvel, enviar o erro técnico (sem dados dos atletas) para consulta.
3. Mensagens de erro verdadeiras: distinguir "sem internet", "sem permissão" e "erro desconhecido".
4. Aviso visível quando há dados por enviar para a nuvem há muito tempo.
5. Modo sem rede no campo mais robusto: registar o jogo inteiro sem rede e enviar tudo depois.

### Rapidez e leveza

6. Arranque mais rápido: carregar só o ecrã aberto.
7. Guardar os dados no telemóvel em IndexedDB em vez do localStorage (acaba com o "Espaço esgotado").
8. Fotos e imagens no Firebase Storage, fora dos registos.

### Organização do código

9. Partir os ecrãs gigantes (jogo ao vivo, aniversários) em componentes pequenos.
10. Limpar código antigo que já não se usa (licenças, relatórios da direção, bases de dados de equipas antigas).
11. Um só sistema de design: botões, cartões, cores e letras definidos uma vez e usados em todo o lado.
12. Testes automáticos às contas sensíveis (minutos, classificação, sincronização) com casos reais sem dados pessoais.

### Segurança

13. Tornar o repositório privado.
14. Contas próprias para cada treinador, com convites e permissões.
15. Rever o que fica guardado no telemóvel quando se termina a sessão.

## Treinador de futebol (formação)

### Jogo

16. Plano de minutos antes do jogo, com trocas sugeridas e aviso durante o jogo.
17. Posições jogadas por atleta (todos devem passar por várias posições).
18. Notas rápidas durante o jogo, que vão para o relatório pós-jogo.
19. Golos por período e por origem.
20. Folha do banco numa página: titulares, suplentes, bolas paradas e trocas planeadas.

### Treino

21. Planeamento da época por ciclos (temas por mês e por semana).
22. Exercícios sugeridos pelo último jogo, ligados à biblioteca.
23. Cronómetro de treino com os blocos do plano e aviso para mudar de exercício.
24. Tempo de treino por tema no mês.
25. Presenças por ciclo (quem falha sempre às terças, antes dos jogos…).

### Desenvolvimento dos atletas

26. Avaliação trimestral com gráfico da evolução.
27. Objetivos individuais revistos todos os meses.
28. Alerta de carga (quem joga muito seguido, ou treina pouco e joga muito).
29. Ficha médica só para a equipa técnica.

### Equipa técnica

30. Divisão de tarefas na equipa técnica, com lembretes.

## Recomendação de ordem

1. 1 + 2 + 3 (cópia de segurança, registo de erros, mensagens de erro verdadeiras)
2. 7 (IndexedDB)
3. 11 e 10 (sistema de design e limpeza)
4. 16 + 17 (plano de minutos e posições)

## Outras ideias em aberto

- Classificação: ir buscar os resultados da série a resultados.fpf.pt (ver conversa de 24/10/2026).
- Widget com o aspeto da app no iPhone (app Scriptable), em alternativa ao widget do Calendário.
- Consentimento RGPD dos pais.
