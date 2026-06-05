/* ==========================================================================
      CONFIGURAÇÃO CENTRAL E INSTÂNCIA DO SUPABASE
   ========================================================================== */
const SUPABASE_URL = "https://hrdtylxfkcsgyhghhptr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZHR5bHhma2NzZ3loZ2hocHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODc3NzksImV4cCI6MjA5NTU2Mzc3OY0.DwnwVrOcYfTeiz18BJEvCipoeDUQ4t_dg3biuCtIe94";

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
    // Para fins de teste local se não houver usuário, cria um temporário para não bloquear a tela
    let user = localStorage.getItem("mf_usuario");
    if (!user) {
        const tempUser = { nome: "Maicon Admin", role: "admin" };
        localStorage.setItem("mf_usuario", JSON.stringify(tempUser));
        return tempUser;
    }
    return JSON.parse(user);
}

function logout() {
    localStorage.clear();
    alert("Sessão encerrada.");
    // window.location.href = "index.html"; // Remova o comentário quando tiver a página de login index.html
}

/* ==========================================================================
   ROTEADOR DA SPA (SINGLE PAGE APPLICATION ROUTER)
   ========================================================================== */
function initRouter() {
    const menuLinks = document.querySelectorAll(".sidebar-menu .menu-link");

    menuLinks.forEach(link => {
        link.addEventListener("click", async (e) => {
            e.preventDefault();
            const targetView = link.getAttribute("data-target");
            if (!targetView) return;

            menuLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active-view"));
            document.getElementById(`view-${targetView}`).classList.add("active-view");

            await handleViewLoad(targetView);
        });
    });
}

// Gatilho assíncrono para recarregar dados específicos ao entrar na tela ativa
async function handleViewLoad(viewId) {
    await carregarCachesAuxiliares();
    
    switch(viewId) {
        case "dashboard":
            await loadKPIs();
            await loadCharts();
            break;
        case "lancamentos":
            renderizarSeletoresFormLancamento();
            await listarLancamentos();
            break;
        case "assinaturas":
            await listarAssinaturas();
            break;
        case "contas":
            await listarContas();
            break;
        case "categorias":
            await listarCategorias();
            break;
        case "fornecedores":
            await listarFornecedores();
            break;
        case "veiculos":
            await listarVeiculos();
            break;
        case "despesas-veiculos":
            renderizarSeletorVeiculosDespesa();
            await listarDespesasVeiculos();
            break;
        case "configuracoes":
            await listarUsuarios();
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
        
        if (catRes.error) console.error("Erro Cache Categorias:", catRes.error.message);
        if (conRes.error) console.error("Erro Cache Contas:", conRes.error.message);
        if (veiRes.error) console.error("Erro Cache Veículos:", veiRes.error.message);

        categoriasCache = catRes.data || [];
        contasCache = conRes.data || [];
        veiculosCache = veiRes.data || [];
    } catch (e) {
        console.error("Erro fatal ao sincronizar caches operacionais:", e);
    }
}

/* ==========================================================================
   BLOCO 1: DASHBOARD ANALÍTICO (FILTROS DINÂMICOS & KPIs)
   ========================================================================== */
async function loadKPIs() {
    try {
        const { data: assinaturas, error: errA } = await supabaseClient.from("assinaturas").select("*");
        if (errA) console.error("Erro KPIs Assinaturas:", errA.message);

        const { count: frotaCount, error: errF } = await supabaseClient.from("veiculos").select("*", { count: "exact", head: true });
        if (errF) console.error("Erro KPIs Veículos:", errF.message);

        const { count: usuariosCount, error: errU } = await supabaseClient.from("usuarios").select("*", { count: "exact", head: true });
        if (errU) console.error("Erro KPIs Usuários:", errU.message);

        let totalCusto = (assinaturas || []).reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

        document.getElementById("kpi-assinaturas").innerText = assinaturas?.length || 0;
        document.getElementById("kpi-custo").innerText = brl(totalCusto);
        document.getElementById("kpi-frota").innerText = frotaCount || 0;
        document.getElementById("kpi-usuarios").innerText = usuariosCount || 0;
    } catch (err) {
        console.error("Erro KPIs Geral:", err);
    }
}

