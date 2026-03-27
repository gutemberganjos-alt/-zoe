// ===== CONFIGURAÇÃO =====
// ⚠️ A chave API é carregada de variáveis de ambiente (seguro!)

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// ===== PLANOS =====
const PLANOS = {
  gratis: { nome: "Gratuito", limite: 3 },
  essencial: { nome: "Essencial", limite: 10 },
  ilimitado: { nome: "Ilimitado", limite: 999999 }
};

// ===== ESTADO =====
let currentType = "mensagem";
let currentAudience = "geral";
let currentVersao = "ARC";
let currentQuickType = "";
let resultados = { gerar: "", exegese: "", estudos: "" };
let planoAtual = "essencial";

// ===== INICIAR APP =====
window.addEventListener("load", () => {
  setTimeout(() => {
    const splash = document.getElementById("splash");
    splash.style.opacity = "0";
    setTimeout(() => {
      splash.style.display = "none";
      document.getElementById("app").classList.remove("hidden");
      initApp();
    }, 600);
  }, 2500);
});

function initApp() {
  atualizarSaudacao();
  atualizarUso();
  renderHomeSalvos();
  atualizarVersiculoDia();
}

// ===== SAUDAÇÃO =====
function atualizarSaudacao() {
  const hora = new Date().getHours();
  let saudacao = "Bom dia! 👋";
  let sub = "Que a Palavra ilumine seu ministério hoje.";
  if (hora >= 12 && hora < 18) {
    saudacao = "Boa tarde! 👋";
    sub = "Que Deus abençoe seu estudo esta tarde.";
  } else if (hora >= 18) {
    saudacao = "Boa noite! 👋";
    sub = "Preparando a Palavra para amanhã? Ótimo!";
  }
  document.getElementById("greeting").textContent = saudacao;
  document.getElementById("greeting-sub").textContent = sub;
}

// ===== VERSÍCULO DO DIA =====
function atualizarVersiculoDia() {
  const versiculos = [
    '"Lâmpada para os meus pés é tua palavra e luz para o meu caminho." — Salmos 119:105',
    '"No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus." — João 1:1',
    '"Toda a Escritura é inspirada por Deus e útil para o ensino." — 2 Timóteo 3:16',
    '"Esforça-te e tem bom ânimo; não pasmes, nem te espantes." — Josué 1:9',
    '"O Senhor é o meu pastor e nada me faltará." — Salmos 23:1',
    '"Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito." — João 3:16',
    '"Sede fortes e corajosos. Não temais." — Deuteronômio 31:6',
    '"Confia no Senhor de todo o teu coração." — Provérbios 3:5'
  ];
  const hoje = new Date().getDay();
  document.getElementById("versiculo-dia").textContent = versiculos[hoje];
}

// ===== CONTROLE DE USO =====
function getUsoHoje() {
  const hoje = new Date().toDateString();
  const uso = JSON.parse(localStorage.getItem("zoe-uso") || "{}");
  if (uso.data !== hoje) return 0;
  return uso.count || 0;
}

function incrementarUso() {
  const hoje = new Date().toDateString();
  const count = getUsoHoje() + 1;
  localStorage.setItem("zoe-uso", JSON.stringify({ data: hoje, count }));
  atualizarUso();
}

function atualizarUso() {
  const uso = getUsoHoje();
  const limite = PLANOS[planoAtual].limite;
  const nome = PLANOS[planoAtual].nome;
  const pct = Math.min((uso / limite) * 100, 100);

  const textoLimite = limite >= 999999 ? "ilimitado" : `de ${limite}`;
  document.getElementById("uso-texto").textContent = `${uso}/${limite >= 999999 ? "∞" : limite} hoje`;
  document.getElementById("uso-count").textContent = `${uso} ${textoLimite} gerações`;
  document.getElementById("uso-fill").style.width = `${pct}%`;
  document.getElementById("uso-plano").textContent = `Plano ${nome}`;
}

function verificarLimite() {
  const uso = getUsoHoje();
  const limite = PLANOS[planoAtual].limite;
  if (uso >= limite) {
    document.getElementById("modal-limite").classList.remove("hidden");
    return false;
  }
  return true;
}

