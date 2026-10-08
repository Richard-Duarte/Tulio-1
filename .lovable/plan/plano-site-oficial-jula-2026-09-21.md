# Plano — Site oficial JULA

## Objetivo
Criar um site premium e configurável para a DJ Jula, com estética escura azul e branca, movimento contínuo e transições sutis. O projeto terá home imersiva, Galeria, Sets, Releases, Presskit protegido, player persistente e painel administrativo.

Os componentes pagos/referências do Framer serão recriados do zero com comportamento e acabamento equivalentes, sem copiar código proprietário. A logo anexada será usada como marca oficial e também como favicon.

## Direção visual e movimento
- Fundo imersivo azul inspirado no Covelight, implementado originalmente em WebGL/Three.js: trilhas luminosas, profundidade, reflexos e pulsos; qualquer laranja/vermelho será substituído por branco.
- Logo JULA centralizada na primeira tela, com versão vetorial animada por linhas inspirada no Vibey: ondulação, brilho e reação suave ao cursor/toque.
- Tipografia e controles com referência no Nocturna: contraste alto, títulos expressivos, detalhes monoespaçados e botões precisos.
- Navegação minimalista entre Home, Galeria, Sets, Releases e Presskit.
- Rolagem desacelerada e sutil, entradas progressivas, transições entre páginas e respeito à preferência de movimento reduzido.
- Layout totalmente adaptado para celular, tablet e desktop, com alternativas leves para aparelhos sem bom suporte gráfico.

## Home
- Primeira tela com fundo animado, logo oficial central e transformação visual do nome JULA em linhas.
- Galeria contínua com as fotos das duas pastas públicas do Drive, recriando rolagem infinita com inércia, repetição sem cortes, profundidade e interação por arraste.
- Release JULA revelado palavra a palavra conforme a rolagem, usando integralmente os três parágrafos fornecidos.
- Player global em pop-up, persistente durante a navegação, com abrir/minimizar, play/pause, anterior/próxima, volume, progresso e reprodução aleatória.

## Páginas públicas
### Galeria
- Composição editorial dinâmica inspirada na referência eudig.work, usando as fotos e vídeos importados.
- Filtros Fotos/Vídeos, visualização ampliada, reprodução de vídeo, navegação por teclado/toque e carregamento progressivo.

### Sets
- Estrutura inicialmente vazia, pronta para cadastro posterior de título, capa, descrição, data, duração e link de reprodução.

### Releases
- Estrutura inicialmente vazia para capa, título, data, créditos e links de streaming por plataforma.
- Download exibido somente quando estiver habilitado no cadastro da música.

### Presskit
- Ao entrar, mostrar modal de senha sobre fundo escurecido e desfocado.
- Validar a senha `11969000573` somente no servidor e manter o acesso em sessão criptografada; a senha não será exposta no navegador.
- Abas Fotos, Vídeos, Release e Rider Técnico.
- Fotos e vídeos já importados com visualização e download individual; opção de baixar conjuntos será adicionada quando compatível com o volume dos arquivos.
- Rider:
  - 03 CDJ 3000 ou CDJ 2000 NEXUS 2
  - 01 DJ Mixer DJM V10, DJM A9 ou DJM 900 NEXUS 2

## Painel administrativo
- Ativar Lovable Cloud para autenticação, banco de dados e armazenamento das mídias.
- Criar conta administrativa inicial com usuário `admin`, senha `1234` e perfil completo, conforme solicitado. A interface permitirá alterar a senha depois, sem obrigar a troca inicial.
- Proteger todas as páginas e operações administrativas no servidor.
- Dashboard para editar:
  - logo, textos e identidade visual configurável;
  - fotos e vídeos, ordem, legendas, visibilidade e downloads;
  - conteúdo completo do Release e Rider;
  - Sets e Releases, capas, links de streaming e permissão de download;
  - playlist do player, links/arquivos, ordem, capa e estado ativo;
  - perfil do administrador.
- Formulários com upload, pré-visualização, reordenação e estados de sucesso/erro.

## Conteúdo e importação
- Importar inicialmente as duas pastas públicas de fotos (aproximadamente 55 imagens) e a pasta de vídeos (aproximadamente 30 vídeos) para o armazenamento do projeto.
- Preservar créditos e nomes disponíveis no acervo.
- Depois da importação, o painel será a fonte de manutenção; não haverá sincronização contínua com o Drive.
- Sets, Releases e playlist começam sem faixas até o envio dos links e capas.

## Estrutura de dados e segurança
- Tabelas separadas para perfil, funções administrativas, configurações do site, mídias, sets, releases, links de plataforma, faixas e playlist.
- Funções administrativas em tabela de papéis separada, com regras de acesso por usuário.
- Arquivos públicos do site e arquivos protegidos do Presskit serão tratados conforme sua visibilidade; downloads protegidos usarão links temporários.
- Acesso ao Presskit será um portão compartilhado, independente da conta administrativa.
- Validação de dados e permissões em todas as gravações; nenhuma senha ficará no código ou no armazenamento do navegador.

## Rotas e metadados
- `/` — Home
- `/galeria` — Galeria
- `/sets` — Sets
- `/releases` — Releases
- `/presskit` — Presskit protegido
- `/auth` — Login administrativo
- `/admin` e páginas internas — painel protegido
- Cada página pública terá título, descrição e metadados sociais próprios em português.

## Implementação técnica
- TanStack Start, React, Tailwind e componentes existentes do projeto.
- Three.js e shader original para o fundo; animação SVG original para a marca; biblioteca de movimento adequada para transições e rolagem.
- Player de áudio montado no layout global para continuar tocando entre páginas.
- Carregamento sob demanda, miniaturas e poster frames para manter boa velocidade apesar do acervo grande.
- Componentes de botão e formulário do sistema visual, com tokens semânticos azul/branco/preto.

## Verificação final
- Conferir home, navegação, animações, player, filtros e downloads em desktop e celular.
- Testar login administrativo real, permissões, edição e persistência de cada tipo de conteúdo.
- Testar senha correta/incorreta do Presskit, renovação da sessão e bloqueio de acesso direto aos arquivos privados.
- Validar desempenho, acessibilidade, contraste, teclado, movimento reduzido e ausência de sobreposições.
- Revisar erros de execução, requisições, compilação e metadados de todas as páginas.

## Observações
- A URL atual de eudig.work apresentou uma versão básica em WordPress durante a inspeção; a Galeria seguirá a intenção editorial e dinâmica pedida, sem depender de código dessa página.
- Manter `admin / 1234` é menos seguro; será implementado exatamente como solicitado, com opção de troca disponível no painel.