async function loadCharts() {
    try {
        const ano = document.getElementById("dash-filter-ano").value;
        const mes = document.getElementById("dash-filter-mes").value;

        let query = supabaseClient.from("lancamentos").select("*");
        
        if (mes !== "todos") {
            const dataInicio = `${ano}-${mes}-01`;
            const dataFim = `${ano}-${mes}-31`;
            query = query.gte("data", dataInicio).lte("data", dataFim);
        } else {
            query = query.gte("data", `${ano}-01-01`).lte("data", `${ano}-12-31`);
        }

        const { data: lancamentos, error } = await query;
        if (error) {
            console.error("Erro ao carregar dados do gráfico:", error.message);
            return;
        }

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
            labels: Object.keys(dataObj).length ? Object.keys(dataObj) : ["Sem dados"],
            datasets: [{
                data: Object.keys(dataObj).length ? Object.values(dataObj) : [0],
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
            labels: Object.keys(dataObj).length ? Object.keys(dataObj) : ["Sem dados"],
            datasets: [{
                data: Object.keys(dataObj).length ? Object.values(dataObj) : [1],
                backgroundColor: Object.keys(dataObj).length ? [accentColor, "#38bdf8", "#34d399", "#a78bfa", "#f43f5e"] : ["#333"],
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
   ========================================================================= */
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
        categoria_id: document.getElementById("lanc-categoria").value || null,
        conta_id: document.getElementById("lanc-conta").value || null
    };

    const { data, error } = await supabaseClient.from("lancamentos").insert([payload]);
    if (error) {
        console.error("Erro detalhado do Supabase ao salvar Lançamento:", error);
        alert(`Erro ao salvar Lançamento: ${error.message}\n\nVerifique se o nome das colunas ou as políticas RLS estão corretas.`);
    } else {
        alert("Lançamento cadastrado com sucesso!");
        document.getElementById("form-lancamento").reset();
        await listarLancamentos();
    }
}

async function listarLancamentos() {
    const { data, error } = await supabaseClient.from("lancamentos").select("*").order("data", { ascending: false });
    if (error) {
        console.error("Erro ao listar lançamentos:", error.message);
        return;
    }
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

async function importarDespesasDaFrota() {
    const { data: despesasV, error: errFetch } = await supabaseClient.from("veiculo_despesas").select("*").eq("importado", false);
    if (errFetch) {
        alert("Erro ao buscar despesas pendentes da frota: " + errFetch.message);
        return;
    }
    
    if(!despesasV || despesasV.length === 0) {
        alert("Nenhuma despesa de frota nova encontrada para importação.");
        return;
    }

    let catVeiculo = categoriasCache.find(c => c.nome.toLowerCase().includes("veícul") || c.nome.toLowerCase().includes("frota"));
    let contaPadrao = contasCache[0];

    let contSucesso = 0;
    for(let dv of despesasV) {
        const vModelo = veiculosCache.find(v => v.id === dv.veiculo_id)?.modelo || "Veículo";
        const { error: errIns } = await supabaseClient.from("lancamentos").insert([{
            descricao: `[FROTA] ${vModelo} - ${dv.descricao}`,
            valor: dv.valor,
            data: dv.data,
            tipo: 'despesa',
            categoria_id: catVeiculo ? catVeiculo.id : null,
            conta_id: contaPadrao ? contaPadrao.id : null
        }]);

        if (!errIns) {
            await supabaseClient.from("veiculo_despesas").update({ importado: true }).eq("id", dv.id);
            contSucesso++;
        } else {
            console.error("Erro ao importar item individual da frota:", errIns.message);
        }
    }
    
    alert(`${contSucesso} de ${despesasV.length} despesas da frota importadas com sucesso!`);
    await listarLancamentos();
}

/* ==========================================================================
   BLOCO 3: ASSINATURAS
   ========================================================================== */
async function salvarAssinatura(e){
    e.preventDefault();
    const payload = {
        nome: document.getElementById("ass-nome").value,
        valor: parseFloat(document.getElementById("ass-valor").value),
        segmento_id: document.getElementById("ass-segmento").value || null,
        meio_pagamento_id: document.getElementById("ass-meio-pagamento").value || null
    };

    const { error } = await supabaseClient.from("assinaturas").insert([payload]);
    if (error) {
        console.error("Erro Supabase Assinaturas:", error);
        alert("Erro ao salvar assinatura: " + error.message);
    } else {
        alert("Serviço recorrente adicionado!");
        document.getElementById("form-assinatura").reset();
        await listarAssinaturas();
    }
}
async function listarAssinaturas(){
    const { data, error } = await supabaseClient.from("assinaturas").select("*");
    if (error) return console.error("Erro ao listar assinaturas:", error.message);
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
    const payload = {
        nome: document.getElementById("conta-nome").value,
        tipo: document.getElementById("conta-tipo").value,
        saldo_inicial: parseFloat(document.getElementById("conta-saldo").value)
    };

    const { error } = await supabaseClient.from("contas").insert([payload]);
    if (error) {
        console.error("Erro Supabase Contas:", error);
        alert("Erro ao cadastrar conta: " + error.message);
    } else {
        alert("Conta financeira/Cartão gravado!");
        document.getElementById("form-conta").reset();
        await listarContas();
    }
}
async function listarContas(){
    const { data, error } = await supabaseClient.from("contas").select("*");
    if (error) return console.error("Erro ao listar contas:", error.message);
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
    const payload = { nome: document.getElementById("cat-nome").value, tipo: document.getElementById("cat-tipo").value };
    const { error } = await supabaseClient.from("categorias").insert([payload]);
    if (error) {
        alert("Erro ao criar categoria: " + error.message);
    } else {
        alert("Categoria criada!");
        document.getElementById("form-categoria").reset();
        await listarCategorias();
    }
}
async function listarCategorias(){
    const { data, error } = await supabaseClient.from("categorias").select("*");
    if (error) return console.error("Erro ao listar categorias:", error.message);
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
    const payload = {
        nome: document.getElementById("forn-nome").value,
        documento: document.getElementById("forn-documento").value || null,
        contato: document.getElementById("forn-contato").value || null
    };
    const { error } = await supabaseClient.from("fornecedores").insert([payload]);
    if (error) {
        alert("Erro ao salvar fornecedor: " + error.message);
    } else {
        alert("Fornecedor registrado!");
        document.getElementById("form-fornecedor").reset();
        await listarFornecedores();
    }
}
async function listarFornecedores(){
    const { data, error } = await supabaseClient.from("fornecedores").select("*");
    if (error) return console.error("Erro ao listar fornecedores:", error.message);
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
    const payload = {
        modelo: document.getElementById("vei-modelo").value,
        marca: document.getElementById("vei-marca").value,
        placa: document.getElementById("vei-placa").value,
        ano: parseInt(document.getElementById("vei-ano").value || 0)
    };
    const { error } = await supabaseClient.from("veiculos").insert([payload]);
    if (error) {
        alert("Erro ao cadastrar veículo: " + error.message);
    } else {
        alert("Veículo inserido na frota!");
        document.getElementById("form-veiculo").reset();
        await listarVeiculos();
    }
}
async function listarVeiculos(){
    const { data, error } = await supabaseClient.from("veiculos").select("*");
    if (error) return console.error("Erro ao listar veículos:", error.message);
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
    const payload = {
        veiculo_id: document.getElementById("desv-veiculo").value,
        descricao: document.getElementById("desv-descricao").value,
        valor: parseFloat(document.getElementById("desv-valor").value),
        data: document.getElementById("desv-data").value,
        importado: false
    };
    const { error } = await supabaseClient.from("veiculo_despesas").insert([payload]);
    if (error) {
        alert("Erro ao salvar despesa de veículo: " + error.message);
    } else {
        alert("Despesa veicular registrada!");
        document.getElementById("form-despesa-veiculo").reset();
        await listarDespesasVeiculos();
    }
}
async function listarDespesasVeiculos() {
    const { data, error } = await supabaseClient.from("veiculo_despesas").select("*");
    if (error) return console.error("Erro ao listar despesas da frota:", error.message);
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
        loadCharts(); 
    }
}
async function salvarUsuario(e) {
    e.preventDefault();
    const payload = {
        nome: document.getElementById("usr-nome").value,
        email: document.getElementById("usr-email").value,
        role: document.getElementById("usr-role").value
    };
    const { error } = await supabaseClient.from("usuarios").insert([payload]);
    if (error) {
        alert("Erro ao criar usuário: " + error.message);
    } else {
        alert("Novo operador/administrador cadastrado com sucesso!");
        document.getElementById("form-usuario").reset();
        await listarUsuarios();
    }
}
async function listarUsuarios() {
    const { data, error } = await supabaseClient.from("usuarios").select("*");
    if (error) return console.error("Erro ao listar usuários:", error.message);
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
        const { error } = await supabaseClient.from(tabela).delete().eq("id", id);
        if (error) {
            alert("Erro ao remover registro: " + error.message);
        } else {
            await carregarCachesAuxiliares();
            await callbackRecarga();
        }
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
    document.getElementById("userRole").innerText = user.role === 'admin' ? "Administrador" : "Operador";
    
    const temaSalvo = localStorage.getItem("mf_tema") || "dark-orange";
    mudarTema(temaSalvo);

    initRouter();
    await handleViewLoad("dashboard");
});

window.logout = logout;
window.deletarGeral = deletarGeral;
window.importarDespesasDaFrota = importarDespesasDaFrota;
window.mudarTema = mudarTema;
window.salvarLancamento = salvarLancamento;
window.salvarAssinatura = salvarAssinatura;
window.salvarConta = salvarConta;
window.salvarCategoria = salvarCategoria;
window.salvarFornecedor = salvarFornecedor;
window.salvarVeiculo = salvarVeiculo;
window.salvarDespesaVeiculo = salvarDespesaVeiculo;
window.salvarUsuario = salvarUsuario;
window.loadCharts = loadCharts;
