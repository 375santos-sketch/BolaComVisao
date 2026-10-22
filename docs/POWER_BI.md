# Usar os dados da BolaComVisão no Power BI

## 1. Gerar o ficheiro

Na app: **Performance → Estatísticas → 📊 Abrir painel → ⬇️ Exportar para Power BI** (também existe no painel de
cada atleta). Sai um ficheiro `PowerBI_<clube>_<data>.xlsx`.

O ficheiro só tem dados desportivos: **não leva contactos, datas de nascimento nem as notas do treinador**. Mesmo
assim são dados de menores, por isso guarde-o só no seu computador ou numa pasta privada.

## 2. Abrir no Power BI Desktop (gratuito, Windows)

1. **Obter dados → Livro do Excel** e escolher o ficheiro.
2. Marcar as 7 folhas e carregar.
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
