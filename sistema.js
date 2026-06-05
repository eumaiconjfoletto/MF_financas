/* ==========================================================================
   CONFIGURAÇÃO CENTRAL E INSTÂNCIA DO SUPABASE
   ========================================================================== */
const SUPABASE_URL = "https://hrdtylxfkcsgyhghhptr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZHR5bHhma2NzZ3loZ2hocHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODc3NzksImV4cCI6MjA5NTU2Mzc3OX0.DwnwVrOcYfTeiz18BJEvCipoeDUQ4t_dg3biuCtIe94";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ==========================================================================
   ESTADO GLOBAL DA APLICAÇÃO (SPA CACHE)
   ========================================================================== */
let charts = {};
let categoriasCache = [];
let contasCache = [];
let veiculosCache = [];

/* ==========================================================================
   SEGURANÇA E CONTEXTO DE SESSÃO
   ========================================================================== */
function checkAuth() {
    const user = localStorage.getItem("mf_usuario");
    if (!user) {
        window.location.href = "index.html";
        return null;
    }
    return JSON.parse(user);
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

/* ==========================================================================
   ROTEADOR DA SPA (SINGLE PAGE APPLICATION ROUTER)
   ========================================================================== */
function initRouter() {
    const menuLinks = document.querySelectorAll(".sidebar-menu .menu-link");

    menuLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetView = link.getAttribute("data-target");
            if (!targetView) return;

            menuLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active-view"));
            document.getElementById(`view-${targetView}`).classList.add("active-view");

            handleViewLoad(targetView);
        });
    });
}

// Gatilho assíncrono para recarregar dados específicos ao entrar na tela ativa
async function handleViewLoad(viewId) {
    await carregarCachesAuxiliares();
    
    switch(viewId) {
        case "dashboard":
            loadKPIs();
            loadCharts();
            break;
        case "lancamentos":
            renderizarSeletoresFormLancamento();
            listarLancamentos();
            break;
        case "assinaturas":
            listarAssinaturas();
            break;
        case "contas":
            listarContas();
            break;
        case "categorias":
            listarCategorias();
            break;
        case "fornecedores":
            listarFornecedores();
            break;
        case "veiculos":
            listarVeiculos();
            break;
        case "despesas-veiculos":
            renderizarSeletorVeiculosDespesa();
            listarDespesasVeiculos();
            break;
        case "configuracoes":
            listarUsuarios();
            break;
    }
}

/* ==========================================================================
   CARREGAMENTO DE DATA CACHES (Evita requisições redundantes no banco)
   ========================================================================== */
async function carregarCachesAuxiliares() {
    try {
        const [catRes, conRes, veiRes] = await Promise.all([
            supabaseClient.from("categorias").select("*"),
            supabaseClient.from("contas").select("*"),
            supabaseClient.from("veiculos").select("*")
        ]);
        categoriasCache = catRes.data || [];
        contasCache = conRes.data || [];
        veiculosCache = veiRes.data || [];
    } catch (e) {
        console.error("Erro ao sincronizar caches operacionais:", e);
    }
}

/* ==========================================================================
   BLOCO 1: DASHBOARD ANALÍTICO (FILTROS DINÂMICOS & KPIs)
   ========================================================================== */
async function loadKPIs() {
    try {
        const { data: assinaturas } = await supabaseClient.from("assinaturas").select("*");
        const { count: frotaCount } = await supabaseClient.from("veiculos").select("*", { count: "exact", head: true });
        const { count: usuariosCount } = await supabaseClient.from("usuarios").select("*", { count: "exact", head: true });

        let totalCusto = (assinaturas || []).reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

        document.getElementById("kpi-assinaturas").innerText = assinaturas?.length || 0;
        document.getElementById("kpi-custo").innerText = brl(totalCusto);
        document.getElementById("kpi-frota").innerText = frotaCount || 0;
        document.getElementById("kpi-usuarios").innerText = usuariosCount || 0;
    } catch (err) {
        console.error("Erro KPIs:", err);
    }
}