// ===== NAVEGAÇÃO =====
function showSection(name) {
  document.querySelectorAll(".section").forEach(s => {
    s.classList.add("hidden");
    s.classList.remove("active");
  });
  document.querySelectorAll(".bnav-btn").forEach(b => b.classList.remove("active"));

  const sec = document.getElementById(`section-${name}`);
  if (sec) {
    sec.classList.remove("hidden");
    sec.classList.add("active");
  }

  const btn = document.querySelector(`[data-section="${name}"]`);
  if (btn) btn.classList.add("active");

  if (name === "salvos") renderSalvos();
  if (name === "home") renderHomeSalvos();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== CHIPS =====
function selectChip(btn, group) {
  document.querySelectorAll(`[data-${group}]`).forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  if (group === "type") currentType = btn.dataset.type;
  if (group === "audience") currentAudience = btn.dataset.audience;
  if (group === "versao") currentVersao = btn.dataset.versao;
}

// ===== CHAMAR GEMINI =====
async function callGemini(prompt) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
    })
  });
  if (!res.ok) throw new Error("Erro API: " + res.status);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

// ===== GERAR CONTEÚDO =====
async function generateContent() {
  const tema = document.getElementById("input-tema").value.trim();
  if (!tema) { showToast("⚠️ Digite um texto, tema ou palavra"); return; }
  if (!verificarLimite()) return;

  const nivel = document.getElementById("nivel").value;
  const nivelTexto = nivel == 1 ? "simples e acessível para todos" : nivel == 2 ? "intermediário com detalhes teológicos" : "profundo com análise teológica e exegética completa";

  const publicos = {
    geral: "congregação geral de uma igreja evangélica",
    celula: "grupo de célula (10-20 pessoas em ambiente familiar e acolhedor)",
    jovens: "jovens cristãos de 18-30 anos com linguagem contemporânea",
    adolescentes: "adolescentes de 12-17 anos com linguagem moderna e dinâmica",
    pastores: "pastores e líderes ministeriais com vocabulário teológico",
    academico: "contexto acadêmico teológico com rigor científico",
    infantil: "crianças de 6-12 anos com linguagem simples e ilustrações",
    idosos: "terceira idade com linguagem respeitosa e reflexiva"
  };

  const tipos = {
    mensagem: "mensagem de pregação completa com introdução cativante, 3 pontos desenvolvidos e conclusão com apelo",
    estudo: "estudo bíblico interativo com contexto, desenvolvimento e perguntas de reflexão",
    devocional: "devocional de 5 minutos com reflexão pessoal e oração",
    celula: "dinâmica de célula com quebra-gelo, estudo, discussão em grupo e oração final",
    esboco: "esboço pastoral detalhado com pontos, subpontos e ilustrações",
    academico: "artigo teológico acadêmico com introdução, desenvolvimento, conclusão e referências"
  };

  const prompt = `Você é um teólogo conservador, reformado e biblicamente fiel. Sua missão é gerar conteúdo sólido baseado EXCLUSIVAMENTE nas Escrituras com hermenêutica histórico-gramatical.

TAREFA: Criar ${tipos[currentType]} sobre: "${tema}"
PÚBLICO: ${publicos[currentAudience]}
NÍVEL: ${nivelTexto}
VERSÃO DA BÍBLIA: ${currentVersao}

REGRAS OBRIGATÓRIAS:
1. Baseie-se SOMENTE na Bíblia como regra de fé (Sola Scriptura)
2. Use no mínimo 6 referências bíblicas relevantes na versão ${currentVersao}
3. Se houver conexão com heresias ou falsas doutrinas, coloque: 🛡️ ALERTA DOUTRINÁRIO: [explicação]
4. Mantenha linguagem adequada ao público especificado
5. JAMAIS use teologia da prosperidade, liberalismo teológico ou misticismo não bíblico
6. Use títulos com ## e subtítulos com ###
7. Ao final coloque "## 📚 REFERÊNCIAS BÍBLICAS" com todos os versículos usados
8. Ao final coloque "## 💡 DICA PASTORAL" com orientação prática

Gere o conteúdo completo agora:`;

  showLoading("Consultando as Escrituras...");
  try {
    const result = await callGemini(prompt);
    resultados.gerar = result;
    incrementarUso();
    document.getElementById("resultado-titulo").textContent = `${tema}`;
    document.getElementById("resultado-gerar-content").innerHTML = formatarTexto(result);
    document.getElementById("resultado-gerar").classList.remove("hidden");
    document.getElementById("resultado-gerar").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    showToast("❌ Erro ao gerar. Verifique sua API Key.");
    console.error(e);
  } finally {
    hideLoading();
  }
}

