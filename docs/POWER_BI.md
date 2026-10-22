# Usar os dados da BolaComVisão no Power BI

## 1. Gerar o ficheiro

Na app: **Performance → Estatísticas → 📊 Abrir painel → 📊 Excel com gráficos (+ Power BI)** (para os jogos do
filtro escolhido) ou **Estatísticas → Exportar Excel** (época). Sai um ficheiro `Painel_Jogos_<clube>_<data>.xlsx`:

- folha **Painel**: números principais e gráficos nativos do Excel (minutos por atleta, golos por jogo, como e quando
  marcamos, golos e assistências) e os Top 3;
- folha **Dados dos gráficos**: os números que os gráficos usam;
- folhas seguintes: as tabelas para o Power BI (abaixo).

O ficheiro só tem dados desportivos: **não leva contactos, datas de nascimento nem as notas do treinador**. Mesmo
assim são dados de menores, por isso guarde-o só no seu computador ou numa pasta privada.

## 2. Abrir no Power BI Desktop (gratuito, Windows)

1. **Obter dados → Livro do Excel** e escolher o ficheiro.
2. Marcar as 7 folhas das tabelas (Atletas, Jogos, Golos, MinutosPorJogo, Cartoes, Treinos, Presencas) e carregar.
3. Em **Modelo**, ligar as tabelas (o Power BI costuma fazê-lo sozinho pelos nomes):

| De                         | Para                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `Golos[JogoId]`            | `Jogos[JogoId]`                                              |
| `MinutosPorJogo[JogoId]`   | `Jogos[JogoId]`                                              |
| `MinutosPorJogo[AtletaId]` | `Atletas[AtletaId]`                                          |
| `Cartoes[JogoId]`          | `Jogos[JogoId]`                                              |
| `Cartoes[AtletaId]`        | `Atletas[AtletaId]`                                          |
| `Presencas[TreinoId]`      | `Treinos[TreinoId]`                                          |
| `Presencas[AtletaId]`      | `Atletas[AtletaId]`                                          |
| `Golos[MarcadorId]`        | `Atletas[AtletaId]` (relação inativa, para golos por atleta) |

## 3. Filtros úteis (segmentações)

- **Jogo a jogo:** `Jogos[Adversario]` + `Jogos[Data]`.
- **Confrontos:** `Jogos[Adversario]`.
- **Fases / jornadas:** `Jogos[Competicao]` e `Jogos[Fase]`.
- **Época:** `Jogos[Epoca]` (e `Treinos[Epoca]`).
- **Período:** segmentação de datas em `Jogos[Data]`.

## 4. Atualizar

O Power BI não liga diretamente à app. Para dados novos: exportar outra vez, guardar **com o mesmo nome e na mesma
pasta** do ficheiro anterior, e carregar em **Atualizar** no Power BI.

> Não use "Publicar na Web" do Power BI com estes dados: o relatório fica público na internet.