async function loadCharts() {
    try {
        const ano = document.getElementById("dash-filter-ano").value;
        const mes = document.getElementById("dash-filter-mes").value;

        let query = supabaseClient.from("lancamentos").select("*");
        
        // Aplicação dinâmica de filtros customizáveis baseada na escolha do usuário
        if (mes !== "todos") {
            const dataInicio = `${ano}-${mes}-01`;
            const dataFim = `${ano}-${mes}-31`;
            query = query.gte("data", dataInicio).lte("data", dataFim);
        } else {
            query = query.gte("data", `${ano}-01-01`).lte("data", `${ano}-12-31`);
        }

        const { data: lancamentos } = await query;
        const segmentMap = {};
        const paymentMap = {};

        (lancamentos || []).forEach(l => {
            const val = Number(l.valor || 0);
            const catNome = categoriasCache.find(c => c.id === l.categoria_id)?.nome || "Não Classificado";
            const contaNome = contasCache.find(c => c.id === l.conta_id)?.nome || "Geral";

            segmentMap[catNome] = (segmentMap[catNome] || 0) + val;
            paymentMap[contaNome] = (paymentMap[contaNome] || 0) + val;
        });

        renderBarChart("chartSegmento", segmentMap);
        renderDoughnutChart("chartPagamento", paymentMap);
    } catch (err) {
        console.error("Erro Charts:", err);
    }
}

function renderBarChart(id, dataObj) {
    if (charts[id]) charts[id].destroy();
    const ctx = document.getElementById(id);
    if (!ctx) return;

    const accentColor = getComputedStyle(document.body).getPropertyValue('--accent-color').trim() || "#ff7300";

    charts[id] = new Chart(ctx, {
        type: "bar",
        data: {
            labels: Object.keys(dataObj),
            datasets: [{
                data: Object.values(dataObj),
                backgroundColor: accentColor + "dc",
                borderColor: accentColor,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#888" } },
                y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#888", callback: v => brl(v) } }
            }
        }
    });
}

function renderDoughnutChart(id, dataObj) {
    if (charts[id]) charts[id].destroy();
    const ctx = document.getElementById(id);
    if (!ctx) return;

    const accentColor = getComputedStyle(document.body).getPropertyValue('--accent-color').trim() || "#ff7300";

    charts[id] = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: Object.keys(dataObj),
            datasets: [{
                data: Object.values(dataObj),
                backgroundColor: [accentColor, "#38bdf8", "#34d399", "#a78bfa", "#f43f5e"],
                borderColor: "var(--card-bg)",
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "right", labels: { color: "#aaa", font: { size: 11 } } } }
        }
    });
}

/* ==========================================================================
   BLOCO 2: LANÇAMENTOS CORE & INTEGRAÇÃO DE FROTA
   ========================================================================== */
function renderizarSeletoresFormLancamento() {
    const catSel = document.getElementById("lanc-categoria");
    const conSel = document.getElementById("lanc-conta");
    
    catSel.innerHTML = '<option value="">Categoria...</option>';
    conSel.innerHTML = '<option value="">Conta/Cartão...</option>';

    categoriasCache.forEach(c => catSel.innerHTML += `<option value="${c.id}">${c.nome}</option>`);
    contasCache.forEach(c => conSel.innerHTML += `<option value="${c.id}">${c.nome}</option>`);
}

async function salvarLancamento(e) {
    e.preventDefault();
    const payload = {
        descricao: document.getElementById("lanc-descricao").value,
        valor: parseFloat(document.getElementById("lanc-valor").value),
        data: document.getElementById("lanc-data").value,
        tipo: document.getElementById("lanc-tipo").value,
        categoria_id: document.getElementById("lanc-categoria").value,
        conta_id: document.getElementById("lanc-conta").value
    };

    await supabaseClient.from("lancamentos").insert([payload]);
    document.getElementById("form-lancamento").reset();
    listarLancamentos();
}

