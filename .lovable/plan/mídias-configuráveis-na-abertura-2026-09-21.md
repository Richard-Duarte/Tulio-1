# Mídias configuráveis na abertura

## Implementação
- Adicionar à biblioteca de mídia um controle independente “Sessão 1”.
- Exibir esse controle na aba Mídia do painel administrativo, ao lado de Galeria, Presskit e Download.
- Carregar na abertura apenas os itens habilitados para a Sessão 1, intercalando fotos e vídeos.
- Fazer os vídeos reproduzirem no túnel em loop, sem som e de forma otimizada; usar a capa quando o navegador ainda não iniciou o vídeo.
- Preservar o movimento automático e pausar a renderização quando a abertura sair da tela.

## Dados e compatibilidade
- A nova opção começa habilitada para o acervo atual, mantendo a abertura preenchida após a atualização.
- A visibilidade da galeria continuará independente da visibilidade da Sessão 1.

## Verificação
- Confirmar no painel que a opção pode ser alterada.
- Confirmar na Home que fotos e vídeos aparecem misturados e continuam em movimento sem scroll.
- Validar a abertura em desktop e celular, sem erros e sem regressão perceptível de fluidez.
