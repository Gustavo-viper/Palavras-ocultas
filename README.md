# Palavras Ocultas — Forge Studios

Versão 1.0 — jogo web/PWA offline-first.

- 1077 palavras únicas.
- 12 categorias.
- Dificuldade automática por comprimento.
- 10 palavras por partida.
- Histórico de palavras usadas salvo no aparelho.
- Desafio diário.
- Dica funcional.
- Service Worker para funcionamento offline.
- Sem dependência de CDN ou servidor para iniciar o jogo.

## Como testar
Abra `index.html` em um servidor local ou publique em Render/GitHub Pages. O Service Worker só funciona em HTTPS ou localhost.

## Identidade visual
A logo oficial fornecida para o Palavras Ocultas está incluída em `assets/palavras-ocultas-logo.jpg` e `assets/icon-512.png` e é carregada localmente, inclusive no modo offline.


## v5
Motor do jogo refeito para eliminar falhas de inicialização. O botão Jogar possui handler direto, o tabuleiro é gerado com fallback seguro e o estado local é tolerante a falhas.
