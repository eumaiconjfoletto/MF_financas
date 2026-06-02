let despesaEditando = null;

let idExclusaoFrota = null;

let todasDespesas = [];

let veiculosMap = {};

let tiposMap = {};

let meiosMap = {};

let contasMap = {};

// INIT
document.addEventListener('DOMContentLoaded', iniciarPagina);

async function iniciarPagina() {

    carregarUsuario();

    await carregarVeiculos();
    await carregarTiposDespesa();
    await carregarMeiosPagamento();
    await carregarContas();

    await carregarDespesas();

    document.getElementById('filtroVeiculo').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroTipo').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroInicio').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroFim').addEventListener('change', aplicarFiltros);
}

// USUÁRIO
function carregarUsuario() {

    const usuario =
        JSON.parse(localStorage.getItem('mf_usuario'));

    if (usuario) {

        document.getElementById('userName').innerText =
            usuario.nome;
    }
}

// VEÍCULOS
async function carregarVeiculos() {

    const { data } =
        await supabaseClient
            .from('veiculos')
            .select('*')
            .order('marca');

    const select = document.getElementById('veiculoId');
    const filtro = document.getElementById('filtroVeiculo');

    select.innerHTML = '';
    filtro.innerHTML = '<option value="">Todos</option>';

    data.forEach(v => {

        veiculosMap[v.id] = `${v.marca} ${v.modelo}`;

        select.innerHTML += `
            <option value="${v.id}">
                ${v.marca} ${v.modelo}
            </option>
        `;

        filtro.innerHTML += `
            <option value="${v.id}">
                ${v.marca} ${v.modelo}
            </option>
        `;
    });
}

// TIPOS
async function carregarTiposDespesa() {

    const { data } =
        await supabaseClient
            .from('tipos_despesa_frota')
            .select('*')
            .order('nome');

    const select = document.getElementById('tipoDespesaId');
    const filtro = document.getElementById('filtroTipo');

    select.innerHTML = '';
    filtro.innerHTML = '<option value="">Todos</option>';

    data.forEach(t => {

        tiposMap[t.id] = t.nome;

        select.innerHTML += `
            <option value="${t.id}">
                ${t.nome}
            </option>
        `;

        filtro.innerHTML += `
            <option value="${t.id}">
                ${t.nome}
            </option>
        `;
    });
}

// MEIOS PAGAMENTO
async function carregarMeiosPagamento() {

    const { data } =
        await supabaseClient
            .from('meios_pagamento')
            .select('*')
            .order('nome');

    const select = document.getElementById('meioPagamentoId');

    select.innerHTML = '';

    data.forEach(m => {

        meiosMap[m.id] = m.nome;

        select.innerHTML += `
            <option value="${m.id}">
                ${m.nome}
            </option>
        `;
    });
}

// CONTAS
async function carregarContas() {

    const { data } =
        await supabaseClient
            .from('contas_financeiras')
            .select('*')
            .eq('ativa', true)
            .order('nome');

    const select = document.getElementById('contaId');

    select.innerHTML = '';

    data.forEach(c => {

        contasMap[c.id] = c.nome;

        select.innerHTML += `
            <option value="${c.id}">
                ${c.nome}
            </option>
        `;
    });
}

// DESPESAS
async function carregarDespesas() {

    const { data } =
        await supabaseClient
            .from('despesas_frota')
            .select('*')
            .order('data_despesa', { ascending: false });

    todasDespesas = data;

    aplicarFiltros();
}

// FILTROS
function aplicarFiltros() {

    let lista = [...todasDespesas];

    const veiculo = document.getElementById('filtroVeiculo').value;
    const tipo = document.getElementById('filtroTipo').value;
    const inicio = document.getElementById('filtroInicio').value;
    const fim = document.getElementById('filtroFim').value;

    if (veiculo) {
        lista = lista.filter(x => x.veiculo_id === veiculo);
    }

    if (tipo) {
        lista = lista.filter(x => x.tipo_despesa_id === tipo);
    }

    if (inicio) {
        lista = lista.filter(x => x.data_despesa >= inicio);
    }

    if (fim) {
        lista = lista.filter(x => x.data_despesa <= fim);
    }

    atualizarKPIs(lista);
    montarTabela(lista);
}

// KPIs
function atualizarKPIs(lista) {

    const total = lista.reduce((s, i) => s + Number(i.valor || 0), 0);

    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();

    const mesTotal = lista
        .filter(i => {
            if (!i.data_despesa) return false;
            const d = new Date(i.data_despesa);
            return d.getMonth() + 1 === mes && d.getFullYear() === ano;
        })
        .reduce((s, i) => s + Number(i.valor || 0), 0);

    const km = lista.length
        ? Math.max(...lista.map(i => Number(i.quilometragem || 0)))
        : 0;

    document.getElementById('kpiTotal').innerText = formatarMoeda(total);
    document.getElementById('kpiMes').innerText = formatarMoeda(mesTotal);
    document.getElementById('kpiQtd').innerText = lista.length;
    document.getElementById('kpiKm').innerText = km;
}