// ===== EXEGESE =====
async function generateExegese() {
  const passagem = document.getElementById("input-exegese").value.trim();
  if (!passagem) { showToast("⚠️ Digite uma passagem bíblica"); return; }
  if (!verificarLimite()) return;

  const partes = [];
  if (document.getElementById("c1").checked) partes.push("## 📜 CONTEXTO HISTÓRICO-CULTURAL\nExplique o contexto histórico, geográfico e cultural detalhadamente.");
  if (document.getElementById("c2").checked) partes.push("## 🔤 PALAVRAS NO IDIOMA ORIGINAL\nIdentifique palavras-chave em hebraico/grego com transliteração fonética e significado profundo.");
  if (document.getElementById("c3").checked) partes.push("## 🏗️ ESTRUTURA LITERÁRIA\nAnalise o gênero literário, estrutura narrativa e recursos retóricos.");
  if (document.getElementById("c4").checked) partes.push("## ✝️ TEOLOGIA DO TEXTO\nDesenvolva as principais verdades teológicas desta passagem.");
  if (document.getElementById("c5").checked) partes.push("## 🛡️ ERROS DOUTRINÁRIOS COMUNS\nListe erros e falsas doutrinas sobre esta passagem. Cite grupos específicos e refute biblicamente.");
  if (document.getElementById("c6").checked) partes.push("## 🔗 REFERÊNCIAS CRUZADAS\nListe 8-10 passagens relacionadas com breve explicação de cada conexão.");
  if (document.getElementById("c7").checked) partes.push("## 💡 APLICAÇÃO PRÁTICA\nComo esta verdade se aplica à vida cristã e ao ministério hoje?");

  const prompt = `Você é um exegeta bíblico conservador com formação em hebraico, grego e teologia histórica reformada.

Realize análise exegética completa de: "${passagem}"

${partes.join("\n\n")}

IMPORTANTE: Use hermenêutica histórico-gramatical. Seja fiel ao texto. Nunca use alegorização sem base textual sólida.`;

  showLoading("Analisando o texto original...");
  try {
    const result = await callGemini(prompt);
    resultados.exegese = result;
    incrementarUso();
    document.getElementById("resultado-exegese-content").innerHTML = formatarTexto(result);
    document.getElementById("resultado-exegese").classList.remove("hidden");
    document.getElementById("resultado-exegese").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    showToast("❌ Erro ao analisar.");
    console.error(e);
  } finally {
    hideLoading();
  }
}

