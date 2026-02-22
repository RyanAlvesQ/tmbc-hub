# CLAUDE.md – Regras de Frontend

## Sempre Fazer Primeiro
- **Invocar a skill `frontend-design`** antes de escrever qualquer código frontend, em toda sessão

## Imagens de Referência
- Se uma imagem de referência for fornecida: corresponder layout, espaçamento, tipografia e cores exatamente
- Se não houver imagem de referência: criar do zero com alto nível de qualidade (ver guardrails abaixo).
- Tirar screenshot do resultado, comparar com a referência, corrigir diferenças, tirar novo screenshot. Não parar após uma única passagem.

## Servidor Local
- **Sempre servir no localhost** – nunca tirar screenshot de uma URL `file:///`.
- Iniciar o servidor de desenvolvimento: `node serve.mjs` (serve a raiz do projeto em `http://localhost:3000`)
- `serve.mjs` fica na raiz do projeto. Iniciá-lo em segundo plano antes de tirar qualquer screenshot.
- Se o servidor já estiver rodando, não iniciar uma segunda instância.

## Fluxo de Screenshots
- O Puppeteer está instalado em `C:/Users/nateh/AppData/Local/Temp/puppeteer-test/`. O Chromium está incluído lá.
- **Sempre tirar screenshot do localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots são salvos automaticamente em `./temporary screenshots/screenshot-N.png` (incremento automático)
- Sufixo de label opcional: `node screenshot.mjs http://localhost:3000 label` → salva como `screenshot-N-label.png`
- `screenshot.mjs` fica na raiz do projeto. Usar como está.
- Após tirar o screenshot, ler o PNG de `./temporary screenshots/` com a ferramenta Read para inspecionar visualmente.
- Ao comparar, ser específico: "o heading está em 32px mas a referência mostra ~24px", "o gap do card está largo demais", etc.
- Verificar: espaçamento/padding, tamanho/peso/line-height de fonte, cores (hex exato), alinhamento e estrutura dos componentes.

## Padrões de Saída
- Um único arquivo `index.html`, com todos os estilos inline, salvo indicação contrária do usuário
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Imagens de placeholder: `https://placehold.co/LARGURAxALTURA`
- Responsivo com abordagem mobile-first

## Assets de Marca
- Sempre verificar a pasta `brand_assets/` antes de criar o design. Ela pode conter logos, cores e fontes.
- Se houver assets lá, usá-los. Não usar placeholders onde há assets reais disponíveis.
- Se houver um logo, usá-lo. Se uma paleta de cores estiver definida, usar exatamente esses valores.

## Guardrails Anti-Genéricos
- **Cores:** Nunca usar a paleta padrão do Tailwind (indigo-500, blue-600, etc.). Escolher uma paleta customizada e intencional.
- **Sombras:** Nunca usar `shadow-md` simples. Usar sombras em camadas com tonalidade de cor e baixa opacidade.
- **Tipografia:** Nunca usar a mesma fonte para títulos e corpo. Combinar uma fonte display/serif com uma sans-serif limpa.
- **Gradientes:** Usar múltiplos gradientes radiais em camadas. Adicionar grão/textura via filtro SVG de ruído para profundidade.
- **Animações:** Animar apenas `transform` e `opacity`. Nunca usar `transition-all`. Usar propriedades específicas.
- **Estados interativos:** Todo elemento clicável precisa de estados hover, focus-visible e active.
- **Imagens:** Adicionar overlay de gradiente (`bg-gradient-to-t from-black/60`) e uma tonalidade de cor onde apropriado.
- **Espaçamento:** Usar tokens de espaçamento intencionais e consistentes – não passos aleatórios do Tailwind.
- **Profundidade:** Superfícies devem ter um sistema de camadas (base → elevado → flutuante), não layouts planos.

## Regras Rígidas
- Não adicionar seções, funcionalidades ou conteúdo que não estejam na referência
- Não "melhorar" um design de referência – reproduzi-lo fielmente
- Não parar após uma única passagem de screenshot
- Não usar `transition-all`
- Não usar azul/índigo padrão do Tailwind como cor primária
- Sempre testar em localhost e apenas quando eu solicitar, o push será feito no github.