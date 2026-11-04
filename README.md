# Blueprint — vídeos "como funciona" em estilo planta técnica

Fábrica de vídeos verticais (1080×1920, 30 fps) para Reels, TikTok e Shorts, feita com
[Remotion](https://remotion.dev) (React → MP4). Cada episódio é **código**: o desenho, a narração e as
legendas saem do mesmo roteiro, então dá para produzir em série mantendo a identidade visual.

## Como produzir um episódio

```bash
npm install
pip install edge-tts                                   # narração neural pt-BR (grátis)

python3 scripts/tts.py episodes/telhado/script.json    # gera áudio + tempo de cada palavra
npm run studio                                         # pré-visualiza e ajusta no navegador
npx remotion render telhado out/ep01-telhado.mp4 # ~6 min para 80 s       # exporta o MP4
```

1. **Roteiro**: `episodes/<id>/script.json`. Uma frase curta por cena, de 6 a 8 cenas e uns 45–60 s no total.
2. **Narração**: `scripts/tts.py` gera um MP3 por cena e o arquivo `src/episodes/<id>/timeline.json`.
   A duração de cada cena vem do áudio, então não é preciso ajustar nada à mão. Para trocar a voz, mude
   `voice` no roteiro (ex.: `pt-BR-FranciscaNeural`). Para usar a sua própria voz, grave um MP3 por cena com
   o mesmo nome do arquivo, sobrescreva os gerados e rode `tts.py` antes, só para ter os tempos.
3. **Cenas**: `src/episodes/<id>/scenes.tsx`. Os objetos são modelados em 3D, em metros, e a câmera se move pela cena. A animação dispara **na palavra falada**:
   `const { at } = useScene(); <Stroke d={...} from={at("linha")} />`.
4. **Cadastro**: adicione o episódio em `src/Root.tsx`.

### Peças do design system (`src/components`)
| Componente | O que faz |
|---|---|
| `Background` | Fundo azul de planta com grade fina e grossa e vinheta |
| `Hud` | Carimbo do episódio, @handle e "FOLHA 03/07" |
| `Captions` | Legenda palavra a palavra, com a palavra falada em amarelo |
| `Stroke` / `Arrow` / `Joint` | Traço que se desenha, seta de força, nó articulado |
| `Dimension` / `Ground` | Cota técnica e hachura de solo |
| `three/engine` | Mini motor 3D em SVG: `box`, `bar` (peça com seção), `bentBar` (peça envergando), `groundGrid`, câmera orbitando (`Cam`) e `project()` para ancorar etiquetas em pontos 3D |
| `Callout` / `Stat` / `Reveal` | Etiqueta com linha de chamada, número com contador, texto que sobe |

Cores, fonte e @handle ficam em `src/brand.ts`. **Troque `@seucanal` pelo seu perfil.**

Código de cores fixo do canal: **amarelo = compressão/destaque**, **ciano = tração**, **vermelho = problema/falha**.
Mantenha esse código em todos os episódios; o público aprende a "ler" os vídeos.

## Estratégia de conteúdo

**Formato**: 45–60 s, com o gancho em pergunta nos 2 primeiros segundos. Cada cena responde a um "por quê" e
cria o próximo. Fecha com uma chamada para o próximo episódio, o que gera sequência e incentiva seguir o perfil.

**Fórmula do roteiro: "você constrói do zero"** (padrão do vídeo de referência):

O espectador é quem constrói. Cada peça nasce como **a solução do problema anterior** e só então ganha nome.
O ciclo se repete a cada 5–8 s:

> **Mas…** (problema, mostrado falhando em vermelho)
> **Então você…** (a invenção, descrita sem jargão: "uma viga deitada", "uma peça em pé")
> **Essa é a ___.** (o nome técnico aparece na tela no mesmo instante)

Exemplo do EP.01:
1. "Você precisa segurar cinco toneladas de telha em cima de uma casa."
2. "Então você apoia vigas inclinadas nas paredes. **Essas são as pernas.** Mas o peso empurra as pontas para fora…"
3. "Então você amarra as duas pontas com uma viga deitada… **Essa é a linha.**"
4. "Mas a linha é comprida… ela enverga no meio." → pendural → "Mas as pernas também são compridas…" → escoras
5. Um momento "repare" com o princípio por trás (os triângulos) e um fato curioso.
6. **Fechamento com chamada para comentar**: "Parabéns, você construiu uma tesoura. Se já sabia, comente *tesoura*.
   Se não sabia, comente *aprendi*." Os dois lados comentam, e isso alimenta o algoritmo.

Regras: frases curtas no presente; descreva a peça pelo que ela faz antes de dizer o nome; nunca dois nomes
técnicos na mesma frase.

**Pauta inicial** (séries funcionam melhor que temas soltos):
- *Casa por dentro*: tesoura de telhado ✅, fundação (sapata × radier × estaca), viga e pilar, laje, por que o
  concreto leva ferro, caixa d'água e pressão, disjuntor e DR, aterramento, sifão do ralo (por que não fede).
- *Tecnologia invisível*: Bluetooth (salto de frequência), Wi-Fi, GPS (trilateração), chip do cartão e
  pagamento por aproximação (NFC), carregador por indução, touchscreen capacitivo, QR code.
- *Engenharia grande*: ponte estaiada, por que prédios balançam, elevador e contrapeso, represa, avião e sustentação.
- *Curiosidades*: por que o vidro do carro estilhaça em cubinhos, por que a ponte tem junta de dilatação,
  por que o pneu é preto.

**Publicação**: o mesmo MP4 serve para Reels, TikTok e Shorts. Na legenda do post, repita a pergunta-gancho e
termine com "qual eu explico depois?" para puxar comentários e sugestões de pauta.

**Área segura**: nada importante abaixo de y≈1650 nem colado na borda direita, onde ficam os botões dos apps.

## Antes de publicar
- Revise os números de cada roteiro. No EP.01: telha cerâmica ≈ 45–55 kg/m² (molhada) e ≈ 100 m² de
  telhado numa casa térrea comum.
- Se usar trilha sonora, use música livre de direitos (biblioteca do próprio app ou YouTube Audio Library) e
  deixe a narração em primeiro plano.