// ===== ESTUDOS RÁPIDOS =====
const quickConfig = {
  heresias: {
    title: "🛡️ Detector de Heresias",
    desc: "Digite uma doutrina ou ensinamento para verificar se é bíblico:",
    placeholder: "Ex: A prosperidade é direito do crente / Jesus era apenas um profeta",
    prompt: (i) => `Analise este ensinamento como teólogo conservador: "${i}"\n\n## ✅ VEREDICTO: [BÍBLICO / HERESIA / PARCIALMENTE CORRETO]\n## 📖 O QUE A BÍBLIA DIZ\n## 🛡️ ONDE ESTÁ O ERRO (se houver)\n## 📚 TEXTOS QUE CONFIRMAM OU REFUTAM\n## ⚠️ ORIGEM HISTÓRICA DESTE ERRO\n## 💡 COMO RESPONDER COM AMOR E FIRMEZA`
  },
  palavra: {
    title: "🔤 Estudo de Palavra",
    desc: "Digite uma palavra bíblica para pesquisa profunda:",
    placeholder: "Ex: Graça / Redenção / Arrependimento / Santificação",
    prompt: (i) => `Estudo completo da palavra bíblica: "${i}"\n\n## 📖 SIGNIFICADO ORIGINAL (hebraico e/ou grego)\n## 🔄 USOS NA BÍBLIA (principais contextos)\n## ✝️ SIGNIFICADO TEOLÓGICO\n## 📋 5 VERSÍCULOS-CHAVE com comentário\n## 💡 APLICAÇÃO PRÁTICA\n## ⚠️ ERROS COMUNS SOBRE ESTE CONCEITO`
  },
  personagem: {
    title: "👤 Personagem Bíblico",
    desc: "Digite o nome de um personagem bíblico:",
    placeholder: "Ex: Moisés / Paulo / Maria / Davi / Ester / Daniel",
    prompt: (i) => `Estudo completo do personagem bíblico: "${i}"\n\n## 👤 IDENTIDADE E CONTEXTO\n## 📖 CHAMADO E MISSÃO\n## ⚔️ DESAFIOS E PROVAÇÕES\n## ✅ VIRTUDES A IMITAR\n## ❌ ERROS E COMO DEUS LIDOU\n## ✝️ COMO APONTA PARA CRISTO\n## 💡 LIÇÕES PARA HOJE`
  },
  comparativo: {
    title: "⚖️ AT vs NT",
    desc: "Digite um tema para comparar nos dois testamentos:",
    placeholder: "Ex: Sacrifício / Sacerdócio / Lei / Aliança / Templo / Oração",
    prompt: (i) => `Compare o tema "${i}" no Antigo e Novo Testamento:\n\n## 📜 NO ANTIGO TESTAMENTO\n## ✝️ NO NOVO TESTAMENTO\n## 🔗 A CONEXÃO TEOLÓGICA\n## 💡 O QUE ENSINA HOJE\n## 📚 REFERÊNCIAS-CHAVE`
  },
  refutacao: {
    title: "🗡️ Refutação Bíblica",
    desc: "Digite uma objeção ou argumento para responder biblicamente:",
    placeholder: "Ex: A Bíblia foi alterada / Todas religiões levam a Deus",
    prompt: (i) => `Como responder biblicamente: "${i}"\n\n## 🔍 ENTENDENDO O ARGUMENTO\n## ✝️ RESPOSTA BÍBLICA (com versículos)\n## 📜 RESPOSTA HISTÓRICA E RACIONAL\n## 🗡️ ARGUMENTOS PRINCIPAIS\n## 💡 COMO DIALOGAR COM AMOR E FIRMEZA`
  },
  series: {
    title: "📅 Série de Mensagens",
    desc: "Digite um tema ou livro bíblico para criar uma série:",
    placeholder: "Ex: Família cristã / Livro de Tiago / Identidade em Cristo",
    prompt: (i) => `Crie série completa sobre: "${i}"\n\nPara cada mensagem inclua: título criativo, texto base, objetivo, esboço com 3 pontos, versículo-chave.\n\nGere 5 mensagens completas. Ao final sugira nome criativo para a série.`
  },
  parabola: {
    title: "📿 Estudo de Parábola",
    desc: "Digite o nome de uma parábola:",
    placeholder: "Ex: O Filho Pródigo / O Bom Samaritano / Os Talentos",
    prompt: (i) => `Análise completa da parábola: "${i}"\n\n## 📖 CONTEXTO E OCASIÃO\n## 👥 PERSONAGENS E SIGNIFICADOS\n## 🎯 MENSAGEM CENTRAL\n## ✝️ ENSINOS TEOLÓGICOS\n## ⚠️ INTERPRETAÇÕES ERRADAS\n## 💡 APLICAÇÃO PRÁTICA`
  },
  geografia: {
    title: "🗺️ Geografia Bíblica",
    desc: "Digite um lugar ou região bíblica:",
    placeholder: "Ex: Jerusalém / Babilônia / Mar da Galileia / Monte Sinai",
    prompt: (i) => `Contexto geográfico bíblico de: "${i}"\n\n## 🗺️ LOCALIZAÇÃO E DESCRIÇÃO\n## 📜 IMPORTÂNCIA HISTÓRICA\n## ✝️ EVENTOS BÍBLICOS IMPORTANTES\n## 🔗 SIGNIFICADO TEOLÓGICO\n## 💡 RELEVÂNCIA PARA HOJE`
  }
};