async function listarLancamentos() {
    const { data } = await supabaseClient.from("lancamentos").select("*").order("data", { ascending: false });
    const tbody = document.getElementById("table-lancamentos-body");
    tbody.innerHTML = "";

    (data || []).forEach(l => {
        const cNome = categoriasCache.find(c => c.id === l.categoria_id)?.nome || "-";
        const coNome = contasCache.find(c => c.id === l.conta_id)?.nome || "-";
        tbody.innerHTML += `
            <tr>
                <td>${fmtData(l.data)}</td>
                <td>${l.descricao}</td>
                <td><span class="badge ${l.tipo === 'receita' ? 'badge-success' : 'badge-danger'}">${l.tipo}</span></td>
                <td>${cNome}</td>
                <td>${coNome}</td>
                <td style="font-weight:600; color:${l.tipo === 'receita' ? '#34d399':'#f43f5e'}">${brl(l.valor)}</td>
                <td><button class="btn btn-danger" style="padding:2px 6px" onclick="deletarGeral('lancamentos', '${l.id}', listarLancamentos)">✖</button></td>
            </tr>`;
    });
}

// INTEGRAÇÃO EXCLUSIVA: Importa os dados inseridos na aba Veículos diretamente para o Livro Caixa Financeiro
async function importarDespesasDaFrota() {
    const { data: despesasV } = await supabaseClient.from("veiculo_despesas").select("*").eq("importado", false);
    
    if(!despesasV || despesasV.length === 0) {
        alert("Nenhuma despesa de frota nova encontrada para importação.");
        return;
    }

    // Busca uma categoria genérica de Veículos ou cria/mapeia dinamicamente
    let catVeiculo = categoriasCache.find(c => c.nome.toLowerCase().includes("veícul") || c.nome.toLowerCase().includes("frota"));
    let contaPadrao = contasCache[0];

    for(let dv of despesasV) {
        const vModelo = veiculosCache.find(v => v.id === dv.veiculo_id)?.modelo || "Veículo";
        await supabaseClient.from("lancamentos").insert([{
            descricao: `[FROTA] ${vModelo} - ${dv.descricao}`,
            valor: dv.valor,
            data: dv.data,
            tipo: 'despesa',
            categoria_id: catVeiculo ? catVeiculo.id : null,
            conta_id: contaPadrao ? contaPadrao.id : null
        }]);

        // Atualiza a flag na tabela de despesas de veículos para evitar redundância
        await supabaseClient.from("veiculo_despesas").update({ importado: true }).eq("id", dv.id);
    }
    
    alert(`${despesasV.length} despesas da frota importadas com sucesso!`);
    listarLancamentos();
}

/* ==========================================================================
   BLOCO 3: ASSINATURAS
   ========================================================================== */
