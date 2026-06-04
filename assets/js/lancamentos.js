let lancamentoEditando = null;
let idExclusao = null;
let todosLancamentos = [];
let contasMap = {};

document.addEventListener('DOMContentLoaded', iniciarPagina);

async function iniciarPagina() {
    carregarUsuario();

    await carregarContas();
    await carregarCategorias();
    await carregarLancamentos();
    
    // Configuração unificada de EventListeners para todos os Filtros ativos em tempo real
    document.getElementById('buscaDescricao').addEventListener('keyup', aplicarFiltros);
    document.getElementById('filtroTipo').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroStatus').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroConta').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroCompetencia').addEventListener('change', aplicarFiltros);
}

function carregarUsuario() {
    const usuario = JSON.parse(localStorage.getItem('mf_usuario'));
    if (usuario) {
        const userName = document.getElementById('userName');
        if (userName) {
            userName.innerText = usuario.nome;
        }
    }
}

async function carregarContas() {
    const { data, error } = await supabaseClient
        .from('contas_financeiras')
        .select('*')
        .eq('ativa', true)
        .order('nome');

    if (error) {
        console.error('Erro ao buscar contas:', error.message);
        return;
    }

    const contaSelect = document.getElementById('conta');
    const filtroConta = document.getElementById('filtroConta');

    contaSelect.innerHTML = '';
    filtroConta.innerHTML = '<option value="">Todas</option>';

    data.forEach(item => {
        contasMap[item.id] = item.nome;
        contaSelect.innerHTML += `<option value="${item.id}">${item.nome}</option>`;
        filtroConta.innerHTML += `<option value="${item.id}">${item.nome}</option>`;
    });
}

async function carregarCategorias() {
    const { data, error } = await supabaseClient
        .from('categorias_lancamentos')
        .select('*')
        .order('nome');

    if (error) {
        console.error('Erro ao buscar categorias:', error.message);
        return;
    }

    const categoriaSelect = document.getElementById('categoria');
    categoriaSelect.innerHTML = '';

    data.forEach(item => {
        categoriaSelect.innerHTML += `<option value="${item.nome}">${item.nome}</option>`;
    });
}

async function carregarLancamentos() {
    const { data, error } = await supabaseClient
        .from('lancamentos')
        .select('*')
        .order('data_lancamento', { ascending: false });

    if (error) {
        console.error('Erro ao buscar lançamentos:', error.message);
        return;
    }

    todosLancamentos = data || [];
    aplicarFiltros();
}

function atualizarKPIs(lancamentos) {
    const receitas = lancamentos
        .filter(l => l.tipo === 'receita')
        .reduce((s, l) => s + Number(l.valor || 0), 0);

    const despesas = lancamentos
        .filter(l => l.tipo === 'despesa')
        .reduce((s, l) => s + Number(l.valor || 0), 0);

    const pendentes = lancamentos
        .filter(l => l.status === 'pendente')
        .length;

    document.getElementById('kpiReceitas').innerText = formatarMoeda(receitas);
    document.getElementById('kpiDespesas').innerText = formatarMoeda(despesas);
    document.getElementById('kpiSaldo').innerText = formatarMoeda(receitas - despesas);
    document.getElementById('kpiPendentes').innerText = pendentes;
}

function montarTabela(lancamentos) {
    const tbody = document.getElementById('listaLancamentos');
    tbody.innerHTML = '';

    lancamentos.forEach(item => {
        const statusFormatado = item.status === 'pago' ? 'Pago' : 'Pendente';

        tbody.innerHTML += `
        <tr>
            <td>${formatarData(item.data_lancamento)}</td>
            <td>${item.descricao || ''}</td>
            <td>${item.categoria || ''}</td>
            <td>${contasMap[item.conta_id] || '-'}</td>
            <td>${formatarMoeda(item.valor || 0)}</td>
            <td>
                <span class="badge ${item.status === 'pago' ? 'badge-success' : 'badge-warning'}">
                    ${statusFormatado}
                </span>
            </td>
            <td>
                <button class="btn btn-secondary" onclick="editarLancamento('${item.id}')">Editar</button>
                <button class="btn btn-danger" onclick="excluirLancamento('${item.id}')">Excluir</button>
            </td>
        </tr>`;
    });
}

async function salvarLancamento() {
    const registro = {
        tipo: document.getElementById('tipo').value,
        descricao: document.getElementById('descricao').value.trim(),
        valor: Number(document.getElementById('valor').value || 0),
        categoria: document.getElementById('categoria').value,
        conta_id: document.getElementById('conta').value,
        favorecido: document.getElementById('favorecido').value.trim(),
        forma_pagamento: document.getElementById('formaPagamento').value,
        documento: document.getElementById('documento').value.trim(),
        data_vencimento: document.getElementById('dataVencimento').value || null,
        competencia: document.getElementById('competencia').value || null,
        status: document.getElementById('status').value,
        observacao: document.getElementById('observacao').value
    };

    if (!registro.descricao || !registro.valor || !registro.categoria || !registro.conta_id) {
        alert('Preencha os campos obrigatórios (Descrição, Valor, Categoria e Conta).');
        return;
    }

    let erro;

    if (lancamentoEditando) {
        // CORREÇÃO: Atualizações não enviam e não modificam a "data_lancamento" original de criação histórica.
        ({ error: erro } = await supabaseClient
            .from('lancamentos')
            .update(registro)
            .eq('id', lancamentoEditando));
    } else {
        // Inserção ganha carimbo de data automática controlada do fato real
        registro.data_lancamento = new Date().toISOString().split('T')[0];
        
        ({ error: erro } = await supabaseClient
            .from('lancamentos')
            .insert(registro));
    }

    if (erro) {
        alert('Erro ao salvar lançamento: ' + erro.message);
        return;
    }

    fecharModalLancamento();
    await carregarLancamentos();
}

