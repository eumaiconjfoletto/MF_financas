let despesaEditando = null;
let idExclusao = null;

let todas = [];

let veiculosMap = {};
let tiposMap = {};
let meiosMap = {};
let contasMap = {};

document.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {

    carregarUsuario();

    await carregarVeiculos();
    await carregarTipos();
    await carregarMeios();
    await carregarContas();

    await carregar();

}

function carregarUsuario() {

    const u = JSON.parse(localStorage.getItem('mf_usuario'));

    if (u) {
        document.getElementById('userName').innerText = u.nome;
    }
}

// VEÍCULOS
async function carregarVeiculos() {

    const { data } = await supabaseClient
        .from('veiculos')
        .select('*');

    const sel = document.getElementById('veiculo');
    const fil = document.getElementById('filtroVeiculo');

    sel.innerHTML = '';
    fil.innerHTML = '<option value="">Todos</option>';

    data.forEach(v => {

        veiculosMap[v.id] = v.marca + ' ' + v.modelo;

        sel.innerHTML += `<option value="${v.id}">${veiculosMap[v.id]}</option>`;
        fil.innerHTML += `<option value="${v.id}">${veiculosMap[v.id]}</option>`;

    });
}

// TIPOS
async function carregarTipos() {

    const { data } = await supabaseClient
        .from('tipos_despesa_frota')
        .select('*');

    const sel = document.getElementById('tipoDespesa');
    const fil = document.getElementById('filtroTipo');

    sel.innerHTML = '';
    fil.innerHTML = '<option value="">Todos</option>';

    data.forEach(t => {

        tiposMap[t.id] = t.nome;

        sel.innerHTML += `<option value="${t.id}">${t.nome}</option>`;
        fil.innerHTML += `<option value="${t.id}">${t.nome}</option>`;

    });
}

// MEIOS
async function carregarMeios() {

    const { data } = await supabaseClient
        .from('meios_pagamento')
        .select('*');

    const sel = document.getElementById('meioPagamento');

    sel.innerHTML = '';

    data.forEach(m => {

        meiosMap[m.id] = m.nome;

        sel.innerHTML += `<option value="${m.id}">${m.nome}</option>`;
    });
}

// CONTAS
async function carregarContas() {

    const { data } = await supabaseClient
        .from('contas_financeiras')
        .select('*')
        .eq('ativa', true);

    const sel = document.getElementById('conta');

    sel.innerHTML = '';

    data.forEach(c => {

        contasMap[c.id] = c.nome;

        sel.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
    });
}

// LISTA
async function carregar() {

    const { data } = await supabaseClient
        .from('despesas_frota')
        .select('*')
        .order('data_despesa', { ascending: false });

    todas = data;

    filtrar();
}

// FILTRO
function filtrar() {

    let lista = [...todas];

    const v = document.getElementById('filtroVeiculo').value;
    const t = document.getElementById('filtroTipo').value;

    if (v) lista = lista.filter(x => x.veiculo_id === v);
    if (t) lista = lista.filter(x => x.tipo_despesa_id === t);

    montar(lista);
    kpis(lista);
}

// KPIs
function kpis(lista) {

    const total = lista.reduce((s, i) => s + Number(i.valor || 0), 0);

    document.getElementById('kpiTotal').innerText =
        total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    document.getElementById('kpiQtd').innerText = lista.length;

    document.getElementById('kpiKm').innerText =
        lista.length ? Math.max(...lista.map(x => Number(x.quilometragem || 0))) : 0;

    document.getElementById('kpiMes').innerText = '';
}

// TABELA
function montar(lista) {

    const tbody = document.getElementById('listaFrota');

    tbody.innerHTML = '';

    lista.forEach(i => {

        tbody.innerHTML += `
        <tr>

            <td>${i.data_despesa || ''}</td>
            <td>${veiculosMap[i.veiculo_id] || ''}</td>
            <td>${tiposMap[i.tipo_despesa_id] || ''}</td>
            <td>${meiosMap[i.meio_pagamento_id] || ''}</td>
            <td>${i.valor}</td>
            <td>${i.quilometragem || 0}</td>
            <td>${i.observacao || ''}</td>

            <td>
                <button onclick="editar('${i.id}')" class="btn btn-secondary">Editar</button>
                <button onclick="excluir('${i.id}')" class="btn btn-danger">Excluir</button>
            </td>

        </tr>`;
    });
}

// SALVAR
async function salvarDespesaFrota() {

    const obj = {

        veiculo_id: document.getElementById('veiculo').value,
        tipo_despesa_id: document.getElementById('tipoDespesa').value,
        meio_pagamento_id: document.getElementById('meioPagamento').value,
        conta_id: document.getElementById('conta').value,
        valor: Number(document.getElementById('valor').value),
        quilometragem: Number(document.getElementById('quilometragem').value),
        observacao: document.getElementById('observacao').value,
        data_despesa: document.getElementById('dataDespesa').value
    };

    if (despesaEditando) {

        await supabaseClient
            .from('despesas_frota')
            .update(obj)
            .eq('id', despesaEditando);

    } else {

        await supabaseClient
            .from('despesas_frota')
            .insert(obj);
    }

    fecharModalFrota();
    limpar();
    carregar();
}

// EDITAR
async function editar(id) {

    const { data } = await supabaseClient
        .from('despesas_frota')
        .select('*')
        .eq('id', id)
        .single();

    despesaEditando = id;

    document.getElementById('veiculo').value = data.veiculo_id;
    document.getElementById('tipoDespesa').value = data.tipo_despesa_id;
    document.getElementById('meioPagamento').value = data.meio_pagamento_id;
    document.getElementById('conta').value = data.conta_id;
    document.getElementById('valor').value = data.valor;
    document.getElementById('quilometragem').value = data.quilometragem;
    document.getElementById('observacao').value = data.observacao;
    document.getElementById('dataDespesa').value = data.data_despesa;

    abrirModalFrota();
}

// EXCLUIR
function excluir(id) {

    idExclusao = id;

    document.getElementById('modalExcluirFrota').classList.remove('hidden');
}

async function confirmarExclusaoFrota() {

    await supabaseClient
        .from('despesas_frota')
        .delete()
        .eq('id', idExclusao);

    fecharModalExcluirFrota();
    carregar();
}

// MODAIS
function abrirModalFrota() {
    document.getElementById('modalFrota').classList.remove('hidden');
}

function fecharModalFrota() {
    despesaEditando = null;
    document.getElementById('modalFrota').classList.add('hidden');
}

function fecharModalExcluirFrota() {
    idExclusao = null;
    document.getElementById('modalExcluirFrota').classList.add('hidden');
}

function limpar() {

    despesaEditando = null;

    document.getElementById('veiculo').value = '';
    document.getElementById('tipoDespesa').value = '';
    document.getElementById('meioPagamento').value = '';
    document.getElementById('conta').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('quilometragem').value = '';
    document.getElementById('observacao').value = '';
    document.getElementById('dataDespesa').value = '';
}

// WINDOW
window.salvarDespesaFrota = salvarDespesaFrota;
window.editar = editar;
window.excluir = excluir;
window.confirmarExclusaoFrota = confirmarExclusaoFrota;
window.abrirModalFrota = abrirModalFrota;
window.fecharModalFrota = fecharModalFrota;
window.fecharModalExcluirFrota = fecharModalExcluirFrota;
