/* ==========================================================================
   VALIDAÇÃO DE DEPENDÊNCIAS
   ========================================================================== */
// Proteção para o script não quebrar caso o CDN do Supabase falhe (Erro 404)
if (typeof supabase === 'undefined') {
    console.error("ERRO CRÍTICO: A biblioteca global 'supabase' não foi encontrada. Verifique o link do CDN no seu HTML.");
    alert("Erro de carregamento: A biblioteca do Supabase não foi encontrada. Verifique se o link do script no arquivo HTML está correto.");
}

/* ==========================================================================
   CONFIGURAÇÃO CENTRAL E INSTÂNCIA DO SUPABASE
   ========================================================================== */
const SUPABASE_URL = "https://hrdtylxfkcsgyhghhptr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZHR5bHhma2NzZ3loZ2hocHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODc3NzksImV4cCI6MjA5NTU2Mzc3OX0.DwnwVrOcYfTeiz18BJEvCipoeDUQ4t_dg3biuCtIe94";

// Inicializa o client apenas se a biblioteca existir para evitar travar o escopo global
const supabaseClient = typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

/* ==========================================================================
   ESTADO GLOBAL DA APLICAÇÃO (SPA CACHE)
   ========================================================================== */
let charts = {};
let categoriasCache = [];
let contasCache = [];
let veiculosCache = [];

/* ==========================================================================
   CONTROLE DE SESSÃO E AUTENTICAÇÃO
   ========================================================================== */
function verificarSessao() {
    const usuarioLogado = localStorage.getItem('mf_usuario');
    const loginView = document.getElementById('loginView');
    const mainSystemView = document.getElementById('mainSystemView');

    if (usuarioLogado) {
        const user = JSON.parse(usuarioLogado);
        
        if (document.getElementById("userName")) document.getElementById("userName").innerText = user.nome || "Usuário Geral";
        if (document.getElementById("userRole")) document.getElementById("userRole").innerText = user.nivel === 'admin' ? "Administrador" : "Operador";

        if (loginView) loginView.classList.add('hidden');
        if (mainSystemView) mainSystemView.classList.remove('hidden');
        
        inicializarPainel();
    } else {
        if (loginView) loginView.classList.remove('hidden');
        if (mainSystemView) mainSystemView.classList.add('hidden');
    }
}

async function entrar() {
    if (!supabaseClient) {
        alert("Não é possível fazer login porque o banco de dados (Supabase) não foi carregado corretamente.");
        return;
    }

    const emailEl = document.getElementById('email');
    const senhaEl = document.getElementById('senha');
    const erro = document.getElementById('erro');

    if (erro) erro.classList.add('hidden');
    if (!emailEl || !senhaEl) return;

    const email = emailEl.value.trim();
    const senha = senhaEl.value.trim();

    if (!email || !senha) {
        if (erro) {
            erro.innerHTML = 'Por favor, preencha todos os campos.';
            erro.classList.remove('hidden');
        }
        return;
    }

    try {
        console.log("Tentando logar com:", email);

        // Buscamos apenas pelo email primeiro para saber se o usuário existe ou se é o RLS bloqueando
        const { data: usuario, error } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (error) {
            console.error("Erro retornado pelo Supabase:", error);
            if (erro) {
                erro.innerHTML = `Erro de Segurança/RLS: ${error.message}`;
                erro.classList.remove('hidden');
            }
            return;
        }

        // Se o banco retornar vazio (null), das duas uma: ou o email tá errado ou o RLS está bloqueando a leitura
        if (!usuario) {
            console.warn("Nenhum dado retornado. Se o email existe no banco, o RLS está ATIVADO e bloqueando o acesso.");
            if (erro) {
                erro.innerHTML = 'Usuário não encontrado (Verifique o email ou as políticas de RLS no Supabase)';
                erro.classList.remove('hidden');
            }
            return;
        }

        // Se achou o usuário, agora testamos a senha manualmente aqui no JS para você ver no console
        console.log("Usuário encontrado no banco!", usuario);
        console.log("Senha digitada:", senha, " | Senha no banco:", usuario.senha_hash);

        if (usuario.senha_hash !== senha) {
            if (erro) {
                erro.innerHTML = 'Senha incorreta.';
                erro.classList.remove('hidden');
            }
            return;
        }

        // Tudo certo! Salva na sessão
        localStorage.setItem('mf_usuario', JSON.stringify(usuario));
        verificarSessao();

    } catch (e) {
        if (erro) {
            erro.innerHTML = 'Erro interno ao processar o login.';
            erro.classList.remove('hidden');
        }
        console.error("Erro no catch:", e);
    }
}