// TABELA
function montarTabela(lista) {

    const tbody = document.getElementById('listaFrota');

    tbody.innerHTML = '';

    lista.forEach(item => {

        tbody.innerHTML += `
        <tr>

            <td>${item.data_despesa || ''}</td>
            <td>${veiculosMap[item.veiculo_id] || '-'}</td>
            <td>${tiposMap[item.tipo_despesa_id] || '-'}</td>
            <td>${meiosMap[item.meio_pagamento_id] || '-'}</td>
            <td>${formatarMoeda(item.valor)}</td>
            <td>${item.quilometragem || 0}</td>
            <td>${item.observacao || ''}</td>

            <td>
                <div class="table-actions">

                    <button class="btn btn-secondary"
                        onclick="editarDespesaFrota('${item.id}')">
                        Editar
                    </button>

                    <button class="btn btn-danger"
                        onclick="excluirDespesaFrota('${item.id}')">
                        Excluir
                    </button>

                </div>
            </td>

        </tr>
        `;
    });
}

// SALVAR + LANÇAMENTO AUTOMÁTICO
async function salvarDespesaFrota() {

    const registro = {
        veiculo_id: document.getElementById('veiculoId').value,
        tipo_despesa_id: document.getElementById('tipoDespesaId').value,
        meio_pagamento_id: document.getElementById('meioPagamentoId').value,
        conta_id: document.getElementById('contaId').value,
        valor: Number(document.getElementById('valor').value),
        quilometragem: Number(document.getElementById('quilometragem').value),
        observacao: document.getElementById('observacao').value,
        data_despesa: document.getElementById('dataDespesa').value
    };

    const descricao = `Frota - ${tiposMap[registro.tipo_despesa_id]}`;

    if (despesaEditando) {

        const { data } =
            await supabaseClient
                .from('despesas_frota')
                .select('*')
                .eq('id', despesaEditando)
                .single();

        await supabaseClient
            .from('lancamentos')
            .update({
                descricao,
                valor: registro.valor,
                conta_id: registro.conta_id,
                observacao: registro.observacao
            })
            .eq('id', data.lancamento_id);

        await supabaseClient
            .from('despesas_frota')
            .update(registro)
            .eq('id', despesaEditando);

    } else {

        const { data: lanc } =
            await supabaseClient
                .from('lancamentos')
                .insert({
                    tipo: 'despesa',
                    descricao,
                    valor: registro.valor,
                    categoria: 'Frota',
                    conta_id: registro.conta_id,
                    status: 'pago',
                    data_vencimento: registro.data_despesa,
                    competencia: registro.data_despesa,
                    observacao: registro.observacao
                })
                .select()
                .single();

        registro.lancamento_id = lanc.id;

        await supabaseClient
            .from('despesas_frota')
            .insert(registro);
    }

    fecharModalFrota();
    limparFormulario();
    carregarDespesas();
}

// EDITAR
async function editarDespesaFrota(id) {

    const { data } =
        await supabaseClient
            .from('despesas_frota')
            .select('*')
            .eq('id', id)
            .single();

    despesaEditando = id;

    document.getElementById('veiculoId').value = data.veiculo_id;
    document.getElementById('tipoDespesaId').value = data.tipo_despesa_id;
    document.getElementById('meioPagamentoId').value = data.meio_pagamento_id;
    document.getElementById('contaId').value = data.conta_id;
    document.getElementById('valor').value = data.valor;
    document.getElementById('quilometragem').value = data.quilometragem;
    document.getElementById('observacao').value = data.observacao || '';
    document.getElementById('dataDespesa').value = data.data_despesa;

    document.getElementById('tituloModalFrota').innerText = 'Editar Despesa';

    abrirModalFrota();
}

// EXCLUIR
function excluirDespesaFrota(id) {

    idExclusaoFrota = id;

    document.getElementById('modalExcluirFrota')
        .classList.remove('hidden');
}

async function confirmarExclusaoFrota() {

    const { data } =
        await supabaseClient
            .from('despesas_frota')
            .select('*')
            .eq('id', idExclusaoFrota)
            .single();

    if (data?.lancamento_id) {

        await supabaseClient
            .from('lancamentos')
            .delete()
            .eq('id', data.lancamento_id);
    }

    await supabaseClient
        .from('despesas_frota')
        .delete()
        .eq('id', idExclusaoFrota);

    fecharModalExcluirFrota();
    carregarDespesas();
}

// MODAIS
function abrirModalFrota() {

    document.getElementById('modalFrota')
        .classList.remove('hidden');
}

function fecharModalFrota() {

    despesaEditando = null;

    document.getElementById('modalFrota')
        .classList.add('hidden');
}

function fecharModalExcluirFrota() {

    idExclusaoFrota = null;

    document.getElementById('modalExcluirFrota')
        .classList.add('hidden');
}

// UTIL
function limparFormulario() {

    despesaEditando = null;

    document.getElementById('veiculoId').value = '';
    document.getElementById('tipoDespesaId').value = '';
    document.getElementById('meioPagamentoId').value = '';
    document.getElementById('contaId').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('quilometragem').value = '';
    document.getElementById('observacao').value = '';
    document.getElementById('dataDespesa').value = '';
}

function formatarMoeda(valor) {

    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// WINDOW EXPORTS
window.salvarDespesaFrota = salvarDespesaFrota;
window.editarDespesaFrota = editarDespesaFrota;
window.excluirDespesaFrota = excluirDespesaFrota;
window.confirmarExclusaoFrota = confirmarExclusaoFrota;
window.abrirModalFrota = abrirModalFrota;
window.fecharModalFrota = fecharModalFrota;
window.fecharModalExcluirFrota = fecharModalExcluirFrota;