function quickStudy(type) {
  currentQuickType = type;
  const config = quickConfig[type];
  document.getElementById("quick-title").textContent = config.title;
  document.getElementById("quick-desc").textContent = config.desc;
  document.getElementById("quick-input").placeholder = config.placeholder;
  document.getElementById("quick-input").value = "";
  document.getElementById("quick-form").classList.remove("hidden");
  document.getElementById("resultado-estudos").classList.add("hidden");
  setTimeout(() => {
    document.getElementById("quick-form").scrollIntoView({ behavior: "smooth" });
  }, 100);
}

async function executeQuickStudy() {
  const input = document.getElementById("quick-input").value.trim();
  if (!input) { showToast("⚠️ Digite algo para pesquisar"); return; }
  if (!verificarLimite()) return;

  const config = quickConfig[currentQuickType];
  const prompt = config.prompt(input);

  showLoading("Pesquisando nas Escrituras...");
  try {
    const result = await callGemini(prompt);
    resultados.estudos = result;
    incrementarUso();
    document.getElementById("resultado-estudos-titulo").textContent = `${config.title} — ${input}`;
    document.getElementById("resultado-estudos-content").innerHTML = formatarTexto(result);
    document.getElementById("resultado-estudos").classList.remove("hidden");
    document.getElementById("resultado-estudos").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    showToast("❌ Erro ao gerar estudo.");
    console.error(e);
  } finally {
    hideLoading();
  }
}

// ===== REFINAR =====
function showRefinar(section) {
  const el = document.getElementById(`refinar-${section}`);
  el.classList.toggle("hidden");
}

async function refinarResult(section) {
  const instrucao = document.getElementById(`refinar-${section}-input`).value.trim();
  if (!instrucao) { showToast("⚠️ Digite como deseja refinar"); return; }
  if (!verificarLimite()) return;

  const original = resultados[section];
  const prompt = `Aqui está um conteúdo bíblico gerado anteriormente:\n\n${original}\n\nRefine este conteúdo com a seguinte instrução: "${instrucao}"\n\nMantenha a base bíblica e conservadora. Retorne o conteúdo completo refinado.`;

  showLoading("Refinando o conteúdo...");
  try {
    const result = await callGemini(prompt);
    resultados[section] = result;
    incrementarUso();
    document.getElementById(`resultado-${section}-content`).innerHTML = formatarTexto(result);
    document.getElementById(`refinar-${section}`).classList.add("hidden");
    showToast("✅ Conteúdo refinado!");
  } catch (e) {
    showToast("❌ Erro ao refinar.");
  } finally {
    hideLoading();
  }
}

