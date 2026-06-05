/* ==========================================================================
   CONFIGURAÇÃO CENTRAL E INSTÂNCIA DO SUPABASE
   ========================================================================== */
const SUPABASE_URL = "https://hrdtylxfkcsgyhghhptr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZHR5bHhma2NzZ3loZ2hocHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODc3NzksImV4cCI6MjA5NTU2Mzc3OY0.DwnwVrOcYfTeiz18BJEvCipoeDUQ4t_dg3biuCtIe94";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================================================================
// 2. CONTROLE DE SESSÃO E EXIBIÇÃO DE TELAS
// ==================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Verifica se o usuário já está logado assim que a página carrega
    verificarSessao();

    // Atalho para efetuar login pressionando "Enter"
    document.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const loginVisivel = !document.getElementById('loginView').classList.contains('hidden');
            if (loginVisivel) {
                entrar();
            }
        }
    });
});

function verificarSessao() {
    const usuarioLogado = localStorage.getItem('mf_usuario');
    const loginView = document.getElementById('loginView');
    const mainSystemView = document.getElementById('mainSystemView');

    if (usuarioLogado) {
        // Se houver sessão: Esconde Login, Mostra Painel Principal
        loginView.classList.add('hidden');
        mainSystemView.classList.remove('hidden');
        
        // Dispara o carregamento dos seus dados e gráficos do dashboard
        inicializarPainel();
    } else {
        // Se não houver sessão: Mostra Login, Esconde Painel Principal
        loginView.classList.remove('hidden');
        mainSystemView.classList.add('hidden');
    }
}

// ==================================================================
// 3. FUNÇÕES DE AUTENTICAÇÃO
// ==================================================================
async function entrar() {
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();
    const erro = document.getElementById('erro');

    erro.classList.add('hidden');

    if (!email || !senha) {
        erro.innerHTML = 'Por favor, preencha todos os campos.';
        erro.classList.remove('hidden');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .eq('senha_hash', senha) // Alinhado com sua coluna de validação
            .eq('ativo', true)
            .single();

        if (error || !data) {
            erro.innerHTML = 'Usuário ou senha inválidos';
            erro.classList.remove('hidden');
            return;
        }

        // Armazena a sessão localmente
        localStorage.setItem('mf_usuario', JSON.stringify(data));
        
        // Atualiza a interface para exibir o dashboard
        verificarSessao();

    } catch (e) {
        erro.innerHTML = 'Erro ao conectar com o banco de dados';
        erro.classList.remove('hidden');
        console.error(e);
    }
}

function sair() {
    // Remove os dados do cache local e atualiza a tela de volta pro login
    localStorage.removeItem('mf_usuario');
    verificarSessao();
}

// ==================================================================
// 4. INICIALIZAÇÃO E FUNÇÕES DO SEU PAINEL (Seu código antigo)
// ==================================================================
async function inicializarPainel() {
    console.log("Sessão ativa. Inicializando componentes do dashboard...");
    try {
        // Executa as suas funções estruturadas que carregam o sistema
        await carregarCachesAuxiliares();
        await loadKPIs();
        await loadCharts();
    } catch (err) {
        console.error("Erro na carga inicial do painel:", err);
    }
}

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
   CARREGAMENTO DE DATA CACHES (Alinhado com o Schema Real)
   ========================================================================== */
