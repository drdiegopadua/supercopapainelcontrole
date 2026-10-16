# Supercopa 2026 — Protocolo de contingência (vôlei)

Regra de ouro: **o jogo nunca para por causa de tecnologia.** O resultado oficial é o da súmula; o sistema se ajusta a ela, não o contrário.

## O que o sistema já faz sozinho

| Situação | O que acontece |
|---|---|
| Internet cai durante o jogo | A súmula continua marcando pontos. Tudo fica numa fila guardada no próprio aparelho (sobrevive a fechar a aba e a reiniciar). O indicador no topo mostra "N pendente(s)". Ao voltar a internet, envia sozinho a cada 30 s. |
| Resposta do servidor se perde | Cada envio tem um número de lote: reenviar não duplica pontos. |
| Dois aparelhos gravam juntos | Controle de versão no banco: o segundo tenta de novo automaticamente. Nada é sobrescrito sem aviso. |
| Banco/serviço fora do ar | Súmula segue local. Site e app mostram a última tabela que carregaram. |
| Perda de dados | Backup completo todo dia às ~3h na pasta "Supercopa - Backup Supabase" do Drive (últimos 30). |

## Se algo der errado — o que fazer

### 1. Internet caiu na mesa
1. **Continue marcando.** Não recarregue a página, não feche o navegador.
2. Se tiver 4G: ligue o roteamento de dados do celular e a súmula envia sozinha.
3. Ao fim do jogo, se o indicador ainda mostra pendências, **não finalize**: espere voltar a internet. Se não voltar em 15 min, siga o item 4.

### 2. Aparelho da súmula travou ou desligou
1. Ligue de novo e abra o painel → Súmula → mesmo jogo. O estado oficial volta do servidor; os pontos que estavam só no aparelho e não tinham sido enviados (no máximo os últimos 30 s) voltam da fila local, se for o mesmo aparelho.
2. Se o aparelho morreu de vez: abra **o mesmo jogo em outro aparelho** (login da mesa). O placar recomeça do último envio. Confira com o Árbitro 2 / papel e use **+1 / −1** para acertar a diferença.
3. O **Árbitro 2** (somente leitura) mostra o placar que o servidor tem — use para conferir quanto se perdeu.

### 3. Súmula digital inviável (sem aparelho / sem internet por muito tempo)
1. Preencher a **súmula de papel** (modelo impresso em anexo no dia do evento).
2. Assim que possível, no painel → **Torneio → Lançar resultado** (perfis admin, organização e mesa): informar o placar de cada set. O sistema valida as regras da CBV (25 pts, 3º set a 15, 2 de diferença, melhor de 3), grava e **recalcula a classificação sozinho**.
3. W.O. (equipe ausente ou incompleta): usar a opção W.O. no mesmo lugar — vencedor ganha 3 pts e 2x0 (25x0 duplo); se **as duas** estiverem incompletas, ninguém pontua (art. 13 e 19 do regulamento).

### 4. Classificação "travada" ou diferente da súmula
1. Conferir o jogo em Torneio → Jogos. Se o resultado estiver errado, **Lançar resultado** corrige (fica registrado quem lançou e quando).
2. Se a súmula foi finalizada por engano: Súmula → Resumo dos jogos → **Reabrir**.
3. Empate que só o sorteio resolve: o painel avisa em amarelo. A organização sorteia e informa a ordem em Torneio → Equipes.

### 5. Site/app/TV fora do ar ou lentos
- Site e app guardam a última tabela carregada (mostram "atualizado há X min").
- TV: abrir `tv-volei.html` direto; se não carregar, projetar o painel (Torneio → Classificação) em tela cheia.
- Plano C: imprimir a classificação do painel (botão Imprimir) e afixar no mural.

### 6. Supabase pausado / fora do ar
- O projeto gratuito pausa após 7 dias sem uso: **entrar no Supabase na semana anterior ao evento** (ou antes) e conferir que está ativo ("Restore" se pausado).
- Fora do ar no dia: seguir 1 a 3 (papel + lançar depois). Para restaurar dados: usar o último arquivo da pasta de backup do Drive.

## Antes do evento (checklist — 1 semana antes)
- [ ] Abrir o Supabase e confirmar que o projeto está ativo.
- [ ] Painel → Sistema (saúde): tudo verde.
- [ ] Conferir se há arquivo de backup de hoje na pasta do Drive.
- [ ] Teste completo em jogo `TESTE1`: pontuar, desfazer, substituição, cartão, finalizar, PDF.
- [ ] Teste de queda de internet: desligar o Wi-Fi do aparelho no meio do set, marcar 5 pontos, religar, ver sincronizar.
- [ ] Teste de aparelho reserva: abrir o mesmo jogo em outro aparelho.
- [ ] Imprimir súmulas de papel (10 cópias) e a tabela de jogos.
- [ ] Carregar celulares/tablets da mesa e levar carregador + roteador 4G de reserva.
- [ ] Confirmar logins da mesa e do Árbitro 2 (cada perfil) e a senha de liberação.

## Quem faz o quê no dia
- **Mesa (apontador):** súmula digital; avisa a coordenação ao ver "pendente(s)" por mais de 2 min.
- **Coordenação (admin/organização):** Torneio → Lançar resultado, W.O., sorteios, reabrir súmula.
- **Árbitro 2:** acompanha o placar no PWA e confere com a quadra.