// ===== FORMATAR TEXTO =====
function formatarTexto(text) {
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

// ===== SALVAR =====
function salvarEstudo(titulo, conteudo, tipo) {
  const salvos = JSON.parse(localStorage.getItem("zoe-salvos") || "[]");
  salvos.unshift({
    id: Date.now(),
    titulo,
    conteudo,
    tipo,
    data: new Date().toLocaleDateString("pt-BR"),
    publico: currentAudience
  });
  localStorage.setItem("zoe-salvos", JSON.stringify(salvos.slice(0, 100)));
  showToast("✅ Estudo salvo com sucesso!");
  renderHomeSalvos();
}

function saveResult(section) {
  let titulo = "";
  if (section === "gerar") titulo = document.getElementById("resultado-titulo").textContent;
  if (section === "exegese") titulo = "Exegese: " + document.getElementById("input-exegese").value;
  if (section === "estudos") titulo = document.getElementById("resultado-estudos-titulo").textContent;
  salvarEstudo(titulo, resultados[section], section);
}

// ===== RENDERIZAR SALVOS =====
function renderSalvos(filtroTipo = "todos", busca = "") {
  const salvos = JSON.parse(localStorage.getItem("zoe-salvos") || "[]");
  const container = document.getElementById("lista-salvos");

  let filtrados = salvos;
  if (filtroTipo !== "todos") filtrados = filtrados.filter(s => s.tipo === filtroTipo);
  if (busca) filtrados = filtrados.filter(s => s.titulo.toLowerCase().includes(busca.toLowerCase()));

  if (filtrados.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>📭 Nenhum estudo encontrado.</p><p>Gere um conteúdo e clique em 💾 para salvar.</p></div>`;
    return;
  }

  container.innerHTML = filtrados.map(s => `
    <div class="salvo-item">
      <div class="salvo-top">
        <div>
          <div class="salvo-titulo">${s.titulo}</div>
          <div class="salvo-meta">📅 ${s.data} · 🏷️ ${s.tipo}</div>
        </div>
        <div class="salvo-acoes">
          <button class="btn-ver" onclick="verSalvo(${s.id})">👁 Ver</button>
          <button class="btn-del" onclick="deletarSalvo(${s.id})">🗑</button>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn-secondary" style="font-size:12px;padding:6px 10px" onclick="downloadPDFSalvo(${s.id})">📄 PDF</button>
        <button class="btn-secondary" style="font-size:12px;padding:6px 10px" onclick="printSalvo(${s.id})">🖨️ Imprimir</button>
        <button class="btn-secondary" style="font-size:12px;padding:6px 10px" onclick="compartilharSalvo(${s.id})">📤 Enviar</button>
      </div>
    </div>
  `).join("");
}

function renderHomeSalvos() {
  const salvos = JSON.parse(localStorage.getItem("zoe-salvos") || "[]");
  const container = document.getElementById("home-salvos");
  if (salvos.length === 0) {
    container.innerHTML = `<div class="empty-mini">Nenhum estudo salvo ainda.</div>`;
    return;
  }
  container.innerHTML = salvos.slice(0, 3).map(s => `
    <div class="salvo-item" style="margin-bottom:8px">
      <div class="salvo-top">
        <div>
          <div class="salvo-titulo">${s.titulo}</div>
          <div class="salvo-meta">📅 ${s.data}</div>
        </div>
        <button class="btn-ver" onclick="verSalvo(${s.id})">👁 Ver</button>
      </div>
    </div>
  `).join("");
}

function verSalvo(id) {
  const salvos = JSON.parse(localStorage.getItem("zoe-salvos") || "[]");
  const s = salvos.find(x => x.id === id);
  if (!s) return;
  resultados.gerar = s.conteudo;
  document.getElementById("resultado-titulo").textContent = s.titulo;
  document.getElementById("resultado-gerar-content").innerHTML = formatarTexto(s.conteudo);
  document.getElementById("resultado-gerar").classList.remove("hidden");
  showSection("gerar");
}

function deletarSalvo(id) {
  let salvos = JSON.parse(localStorage.getItem("zoe-salvos") || "[]");
  salvos = salvos.filter(s => s.id !== id);
  localStorage.setItem("zoe-salvos", JSON.stringify(salvos));
  renderSalvos();
  showToast("🗑️ Estudo excluído");
}

function filtrarSalvos() {
  const busca = document.getElementById("busca-salvos").value;
  const filtro = document.querySelector("[data-filtro].active")?.dataset.filtro || "todos";
  renderSalvos(filtro, busca);
}

function filtrarPorTipo(btn) {
  document.querySelectorAll("[data-filtro]").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  filtrarSalvos();
}

// ===== PDF =====
function gerarPDF(titulo, htmlContent) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const texto = htmlContent.replace(/<[^>]+>/g, '').replace(/\n+/g, '\n');
  const linhas = doc.splitTextToSize(texto, 175);

  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text("+ZOE — Estudo Bíblico", 15, 18);

  doc.setFontSize(13);
  doc.setTextColor(200, 150, 12);
  doc.text(titulo.substring(0, 80), 15, 28);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(linhas, 15, 38);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Gerado por +ZOE — Estudo Bíblico Inteligente", 15, 285);

  doc.save(titulo.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 40) + ".pdf");
  showToast("📄 PDF baixado!");
}

function downloadPDF(section) {
  let titulo = "";
  if (section === "gerar") titulo = document.getElementById("resultado-titulo").textContent;
  if (section === "exegese") titulo = "Exegese - " + document.getElementById("input-exegese").value;
  if (section === "estudos") titulo = document.getElementById("resultado-estudos-titulo").textContent;
  gerarPDF(titulo, document.getElementById(`resultado-${section}-content`).innerHTML);
}

function downloadPDFSalvo(id) {
  const salvos = JSON.parse(localStorage.getItem("zoe-salvos") || "[]");
  const s = salvos.find(x => x.id === id);
  if (s) gerarPDF(s.titulo, formatarTexto(s.conteudo));
}

// ===== IMPRIMIR =====
function printContent(titulo, htmlContent) {
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>${titulo}</title>
    <style>
      body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#000;font-size:12pt}
      h1{color:#1E3A5F;border-bottom:2px solid #C8960C;padding-bottom:8px}
      h2{color:#1E3A5F;margin-top:20px}
      h3{color:#2A4F7F}
      strong{color:#1E3A5F}
      .rodape{margin-top:40px;color:#999;font-size:9pt;border-top:1px solid #eee;padding-top:10px}
    </style></head>
    <body>
      <h1>✝ +ZOE — ${titulo}</h1>
      ${htmlContent}
      <div class="rodape">Gerado por +ZOE — Estudo Bíblico Inteligente | ${new Date().toLocaleDateString("pt-BR")}</div>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function printResult(section) {
  let titulo = "";
  if (section === "gerar") titulo = document.getElementById("resultado-titulo").textContent;
  if (section === "exegese") titulo = "Exegese - " + document.getElementById("input-exegese").value;
  if (section === "estudos") titulo = document.getElementById("resultado-estudos-titulo").textContent;
  printContent(titulo, document.getElementById(`resultado-${section}-content`).innerHTML);
}

function printSalvo(id) {
  const salvos = JSON.parse(localStorage.getItem("zoe-salvos") || "[]");
  const s = salvos.find(x => x.id === id);
  if (s) printContent(s.titulo, formatarTexto(s.conteudo));
}

// ===== COMPARTILHAR =====
function shareContent(titulo, htmlContent) {
  const texto = htmlContent.replace(/<[^>]+>/g, '').substring(0, 800) + "...\n\n📖 Gerado por +ZOE — Estudo Bíblico Inteligente";
  if (navigator.share) {
    navigator.share({ title: titulo, text: texto });
  } else {
    navigator.clipboard.writeText(texto).then(() => showToast("📋 Copiado para compartilhar!"));
  }
}

function shareResult(section) {
  let titulo = "";
  if (section === "gerar") titulo = document.getElementById("resultado-titulo").textContent;
  if (section === "exegese") titulo = "Análise Exegética";
  if (section === "estudos") titulo = document.getElementById("resultado-estudos-titulo").textContent;
  shareContent(titulo, document.getElementById(`resultado-${section}-content`).innerHTML);
}

function compartilharSalvo(id) {
  const salvos = JSON.parse(localStorage.getItem("zoe-salvos") || "[]");
  const s = salvos.find(x => x.id === id);
  if (s) shareContent(s.titulo, formatarTexto(s.conteudo));
}

// ===== COPIAR =====
function copyResult(section) {
  const html = document.getElementById(`resultado-${section}-content`).innerHTML;
  const texto = html.replace(/<[^>]+>/g, '');
  navigator.clipboard.writeText(texto).then(() => showToast("📋 Copiado!"));
}

// ===== ASSINATURA =====
function assinar(plano) {
  const numero = "5500000000000";
  const msg = encodeURIComponent(`Olá! Quero assinar o plano ${plano} do +ZOE — Estudo Bíblico Inteligente.`);
  window.open(`https://wa.me/${numero}?text=${msg}`, "_blank");
}

// ===== MODAL =====
function closeModal() {
  document.getElementById("modal-limite").classList.add("hidden");
}

// ===== LOADING =====
function showLoading(msg = "Processando...") {
  document.getElementById("loading-msg").textContent = msg;
  document.getElementById("loading").classList.remove("hidden");
}
function hideLoading() {
  document.getElementById("loading").classList.add("hidden");
}

// ===== TOAST =====
function showToast(msg, dur = 3000) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), dur);
}