async function carregarCachesAuxiliares() {
    try {
        const [catRes, conRes, veiRes] = await Promise.all([
            supabaseClient.from("categorias_lancamentos").select("*"),
            supabaseClient.from("contas_financeiras").select("*"),
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
            query = query.gte("data_lancamento", dataInicio).lte("data_lancamento", dataFim);
        } else {
            query = query.gte("data_lancamento", `${ano}-01-01`).lte("data_lancamento", `${ano}-12-31`);
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
            const catNome = l.categoria || "Não Classificado";
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
   BLOCO 2: LANÇAMENTOS CORE (Ajustado para Coluna 'categoria' text e 'data_lancamento')
   ========================================================================= */
function renderizarSeletoresFormLancamento() {
    const catSel = document.getElementById("lanc-categoria");
    const conSel = document.getElementById("lanc-conta");
    
    catSel.innerHTML = '<option value="">Categoria...</option>';
    conSel.innerHTML = '<option value="">Conta/Cartão...</option>';

    categoriasCache.forEach(c => catSel.innerHTML += `<option value="${c.nome}">${c.nome}</option>`);
    contasCache.forEach(c => conSel.innerHTML += `<option value="${c.id}">${c.nome}</option>`);
}

async function salvarLancamento(e) {
    e.preventDefault();
    const payload = {
        descricao: document.getElementById("lanc-descricao").value,
        valor: parseFloat(document.getElementById("lanc-valor").value),
        data_lancamento: document.getElementById("lanc-data").value,
        tipo: document.getElementById("lanc-tipo").value,
        categoria: document.getElementById("lanc-categoria").value || null,
        conta_id: document.getElementById("lanc-conta").value || null,
        status: "pago"
    };

    const { error } = await supabaseClient.from("lancamentos").insert([payload]);
    if (error) {
        console.error("Erro Supabase Lançamento:", error);
        alert(`Erro ao salvar Lançamento: ${error.message}`);
    } else {
        alert("Lançamento cadastrado com sucesso!");
        document.getElementById("form-lancamento").reset();
        await listarLancamentos();
    }
}

async function listarLancamentos() {
    const { data, error } = await supabaseClient.from("lancamentos").select("*").order("data_lancamento", { ascending: false });
    if (error) {
        console.error("Erro ao listar lançamentos:", error.message);
        return;
    }
    const tbody = document.getElementById("table-lancamentos-body");
    tbody.innerHTML = "";

    (data || []).forEach(l => {
        const coNome = contasCache.find(c => c.id === l.conta_id)?.nome || "-";
        tbody.innerHTML += `
            <tr>
                <td>${fmtData(l.data_lancamento)}</td>
                <td>${l.descricao}</td>
                <td><span class="badge ${l.tipo === 'receita' ? 'badge-success' : 'badge-danger'}">${l.tipo}</span></td>
                <td>${l.categoria || '-'}</td>
                <td>${coNome}</td>
                <td style="font-weight:600; color:${l.tipo === 'receita' ? '#34d399':'#f43f5e'}">${brl(l.valor)}</td>
                <td><button class="btn btn-danger" style="padding:2px 6px" onclick="deletarGeral('lancamentos', '${l.id}', listarLancamentos)">✖</button></td>
            </tr>`;
    });
}

async function importarDespesasDaFrota() {
    // Busca despesas onde 'lancamento_id' é nulo (não importadas ainda)
    const { data: despesasV, error: errFetch } = await supabaseClient.from("despesas_frota").select("*").is("lancamento_id", null);
    if (errFetch) {
        alert("Erro ao buscar despesas pendentes da frota: " + errFetch.message);
        return;
    }
    
    if(!despesasV || despesasV.length === 0) {
        alert("Nenhuma despesa de frota nova encontrada para integração.");
        return;
    }

    let contSucesso = 0;
    for(let dv of despesasV) {
        const vModelo = veiculosCache.find(v => v.id === dv.veiculo_id)?.modelo || "Veículo";
        
        // Insere o lançamento correspondente e retorna o ID gerado usando .select()
        const { data: insData, error: errIns } = await supabaseClient.from("lancamentos").insert([{
            descricao: `[FROTA] ${vModelo} - ${dv.observacao || 'Despesa'}`,
            valor: dv.valor,
            data_lancamento: dv.data_despesa,
            tipo: 'despesa',
            categoria: 'Veículos / Frota',
            conta_id: dv.conta_id || (contasCache[0] ? contasCache[0].id : null),
            veiculo_id: dv.veiculo_id
        }]).select();

        if (!errIns && insData && insData.length > 0) {
            const novoLancId = insData[0].id;
            // Vincula o ID do lançamento gerado de volta na tabela despesas_frota para marcar como importado
            await supabaseClient.from("despesas_frota").update({ lancamento_id: novoLancId }).eq("id", dv.id);
            contSucesso++;
        } else {
            console.error("Erro ao importar item individual da frota:", errIns?.message);
        }
    }
    
    alert(`${contSucesso} de ${despesasV.length} despesas da frota integradas com sucesso!`);
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
        meio_pagamento_id: document.getElementById("ass-meio-pagamento").value || null,
        status: "ativo"
    };

    const { error } = await supabaseClient.from("assinaturas").insert([payload]);
    if (error) {
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
        tbody.innerHTML += `<tr><td>${a.nome}</td><td>${a.status}</td><td>-</td><td>${brl(a.valor)}</td><td><button class="btn btn-danger" onclick="deletarGeral('assinaturas', '${a.id}', listarAssinaturas)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 4: CONTAS BANCÁRIAS (Tabela real: contas_financeiras)
   ========================================================================== */
async function salvarConta(e){
    e.preventDefault();
    const payload = {
        nome: document.getElementById("conta-nome").value,
        saldo_inicial: parseFloat(document.getElementById("conta-saldo").value),
        ativa: true
    };

    const { error } = await supabaseClient.from("contas_financeiras").insert([payload]);
    if (error) {
        alert("Erro ao cadastrar conta: " + error.message);
    } else {
        alert("Conta financeira gravada com sucesso!");
        document.getElementById("form-conta").reset();
        await listarContas();
    }
}
async function listarContas(){
    const { data, error } = await supabaseClient.from("contas_financeiras").select("*");
    if (error) return console.error("Erro ao listar contas:", error.message);
    const tbody = document.getElementById("table-contas-body");
    tbody.innerHTML = "";
    (data || []).forEach(c => {
        tbody.innerHTML += `<tr><td>${c.nome}</td><td>${c.ativa ? 'Ativa' : 'Inativa'}</td><td>${brl(c.saldo_inicial)}</td><td><button class="btn btn-danger" onclick="deletarGeral('contas_financeiras', '${c.id}', listarContas)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 5: CATEGORIAS (Tabela real: categorias_lancamentos)
   ========================================================================== */
async function salvarCategoria(e){
    e.preventDefault();
    const payload = { 
        nome: document.getElementById("cat-nome").value, 
        tipo: document.getElementById("cat-tipo").value 
    };
    const { error } = await supabaseClient.from("categorias_lancamentos").insert([payload]);
    if (error) {
        alert("Erro ao criar categoria: " + error.message);
    } else {
        alert("Categoria criada!");
        document.getElementById("form-categoria").reset();
        await listarCategorias();
    }
}
async function listarCategorias(){
    const { data, error } = await supabaseClient.from("categorias_lancamentos").select("*");
    if (error) return console.error("Erro ao listar categorias:", error.message);
    const tbody = document.getElementById("table-categorias-body");
    tbody.innerHTML = "";
    (data || []).forEach(c => {
        tbody.innerHTML += `<tr><td>${c.nome}</td><td><span class="badge ${c.tipo === 'receita'?'badge-success':'badge-danger'}">${c.tipo}</span></td><td><button class="btn btn-danger" onclick="deletarGeral('categorias_lancamentos', '${c.id}', listarCategorias)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 6: FORNECEDORES (Ajustado para colunas reais: telefone, email, observacao)
   ========================================================================== */
async function salvarFornecedor(e){
    e.preventDefault();
    const payload = {
        nome: document.getElementById("forn-nome").value,
        telefone: document.getElementById("forn-contato").value || null,
        observacao: document.getElementById("forn-documento").value || null, // Guardando o campo extra em observação
        email: ""
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
        tbody.innerHTML += `<tr><td>${f.nome}</td><td>${f.observacao || '-'}</td><td>${f.telefone || '-'}</td><td><button class="btn btn-danger" onclick="deletarGeral('fornecedores', '${f.id}', listarFornecedores)">✖</button></td></tr>`;
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
   BLOCO 8: DESPESAS DE VEÍCULOS (Tabela real: despesas_frota)
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
        observacao: document.getElementById("desv-descricao").value, // campo real 'observacao'
        valor: parseFloat(document.getElementById("desv-valor").value),
        data_despesa: document.getElementById("desv-data").value, // campo real 'data_despesa'
        quilometragem: 0
    };
    const { error } = await supabaseClient.from("despesas_frota").insert([payload]);
    if (error) {
        alert("Erro ao salvar despesa de veículo: " + error.message);
    } else {
        alert("Despesa veicular registrada!");
        document.getElementById("form-despesa-veiculo").reset();
        await listarDespesasVeiculos();
    }
}
async function listarDespesasVeiculos() {
    const { data, error } = await supabaseClient.from("despesas_frota").select("*");
    if (error) return console.error("Erro ao listar despesas da frota:", error.message);
    const tbody = document.getElementById("table-despesas-veiculos-body");
    tbody.innerHTML = "";
    (data || []).forEach(dv => {
        const vMod = veiculosCache.find(v => v.id === dv.veiculo_id)?.modelo || "Desconhecido";
        const statusIntegrado = dv.lancamento_id ? 'badge-success' : 'badge-warning';
        const textoIntegrado = dv.lancamento_id ? 'Integrado' : 'Pendente';
        tbody.innerHTML += `<tr><td>${fmtData(dv.data_despesa)}</td><td>${vMod}</td><td>${dv.observacao || '-'}</td><td>${brl(dv.valor)}</td><td><span class="badge ${statusIntegrado}">${textoIntegrado}</span></td><td><button class="btn btn-danger" onclick="deletarGeral('despesas_frota', '${dv.id}', listarDespesasVeiculos)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 9: CONFIGURAÇÕES, USUÁRIOS E TEMAS (Coluna real: nivel)
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
        nivel: document.getElementById("usr-role").value, // campo real 'nivel'
        ativo: true
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
        tbody.innerHTML += `<tr><td>${u.nome}</td><td>${u.email}</td><td><span class="badge badge-success">${u.nivel}</span></td><td><button class="btn btn-danger" onclick="deletarGeral('usuarios', '${u.id}', listarUsuarios)">✖</button></td></tr>`;
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
window.veiculosCache = veiculosCache;
window.salvarVeiculo = salvarVeiculo;
window.salvarDespesaVeiculo = salvarDespesaVeiculo;
window.salvarUsuario = salvarUsuario;
window.loadCharts = loadCharts;