function sair() {
    localStorage.removeItem('mf_usuario');
    verificarSessao();
}

function logout() {
    localStorage.clear();
    alert("Sessão encerrada.");
    verificarSessao();
}

/* ==========================================================================
   INICIALIZAÇÃO DO PAINEL
   ========================================================================== */
async function inicializarPainel() {
    console.log("Sessão ativa. Inicializando componentes...");
    try {
        const temaSalvo = localStorage.getItem("mf_tema") || "dark-orange";
        mudarTema(temaSalvo);

        initRouter();
        await handleViewLoad("dashboard");
    } catch (err) {
        console.error("Erro na carga inicial do painel:", err);
    }
}

/* ==========================================================================
   ROTEADOR DA SPA
   ========================================================================== */
function initRouter() {
    const menuLinks = document.querySelectorAll(".sidebar-menu .menu-link");

    menuLinks.forEach(link => {
        link.replaceWith(link.cloneNode(true));
    });

    const activeLinks = document.querySelectorAll(".sidebar-menu .menu-link");
    activeLinks.forEach(link => {
        link.addEventListener("click", async (e) => {
            e.preventDefault();
            const targetView = link.getAttribute("data-target");
            if (!targetView) return;

            activeLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active-view"));
            
            const targetEl = document.getElementById(`view-${targetView}`);
            if (targetEl) targetEl.classList.add("active-view");

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
   CARREGAMENTO DE DATA CACHES
   ========================================================================== */
async function carregarCachesAuxiliares() {
    if (!supabaseClient) return;
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
   BLOCO 1: DASHBOARD ANALÍTICO (KPIs & GRÁFICOS)
   ========================================================================== */
async function loadKPIs() {
    if (!supabaseClient) return;
    try {
        const { data: assinaturas, error: errA } = await supabaseClient.from("assinaturas").select("*");
        if (errA) console.error("Erro KPIs Assinaturas:", errA.message);

        const { count: frotaCount, error: errF } = await supabaseClient.from("veiculos").select("*", { count: "exact", head: true });
        if (errF) console.error("Erro KPIs Veículos:", errF.message);

        const { count: usuariosCount, error: errU } = await supabaseClient.from("usuarios").select("*", { count: "exact", head: true });
        if (errU) console.error("Erro KPIs Usuários:", errU.message);

        let totalCusto = (assinaturas || []).reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

        if (document.getElementById("kpi-assinaturas")) document.getElementById("kpi-assinaturas").innerText = assinaturas?.length || 0;
        if (document.getElementById("kpi-custo")) document.getElementById("kpi-custo").innerText = brl(totalCusto);
        if (document.getElementById("kpi-frota")) document.getElementById("kpi-frota").innerText = frotaCount || 0;
        if (document.getElementById("kpi-usuarios")) document.getElementById("kpi-usuarios").innerText = usuariosCount || 0;
    } catch (err) {
        console.error("Erro KPIs Geral:", err);
    }
}

async function loadCharts() {
    if (!supabaseClient) return;
    try {
        const filterAnoEl = document.getElementById("dash-filter-ano");
        const filterMesEl = document.getElementById("dash-filter-mes");
        
        const ano = filterAnoEl ? filterAnoEl.value : new Date().getFullYear().toString();
        const mes = filterMesEl ? filterMesEl.value : "todos";

        let query = supabaseClient.from("lancamentos").select("*");
        
        if (mes !== "todos") {
            const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
            const dataInicio = `${ano}-${mes}-01`;
            const dataFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
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
   BLOCO 2: LANÇAMENTOS
   ========================================================================== */
function renderizarSeletoresFormLancamento() {
    const catSel = document.getElementById("lanc-categoria");
    const conSel = document.getElementById("lanc-conta");
    
    if(catSel) {
        catSel.innerHTML = '<option value="">Categoria...</option>';
        categoriasCache.forEach(c => catSel.innerHTML += `<option value="${c.nome}">${c.nome}</option>`);
    }
    if(conSel) {
        conSel.innerHTML = '<option value="">Conta/Cartão...</option>';
        contasCache.forEach(c => conSel.innerHTML += `<option value="${c.id}">${c.nome}</option>`);
    }
}

async function salvarLancamento(e) {
    e.preventDefault();
    if(!supabaseClient) return;
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
    if(!supabaseClient) return;
    const { data, error } = await supabaseClient.from("lancamentos").select("*").order("data_lancamento", { ascending: false });
    if (error) {
        console.error("Erro ao listar lançamentos:", error.message);
        return;
    }
    const tbody = document.getElementById("table-lancamentos-body");
    if(!tbody) return;
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
    if(!supabaseClient) return;
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
    if(!supabaseClient) return;
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
    if(!supabaseClient) return;
    const { data, error } = await supabaseClient.from("assinaturas").select("*");
    if (error) return console.error("Erro ao listar assinaturas:", error.message);
    const tbody = document.getElementById("table-assinaturas-body");
    if(!tbody) return;
    tbody.innerHTML = "";
    (data || []).forEach(a => {
        tbody.innerHTML += `<tr><td>${a.nome}</td><td>${a.status}</td><td>-</td><td>${brl(a.valor)}</td><td><button class="btn btn-danger" onclick="deletarGeral('assinaturas', '${a.id}', listarAssinaturas)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 4: CONTAS BANCÁRIAS
   ========================================================================== */
async function salvarConta(e){
    e.preventDefault();
    if(!supabaseClient) return;
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
    if(!supabaseClient) return;
    const { data, error } = await supabaseClient.from("contas_financeiras").select("*");
    if (error) return console.error("Erro ao listar contas:", error.message);
    const tbody = document.getElementById("table-contas-body");
    if(!tbody) return;
    tbody.innerHTML = "";
    (data || []).forEach(c => {
        tbody.innerHTML += `<tr><td>${c.nome}</td><td>${c.ativa ? 'Ativa' : 'Inativa'}</td><td>${brl(c.saldo_inicial)}</td><td><button class="btn btn-danger" onclick="deletarGeral('contas_financeiras', '${c.id}', listarContas)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 5: CATEGORIAS
   ========================================================================== */
async function salvarCategoria(e){
    e.preventDefault();
    if(!supabaseClient) return;
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
    if(!supabaseClient) return;
    const { data, error } = await supabaseClient.from("categorias_lancamentos").select("*");
    if (error) return console.error("Erro ao listar categorias:", error.message);
    const tbody = document.getElementById("table-categorias-body");
    if(!tbody) return;
    tbody.innerHTML = "";
    (data || []).forEach(c => {
        tbody.innerHTML += `<tr><td>${c.nome}</td><td><span class="badge ${c.tipo === 'receita'?'badge-success':'badge-danger'}">${c.tipo}</span></td><td><button class="btn btn-danger" onclick="deletarGeral('categorias_lancamentos', '${c.id}', listarCategorias)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 6: FORNECEDORES
   ========================================================================== */
async function salvarFornecedor(e){
    e.preventDefault();
    if(!supabaseClient) return;
    const payload = {
        nome: document.getElementById("forn-nome").value,
        telefone: document.getElementById("forn-contato").value || null,
        observacao: document.getElementById("forn-documento").value || null,
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
    if(!supabaseClient) return;
    const { data, error } = await supabaseClient.from("fornecedores").select("*");
    if (error) return console.error("Erro ao listar fornecedores:", error.message);
    const tbody = document.getElementById("table-fornecedores-body");
    if(!tbody) return;
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
    if(!supabaseClient) return;
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
    if(!supabaseClient) return;
    const { data, error } = await supabaseClient.from("veiculos").select("*");
    if (error) return console.error("Erro ao listar veículos:", error.message);
    const tbody = document.getElementById("table-veiculos-body");
    if(!tbody) return;
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
    if(!sel) return;
    sel.innerHTML = '<option value="">Selecione o Veículo...</option>';
    veiculosCache.forEach(v => sel.innerHTML += `<option value="${v.id}">${v.modelo} (${v.placa})</option>`);
}

async function salvarDespesaVeiculo(e) {
    e.preventDefault();
    if(!supabaseClient) return;
    const payload = {
        veiculo_id: document.getElementById("desv-veiculo").value,
        observacao: document.getElementById("desv-descricao").value,
        valor: parseFloat(document.getElementById("desv-valor").value),
        data_despesa: document.getElementById("desv-data").value,
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
    if(!supabaseClient) return;
    const { data, error } = await supabaseClient.from("despesas_frota").select("*");
    if (error) return console.error("Erro ao listar despesas da frota:", error.message);
    const tbody = document.getElementById("table-despesas-veiculos-body");
    if(!tbody) return;
    tbody.innerHTML = "";
    (data || []).forEach(dv => {
        const vMod = veiculosCache.find(v => v.id === dv.veiculo_id)?.modelo || "Desconhecido";
        const statusIntegrado = dv.lancamento_id ? 'badge-success' : 'badge-warning';
        const textoIntegrado = dv.lancamento_id ? 'Integrado' : 'Pendente';
        tbody.innerHTML += `<tr><td>${fmtData(dv.data_despesa)}</td><td>${vMod}</td><td>${dv.observacao || '-'}</td><td>${brl(dv.valor)}</td><td><span class="badge ${statusIntegrado}">${textoIntegrado}</span></td><td><button class="btn btn-danger" onclick="deletarGeral('despesas_frota', '${dv.id}', listarDespesasVeiculos)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   BLOCO 9: CONFIGURAÇÕES, USUÁRIOS E TEMAS
   ========================================================================== */
function mudarTema(nomeTema) {
    document.body.setAttribute("data-theme", nomeTema);
    localStorage.setItem("mf_tema", nomeTema);
    const dashView = document.getElementById("view-dashboard");
    if(dashView && dashView.classList.contains("active-view")) {
        loadCharts(); 
    }
}

async function salvarUsuario(e) {
    e.preventDefault();
    if(!supabaseClient) return;
    const payload = {
        nome: document.getElementById("usr-nome").value,
        email: document.getElementById("usr-email").value,
        nivel: document.getElementById("usr-role").value,
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
    if(!supabaseClient) return;
    const { data, error } = await supabaseClient.from("usuarios").select("*");
    if (error) return console.error("Erro ao listar usuários:", error.message);
    const tbody = document.getElementById("table-usuarios-body");
    if(!tbody) return;
    tbody.innerHTML = "";
    (data || []).forEach(u => {
        tbody.innerHTML += `<tr><td>${u.nome}</td><td>${u.email}</td><td><span class="badge badge-success">${u.nivel}</span></td><td><button class="btn btn-danger" onclick="deletarGeral('usuarios', '${u.id}', listarUsuarios)">✖</button></td></tr>`;
    });
}

/* ==========================================================================
   FUNÇÕES GLOBAIS DE ABSTRAÇÃO (HELPERS)
   ========================================================================== */
async function deletarGeral(tabela, id, callbackRecarga) {
    if(!supabaseClient) return;
    if(confirm("Tem certeza que deseja remover este registro permanentemente?")) {
        const { error } = await supabaseClient.from(tabela).delete().eq("id", id);
        if (error) {
            alert("Erro ao remover registro: " + error.message);
        } else {
            await carregarCachesAuxiliares();
            if (typeof callbackRecarga === "function") {
                await callbackRecarga();
            }
        }
    }
}

function brl(v) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0); }
function fmtData(d) { if(!d) return "-"; const parts = d.split("-"); return `${parts[2]}/${parts[1]}/${parts[0]}`; }

/* ==========================================================================
   MAPEAMENTO ANTECIPADO AO ESCOPO GLOBAL (Garante funcionamento do HTML inline)
   ========================================================================== */
window.entrar = entrar;
window.sair = sair;
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

window.listarLancamentos = listarLancamentos;
window.listarAssinaturas = listarAssinaturas;
window.listarContas = listarContas;
window.listarCategorias = listarCategorias;
window.listarFornecedores = listarFornecedores;
window.listarVeiculos = listarVeiculos;
window.listarDespesasVeiculos = listarDespesasVeiculos;
window.listarUsuarios = listarUsuarios;

/* ==========================================================================
   DISPARADOR INICIAL ÚNICO (DOM READY)
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const loginView = document.getElementById('loginView');
            const loginVisivel = loginView && !loginView.classList.contains('hidden');
            if (loginVisivel) {
                entrar();
            }
        }
    });

    verificarSessao();
});