async function editarLancamento(id) {
    const { data, error } = await supabaseClient
        .from('lancamentos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Erro ao carregar lançamento: ' + error.message);
        return;
    }

    lancamentoEditando = id;

    document.getElementById('tipo').value = data.tipo;
    document.getElementById('descricao').value = data.descricao || '';
    document.getElementById('valor').value = data.valor || '';
    document.getElementById('categoria').value = data.categoria || '';
    document.getElementById('conta').value = data.conta_id || '';
    document.getElementById('favorecido').value = data.favorecido || '';
    document.getElementById('formaPagamento').value = data.forma_pagamento || 'PIX';
    document.getElementById('documento').value = data.documento || '';
    document.getElementById('dataVencimento').value = data.data_vencimento || '';
    document.getElementById('competencia').value = data.competencia || '';
    document.getElementById('status').value = data.status || 'pendente';
    document.getElementById('observacao').value = data.observacao || '';
    
    document.getElementById('tituloModal').innerText = 'Editar Lançamento';

    abrirModalLancamento();
}

function excluirLancamento(id) {
    idExclusao = id;
    document.getElementById('modalExcluir').classList.remove('hidden');
}

function fecharModalExcluir() {
    idExclusao = null;
    document.getElementById('modalExcluir').classList.add('hidden');
}

async function confirmarExclusao() {
    if (!idExclusao) return;

    const { error } = await supabaseClient
        .from('lancamentos')
        .delete()
        .eq('id', idExclusao);

    if (error) {
        alert('Erro ao excluir lançamento: ' + error.message);
        return;
    }

    fecharModalExcluir();
    await carregarLancamentos();
}

function aplicarFiltros() {
    const busca = document.getElementById('buscaDescricao').value.toLowerCase();
    const filtroTipo = document.getElementById('filtroTipo').value;
    const filtroStatus = document.getElementById('filtroStatus').value;
    const filtroConta = document.getElementById('filtroConta').value;
    const filtroCompetencia = document.getElementById('filtroCompetencia').value; // Retorna formato YYYY-MM

    let lista = [...todosLancamentos];

    // 1. Filtro por campo texto
    if (busca) {
        lista = lista.filter(item => {
            return (item.descricao || '').toLowerCase().includes(busca) ||
                   (item.favorecido || '').toLowerCase().includes(busca) ||
                   (item.documento || '').toLowerCase().includes(busca);
        });
    }

    // 2. Filtro por Tipo de Fluxo
    if (filtroTipo) {
        lista = lista.filter(item => item.tipo === filtroTipo);
    }

    // 3. Filtro por Estado de Liquidação
    if (filtroStatus) {
        lista = lista.filter(item => item.status === filtroStatus);
    }

    // 4. Filtro por Conta Financeira
    if (filtroConta) {
        lista = lista.filter(item => item.conta_id === filtroConta);
    }

    // 5. Filtro por Competência Mensal estruturada (Validação nativa de string YYYY-MM)
    if (filtroCompetencia) {
        lista = lista.filter(item => {
            const dataBase = item.competencia || item.data_lancamento || '';
            return dataBase.startsWith(filtroCompetencia);
        });
    }

    atualizarKPIs(lista);
    montarTabela(lista);
    // CORREÇÃO BUG UI: fecharModalLancamento() REMOVIDO DAQUI para impedir colapsos ao digitar.
}

function abrirModalLancamento() {
    if (!lancamentoEditando) {
        document.getElementById('tituloModal').innerText = 'Novo Lançamento';
    }
    document.getElementById('modalLancamento').classList.remove('hidden');
}

function fecharModalLancamento() {
    document.getElementById('modalLancamento').classList.add('hidden');
    limparFormulario();
}

function limparFormulario() {
    lancamentoEditando = null;
    
    document.getElementById('tipo').value = 'receita';
    document.getElementById('valor').value = '';
    document.getElementById('descricao').value = '';
    document.getElementById('formaPagamento').value = 'PIX';
    document.getElementById('status').value = 'pendente';
    document.getElementById('favorecido').value = '';
    document.getElementById('documento').value = '';
    document.getElementById('dataVencimento').value = '';
    document.getElementById('competencia').value = '';
    document.getElementById('observacao').value = '';

    // CORREÇÃO: Reset estruturado dos Indexes de selects populados via banco
    const catSelect = document.getElementById('categoria');
    if (catSelect && catSelect.options.length > 0) catSelect.selectedIndex = 0;

    const contaSelect = document.getElementById('conta');
    if (contaSelect && contaSelect.options.length > 0) contaSelect.selectedIndex = 0;
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarData(dataStr) {
    if (!dataStr) return '';
    const partes = dataStr.split('-');
    if (partes.length !== 3) return dataStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Vinculação total de escopo global (Window Object Context)
window.salvarLancamento = salvarLancamento;
window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;
window.confirmarExclusao = confirmarExclusao;
window.abrirModalLancamento = abrirModalLancamento;
window.fecharModalLancamento = fecharModalLancamento;
window.fecharModalExcluir = fecharModalExcluir;
window.aplicarFiltros = aplicarFiltros;
window.logout = logout;