async function salvarAssinatura(e){
    e.preventDefault();
    await supabaseClient.from("assinaturas").insert([{
        nome: document.getElementById("ass-nome").value,
        valor: parseFloat(document.getElementById("ass-valor").value),
        segmento_id: document.getElementById("ass-segmento").value,
        meio_pagamento_id: document.getElementById("ass-meio-pagamento").value
    }]);
    document.getElementById("form-assinatura").reset();
    listarAssinaturas();
}
async function listarAssinaturas(){
    const { data } = await supabaseClient.from("assinaturas").select("*");
    const tbody = document.getElementById("table-assinaturas-body");
    tbody.innerHTML = "";
    (data || []).forEach(a => {
        tbody.innerHTML += `<tr><td>${a.nome}</td><td>${a.segmento_id || '-'}</td><td>${a.meio_pagamento_id || '-'}</td><td>${brl(a.valor)}</td><td><button class="btn btn-danger" onclick="deletarGeral('assinaturas', '${a.id}', listarAssinaturas)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 4: CONTAS BANCÁRIAS
   ========================================================================== */
async function salvarConta(e){
    e.preventDefault();
    await supabaseClient.from("contas").insert([{
        nome: document.getElementById("conta-nome").value,
        tipo: document.getElementById("conta-tipo").value,
        saldo_inicial: parseFloat(document.getElementById("conta-saldo").value)
    }]);
    document.getElementById("form-conta").reset();
    listarContas();
}
async function listarContas(){
    const { data } = await supabaseClient.from("contas").select("*");
    const tbody = document.getElementById("table-contas-body");
    tbody.innerHTML = "";
    (data || []).forEach(c => {
        tbody.innerHTML += `<tr><td>${c.nome}</td><td>${c.tipo}</td><td>${brl(c.saldo_inicial)}</td><td><button class="btn btn-danger" onclick="deletarGeral('contas', '${c.id}', listarContas)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 5: CATEGORIAS
   ========================================================================== */
async function salvarCategoria(e){
    e.preventDefault();
    await supabaseClient.from("categorias").insert([{ nome: document.getElementById("cat-nome").value, tipo: document.getElementById("cat-tipo").value }]);
    document.getElementById("form-categoria").reset();
    listarCategorias();
}
async function listarCategorias(){
    const { data } = await supabaseClient.from("categorias").select("*");
    const tbody = document.getElementById("table-categorias-body");
    tbody.innerHTML = "";
    (data || []).forEach(c => {
        tbody.innerHTML += `<tr><td>${c.nome}</td><td><span class="badge ${c.tipo === 'receita'?'badge-success':'badge-danger'}">${c.tipo}</span></td><td><button class="btn btn-danger" onclick="deletarGeral('categorias', '${c.id}', listarCategorias)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 6: FORNECEDORES
   ========================================================================== */
async function salvarFornecedor(e){
    e.preventDefault();
    await supabaseClient.from("fornecedores").insert([{
        nome: document.getElementById("forn-nome").value,
        documento: document.getElementById("forn-documento").value,
        contato: document.getElementById("forn-contato").value
    }]);
    document.getElementById("form-fornecedor").reset();
    listarFornecedores();
}
async function listarFornecedores(){
    const { data } = await supabaseClient.from("fornecedores").select("*");
    const tbody = document.getElementById("table-fornecedores-body");
    tbody.innerHTML = "";
    (data || []).forEach(f => {
        tbody.innerHTML += `<tr><td>${f.nome}</td><td>${f.documento || '-'}</td><td>${f.contato || '-'}</td><td><button class="btn btn-danger" onclick="deletarGeral('fornecedores', '${f.id}', listarFornecedores)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 7: CADASTRO DE VEÍCULOS
   ========================================================================== */
async function salvarVeiculo(e) {
    e.preventDefault();
    await supabaseClient.from("veiculos").insert([{
        modelo: document.getElementById("vei-modelo").value,
        marca: document.getElementById("vei-marca").value,
        placa: document.getElementById("vei-placa").value,
        ano: parseInt(document.getElementById("vei-ano").value || 0)
    }]);
    document.getElementById("form-veiculo").reset();
    listarVeiculos();
}
async function listarVeiculos(){
    const { data } = await supabaseClient.from("veiculos").select("*");
    const tbody = document.getElementById("table-veiculos-body");
    tbody.innerHTML = "";
    (data || []).forEach(v => {
        tbody.innerHTML += `<tr><td>${v.modelo}</td><td>${v.marca}</td><td><strong>${v.placa}</strong></td><td>${v.ano || '-'}</td><td><button class="btn btn-danger" onclick="deletarGeral('veiculos', '${v.id}', listarVeiculos)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 8: DESPESAS DE VEÍCULOS
   ========================================================================== */
function renderizarSeletorVeiculosDespesa() {
    const sel = document.getElementById("desv-veiculo");
    sel.innerHTML = '<option value="">Selecione o Veículo...</option>';
    veiculosCache.forEach(v => sel.innerHTML += `<option value="${v.id}">${v.modelo} (${v.placa})</option>`);
}
async function salvarDespesaVeiculo(e) {
    e.preventDefault();
    await supabaseClient.from("veiculo_despesas").insert([{
        veiculo_id: document.getElementById("desv-veiculo").value,
        descricao: document.getElementById("desv-descricao").value,
        valor: parseFloat(document.getElementById("desv-valor").value),
        data: document.getElementById("desv-data").value,
        importado: false
    }]);
    document.getElementById("form-despesa-veiculo").reset();
    listarDespesasVeiculos();
}
async function listarDespesasVeiculos() {
    const { data } = await supabaseClient.from("veiculo_despesas").select("*");
    const tbody = document.getElementById("table-despesas-veiculos-body");
    tbody.innerHTML = "";
    (data || []).forEach(dv => {
        const vMod = veiculosCache.find(v => v.id === dv.veiculo_id)?.modelo || "Desconhecido";
        tbody.innerHTML += `<tr><td>${fmtData(dv.data)}</td><td>${vMod}</td><td>${dv.descricao}</td><td>${brl(dv.valor)}</td><td><span class="badge ${dv.importado ? 'badge-success':'badge-warning'}">${dv.importado ? 'Integrado':'Pendente'}</span></td><td><button class="btn btn-danger" onclick="deletarGeral('veiculo_despesas', '${dv.id}', listarDespesasVeiculos)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 9: CONFIGURAÇÕES, USUÁRIOS E TEMAS
   ========================================================================== */
function mudarTema(nomeTema) {
    document.body.setAttribute("data-theme", nomeTema);
    localStorage.setItem("mf_tema", nomeTema);
    if(document.getElementById("view-dashboard").classList.contains("active-view")) {
        loadCharts(); // Redesenha os gráficos para capturar a nova cor de acento do CSS
    }
}
async function salvarUsuario(e) {
    e.preventDefault();
    await supabaseClient.from("usuarios").insert([{
        nome: document.getElementById("usr-nome").value,
        email: document.getElementById("usr-email").value,
        role: document.getElementById("usr-role").value
    }]);
    document.getElementById("form-usuario").reset();
    listarUsuarios();
}
async function listarUsuarios() {
    const { data } = await supabaseClient.from("usuarios").select("*");
    const tbody = document.getElementById("table-usuarios-body");
    tbody.innerHTML = "";
    (data || []).forEach(u => {
        tbody.innerHTML += `<tr><td>${u.nome}</td><td>${u.email}</td><td><span class="badge badge-success">${u.role}</span></td><td><button class="btn btn-danger" onclick="deletarGeral('usuarios', '${u.id}', listarUsuarios)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   FUNÇÕES GLOBAIS DE ABSTRAÇÃO (HELPERS)
   ========================================================================== */
async function deletarGeral(tabela, id, callbackRecarga) {
    if(confirm("Tem certeza que deseja remover este registro permanentemente?")) {
        await supabaseClient.from(tabela).delete().eq("id", id);
        await carregarCachesAuxiliares();
        callbackRecarga();
    }
}
function brl(v) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0); }
function fmtData(d) { if(!d) return "-"; const parts = d.split("-"); return `${parts[2]}/${parts[1]}/${parts[0]}`; }

/* ==========================================================================
   DISPARADOR INICIAL (DOM READY)
   ========================================================================== */
document.addEventListener("DOMContentLoaded", async () => {
    const user = checkAuth();
    if (!user) return;

    document.getElementById("userName").innerText = user.nome || "Usuário Geral";
    
    // Recupera tema salvo
    const temaSalvo = localStorage.getItem("mf_tema") || "dark-orange";
    mudarTema(temaSalvo);

    initRouter();
    handleViewLoad("dashboard");
});

window.logout = logout;
window.deletarGeral = deletarGeral;
window.importarDespesasDaFrota = importarDespesasDaFrota;
